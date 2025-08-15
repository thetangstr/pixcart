#!/usr/bin/env python3
"""
Reinforcement Learning Parameter Optimizer
Uses Q-learning to optimize oil painting conversion parameters
"""

import numpy as np
import json
import pickle
import random
import time
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import copy
from collections import defaultdict, deque

@dataclass
class ParameterState:
    """Represents a parameter configuration state"""
    denoising_strength: float
    cfg_scale: float
    steps: int
    controlnet_weight: float
    sampler: str
    style_id: str
    
    def to_tuple(self) -> Tuple:
        """Convert to tuple for hashing"""
        return (
            round(self.denoising_strength, 2),
            round(self.cfg_scale, 1),
            self.steps,
            round(self.controlnet_weight, 2),
            self.sampler,
            self.style_id
        )
    
    def __hash__(self):
        return hash(self.to_tuple())
    
    def __eq__(self, other):
        return self.to_tuple() == other.to_tuple()

@dataclass
class Action:
    """Represents a parameter adjustment action"""
    parameter: str
    delta: float
    description: str

@dataclass
class Experience:
    """Training experience for replay buffer"""
    state: ParameterState
    action: Action
    reward: float
    next_state: ParameterState
    done: bool
    image_context: Dict  # Image properties for context

class ParameterSpace:
    """Defines the parameter space and valid ranges"""
    
    def __init__(self):
        self.ranges = {
            "denoising_strength": {
                "min": 0.3,
                "max": 0.8,
                "step": 0.02,
                "optimal_range": (0.45, 0.65)
            },
            "cfg_scale": {
                "min": 4.0,
                "max": 15.0,
                "step": 0.5,
                "optimal_range": (7.0, 10.0)
            },
            "steps": {
                "min": 20,
                "max": 60,
                "step": 5,
                "optimal_range": (30, 45)
            },
            "controlnet_weight": {
                "min": 0.3,
                "max": 1.0,
                "step": 0.05,
                "optimal_range": (0.5, 0.8)
            }
        }
        
        self.samplers = [
            "DPM++ 2M Karras",
            "Euler a",
            "DPM++ SDE Karras",
            "DDIM",
            "UniPC"
        ]
        
        self.styles = ["classic_portrait", "thick_textured", "soft_impressionist"]
        
        # Define actions for each parameter
        self.actions = self._generate_actions()
    
    def _generate_actions(self) -> List[Action]:
        """Generate all possible parameter adjustment actions"""
        actions = []
        
        # Denoising strength adjustments
        for delta in [-0.04, -0.02, 0.02, 0.04]:
            actions.append(Action(
                parameter="denoising_strength",
                delta=delta,
                description=f"{'Decrease' if delta < 0 else 'Increase'} denoising by {abs(delta)}"
            ))
        
        # CFG scale adjustments
        for delta in [-1.0, -0.5, 0.5, 1.0]:
            actions.append(Action(
                parameter="cfg_scale",
                delta=delta,
                description=f"{'Decrease' if delta < 0 else 'Increase'} CFG scale by {abs(delta)}"
            ))
        
        # Steps adjustments
        for delta in [-10, -5, 5, 10]:
            actions.append(Action(
                parameter="steps",
                delta=delta,
                description=f"{'Decrease' if delta < 0 else 'Increase'} steps by {abs(delta)}"
            ))
        
        # ControlNet weight adjustments
        for delta in [-0.1, -0.05, 0.05, 0.1]:
            actions.append(Action(
                parameter="controlnet_weight",
                delta=delta,
                description=f"{'Decrease' if delta < 0 else 'Increase'} ControlNet weight by {abs(delta)}"
            ))
        
        # Sampler changes
        for sampler in self.samplers:
            actions.append(Action(
                parameter="sampler",
                delta=sampler,
                description=f"Switch to {sampler} sampler"
            ))
        
        return actions
    
    def is_valid_state(self, state: ParameterState) -> bool:
        """Check if parameter state is within valid ranges"""
        ranges = self.ranges
        
        return (
            ranges["denoising_strength"]["min"] <= state.denoising_strength <= ranges["denoising_strength"]["max"] and
            ranges["cfg_scale"]["min"] <= state.cfg_scale <= ranges["cfg_scale"]["max"] and
            ranges["steps"]["min"] <= state.steps <= ranges["steps"]["max"] and
            ranges["controlnet_weight"]["min"] <= state.controlnet_weight <= ranges["controlnet_weight"]["max"] and
            state.sampler in self.samplers and
            state.style_id in self.styles
        )
    
    def apply_action(self, state: ParameterState, action: Action) -> ParameterState:
        """Apply action to state and return new state"""
        new_state = copy.deepcopy(state)
        
        if action.parameter == "sampler":
            new_state.sampler = action.delta
        elif action.parameter in ["denoising_strength", "cfg_scale", "controlnet_weight"]:
            current_value = getattr(new_state, action.parameter)
            new_value = current_value + action.delta
            setattr(new_state, action.parameter, new_value)
        elif action.parameter == "steps":
            new_state.steps = int(new_state.steps + action.delta)
        
        # Clamp values to valid ranges
        new_state = self.clamp_state(new_state)
        
        return new_state
    
    def clamp_state(self, state: ParameterState) -> ParameterState:
        """Clamp state values to valid ranges"""
        ranges = self.ranges
        
        state.denoising_strength = np.clip(
            state.denoising_strength,
            ranges["denoising_strength"]["min"],
            ranges["denoising_strength"]["max"]
        )
        
        state.cfg_scale = np.clip(
            state.cfg_scale,
            ranges["cfg_scale"]["min"],
            ranges["cfg_scale"]["max"]
        )
        
        state.steps = int(np.clip(
            state.steps,
            ranges["steps"]["min"],
            ranges["steps"]["max"]
        ))
        
        state.controlnet_weight = np.clip(
            state.controlnet_weight,
            ranges["controlnet_weight"]["min"],
            ranges["controlnet_weight"]["max"]
        )
        
        if state.sampler not in self.samplers:
            state.sampler = self.samplers[0]
        
        return state
    
    def get_random_state(self, style_id: str) -> ParameterState:
        """Generate a random valid state"""
        ranges = self.ranges
        
        return ParameterState(
            denoising_strength=random.uniform(
                ranges["denoising_strength"]["min"],
                ranges["denoising_strength"]["max"]
            ),
            cfg_scale=random.uniform(
                ranges["cfg_scale"]["min"],
                ranges["cfg_scale"]["max"]
            ),
            steps=random.randint(
                ranges["steps"]["min"],
                ranges["steps"]["max"]
            ),
            controlnet_weight=random.uniform(
                ranges["controlnet_weight"]["min"],
                ranges["controlnet_weight"]["max"]
            ),
            sampler=random.choice(self.samplers),
            style_id=style_id
        )

class QLearningAgent:
    """Q-Learning agent for parameter optimization"""
    
    def __init__(
        self,
        parameter_space: ParameterSpace,
        learning_rate: float = 0.1,
        discount_factor: float = 0.95,
        epsilon: float = 1.0,
        epsilon_decay: float = 0.995,
        epsilon_min: float = 0.01
    ):
        self.parameter_space = parameter_space
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.epsilon_min = epsilon_min
        
        # Q-table: state -> action -> Q-value
        self.q_table = defaultdict(lambda: defaultdict(float))
        
        # Experience replay buffer
        self.replay_buffer = deque(maxlen=10000)
        
        # Training statistics
        self.training_stats = {
            "episodes": 0,
            "total_reward": 0,
            "avg_reward_per_episode": [],
            "epsilon_history": [],
            "best_states": {},  # style_id -> best_state
            "action_counts": defaultdict(int)
        }
    
    def get_state_key(self, state: ParameterState, image_context: Dict) -> str:
        """Create a unique key for state considering image context"""
        # Include relevant image properties in state representation
        brightness_bin = "bright" if image_context.get("brightness", 128) > 140 else "normal" if image_context.get("brightness", 128) > 100 else "dark"
        contrast_bin = "high" if image_context.get("contrast", 50) > 60 else "normal" if image_context.get("contrast", 50) > 30 else "low"
        subject_type = "cat" if "cat" in image_context.get("filename", "") else "dog"
        
        return f"{state.to_tuple()}_{brightness_bin}_{contrast_bin}_{subject_type}"
    
    def select_action(self, state: ParameterState, image_context: Dict, training: bool = True) -> int:
        """Select action using epsilon-greedy strategy"""
        if training and random.random() < self.epsilon:
            # Explore: random action
            return random.randint(0, len(self.parameter_space.actions) - 1)
        else:
            # Exploit: best known action
            state_key = self.get_state_key(state, image_context)
            q_values = self.q_table[state_key]
            
            if not q_values:
                # No experience with this state, random action
                return random.randint(0, len(self.parameter_space.actions) - 1)
            
            # Return action with highest Q-value
            return max(q_values.keys(), key=lambda a: q_values[a])
    
    def update_q_value(self, experience: Experience, image_context: Dict):
        """Update Q-value using Q-learning update rule"""
        state_key = self.get_state_key(experience.state, image_context)
        next_state_key = self.get_state_key(experience.next_state, image_context)
        
        # Find action index
        action_idx = None
        for i, action in enumerate(self.parameter_space.actions):
            if (action.parameter == experience.action.parameter and 
                action.delta == experience.action.delta):
                action_idx = i
                break
        
        if action_idx is None:
            return
        
        # Current Q-value
        current_q = self.q_table[state_key][action_idx]
        
        # Maximum Q-value for next state
        next_q_values = self.q_table[next_state_key]
        max_next_q = max(next_q_values.values()) if next_q_values else 0
        
        # Q-learning update
        if experience.done:
            target_q = experience.reward
        else:
            target_q = experience.reward + self.discount_factor * max_next_q
        
        # Update Q-value
        self.q_table[state_key][action_idx] = (
            current_q + self.learning_rate * (target_q - current_q)
        )
        
        # Update statistics
        self.training_stats["action_counts"][action_idx] += 1
    
    def add_experience(self, experience: Experience):
        """Add experience to replay buffer"""
        self.replay_buffer.append(experience)
    
    def replay_training(self, batch_size: int = 32):
        """Train on random batch from replay buffer"""
        if len(self.replay_buffer) < batch_size:
            return
        
        # Sample random batch
        batch = random.sample(self.replay_buffer, batch_size)
        
        for experience in batch:
            # Use empty context for replay (state already encodes relevant info)
            self.update_q_value(experience, experience.image_context)
    
    def decay_epsilon(self):
        """Decay exploration rate"""
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
        self.training_stats["epsilon_history"].append(self.epsilon)
    
    def update_best_state(self, state: ParameterState, reward: float):
        """Update best state for the style if this is better"""
        style_id = state.style_id
        
        if (style_id not in self.training_stats["best_states"] or
            reward > self.training_stats["best_states"][style_id]["reward"]):
            
            self.training_stats["best_states"][style_id] = {
                "state": copy.deepcopy(state),
                "reward": reward,
                "timestamp": time.time()
            }
    
    def get_best_parameters(self, style_id: str) -> Optional[ParameterState]:
        """Get best known parameters for a style"""
        if style_id in self.training_stats["best_states"]:
            return self.training_stats["best_states"][style_id]["state"]
        return None
    
    def save_model(self, filepath: str):
        """Save Q-table and training statistics"""
        model_data = {
            "q_table": dict(self.q_table),
            "training_stats": self.training_stats,
            "hyperparameters": {
                "learning_rate": self.learning_rate,
                "discount_factor": self.discount_factor,
                "epsilon": self.epsilon,
                "epsilon_decay": self.epsilon_decay,
                "epsilon_min": self.epsilon_min
            }
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, filepath: str):
        """Load Q-table and training statistics"""
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            # Convert back to defaultdict
            self.q_table = defaultdict(lambda: defaultdict(float))
            for state_key, actions in model_data["q_table"].items():
                for action_idx, q_value in actions.items():
                    self.q_table[state_key][action_idx] = q_value
            
            self.training_stats = model_data["training_stats"]
            
            # Update hyperparameters
            if "hyperparameters" in model_data:
                hyper = model_data["hyperparameters"]
                self.learning_rate = hyper["learning_rate"]
                self.discount_factor = hyper["discount_factor"]
                self.epsilon = hyper["epsilon"]
                self.epsilon_decay = hyper["epsilon_decay"]
                self.epsilon_min = hyper["epsilon_min"]
            
            print(f"Loaded model from {filepath}")
            print(f"Episodes trained: {self.training_stats['episodes']}")
            print(f"Current epsilon: {self.epsilon:.3f}")
            
        except Exception as e:
            print(f"Failed to load model from {filepath}: {e}")

class RLParameterOptimizer:
    """Main RL optimization coordinator"""
    
    def __init__(self, save_dir: str = "rl_training/models"):
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(parents=True, exist_ok=True)
        
        self.parameter_space = ParameterSpace()
        
        # Create separate agents for each style
        self.agents = {}
        for style in self.parameter_space.styles:
            self.agents[style] = QLearningAgent(self.parameter_space)
        
        # Training configuration
        self.training_config = {
            "episodes_per_style": 100,
            "max_steps_per_episode": 10,
            "replay_frequency": 5,
            "save_frequency": 20,
            "target_reward_threshold": 0.85
        }
        
        # Load existing models if available
        self.load_models()
    
    def save_models(self):
        """Save all agent models"""
        for style, agent in self.agents.items():
            filepath = self.save_dir / f"rl_agent_{style}.pkl"
            agent.save_model(str(filepath))
    
    def load_models(self):
        """Load existing agent models"""
        for style, agent in self.agents.items():
            filepath = self.save_dir / f"rl_agent_{style}.pkl"
            if filepath.exists():
                agent.load_model(str(filepath))
    
    def get_initial_state(self, style_id: str) -> ParameterState:
        """Get initial state for training episode"""
        # Start with style defaults and add some randomization
        if style_id == "classic_portrait":
            base_state = ParameterState(
                denoising_strength=0.65,
                cfg_scale=9.0,
                steps=40,
                controlnet_weight=0.65,
                sampler="DPM++ 2M Karras",
                style_id=style_id
            )
        elif style_id == "thick_textured":
            base_state = ParameterState(
                denoising_strength=0.58,
                cfg_scale=9.0,
                steps=40,
                controlnet_weight=0.6,
                sampler="Euler a",
                style_id=style_id
            )
        else:  # soft_impressionist
            base_state = ParameterState(
                denoising_strength=0.52,
                cfg_scale=7.5,
                steps=35,
                controlnet_weight=0.65,
                sampler="DPM++ 2M Karras",
                style_id=style_id
            )
        
        # Add small random variations
        base_state.denoising_strength += random.uniform(-0.05, 0.05)
        base_state.cfg_scale += random.uniform(-1.0, 1.0)
        base_state.steps += random.randint(-5, 5)
        base_state.controlnet_weight += random.uniform(-0.1, 0.1)
        
        return self.parameter_space.clamp_state(base_state)
    
    def calculate_reward(self, evaluation_scores: Dict, processing_time: float) -> float:
        """Calculate reward based on evaluation metrics"""
        # Extract key metrics
        subject_preservation = evaluation_scores.get("subject_preservation", 0.0)
        oil_painting_authenticity = evaluation_scores.get("oil_painting_authenticity", 0.0)
        style_distinctiveness = evaluation_scores.get("style_distinctiveness", 0.0)
        overall_quality = evaluation_scores.get("overall_quality", 0.0)
        
        # Weights for different aspects
        weights = {
            "subject_preservation": 0.35,    # Most important
            "oil_painting_authenticity": 0.25,
            "style_distinctiveness": 0.20,
            "overall_quality": 0.15,
            "efficiency": 0.05
        }
        
        # Calculate base reward
        base_reward = (
            weights["subject_preservation"] * subject_preservation +
            weights["oil_painting_authenticity"] * oil_painting_authenticity +
            weights["style_distinctiveness"] * style_distinctiveness +
            weights["overall_quality"] * overall_quality
        )
        
        # Efficiency bonus/penalty based on processing time
        # Target time: 30 seconds, penalty for being too slow
        time_penalty = 0.0
        if processing_time > 60:
            time_penalty = -0.1
        elif processing_time > 45:
            time_penalty = -0.05
        elif processing_time < 20:
            time_penalty = 0.05  # Bonus for fast processing
        
        efficiency_score = max(0.0, 1.0 + time_penalty)
        final_reward = base_reward + weights["efficiency"] * efficiency_score
        
        # Bonus for high performance
        if base_reward > 0.9:
            final_reward += 0.1
        elif base_reward > 0.8:
            final_reward += 0.05
        
        # Penalty for poor subject preservation (critical failure)
        if subject_preservation < 0.5:
            final_reward *= 0.5
        
        return np.clip(final_reward, 0.0, 1.0)
    
    def should_terminate_episode(self, step: int, recent_rewards: List[float]) -> bool:
        """Determine if episode should terminate early"""
        max_steps = self.training_config["max_steps_per_episode"]
        
        # Terminate if max steps reached
        if step >= max_steps:
            return True
        
        # Terminate if converged (last 3 rewards very similar)
        if len(recent_rewards) >= 3:
            recent_avg = np.mean(recent_rewards[-3:])
            if recent_avg > 0.85 and np.std(recent_rewards[-3:]) < 0.02:
                return True
        
        return False
    
    def train_style(self, style_id: str, image_batch: List[str], evaluator) -> Dict:
        """Train RL agent for specific style"""
        agent = self.agents[style_id]
        training_results = {
            "episodes": [],
            "best_reward": 0.0,
            "best_state": None,
            "total_conversions": 0
        }
        
        print(f"\nTraining RL agent for style: {style_id}")
        
        episodes = self.training_config["episodes_per_style"]
        
        for episode in range(episodes):
            print(f"Episode {episode + 1}/{episodes}")
            
            # Select random image for this episode
            image_path = random.choice(image_batch)
            image_context = {"filename": Path(image_path).name}
            
            # Initialize episode
            state = self.get_initial_state(style_id)
            episode_rewards = []
            episode_steps = []
            total_reward = 0.0
            
            for step in range(self.training_config["max_steps_per_episode"]):
                # Select action
                action_idx = agent.select_action(state, image_context, training=True)
                action = self.parameter_space.actions[action_idx]
                
                # Apply action to get next state
                next_state = self.parameter_space.apply_action(state, action)
                
                # Convert image with current parameters
                try:
                    start_time = time.time()
                    conversion_result = evaluator.convert_with_parameters(
                        image_path, asdict(next_state)
                    )
                    processing_time = time.time() - start_time
                    
                    # Evaluate result
                    evaluation_scores = evaluator.evaluate_conversion(
                        image_path, conversion_result["output_path"], style_id
                    )
                    
                    # Calculate reward
                    reward = self.calculate_reward(evaluation_scores, processing_time)
                    
                    training_results["total_conversions"] += 1
                    
                except Exception as e:
                    print(f"Conversion failed: {e}")
                    reward = 0.0  # Heavy penalty for failures
                    evaluation_scores = {}
                    processing_time = 60.0
                
                # Store experience
                experience = Experience(
                    state=state,
                    action=action,
                    reward=reward,
                    next_state=next_state,
                    done=False,
                    image_context=image_context
                )
                agent.add_experience(experience)
                
                # Update Q-values
                agent.update_q_value(experience, image_context)
                
                # Track episode progress
                episode_rewards.append(reward)
                episode_steps.append({
                    "step": step,
                    "action": action.description,
                    "reward": reward,
                    "state": asdict(next_state),
                    "evaluation": evaluation_scores
                })
                
                total_reward += reward
                
                # Update best state if this is better
                agent.update_best_state(next_state, reward)
                if reward > training_results["best_reward"]:
                    training_results["best_reward"] = reward
                    training_results["best_state"] = copy.deepcopy(next_state)
                
                # Check for early termination
                if self.should_terminate_episode(step, episode_rewards):
                    experience.done = True
                    break
                
                # Move to next state
                state = next_state
            
            # Episode complete
            avg_reward = total_reward / len(episode_rewards) if episode_rewards else 0.0
            agent.training_stats["avg_reward_per_episode"].append(avg_reward)
            agent.training_stats["episodes"] += 1
            agent.training_stats["total_reward"] += total_reward
            
            # Replay training
            if episode % self.training_config["replay_frequency"] == 0:
                agent.replay_training()
            
            # Decay exploration
            agent.decay_epsilon()
            
            # Save episode results
            training_results["episodes"].append({
                "episode": episode,
                "steps": episode_steps,
                "total_reward": total_reward,
                "avg_reward": avg_reward,
                "epsilon": agent.epsilon
            })
            
            print(f"Episode {episode + 1} completed: avg_reward={avg_reward:.3f}, epsilon={agent.epsilon:.3f}")
            
            # Save models periodically
            if episode % self.training_config["save_frequency"] == 0:
                self.save_models()
        
        return training_results
    
    def get_optimized_parameters(self, style_id: str) -> Dict:
        """Get best known parameters for a style"""
        agent = self.agents[style_id]
        best_state = agent.get_best_parameters(style_id)
        
        if best_state:
            return asdict(best_state)
        else:
            # Return default parameters if no training data
            return asdict(self.get_initial_state(style_id))
    
    def export_optimized_configs(self, output_path: str):
        """Export optimized parameters to JSON file"""
        optimized_configs = {}
        
        for style_id in self.parameter_space.styles:
            optimized_configs[style_id] = self.get_optimized_parameters(style_id)
        
        with open(output_path, 'w') as f:
            json.dump(optimized_configs, f, indent=2)
        
        print(f"Exported optimized configurations to {output_path}")
        
        return optimized_configs


def main():
    """Example usage"""
    optimizer = RLParameterOptimizer()
    
    # Example training (would be integrated with full pipeline)
    print("RL Parameter Optimizer initialized")
    print(f"Loaded agents for styles: {list(optimizer.agents.keys())}")
    
    # Export current best parameters
    optimizer.export_optimized_configs("rl_training/optimized_parameters.json")


if __name__ == "__main__":
    main()
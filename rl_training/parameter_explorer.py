#!/usr/bin/env python3
"""
Parameter Space Exploration System
Advanced exploration strategies for denoising, CFG, ControlNet weights, and other parameters
"""

import numpy as np
import json
import random
import time
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from pathlib import Path
import itertools
from scipy.optimize import differential_evolution, basinhopping
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, Matern
import matplotlib.pyplot as plt
import seaborn as sns
from collections import defaultdict
import logging

@dataclass
class ParameterPoint:
    """A point in parameter space with evaluation results"""
    denoising_strength: float
    cfg_scale: float
    steps: int
    controlnet_weight: float
    sampler: str
    style_id: str
    
    # Evaluation results
    reward: float
    subject_preservation: float
    oil_painting_authenticity: float
    style_distinctiveness: float
    processing_time: float
    
    # Metadata
    timestamp: str
    image_context: Dict
    evaluation_count: int = 1
    
    def to_vector(self) -> np.ndarray:
        """Convert to numerical vector for ML algorithms"""
        # Map sampler to numerical value
        sampler_map = {
            "DPM++ 2M Karras": 0,
            "Euler a": 1,
            "DPM++ SDE Karras": 2,
            "DDIM": 3,
            "UniPC": 4
        }
        
        return np.array([
            self.denoising_strength,
            self.cfg_scale,
            self.steps,
            self.controlnet_weight,
            sampler_map.get(self.sampler, 0)
        ])
    
    @classmethod
    def from_vector(cls, vector: np.ndarray, style_id: str, **kwargs) -> 'ParameterPoint':
        """Create from numerical vector"""
        samplers = ["DPM++ 2M Karras", "Euler a", "DPM++ SDE Karras", "DDIM", "UniPC"]
        
        return cls(
            denoising_strength=float(vector[0]),
            cfg_scale=float(vector[1]),
            steps=int(vector[2]),
            controlnet_weight=float(vector[3]),
            sampler=samplers[int(vector[4]) % len(samplers)],
            style_id=style_id,
            **kwargs
        )

class ExplorationStrategy:
    """Base class for exploration strategies"""
    
    def __init__(self, name: str):
        self.name = name
        self.explored_points = []
        self.best_points = {}  # style_id -> best_point
    
    def suggest_next_points(self, style_id: str, count: int = 1) -> List[ParameterPoint]:
        """Suggest next parameter points to explore"""
        raise NotImplementedError
    
    def update_with_result(self, point: ParameterPoint):
        """Update strategy with new evaluation result"""
        self.explored_points.append(point)
        
        # Update best point for style
        style_id = point.style_id
        if (style_id not in self.best_points or 
            point.reward > self.best_points[style_id].reward):
            self.best_points[style_id] = point

class RandomExploration(ExplorationStrategy):
    """Random parameter exploration"""
    
    def __init__(self):
        super().__init__("Random")
        
        # Parameter ranges
        self.ranges = {
            'denoising_strength': (0.3, 0.8),
            'cfg_scale': (4.0, 15.0),
            'steps': (20, 60),
            'controlnet_weight': (0.3, 1.0)
        }
        
        self.samplers = ["DPM++ 2M Karras", "Euler a", "DPM++ SDE Karras", "DDIM", "UniPC"]
    
    def suggest_next_points(self, style_id: str, count: int = 1) -> List[ParameterPoint]:
        """Generate random parameter points"""
        points = []
        
        for _ in range(count):
            point = ParameterPoint(
                denoising_strength=random.uniform(*self.ranges['denoising_strength']),
                cfg_scale=random.uniform(*self.ranges['cfg_scale']),
                steps=random.randint(*self.ranges['steps']),
                controlnet_weight=random.uniform(*self.ranges['controlnet_weight']),
                sampler=random.choice(self.samplers),
                style_id=style_id,
                reward=0.0,
                subject_preservation=0.0,
                oil_painting_authenticity=0.0,
                style_distinctiveness=0.0,
                processing_time=0.0,
                timestamp=time.strftime('%Y-%m-%d %H:%M:%S'),
                image_context={}
            )
            points.append(point)
        
        return points

class GridExploration(ExplorationStrategy):
    """Systematic grid exploration"""
    
    def __init__(self, resolution: int = 3):
        super().__init__("Grid")
        self.resolution = resolution
        self.grid_points = self._generate_grid()
        self.current_index = 0
    
    def _generate_grid(self) -> List[Dict]:
        """Generate grid points"""
        # Define grid ranges
        denoising_values = np.linspace(0.35, 0.75, self.resolution)
        cfg_values = np.linspace(6.0, 12.0, self.resolution)
        steps_values = [25, 35, 45]
        controlnet_values = np.linspace(0.4, 0.8, self.resolution)
        samplers = ["DPM++ 2M Karras", "Euler a", "DPM++ SDE Karras"]
        
        # Generate all combinations
        grid_points = []
        for combo in itertools.product(denoising_values, cfg_values, steps_values, controlnet_values, samplers):
            grid_points.append({
                'denoising_strength': float(combo[0]),
                'cfg_scale': float(combo[1]),
                'steps': int(combo[2]),
                'controlnet_weight': float(combo[3]),
                'sampler': combo[4]
            })
        
        return grid_points
    
    def suggest_next_points(self, style_id: str, count: int = 1) -> List[ParameterPoint]:
        """Get next grid points"""
        points = []
        
        for _ in range(count):
            if self.current_index >= len(self.grid_points):
                # Reset grid for new cycle
                self.current_index = 0
            
            grid_point = self.grid_points[self.current_index]
            self.current_index += 1
            
            point = ParameterPoint(
                style_id=style_id,
                reward=0.0,
                subject_preservation=0.0,
                oil_painting_authenticity=0.0,
                style_distinctiveness=0.0,
                processing_time=0.0,
                timestamp=time.strftime('%Y-%m-%d %H:%M:%S'),
                image_context={},
                **grid_point
            )
            points.append(point)
        
        return points

class GaussianProcessExploration(ExplorationStrategy):
    """Bayesian optimization using Gaussian Process"""
    
    def __init__(self):
        super().__init__("GaussianProcess")
        
        # GP model for each style
        self.gp_models = {}
        
        # Parameter bounds
        self.bounds = np.array([
            [0.3, 0.8],   # denoising_strength
            [4.0, 15.0],  # cfg_scale
            [20, 60],     # steps
            [0.3, 1.0],   # controlnet_weight
            [0, 4]        # sampler (0-4 for 5 samplers)
        ])
        
        self.samplers = ["DPM++ 2M Karras", "Euler a", "DPM++ SDE Karras", "DDIM", "UniPC"]
        
        # Minimum points needed before GP can work
        self.min_points = 5
    
    def _get_training_data(self, style_id: str) -> Tuple[np.ndarray, np.ndarray]:
        """Get training data for GP"""
        style_points = [p for p in self.explored_points if p.style_id == style_id]
        
        if len(style_points) < self.min_points:
            return None, None
        
        X = np.array([p.to_vector() for p in style_points])
        y = np.array([p.reward for p in style_points])
        
        return X, y
    
    def _fit_gp_model(self, style_id: str):
        """Fit GP model for style"""
        X, y = self._get_training_data(style_id)
        
        if X is None:
            return False
        
        # Create and fit GP
        kernel = Matern(length_scale=1.0, nu=2.5)
        gp = GaussianProcessRegressor(
            kernel=kernel,
            alpha=1e-6,
            normalize_y=True,
            n_restarts_optimizer=5
        )
        
        gp.fit(X, y)
        self.gp_models[style_id] = gp
        
        return True
    
    def _acquisition_function(self, X: np.ndarray, gp: GaussianProcessRegressor, best_y: float, xi: float = 0.01) -> np.ndarray:
        """Expected Improvement acquisition function"""
        mu, sigma = gp.predict(X, return_std=True)
        sigma = sigma.reshape(-1, 1)
        
        # Expected Improvement
        with np.errstate(divide='warn'):
            imp = mu - best_y - xi
            Z = imp / sigma
            ei = imp * norm.cdf(Z) + sigma * norm.pdf(Z)
            ei[sigma == 0.0] = 0.0
        
        return ei
    
    def suggest_next_points(self, style_id: str, count: int = 1) -> List[ParameterPoint]:
        """Suggest points using Bayesian optimization"""
        # Try to fit GP model
        if self._fit_gp_model(style_id):
            return self._suggest_with_gp(style_id, count)
        else:
            # Fall back to random exploration
            return RandomExploration().suggest_next_points(style_id, count)
    
    def _suggest_with_gp(self, style_id: str, count: int) -> List[ParameterPoint]:
        """Suggest points using trained GP"""
        gp = self.gp_models[style_id]
        best_y = max(p.reward for p in self.explored_points if p.style_id == style_id)
        
        points = []
        
        for _ in range(count):
            # Optimize acquisition function
            from scipy.stats import norm
            
            def objective(x):
                X_test = x.reshape(1, -1)
                return -self._acquisition_function(X_test, gp, best_y)[0]
            
            # Random search for acquisition function maximum
            best_x = None
            best_acq = float('inf')
            
            for _ in range(100):  # Random search iterations
                x_random = np.random.uniform(self.bounds[:, 0], self.bounds[:, 1])
                acq_val = objective(x_random)
                
                if acq_val < best_acq:
                    best_acq = acq_val
                    best_x = x_random
            
            # Create parameter point
            if best_x is not None:
                # Clamp to bounds and round integers
                best_x[2] = round(np.clip(best_x[2], 20, 60))  # steps
                best_x[4] = round(np.clip(best_x[4], 0, 4))    # sampler
                
                point = ParameterPoint.from_vector(
                    best_x,
                    style_id=style_id,
                    reward=0.0,
                    subject_preservation=0.0,
                    oil_painting_authenticity=0.0,
                    style_distinctiveness=0.0,
                    processing_time=0.0,
                    timestamp=time.strftime('%Y-%m-%d %H:%M:%S'),
                    image_context={}
                )
                points.append(point)
        
        return points

class DifferentialEvolutionExploration(ExplorationStrategy):
    """Differential Evolution optimization"""
    
    def __init__(self, population_size: int = 15):
        super().__init__("DifferentialEvolution")
        self.population_size = population_size
        self.bounds = [
            (0.3, 0.8),   # denoising_strength
            (4.0, 15.0),  # cfg_scale
            (20, 60),     # steps
            (0.3, 1.0),   # controlnet_weight
            (0, 4)        # sampler
        ]
        self.generation = 0
        self.population = {}  # style_id -> population
    
    def _initialize_population(self, style_id: str) -> List[ParameterPoint]:
        """Initialize population for DE"""
        population = []
        
        for _ in range(self.population_size):
            point = ParameterPoint(
                denoising_strength=random.uniform(0.3, 0.8),
                cfg_scale=random.uniform(4.0, 15.0),
                steps=random.randint(20, 60),
                controlnet_weight=random.uniform(0.3, 1.0),
                sampler=random.choice(["DPM++ 2M Karras", "Euler a", "DPM++ SDE Karras", "DDIM", "UniPC"]),
                style_id=style_id,
                reward=0.0,
                subject_preservation=0.0,
                oil_painting_authenticity=0.0,
                style_distinctiveness=0.0,
                processing_time=0.0,
                timestamp=time.strftime('%Y-%m-%d %H:%M:%S'),
                image_context={}
            )
            population.append(point)
        
        return population
    
    def suggest_next_points(self, style_id: str, count: int = 1) -> List[ParameterPoint]:
        """Suggest points using DE"""
        if style_id not in self.population:
            # Initialize population
            self.population[style_id] = self._initialize_population(style_id)
            return self.population[style_id][:count]
        
        # Generate offspring using DE mutation and crossover
        population = self.population[style_id]
        evaluated_points = [p for p in self.explored_points if p.style_id == style_id]
        
        if len(evaluated_points) < len(population):
            # Still evaluating initial population
            return []
        
        # Update population with evaluation results
        for i, point in enumerate(population):
            # Find corresponding evaluated point
            for eval_point in evaluated_points:
                if self._points_equal(point, eval_point):
                    population[i] = eval_point
                    break
        
        # Generate new offspring
        offspring = []
        
        for _ in range(count):
            # Select three random parents
            parents = random.sample(population, 3)
            
            # DE mutation: V = X1 + F * (X2 - X3)
            F = 0.5  # Mutation factor
            
            parent_vectors = [p.to_vector() for p in parents]
            mutant_vector = parent_vectors[0] + F * (parent_vectors[1] - parent_vectors[2])
            
            # Crossover
            CR = 0.7  # Crossover probability
            target_vector = parents[0].to_vector()
            
            for i in range(len(mutant_vector)):
                if random.random() > CR:
                    mutant_vector[i] = target_vector[i]
            
            # Clamp to bounds
            mutant_vector[0] = np.clip(mutant_vector[0], 0.3, 0.8)     # denoising
            mutant_vector[1] = np.clip(mutant_vector[1], 4.0, 15.0)    # cfg
            mutant_vector[2] = np.clip(mutant_vector[2], 20, 60)       # steps
            mutant_vector[3] = np.clip(mutant_vector[3], 0.3, 1.0)     # controlnet
            mutant_vector[4] = np.clip(mutant_vector[4], 0, 4)         # sampler
            
            # Round integers
            mutant_vector[2] = round(mutant_vector[2])  # steps
            mutant_vector[4] = round(mutant_vector[4])  # sampler
            
            # Create parameter point
            offspring_point = ParameterPoint.from_vector(
                mutant_vector,
                style_id=style_id,
                reward=0.0,
                subject_preservation=0.0,
                oil_painting_authenticity=0.0,
                style_distinctiveness=0.0,
                processing_time=0.0,
                timestamp=time.strftime('%Y-%m-%d %H:%M:%S'),
                image_context={}
            )
            
            offspring.append(offspring_point)
        
        return offspring
    
    def _points_equal(self, p1: ParameterPoint, p2: ParameterPoint) -> bool:
        """Check if two parameter points are equal"""
        return (
            abs(p1.denoising_strength - p2.denoising_strength) < 0.001 and
            abs(p1.cfg_scale - p2.cfg_scale) < 0.1 and
            p1.steps == p2.steps and
            abs(p1.controlnet_weight - p2.controlnet_weight) < 0.001 and
            p1.sampler == p2.sampler
        )

class AdaptiveExploration(ExplorationStrategy):
    """Adaptive exploration that switches between strategies"""
    
    def __init__(self):
        super().__init__("Adaptive")
        
        # Initialize sub-strategies
        self.strategies = {
            'random': RandomExploration(),
            'grid': GridExploration(resolution=3),
            'gp': GaussianProcessExploration(),
            'de': DifferentialEvolutionExploration()
        }
        
        # Performance tracking for each strategy
        self.strategy_performance = defaultdict(list)
        self.strategy_usage = defaultdict(int)
        
        # Current strategy selection
        self.current_strategy = 'random'
        self.evaluation_window = 20  # Evaluate strategy performance every N points
    
    def suggest_next_points(self, style_id: str, count: int = 1) -> List[ParameterPoint]:
        """Suggest points using adaptive strategy selection"""
        
        # Update strategy selection periodically
        if len(self.explored_points) % self.evaluation_window == 0 and len(self.explored_points) > 0:
            self._update_strategy_selection(style_id)
        
        # Get suggestions from current strategy
        strategy = self.strategies[self.current_strategy]
        points = strategy.suggest_next_points(style_id, count)
        
        # Track usage
        self.strategy_usage[self.current_strategy] += count
        
        return points
    
    def update_with_result(self, point: ParameterPoint):
        """Update all strategies with result"""
        super().update_with_result(point)
        
        # Update all sub-strategies
        for strategy in self.strategies.values():
            strategy.update_with_result(point)
        
        # Track performance for strategy that generated this point
        # (This is simplified - in practice you'd need to track which strategy generated which point)
        self.strategy_performance[self.current_strategy].append(point.reward)
    
    def _update_strategy_selection(self, style_id: str):
        """Update strategy selection based on performance"""
        
        if len(self.explored_points) < 50:
            # Early exploration phase - use random and grid
            self.current_strategy = random.choice(['random', 'grid'])
            return
        
        # Calculate recent performance for each strategy
        strategy_scores = {}
        
        for strategy_name, rewards in self.strategy_performance.items():
            if len(rewards) >= 5:  # Need minimum evaluations
                recent_rewards = rewards[-10:]  # Last 10 evaluations
                strategy_scores[strategy_name] = np.mean(recent_rewards)
        
        if strategy_scores:
            # Select best performing strategy
            best_strategy = max(strategy_scores.keys(), key=lambda k: strategy_scores[k])
            
            # Add some randomness to avoid getting stuck
            if random.random() < 0.2:  # 20% chance to explore other strategies
                self.current_strategy = random.choice(list(self.strategies.keys()))
            else:
                self.current_strategy = best_strategy
        
        logging.info(f"Switched to strategy: {self.current_strategy}")

class ParameterExplorer:
    """Main parameter exploration coordinator"""
    
    def __init__(self, exploration_strategy: str = "adaptive", output_dir: str = "rl_training/exploration"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize exploration strategy
        self.strategy = self._create_strategy(exploration_strategy)
        
        # Data storage
        self.exploration_history_file = self.output_dir / "exploration_history.json"
        self.exploration_data = self._load_exploration_data()
        
        # Load previous results into strategy
        for point_data in self.exploration_data:
            point = self._dict_to_parameter_point(point_data)
            self.strategy.update_with_result(point)
    
    def _create_strategy(self, strategy_name: str) -> ExplorationStrategy:
        """Create exploration strategy"""
        strategies = {
            'random': RandomExploration,
            'grid': GridExploration,
            'gaussian_process': GaussianProcessExploration,
            'differential_evolution': DifferentialEvolutionExploration,
            'adaptive': AdaptiveExploration
        }
        
        if strategy_name not in strategies:
            logging.warning(f"Unknown strategy {strategy_name}, using adaptive")
            strategy_name = 'adaptive'
        
        return strategies[strategy_name]()
    
    def _load_exploration_data(self) -> List[Dict]:
        """Load previous exploration data"""
        if self.exploration_history_file.exists():
            with open(self.exploration_history_file, 'r') as f:
                return json.load(f)
        return []
    
    def _save_exploration_data(self):
        """Save exploration data"""
        with open(self.exploration_history_file, 'w') as f:
            json.dump(self.exploration_data, f, indent=2, default=str)
    
    def _dict_to_parameter_point(self, data: Dict) -> ParameterPoint:
        """Convert dictionary to ParameterPoint"""
        return ParameterPoint(**data)
    
    def suggest_exploration_points(self, style_id: str, count: int = 5) -> List[Dict]:
        """Suggest parameter points for exploration"""
        
        # Get suggestions from strategy
        points = self.strategy.suggest_next_points(style_id, count)
        
        # Convert to dictionaries for external use
        point_dicts = []
        for point in points:
            point_dict = asdict(point)
            point_dicts.append(point_dict)
        
        return point_dicts
    
    def record_exploration_result(self, parameters: Dict, evaluation_scores: Dict, 
                                processing_time: float, image_context: Dict = None):
        """Record the result of parameter exploration"""
        
        # Calculate reward from evaluation scores
        reward = evaluation_scores.get('overall_quality', 0.0)
        
        # Create parameter point
        point = ParameterPoint(
            denoising_strength=parameters['denoising_strength'],
            cfg_scale=parameters['cfg_scale'],
            steps=parameters['steps'],
            controlnet_weight=parameters['controlnet_weight'],
            sampler=parameters['sampler'],
            style_id=parameters['style_id'],
            reward=reward,
            subject_preservation=evaluation_scores.get('subject_preservation', 0.0),
            oil_painting_authenticity=evaluation_scores.get('oil_painting_authenticity', 0.0),
            style_distinctiveness=evaluation_scores.get('style_distinctiveness', 0.0),
            processing_time=processing_time,
            timestamp=time.strftime('%Y-%m-%d %H:%M:%S'),
            image_context=image_context or {}
        )
        
        # Update strategy
        self.strategy.update_with_result(point)
        
        # Save to history
        self.exploration_data.append(asdict(point))
        self._save_exploration_data()
        
        logging.info(f"Recorded exploration result: reward={reward:.3f}, style={parameters['style_id']}")
    
    def get_best_parameters(self, style_id: str) -> Optional[Dict]:
        """Get best known parameters for a style"""
        if style_id in self.strategy.best_points:
            best_point = self.strategy.best_points[style_id]
            return {
                'denoising_strength': best_point.denoising_strength,
                'cfg_scale': best_point.cfg_scale,
                'steps': best_point.steps,
                'controlnet_weight': best_point.controlnet_weight,
                'sampler': best_point.sampler,
                'style_id': best_point.style_id
            }
        return None
    
    def get_exploration_statistics(self) -> Dict:
        """Get exploration statistics"""
        if not self.exploration_data:
            return {}
        
        # Overall statistics
        rewards = [p['reward'] for p in self.exploration_data]
        processing_times = [p['processing_time'] for p in self.exploration_data]
        
        stats = {
            'total_explorations': len(self.exploration_data),
            'avg_reward': np.mean(rewards),
            'best_reward': np.max(rewards),
            'reward_std': np.std(rewards),
            'avg_processing_time': np.mean(processing_times),
            'strategy_name': self.strategy.name
        }
        
        # Per-style statistics
        style_stats = {}
        for style in ['classic_portrait', 'thick_textured', 'soft_impressionist']:
            style_points = [p for p in self.exploration_data if p['style_id'] == style]
            
            if style_points:
                style_rewards = [p['reward'] for p in style_points]
                style_stats[style] = {
                    'count': len(style_points),
                    'avg_reward': np.mean(style_rewards),
                    'best_reward': np.max(style_rewards),
                    'reward_std': np.std(style_rewards)
                }
        
        stats['style_statistics'] = style_stats
        
        return stats
    
    def generate_exploration_visualizations(self):
        """Generate visualization of parameter exploration"""
        if len(self.exploration_data) < 10:
            logging.info("Not enough exploration data for visualization")
            return
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('Parameter Space Exploration Analysis', fontsize=16)
        
        # Convert to DataFrame
        import pandas as pd
        df = pd.DataFrame(self.exploration_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # 1. Reward progression over time
        axes[0, 0].plot(df['timestamp'], df['reward'], alpha=0.6, marker='o', markersize=2)
        axes[0, 0].set_title('Reward Progression Over Time')
        axes[0, 0].set_ylabel('Reward')
        axes[0, 0].tick_params(axis='x', rotation=45)
        
        # 2. Parameter correlation heatmap
        param_cols = ['denoising_strength', 'cfg_scale', 'steps', 'controlnet_weight', 'reward']
        corr_data = df[param_cols].corr()
        sns.heatmap(corr_data, annot=True, cmap='coolwarm', center=0, ax=axes[0, 1])
        axes[0, 1].set_title('Parameter Correlation Matrix')
        
        # 3. Reward distribution by style
        for i, style in enumerate(['classic_portrait', 'thick_textured', 'soft_impressionist']):
            style_data = df[df['style_id'] == style]
            if not style_data.empty:
                axes[0, 2].hist(style_data['reward'], alpha=0.7, label=style, bins=15)
        axes[0, 2].set_title('Reward Distribution by Style')
        axes[0, 2].set_xlabel('Reward')
        axes[0, 2].set_ylabel('Frequency')
        axes[0, 2].legend()
        
        # 4. Denoising vs Reward
        scatter = axes[1, 0].scatter(df['denoising_strength'], df['reward'], 
                                   c=df['cfg_scale'], cmap='viridis', alpha=0.6)
        axes[1, 0].set_title('Denoising Strength vs Reward (colored by CFG Scale)')
        axes[1, 0].set_xlabel('Denoising Strength')
        axes[1, 0].set_ylabel('Reward')
        plt.colorbar(scatter, ax=axes[1, 0], label='CFG Scale')
        
        # 5. ControlNet Weight vs Reward
        scatter2 = axes[1, 1].scatter(df['controlnet_weight'], df['reward'], 
                                    c=df['steps'], cmap='plasma', alpha=0.6)
        axes[1, 1].set_title('ControlNet Weight vs Reward (colored by Steps)')
        axes[1, 1].set_xlabel('ControlNet Weight')
        axes[1, 1].set_ylabel('Reward')
        plt.colorbar(scatter2, ax=axes[1, 1], label='Steps')
        
        # 6. Processing Time vs Reward
        axes[1, 2].scatter(df['processing_time'], df['reward'], alpha=0.6)
        axes[1, 2].set_title('Processing Time vs Reward')
        axes[1, 2].set_xlabel('Processing Time (seconds)')
        axes[1, 2].set_ylabel('Reward')
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'exploration_analysis.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Generate parameter landscape visualization
        self._generate_parameter_landscape()
    
    def _generate_parameter_landscape(self):
        """Generate 3D parameter landscape visualization"""
        if len(self.exploration_data) < 20:
            return
        
        df = pd.DataFrame(self.exploration_data)
        
        # Create 3D landscape for each style
        for style in ['classic_portrait', 'thick_textured', 'soft_impressionist']:
            style_data = df[df['style_id'] == style]
            
            if len(style_data) < 10:
                continue
            
            fig = plt.figure(figsize=(12, 8))
            ax = fig.add_subplot(111, projection='3d')
            
            # Create scatter plot
            scatter = ax.scatter(
                style_data['denoising_strength'],
                style_data['cfg_scale'],
                style_data['controlnet_weight'],
                c=style_data['reward'],
                cmap='viridis',
                s=60,
                alpha=0.7
            )
            
            ax.set_xlabel('Denoising Strength')
            ax.set_ylabel('CFG Scale')
            ax.set_zlabel('ControlNet Weight')
            ax.set_title(f'Parameter Landscape - {style.replace("_", " ").title()}')
            
            plt.colorbar(scatter, ax=ax, label='Reward', shrink=0.5)
            
            plt.savefig(self.output_dir / f'parameter_landscape_{style}.png', 
                       dpi=300, bbox_inches='tight')
            plt.close()
    
    def export_optimization_results(self, filename: str = "optimization_results.json"):
        """Export optimization results for deployment"""
        results = {
            'best_parameters': {},
            'exploration_statistics': self.get_exploration_statistics(),
            'strategy_name': self.strategy.name,
            'total_explorations': len(self.exploration_data),
            'export_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Get best parameters for each style
        for style in ['classic_portrait', 'thick_textured', 'soft_impressionist']:
            best_params = self.get_best_parameters(style)
            if best_params:
                results['best_parameters'][style] = best_params
        
        # Save to file
        output_file = self.output_dir / filename
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        logging.info(f"Optimization results exported to {output_file}")
        
        return results

def main():
    """Example usage"""
    
    # Initialize explorer with adaptive strategy
    explorer = ParameterExplorer("adaptive")
    
    # Example exploration
    style_id = "classic_portrait"
    
    # Get exploration suggestions
    suggestions = explorer.suggest_exploration_points(style_id, count=3)
    
    print(f"Exploration suggestions for {style_id}:")
    for i, suggestion in enumerate(suggestions):
        print(f"{i+1}. Denoising: {suggestion['denoising_strength']:.3f}, "
              f"CFG: {suggestion['cfg_scale']:.1f}, "
              f"Steps: {suggestion['steps']}, "
              f"ControlNet: {suggestion['controlnet_weight']:.3f}, "
              f"Sampler: {suggestion['sampler']}")
    
    # Simulate recording results
    for suggestion in suggestions:
        # Simulate evaluation (in real use, this would come from actual conversion)
        fake_scores = {
            'overall_quality': random.uniform(0.3, 0.9),
            'subject_preservation': random.uniform(0.4, 0.95),
            'oil_painting_authenticity': random.uniform(0.3, 0.85),
            'style_distinctiveness': random.uniform(0.4, 0.9)
        }
        
        explorer.record_exploration_result(
            suggestion, 
            fake_scores, 
            processing_time=random.uniform(15, 60),
            image_context={'filename': 'test_image.jpg'}
        )
    
    # Get statistics
    stats = explorer.get_exploration_statistics()
    print(f"\nExploration Statistics:")
    print(f"Total explorations: {stats['total_explorations']}")
    print(f"Average reward: {stats['avg_reward']:.3f}")
    print(f"Best reward: {stats['best_reward']:.3f}")
    print(f"Strategy: {stats['strategy_name']}")
    
    # Export results
    results = explorer.export_optimization_results()
    print(f"\nResults exported with {len(results['best_parameters'])} optimized styles")


if __name__ == "__main__":
    main()
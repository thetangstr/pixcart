#!/usr/bin/env python3
"""
Automated RL Training Pipeline
Orchestrates the complete training process with batch processing and progress tracking
"""

import os
import json
import time
import uuid
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import psutil
import threading
import queue
from collections import defaultdict

# Import our components
from dataset_acquisition import DatasetAcquisition
from rl_optimizer import RLParameterOptimizer, ParameterState
from vision_evaluator import VisionEvaluator
from human_evaluation import HumanEvaluationIntegration

@dataclass
class TrainingConfig:
    """Training configuration parameters"""
    # Dataset settings
    total_images: int = 500
    train_test_split: float = 0.9
    batch_size: int = 20
    
    # RL training settings
    episodes_per_style: int = 100
    max_steps_per_episode: int = 10
    target_success_rate: float = 0.95
    
    # Evaluation settings
    human_evaluation_frequency: int = 20  # Every N conversions
    automated_evaluation_only: bool = False
    
    # System settings
    max_concurrent_conversions: int = 3
    checkpoint_frequency: int = 10  # Episodes
    backup_frequency: int = 50  # Episodes
    
    # Performance settings
    max_processing_time: float = 120.0  # seconds
    memory_limit_gb: float = 8.0
    
    # Output settings
    output_dir: str = "rl_training/results"
    log_level: str = "INFO"

@dataclass
class TrainingProgress:
    """Track training progress"""
    start_time: datetime
    current_style: str
    current_episode: int
    total_episodes: int
    conversions_completed: int
    conversions_failed: int
    best_scores: Dict[str, float]
    training_time_elapsed: float
    estimated_time_remaining: float

class ProgressTracker:
    """Track and visualize training progress"""
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.progress_file = self.output_dir / "training_progress.json"
        self.metrics_file = self.output_dir / "metrics_history.json"
        
        # Progress data
        self.progress_data = {
            "start_time": None,
            "styles_completed": [],
            "current_style": None,
            "episode_history": [],
            "conversion_stats": {
                "total_conversions": 0,
                "successful_conversions": 0,
                "failed_conversions": 0,
                "avg_processing_time": 0.0
            },
            "best_scores": {},
            "human_evaluations": 0
        }
        
        # Metrics history
        self.metrics_history = []
        
        # Load existing data
        self.load_progress()
    
    def save_progress(self):
        """Save progress to file"""
        with open(self.progress_file, 'w') as f:
            json.dump(self.progress_data, f, indent=2, default=str)
        
        with open(self.metrics_file, 'w') as f:
            json.dump(self.metrics_history, f, indent=2, default=str)
    
    def load_progress(self):
        """Load existing progress"""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                self.progress_data = json.load(f)
        
        if self.metrics_file.exists():
            with open(self.metrics_file, 'r') as f:
                self.metrics_history = json.load(f)
    
    def start_training(self):
        """Mark training start"""
        self.progress_data["start_time"] = datetime.now().isoformat()
        self.save_progress()
    
    def start_style(self, style_id: str):
        """Mark start of style training"""
        self.progress_data["current_style"] = style_id
        self.save_progress()
    
    def complete_style(self, style_id: str, best_score: float):
        """Mark completion of style training"""
        self.progress_data["styles_completed"].append({
            "style_id": style_id,
            "completion_time": datetime.now().isoformat(),
            "best_score": best_score
        })
        self.progress_data["best_scores"][style_id] = best_score
        self.save_progress()
    
    def add_episode_result(self, style_id: str, episode: int, results: Dict):
        """Add episode results"""
        episode_data = {
            "timestamp": datetime.now().isoformat(),
            "style_id": style_id,
            "episode": episode,
            "avg_reward": results.get("avg_reward", 0.0),
            "best_reward": results.get("best_reward", 0.0),
            "conversions": results.get("conversions", 0),
            "failures": results.get("failures", 0),
            "processing_time": results.get("processing_time", 0.0),
            "epsilon": results.get("epsilon", 0.0)
        }
        
        self.progress_data["episode_history"].append(episode_data)
        self.metrics_history.append(episode_data)
        
        # Update conversion stats
        stats = self.progress_data["conversion_stats"]
        stats["total_conversions"] += results.get("conversions", 0)
        stats["successful_conversions"] += results.get("conversions", 0) - results.get("failures", 0)
        stats["failed_conversions"] += results.get("failures", 0)
        
        if stats["total_conversions"] > 0:
            stats["avg_processing_time"] = (
                stats["avg_processing_time"] * (stats["total_conversions"] - results.get("conversions", 0)) +
                results.get("processing_time", 0.0) * results.get("conversions", 0)
            ) / stats["total_conversions"]
        
        self.save_progress()
    
    def add_human_evaluation(self):
        """Record human evaluation"""
        self.progress_data["human_evaluations"] += 1
        self.save_progress()
    
    def get_current_stats(self) -> Dict:
        """Get current training statistics"""
        if not self.progress_data["start_time"]:
            return {}
        
        start_time = datetime.fromisoformat(self.progress_data["start_time"])
        elapsed_time = (datetime.now() - start_time).total_seconds()
        
        stats = {
            "training_time_hours": elapsed_time / 3600,
            "styles_completed": len(self.progress_data["styles_completed"]),
            "current_style": self.progress_data["current_style"],
            "total_episodes": len(self.progress_data["episode_history"]),
            "total_conversions": self.progress_data["conversion_stats"]["total_conversions"],
            "success_rate": (
                self.progress_data["conversion_stats"]["successful_conversions"] /
                max(1, self.progress_data["conversion_stats"]["total_conversions"])
            ),
            "avg_processing_time": self.progress_data["conversion_stats"]["avg_processing_time"],
            "human_evaluations": self.progress_data["human_evaluations"],
            "best_scores": self.progress_data["best_scores"]
        }
        
        return stats
    
    def generate_visualizations(self):
        """Generate training visualization plots"""
        if not self.metrics_history:
            return
        
        # Convert to DataFrame for easier plotting
        df = pd.DataFrame(self.metrics_history)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('RL Training Progress', fontsize=16)
        
        # 1. Reward progression by style
        axes[0, 0].set_title('Average Reward by Episode')
        for style in df['style_id'].unique():
            style_data = df[df['style_id'] == style]
            axes[0, 0].plot(style_data['episode'], style_data['avg_reward'], 
                          label=f'{style}', marker='o', markersize=3)
        axes[0, 0].set_xlabel('Episode')
        axes[0, 0].set_ylabel('Average Reward')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        
        # 2. Best reward progression
        axes[0, 1].set_title('Best Reward by Episode')
        for style in df['style_id'].unique():
            style_data = df[df['style_id'] == style]
            axes[0, 1].plot(style_data['episode'], style_data['best_reward'], 
                          label=f'{style}', marker='s', markersize=3)
        axes[0, 1].set_xlabel('Episode')
        axes[0, 1].set_ylabel('Best Reward')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
        
        # 3. Processing time
        axes[1, 0].set_title('Processing Time per Conversion')
        axes[1, 0].hist(df['processing_time'], bins=20, alpha=0.7, edgecolor='black')
        axes[1, 0].set_xlabel('Processing Time (seconds)')
        axes[1, 0].set_ylabel('Frequency')
        axes[1, 0].grid(True, alpha=0.3)
        
        # 4. Exploration rate (epsilon)
        axes[1, 1].set_title('Exploration Rate (Epsilon)')
        for style in df['style_id'].unique():
            style_data = df[df['style_id'] == style]
            axes[1, 1].plot(style_data['episode'], style_data['epsilon'], 
                          label=f'{style}', marker='^', markersize=3)
        axes[1, 1].set_xlabel('Episode')
        axes[1, 1].set_ylabel('Epsilon')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'training_progress.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Generate style comparison
        self._generate_style_comparison()
    
    def _generate_style_comparison(self):
        """Generate style-specific comparison charts"""
        if not self.metrics_history:
            return
        
        df = pd.DataFrame(self.metrics_history)
        
        # Style performance comparison
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        
        # Final performance by style
        final_performance = {}
        for style in df['style_id'].unique():
            style_data = df[df['style_id'] == style]
            if not style_data.empty:
                final_performance[style] = style_data['best_reward'].max()
        
        if final_performance:
            styles = list(final_performance.keys())
            scores = list(final_performance.values())
            
            axes[0].bar(styles, scores, color=['#ff7f0e', '#2ca02c', '#d62728'])
            axes[0].set_title('Best Score by Style')
            axes[0].set_ylabel('Best Reward')
            axes[0].set_ylim(0, 1.0)
            
            for i, score in enumerate(scores):
                axes[0].text(i, score + 0.02, f'{score:.3f}', ha='center')
        
        # Training efficiency (episodes to reach 0.8 reward)
        efficiency = {}
        for style in df['style_id'].unique():
            style_data = df[df['style_id'] == style].sort_values('episode')
            threshold_reached = style_data[style_data['best_reward'] >= 0.8]
            if not threshold_reached.empty:
                efficiency[style] = threshold_reached.iloc[0]['episode']
            else:
                efficiency[style] = len(style_data)  # Didn't reach threshold
        
        if efficiency:
            styles = list(efficiency.keys())
            episodes = list(efficiency.values())
            
            axes[1].bar(styles, episodes, color=['#ff7f0e', '#2ca02c', '#d62728'])
            axes[1].set_title('Episodes to Reach 0.8 Reward')
            axes[1].set_ylabel('Episodes')
            
            for i, ep in enumerate(episodes):
                axes[1].text(i, ep + 1, str(ep), ha='center')
        
        plt.tight_layout()
        plt.savefig(self.output_dir / 'style_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()

class ResourceMonitor:
    """Monitor system resources during training"""
    
    def __init__(self, memory_limit_gb: float = 8.0):
        self.memory_limit_gb = memory_limit_gb
        self.monitoring = False
        self.monitor_thread = None
        self.resource_data = []
        
    def start_monitoring(self):
        """Start resource monitoring"""
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop resource monitoring"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
    
    def _monitor_loop(self):
        """Monitor system resources"""
        while self.monitoring:
            try:
                # Get system stats
                cpu_percent = psutil.cpu_percent()
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                data = {
                    'timestamp': datetime.now().isoformat(),
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_used_gb': memory.used / (1024**3),
                    'disk_percent': disk.percent
                }
                
                self.resource_data.append(data)
                
                # Check for memory issues
                if memory.used / (1024**3) > self.memory_limit_gb:
                    logging.warning(f"Memory usage ({memory.used / (1024**3):.1f}GB) exceeds limit ({self.memory_limit_gb}GB)")
                
                time.sleep(30)  # Monitor every 30 seconds
                
            except Exception as e:
                logging.error(f"Resource monitoring error: {e}")
                time.sleep(60)
    
    def get_resource_summary(self) -> Dict:
        """Get resource usage summary"""
        if not self.resource_data:
            return {}
        
        df = pd.DataFrame(self.resource_data)
        
        return {
            'avg_cpu_percent': df['cpu_percent'].mean(),
            'max_cpu_percent': df['cpu_percent'].max(),
            'avg_memory_percent': df['memory_percent'].mean(),
            'max_memory_gb': df['memory_used_gb'].max(),
            'avg_memory_gb': df['memory_used_gb'].mean(),
            'data_points': len(self.resource_data)
        }

class TrainingPipeline:
    """Main training pipeline orchestrator"""
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        
        # Setup output directory
        self.output_dir = Path(config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup logging
        self._setup_logging()
        
        # Initialize components
        self.dataset_acquisition = DatasetAcquisition()
        self.rl_optimizer = RLParameterOptimizer()
        self.vision_evaluator = VisionEvaluator()
        self.human_evaluation = HumanEvaluationIntegration()
        
        # Progress tracking
        self.progress_tracker = ProgressTracker(str(self.output_dir))
        self.resource_monitor = ResourceMonitor(config.memory_limit_gb)
        
        # Training state
        self.training_queue = queue.Queue()
        self.results_queue = queue.Queue()
        self.is_training = False
        
        logging.info("Training pipeline initialized")
    
    def _setup_logging(self):
        """Setup logging configuration"""
        log_file = self.output_dir / "training.log"
        
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
    
    def prepare_dataset(self) -> Tuple[List[str], List[str]]:
        """Prepare training dataset"""
        logging.info("Preparing dataset...")
        
        # Check if dataset already exists
        if self.dataset_acquisition.metadata_file.exists():
            logging.info("Loading existing dataset")
            metadata = self.dataset_acquisition.load_metadata()
            
            if metadata["total_images"] >= self.config.total_images:
                logging.info(f"Dataset has {metadata['total_images']} images, using existing")
            else:
                logging.info(f"Dataset has {metadata['total_images']} images, acquiring more")
                self.dataset_acquisition.acquire_dataset(self.config.total_images)
        else:
            logging.info("Acquiring new dataset")
            self.dataset_acquisition.acquire_dataset(self.config.total_images)
        
        # Create train/test split
        train_files, test_files = self.dataset_acquisition.create_test_split(
            1.0 - self.config.train_test_split
        )
        
        logging.info(f"Dataset prepared: {len(train_files)} training, {len(test_files)} test images")
        
        return train_files, test_files
    
    def run_training(self) -> Dict:
        """Run complete training pipeline"""
        logging.info("Starting RL training pipeline")
        
        try:
            # Start monitoring
            self.resource_monitor.start_monitoring()
            self.progress_tracker.start_training()
            
            # Prepare dataset
            train_files, test_files = self.prepare_dataset()
            
            # Create training batches
            train_batches = self.dataset_acquisition.get_training_batches(self.config.batch_size)
            
            # Overall training results
            training_results = {
                "start_time": datetime.now().isoformat(),
                "config": asdict(self.config),
                "dataset_size": len(train_files),
                "test_size": len(test_files),
                "style_results": {},
                "final_evaluation": {},
                "resource_usage": {}
            }
            
            # Train each style
            styles = ["classic_portrait", "thick_textured", "soft_impressionist"]
            
            for style_id in styles:
                logging.info(f"Training style: {style_id}")
                self.progress_tracker.start_style(style_id)
                
                # Train style with RL
                style_result = self._train_style(style_id, train_batches)
                training_results["style_results"][style_id] = style_result
                
                # Update progress
                best_score = style_result.get("best_reward", 0.0)
                self.progress_tracker.complete_style(style_id, best_score)
                
                # Generate checkpoint
                self._save_checkpoint(style_id, style_result)
                
                logging.info(f"Style {style_id} training completed. Best score: {best_score:.3f}")
            
            # Final evaluation on test set
            logging.info("Running final evaluation on test set")
            final_eval = self._final_evaluation(test_files)
            training_results["final_evaluation"] = final_eval
            
            # Complete training
            training_results["end_time"] = datetime.now().isoformat()
            training_results["resource_usage"] = self.resource_monitor.get_resource_summary()
            
            # Save final results
            self._save_final_results(training_results)
            
            # Generate visualizations
            self.progress_tracker.generate_visualizations()
            
            logging.info("Training pipeline completed successfully")
            
            return training_results
            
        except Exception as e:
            logging.error(f"Training pipeline failed: {e}")
            raise
        
        finally:
            self.resource_monitor.stop_monitoring()
            self.rl_optimizer.save_models()
    
    def _train_style(self, style_id: str, train_batches: List[List[str]]) -> Dict:
        """Train RL agent for specific style"""
        agent = self.rl_optimizer.agents[style_id]
        
        style_results = {
            "episodes": [],
            "best_reward": 0.0,
            "best_parameters": None,
            "total_conversions": 0,
            "human_evaluations": 0
        }
        
        episodes = self.config.episodes_per_style
        conversion_count = 0
        
        for episode in range(episodes):
            logging.info(f"Style {style_id}, Episode {episode + 1}/{episodes}")
            
            # Select batch for this episode
            batch = train_batches[episode % len(train_batches)]
            
            # Run episode
            episode_result = self._run_episode(style_id, batch, episode)
            
            # Update tracking
            style_results["episodes"].append(episode_result)
            style_results["total_conversions"] += episode_result.get("conversions", 0)
            conversion_count += episode_result.get("conversions", 0)
            
            # Track best result
            if episode_result.get("best_reward", 0.0) > style_results["best_reward"]:
                style_results["best_reward"] = episode_result["best_reward"]
                style_results["best_parameters"] = episode_result.get("best_parameters")
            
            # Add to progress tracker
            self.progress_tracker.add_episode_result(style_id, episode, episode_result)
            
            # Human evaluation check
            if (not self.config.automated_evaluation_only and 
                conversion_count % self.config.human_evaluation_frequency == 0):
                
                self._collect_human_evaluation(style_id)
                style_results["human_evaluations"] += 1
                self.progress_tracker.add_human_evaluation()
            
            # Checkpoint save
            if episode % self.config.checkpoint_frequency == 0:
                self.rl_optimizer.save_models()
                logging.info(f"Checkpoint saved at episode {episode}")
            
            # Check early stopping
            if self._should_stop_training(style_results, episode):
                logging.info(f"Early stopping triggered for {style_id} at episode {episode}")
                break
        
        return style_results
    
    def _run_episode(self, style_id: str, image_batch: List[str], episode: int) -> Dict:
        """Run single training episode"""
        agent = self.rl_optimizer.agents[style_id]
        
        episode_results = {
            "episode": episode,
            "conversions": 0,
            "failures": 0,
            "rewards": [],
            "processing_times": [],
            "best_reward": 0.0,
            "best_parameters": None,
            "epsilon": agent.epsilon
        }
        
        # Process images in batch with limited concurrency
        with ThreadPoolExecutor(max_workers=self.config.max_concurrent_conversions) as executor:
            
            # Submit conversion tasks
            future_to_image = {}
            for image_path in image_batch:
                future = executor.submit(self._process_single_image, style_id, image_path)
                future_to_image[future] = image_path
            
            # Collect results
            for future in as_completed(future_to_image):
                image_path = future_to_image[future]
                
                try:
                    result = future.result(timeout=self.config.max_processing_time)
                    
                    if result["success"]:
                        episode_results["conversions"] += 1
                        episode_results["rewards"].append(result["reward"])
                        episode_results["processing_times"].append(result["processing_time"])
                        
                        # Track best result
                        if result["reward"] > episode_results["best_reward"]:
                            episode_results["best_reward"] = result["reward"]
                            episode_results["best_parameters"] = result["parameters"]
                    else:
                        episode_results["failures"] += 1
                        logging.warning(f"Conversion failed for {image_path}: {result.get('error', 'Unknown error')}")
                
                except Exception as e:
                    episode_results["failures"] += 1
                    logging.error(f"Processing error for {image_path}: {e}")
        
        # Calculate episode statistics
        if episode_results["rewards"]:
            episode_results["avg_reward"] = np.mean(episode_results["rewards"])
            episode_results["std_reward"] = np.std(episode_results["rewards"])
        else:
            episode_results["avg_reward"] = 0.0
            episode_results["std_reward"] = 0.0
        
        if episode_results["processing_times"]:
            episode_results["avg_processing_time"] = np.mean(episode_results["processing_times"])
        else:
            episode_results["avg_processing_time"] = 0.0
        
        # Update RL agent
        agent.replay_training()
        agent.decay_epsilon()
        
        return episode_results
    
    def _process_single_image(self, style_id: str, image_path: str) -> Dict:
        """Process single image with RL optimization"""
        try:
            agent = self.rl_optimizer.agents[style_id]
            
            # Get image context
            image_context = {"filename": Path(image_path).name}
            
            # Get current state (from agent's best known parameters)
            state = agent.get_best_parameters(style_id)
            if state is None:
                state = self.rl_optimizer.get_initial_state(style_id)
            
            # Select action
            action_idx = agent.select_action(state, image_context, training=True)
            action = self.rl_optimizer.parameter_space.actions[action_idx]
            
            # Apply action
            next_state = self.rl_optimizer.parameter_space.apply_action(state, action)
            
            # Convert image
            start_time = time.time()
            conversion_result = self.vision_evaluator.convert_with_parameters(
                image_path, asdict(next_state)
            )
            processing_time = time.time() - start_time
            
            if not conversion_result["success"]:
                return {
                    "success": False,
                    "error": conversion_result["error"],
                    "processing_time": processing_time
                }
            
            # Evaluate result
            evaluation_scores = self.vision_evaluator.evaluate_conversion(
                image_path, conversion_result["output_path"], style_id
            )
            
            # Calculate reward
            reward = self.rl_optimizer.calculate_reward(evaluation_scores, processing_time)
            
            # Store experience
            from rl_optimizer import Experience
            experience = Experience(
                state=state,
                action=action,
                reward=reward,
                next_state=next_state,
                done=True,
                image_context=image_context
            )
            
            agent.add_experience(experience)
            agent.update_q_value(experience, image_context)
            agent.update_best_state(next_state, reward)
            
            # Register for potential human evaluation
            if not self.config.automated_evaluation_only:
                conversion_id = str(uuid.uuid4())
                self.human_evaluation.register_conversion_for_evaluation(
                    conversion_id, image_path, conversion_result["output_path"],
                    style_id, asdict(next_state), evaluation_scores, processing_time
                )
            
            return {
                "success": True,
                "reward": reward,
                "parameters": asdict(next_state),
                "evaluation_scores": evaluation_scores,
                "processing_time": processing_time,
                "conversion_path": conversion_result["output_path"]
            }
            
        except Exception as e:
            logging.error(f"Single image processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "processing_time": time.time() - start_time if 'start_time' in locals() else 0.0
            }
    
    def _collect_human_evaluation(self, style_id: str):
        """Collect human evaluation for recent conversions"""
        try:
            # Get pending evaluations
            pending = self.human_evaluation.get_pending_evaluations(max_count=5)
            
            if not pending:
                logging.info("No pending evaluations for human review")
                return
            
            # Get priority evaluations
            priority = self.human_evaluation.suggest_priority_evaluations(count=2)
            
            logging.info(f"Collecting human evaluation for {len(priority)} conversions")
            
            # In a real implementation, this would trigger the human evaluation interface
            # For now, we'll simulate human evaluation or skip it
            
            # TODO: Integrate with actual human evaluation interface
            # This could be:
            # 1. Web interface for remote evaluation
            # 2. Local GUI for evaluation
            # 3. Batch evaluation system
            
            logging.info("Human evaluation collection completed")
            
        except Exception as e:
            logging.error(f"Human evaluation collection failed: {e}")
    
    def _should_stop_training(self, style_results: Dict, episode: int) -> bool:
        """Check if training should stop early"""
        # Check if we've reached target performance
        if style_results["best_reward"] >= self.config.target_success_rate:
            return True
        
        # Check for convergence (no improvement in last 20 episodes)
        if len(style_results["episodes"]) >= 20:
            recent_rewards = [ep.get("best_reward", 0.0) for ep in style_results["episodes"][-20:]]
            if np.std(recent_rewards) < 0.01 and np.mean(recent_rewards) > 0.7:
                return True
        
        return False
    
    def _final_evaluation(self, test_files: List[str]) -> Dict:
        """Run final evaluation on test set"""
        final_results = {}
        
        for style_id in ["classic_portrait", "thick_textured", "soft_impressionist"]:
            logging.info(f"Final evaluation for {style_id}")
            
            # Get optimized parameters
            optimized_params = self.rl_optimizer.get_optimized_parameters(style_id)
            
            # Test on subset of test files
            test_subset = test_files[:min(20, len(test_files))]
            
            # Evaluate batch
            batch_results = self.vision_evaluator.batch_evaluate(
                test_subset, style_id, optimized_params
            )
            
            # Calculate statistics
            if batch_results:
                scores = [r.get("overall_quality", 0.0) for r in batch_results if r.get("overall_quality")]
                
                final_results[style_id] = {
                    "test_images": len(test_subset),
                    "successful_conversions": len(scores),
                    "avg_score": np.mean(scores) if scores else 0.0,
                    "std_score": np.std(scores) if scores else 0.0,
                    "success_rate": len(scores) / len(test_subset),
                    "optimized_parameters": optimized_params
                }
            else:
                final_results[style_id] = {
                    "test_images": len(test_subset),
                    "successful_conversions": 0,
                    "avg_score": 0.0,
                    "success_rate": 0.0,
                    "optimized_parameters": optimized_params
                }
        
        return final_results
    
    def _save_checkpoint(self, style_id: str, style_result: Dict):
        """Save training checkpoint"""
        checkpoint_dir = self.output_dir / "checkpoints"
        checkpoint_dir.mkdir(exist_ok=True)
        
        checkpoint_file = checkpoint_dir / f"checkpoint_{style_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        checkpoint_data = {
            "style_id": style_id,
            "timestamp": datetime.now().isoformat(),
            "style_result": style_result,
            "progress": self.progress_tracker.get_current_stats()
        }
        
        with open(checkpoint_file, 'w') as f:
            json.dump(checkpoint_data, f, indent=2, default=str)
    
    def _save_final_results(self, training_results: Dict):
        """Save final training results"""
        results_file = self.output_dir / f"training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(results_file, 'w') as f:
            json.dump(training_results, f, indent=2, default=str)
        
        # Also save optimized parameters for deployment
        self.rl_optimizer.export_optimized_configs(str(self.output_dir / "optimized_parameters.json"))
        
        logging.info(f"Final results saved to {results_file}")

def main():
    """Run training pipeline"""
    
    # Configure training
    config = TrainingConfig(
        total_images=500,
        episodes_per_style=100,
        max_concurrent_conversions=2,
        human_evaluation_frequency=25,
        automated_evaluation_only=True,  # Set to False to enable human evaluation
        output_dir="rl_training/results"
    )
    
    # Create and run pipeline
    pipeline = TrainingPipeline(config)
    
    try:
        results = pipeline.run_training()
        
        print("\n" + "="*60)
        print("TRAINING COMPLETED SUCCESSFULLY")
        print("="*60)
        
        # Print summary
        for style_id, style_result in results["final_evaluation"].items():
            print(f"\n{style_id.upper()}:")
            print(f"  Success Rate: {style_result['success_rate']:.1%}")
            print(f"  Average Score: {style_result['avg_score']:.3f}")
            print(f"  Test Images: {style_result['test_images']}")
        
        print(f"\nTotal Training Time: {(datetime.fromisoformat(results['end_time']) - datetime.fromisoformat(results['start_time'])).total_seconds() / 3600:.1f} hours")
        print(f"Results saved to: {config.output_dir}")
        
    except KeyboardInterrupt:
        print("\nTraining interrupted by user")
        pipeline.rl_optimizer.save_models()
        
    except Exception as e:
        print(f"\nTraining failed: {e}")
        logging.error(f"Training pipeline failed: {e}")


if __name__ == "__main__":
    main()
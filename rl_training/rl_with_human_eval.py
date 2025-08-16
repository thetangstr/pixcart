#!/usr/bin/env python3
"""
RL Training with Human-in-the-Loop Evaluation
Combines automatic metrics with human feedback
"""

import json
import sqlite3
import logging
import time
import base64
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import requests
import numpy as np
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO)

@dataclass
class HumanEvaluation:
    """Human evaluation scores (1-5 scale)"""
    preservation: int  # 1=failed, 5=perfect
    style: int        # 1=poor, 5=excellent
    overall: int      # 1=reject, 5=approve
    comments: str = ""
    
    @property
    def is_approved(self) -> bool:
        """Check if approved by human"""
        return self.overall >= 4 and self.preservation >= 3
    
    @property
    def reward(self) -> float:
        """Convert to RL reward"""
        # Normalize to -1 to 1 scale
        preservation_norm = (self.preservation - 3) / 2
        style_norm = (self.style - 3) / 2
        overall_norm = (self.overall - 3) / 2
        
        # Weight: 50% preservation, 30% style, 20% overall
        reward = 0.5 * preservation_norm + 0.3 * style_norm + 0.2 * overall_norm
        
        # Critical penalties
        if self.preservation == 1:  # Species changed
            return -10.0
        elif self.preservation == 2:  # Major changes
            return min(reward, -2.0)
        
        # Excellence bonus
        if self.preservation == 5 and self.style >= 4:
            reward += 1.0
            
        return reward

class HumanInLoopRL:
    """RL system with human evaluation integration"""
    
    def __init__(self):
        self.setup_database()
        self.load_blacklist()
        self.load_promoted()
        self.pending_evaluations = []
        
    def setup_database(self):
        """Setup databases for RL and human eval"""
        # RL database
        self.rl_conn = sqlite3.connect('rl_with_human.db')
        cursor = self.rl_conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                parameters TEXT,
                automatic_reward REAL,
                human_reward REAL,
                final_reward REAL,
                preservation_auto REAL,
                preservation_human INTEGER,
                style_auto REAL,
                style_human INTEGER,
                overall_human INTEGER,
                status TEXT
            )
        ''')
        
        # Human eval database
        self.eval_conn = sqlite3.connect('human_eval.db')
        cursor = self.eval_conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evaluation_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_image TEXT,
                converted_image TEXT,
                parameters TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                evaluated BOOLEAN DEFAULT 0,
                preservation_score INTEGER,
                style_score INTEGER,
                overall_score INTEGER,
                comments TEXT,
                evaluator_id TEXT
            )
        ''')
        
        self.rl_conn.commit()
        self.eval_conn.commit()
    
    def load_blacklist(self):
        """Load blacklisted parameters"""
        try:
            with open('blacklist.json', 'r') as f:
                blacklist_data = json.load(f)
                self.blacklist = [item['parameters'] for item in blacklist_data]
        except FileNotFoundError:
            self.blacklist = []
    
    def load_promoted(self):
        """Load promoted parameters"""
        try:
            with open('promoted.json', 'r') as f:
                promoted_data = json.load(f)
                self.promoted = [item['parameters'] for item in promoted_data]
        except FileNotFoundError:
            self.promoted = []
    
    def is_blacklisted(self, params: Dict) -> bool:
        """Check if parameters are blacklisted"""
        for blacklisted in self.blacklist:
            if all(abs(params.get(k, 0) - blacklisted.get(k, 0)) < 0.01 
                   for k in ['denoising_strength', 'cfg_scale', 'canny_weight']):
                return True
        return False
    
    def generate_safe_parameters(self) -> Dict:
        """Generate parameters with safety constraints"""
        max_attempts = 10
        
        for _ in range(max_attempts):
            # Start with promoted parameters if available
            if self.promoted and np.random.random() < 0.3:
                # 30% chance to use promoted params as base
                base = np.random.choice(self.promoted)
                params = base.copy()
                # Add small variations
                params['denoising_strength'] = np.clip(
                    base['denoising_strength'] + np.random.normal(0, 0.02), 0.05, 0.25
                )
                params['cfg_scale'] = np.clip(
                    base['cfg_scale'] + np.random.normal(0, 0.2), 1.0, 3.5
                )
            else:
                # Generate new safe parameters
                params = {
                    'denoising_strength': np.random.uniform(0.08, 0.20),
                    'cfg_scale': np.random.uniform(1.5, 3.0),
                    'canny_weight': np.random.uniform(0.92, 1.0),
                    'openpose_weight': 0.0,  # Always 0 for animals
                    'depth_weight': np.random.uniform(0.0, 0.25),
                    'steps': 20,
                    'style': np.random.choice(['soft_impressionist', 'classic_portrait'])
                }
            
            # Check if blacklisted
            if not self.is_blacklisted(params):
                return params
        
        # Fallback to ultra-safe parameters
        return {
            'denoising_strength': 0.12,
            'cfg_scale': 2.0,
            'canny_weight': 0.98,
            'openpose_weight': 0.0,
            'depth_weight': 0.1,
            'steps': 15,
            'style': 'soft_impressionist'
        }
    
    def add_for_human_evaluation(
        self,
        original_path: str,
        converted_path: str,
        params: Dict
    ):
        """Queue conversion for human evaluation"""
        cursor = self.eval_conn.cursor()
        
        # Read images and convert to base64
        with open(original_path, 'rb') as f:
            original_b64 = base64.b64encode(f.read()).decode('utf-8')
        with open(converted_path, 'rb') as f:
            converted_b64 = base64.b64encode(f.read()).decode('utf-8')
        
        cursor.execute('''
            INSERT INTO evaluation_tasks 
            (original_image, converted_image, parameters)
            VALUES (?, ?, ?)
        ''', [
            f"data:image/png;base64,{original_b64}",
            f"data:image/png;base64,{converted_b64}",
            json.dumps(params)
        ])
        
        self.eval_conn.commit()
        task_id = cursor.lastrowid
        
        logging.info(f"Added task {task_id} for human evaluation")
        self.pending_evaluations.append(task_id)
    
    def get_human_evaluation(self, task_id: int) -> Optional[HumanEvaluation]:
        """Check if human evaluation is complete"""
        cursor = self.eval_conn.cursor()
        
        result = cursor.execute('''
            SELECT evaluated, preservation_score, style_score, 
                   overall_score, comments
            FROM evaluation_tasks
            WHERE id = ?
        ''', [task_id]).fetchone()
        
        if result and result[0] == 1:  # Evaluated
            return HumanEvaluation(
                preservation=result[1],
                style=result[2],
                overall=result[3],
                comments=result[4] or ""
            )
        return None
    
    def train_step(self, image_path: str) -> Dict:
        """Training step with human feedback option"""
        
        # Generate safe parameters
        params = self.generate_safe_parameters()
        
        logging.info(f"Testing params: denoising={params['denoising_strength']:.3f}, "
                    f"cfg={params['cfg_scale']:.2f}, canny={params['canny_weight']:.2f}")
        
        # Convert image (mock for now)
        converted_path = self.convert_image(image_path, params)
        
        # Calculate automatic metrics
        auto_reward = self.calculate_automatic_reward(image_path, converted_path)
        
        # Decide if human evaluation needed
        needs_human_eval = self.should_request_human_eval(auto_reward, params)
        
        if needs_human_eval:
            # Add to human evaluation queue
            self.add_for_human_evaluation(image_path, converted_path, params)
            
            # Wait for human evaluation (with timeout)
            task_id = self.pending_evaluations[-1]
            human_eval = self.wait_for_human_eval(task_id, timeout=300)
            
            if human_eval:
                final_reward = 0.7 * human_eval.reward + 0.3 * auto_reward
                logging.info(f"Human eval: P={human_eval.preservation}, "
                           f"S={human_eval.style}, O={human_eval.overall}")
                
                # Update blacklist/promoted based on human feedback
                if human_eval.preservation <= 2:
                    self.blacklist.append(params)
                    self.save_blacklist()
                elif human_eval.is_approved:
                    self.promoted.append(params)
                    self.save_promoted()
            else:
                final_reward = auto_reward
                logging.info("Human eval timeout, using automatic reward")
        else:
            final_reward = auto_reward
        
        # Log results
        self.log_training_result(params, auto_reward, final_reward, needs_human_eval)
        
        return {
            'params': params,
            'auto_reward': auto_reward,
            'final_reward': final_reward,
            'human_eval_requested': needs_human_eval
        }
    
    def should_request_human_eval(self, auto_reward: float, params: Dict) -> bool:
        """Decide if human evaluation is needed"""
        # Request human eval for:
        # 1. Uncertain automatic scores (-0.5 to 0.5)
        # 2. Random sampling (10% of all)
        # 3. Edge cases (very low denoising or cfg)
        # 4. First time seeing similar parameters
        
        if -0.5 <= auto_reward <= 0.5:
            return True  # Uncertain
        
        if np.random.random() < 0.1:
            return True  # Random sampling
        
        if params['denoising_strength'] < 0.1 or params['cfg_scale'] < 1.8:
            return True  # Edge cases
        
        return False
    
    def wait_for_human_eval(
        self, 
        task_id: int, 
        timeout: int = 300
    ) -> Optional[HumanEvaluation]:
        """Wait for human evaluation with timeout"""
        start_time = time.time()
        check_interval = 5  # Check every 5 seconds
        
        while time.time() - start_time < timeout:
            eval_result = self.get_human_evaluation(task_id)
            if eval_result:
                return eval_result
            time.sleep(check_interval)
        
        return None
    
    def calculate_automatic_reward(self, original_path: str, converted_path: str) -> float:
        """Calculate automatic reward (simplified)"""
        # In practice, use SSIM, perceptual hash, etc.
        return np.random.uniform(-1, 1)  # Mock
    
    def convert_image(self, image_path: str, params: Dict) -> str:
        """Convert image with parameters (mock)"""
        # In practice, call SD API
        output_path = f"converted_{int(time.time())}.png"
        # Mock: just copy the file
        import shutil
        shutil.copy(image_path, output_path)
        return output_path
    
    def log_training_result(self, params: Dict, auto_reward: float, 
                           final_reward: float, human_eval: bool):
        """Log training results"""
        cursor = self.rl_conn.cursor()
        cursor.execute('''
            INSERT INTO training_results 
            (parameters, automatic_reward, final_reward, status)
            VALUES (?, ?, ?, ?)
        ''', [
            json.dumps(params),
            auto_reward,
            final_reward,
            'human_eval' if human_eval else 'auto_only'
        ])
        self.rl_conn.commit()
    
    def save_blacklist(self):
        """Save blacklist to file"""
        with open('blacklist.json', 'w') as f:
            json.dump([{'parameters': p, 'timestamp': datetime.now().isoformat()} 
                      for p in self.blacklist], f, indent=2)
    
    def save_promoted(self):
        """Save promoted parameters to file"""
        with open('promoted.json', 'w') as f:
            json.dump([{'parameters': p, 'timestamp': datetime.now().isoformat()} 
                      for p in self.promoted], f, indent=2)
    
    def get_stats(self) -> Dict:
        """Get training statistics"""
        cursor = self.rl_conn.cursor()
        
        stats = cursor.execute('''
            SELECT 
                COUNT(*) as total,
                AVG(final_reward) as avg_reward,
                MAX(final_reward) as best_reward,
                COUNT(CASE WHEN status = 'human_eval' THEN 1 END) as human_evals
            FROM training_results
        ''').fetchone()
        
        return {
            'total_iterations': stats[0],
            'average_reward': stats[1],
            'best_reward': stats[2],
            'human_evaluations': stats[3],
            'blacklisted_count': len(self.blacklist),
            'promoted_count': len(self.promoted)
        }


def main():
    """Run RL training with human evaluation"""
    trainer = HumanInLoopRL()
    
    print("🤖 + 👤 RL Training with Human Evaluation")
    print("=" * 50)
    print("Open http://localhost:3000/human-eval to evaluate")
    print("")
    
    test_images = ['test_cat.jpg', 'test_dog.jpg']
    
    for epoch in range(10):
        print(f"\nEpoch {epoch + 1}/10")
        
        for image_path in test_images:
            if Path(image_path).exists():
                result = trainer.train_step(image_path)
                
                print(f"  Reward: {result['final_reward']:.3f} "
                     f"({'Human' if result['human_eval_requested'] else 'Auto'})")
        
        # Show stats
        stats = trainer.get_stats()
        print(f"\nStats: {stats['total_iterations']} iterations, "
             f"{stats['human_evaluations']} human evals, "
             f"{stats['promoted_count']} promoted params")
    
    print("\n" + "=" * 50)
    print("Training complete!")
    print(f"Final stats: {trainer.get_stats()}")


if __name__ == "__main__":
    main()
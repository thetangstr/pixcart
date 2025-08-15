#!/usr/bin/env python3
"""
Human Evaluation Interface for RL Training
Collects human feedback to validate and improve automated evaluation
"""

import json
import time
import uuid
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
import sqlite3
from PIL import Image
import base64
import io
from datetime import datetime

@dataclass
class HumanRating:
    """Single human rating for an image conversion"""
    conversion_id: str
    evaluator_id: str
    timestamp: str
    
    # Core metrics (1-5 scale)
    subject_preservation: int  # Is the animal still recognizable?
    oil_painting_authenticity: int  # Does it look like real oil painting?
    style_accuracy: int  # Does it match the intended style?
    overall_quality: int  # Overall artistic quality
    
    # Additional feedback
    comments: str
    would_use_result: bool  # Would you use this result?
    processing_time_acceptable: bool  # Was processing time OK?
    
    # Comparative ratings (optional)
    better_than_previous: Optional[bool] = None
    confidence_level: int = 5  # How confident are you? (1-5)

@dataclass
class EvaluationSession:
    """A human evaluation session"""
    session_id: str
    evaluator_id: str
    start_time: str
    end_time: Optional[str]
    conversions_evaluated: int
    session_type: str  # "calibration", "validation", "comparison"

class HumanEvaluationDatabase:
    """Database for storing human evaluations"""
    
    def __init__(self, db_path: str = "rl_training/human_evaluations.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversion_id TEXT NOT NULL,
                    evaluator_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    subject_preservation INTEGER NOT NULL,
                    oil_painting_authenticity INTEGER NOT NULL,
                    style_accuracy INTEGER NOT NULL,
                    overall_quality INTEGER NOT NULL,
                    comments TEXT,
                    would_use_result BOOLEAN NOT NULL,
                    processing_time_acceptable BOOLEAN NOT NULL,
                    better_than_previous BOOLEAN,
                    confidence_level INTEGER NOT NULL,
                    session_id TEXT,
                    UNIQUE(conversion_id, evaluator_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    evaluator_id TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    conversions_evaluated INTEGER DEFAULT 0,
                    session_type TEXT NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS evaluators (
                    evaluator_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    expertise_level TEXT NOT NULL,
                    created_date TEXT NOT NULL,
                    total_evaluations INTEGER DEFAULT 0
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversions (
                    conversion_id TEXT PRIMARY KEY,
                    original_image_path TEXT NOT NULL,
                    converted_image_path TEXT NOT NULL,
                    style_id TEXT NOT NULL,
                    parameters TEXT NOT NULL,
                    automated_scores TEXT,
                    processing_time REAL,
                    created_date TEXT NOT NULL
                )
            """)
    
    def add_evaluator(self, evaluator_id: str, name: str, expertise_level: str):
        """Add new evaluator to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO evaluators 
                (evaluator_id, name, expertise_level, created_date, total_evaluations)
                VALUES (?, ?, ?, ?, 0)
            """, (evaluator_id, name, expertise_level, datetime.now().isoformat()))
    
    def add_conversion(self, conversion_id: str, original_path: str, converted_path: str, 
                      style_id: str, parameters: Dict, automated_scores: Dict, 
                      processing_time: float):
        """Add conversion to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO conversions 
                (conversion_id, original_image_path, converted_image_path, style_id, 
                 parameters, automated_scores, processing_time, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (conversion_id, original_path, converted_path, style_id,
                  json.dumps(parameters), json.dumps(automated_scores), 
                  processing_time, datetime.now().isoformat()))
    
    def add_evaluation(self, rating: HumanRating, session_id: str):
        """Add human evaluation to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO evaluations 
                (conversion_id, evaluator_id, timestamp, subject_preservation,
                 oil_painting_authenticity, style_accuracy, overall_quality,
                 comments, would_use_result, processing_time_acceptable,
                 better_than_previous, confidence_level, session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rating.conversion_id, rating.evaluator_id, rating.timestamp,
                  rating.subject_preservation, rating.oil_painting_authenticity,
                  rating.style_accuracy, rating.overall_quality, rating.comments,
                  rating.would_use_result, rating.processing_time_acceptable,
                  rating.better_than_previous, rating.confidence_level, session_id))
            
            # Update evaluator count
            conn.execute("""
                UPDATE evaluators 
                SET total_evaluations = total_evaluations + 1 
                WHERE evaluator_id = ?
            """, (rating.evaluator_id,))
    
    def get_evaluations_for_conversion(self, conversion_id: str) -> List[Dict]:
        """Get all evaluations for a specific conversion"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT * FROM evaluations WHERE conversion_id = ?
            """, (conversion_id,))
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def get_evaluator_stats(self, evaluator_id: str) -> Dict:
        """Get statistics for an evaluator"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_evaluations,
                    AVG(subject_preservation) as avg_subject_preservation,
                    AVG(oil_painting_authenticity) as avg_oil_painting_authenticity,
                    AVG(style_accuracy) as avg_style_accuracy,
                    AVG(overall_quality) as avg_overall_quality,
                    AVG(confidence_level) as avg_confidence
                FROM evaluations 
                WHERE evaluator_id = ?
            """, (evaluator_id,))
            
            row = cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            return {}

class HumanEvaluationInterface:
    """Interface for collecting human evaluations"""
    
    def __init__(self, db_path: str = "rl_training/human_evaluations.db"):
        self.db = HumanEvaluationDatabase(db_path)
        self.current_session = None
    
    def start_evaluation_session(self, evaluator_id: str, session_type: str = "validation") -> str:
        """Start a new evaluation session"""
        session_id = str(uuid.uuid4())
        self.current_session = EvaluationSession(
            session_id=session_id,
            evaluator_id=evaluator_id,
            start_time=datetime.now().isoformat(),
            end_time=None,
            conversions_evaluated=0,
            session_type=session_type
        )
        
        with sqlite3.connect(self.db.db_path) as conn:
            conn.execute("""
                INSERT INTO sessions 
                (session_id, evaluator_id, start_time, session_type)
                VALUES (?, ?, ?, ?)
            """, (session_id, evaluator_id, self.current_session.start_time, session_type))
        
        return session_id
    
    def end_evaluation_session(self):
        """End current evaluation session"""
        if self.current_session:
            self.current_session.end_time = datetime.now().isoformat()
            
            with sqlite3.connect(self.db.db_path) as conn:
                conn.execute("""
                    UPDATE sessions 
                    SET end_time = ?, conversions_evaluated = ?
                    WHERE session_id = ?
                """, (self.current_session.end_time, 
                      self.current_session.conversions_evaluated,
                      self.current_session.session_id))
            
            self.current_session = None
    
    def evaluate_conversion(self, conversion_id: str, evaluator_id: str) -> HumanRating:
        """Collect human evaluation for a conversion (command line interface)"""
        
        # Get conversion details
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("""
                SELECT * FROM conversions WHERE conversion_id = ?
            """, (conversion_id,))
            conversion = cursor.fetchone()
        
        if not conversion:
            raise ValueError(f"Conversion {conversion_id} not found")
        
        print(f"\n{'='*60}")
        print(f"HUMAN EVALUATION - Conversion {conversion_id}")
        print(f"{'='*60}")
        print(f"Style: {conversion[3]}")  # style_id
        print(f"Original: {Path(conversion[1]).name}")  # original_image_path
        print(f"Converted: {Path(conversion[2]).name}")  # converted_image_path
        
        # Show automated scores if available
        if conversion[5]:  # automated_scores
            automated = json.loads(conversion[5])
            print(f"\nAutomated Scores:")
            for key, value in automated.items():
                if isinstance(value, float):
                    print(f"  {key}: {value:.3f}")
        
        print(f"\nProcessing time: {conversion[6]:.2f}s")  # processing_time
        
        print(f"\nPlease rate the following aspects (1-5 scale):")
        print("1 = Very Poor, 2 = Poor, 3 = Average, 4 = Good, 5 = Excellent")
        
        # Collect ratings
        def get_rating(prompt: str, min_val: int = 1, max_val: int = 5) -> int:
            while True:
                try:
                    value = int(input(f"{prompt} ({min_val}-{max_val}): "))
                    if min_val <= value <= max_val:
                        return value
                    print(f"Please enter a value between {min_val} and {max_val}")
                except ValueError:
                    print("Please enter a valid number")
        
        def get_bool(prompt: str) -> bool:
            while True:
                response = input(f"{prompt} (y/n): ").lower().strip()
                if response in ['y', 'yes']:
                    return True
                elif response in ['n', 'no']:
                    return False
                print("Please enter 'y' or 'n'")
        
        subject_preservation = get_rating("Subject Preservation (Is the animal still recognizable?)")
        oil_painting_authenticity = get_rating("Oil Painting Authenticity (Does it look like real oil painting?)")
        style_accuracy = get_rating("Style Accuracy (Does it match the intended style?)")
        overall_quality = get_rating("Overall Quality (Overall artistic merit)")
        
        comments = input("\nComments (optional): ").strip()
        would_use_result = get_bool("Would you use this result?")
        processing_time_acceptable = get_bool("Is the processing time acceptable?")
        confidence_level = get_rating("How confident are you in your ratings?")
        
        # Create rating
        rating = HumanRating(
            conversion_id=conversion_id,
            evaluator_id=evaluator_id,
            timestamp=datetime.now().isoformat(),
            subject_preservation=subject_preservation,
            oil_painting_authenticity=oil_painting_authenticity,
            style_accuracy=style_accuracy,
            overall_quality=overall_quality,
            comments=comments,
            would_use_result=would_use_result,
            processing_time_acceptable=processing_time_acceptable,
            confidence_level=confidence_level
        )
        
        # Save to database
        session_id = self.current_session.session_id if self.current_session else "standalone"
        self.db.add_evaluation(rating, session_id)
        
        if self.current_session:
            self.current_session.conversions_evaluated += 1
        
        print(f"\nEvaluation saved! Thank you.")
        
        return rating

class HumanEvaluationIntegration:
    """Integration layer between human evaluation and RL training"""
    
    def __init__(self, db_path: str = "rl_training/human_evaluations.db"):
        self.db = HumanEvaluationDatabase(db_path)
        self.interface = HumanEvaluationInterface(db_path)
        
        # Weights for combining human and automated scores
        self.human_weight = 0.6  # Higher weight for human evaluation
        self.automated_weight = 0.4
    
    def register_conversion_for_evaluation(self, conversion_id: str, original_path: str, 
                                         converted_path: str, style_id: str, 
                                         parameters: Dict, automated_scores: Dict, 
                                         processing_time: float):
        """Register a conversion for human evaluation"""
        self.db.add_conversion(
            conversion_id, original_path, converted_path, style_id,
            parameters, automated_scores, processing_time
        )
    
    def get_pending_evaluations(self, max_count: int = 10) -> List[str]:
        """Get conversions that need human evaluation"""
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("""
                SELECT c.conversion_id 
                FROM conversions c
                LEFT JOIN evaluations e ON c.conversion_id = e.conversion_id
                WHERE e.conversion_id IS NULL
                ORDER BY c.created_date DESC
                LIMIT ?
            """, (max_count,))
            
            return [row[0] for row in cursor.fetchall()]
    
    def get_combined_score(self, conversion_id: str) -> Optional[Dict]:
        """Get combined human + automated score for a conversion"""
        
        # Get human evaluations
        human_evals = self.db.get_evaluations_for_conversion(conversion_id)
        
        if not human_evals:
            return None
        
        # Get automated scores
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("""
                SELECT automated_scores FROM conversions WHERE conversion_id = ?
            """, (conversion_id,))
            row = cursor.fetchone()
            
            if not row or not row[0]:
                return None
            
            automated_scores = json.loads(row[0])
        
        # Average human scores (if multiple evaluators)
        human_scores = {
            'subject_preservation': 0.0,
            'oil_painting_authenticity': 0.0,
            'style_accuracy': 0.0,
            'overall_quality': 0.0
        }
        
        total_confidence = 0.0
        for eval_data in human_evals:
            confidence = eval_data['confidence_level'] / 5.0  # Normalize to 0-1
            weight = confidence / len(human_evals)
            
            human_scores['subject_preservation'] += (eval_data['subject_preservation'] / 5.0) * weight
            human_scores['oil_painting_authenticity'] += (eval_data['oil_painting_authenticity'] / 5.0) * weight
            human_scores['style_accuracy'] += (eval_data['style_accuracy'] / 5.0) * weight
            human_scores['overall_quality'] += (eval_data['overall_quality'] / 5.0) * weight
            
            total_confidence += confidence
        
        # Normalize human scores
        if total_confidence > 0:
            for key in human_scores:
                human_scores[key] /= total_confidence
        
        # Combine with automated scores
        combined_scores = {}
        
        # Map automated scores to human categories
        score_mapping = {
            'subject_preservation': automated_scores.get('subject_preservation', 0.0),
            'oil_painting_authenticity': automated_scores.get('oil_painting_authenticity', 0.0),
            'style_accuracy': automated_scores.get('style_distinctiveness', 0.0),  # Map distinctiveness to accuracy
            'overall_quality': automated_scores.get('overall_quality', 0.0)
        }
        
        # Weighted combination
        for category in human_scores:
            human_score = human_scores[category]
            automated_score = score_mapping.get(category, 0.0)
            
            combined_score = (
                self.human_weight * human_score + 
                self.automated_weight * automated_score
            )
            
            combined_scores[f'combined_{category}'] = combined_score
        
        # Overall combined score
        combined_scores['combined_overall'] = np.mean(list(combined_scores.values()))
        
        # Add metadata
        combined_scores['human_evaluations_count'] = len(human_evals)
        combined_scores['avg_confidence'] = total_confidence / len(human_evals) if human_evals else 0.0
        combined_scores['human_weight'] = self.human_weight
        combined_scores['automated_weight'] = self.automated_weight
        
        return combined_scores
    
    def calibrate_automated_metrics(self) -> Dict:
        """Calibrate automated metrics against human evaluations"""
        
        # Get all conversions with both human and automated scores
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("""
                SELECT DISTINCT c.conversion_id, c.automated_scores
                FROM conversions c
                INNER JOIN evaluations e ON c.conversion_id = e.conversion_id
                WHERE c.automated_scores IS NOT NULL
            """)
            
            conversions = cursor.fetchall()
        
        if len(conversions) < 10:
            print("Not enough data for calibration (need at least 10 evaluations)")
            return {}
        
        # Collect scores for correlation analysis
        human_scores = []
        automated_scores = []
        
        for conversion_id, auto_scores_json in conversions:
            auto_scores = json.loads(auto_scores_json)
            human_evals = self.db.get_evaluations_for_conversion(conversion_id)
            
            if human_evals:
                # Average human scores
                avg_human = {
                    'subject_preservation': np.mean([e['subject_preservation'] for e in human_evals]) / 5.0,
                    'oil_painting_authenticity': np.mean([e['oil_painting_authenticity'] for e in human_evals]) / 5.0,
                    'style_accuracy': np.mean([e['style_accuracy'] for e in human_evals]) / 5.0,
                    'overall_quality': np.mean([e['overall_quality'] for e in human_evals]) / 5.0
                }
                
                human_scores.append(avg_human)
                automated_scores.append(auto_scores)
        
        # Calculate correlations
        correlations = {}
        
        for human_metric in ['subject_preservation', 'oil_painting_authenticity', 'style_accuracy', 'overall_quality']:
            human_values = [score[human_metric] for score in human_scores]
            
            for auto_metric in ['subject_preservation', 'oil_painting_authenticity', 'style_distinctiveness', 'overall_quality']:
                auto_values = [score.get(auto_metric, 0.0) for score in automated_scores]
                
                if len(human_values) == len(auto_values) and len(human_values) > 1:
                    correlation = np.corrcoef(human_values, auto_values)[0, 1]
                    correlations[f'{human_metric}_vs_{auto_metric}'] = correlation
        
        # Find best automated metric for each human metric
        best_mappings = {}
        for human_metric in ['subject_preservation', 'oil_painting_authenticity', 'style_accuracy', 'overall_quality']:
            best_correlation = -1
            best_auto_metric = None
            
            for key, correlation in correlations.items():
                if key.startswith(human_metric) and correlation > best_correlation:
                    best_correlation = correlation
                    best_auto_metric = key.split('_vs_')[1]
            
            if best_auto_metric:
                best_mappings[human_metric] = {
                    'automated_metric': best_auto_metric,
                    'correlation': best_correlation
                }
        
        print(f"\nCalibration Results (based on {len(conversions)} evaluations):")
        for human_metric, mapping in best_mappings.items():
            print(f"{human_metric}: best match is {mapping['automated_metric']} (r={mapping['correlation']:.3f})")
        
        return {
            'correlations': correlations,
            'best_mappings': best_mappings,
            'sample_size': len(conversions)
        }
    
    def suggest_priority_evaluations(self, count: int = 5) -> List[str]:
        """Suggest which conversions should be prioritized for human evaluation"""
        
        # Priority factors:
        # 1. High automated scores (confirm good results)
        # 2. Low automated scores (confirm bad results) 
        # 3. Inconsistent automated scores (resolve conflicts)
        # 4. Recent conversions
        
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("""
                SELECT c.conversion_id, c.automated_scores, c.created_date
                FROM conversions c
                LEFT JOIN evaluations e ON c.conversion_id = e.conversion_id
                WHERE e.conversion_id IS NULL AND c.automated_scores IS NOT NULL
                ORDER BY c.created_date DESC
                LIMIT 50
            """)
            
            candidates = cursor.fetchall()
        
        if not candidates:
            return []
        
        # Score each candidate for priority
        priority_scores = []
        
        for conversion_id, auto_scores_json, created_date in candidates:
            auto_scores = json.loads(auto_scores_json)
            
            overall_score = auto_scores.get('overall_quality', 0.0)
            subject_score = auto_scores.get('subject_preservation', 0.0)
            auth_score = auto_scores.get('oil_painting_authenticity', 0.0)
            
            # Priority score calculation
            priority = 0.0
            
            # High scores (confirm good results)
            if overall_score > 0.8:
                priority += 2.0
            
            # Low scores (confirm bad results)
            if overall_score < 0.3:
                priority += 2.0
            
            # Inconsistent scores (resolve conflicts)
            score_variance = np.var([subject_score, auth_score, overall_score])
            if score_variance > 0.1:
                priority += 1.5
            
            # Medium scores (most uncertain)
            if 0.4 <= overall_score <= 0.7:
                priority += 1.0
            
            # Recent conversions
            try:
                created_time = datetime.fromisoformat(created_date)
                hours_ago = (datetime.now() - created_time).total_seconds() / 3600
                if hours_ago < 24:
                    priority += 0.5
            except:
                pass
            
            priority_scores.append((conversion_id, priority))
        
        # Sort by priority and return top candidates
        priority_scores.sort(key=lambda x: x[1], reverse=True)
        
        return [conv_id for conv_id, _ in priority_scores[:count]]

def setup_evaluators():
    """Setup example evaluators"""
    db = HumanEvaluationDatabase()
    
    # Add example evaluators
    evaluators = [
        ("expert_1", "Art Expert 1", "expert"),
        ("expert_2", "Art Expert 2", "expert"), 
        ("user_1", "Regular User 1", "novice"),
        ("user_2", "Regular User 2", "novice"),
        ("artist_1", "Professional Artist", "professional")
    ]
    
    for evaluator_id, name, expertise in evaluators:
        db.add_evaluator(evaluator_id, name, expertise)
    
    print("Evaluators added to database")

def main():
    """Example usage"""
    
    # Setup evaluators
    setup_evaluators()
    
    # Create interface
    interface = HumanEvaluationInterface()
    integration = HumanEvaluationIntegration()
    
    # Example: Check pending evaluations
    pending = integration.get_pending_evaluations()
    print(f"Pending evaluations: {len(pending)}")
    
    if pending:
        print(f"Priority evaluations: {integration.suggest_priority_evaluations()}")
    
    # Example calibration (if enough data exists)
    calibration = integration.calibrate_automated_metrics()
    if calibration:
        print(f"Calibration completed with {calibration['sample_size']} samples")

if __name__ == "__main__":
    main()
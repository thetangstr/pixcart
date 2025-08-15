#!/usr/bin/env python3
"""
Comprehensive Metrics Collection and Reporting System
Tracks all aspects of RL training performance and generates detailed reports
"""

import json
import time
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import sqlite3
import logging
from collections import defaultdict
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
from jinja2 import Template

@dataclass
class MetricSnapshot:
    """Single metric measurement at a point in time"""
    timestamp: str
    metric_name: str
    metric_value: float
    context: Dict  # Additional context (style, episode, etc.)
    metadata: Dict  # Any additional metadata

@dataclass
class PerformanceReport:
    """Complete performance report"""
    report_id: str
    generation_time: str
    training_duration_hours: float
    total_conversions: int
    success_rate: float
    best_scores: Dict[str, float]
    improvement_metrics: Dict
    resource_usage: Dict
    recommendations: List[str]

class MetricsDatabase:
    """Database for storing all training metrics"""
    
    def __init__(self, db_path: str = "rl_training/metrics.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_database()
    
    def init_database(self):
        """Initialize metrics database"""
        with sqlite3.connect(self.db_path) as conn:
            # Core metrics table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    style_id TEXT,
                    episode INTEGER,
                    context TEXT,
                    metadata TEXT,
                    created_date TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Training sessions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_sessions (
                    session_id TEXT PRIMARY KEY,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    config TEXT NOT NULL,
                    status TEXT DEFAULT 'running',
                    total_episodes INTEGER DEFAULT 0,
                    total_conversions INTEGER DEFAULT 0,
                    final_results TEXT
                )
            """)
            
            # Performance benchmarks table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS benchmarks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    benchmark_name TEXT NOT NULL,
                    style_id TEXT NOT NULL,
                    score REAL NOT NULL,
                    parameters TEXT NOT NULL,
                    test_images INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    notes TEXT
                )
            """)
            
            # A/B test results
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ab_tests (
                    test_id TEXT PRIMARY KEY,
                    test_name TEXT NOT NULL,
                    variant_a_params TEXT NOT NULL,
                    variant_b_params TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    sample_size INTEGER,
                    variant_a_score REAL,
                    variant_b_score REAL,
                    statistical_significance REAL,
                    winner TEXT,
                    notes TEXT
                )
            """)
            
            # Create indexes for performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_style ON metrics(style_id)")
    
    def record_metric(self, metric: MetricSnapshot):
        """Record a single metric"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO metrics 
                (timestamp, metric_name, metric_value, style_id, episode, context, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                metric.timestamp,
                metric.metric_name,
                metric.metric_value,
                metric.context.get('style_id'),
                metric.context.get('episode'),
                json.dumps(metric.context),
                json.dumps(metric.metadata)
            ))
    
    def record_batch_metrics(self, metrics: List[MetricSnapshot]):
        """Record multiple metrics efficiently"""
        with sqlite3.connect(self.db_path) as conn:
            data = []
            for metric in metrics:
                data.append((
                    metric.timestamp,
                    metric.metric_name,
                    metric.metric_value,
                    metric.context.get('style_id'),
                    metric.context.get('episode'),
                    json.dumps(metric.context),
                    json.dumps(metric.metadata)
                ))
            
            conn.executemany("""
                INSERT INTO metrics 
                (timestamp, metric_name, metric_value, style_id, episode, context, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, data)
    
    def get_metrics(self, metric_name: str = None, style_id: str = None, 
                   start_time: str = None, end_time: str = None) -> pd.DataFrame:
        """Query metrics with filters"""
        query = "SELECT * FROM metrics WHERE 1=1"
        params = []
        
        if metric_name:
            query += " AND metric_name = ?"
            params.append(metric_name)
        
        if style_id:
            query += " AND style_id = ?"
            params.append(style_id)
        
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time)
        
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time)
        
        query += " ORDER BY timestamp"
        
        with sqlite3.connect(self.db_path) as conn:
            return pd.read_sql_query(query, conn, params=params)
    
    def record_training_session(self, session_id: str, config: Dict, start_time: str):
        """Record training session start"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO training_sessions 
                (session_id, start_time, config, status)
                VALUES (?, ?, ?, 'running')
            """, (session_id, start_time, json.dumps(config)))
    
    def complete_training_session(self, session_id: str, end_time: str, 
                                 final_results: Dict, total_episodes: int, 
                                 total_conversions: int):
        """Record training session completion"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE training_sessions 
                SET end_time = ?, final_results = ?, status = 'completed',
                    total_episodes = ?, total_conversions = ?
                WHERE session_id = ?
            """, (end_time, json.dumps(final_results), total_episodes, 
                  total_conversions, session_id))

class MetricsCollector:
    """Collects and processes training metrics"""
    
    def __init__(self, db_path: str = "rl_training/metrics.db"):
        self.db = MetricsDatabase(db_path)
        self.current_session = None
        
        # Metric categories
        self.metric_categories = {
            'performance': [
                'episode_reward', 'best_reward', 'avg_reward', 'reward_std',
                'success_rate', 'conversion_time', 'subject_preservation',
                'oil_painting_authenticity', 'style_distinctiveness'
            ],
            'training': [
                'epsilon', 'learning_rate', 'q_value_change', 'exploration_ratio',
                'convergence_speed', 'parameter_stability'
            ],
            'system': [
                'cpu_usage', 'memory_usage', 'disk_usage', 'processing_time',
                'api_response_time', 'error_rate'
            ],
            'quality': [
                'human_rating', 'automated_score', 'consistency_score',
                'failure_rate', 'retry_count'
            ]
        }
    
    def start_training_session(self, session_id: str, config: Dict):
        """Start tracking a training session"""
        self.current_session = session_id
        start_time = datetime.now().isoformat()
        self.db.record_training_session(session_id, config, start_time)
        
        # Record session start metric
        self.record_metric("training_session_start", 1.0, 
                          context={'session_id': session_id})
    
    def end_training_session(self, final_results: Dict, total_episodes: int, 
                           total_conversions: int):
        """End tracking a training session"""
        if self.current_session:
            end_time = datetime.now().isoformat()
            self.db.complete_training_session(
                self.current_session, end_time, final_results,
                total_episodes, total_conversions
            )
            
            # Record session end metric
            self.record_metric("training_session_end", 1.0,
                              context={'session_id': self.current_session})
            
            self.current_session = None
    
    def record_metric(self, metric_name: str, value: float, 
                     context: Dict = None, metadata: Dict = None):
        """Record a single metric"""
        metric = MetricSnapshot(
            timestamp=datetime.now().isoformat(),
            metric_name=metric_name,
            metric_value=value,
            context=context or {},
            metadata=metadata or {}
        )
        
        self.db.record_metric(metric)
    
    def record_episode_metrics(self, style_id: str, episode: int, results: Dict):
        """Record all metrics for an episode"""
        context = {'style_id': style_id, 'episode': episode}
        timestamp = datetime.now().isoformat()
        
        metrics = []
        
        # Performance metrics
        for key in ['avg_reward', 'best_reward', 'std_reward', 'conversions', 
                   'failures', 'avg_processing_time']:
            if key in results:
                metric = MetricSnapshot(
                    timestamp=timestamp,
                    metric_name=key,
                    metric_value=float(results[key]),
                    context=context,
                    metadata={'episode_data': True}
                )
                metrics.append(metric)
        
        # Training metrics
        if 'epsilon' in results:
            metric = MetricSnapshot(
                timestamp=timestamp,
                metric_name='epsilon',
                metric_value=float(results['epsilon']),
                context=context,
                metadata={'training_param': True}
            )
            metrics.append(metric)
        
        # Success rate
        if 'conversions' in results and 'failures' in results:
            total = results['conversions'] + results['failures']
            success_rate = results['conversions'] / total if total > 0 else 0.0
            
            metric = MetricSnapshot(
                timestamp=timestamp,
                metric_name='success_rate',
                metric_value=success_rate,
                context=context,
                metadata={'calculated': True}
            )
            metrics.append(metric)
        
        # Record all metrics
        self.db.record_batch_metrics(metrics)
    
    def record_evaluation_metrics(self, style_id: str, evaluation_scores: Dict, 
                                 processing_time: float, image_context: Dict = None):
        """Record evaluation metrics"""
        context = {'style_id': style_id}
        if image_context:
            context.update(image_context)
        
        timestamp = datetime.now().isoformat()
        metrics = []
        
        # Core evaluation scores
        for score_name, score_value in evaluation_scores.items():
            if isinstance(score_value, (int, float)):
                metric = MetricSnapshot(
                    timestamp=timestamp,
                    metric_name=score_name,
                    metric_value=float(score_value),
                    context=context,
                    metadata={'evaluation': True}
                )
                metrics.append(metric)
        
        # Processing time
        metric = MetricSnapshot(
            timestamp=timestamp,
            metric_name='processing_time',
            metric_value=processing_time,
            context=context,
            metadata={'system_metric': True}
        )
        metrics.append(metric)
        
        self.db.record_batch_metrics(metrics)
    
    def record_system_metrics(self, cpu_percent: float, memory_percent: float, 
                            disk_percent: float, additional_metrics: Dict = None):
        """Record system resource metrics"""
        timestamp = datetime.now().isoformat()
        context = {'metric_type': 'system'}
        
        metrics = [
            MetricSnapshot(timestamp, 'cpu_usage', cpu_percent, context, {}),
            MetricSnapshot(timestamp, 'memory_usage', memory_percent, context, {}),
            MetricSnapshot(timestamp, 'disk_usage', disk_percent, context, {})
        ]
        
        if additional_metrics:
            for name, value in additional_metrics.items():
                if isinstance(value, (int, float)):
                    metrics.append(MetricSnapshot(timestamp, name, float(value), context, {}))
        
        self.db.record_batch_metrics(metrics)
    
    def record_human_evaluation(self, style_id: str, human_scores: Dict, 
                               confidence: float, evaluator_id: str):
        """Record human evaluation metrics"""
        context = {
            'style_id': style_id,
            'evaluator_id': evaluator_id,
            'evaluation_type': 'human'
        }
        
        timestamp = datetime.now().isoformat()
        metrics = []
        
        for score_name, score_value in human_scores.items():
            if isinstance(score_value, (int, float)):
                metric = MetricSnapshot(
                    timestamp=timestamp,
                    metric_name=f'human_{score_name}',
                    metric_value=float(score_value) / 5.0,  # Normalize to 0-1
                    context=context,
                    metadata={'confidence': confidence}
                )
                metrics.append(metric)
        
        self.db.record_batch_metrics(metrics)

class PerformanceAnalyzer:
    """Analyzes training performance and generates insights"""
    
    def __init__(self, db_path: str = "rl_training/metrics.db"):
        self.db = MetricsDatabase(db_path)
    
    def analyze_training_progress(self, style_id: str = None) -> Dict:
        """Analyze overall training progress"""
        # Get all episode metrics
        df = self.db.get_metrics(metric_name='avg_reward', style_id=style_id)
        
        if df.empty:
            return {'error': 'No training data found'}
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        
        # Calculate progress metrics
        analysis = {
            'total_episodes': len(df),
            'training_duration_hours': (df['timestamp'].max() - df['timestamp'].min()).total_seconds() / 3600,
            'initial_performance': float(df['metric_value'].iloc[0]),
            'final_performance': float(df['metric_value'].iloc[-1]),
            'best_performance': float(df['metric_value'].max()),
            'performance_improvement': float(df['metric_value'].iloc[-1] - df['metric_value'].iloc[0]),
            'performance_stability': float(df['metric_value'].tail(10).std()),
            'convergence_analysis': self._analyze_convergence(df['metric_value'].values)
        }
        
        # Learning curve analysis
        analysis['learning_curve'] = self._analyze_learning_curve(df)
        
        return analysis
    
    def _analyze_convergence(self, rewards: np.ndarray) -> Dict:
        """Analyze convergence characteristics"""
        if len(rewards) < 10:
            return {'status': 'insufficient_data'}
        
        # Calculate moving average
        window_size = min(10, len(rewards) // 3)
        moving_avg = pd.Series(rewards).rolling(window=window_size).mean()
        
        # Check for convergence (stable performance in last 20% of episodes)
        last_20_percent = int(len(rewards) * 0.2)
        recent_performance = rewards[-last_20_percent:]
        recent_std = np.std(recent_performance)
        
        converged = recent_std < 0.05  # Less than 5% variation
        
        # Find convergence point
        convergence_episode = None
        if converged:
            # Find when stability was reached
            for i in range(window_size, len(moving_avg)):
                if np.std(moving_avg[i-window_size:i]) < 0.05:
                    convergence_episode = i
                    break
        
        return {
            'status': 'converged' if converged else 'still_learning',
            'convergence_episode': convergence_episode,
            'final_stability': float(recent_std),
            'convergence_threshold': 0.05
        }
    
    def _analyze_learning_curve(self, df: pd.DataFrame) -> Dict:
        """Analyze learning curve characteristics"""
        rewards = df['metric_value'].values
        
        if len(rewards) < 5:
            return {'status': 'insufficient_data'}
        
        # Fit polynomial to detect learning phases
        episodes = np.arange(len(rewards))
        
        # Linear trend
        linear_coeff = np.polyfit(episodes, rewards, 1)[0]
        
        # Detect plateaus (periods of low change)
        diff = np.diff(rewards)
        plateau_threshold = 0.02
        plateau_episodes = np.sum(np.abs(diff) < plateau_threshold)
        
        return {
            'learning_rate': float(linear_coeff),
            'trend': 'improving' if linear_coeff > 0 else 'declining' if linear_coeff < 0 else 'stable',
            'plateau_percentage': float(plateau_episodes / len(diff)),
            'volatility': float(np.std(diff)),
            'efficiency_score': self._calculate_efficiency_score(rewards)
        }
    
    def _calculate_efficiency_score(self, rewards: np.ndarray) -> float:
        """Calculate learning efficiency score (0-1)"""
        if len(rewards) < 2:
            return 0.0
        
        # Factors: improvement rate, stability, final performance
        improvement = rewards[-1] - rewards[0]
        stability = 1.0 / (1.0 + np.std(rewards))
        final_performance = rewards[-1]
        
        # Weighted combination
        efficiency = (0.4 * improvement + 0.3 * stability + 0.3 * final_performance)
        return max(0.0, min(1.0, efficiency))
    
    def compare_styles(self) -> Dict:
        """Compare performance across different styles"""
        styles = ['classic_portrait', 'thick_textured', 'soft_impressionist']
        comparison = {}
        
        for style in styles:
            analysis = self.analyze_training_progress(style)
            if 'error' not in analysis:
                comparison[style] = {
                    'final_performance': analysis['final_performance'],
                    'improvement': analysis['performance_improvement'],
                    'stability': analysis['performance_stability'],
                    'efficiency': analysis['learning_curve'].get('efficiency_score', 0.0),
                    'convergence_status': analysis['convergence_analysis']['status']
                }
        
        # Rank styles
        if comparison:
            rankings = {
                'performance': sorted(comparison.items(), 
                                    key=lambda x: x[1]['final_performance'], reverse=True),
                'improvement': sorted(comparison.items(), 
                                    key=lambda x: x[1]['improvement'], reverse=True),
                'stability': sorted(comparison.items(), 
                                  key=lambda x: 1/x[1]['stability'] if x[1]['stability'] > 0 else 0, reverse=True),
                'efficiency': sorted(comparison.items(), 
                                   key=lambda x: x[1]['efficiency'], reverse=True)
            }
            
            comparison['rankings'] = rankings
        
        return comparison
    
    def analyze_parameter_sensitivity(self, style_id: str) -> Dict:
        """Analyze sensitivity to different parameters"""
        # Get all metrics for style
        df = self.db.get_metrics(style_id=style_id)
        
        if df.empty:
            return {'error': 'No data found for style'}
        
        # Parse context to get parameter values
        parameter_data = []
        
        for _, row in df.iterrows():
            try:
                context = json.loads(row['context']) if row['context'] else {}
                if 'parameters' in context:
                    params = context['parameters']
                    parameter_data.append({
                        'timestamp': row['timestamp'],
                        'metric_name': row['metric_name'],
                        'metric_value': row['metric_value'],
                        **params
                    })
            except:
                continue
        
        if not parameter_data:
            return {'error': 'No parameter data found'}
        
        param_df = pd.DataFrame(parameter_data)
        
        # Analyze correlation between parameters and performance
        numeric_params = ['denoising_strength', 'cfg_scale', 'steps', 'controlnet_weight']
        performance_metrics = ['avg_reward', 'subject_preservation', 'oil_painting_authenticity']
        
        correlations = {}
        
        for param in numeric_params:
            if param in param_df.columns:
                param_correlations = {}
                for metric in performance_metrics:
                    metric_data = param_df[param_df['metric_name'] == metric]
                    if len(metric_data) > 5:
                        corr = metric_data[param].corr(metric_data['metric_value'])
                        if not np.isnan(corr):
                            param_correlations[metric] = float(corr)
                
                if param_correlations:
                    correlations[param] = param_correlations
        
        return {
            'parameter_correlations': correlations,
            'sample_size': len(param_df),
            'analyzed_parameters': numeric_params,
            'analyzed_metrics': performance_metrics
        }

class ReportGenerator:
    """Generates comprehensive training reports"""
    
    def __init__(self, db_path: str = "rl_training/metrics.db", 
                 output_dir: str = "rl_training/reports"):
        self.db = MetricsDatabase(db_path)
        self.analyzer = PerformanceAnalyzer(db_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_comprehensive_report(self) -> PerformanceReport:
        """Generate complete training performance report"""
        report_id = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Collect all analysis data
        overall_analysis = self.analyzer.analyze_training_progress()
        style_comparison = self.analyzer.compare_styles()
        
        # Calculate key metrics
        training_duration = overall_analysis.get('training_duration_hours', 0.0)
        
        # Get total conversions
        conversion_df = self.db.get_metrics(metric_name='conversions')
        total_conversions = int(conversion_df['metric_value'].sum()) if not conversion_df.empty else 0
        
        # Calculate success rate
        success_df = self.db.get_metrics(metric_name='success_rate')
        avg_success_rate = float(success_df['metric_value'].mean()) if not success_df.empty else 0.0
        
        # Best scores per style
        best_scores = {}
        for style in ['classic_portrait', 'thick_textured', 'soft_impressionist']:
            style_analysis = self.analyzer.analyze_training_progress(style)
            if 'best_performance' in style_analysis:
                best_scores[style] = style_analysis['best_performance']
        
        # Improvement metrics
        improvement_metrics = {
            'overall_improvement': overall_analysis.get('performance_improvement', 0.0),
            'convergence_status': overall_analysis.get('convergence_analysis', {}).get('status', 'unknown'),
            'learning_efficiency': overall_analysis.get('learning_curve', {}).get('efficiency_score', 0.0),
            'stability_score': 1.0 / (1.0 + overall_analysis.get('performance_stability', 1.0))
        }
        
        # Resource usage (simplified)
        resource_usage = {
            'training_duration_hours': training_duration,
            'total_episodes': overall_analysis.get('total_episodes', 0),
            'conversions_per_hour': total_conversions / max(training_duration, 1.0)
        }
        
        # Generate recommendations
        recommendations = self._generate_recommendations(overall_analysis, style_comparison)
        
        # Create report
        report = PerformanceReport(
            report_id=report_id,
            generation_time=datetime.now().isoformat(),
            training_duration_hours=training_duration,
            total_conversions=total_conversions,
            success_rate=avg_success_rate,
            best_scores=best_scores,
            improvement_metrics=improvement_metrics,
            resource_usage=resource_usage,
            recommendations=recommendations
        )
        
        # Generate visualizations
        self._generate_report_visualizations(report_id)
        
        # Generate HTML report
        self._generate_html_report(report)
        
        return report
    
    def _generate_recommendations(self, overall_analysis: Dict, style_comparison: Dict) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        # Performance recommendations
        if overall_analysis.get('final_performance', 0.0) < 0.8:
            recommendations.append("Consider increasing training episodes or adjusting learning parameters to improve final performance")
        
        # Convergence recommendations
        convergence = overall_analysis.get('convergence_analysis', {})
        if convergence.get('status') == 'still_learning':
            recommendations.append("Training has not yet converged - consider running additional episodes")
        
        # Stability recommendations
        if overall_analysis.get('performance_stability', 0.0) > 0.1:
            recommendations.append("High performance variability detected - consider adjusting exploration rate or parameter ranges")
        
        # Style-specific recommendations
        if 'rankings' in style_comparison:
            performance_ranking = style_comparison['rankings']['performance']
            worst_style = performance_ranking[-1][0] if performance_ranking else None
            
            if worst_style:
                recommendations.append(f"Style '{worst_style}' shows lowest performance - review parameter settings and training approach")
        
        # Efficiency recommendations
        efficiency = overall_analysis.get('learning_curve', {}).get('efficiency_score', 0.0)
        if efficiency < 0.5:
            recommendations.append("Low learning efficiency detected - consider optimizing parameter exploration strategy")
        
        # Resource recommendations
        duration = overall_analysis.get('training_duration_hours', 0.0)
        if duration > 24:
            recommendations.append("Long training duration - consider parallel processing or parameter optimization")
        
        return recommendations
    
    def _generate_report_visualizations(self, report_id: str):
        """Generate visualization plots for the report"""
        # Create plots directory
        plots_dir = self.output_dir / f"{report_id}_plots"
        plots_dir.mkdir(exist_ok=True)
        
        # 1. Training progress plot
        self._plot_training_progress(plots_dir)
        
        # 2. Style comparison plot
        self._plot_style_comparison(plots_dir)
        
        # 3. Performance metrics dashboard
        self._plot_performance_dashboard(plots_dir)
        
        # 4. Parameter sensitivity analysis
        self._plot_parameter_sensitivity(plots_dir)
    
    def _plot_training_progress(self, plots_dir: Path):
        """Plot training progress over time"""
        # Get reward data
        df = self.db.get_metrics(metric_name='avg_reward')
        
        if df.empty:
            return
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        
        plt.figure(figsize=(12, 6))
        
        # Plot by style
        for style in df['style_id'].dropna().unique():
            style_data = df[df['style_id'] == style]
            plt.plot(style_data['timestamp'], style_data['metric_value'], 
                    label=style.replace('_', ' ').title(), marker='o', markersize=3)
        
        plt.title('Training Progress - Average Reward Over Time')
        plt.xlabel('Time')
        plt.ylabel('Average Reward')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        plt.savefig(plots_dir / 'training_progress.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_style_comparison(self, plots_dir: Path):
        """Plot comparison between styles"""
        comparison = self.analyzer.compare_styles()
        
        if not comparison or 'rankings' not in comparison:
            return
        
        # Extract data for plotting
        styles = []
        final_perf = []
        improvements = []
        efficiencies = []
        
        for style, data in comparison.items():
            if style != 'rankings':
                styles.append(style.replace('_', ' ').title())
                final_perf.append(data['final_performance'])
                improvements.append(data['improvement'])
                efficiencies.append(data['efficiency'])
        
        # Create subplot
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Final performance
        axes[0].bar(styles, final_perf, color=['#ff7f0e', '#2ca02c', '#d62728'])
        axes[0].set_title('Final Performance by Style')
        axes[0].set_ylabel('Final Performance Score')
        axes[0].tick_params(axis='x', rotation=45)
        
        # Improvement
        axes[1].bar(styles, improvements, color=['#ff7f0e', '#2ca02c', '#d62728'])
        axes[1].set_title('Performance Improvement by Style')
        axes[1].set_ylabel('Improvement Score')
        axes[1].tick_params(axis='x', rotation=45)
        
        # Efficiency
        axes[2].bar(styles, efficiencies, color=['#ff7f0e', '#2ca02c', '#d62728'])
        axes[2].set_title('Learning Efficiency by Style')
        axes[2].set_ylabel('Efficiency Score')
        axes[2].tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig(plots_dir / 'style_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_performance_dashboard(self, plots_dir: Path):
        """Create performance metrics dashboard"""
        # Get various metrics
        metrics = ['subject_preservation', 'oil_painting_authenticity', 'style_distinctiveness']
        
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        axes = axes.flatten()
        
        for i, metric in enumerate(metrics):
            df = self.db.get_metrics(metric_name=metric)
            
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
                
                # Plot by style if available
                if 'style_id' in df.columns and df['style_id'].notna().any():
                    for style in df['style_id'].dropna().unique():
                        style_data = df[df['style_id'] == style]
                        axes[i].plot(style_data['timestamp'], style_data['metric_value'], 
                                   label=style.replace('_', ' ').title(), alpha=0.7)
                else:
                    axes[i].plot(df['timestamp'], df['metric_value'], alpha=0.7)
                
                axes[i].set_title(metric.replace('_', ' ').title())
                axes[i].set_ylabel('Score')
                axes[i].grid(True, alpha=0.3)
                axes[i].legend()
        
        # Success rate in the last subplot
        success_df = self.db.get_metrics(metric_name='success_rate')
        if not success_df.empty:
            success_df['timestamp'] = pd.to_datetime(success_df['timestamp'])
            success_df = success_df.sort_values('timestamp')
            
            axes[3].plot(success_df['timestamp'], success_df['metric_value'], 
                        color='green', linewidth=2)
            axes[3].set_title('Success Rate Over Time')
            axes[3].set_ylabel('Success Rate')
            axes[3].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(plots_dir / 'performance_dashboard.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _plot_parameter_sensitivity(self, plots_dir: Path):
        """Plot parameter sensitivity analysis"""
        # This would require parameter data to be stored in metrics
        # For now, create a placeholder
        
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.text(0.5, 0.5, 'Parameter Sensitivity Analysis\n(Requires parameter tracking data)', 
                ha='center', va='center', fontsize=14)
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        
        plt.savefig(plots_dir / 'parameter_sensitivity.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_html_report(self, report: PerformanceReport):
        """Generate HTML report"""
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>RL Training Report - {{ report.report_id }}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { background-color: #f0f0f0; padding: 20px; border-radius: 8px; }
                .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
                .metric-card { background-color: #f8f8f8; padding: 15px; border-radius: 8px; }
                .recommendation { background-color: #e8f4fd; padding: 10px; margin: 5px 0; border-left: 4px solid #007acc; }
                .success { color: #008000; }
                .warning { color: #ff8800; }
                .error { color: #cc0000; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RL Training Performance Report</h1>
                <p><strong>Report ID:</strong> {{ report.report_id }}</p>
                <p><strong>Generated:</strong> {{ report.generation_time }}</p>
                <p><strong>Training Duration:</strong> {{ "%.1f"|format(report.training_duration_hours) }} hours</p>
            </div>
            
            <h2>Key Metrics</h2>
            <div class="metrics">
                <div class="metric-card">
                    <h3>Total Conversions</h3>
                    <p style="font-size: 24px; font-weight: bold;">{{ report.total_conversions }}</p>
                </div>
                <div class="metric-card">
                    <h3>Success Rate</h3>
                    <p style="font-size: 24px; font-weight: bold;" class="{% if report.success_rate > 0.9 %}success{% elif report.success_rate > 0.7 %}warning{% else %}error{% endif %}">
                        {{ "%.1f"|format(report.success_rate * 100) }}%
                    </p>
                </div>
                <div class="metric-card">
                    <h3>Best Overall Score</h3>
                    <p style="font-size: 24px; font-weight: bold;">
                        {{ "%.3f"|format(report.best_scores.values() | max) if report.best_scores else "N/A" }}
                    </p>
                </div>
                <div class="metric-card">
                    <h3>Learning Efficiency</h3>
                    <p style="font-size: 24px; font-weight: bold;">
                        {{ "%.3f"|format(report.improvement_metrics.learning_efficiency) }}
                    </p>
                </div>
            </div>
            
            <h2>Style Performance</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f0f0f0;">
                    <th style="padding: 10px; border: 1px solid #ddd;">Style</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Best Score</th>
                </tr>
                {% for style, score in report.best_scores.items() %}
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">{{ style.replace('_', ' ').title() }}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{{ "%.3f"|format(score) }}</td>
                </tr>
                {% endfor %}
            </table>
            
            <h2>Recommendations</h2>
            {% for recommendation in report.recommendations %}
            <div class="recommendation">{{ recommendation }}</div>
            {% endfor %}
            
            <h2>Training Analysis</h2>
            <ul>
                <li><strong>Convergence Status:</strong> {{ report.improvement_metrics.convergence_status }}</li>
                <li><strong>Overall Improvement:</strong> {{ "%.3f"|format(report.improvement_metrics.overall_improvement) }}</li>
                <li><strong>Stability Score:</strong> {{ "%.3f"|format(report.improvement_metrics.stability_score) }}</li>
            </ul>
            
            <p><em>Report generated by RL Training System at {{ report.generation_time }}</em></p>
        </body>
        </html>
        """
        
        from jinja2 import Template
        template = Template(html_template)
        html_content = template.render(report=report)
        
        # Save HTML report
        html_file = self.output_dir / f"{report.report_id}.html"
        with open(html_file, 'w') as f:
            f.write(html_content)
        
        logging.info(f"HTML report generated: {html_file}")

def main():
    """Example usage"""
    
    # Initialize metrics system
    collector = MetricsCollector()
    reporter = ReportGenerator()
    
    # Example: Start training session
    session_id = "training_session_001"
    config = {
        "total_images": 500,
        "episodes_per_style": 100,
        "learning_rate": 0.1
    }
    
    collector.start_training_session(session_id, config)
    
    # Simulate some training metrics
    for episode in range(5):
        for style in ['classic_portrait', 'thick_textured', 'soft_impressionist']:
            results = {
                'avg_reward': random.uniform(0.3, 0.9),
                'best_reward': random.uniform(0.5, 0.95),
                'std_reward': random.uniform(0.05, 0.2),
                'conversions': random.randint(8, 20),
                'failures': random.randint(0, 3),
                'avg_processing_time': random.uniform(20, 60),
                'epsilon': 1.0 - (episode * 0.1)
            }
            
            collector.record_episode_metrics(style, episode, results)
    
    # End training session
    final_results = {"completed": True, "total_time": 2.5}
    collector.end_training_session(final_results, 15, 150)
    
    # Generate comprehensive report
    report = reporter.generate_comprehensive_report()
    
    print(f"Report generated: {report.report_id}")
    print(f"Total conversions: {report.total_conversions}")
    print(f"Success rate: {report.success_rate:.1%}")
    print(f"Recommendations: {len(report.recommendations)}")


if __name__ == "__main__":
    main()
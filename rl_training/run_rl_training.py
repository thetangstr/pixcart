#!/usr/bin/env python3
"""
Main RL Training Orchestrator
Runs the complete reinforcement learning training pipeline for oil painting optimization
"""

import os
import sys
import argparse
import json
import time
from pathlib import Path
from datetime import datetime
import logging

# Add current directory to Python path
sys.path.append(str(Path(__file__).parent))

# Import all components
from dataset_acquisition import DatasetAcquisition
from rl_optimizer import RLParameterOptimizer
from vision_evaluator import VisionEvaluator
from human_evaluation import HumanEvaluationIntegration
from parameter_explorer import ParameterExplorer
from metrics_reporter import MetricsCollector, ReportGenerator
from training_pipeline import TrainingPipeline, TrainingConfig
from deploy_optimized_params import ParameterDeployment

class RLTrainingOrchestrator:
    """Main orchestrator for RL training system"""
    
    def __init__(self, config_file: str = None):
        self.config = self._load_config(config_file)
        self.setup_directories()
        self.setup_logging()
        
        # Initialize components
        self.dataset_acquisition = DatasetAcquisition()
        self.rl_optimizer = RLParameterOptimizer()
        self.vision_evaluator = VisionEvaluator()
        self.human_evaluation = HumanEvaluationIntegration()
        self.parameter_explorer = ParameterExplorer()
        self.metrics_collector = MetricsCollector()
        self.report_generator = ReportGenerator()
        self.parameter_deployment = ParameterDeployment()
        
        logging.info("RL Training Orchestrator initialized")
    
    def _load_config(self, config_file: str = None) -> dict:
        """Load configuration from file or use defaults"""
        default_config = {
            "dataset": {
                "total_images": 500,
                "train_test_split": 0.9,
                "batch_size": 20,
                "diversity_threshold": 0.7
            },
            "training": {
                "episodes_per_style": 100,
                "max_steps_per_episode": 10,
                "target_success_rate": 0.95,
                "convergence_threshold": 0.05
            },
            "evaluation": {
                "human_evaluation_frequency": 20,
                "automated_evaluation_only": True,
                "quality_threshold": 0.8
            },
            "system": {
                "max_concurrent_conversions": 3,
                "memory_limit_gb": 8.0,
                "max_processing_time": 120.0
            },
            "deployment": {
                "auto_deploy": False,
                "test_before_deploy": True,
                "backup_existing": True
            },
            "api": {
                "base_url": "http://localhost:7860",
                "timeout": 120,
                "retry_attempts": 3
            }
        }
        
        if config_file and Path(config_file).exists():
            try:
                with open(config_file, 'r') as f:
                    file_config = json.load(f)
                
                # Merge configurations (file config overrides defaults)
                self._deep_merge_dict(default_config, file_config)
                logging.info(f"Configuration loaded from: {config_file}")
                
            except Exception as e:
                logging.warning(f"Failed to load config file {config_file}: {e}")
                logging.info("Using default configuration")
        
        return default_config
    
    def _deep_merge_dict(self, base: dict, update: dict):
        """Deep merge two dictionaries"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge_dict(base[key], value)
            else:
                base[key] = value
    
    def setup_directories(self):
        """Create necessary directories"""
        directories = [
            "rl_training/results",
            "rl_training/models",
            "rl_training/exploration",
            "rl_training/reports",
            "rl_training/backups",
            "rl_training/temp_outputs",
            "training_data/cats",
            "training_data/dogs"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    def setup_logging(self):
        """Setup comprehensive logging"""
        log_file = Path("rl_training/training_orchestrator.log")
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
    
    def check_prerequisites(self) -> bool:
        """Check if all prerequisites are met"""
        logging.info("Checking prerequisites...")
        
        prerequisites_met = True
        
        # Check API availability
        try:
            import requests
            response = requests.get(f"{self.config['api']['base_url']}/docs", timeout=10)
            if response.status_code != 200:
                logging.error("Stable Diffusion API not available")
                prerequisites_met = False
            else:
                logging.info("✓ Stable Diffusion API is available")
        except Exception as e:
            logging.error(f"Failed to connect to API: {e}")
            prerequisites_met = False
        
        # Check required environment variables
        required_env_vars = []  # Add any required env vars
        for var in required_env_vars:
            if not os.getenv(var):
                logging.error(f"Missing required environment variable: {var}")
                prerequisites_met = False
        
        # Check available disk space
        import shutil
        free_space_gb = shutil.disk_usage('.').free / (1024**3)
        if free_space_gb < 10:  # Require at least 10GB free
            logging.warning(f"Low disk space: {free_space_gb:.1f}GB free")
        
        # Check Python packages
        required_packages = [
            'numpy', 'pandas', 'matplotlib', 'seaborn', 'scikit-learn',
            'opencv-python', 'Pillow', 'requests', 'torch', 'torchvision'
        ]
        
        missing_packages = []
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            logging.error(f"Missing required packages: {missing_packages}")
            logging.error("Install with: pip install " + " ".join(missing_packages))
            prerequisites_met = False
        else:
            logging.info("✓ All required packages are available")
        
        return prerequisites_met
    
    def run_full_training(self) -> dict:
        """Run complete RL training pipeline"""
        
        start_time = datetime.now()
        session_id = f"rl_training_{start_time.strftime('%Y%m%d_%H%M%S')}"
        
        logging.info(f"Starting full RL training pipeline - Session: {session_id}")
        
        try:
            # Start metrics collection
            self.metrics_collector.start_training_session(session_id, self.config)
            
            # Create training configuration
            training_config = TrainingConfig(
                total_images=self.config["dataset"]["total_images"],
                train_test_split=self.config["dataset"]["train_test_split"],
                batch_size=self.config["dataset"]["batch_size"],
                episodes_per_style=self.config["training"]["episodes_per_style"],
                max_steps_per_episode=self.config["training"]["max_steps_per_episode"],
                human_evaluation_frequency=self.config["evaluation"]["human_evaluation_frequency"],
                automated_evaluation_only=self.config["evaluation"]["automated_evaluation_only"],
                max_concurrent_conversions=self.config["system"]["max_concurrent_conversions"],
                memory_limit_gb=self.config["system"]["memory_limit_gb"],
                output_dir="rl_training/results"
            )
            
            # Run training pipeline
            pipeline = TrainingPipeline(training_config)
            training_results = pipeline.run_training()
            
            # End metrics collection
            end_time = datetime.now()
            total_episodes = sum(len(style_results["episodes"]) 
                               for style_results in training_results["style_results"].values())
            total_conversions = sum(style_results.get("total_conversions", 0) 
                                  for style_results in training_results["style_results"].values())
            
            self.metrics_collector.end_training_session(
                training_results, total_episodes, total_conversions
            )
            
            # Generate comprehensive report
            performance_report = self.report_generator.generate_comprehensive_report()
            
            # Export optimized parameters
            self.rl_optimizer.export_optimized_configs("rl_training/results/optimized_parameters.json")
            
            # Auto-deployment if configured
            if self.config["deployment"]["auto_deploy"]:
                logging.info("Auto-deploying optimized parameters...")
                deployment_results = self.deploy_parameters()
                training_results["deployment_results"] = deployment_results
            
            # Final results
            final_results = {
                "session_id": session_id,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_hours": (end_time - start_time).total_seconds() / 3600,
                "training_results": training_results,
                "performance_report": performance_report,
                "success": True,
                "summary": self._generate_training_summary(training_results, performance_report)
            }
            
            # Save final results
            results_file = Path("rl_training/results") / f"final_results_{session_id}.json"
            with open(results_file, 'w') as f:
                json.dump(final_results, f, indent=2, default=str)
            
            logging.info(f"Training completed successfully! Results saved to: {results_file}")
            
            return final_results
            
        except Exception as e:
            logging.error(f"Training pipeline failed: {e}")
            
            # Save failure report
            failure_results = {
                "session_id": session_id,
                "start_time": start_time.isoformat(),
                "end_time": datetime.now().isoformat(),
                "success": False,
                "error": str(e),
                "config": self.config
            }
            
            failure_file = Path("rl_training/results") / f"failure_report_{session_id}.json"
            with open(failure_file, 'w') as f:
                json.dump(failure_results, f, indent=2, default=str)
            
            return failure_results
    
    def _generate_training_summary(self, training_results: dict, performance_report) -> dict:
        """Generate training summary"""
        
        # Extract key metrics
        style_results = training_results.get("style_results", {})
        final_evaluation = training_results.get("final_evaluation", {})
        
        # Calculate overall success rate
        success_rates = []
        for style_data in final_evaluation.values():
            if isinstance(style_data, dict) and "success_rate" in style_data:
                success_rates.append(style_data["success_rate"])
        
        overall_success_rate = sum(success_rates) / len(success_rates) if success_rates else 0.0
        
        # Best scores
        best_scores = {}
        for style, data in final_evaluation.items():
            if isinstance(data, dict) and "avg_score" in data:
                best_scores[style] = data["avg_score"]
        
        # Training efficiency
        total_episodes = sum(len(style_data.get("episodes", [])) 
                           for style_data in style_results.values())
        total_conversions = sum(style_data.get("total_conversions", 0) 
                              for style_data in style_results.values())
        
        return {
            "overall_success_rate": overall_success_rate,
            "target_achieved": overall_success_rate >= self.config["training"]["target_success_rate"],
            "total_episodes": total_episodes,
            "total_conversions": total_conversions,
            "best_scores": best_scores,
            "training_efficiency": total_conversions / max(total_episodes, 1),
            "styles_optimized": len(style_results),
            "recommendation": self._get_training_recommendation(overall_success_rate)
        }
    
    def _get_training_recommendation(self, success_rate: float) -> str:
        """Get recommendation based on training results"""
        if success_rate >= 0.95:
            return "Excellent results! Ready for production deployment."
        elif success_rate >= 0.90:
            return "Very good results. Consider minor parameter fine-tuning or deploy as-is."
        elif success_rate >= 0.80:
            return "Good results. Additional training episodes recommended for improvement."
        elif success_rate >= 0.70:
            return "Moderate results. Review parameter ranges and consider different exploration strategy."
        else:
            return "Poor results. Check system configuration and consider adjusting training approach."
    
    def deploy_parameters(self, source_file: str = None) -> dict:
        """Deploy optimized parameters to production"""
        logging.info("Deploying optimized parameters...")
        
        # Use latest optimized parameters if no source specified
        if not source_file:
            source_file = "rl_training/results/optimized_parameters.json"
        
        # Configure deployment
        self.parameter_deployment.deployment_config.update({
            "backup_existing": self.config["deployment"]["backup_existing"],
            "test_conversion": self.config["deployment"]["test_before_deploy"]
        })
        
        # Run deployment
        deployment_results = self.parameter_deployment.deploy(
            source_file=source_file,
            api_url=self.config["api"]["base_url"].replace("7860", "3000")  # Convert to Next.js port
        )
        
        return deployment_results
    
    def run_parameter_exploration(self, style_id: str, iterations: int = 50) -> dict:
        """Run focused parameter exploration for a specific style"""
        logging.info(f"Running parameter exploration for {style_id} ({iterations} iterations)")
        
        results = {
            "style_id": style_id,
            "iterations": iterations,
            "start_time": datetime.now().isoformat(),
            "exploration_points": [],
            "best_parameters": None,
            "best_score": 0.0
        }
        
        for i in range(iterations):
            # Get exploration suggestions
            suggestions = self.parameter_explorer.suggest_exploration_points(style_id, count=1)
            
            if not suggestions:
                break
            
            suggestion = suggestions[0]
            
            # Test the parameters
            try:
                # Convert test image
                test_image = "test-image.png"  # Should exist in project root
                if Path(test_image).exists():
                    conversion_result = self.vision_evaluator.convert_with_parameters(
                        test_image, suggestion
                    )
                    
                    if conversion_result["success"]:
                        # Evaluate result
                        evaluation_scores = self.vision_evaluator.evaluate_conversion(
                            test_image, conversion_result["output_path"], style_id
                        )
                        
                        # Record result
                        self.parameter_explorer.record_exploration_result(
                            suggestion, evaluation_scores, 30.0  # Mock processing time
                        )
                        
                        # Track best
                        overall_score = evaluation_scores.get("overall_quality", 0.0)
                        if overall_score > results["best_score"]:
                            results["best_score"] = overall_score
                            results["best_parameters"] = suggestion
                        
                        results["exploration_points"].append({
                            "iteration": i + 1,
                            "parameters": suggestion,
                            "scores": evaluation_scores,
                            "overall_score": overall_score
                        })
                        
                        logging.info(f"Iteration {i+1}/{iterations}: Score = {overall_score:.3f}")
                    
            except Exception as e:
                logging.error(f"Exploration iteration {i+1} failed: {e}")
        
        results["end_time"] = datetime.now().isoformat()
        
        # Generate exploration report
        self.parameter_explorer.generate_exploration_visualizations()
        
        return results

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="RL Training System for Oil Painting Optimization")
    
    parser.add_argument("--config", "-c", help="Configuration file path")
    parser.add_argument("--mode", "-m", choices=["full", "explore", "deploy"], 
                       default="full", help="Operation mode")
    parser.add_argument("--style", "-s", help="Style ID for exploration mode")
    parser.add_argument("--iterations", "-i", type=int, default=50, 
                       help="Iterations for exploration mode")
    parser.add_argument("--deploy-source", help="Source file for deployment")
    parser.add_argument("--skip-checks", action="store_true", 
                       help="Skip prerequisite checks")
    
    args = parser.parse_args()
    
    print("🎨 RL Training System for Oil Painting Optimization")
    print("=" * 60)
    
    try:
        # Initialize orchestrator
        orchestrator = RLTrainingOrchestrator(args.config)
        
        # Check prerequisites
        if not args.skip_checks and not orchestrator.check_prerequisites():
            print("❌ Prerequisites not met. Exiting.")
            sys.exit(1)
        
        # Run based on mode
        if args.mode == "full":
            print("🚀 Starting full training pipeline...")
            results = orchestrator.run_full_training()
            
            if results["success"]:
                print("\n✅ Training completed successfully!")
                summary = results["summary"]
                print(f"Success Rate: {summary['overall_success_rate']:.1%}")
                print(f"Total Conversions: {summary['total_conversions']}")
                print(f"Target Achieved: {'Yes' if summary['target_achieved'] else 'No'}")
                print(f"Recommendation: {summary['recommendation']}")
            else:
                print("\n❌ Training failed!")
                print(f"Error: {results.get('error', 'Unknown error')}")
                sys.exit(1)
        
        elif args.mode == "explore":
            if not args.style:
                print("❌ Style ID required for exploration mode")
                sys.exit(1)
            
            print(f"🔍 Running parameter exploration for {args.style}...")
            results = orchestrator.run_parameter_exploration(args.style, args.iterations)
            
            print(f"\n✅ Exploration completed!")
            print(f"Best Score: {results['best_score']:.3f}")
            print(f"Exploration Points: {len(results['exploration_points'])}")
        
        elif args.mode == "deploy":
            print("🚀 Deploying optimized parameters...")
            results = orchestrator.deploy_parameters(args.deploy_source)
            
            if results["success"]:
                print("\n✅ Deployment successful!")
                print(f"Steps completed: {', '.join(results['steps_completed'])}")
                if results["backup_file"]:
                    print(f"Backup created: {results['backup_file']}")
            else:
                print("\n❌ Deployment failed!")
                print(f"Errors: {', '.join(results['errors'])}")
                if results["rollback_performed"]:
                    print("Rollback was performed.")
                sys.exit(1)
        
        print("\n" + "=" * 60)
        print("Operation completed successfully! 🎉")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        logging.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
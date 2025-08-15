#!/usr/bin/env python3
"""
Deployment Script for Optimized Parameters
Integrates RL-optimized parameters into the production oil painting system
"""

import json
import shutil
import os
import sys
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime
import logging
import subprocess
import requests
import time

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

class ParameterDeployment:
    """Handles deployment of optimized parameters to production"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent.parent
        self.rl_training_dir = self.project_root / "rl_training"
        self.app_lib_dir = self.project_root / "app" / "lib"
        
        # Setup logging
        self._setup_logging()
        
        # Deployment configuration
        self.deployment_config = {
            "backup_existing": True,
            "validate_parameters": True,
            "test_conversion": True,
            "rollback_on_failure": True,
            "api_test_timeout": 30
        }
        
        logging.info("Parameter deployment system initialized")
    
    def _setup_logging(self):
        """Setup logging for deployment"""
        log_file = self.rl_training_dir / "deployment.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
    
    def load_optimized_parameters(self, source_file: str = None) -> Dict:
        """Load optimized parameters from RL training"""
        
        # Default source locations
        possible_sources = [
            source_file,
            str(self.rl_training_dir / "results" / "optimized_parameters.json"),
            str(self.rl_training_dir / "exploration" / "optimization_results.json"),
            str(self.rl_training_dir / "models" / "best_parameters.json")
        ]
        
        optimized_params = None
        source_used = None
        
        for source in possible_sources:
            if source and Path(source).exists():
                try:
                    with open(source, 'r') as f:
                        data = json.load(f)
                    
                    # Extract parameters from different formats
                    if 'best_parameters' in data:
                        optimized_params = data['best_parameters']
                    elif all(style in data for style in ['classic_portrait', 'thick_textured', 'soft_impressionist']):
                        optimized_params = data
                    else:
                        continue
                    
                    source_used = source
                    break
                    
                except Exception as e:
                    logging.warning(f"Failed to load parameters from {source}: {e}")
                    continue
        
        if not optimized_params:
            raise FileNotFoundError("No valid optimized parameters found. Run RL training first.")
        
        logging.info(f"Loaded optimized parameters from: {source_used}")
        return optimized_params
    
    def validate_parameters(self, parameters: Dict) -> bool:
        """Validate parameter format and values"""
        
        required_styles = ['classic_portrait', 'thick_textured', 'soft_impressionist']
        required_params = ['denoising_strength', 'cfg_scale', 'steps', 'controlnet_weight', 'sampler']
        
        # Check all styles present
        for style in required_styles:
            if style not in parameters:
                logging.error(f"Missing style: {style}")
                return False
            
            style_params = parameters[style]
            
            # Check all required parameters
            for param in required_params:
                if param not in style_params:
                    logging.error(f"Missing parameter {param} for style {style}")
                    return False
            
            # Validate parameter ranges
            if not self._validate_parameter_ranges(style_params):
                logging.error(f"Invalid parameter ranges for style {style}")
                return False
        
        logging.info("Parameter validation passed")
        return True
    
    def _validate_parameter_ranges(self, params: Dict) -> bool:
        """Validate individual parameter ranges"""
        
        # Define valid ranges
        ranges = {
            'denoising_strength': (0.1, 1.0),
            'cfg_scale': (1.0, 20.0),
            'steps': (10, 100),
            'controlnet_weight': (0.0, 2.0)
        }
        
        valid_samplers = [
            "DPM++ 2M Karras", "Euler a", "DPM++ SDE Karras", 
            "DDIM", "UniPC", "Heun", "LMS"
        ]
        
        # Check ranges
        for param, (min_val, max_val) in ranges.items():
            value = params.get(param)
            if not isinstance(value, (int, float)) or not (min_val <= value <= max_val):
                logging.error(f"Parameter {param} value {value} outside range [{min_val}, {max_val}]")
                return False
        
        # Check sampler
        if params.get('sampler') not in valid_samplers:
            logging.error(f"Invalid sampler: {params.get('sampler')}")
            return False
        
        return True
    
    def backup_current_parameters(self) -> str:
        """Backup current production parameters"""
        
        backup_dir = self.rl_training_dir / "backups"
        backup_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = backup_dir / f"parameters_backup_{timestamp}.json"
        
        # Load current parameters
        current_params_file = self.app_lib_dir / "oilPaintingStyles.ts"
        
        if current_params_file.exists():
            # Parse current TypeScript file to extract parameters
            current_params = self._extract_current_parameters(current_params_file)
            
            # Save backup
            backup_data = {
                "backup_timestamp": timestamp,
                "source_file": str(current_params_file),
                "parameters": current_params
            }
            
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            logging.info(f"Current parameters backed up to: {backup_file}")
            return str(backup_file)
        else:
            logging.warning("Current parameters file not found - no backup created")
            return None
    
    def _extract_current_parameters(self, ts_file: Path) -> Dict:
        """Extract current parameters from TypeScript file"""
        try:
            with open(ts_file, 'r') as f:
                content = f.read()
            
            # Simple extraction (could be more robust)
            current_params = {}
            
            # Find each style block and extract parameters
            import re
            
            # Pattern to match style objects
            style_pattern = r"id:\s*'(\w+)'.*?denoising_strength:\s*([\d.]+).*?cfg_scale:\s*([\d.]+).*?steps:\s*(\d+).*?sampler:\s*'([^']+)'"
            
            matches = re.findall(style_pattern, content, re.DOTALL)
            
            for match in matches:
                style_id, denoising, cfg, steps, sampler = match
                current_params[style_id] = {
                    'denoising_strength': float(denoising),
                    'cfg_scale': float(cfg),
                    'steps': int(steps),
                    'controlnet_weight': 0.65,  # Default if not found
                    'sampler': sampler
                }
            
            return current_params
            
        except Exception as e:
            logging.error(f"Failed to extract current parameters: {e}")
            return {}
    
    def update_production_parameters(self, optimized_params: Dict) -> bool:
        """Update production parameters file"""
        
        ts_file = self.app_lib_dir / "oilPaintingStyles.ts"
        
        if not ts_file.exists():
            logging.error(f"Production parameters file not found: {ts_file}")
            return False
        
        try:
            # Read current file
            with open(ts_file, 'r') as f:
                content = f.read()
            
            # Update each style's parameters
            updated_content = content
            
            for style_id, params in optimized_params.items():
                # Update denoising_strength
                pattern = f"(id:\\s*'{style_id}'.*?denoising_strength:\\s*)([\\d.]+)"
                replacement = f"\\g<1>{params['denoising_strength']}"
                updated_content = re.sub(pattern, replacement, updated_content, flags=re.DOTALL)
                
                # Update cfg_scale
                pattern = f"(id:\\s*'{style_id}'.*?cfg_scale:\\s*)([\\d.]+)"
                replacement = f"\\g<1>{params['cfg_scale']}"
                updated_content = re.sub(pattern, replacement, updated_content, flags=re.DOTALL)
                
                # Update steps
                pattern = f"(id:\\s*'{style_id}'.*?steps:\\s*)(\\d+)"
                replacement = f"\\g<1>{params['steps']}"
                updated_content = re.sub(pattern, replacement, updated_content, flags=re.DOTALL)
                
                # Update sampler
                pattern = f"(id:\\s*'{style_id}'.*?sampler:\\s*')([^']+)'"
                replacement = f"\\g<1>{params['sampler']}'"
                updated_content = re.sub(pattern, replacement, updated_content, flags=re.DOTALL)
            
            # Add deployment comment
            deployment_comment = f"\n// Parameters optimized via RL training on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            updated_content = deployment_comment + updated_content
            
            # Write updated file
            with open(ts_file, 'w') as f:
                f.write(updated_content)
            
            logging.info(f"Production parameters updated: {ts_file}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to update production parameters: {e}")
            return False
    
    def test_api_conversion(self, test_image: str = None, api_url: str = "http://localhost:3000") -> bool:
        """Test conversion API with optimized parameters"""
        
        # Use test image or default
        if not test_image:
            test_image = str(self.project_root / "test-image.png")
            if not Path(test_image).exists():
                logging.warning("No test image found - skipping API test")
                return True
        
        logging.info(f"Testing API conversion with image: {test_image}")
        
        # Test each style
        styles = ['classic_portrait', 'thick_textured', 'soft_impressionist']
        
        for style_id in styles:
            try:
                # Prepare request
                with open(test_image, 'rb') as f:
                    files = {'image': ('test.jpg', f, 'image/jpeg')}
                    data = {'style': style_id}
                    
                    # Make API call
                    response = requests.post(
                        f"{api_url}/api/convert-v2",
                        files=files,
                        data=data,
                        timeout=self.deployment_config["api_test_timeout"]
                    )
                
                if response.status_code == 200:
                    logging.info(f"API test successful for style: {style_id}")
                else:
                    logging.error(f"API test failed for style {style_id}: {response.status_code}")
                    return False
                    
            except Exception as e:
                logging.error(f"API test error for style {style_id}: {e}")
                return False
        
        logging.info("All API tests passed")
        return True
    
    def restart_application(self) -> bool:
        """Restart the application to load new parameters"""
        try:
            # For Next.js development server, we can trigger a restart by touching files
            # In production, you might need different restart logic
            
            logging.info("Triggering application restart...")
            
            # Touch the main layout file to trigger hot reload
            layout_file = self.app_lib_dir.parent / "layout.tsx"
            if layout_file.exists():
                layout_file.touch()
                time.sleep(2)  # Wait for restart
                return True
            else:
                logging.warning("Could not trigger automatic restart")
                return False
                
        except Exception as e:
            logging.error(f"Failed to restart application: {e}")
            return False
    
    def rollback_parameters(self, backup_file: str) -> bool:
        """Rollback to previous parameters"""
        
        if not backup_file or not Path(backup_file).exists():
            logging.error("No valid backup file for rollback")
            return False
        
        try:
            # Load backup
            with open(backup_file, 'r') as f:
                backup_data = json.load(f)
            
            backup_params = backup_data.get('parameters', {})
            
            if not backup_params:
                logging.error("No parameters found in backup file")
                return False
            
            # Restore parameters
            success = self.update_production_parameters(backup_params)
            
            if success:
                logging.info(f"Parameters rolled back from backup: {backup_file}")
                return True
            else:
                logging.error("Failed to rollback parameters")
                return False
                
        except Exception as e:
            logging.error(f"Rollback failed: {e}")
            return False
    
    def generate_deployment_report(self, deployment_results: Dict) -> str:
        """Generate deployment report"""
        
        report_file = self.rl_training_dir / f"deployment_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report_data = {
            "deployment_timestamp": datetime.now().isoformat(),
            "deployment_results": deployment_results,
            "configuration": self.deployment_config,
            "project_root": str(self.project_root)
        }
        
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        logging.info(f"Deployment report generated: {report_file}")
        return str(report_file)
    
    def deploy(self, source_file: str = None, test_image: str = None, 
               api_url: str = "http://localhost:3000") -> Dict:
        """Main deployment function"""
        
        deployment_results = {
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "steps_completed": [],
            "errors": [],
            "backup_file": None,
            "rollback_performed": False
        }
        
        try:
            # Step 1: Load optimized parameters
            logging.info("Step 1: Loading optimized parameters...")
            optimized_params = self.load_optimized_parameters(source_file)
            deployment_results["steps_completed"].append("load_parameters")
            
            # Step 2: Validate parameters
            if self.deployment_config["validate_parameters"]:
                logging.info("Step 2: Validating parameters...")
                if not self.validate_parameters(optimized_params):
                    raise ValueError("Parameter validation failed")
                deployment_results["steps_completed"].append("validate_parameters")
            
            # Step 3: Backup current parameters
            if self.deployment_config["backup_existing"]:
                logging.info("Step 3: Backing up current parameters...")
                backup_file = self.backup_current_parameters()
                deployment_results["backup_file"] = backup_file
                deployment_results["steps_completed"].append("backup_parameters")
            
            # Step 4: Update production parameters
            logging.info("Step 4: Updating production parameters...")
            if not self.update_production_parameters(optimized_params):
                raise RuntimeError("Failed to update production parameters")
            deployment_results["steps_completed"].append("update_parameters")
            
            # Step 5: Restart application
            logging.info("Step 5: Restarting application...")
            if not self.restart_application():
                logging.warning("Application restart may be required manually")
            deployment_results["steps_completed"].append("restart_application")
            
            # Step 6: Test API conversion
            if self.deployment_config["test_conversion"]:
                logging.info("Step 6: Testing API conversion...")
                time.sleep(3)  # Wait for application to restart
                
                if not self.test_api_conversion(test_image, api_url):
                    if self.deployment_config["rollback_on_failure"]:
                        logging.error("API test failed - performing rollback...")
                        
                        if self.rollback_parameters(deployment_results["backup_file"]):
                            deployment_results["rollback_performed"] = True
                            self.restart_application()
                            raise RuntimeError("Deployment failed API test - rolled back to previous parameters")
                        else:
                            raise RuntimeError("Deployment failed API test AND rollback failed!")
                    else:
                        raise RuntimeError("API test failed")
                
                deployment_results["steps_completed"].append("test_conversion")
            
            # Deployment successful
            deployment_results["success"] = True
            logging.info("🎉 Deployment completed successfully!")
            
            # Print summary
            print("\n" + "="*60)
            print("DEPLOYMENT SUCCESSFUL")
            print("="*60)
            print(f"Optimized parameters deployed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Styles updated: {list(optimized_params.keys())}")
            print(f"Backup created: {deployment_results['backup_file']}")
            print(f"Steps completed: {', '.join(deployment_results['steps_completed'])}")
            print("="*60)
            
        except Exception as e:
            deployment_results["errors"].append(str(e))
            logging.error(f"Deployment failed: {e}")
            
            print("\n" + "="*60)
            print("DEPLOYMENT FAILED")
            print("="*60)
            print(f"Error: {e}")
            if deployment_results["rollback_performed"]:
                print("Rollback to previous parameters was performed.")
            print("="*60)
        
        finally:
            # Generate deployment report
            report_file = self.generate_deployment_report(deployment_results)
            deployment_results["report_file"] = report_file
        
        return deployment_results

def main():
    """Main deployment script"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Deploy RL-optimized parameters to production")
    parser.add_argument("--source", "-s", help="Source file with optimized parameters")
    parser.add_argument("--test-image", "-t", help="Test image for API validation")
    parser.add_argument("--api-url", "-u", default="http://localhost:3000", help="API URL for testing")
    parser.add_argument("--no-backup", action="store_true", help="Skip parameter backup")
    parser.add_argument("--no-validation", action="store_true", help="Skip parameter validation")
    parser.add_argument("--no-test", action="store_true", help="Skip API testing")
    parser.add_argument("--no-rollback", action="store_true", help="Don't rollback on failure")
    
    args = parser.parse_args()
    
    # Initialize deployment
    deployer = ParameterDeployment()
    
    # Configure deployment options
    if args.no_backup:
        deployer.deployment_config["backup_existing"] = False
    if args.no_validation:
        deployer.deployment_config["validate_parameters"] = False
    if args.no_test:
        deployer.deployment_config["test_conversion"] = False
    if args.no_rollback:
        deployer.deployment_config["rollback_on_failure"] = False
    
    # Run deployment
    results = deployer.deploy(
        source_file=args.source,
        test_image=args.test_image,
        api_url=args.api_url
    )
    
    # Exit with appropriate code
    sys.exit(0 if results["success"] else 1)

if __name__ == "__main__":
    main()
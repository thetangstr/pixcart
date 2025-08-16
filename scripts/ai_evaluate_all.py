#!/usr/bin/env python3
"""
AI evaluation of all 100 oil painting conversions
This script prepares the images for Claude's vision evaluation
"""

import json
import base64
from pathlib import Path
import logging
from typing import Dict, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("evaluation_dataset")
TASKS_DIR = OUTPUT_DIR / "tasks"
AI_SCORES_FILE = OUTPUT_DIR / "ai_evaluation_scores.json"

def load_all_tasks() -> List[Dict]:
    """Load all task files"""
    tasks = []
    task_files = sorted(TASKS_DIR.glob("task_*.json"))
    
    for task_file in task_files:
        with open(task_file, 'r') as f:
            task = json.load(f)
            tasks.append(task)
    
    logger.info(f"Loaded {len(tasks)} tasks")
    return tasks

def prepare_for_evaluation(tasks: List[Dict]) -> Dict:
    """Prepare tasks for AI evaluation"""
    
    evaluation_batch = {
        "total_tasks": len(tasks),
        "tasks": []
    }
    
    for task in tasks:
        # Extract just the essential info for evaluation
        eval_task = {
            "id": task["id"],
            "category": task.get("category", "unknown"),
            "has_original": bool(task.get("original_image")),
            "has_converted": bool(task.get("converted_image")),
            "parameters": task.get("parameters", {}),
            "file_path": f"task_{task['id']:03d}.json"
        }
        evaluation_batch["tasks"].append(eval_task)
    
    return evaluation_batch

def create_evaluation_prompt(task_id: int) -> str:
    """Create evaluation prompt for a specific task"""
    return f"""
Please evaluate task #{task_id} oil painting conversion with these 3 scores (1-5 scale):

1. **Preservation Score** (1-5):
   - 5: Perfect preservation - exact same subject, all features intact
   - 4: Very good - minor changes only, subject clearly recognizable
   - 3: Acceptable - some features altered but subject identifiable
   - 2: Poor - major changes, subject barely recognizable
   - 1: Failed - subject completely changed (e.g., cat becomes monkey)

2. **Style Score** (1-5):
   - 5: Museum quality oil painting effect
   - 4: Professional oil painting appearance
   - 3: Good oil painting texture
   - 2: Weak oil painting effect
   - 1: No oil painting characteristics

3. **Overall Score** (1-5):
   - 5: Production ready, excellent result
   - 4: Good, ready with minor review
   - 3: Acceptable but needs improvement
   - 2: Poor quality, needs rework
   - 1: Complete failure, unusable

Return scores as JSON: {{"preservation": X, "style": Y, "overall": Z}}
"""

def save_ai_scores_template(evaluation_batch: Dict):
    """Save template for AI scores"""
    
    ai_scores = {
        "evaluation_type": "AI (Claude Vision)",
        "total_tasks": evaluation_batch["total_tasks"],
        "scores": {}
    }
    
    # Create placeholder scores
    for task in evaluation_batch["tasks"]:
        ai_scores["scores"][str(task["id"])] = {
            "task_id": task["id"],
            "category": task["category"],
            "preservation": None,  # To be filled by vision evaluation
            "style": None,
            "overall": None,
            "ai_notes": None,
            "evaluated": False
        }
    
    # Save template
    with open(AI_SCORES_FILE, 'w') as f:
        json.dump(ai_scores, f, indent=2)
    
    logger.info(f"Saved AI scores template to {AI_SCORES_FILE}")

def main():
    logger.info("=" * 60)
    logger.info("AI EVALUATION PREPARATION")
    logger.info("=" * 60)
    
    # Load all tasks
    tasks = load_all_tasks()
    
    # Prepare for evaluation
    evaluation_batch = prepare_for_evaluation(tasks)
    
    # Save template
    save_ai_scores_template(evaluation_batch)
    
    logger.info("\n" + "=" * 60)
    logger.info(f"✅ Prepared {len(tasks)} tasks for AI evaluation")
    logger.info(f"📁 Tasks location: {TASKS_DIR}")
    logger.info(f"📊 AI scores template: {AI_SCORES_FILE}")
    logger.info("\nNext step: AI will evaluate each image pair")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()
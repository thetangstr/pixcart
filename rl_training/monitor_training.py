#!/usr/bin/env python3
"""
Monitor the large-scale RL training progress
"""

import sqlite3
import json
import time
from datetime import datetime
from pathlib import Path

def monitor_database():
    """Monitor training results from database"""
    db_path = "training_results.db"
    
    if not Path(db_path).exists():
        print("⏳ Database not created yet. Waiting for training to start...")
        return False
    
    try:
        db = sqlite3.connect(db_path)
        cursor = db.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM results")
        total = cursor.fetchone()[0]
        
        if total == 0:
            print("⏳ No conversions recorded yet...")
            return False
        
        # Get success rate
        cursor.execute("SELECT COUNT(*) FROM results WHERE success = 1")
        successful = cursor.fetchone()[0]
        
        # Get average scores
        cursor.execute("""
            SELECT 
                AVG(quality_score),
                AVG(subject_preservation),
                AVG(style_score),
                AVG(processing_time)
            FROM results 
            WHERE success = 1
        """)
        avg_quality, avg_preservation, avg_style, avg_time = cursor.fetchone()
        
        # Get best result
        cursor.execute("""
            SELECT quality_score, style, parameters
            FROM results
            WHERE success = 1
            ORDER BY quality_score DESC
            LIMIT 1
        """)
        best = cursor.fetchone()
        
        # Get results by style
        cursor.execute("""
            SELECT style, COUNT(*), AVG(quality_score)
            FROM results
            WHERE success = 1
            GROUP BY style
        """)
        style_results = cursor.fetchall()
        
        print("\n" + "=" * 60)
        print(f"📊 TRAINING PROGRESS - {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        print(f"Total conversions: {total}")
        print(f"Successful: {successful} ({successful/total*100:.1f}%)")
        
        if avg_quality:
            print(f"\n📈 Average Metrics:")
            print(f"  Quality: {avg_quality:.3f}")
            print(f"  Preservation: {avg_preservation:.3f}")
            print(f"  Style: {avg_style:.3f}")
            print(f"  Time: {avg_time:.1f}s")
        
        if best:
            print(f"\n🏆 Best Result:")
            print(f"  Quality: {best[0]:.3f}")
            print(f"  Style: {best[1]}")
            params = json.loads(best[2])
            print(f"  Parameters:")
            for k, v in params.items():
                print(f"    - {k}: {v}")
        
        if style_results:
            print(f"\n🎨 Results by Style:")
            for style, count, avg_q in style_results:
                print(f"  {style}: {count} conversions, avg quality {avg_q:.3f}")
        
        # Estimate completion
        if total < 5000:
            percent = total / 5000 * 100
            print(f"\n⏱️ Progress: {percent:.1f}% complete")
            if avg_time and total > 10:
                remaining = (5000 - total) * avg_time / 60
                print(f"   Estimated time remaining: {remaining:.0f} minutes")
        
        print("=" * 60)
        
        db.close()
        return True
        
    except Exception as e:
        print(f"Error reading database: {e}")
        return False

def check_dataset_progress():
    """Check if dataset is ready"""
    cache_dir = Path("dataset_cache")
    if cache_dir.exists():
        images = list(cache_dir.glob("*.png"))
        print(f"📁 Dataset cache: {len(images)} images")
        
        index_file = cache_dir / "dataset_index.json"
        if index_file.exists():
            with open(index_file) as f:
                data = json.load(f)
                print(f"   Index contains {len(data['images'])} images")
                return len(data['images']) >= 100
    return False

def main():
    print("🔍 Monitoring Large-Scale RL Training")
    print("-" * 40)
    
    # Check dataset first
    dataset_ready = check_dataset_progress()
    
    if not dataset_ready:
        print("⏳ Waiting for dataset to be prepared...")
        print("   This may take a few minutes for 5000 images")
        return
    
    # Monitor database
    while True:
        has_data = monitor_database()
        
        if not has_data:
            print("\n⏳ Waiting for training to begin...")
        
        # Check for completion
        try:
            db = sqlite3.connect("training_results.db")
            cursor = db.cursor()
            cursor.execute("SELECT COUNT(*) FROM results")
            total = cursor.fetchone()[0]
            db.close()
            
            if total >= 5000:
                print("\n🎉 TRAINING COMPLETE!")
                break
        except:
            pass
        
        # Wait before next check
        time.sleep(30)  # Check every 30 seconds

if __name__ == "__main__":
    main()
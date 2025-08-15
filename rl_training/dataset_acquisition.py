#!/usr/bin/env python3
"""
Dataset Acquisition System for RL Training
Downloads and organizes 500 diverse cat and dog photos for training
"""

import os
import requests
import json
import random
import time
from typing import List, Dict, Tuple
from pathlib import Path
import hashlib
from PIL import Image
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

class DatasetAcquisition:
    def __init__(self, data_dir: str = "training_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        self.cats_dir = self.data_dir / "cats"
        self.dogs_dir = self.data_dir / "dogs"
        self.cats_dir.mkdir(exist_ok=True)
        self.dogs_dir.mkdir(exist_ok=True)
        
        # Metadata storage
        self.metadata_file = self.data_dir / "dataset_metadata.json"
        self.metadata = self.load_metadata()
        
        # API configurations
        self.apis = {
            "unsplash": {
                "base_url": "https://api.unsplash.com/search/photos",
                "access_key": os.getenv("UNSPLASH_ACCESS_KEY", ""),
                "rate_limit": 50  # requests per hour
            },
            "pexels": {
                "base_url": "https://api.pexels.com/v1/search",
                "api_key": os.getenv("PEXELS_API_KEY", ""),
                "rate_limit": 200  # requests per hour
            }
        }
        
        # Diversity criteria for balanced dataset
        self.diversity_criteria = {
            "backgrounds": ["indoor", "outdoor", "studio", "natural", "urban"],
            "lighting": ["bright", "dim", "natural", "artificial", "dramatic"],
            "poses": ["sitting", "standing", "lying", "playing", "portrait"],
            "colors": ["black", "white", "brown", "mixed", "gray", "orange"],
            "angles": ["front", "side", "three_quarter", "close_up", "full_body"],
            "breeds": {
                "cats": ["persian", "siamese", "maine_coon", "british_shorthair", "tabby", "calico"],
                "dogs": ["golden_retriever", "german_shepherd", "bulldog", "labrador", "poodle", "mixed"]
            }
        }

    def load_metadata(self) -> Dict:
        """Load existing metadata or create new structure"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        return {
            "cats": [],
            "dogs": [],
            "total_images": 0,
            "diversity_stats": {},
            "acquisition_log": []
        }

    def save_metadata(self):
        """Save metadata to file"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)

    def get_image_hash(self, image_path: str) -> str:
        """Generate hash for image deduplication"""
        with open(image_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()

    def analyze_image_properties(self, image_path: str) -> Dict:
        """Analyze image for diversity classification"""
        try:
            img = Image.open(image_path)
            img_array = np.array(img)
            
            # Basic image properties
            properties = {
                "width": img.width,
                "height": img.height,
                "channels": len(img_array.shape),
                "file_size": os.path.getsize(image_path),
                "aspect_ratio": img.width / img.height
            }
            
            # Color analysis
            if len(img_array.shape) == 3:
                avg_brightness = np.mean(img_array)
                std_brightness = np.std(img_array)
                properties.update({
                    "brightness": float(avg_brightness),
                    "contrast": float(std_brightness),
                    "is_color": True
                })
            else:
                properties["is_color"] = False
            
            return properties
        except Exception as e:
            print(f"Error analyzing {image_path}: {e}")
            return {}

    def download_image(self, url: str, filepath: str, timeout: int = 30) -> bool:
        """Download single image with error handling"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=timeout, stream=True)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Verify image is valid
            img = Image.open(filepath)
            img.verify()
            
            # Resize if too large (max 2048px)
            img = Image.open(filepath)
            if max(img.size) > 2048:
                img.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                img.save(filepath, quality=90)
            
            return True
            
        except Exception as e:
            print(f"Failed to download {url}: {e}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return False

    def search_unsplash(self, query: str, count: int = 50) -> List[Dict]:
        """Search Unsplash for images"""
        if not self.apis["unsplash"]["access_key"]:
            print("Unsplash API key not found")
            return []
        
        headers = {
            "Authorization": f"Client-ID {self.apis['unsplash']['access_key']}"
        }
        
        images = []
        page = 1
        per_page = min(30, count)
        
        while len(images) < count and page <= 10:
            params = {
                "query": query,
                "page": page,
                "per_page": per_page,
                "orientation": "landscape"
            }
            
            try:
                response = requests.get(
                    self.apis["unsplash"]["base_url"],
                    headers=headers,
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                for result in data.get("results", []):
                    if len(images) >= count:
                        break
                    
                    images.append({
                        "url": result["urls"]["regular"],
                        "description": result.get("description", ""),
                        "alt_description": result.get("alt_description", ""),
                        "width": result["width"],
                        "height": result["height"],
                        "source": "unsplash",
                        "id": result["id"]
                    })
                
                page += 1
                time.sleep(1)  # Rate limiting
                
            except Exception as e:
                print(f"Unsplash search error: {e}")
                break
        
        return images

    def search_pexels(self, query: str, count: int = 50) -> List[Dict]:
        """Search Pexels for images"""
        if not self.apis["pexels"]["api_key"]:
            print("Pexels API key not found")
            return []
        
        headers = {
            "Authorization": self.apis["pexels"]["api_key"]
        }
        
        images = []
        page = 1
        per_page = min(80, count)
        
        while len(images) < count and page <= 10:
            params = {
                "query": query,
                "page": page,
                "per_page": per_page
            }
            
            try:
                response = requests.get(
                    self.apis["pexels"]["base_url"],
                    headers=headers,
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                for photo in data.get("photos", []):
                    if len(images) >= count:
                        break
                    
                    images.append({
                        "url": photo["src"]["large"],
                        "description": photo.get("alt", ""),
                        "width": photo["width"],
                        "height": photo["height"],
                        "source": "pexels",
                        "id": photo["id"]
                    })
                
                page += 1
                time.sleep(0.5)  # Rate limiting
                
            except Exception as e:
                print(f"Pexels search error: {e}")
                break
        
        return images

    def generate_diverse_queries(self, animal: str, count_per_query: int = 25) -> List[str]:
        """Generate diverse search queries for balanced dataset"""
        base_queries = [animal]
        
        # Add breed-specific queries
        breeds = self.diversity_criteria["breeds"][animal]
        base_queries.extend([f"{breed} {animal}" for breed in breeds])
        
        # Add context queries
        contexts = [
            f"{animal} portrait",
            f"{animal} playing",
            f"{animal} sitting",
            f"{animal} outdoor",
            f"{animal} indoor",
            f"cute {animal}",
            f"beautiful {animal}",
            f"{animal} close up",
            f"{animal} full body",
            f"sleeping {animal}",
        ]
        base_queries.extend(contexts)
        
        # Add color/pattern queries
        colors = ["black", "white", "brown", "gray", "orange", "tabby", "calico"]
        base_queries.extend([f"{color} {animal}" for color in colors])
        
        return base_queries

    def acquire_images_for_animal(self, animal: str, target_count: int = 250) -> List[str]:
        """Acquire diverse images for one animal type"""
        print(f"\nAcquiring {target_count} {animal} images...")
        
        queries = self.generate_diverse_queries(animal)
        images_per_query = max(1, target_count // len(queries))
        
        all_images = []
        
        # Search multiple sources
        for query in queries:
            print(f"Searching for: {query}")
            
            # Unsplash
            unsplash_images = self.search_unsplash(query, images_per_query // 2)
            all_images.extend(unsplash_images)
            
            # Pexels
            pexels_images = self.search_pexels(query, images_per_query // 2)
            all_images.extend(pexels_images)
            
            if len(all_images) >= target_count:
                break
        
        # Shuffle and limit
        random.shuffle(all_images)
        all_images = all_images[:target_count]
        
        # Download images
        downloaded_files = []
        target_dir = self.cats_dir if animal == "cats" else self.dogs_dir
        
        def download_worker(image_data):
            filename = f"{animal}_{image_data['source']}_{image_data['id']}.jpg"
            filepath = target_dir / filename
            
            if self.download_image(image_data['url'], str(filepath)):
                # Analyze properties
                properties = self.analyze_image_properties(str(filepath))
                image_hash = self.get_image_hash(str(filepath))
                
                metadata_entry = {
                    "filename": filename,
                    "filepath": str(filepath),
                    "source": image_data['source'],
                    "original_url": image_data['url'],
                    "description": image_data.get('description', ''),
                    "properties": properties,
                    "hash": image_hash,
                    "download_date": time.strftime('%Y-%m-%d %H:%M:%S')
                }
                
                return metadata_entry
            return None
        
        print(f"Downloading {len(all_images)} images...")
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_image = {
                executor.submit(download_worker, img): img for img in all_images
            }
            
            for future in as_completed(future_to_image):
                result = future.result()
                if result:
                    downloaded_files.append(result)
                    self.metadata[animal].append(result)
                    
                    if len(downloaded_files) % 10 == 0:
                        print(f"Downloaded {len(downloaded_files)}/{len(all_images)} images")
        
        print(f"Successfully downloaded {len(downloaded_files)} {animal} images")
        return [f['filepath'] for f in downloaded_files]

    def remove_duplicates(self):
        """Remove duplicate images based on hash"""
        print("Removing duplicate images...")
        
        for animal in ["cats", "dogs"]:
            seen_hashes = set()
            unique_images = []
            
            for img_data in self.metadata[animal]:
                if img_data['hash'] not in seen_hashes:
                    seen_hashes.add(img_data['hash'])
                    unique_images.append(img_data)
                else:
                    # Remove duplicate file
                    if os.path.exists(img_data['filepath']):
                        os.remove(img_data['filepath'])
                        print(f"Removed duplicate: {img_data['filename']}")
            
            self.metadata[animal] = unique_images

    def analyze_dataset_diversity(self) -> Dict:
        """Analyze dataset for diversity metrics"""
        diversity_stats = {
            "cats": {"count": len(self.metadata["cats"])},
            "dogs": {"count": len(self.metadata["dogs"])},
            "total": len(self.metadata["cats"]) + len(self.metadata["dogs"]),
            "diversity_scores": {}
        }
        
        for animal in ["cats", "dogs"]:
            images = self.metadata[animal]
            
            if not images:
                continue
            
            # Analyze properties
            brightnesses = [img['properties'].get('brightness', 0) for img in images]
            contrasts = [img['properties'].get('contrast', 0) for img in images]
            aspect_ratios = [img['properties'].get('aspect_ratio', 1) for img in images]
            
            diversity_stats[animal].update({
                "brightness_range": [min(brightnesses), max(brightnesses)],
                "brightness_std": np.std(brightnesses),
                "contrast_range": [min(contrasts), max(contrasts)],
                "contrast_std": np.std(contrasts),
                "aspect_ratio_range": [min(aspect_ratios), max(aspect_ratios)],
                "aspect_ratio_std": np.std(aspect_ratios),
                "sources": list(set(img['source'] for img in images))
            })
        
        # Calculate diversity score (0-1, higher is better)
        total_images = diversity_stats["total"]
        if total_images > 0:
            # Balance between cats and dogs
            balance_score = 1 - abs(len(self.metadata["cats"]) - len(self.metadata["dogs"])) / total_images
            
            # Diversity in properties
            all_brightnesses = []
            all_contrasts = []
            for animal in ["cats", "dogs"]:
                for img in self.metadata[animal]:
                    all_brightnesses.append(img['properties'].get('brightness', 0))
                    all_contrasts.append(img['properties'].get('contrast', 0))
            
            brightness_diversity = np.std(all_brightnesses) / 255.0  # Normalize
            contrast_diversity = min(1.0, np.std(all_contrasts) / 100.0)  # Normalize
            
            overall_diversity = (balance_score + brightness_diversity + contrast_diversity) / 3
            diversity_stats["diversity_scores"]["overall"] = overall_diversity
            diversity_stats["diversity_scores"]["balance"] = balance_score
            diversity_stats["diversity_scores"]["brightness_diversity"] = brightness_diversity
            diversity_stats["diversity_scores"]["contrast_diversity"] = contrast_diversity
        
        return diversity_stats

    def acquire_dataset(self, total_target: int = 500) -> Dict:
        """Main method to acquire complete dataset"""
        print(f"Starting dataset acquisition for {total_target} images...")
        
        cats_target = total_target // 2
        dogs_target = total_target - cats_target
        
        # Acquire cats
        cat_files = self.acquire_images_for_animal("cats", cats_target)
        
        # Acquire dogs  
        dog_files = self.acquire_images_for_animal("dogs", dogs_target)
        
        # Remove duplicates
        self.remove_duplicates()
        
        # Update total count
        self.metadata["total_images"] = len(self.metadata["cats"]) + len(self.metadata["dogs"])
        
        # Analyze diversity
        diversity_stats = self.analyze_dataset_diversity()
        self.metadata["diversity_stats"] = diversity_stats
        
        # Save metadata
        self.save_metadata()
        
        print(f"\nDataset acquisition complete!")
        print(f"Total images: {self.metadata['total_images']}")
        print(f"Cats: {len(self.metadata['cats'])}")
        print(f"Dogs: {len(self.metadata['dogs'])}")
        print(f"Diversity score: {diversity_stats['diversity_scores'].get('overall', 0):.3f}")
        
        return self.metadata

    def get_training_batches(self, batch_size: int = 20) -> List[List[str]]:
        """Create balanced batches for training"""
        all_files = []
        
        # Get all image files
        for img_data in self.metadata["cats"]:
            all_files.append(img_data["filepath"])
        for img_data in self.metadata["dogs"]:
            all_files.append(img_data["filepath"])
        
        # Shuffle for random batches
        random.shuffle(all_files)
        
        # Create batches
        batches = []
        for i in range(0, len(all_files), batch_size):
            batch = all_files[i:i + batch_size]
            batches.append(batch)
        
        return batches

    def create_test_split(self, test_ratio: float = 0.1) -> Tuple[List[str], List[str]]:
        """Split dataset into training and test sets"""
        all_files = []
        for animal in ["cats", "dogs"]:
            for img_data in self.metadata[animal]:
                all_files.append(img_data["filepath"])
        
        random.shuffle(all_files)
        split_idx = int(len(all_files) * (1 - test_ratio))
        
        train_files = all_files[:split_idx]
        test_files = all_files[split_idx:]
        
        return train_files, test_files


def main():
    """Example usage"""
    # Set API keys as environment variables:
    # export UNSPLASH_ACCESS_KEY="your_key"
    # export PEXELS_API_KEY="your_key"
    
    acquisition = DatasetAcquisition()
    
    # Acquire dataset
    metadata = acquisition.acquire_dataset(500)
    
    # Create training batches
    batches = acquisition.get_training_batches(batch_size=20)
    print(f"Created {len(batches)} training batches")
    
    # Create train/test split
    train_files, test_files = acquisition.create_test_split()
    print(f"Training set: {len(train_files)} images")
    print(f"Test set: {len(test_files)} images")


if __name__ == "__main__":
    main()
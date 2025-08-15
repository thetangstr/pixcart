#!/usr/bin/env python3
"""Create a test image for RL training"""

from PIL import Image
import numpy as np

# Create a simple test image (cat face)
img = Image.new('RGB', (512, 512), color='#f0f0f0')

# Draw simple cat features
pixels = np.array(img)

# Face circle (brown)
center_x, center_y = 256, 256
radius = 150
for i in range(512):
    for j in range(512):
        if (i - center_x)**2 + (j - center_y)**2 < radius**2:
            pixels[j, i] = [200, 150, 100]  # Brown color

# Eyes (green)
eye_positions = [(200, 200), (312, 200)]
for eye_x, eye_y in eye_positions:
    for i in range(eye_x-20, eye_x+20):
        for j in range(eye_y-15, eye_y+15):
            if 0 <= i < 512 and 0 <= j < 512:
                if (i - eye_x)**2/400 + (j - eye_y)**2/225 < 1:
                    pixels[j, i] = [50, 150, 50]  # Green

# Pupils (black)
for eye_x, eye_y in eye_positions:
    for i in range(eye_x-5, eye_x+5):
        for j in range(eye_y-8, eye_y+8):
            if 0 <= i < 512 and 0 <= j < 512:
                pixels[j, i] = [0, 0, 0]  # Black

# Nose (pink triangle)
nose_x, nose_y = 256, 280
for i in range(nose_x-15, nose_x+15):
    for j in range(nose_y-10, nose_y+10):
        if 0 <= i < 512 and 0 <= j < 512:
            if abs(i - nose_x) + abs(j - nose_y) < 15:
                pixels[j, i] = [255, 180, 200]  # Pink

# Mouth (dark line)
for i in range(220, 292):
    if 0 <= i < 512:
        pixels[300, i] = [50, 30, 20]  # Dark brown
        pixels[301, i] = [50, 30, 20]

# Ears (triangles)
ear_positions = [(150, 120), (362, 120)]
for ear_x, ear_y in ear_positions:
    for i in range(ear_x-40, ear_x+40):
        for j in range(ear_y-30, ear_y+50):
            if 0 <= i < 512 and 0 <= j < 512:
                if abs(i - ear_x) + (j - ear_y)*2 < 60 and j < ear_y + 30:
                    pixels[j, i] = [200, 150, 100]  # Brown

# Convert back to image
img = Image.fromarray(pixels.astype('uint8'))
img.save('../test-image.png')
print("Test image created: test-image.png")
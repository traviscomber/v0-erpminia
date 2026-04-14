#!/usr/bin/env python3
import requests
from PIL import Image
from io import BytesIO
import numpy as np
import os

# Create public directory if it doesn't exist
os.makedirs('/vercel/share/v0-project/public', exist_ok=True)

# Download the image
url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-OFnHBOd3ZB6psa32wK7ta8QJHf4MtJ.png"
print(f"[v0] Downloading logo from blob storage...")
response = requests.get(url)
response.raise_for_status()

# Open image
img = Image.open(BytesIO(response.content))
print(f"[v0] Image loaded: {img.size}, mode: {img.mode}")

# Convert to RGBA if not already
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# Convert to numpy array
img_array = np.array(img)

# Remove white background (threshold 240)
white_threshold = 240
mask = (img_array[:, :, 0] > white_threshold) & \
       (img_array[:, :, 1] > white_threshold) & \
       (img_array[:, :, 2] > white_threshold)

# Set alpha channel to 0 for near-white pixels
img_array[mask, 3] = 0

# Create new image with transparent background
result = Image.fromarray(img_array, 'RGBA')

# Save to file
output_path = '/vercel/share/v0-project/public/lapatagua-logo.png'
result.save(output_path)
print(f"✓ Logo saved with transparent background: {output_path}")
print(f"✓ Image size: {result.size}")
print(f"✓ Format: RGBA PNG")

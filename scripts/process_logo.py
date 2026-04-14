import requests
from PIL import Image
import io
import numpy as np

# Download the image
url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-OFnHBOd3ZB6psa32wK7ta8QJHf4MtJ.png"
response = requests.get(url)
img = Image.open(io.BytesIO(response.content))

# Convert to RGBA if not already
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# Convert to numpy array
img_array = np.array(img)

# Define the background color (likely white or light color)
# We'll remove near-white pixels
white_threshold = 240
mask = (img_array[:, :, 0] > white_threshold) & \
       (img_array[:, :, 1] > white_threshold) & \
       (img_array[:, :, 2] > white_threshold)

# Set alpha channel to 0 for near-white pixels
img_array[mask, 3] = 0

# Create new image with transparent background
result = Image.fromarray(img_array, 'RGBA')

# Save to file
result.save('/vercel/share/v0-project/public/lapatagua-logo.png')
print("Logo with transparent background saved successfully!")
print(f"Image size: {result.size}")
print(f"Image mode: {result.mode}")

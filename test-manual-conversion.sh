#!/bin/bash

# Test manual conversion with ComfyUI

echo "Testing oil painting conversion..."

# Use a test image
TEST_IMAGE="/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/input/test-image.png"

if [ ! -f "$TEST_IMAGE" ]; then
    echo "Test image not found at $TEST_IMAGE"
    exit 1
fi

# Create form data with image and style
curl -X POST http://localhost:5174/api/convert-dual/ \
  -F "image=@$TEST_IMAGE" \
  -F "style=classic_portrait" \
  -F "backend=comfyui" \
  -o test-result.json \
  -w "\nHTTP Status: %{http_code}\n"

echo "Response saved to test-result.json"

# Check if successful
if [ -f test-result.json ]; then
    # Check for success field
    if grep -q '"success":true' test-result.json; then
        echo "✅ Conversion successful!"
    else
        echo "❌ Conversion failed:"
        cat test-result.json | jq '.'
    fi
fi
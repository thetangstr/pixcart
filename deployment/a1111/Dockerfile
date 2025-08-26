# Multi-stage Dockerfile for Automatic1111 Stable Diffusion WebUI
# Optimized for Google Cloud Run with GPU support (NVIDIA L4)

# Stage 1: Model downloader
FROM python:3.10-slim as model-downloader

RUN apt-get update && apt-get install -y \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /models

# Download Stable Diffusion v1.5 model
RUN wget -O sd_v15.safetensors "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned.safetensors"

# Download VAE for better image quality
RUN wget -O vae.safetensors "https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors"

# Stage 2: Main application
FROM nvidia/cuda:11.8-devel-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV TORCH_CUDA_ARCH_LIST="8.6"
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=$CUDA_HOME/bin:$PATH
ENV LD_LIBRARY_PATH=$CUDA_HOME/lib64:$LD_LIBRARY_PATH

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    wget \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgoogle-perftools4 \
    libtcmalloc-minimal4 \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Clone Automatic1111 repository
RUN git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git . && \
    git checkout v1.7.0

# Create virtual environment
RUN python3 -m venv venv
ENV PATH="/app/venv/bin:$PATH"

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install PyTorch with CUDA support
RUN pip install --no-cache-dir torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 \
    --index-url https://download.pytorch.org/whl/cu118

# Install other required packages
RUN pip install --no-cache-dir \
    xformers==0.0.20 \
    accelerate \
    transformers \
    diffusers \
    safetensors \
    omegaconf \
    pillow \
    requests \
    tqdm \
    opencv-python-headless \
    numpy \
    gradio \
    fastapi \
    uvicorn

# Copy models from previous stage
COPY --from=model-downloader /models/sd_v15.safetensors /app/models/Stable-diffusion/
COPY --from=model-downloader /models/vae.safetensors /app/models/VAE/

# Create necessary directories
RUN mkdir -p /app/outputs /app/cache /app/temp

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting Automatic1111 WebUI in API-only mode..."

# Set memory optimization flags
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export CUDA_LAUNCH_BLOCKING=0

# Configure for Cloud Run
export GRADIO_SERVER_NAME=0.0.0.0
export GRADIO_SERVER_PORT=${PORT:-8080}

# Start the webui with optimized settings for Cloud Run
python3 launch.py \
    --api \
    --api-only \
    --listen \
    --port ${PORT:-8080} \
    --host 0.0.0.0 \
    --enable-insecure-extension-access \
    --cors-allow-origins="*" \
    --cors-allow-methods="*" \
    --cors-allow-headers="*" \
    --skip-torch-cuda-test \
    --no-half-vae \
    --no-download-sd-model \
    --use-cpu interrogate \
    --api-log \
    --disable-console-progressbars \
    --disable-safe-unpickle \
    --xformers \
    --opt-split-attention \
    --medvram \
    --always-batch-cond-uncond \
    --enable-console-prompts
EOF

RUN chmod +x /app/start.sh

# Create config file for optimization
RUN cat > /app/config.json << 'EOF'
{
    "samples_save": false,
    "samples_format": "png",
    "samples_filename_pattern": "",
    "save_images_add_number": true,
    "grid_save": false,
    "grid_format": "png",
    "grid_extended_filename": false,
    "grid_only_if_multiple": true,
    "grid_prevent_empty_spots": false,
    "n_rows": -1,
    "enable_pnginfo": false,
    "save_txt": false,
    "save_images_before_face_restoration": false,
    "save_images_before_highres_fix": false,
    "save_images_before_color_correction": false,
    "jpeg_quality": 80,
    "webp_lossless": false,
    "export_for_4chan": true,
    "img_downscale_threshold": 4.0,
    "target_side_length": 4000,
    "img_max_size_mp": 200,
    "use_original_name_batch": true,
    "use_upscaler_name_as_suffix": false,
    "save_selected_only": true,
    "do_not_add_watermark": false,
    "temp_dir": "",
    "clean_temp_dir_at_start": false,
    "outdir_samples": "",
    "outdir_txt2img_samples": "/app/outputs/txt2img-images",
    "outdir_img2img_samples": "/app/outputs/img2img-images",
    "outdir_extras_samples": "/app/outputs/extras-images",
    "outdir_grids": "/app/outputs/txt2img-grids",
    "outdir_txt2img_grids": "/app/outputs/txt2img-grids",
    "outdir_save": "/app/outputs/saved"
}
EOF

# Health check script
RUN cat > /app/healthcheck.py << 'EOF'
#!/usr/bin/env python3
import requests
import sys
import os

def health_check():
    try:
        port = os.environ.get('PORT', '8080')
        response = requests.get(f'http://localhost:{port}/sdapi/v1/options', timeout=10)
        if response.status_code == 200:
            print("Health check passed")
            return 0
        else:
            print(f"Health check failed with status {response.status_code}")
            return 1
    except Exception as e:
        print(f"Health check failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(health_check())
EOF

RUN chmod +x /app/healthcheck.py

# Set proper permissions
RUN chown -R 1000:1000 /app
USER 1000

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python3 /app/healthcheck.py

# Default command
CMD ["/app/start.sh"]
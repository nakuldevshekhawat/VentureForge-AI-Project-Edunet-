# Use official lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install basic system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY . .

# Expose port 8000 (Koyeb and Render default port)
EXPOSE 8000

# Run the Flask app using Gunicorn on port 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]

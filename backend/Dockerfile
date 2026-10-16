FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy English model
RUN python -m spacy download en_core_web_sm

# Copy application files and models
COPY . .

ENV PORT=5000
ENV FLASK_ENV=production
ENV FLASK_DEBUG=false

EXPOSE 5000

# Start with uvicorn (1 worker, 120s timeout for model stability)
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-5000} --workers 1 --timeout-keep-alive 120"]

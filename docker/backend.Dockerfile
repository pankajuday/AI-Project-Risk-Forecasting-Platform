FROM python:3.12-slim

WORKDIR /app

# Copy requirements first to leverage Docker layer caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 --retries 10 -r requirements.txt

# Copy the rest of the backend files
COPY backend/ .

EXPOSE 3000

CMD ["python", "app/main.py"]
FROM node:22-alpine

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY frontend/package*.json ./
RUN npm config set fetch-retries 10 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci

# Copy the rest of the frontend files
COPY frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
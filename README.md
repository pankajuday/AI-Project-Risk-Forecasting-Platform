#  AI-Driven Enterprise Project Intelligence & Risk Management Platform

**An Advanced Platform for Comprehensive Predictive Risk Analysis using LLMs and Structured Data.**

[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Status](https://img.shields.io/badge/Status-In%20Development-blue?style=flat-square)](#)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](#backend)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](#backend)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)](#backend)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](#frontend)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](#frontend)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](#database)
[![Qdrant](https://img.shields.io/badge/Qdrant-DC244C?style=flat-square&logo=qdrant&logoColor=white)](#vector-database)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](#deployment)
<!-- [![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](#infrastructure) --> 

##  Overview

The AI Risk Forecasting System is a full-stack application designed to automate and enhance the process of enterprise risk assessment. By combining large language models (LLMs) with structured document processing, data ingestion pipelines, and advanced analytical models, the platform allows users to upload various forms of risk-related documentation (PDFs, DOCX, XLSX, etc.) and receive comprehensive, contextualized, and predictive risk forecasts.

It moves beyond simple data aggregation by performing deep document understanding, identifying critical linkages, and generating actionable insights and reports.

##  Key Features

*   **Intelligent Document Ingestion:** Supports multiple file formats including `.docx`, `.pdf`, `.xlsx`, and `.csv`.
*   **Multi-Modal Data Processing:** Integrates advanced parsers for handling text, structured tables, and key-value data from various sources.
*   **Generative AI Analysis (LLM-Powered):** Uses Retrieval-Augmented Generation (RAG) techniques to ground analytical responses in the uploaded corporate documentation, ensuring accuracy and contextuality.
*   **Stateful Project Management:** Organizes analyses into distinct, trackable `Projects`, managing the full lifecycle from upload to final report generation.
*   **Risk Scoring & Health Metrics:** Generates quantitative and qualitative risk scores, visualizing the current health status of the monitored entity.
*   **Automated Reporting:** Creates highly detailed reports, including summarized findings, identified risks, and predicted trends.

##  Architecture

The system follows a modern distributed architecture, decoupled into a robust backend API and a responsive frontend user interface.

###  Frontend (`frontend`)
Built with **React** and **Vite**, the UI layer provides a rich, intuitive user experience. It handles user interactions, file uploads, and visualization of complex analytical outputs.
*   **Dependencies:** `react-markdown`, `papaparse`, `html2pdf.js`, etc.
*   **API Endpoint:** Communicates with the backend API at `http://127.0.0.1:3000`.

###  Backend (`backend`)
The core intelligence layer, built with **Python** (using libraries like LangChain, Beanie, FastAPI).
*   **Data Modeling:** Uses Pydantic and Beanie for robust database interaction and project management (`Project` model).
*   **Ingestion Pipeline:** Manages the workflow (Upload -> Indexing -> Analysis) for all uploaded content.
*   **API Functions:** Exposes controlled endpoints for document submission, project status querying, and fetching analytical results.

##  Getting Started

Please follow the setup steps for both the backend and the frontend in sequence.

###  Prerequisites

*   Node.js and npm (for the `frontend`)
*   Python 3.10+ (for the `backend`)
*   A local database instance (e.g., MongoDB, as indicated by the `beanie` dependency).

###  1. Backend Setup (Python)

The backend handles data ingestion, AI processing, and data persistence.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Set Environment Variables:**
    Create or update the `.env` file in the `backend` directory with necessary credentials (e.g., database URI, API keys).

    > **Example `.env` file: for backend**  
    ```bash
    # MOngodb Configurations
    MONGODB_URI=mongodb://localhost:27017
    DB_NAME=ai_intelligence_risk_advisor

    # Docling Configurations
    HF_TOKEN=add-hf-token
    DOCLING_SERVE_ALLOW_EXTERNAL_PLUGINS=true
    TORCH_COMPILE_DISABLE=1
    TORCHINDUCTOR_DISABLE=1


    # LLM Configurations
    GOOGLE_API_KEY=add-gemini-api-key
    EMBED_MODEL=gemini-embedding-001
    LLM_MODEL=gemini-3.5-flash
    NVIDIA_API_KEY= #optional, if you use nvidia model then add key

    #Qdrant End-Poin
    QDRANT_URL=http://localhost:6333

    # Backend Configurations
    BACKEND_HOST=127.0.0.1
    BACKEND_PORT=3000
    BACKEND_RELOAD=True
    API_ORIGIN=http://127.0.0.1:5173
    MAX_UPLOAD_SIZE_MB=50

    # JWT Configurations
    JWT_SECRET_KEY=add-32-bit-secret-key
    JWT_ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=10080


    # S3 Configurations
    S3_ENDPOINT=http://127.0.0.1:9000
    S3_ACCESS_KEY=minioadmin
    S3_SECRET_KEY=your-password
    S3_REGION=us-east-1
    S3_BUCKET=documents
    ```

4.  **Run the Server:**
    ```bash
    # Assuming standard Uvicorn/FastAPI setup
    python ./backend/app/main.py
    ```
    *The API should now be available at `http://127.0.0.1:3000`.*

###  2. Frontend Setup (frontend)

The frontend provides the user interface for interaction.

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3. **Configure API Endpoint:**
    Update the `.env` file in the `frontend` directory to point to the backend API.

    > **Example `.env` file: for frontend**  
    ```bash
    VITE_API_URL=http://127.0.0.1:3000
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    *The UI should open in your browser at `http://localhost:5173` (or similar port).*

### 3. Docker `(.env)`

1.  **Navigate to the docker directory:**
    ```bash
    cd docker
    ```

2.  **Set Environment Variables:**
    Create or update the `.env` file in the `docker` directory with the required MinIO root credentials.

    > **Example `docker/.env` file:**
    ```bash
    MINIO_ROOT_USER=admin
    MINIO_ROOT_PASSWORD=password123
    ```

3.  **Start Docker services:**
    From the `docker` directory, run:
    ```bash
    docker compose up -d
    ```

4.  **Verify containers are running:**
    ```bash
    docker compose ps
    ```

5.  **Check service logs (optional):**
    ```bash
    docker compose logs -f
    ```

6.  **Stop Docker services:**
    ```bash
    docker compose down
    ```

> If your Docker installation uses the older command format, replace `docker compose` with `docker-compose`.

##  Project Structure
[View Diagram ![](https://app.eraser.io/workspace/p9tkWhTL1ysH2TttsEm3/preview?diagram=hDr5Dfrq_i9HMusRR7pd&type=embed)](https://app.eraser.io/workspace/p9tkWhTL1ysH2TttsEm3?diagram=hDr5Dfrq_i9HMusRR7pd)
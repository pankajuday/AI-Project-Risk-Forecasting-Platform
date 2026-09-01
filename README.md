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

- **Multi-Modal Document Processing:** Parses `.docx`, `.pdf`, `.xlsx`, and `.csv` using Docling.
- **RAG-Grounded Analysis:** Embeds corporate documentation to ensure LLM risk forecasts are strictly tied to enterprise context.
- **LangGraph Multi-Agent Pipeline:** Coordinates discrete agents for Scope extraction, Risk identification, Health scoring, and Document generation.
- **Risk Lifecycle & Cross-Run Identity:** Deterministically tracks risks across analysis runs. Risks have a stable identity (via fingerprinting and token similarity), allowing tracking of status, ownership, due dates, and an immutable event history (new, escalated, stale, auto-resolved).
- **Interactive Grounded Chat:** Ask questions about the project, powered by the Qdrant vector database and Gemini 3.5 Flash Lite.
- **Automated Deliverable Generation:** Automatically detects and generates missing canonical documents (Executive Summary, User Stories, Risk Register, Sprint Plan).

##  Architecture

The system follows a modern microservice-like architecture, decoupled into a robust backend API and a responsive frontend user interface.

###  Frontend (`frontend`)
Built with **React** and **Vite**, the UI layer provides a rich, intuitive user experience. It handles user interactions, file uploads, and visualization of complex analytical outputs.
*   **Dependencies:** `react-markdown`, `papaparse`, `html2pdf.js`, etc.
*   **API Endpoint:** Communicates with the backend API at `http://127.0.0.1:3000/v1/api`.

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
    MONGODB_URI=mongodb://localhost:27017
    DB_NAME=ai_intelligence_risk_advisor
    HF_TOKEN=your_huggingface_token_here 
    GOOGLE_API_KEY=your_google_api_key_here
    LLM_MODEL=gemini-3.5-flash-lite # you can change this to your preferred LLM model
    NVIDIA_API_KEY=your_nvidia_api_key_here # optional, only if using NVIDIA APIs
    DOCLING_SERVE_ALLOW_EXTERNAL_PLUGINS=true
    TORCH_COMPILE_DISABLE=1
    TORCHINDUCTOR_DISABLE=1
    QDRANT_URL=http://localhost:6333
    BACKEND_HOST=127.0.0.1
    BACKEND_PORT=3000
    BACKEND_RELOAD=True
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
    VITE_API_URL=http://127.0.0.1:3000/v1/api
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    *The UI should open in your browser at `http://localhost:5173` (or similar port).*

##  Project Structure
[View Diagram ![](https://app.eraser.io/workspace/p9tkWhTL1ysH2TttsEm3/preview?diagram=hDr5Dfrq_i9HMusRR7pd&type=embed)](https://app.eraser.io/workspace/p9tkWhTL1ysH2TttsEm3?diagram=hDr5Dfrq_i9HMusRR7pd)
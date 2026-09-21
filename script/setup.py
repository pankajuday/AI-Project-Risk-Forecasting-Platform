"""
AI Project Risk Forecasting Platform
Development workspace setup script.

Usage:
    python setup.py
"""

from __future__ import annotations

import os
import platform
import subprocess
import sys
from pathlib import Path



# Configuration


ROOT_DIR = Path(__file__).resolve().parent.parent
print(ROOT_DIR)

BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

VENV_DIR = BACKEND_DIR / ".venv"
REQUIREMENTS_FILE = BACKEND_DIR / "requirements.txt"

BACKEND_ENV = BACKEND_DIR / ".env"
FRONTEND_ENV = FRONTEND_DIR / ".env"

PYTHON_MIN_VERSION = (3, 10)


ENABLE_COLORS = sys.stdout.isatty()

RESET = "\033[0m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"


def colorize(text: str, color: str) -> str:
    if not ENABLE_COLORS:
        return text

    return f"{color}{text}{RESET}"



# Output helpers


def info(message: str) -> None:
    print(f"\n{colorize('[SETUP]', CYAN)} {message}")


def success(message: str) -> None:
    print(f"{colorize('[OK]', GREEN)} {message}")


def warning(message: str) -> None:
    print(f"{colorize('[WARN]', YELLOW)} {message}")


def error(message: str) -> None:
    print(f"{colorize('[ERROR]', RED)} {message}")



# Command helpers


def command_exists(command: str) -> bool:
    """Return True when a command is available on PATH."""
    executable = "where" if platform.system() == "Windows" else "which"

    result = subprocess.run(
        [executable, command],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )

    return result.returncode == 0


def get_npm_command() -> str:
    """Return the npm executable name for the current platform."""
    return "npm.cmd" if platform.system() == "Windows" else "npm"


def run_command(command: list[str], *, cwd: Path | None = None) -> None:
    """Run a command and stop setup if it fails."""
    try:
        subprocess.run(
            command,
            cwd=cwd,
            check=True,
        )
    except FileNotFoundError:
        error(f"Command not found: {command[0]}")
        sys.exit(1)
    except subprocess.CalledProcessError as exc:
        error(
            f"Command failed with exit code {exc.returncode}: "
            f"{' '.join(command)}"
        )
        sys.exit(exc.returncode or 1)



# Validation


def check_python_version() -> None:
    """Ensure the current Python version is supported."""
    info("Checking Python version...")

    current = sys.version_info[:2]

    if current < PYTHON_MIN_VERSION:
        error(
            f"Python {PYTHON_MIN_VERSION[0]}.{PYTHON_MIN_VERSION[1]}+ is required. "
            f"Detected Python {current[0]}.{current[1]}."
        )
        sys.exit(1)

    success(
        f"Python {current[0]}.{current[1]} detected."
    )


def check_project_structure() -> None:
    """Ensure required project files/directories exist."""
    info("Checking project structure...")

    required_paths = [
        BACKEND_DIR,
        FRONTEND_DIR,
        REQUIREMENTS_FILE,
    ]

    for path in required_paths:
        if not path.exists():
            error(f"Required path not found: {path.relative_to(ROOT_DIR)}")
            sys.exit(1)

    success("Project structure looks correct.")


def check_node() -> None:
    """Ensure Node.js and npm are available."""
    info("Checking Node.js and npm...")

    if not command_exists("node"):
        error(
            "Node.js is not installed or is not available on PATH.\n"
            "Install Node.js LTS and run this script again."
        )
        sys.exit(1)

    if not command_exists("npm"):
        error(
            "npm is not installed or is not available on PATH."
        )
        sys.exit(1)

    run_command(["node", "--version"])
    run_command([get_npm_command(), "--version"])

    success("Node.js and npm are available.")



# Backend setup


def get_venv_python() -> Path:
    """Return the Python executable inside the virtual environment."""
    if platform.system() == "Windows":
        return VENV_DIR / "Scripts" / "python.exe"

    return VENV_DIR / "bin" / "python"


def create_virtual_environment() -> None:
    """Create the backend virtual environment when missing."""
    info("Setting up Python virtual environment...")

    if VENV_DIR.exists():
        success("backend/.venv already exists.")
        return

    run_command(
        [
            sys.executable,
            "-m",
            "venv",
            str(VENV_DIR),
        ]
    )

    success("Created backend/.venv.")


def install_backend_dependencies() -> None:
    """Install Python dependencies from requirements.txt."""
    info("Installing backend dependencies...")

    python = get_venv_python()

    if not python.exists():
        error("Virtual environment Python executable was not created.")
        sys.exit(1)

    run_command(
        [
            str(python),
            "-m",
            "pip",
            "install",
            "--upgrade",
            "pip",
        ]
    )

    run_command(
        [
            str(python),
            "-m",
            "pip",
            "install",
            "-r",
            str(REQUIREMENTS_FILE),
        ]
    )

    success("Backend dependencies installed.")



# Environment files


def create_backend_env() -> None:
    """
    Create backend/.env when it does not exist.

    Existing .env files are never overwritten.
    """
    if BACKEND_ENV.exists():
        success("backend/.env already exists. Keeping existing file.")
        return

    content = """
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
LLM_MODEL=gemini-3.5-flash-flash
NVIDIA_API_KEY= #optional, if you use nvidia model then add key

#Qdrant End-Poin
QDRANT_URL=http://localhost:6333

# Backend configurations
BACKEND_HOST=127.0.0.1
BACKEND_PORT=3000
BACKEND_RELOAD=True
API_ORIGIN=http://127.0.0.1:5173
MAX_UPLOAD_SIZE_MB=50


# JWT Configurations
JWT_SECRET_KEY=add-32-bit-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080


# S3 / MinIO Configurations
# For MinIO (local/self-hosted): set S3_ENDPOINT to the MinIO address
# For AWS S3: leave S3_ENDPOINT empty and use real IAM credentials
S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY=admin
S3_SECRET_KEY=password123
S3_REGION=world
S3_BUCKET=ai_intelligence_risk_advisor
"""

    BACKEND_ENV.write_text(
        content,
        encoding="utf-8",
    )

    success("Created backend/.env.")


def create_frontend_env() -> None:
    """
    Create frontend/.env when it does not exist.

    Existing .env files are never overwritten.
    """
    if FRONTEND_ENV.exists():
        success("frontend/.env already exists. Keeping existing file.")
        return

    content = """VITE_API_URL=http://127.0.0.1:3000/v1/api"""

    FRONTEND_ENV.write_text(
        content,
        encoding="utf-8",
    )

    success("Created frontend/.env.")



# Frontend setup


def install_frontend_dependencies() -> None:
    """Install frontend dependencies using npm."""
    info("Installing frontend dependencies...")

    npm_command = get_npm_command()

    package_json = FRONTEND_DIR / "package.json"

    if not package_json.exists():
        error("frontend/package.json not found.")
        sys.exit(1)

    package_lock = FRONTEND_DIR / "package-lock.json"

    if package_lock.exists():
        # npm ci provides reproducible installs when package-lock exists.
        run_command(
            [npm_command, "ci"],
            cwd=FRONTEND_DIR,
        )
    else:
        warning(
            "package-lock.json not found. Falling back to npm install."
        )

        run_command(
            [npm_command, "install"],
            cwd=FRONTEND_DIR,
        )

    success("Frontend dependencies installed.")



# Final output


def print_next_steps() -> None:
    """Display useful commands after setup."""
    if platform.system() == "Windows":
        activate_command = r"backend\.venv\Scripts\activate"
    else:
        activate_command = "source backend/.venv/bin/activate"

    print()
    print("=" * 65)
    print("Workspace setup completed successfully.")
    print("=" * 65)

    print("\nBackend:")
    print(f"  Activate virtual environment:")
    print(f"    {activate_command}")

    print("\n  Run backend:")
    print("    python backend/app/main.py")

    print("\nFrontend:")
    print("  cd frontend")
    print("  npm run dev")

    print("\nEnvironment files:")
    print("  backend/.env")
    print("  frontend/.env")

    print("\nImportant:")
    print("  Update backend/.env with your API keys before using AI features.")

    print()



# Main


def main() -> None:
    print("=" * 65)
    print("AI Project Risk Forecasting Platform")
    print("Development Workspace Setup")
    print("=" * 65)

    check_python_version()
    check_project_structure()
    check_node()

    create_virtual_environment()
    install_backend_dependencies()

    create_backend_env()
    create_frontend_env()

    install_frontend_dependencies()

    print_next_steps()


if __name__ == "__main__":
    main()
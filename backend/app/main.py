import sys
import os
import uvicorn

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", 3000))
    reload = os.getenv("BACKEND_RELOAD", "True").lower() == "true"
    uvicorn.run("app:app", port=port, host=host, reload=reload)

if __name__ == "__main__":
    main()
import sys
import os
import uvicorn

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    uvicorn.run("app:app", port=3000, host="127.0.0.1", reload=True)

if __name__ == "__main__":
    main()
@echo off
echo Starting Saarthi AI...
start cmd /k "cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"
timeout /t 3
start cmd /k "npm install && npm run dev"
echo Both servers starting. Visit http://localhost:5173

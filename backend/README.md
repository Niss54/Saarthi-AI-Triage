# Saarthi AI Backend

FastAPI service for the Saarthi AI frontend.

## Quick start
1. Create and activate a virtual environment.
2. Install dependencies:

```
pip install -r requirements.txt
```

3. Copy .env.example to .env and adjust if needed.
4. Run:

```
uvicorn app.main:app --reload --port 8000
```

## Endpoints
- POST /api/triage
- GET /api/queue
- POST /api/queue/add
- GET /api/departments
- GET /api/stats
- GET /api/insights
- GET /api/feed
- GET /health

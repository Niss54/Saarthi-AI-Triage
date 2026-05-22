import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import ActivityFeedItem, Department, Insight, QueueItem, StatsData, TriageInput, TriageResult
from .store import InMemoryStore

load_dotenv()

app = FastAPI(title='Saarthi AI Backend', version='0.1.0')
store = InMemoryStore()


def _get_origins() -> List[str]:
    origins_env = os.getenv('CORS_ORIGINS', '')
    if not origins_env:
        return ['*']
    origins = [origin.strip() for origin in origins_env.split(',') if origin.strip()]
    return origins or ['*']


origins = _get_origins()
allow_credentials = False if '*' in origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}


@app.post('/api/triage', response_model=TriageResult)
def triage(payload: TriageInput) -> TriageResult:
    return store.triage_patient(payload)


@app.get('/api/queue', response_model=List[QueueItem])
def get_queue() -> List[QueueItem]:
    return store.get_queue()


@app.post('/api/queue/add', response_model=QueueItem)
def add_simulated_patient() -> QueueItem:
    return store.add_simulated_patient()


@app.get('/api/departments', response_model=List[Department])
def get_departments() -> List[Department]:
    return store.get_departments()


@app.get('/api/stats', response_model=StatsData)
def get_stats() -> StatsData:
    return store.get_stats()


@app.get('/api/insights', response_model=List[Insight])
def get_insights() -> List[Insight]:
    return store.get_insights()


@app.get('/api/feed', response_model=List[ActivityFeedItem])
def get_feed() -> List[ActivityFeedItem]:
    return store.get_feed()

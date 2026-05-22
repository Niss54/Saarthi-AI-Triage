import asyncio
import json
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Body, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .models import ActivityFeedItem, Department, Insight, QueueAddRequest, QueueItem, StatsData, TriageInput, TriageResponse
from .store import InMemoryStore
from .triage_engine import get_insights, get_triage

load_dotenv()

app = FastAPI(title='Saarthi AI Backend', version='0.2.0')
store = InMemoryStore()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def send_json(self, websocket: WebSocket, payload: dict) -> None:
        await websocket.send_json(payload)

    async def broadcast(self, payload: dict) -> None:
        for websocket in list(self.active_connections):
            try:
                await websocket.send_json(payload)
            except Exception:
                self.active_connections.discard(websocket)


manager = ConnectionManager()


def _queue_payload() -> dict:
    return {'queue': [item.model_dump(by_alias=True) for item in store.get_queue()]}


async def _status_update_loop() -> None:
    while app.state.running:
        store.advance_random_statuses()
        await asyncio.sleep(30)


async def _broadcast_loop() -> None:
    while app.state.running:
        if manager.active_connections:
            await manager.broadcast(_queue_payload())
        await asyncio.sleep(5)


@app.on_event('startup')
async def on_startup() -> None:
    store.seed_queue()
    app.state.running = True
    app.state.status_task = asyncio.create_task(_status_update_loop())
    app.state.broadcast_task = asyncio.create_task(_broadcast_loop())


@app.on_event('shutdown')
async def on_shutdown() -> None:
    app.state.running = False
    for task_name in ('status_task', 'broadcast_task'):
        task = getattr(app.state, task_name, None)
        if task:
            task.cancel()


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}


@app.post('/api/triage', response_model=TriageResponse, response_model_by_alias=True)
def triage(payload: TriageInput) -> TriageResponse:
    triage_data = get_triage(payload.model_dump(by_alias=True))
    return store.triage_patient(payload, triage_data)


@app.get('/api/queue', response_model=List[QueueItem], response_model_by_alias=True)
def get_queue() -> List[QueueItem]:
    return store.get_queue()


@app.post('/api/queue/add', response_model=QueueItem, response_model_by_alias=True)
def add_patient(payload: Optional[QueueAddRequest] = Body(default=None)) -> QueueItem:
    return store.add_patient(payload)


@app.get('/api/departments', response_model=List[Department], response_model_by_alias=True)
def get_departments() -> List[Department]:
    return store.get_departments()


@app.get('/api/stats', response_model=StatsData, response_model_by_alias=True)
def get_stats() -> StatsData:
    return store.get_stats()


@app.get('/api/insights', response_model=List[Insight], response_model_by_alias=True)
def insights() -> List[Insight]:
    queue_snapshot = store.get_queue_snapshot()
    return get_insights(queue_snapshot)


@app.get('/api/feed', response_model=List[ActivityFeedItem], response_model_by_alias=True)
def feed() -> List[ActivityFeedItem]:
    return store.get_feed()


@app.websocket('/ws/queue')
async def ws_queue(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    await manager.send_json(websocket, _queue_payload())
    try:
        while True:
            message = await websocket.receive_text()
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                continue
            if data.get('action') == 'add_patient':
                store.add_patient(None)
                await manager.broadcast(_queue_payload())
    except WebSocketDisconnect:
        manager.disconnect(websocket)

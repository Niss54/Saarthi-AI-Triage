import random
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from threading import Lock
from typing import Dict, List, Optional

from .mock_data import (
    mock_departments,
    mock_queue,
    mock_stats,
    random_complaints,
    random_names,
)
from .models import (
    ActivityFeedItem,
    Department,
    QueueAddRequest,
    QueueItem,
    StatsData,
    TriageInput,
    TriageResponse,
)

STATUS_FLOW = ['waiting', 'called', 'in-consultation', 'done']


@dataclass
class QueueRecord:
    item: QueueItem
    arrival_order: int


class InMemoryStore:
    def __init__(self) -> None:
        self.lock = Lock()
        self.queue_records: List[QueueRecord] = []
        self.departments: List[Department] = [Department(**item) for item in mock_departments]
        self.feed: List[ActivityFeedItem] = []
        self.total_today = 0
        self.queue_position_counter = 0
        self.arrival_counter = 0
        self.stats = StatsData(
            totalToday=0,
            avgWaitTime=0,
            criticalCount=0,
            activeDepartments=0,
            lastUpdated=self._now_timestamp(),
        )

    def _now_time(self) -> str:
        return datetime.now().strftime('%I:%M %p')

    def _now_timestamp(self) -> str:
        return datetime.now().isoformat(timespec='seconds')

    def _generate_token(self) -> str:
        return f'APL-{random.randint(1000, 9999)}'

    def seed_queue(self) -> None:
        with self.lock:
            self.queue_records = []
            self.arrival_counter = 0
            for item in mock_queue[:15]:
                self.arrival_counter += 1
                queue_item = QueueItem(**item)
                self.queue_records.append(QueueRecord(queue_item, self.arrival_counter))
            self.queue_position_counter = len(self.queue_records)
            self.total_today = max(mock_stats.get('totalToday', 0), len(self.queue_records))
            self._recalculate_departments()
            self._recalculate_stats()
            self._seed_feed_from_queue()

    def _seed_feed_from_queue(self) -> None:
        self.feed = []
        for record in self.queue_records[:10]:
            self._add_feed_item(record.item)

    def _ensure_department(self, name: str) -> None:
        if any(dept.name == name for dept in self.departments):
            return
        self.departments.append(
            Department(
                name=name,
                patientCount=0,
                avgWaitMinutes=0,
                capacity=40,
                status='normal',
            )
        )

    def _calculate_status(self, name: str, count: int, capacity: int, emergency_critical: bool) -> str:
        if name == 'Emergency' and emergency_critical:
            return 'critical'
        ratio = count / max(capacity, 1)
        if ratio >= 0.9:
            return 'critical'
        if ratio >= 0.7:
            return 'busy'
        return 'normal'

    def _recalculate_departments(self) -> None:
        counts = Counter(record.item.department for record in self.queue_records)
        wait_times = defaultdict(list)
        for record in self.queue_records:
            wait_times[record.item.department].append(record.item.waitTime)

        for dept_name in counts.keys():
            self._ensure_department(dept_name)

        emergency_critical = any(
            record.item.department == 'Emergency' and record.item.triageLevel == 'critical'
            for record in self.queue_records
        )

        updated_departments = []
        for dept in self.departments:
            count = counts.get(dept.name, 0)
            waits = wait_times.get(dept.name, [])
            avg_wait = int(round(sum(waits) / len(waits))) if waits else 0
            status = self._calculate_status(dept.name, count, dept.capacity, emergency_critical)
            updated_departments.append(
                dept.model_copy(
                    update={
                        'patientCount': count,
                        'avgWaitMinutes': avg_wait,
                        'status': status,
                    }
                )
            )
        self.departments = updated_departments

    def _recalculate_stats(self) -> None:
        if self.queue_records:
            avg_wait = int(round(sum(record.item.waitTime for record in self.queue_records) / len(self.queue_records)))
        else:
            avg_wait = 0
        critical_count = sum(1 for record in self.queue_records if record.item.triageLevel == 'critical')
        active_departments = len({record.item.department for record in self.queue_records})
        self.stats = self.stats.model_copy(
            update={
                'totalToday': self.total_today,
                'avgWaitTime': avg_wait,
                'criticalCount': critical_count,
                'activeDepartments': active_departments,
                'lastUpdated': self._now_timestamp(),
            }
        )

    def _add_feed_item(self, item: QueueItem) -> None:
        feed_item = ActivityFeedItem(
            time=self._now_time(),
            token=item.token,
            name=item.name,
            triageLevel=item.triageLevel,
            department=item.department,
        )
        self.feed.insert(0, feed_item)
        self.feed = self.feed[:10]

    def _arrival_sort_key(self, record: QueueRecord) -> tuple:
        triage_weight = {'critical': 0, 'moderate': 1, 'mild': 2}
        return (triage_weight.get(record.item.triageLevel, 3), record.arrival_order)

    def get_queue(self) -> List[QueueItem]:
        sorted_records = sorted(self.queue_records, key=self._arrival_sort_key)
        return [record.item for record in sorted_records]

    def get_queue_snapshot(self) -> List[Dict[str, object]]:
        return [item.model_dump(by_alias=True) for item in self.get_queue()]

    def get_departments(self) -> List[Department]:
        return list(self.departments)

    def get_stats(self) -> StatsData:
        return self.stats

    def get_feed(self) -> List[ActivityFeedItem]:
        return list(self.feed)

    def _pick_department(self, triage_level: str) -> str:
        if triage_level == 'critical':
            return 'Emergency'
        if triage_level == 'moderate':
            return random.choice(['Medicine', 'Orthopaedics', 'Gynaecology', 'Paediatrics'])
        return random.choice(['General OPD', 'ENT', 'Eye OPD', 'Dermatology'])

    def _pick_wait_time(self, triage_level: str) -> int:
        if triage_level == 'critical':
            return 0
        if triage_level == 'moderate':
            return random.randint(10, 30)
        return random.randint(30, 60)

    def _build_queue_item(
        self,
        name: str,
        age: int,
        triage_level: str,
        chief_complaint: str,
        department: Optional[str],
        wait_time: Optional[int],
        status: Optional[str],
    ) -> QueueItem:
        triage_level = triage_level if triage_level in {'critical', 'moderate', 'mild'} else 'mild'
        department = department or self._pick_department(triage_level)
        wait_time = wait_time if wait_time is not None else self._pick_wait_time(triage_level)
        status = status or 'waiting'

        return QueueItem(
            id=str(uuid.uuid4()),
            token=self._generate_token(),
            name=name,
            age=age,
            triageLevel=triage_level,
            chiefComplaint=chief_complaint,
            department=department,
            waitTime=wait_time,
            status=status,
            timestamp=self._now_time(),
        )

    def add_patient(self, payload: Optional[QueueAddRequest]) -> QueueItem:
        with self.lock:
            if payload is None or not any(payload.model_dump().values()):
                payload = QueueAddRequest(
                    name=random.choice(random_names),
                    age=random.randint(5, 64),
                    triageLevel=random.choice(['mild', 'moderate', 'critical']),
                    chiefComplaint=random.choice(random_complaints),
                )

            name = payload.name or random.choice(random_names)
            age = payload.age if payload.age is not None else random.randint(5, 64)
            chief_complaint = payload.chiefComplaint or random.choice(random_complaints)
            triage_level = payload.triageLevel or random.choice(['mild', 'moderate', 'critical'])

            queue_item = self._build_queue_item(
                name=name,
                age=age,
                triage_level=triage_level,
                chief_complaint=chief_complaint,
                department=payload.department,
                wait_time=payload.waitTime,
                status=payload.status,
            )

            self.arrival_counter += 1
            self.queue_records.append(QueueRecord(queue_item, self.arrival_counter))
            self.queue_position_counter += 1
            self.total_today += 1
            self._add_feed_item(queue_item)
            self._recalculate_departments()
            self._recalculate_stats()
            return queue_item

    def triage_patient(self, payload: TriageInput, triage_data: Dict[str, object]) -> TriageResponse:
        with self.lock:
            triage_level = str(triage_data.get('triage_level', 'mild'))
            department = str(triage_data.get('department', 'General OPD'))
            wait_time = int(triage_data.get('wait_time_minutes', 30))
            ai_reasoning = triage_data.get('ai_reasoning')

            self.queue_position_counter += 1
            queue_position = 1 if triage_level == 'critical' else self.queue_position_counter

            token = self._generate_token()
            timestamp = self._now_time()

            queue_item = QueueItem(
                id=str(uuid.uuid4()),
                token=token,
                name=payload.name,
                age=payload.age,
                triageLevel=triage_level,
                chiefComplaint=payload.chiefComplaint,
                department=department,
                waitTime=wait_time,
                status='waiting',
                timestamp=timestamp,
            )

            self.arrival_counter += 1
            self.queue_records.append(QueueRecord(queue_item, self.arrival_counter))
            self.total_today += 1
            self._add_feed_item(queue_item)
            self._recalculate_departments()
            self._recalculate_stats()

            return TriageResponse(
                token=token,
                triageLevel=triage_level,
                department=department,
                waitTimeMinutes=wait_time,
                queuePosition=queue_position,
                aiReasoning=ai_reasoning,
                timestamp=timestamp,
            )

    def advance_random_statuses(self) -> int:
        with self.lock:
            eligible = [record for record in self.queue_records if record.item.status != 'done']
            if not eligible:
                return 0

            count = 1 if len(eligible) == 1 else random.randint(1, 2)
            selected = random.sample(eligible, k=min(count, len(eligible)))
            updates = 0
            for record in selected:
                current_status = record.item.status
                if current_status not in STATUS_FLOW:
                    continue
                idx = STATUS_FLOW.index(current_status)
                if idx < len(STATUS_FLOW) - 1:
                    record.item.status = STATUS_FLOW[idx + 1]
                    updates += 1

            if updates:
                self._recalculate_departments()
                self._recalculate_stats()
            return updates

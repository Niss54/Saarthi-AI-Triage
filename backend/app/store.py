import random
import uuid
from collections import Counter, defaultdict
from datetime import datetime
from threading import Lock
from typing import List

from .models import (
    ActivityFeedItem,
    Department,
    Insight,
    QueueItem,
    StatsData,
    TriageInput,
    TriageResult,
)
from .seed_data import (
    mock_departments,
    mock_feed,
    mock_insights,
    mock_queue,
    mock_stats,
    random_complaints,
    random_names,
)
from .triage import decide_triage


class InMemoryStore:
    def __init__(self) -> None:
        self.lock = Lock()
        self.queue = [QueueItem(**item) for item in mock_queue]
        self.departments = [Department(**item) for item in mock_departments]
        self.insights = [Insight(**item) for item in mock_insights]
        self.feed = [ActivityFeedItem(**item) for item in mock_feed]
        self.stats = StatsData(**mock_stats)
        self.total_today = self.stats.totalToday
        self.queue_counter = max(15, len(self.queue))
        self._recalculate_departments()
        self._recalculate_stats()

    def _now_time(self) -> str:
        return datetime.now().strftime('%I:%M %p')

    def _generate_token(self) -> str:
        return f'APL-{random.randint(1000, 9999)}'

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
        counts = Counter(item.department for item in self.queue)
        wait_times = defaultdict(list)
        for item in self.queue:
            wait_times[item.department].append(item.waitTime)

        for dept_name in counts.keys():
            self._ensure_department(dept_name)

        emergency_critical = any(
            item.department == 'Emergency' and item.triageLevel == 'critical'
            for item in self.queue
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
        avg_wait = int(round(sum(item.waitTime for item in self.queue) / len(self.queue))) if self.queue else 0
        critical_count = sum(1 for item in self.queue if item.triageLevel == 'critical')
        active_departments = len({item.department for item in self.queue})
        self.stats = self.stats.model_copy(
            update={
                'totalToday': self.total_today,
                'avgWaitTime': avg_wait,
                'criticalCount': critical_count,
                'activeDepartments': active_departments,
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
        self.feed = self.feed[:20]

    def get_queue(self) -> List[QueueItem]:
        return list(self.queue)

    def get_departments(self) -> List[Department]:
        return list(self.departments)

    def get_stats(self) -> StatsData:
        return self.stats

    def get_insights(self) -> List[Insight]:
        return list(self.insights)

    def get_feed(self) -> List[ActivityFeedItem]:
        return list(self.feed)

    def _generate_random_patient(self) -> QueueItem:
        triage_levels = ['mild', 'mild', 'moderate', 'moderate', 'moderate', 'critical']
        triage_level = random.choice(triage_levels)
        departments = {
            'critical': ['Emergency'],
            'moderate': ['Medicine', 'Orthopaedics', 'Gynaecology', 'Paediatrics'],
            'mild': ['General OPD', 'ENT', 'Eye OPD', 'Dermatology'],
        }
        department = random.choice(departments[triage_level])
        wait_time = {
            'critical': 0,
            'moderate': random.randint(10, 29),
            'mild': random.randint(30, 59),
        }[triage_level]

        return QueueItem(
            id=str(uuid.uuid4()),
            token=self._generate_token(),
            name=random.choice(random_names),
            age=random.randint(5, 64),
            triageLevel=triage_level,
            chiefComplaint=random.choice(random_complaints),
            department=department,
            waitTime=wait_time,
            status='waiting',
            timestamp=self._now_time(),
        )

    def add_simulated_patient(self) -> QueueItem:
        with self.lock:
            patient = self._generate_random_patient()
            self.queue.insert(0, patient)
            self.queue_counter += 1
            self.total_today += 1
            self._add_feed_item(patient)
            self._recalculate_departments()
            self._recalculate_stats()
            return patient

    def triage_patient(self, payload: TriageInput) -> TriageResult:
        with self.lock:
            decision = decide_triage(payload)
            self.queue_counter += 1
            queue_position = 1 if decision.triageLevel == 'critical' else self.queue_counter
            token = self._generate_token()

            result = TriageResult(
                token=token,
                triageLevel=decision.triageLevel,
                department=decision.department,
                waitTimeMinutes=decision.waitTimeMinutes,
                queuePosition=queue_position,
                message=decision.message,
                aiReasoning=decision.aiReasoning,
            )

            queue_item = QueueItem(
                id=str(uuid.uuid4()),
                token=token,
                name=payload.name,
                age=payload.age,
                triageLevel=decision.triageLevel,
                chiefComplaint=payload.chiefComplaint,
                department=decision.department,
                waitTime=decision.waitTimeMinutes,
                status='waiting',
                timestamp=self._now_time(),
            )
            self.queue.insert(0, queue_item)
            self.total_today += 1
            self._add_feed_item(queue_item)
            self._recalculate_departments()
            self._recalculate_stats()
            return result

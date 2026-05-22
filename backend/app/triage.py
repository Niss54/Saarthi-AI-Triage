import random
from typing import Dict

from .models import TriageInput


def rule_based_triage(payload: TriageInput) -> Dict[str, object]:
    complaint_lower = payload.chiefComplaint.lower()
    danger_words = [
        'chest pain', 'seene', 'dard', 'saans', 'breathing',
        'breathless', 'unconscious', 'behosh'
    ]
    has_danger_words = any(word in complaint_lower for word in danger_words)

    if payload.hasCriticalSymptoms and has_danger_words:
        return {
            'triage_level': 'critical',
            'department': 'Emergency',
            'wait_time_minutes': 0,
            'ai_reasoning': (
                'Symptoms se chest pain aur breathing issue lag raha hai. '
                'Emergency priority di gayi hai.'
            ),
        }

    if payload.duration == '1 mahine se zyada' or payload.onMedication:
        department = 'Medicine'
        if payload.gender.lower() == 'female' and payload.isPregnant:
            department = 'Gynaecology'
        wait_time = random.randint(15, 30)
        return {
            'triage_level': 'moderate',
            'department': department,
            'wait_time_minutes': wait_time,
            'ai_reasoning': (
                'Long duration ya ongoing medication ka case hai. '
                'Moderate priority di gayi hai.'
            ),
        }

    wait_time = random.randint(30, 60)
    return {
        'triage_level': 'mild',
        'department': 'General OPD',
        'wait_time_minutes': wait_time,
        'ai_reasoning': (
            'Symptoms mild lag rahe hain, urgent red flags nahi hain. '
            'Normal queue follow karein.'
        ),
    }

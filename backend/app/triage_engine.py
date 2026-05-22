import json
import os
import re
from typing import Any, Dict, List

import google.generativeai as genai

from .mock_data import DEPARTMENTS
from .triage import rule_based_triage


genai.configure(api_key=os.getenv('GEMINI_API_KEY', ''))

MODEL_NAME = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
model = genai.GenerativeModel(MODEL_NAME)

TRIAGE_PROMPT = """
You are a medical triage AI for KGMU hospital in Lucknow, India.
Given patient information, determine:
1. triage_level: "critical" | "moderate" | "mild"
2. department: one of [Emergency, Medicine, Orthopaedics, Gynaecology, Paediatrics, ENT, Eye OPD, Dermatology, General OPD]
3. wait_time_minutes: integer (0 for critical, 10-30 for moderate, 30-60 for mild)
4. ai_reasoning: brief Hindi-English mixed explanation (2 sentences)

Patient Info:
{patient_data}

Return ONLY valid JSON: {"triage_level": "...", "department": "...", "wait_time_minutes": N, "ai_reasoning": "..."}
"""

INSIGHTS_PROMPT = """
You are analyzing the KGMU OPD queue. Current queue data:
{queue_snapshot}

Generate exactly 3 actionable insights for the hospital administrator.
Each insight should be practical and specific to this queue data.
Return ONLY valid JSON array:
[{"icon": "emoji", "message": "insight text", "severity": "high|medium|low"}]
"""


def _extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith('{') or text.startswith('['):
        return text
    match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if not match:
        raise ValueError('No JSON found in Gemini response')
    return match.group(1)


def _parse_json(text: str) -> Any:
    return json.loads(_extract_json(text))


def _normalize_triage(raw: Dict[str, Any]) -> Dict[str, Any]:
    triage_level = str(raw.get('triage_level', '')).lower()
    if triage_level not in {'critical', 'moderate', 'mild'}:
        raise ValueError('Invalid triage_level')

    department = str(raw.get('department', 'General OPD'))
    if department not in DEPARTMENTS:
        department = 'Emergency' if triage_level == 'critical' else 'General OPD'

    wait_time = int(raw.get('wait_time_minutes', 0))
    if triage_level == 'critical':
        wait_time = 0
    elif triage_level == 'moderate':
        wait_time = max(10, min(wait_time, 30))
    else:
        wait_time = max(30, min(wait_time, 60))

    ai_reasoning = str(raw.get('ai_reasoning', '')).strip() or None

    return {
        'triage_level': triage_level,
        'department': department,
        'wait_time_minutes': wait_time,
        'ai_reasoning': ai_reasoning,
    }


def get_triage(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return rule_based_triage(_payload_to_input(patient_data))

    try:
        prompt = TRIAGE_PROMPT.format(patient_data=json.dumps(patient_data, ensure_ascii=False))
        response = model.generate_content(prompt)
        raw = _parse_json(response.text)
        return _normalize_triage(raw)
    except Exception:
        return rule_based_triage(_payload_to_input(patient_data))


def get_insights(queue_snapshot: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return _fallback_insights()

    try:
        prompt = INSIGHTS_PROMPT.format(queue_snapshot=json.dumps(queue_snapshot, ensure_ascii=False))
        response = model.generate_content(prompt)
        raw = _parse_json(response.text)
        if not isinstance(raw, list) or len(raw) != 3:
            raise ValueError('Invalid insights shape')
        insights = []
        for item in raw:
            severity = str(item.get('severity', 'low')).lower()
            if severity not in {'high', 'medium', 'low'}:
                severity = 'low'
            insights.append(
                {
                    'icon': str(item.get('icon', '')),
                    'message': str(item.get('message', '')),
                    'severity': severity,
                }
            )
        return insights
    except Exception:
        return _fallback_insights()


def _fallback_insights() -> List[Dict[str, str]]:
    return [
        {
            'icon': '🚨',
            'message': 'Emergency queue has multiple critical cases; prioritize rapid routing.',
            'severity': 'high',
        },
        {
            'icon': '⏱️',
            'message': 'Medicine OPD wait time is trending higher; consider opening Counter 2.',
            'severity': 'medium',
        },
        {
            'icon': '📊',
            'message': 'Peak hour likely 11:00 AM - 1:00 PM; schedule extra floor staff.',
            'severity': 'low',
        },
    ]


def _payload_to_input(patient_data: Dict[str, Any]):
    from .models import TriageInput

    return TriageInput.model_validate(patient_data)

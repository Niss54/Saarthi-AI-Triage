"""
Saarthi AI - Smart Queue Intelligence Engine
Auto-reorders queue based on severity, age, emergency score, and risk.
"""

FAST_TRACK_TRIGGERS = [
    "breathing difficulty", "saans nahi", "chest pain", "seene mein dard",
    "severe bleeding", "bahut khoon", "unconscious", "behosh",
    "seizure", "mirgi", "stroke", "lakwa", "heart attack",
    "severe allergic reaction", "anaphylaxis", "cardiac arrest",
    "choking", "not breathing", "saans band", "head injury severe",
    "poisoning", "zeher", "accident severe"
]


def calculate_queue_score(patient: dict) -> float:
    """
    Calculate composite queue score for ordering.
    Higher score = higher priority (seen first).
    Components: severity(40%) + age_factor(20%) + emergency(25%) + wait_duration(15%)
    """
    score = 0.0
    
    # 1. Severity (0-40)
    triage_level = patient.get("triageLevel", "mild").lower()
    if triage_level == "critical":
        score += 40
    elif triage_level == "moderate":
        score += 24
    else:
        score += 8
    
    # 2. Age factor (0-20)
    age = patient.get("age", 30)
    if age < 3 or age > 75:
        score += 20
    elif age < 10 or age > 65:
        score += 14
    elif age < 15 or age > 55:
        score += 8
    else:
        score += 4
    
    # 3. Emergency flag (0-25)
    if patient.get("isEmergency", False):
        score += 25
    complaint = patient.get("chiefComplaint", "").lower()
    emergency_hits = sum(1 for kw in FAST_TRACK_TRIGGERS if kw in complaint)
    score += min(25, emergency_hits * 8)
    
    # 4. Wait duration penalty (0-15) — longer wait = slightly higher priority
    wait_time = patient.get("waitTime", 0)
    if wait_time > 60:
        score += 15
    elif wait_time > 45:
        score += 10
    elif wait_time > 30:
        score += 6
    else:
        score += 2
    
    return min(100, score)


def reorder_queue(queue_items: list) -> list:
    """Reorder queue using smart scoring. Higher score = seen first."""
    for item in queue_items:
        item["_queue_score"] = calculate_queue_score(item)
    
    sorted_queue = sorted(
        queue_items,
        key=lambda x: (-x.get("_queue_score", 0), x.get("timestamp", ""))
    )
    
    # Clean up internal score field
    for item in sorted_queue:
        item.pop("_queue_score", None)
    
    return sorted_queue


def should_fast_track(patient_data: dict) -> dict:
    """Determine if a patient should be fast-tracked to front of queue."""
    complaint = patient_data.get("chief_complaint", "").lower()
    has_critical = patient_data.get("has_fever_chest_breathing", False) or patient_data.get("has_critical_symptoms", False)
    
    triggered = []
    for trigger in FAST_TRACK_TRIGGERS:
        if trigger in complaint:
            triggered.append(trigger)
    
    if triggered or has_critical:
        return {
            "fast_track": True,
            "reason": f"Emergency detected: {', '.join(triggered[:3]) if triggered else 'Critical symptoms flagged'}",
            "override_priority": 100,
            "triggered_keywords": triggered[:5]
        }
    
    return {
        "fast_track": False,
        "reason": "No emergency triggers detected",
        "override_priority": 0,
        "triggered_keywords": []
    }

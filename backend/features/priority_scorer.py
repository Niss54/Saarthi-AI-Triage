"""
Saarthi AI - Multi-Factor Priority Scoring Engine
Calculates patient priority score (0-100) based on severity, age, symptoms, duration.
"""

EMERGENCY_SYMPTOMS = [
    "chest pain", "seene mein dard", "heart attack", "breathing difficulty",
    "saans nahi", "saans lene mein takleef", "unconscious", "behosh",
    "severe bleeding", "bahut khoon", "seizure", "mirgi", "stroke",
    "lakwa", "poisoning", "zeher", "accident", "hadsa", "cardiac",
    "choking", "anaphylaxis", "not breathing", "saans band",
    "severe burn", "head injury", "sir mein chot"
]

HIGH_RISK_SYMPTOMS = [
    "high fever", "tez bukhar", "blood in stool", "khoon aana",
    "severe pain", "bahut dard", "swelling", "sujan", "difficulty swallowing",
    "chest tightness", "irregular heartbeat", "vision loss", "nazar chali gayi",
    "sudden weakness", "achanak kamzori", "confusion", "fainting", "behoshi"
]


def calculate_priority_score(patient_data: dict) -> dict:
    """
    Calculate comprehensive priority score.
    Score formula (0-100):
    severity_weight(40) + age_weight(15) + symptom_weight(25) + duration_weight(10) + critical_flag(10)
    """
    score = 0
    emergency_flags = []
    risk_factors = []
    
    complaint = patient_data.get("chief_complaint", "").lower()
    age = patient_data.get("age", 30)
    gender = patient_data.get("gender", "").lower()
    duration = patient_data.get("duration", "").lower()
    has_critical = patient_data.get("has_fever_chest_breathing", False) or patient_data.get("has_critical_symptoms", False)
    on_medication = patient_data.get("on_medication", False)
    is_pregnant = patient_data.get("is_pregnant", False)
    triage_level = patient_data.get("triage_level", "mild").lower()
    
    # 1. Severity weight (0-40)
    if triage_level == "critical":
        score += 40
    elif triage_level == "moderate":
        score += 24
    else:
        score += 8
    
    # 2. Age weight (0-15)
    if age < 2:
        score += 15
        risk_factors.append("Infant (< 2 years)")
    elif age < 5:
        score += 12
        risk_factors.append("Young child (< 5 years)")
    elif age < 12:
        score += 8
        risk_factors.append("Child (< 12 years)")
    elif age > 75:
        score += 15
        risk_factors.append("Elderly (> 75 years)")
    elif age > 65:
        score += 12
        risk_factors.append("Senior citizen (> 65 years)")
    elif age > 55:
        score += 6
    else:
        score += 3
    
    # 3. Symptom weight (0-25)
    emergency_count = sum(1 for kw in EMERGENCY_SYMPTOMS if kw in complaint)
    high_risk_count = sum(1 for kw in HIGH_RISK_SYMPTOMS if kw in complaint)
    
    if emergency_count > 0:
        score += 25
        for kw in EMERGENCY_SYMPTOMS:
            if kw in complaint:
                emergency_flags.append(f"Emergency symptom: {kw}")
    elif high_risk_count > 0:
        score += 15
        for kw in HIGH_RISK_SYMPTOMS:
            if kw in complaint:
                risk_factors.append(f"High-risk symptom: {kw}")
    else:
        score += 5
    
    # 4. Duration weight (0-10)
    if any(w in duration for w in ["1 din", "aaj", "today", "abhi", "just now", "1 hour", "ek ghanta"]):
        score += 10  # Acute onset = higher priority
        risk_factors.append("Acute onset (today)")
    elif any(w in duration for w in ["2 din", "3 din", "kal", "yesterday"]):
        score += 7
    elif any(w in duration for w in ["hafta", "week", "1 week"]):
        score += 5
    elif any(w in duration for w in ["mahine", "month"]):
        score += 3
        risk_factors.append("Chronic condition (> 1 month)")
    else:
        score += 5
    
    # 5. Critical flag weight (0-10)
    if has_critical:
        score += 10
        emergency_flags.append("Critical symptoms reported by patient")
    if is_pregnant:
        score += 5
        risk_factors.append("Pregnant patient")
    if on_medication:
        risk_factors.append("Currently on medication")
    
    # Clamp score
    score = min(100, max(0, score))
    
    # Determine priority level
    if score >= 80:
        priority_level = "critical"
    elif score >= 60:
        priority_level = "high"
    elif score >= 40:
        priority_level = "medium"
    else:
        priority_level = "low"
    
    # Confidence based on data completeness
    data_fields = [complaint, str(age), gender, duration]
    filled = sum(1 for f in data_fields if f and f != "0")
    confidence = round(0.5 + (filled / len(data_fields)) * 0.5, 2)
    
    return {
        "priority_score": score,
        "priority_level": priority_level,
        "emergency_flags": emergency_flags[:5],
        "risk_factors": risk_factors[:5],
        "confidence_score": confidence
    }

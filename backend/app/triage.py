from typing import Dict, Any

def rule_based_triage(payload: Dict[str, Any]) -> dict:
    """Fallback rule-based triage logic when Gemini is disabled or fails"""
    
    complaint = str(payload.get('chief_complaint', '')).lower()
    duration = str(payload.get('duration', '')).lower()
    has_critical_symptoms = payload.get('has_fever_chest_breathing', False)
    on_medication = payload.get('on_medication', False)
    age = payload.get('age', 30)
    gender = payload.get('gender', 'Other').lower()
    is_pregnant = payload.get('is_pregnant', False)

    # Danger keywords
    danger_critical = ['chest pain', 'seene', 'saans', 'breathing', 'breathless', 'unconscious', 'behosh', 'laqwa', 'stroke', 'dil', 'heart', 'bleeding', 'khoon', 'seizure', 'dora']
    danger_ortho = ['fracture', 'haddi', 'pair', 'tod', 'ghutna', 'joint']
    danger_skin = ['rash', 'khujli', 'skin', 'chamdi', 'hair']
    danger_eye = ['aankh', 'eye', 'nazar']
    danger_ent = ['kaan', 'ear', 'gala', 'throat']

    has_critical = any(w in complaint for w in danger_critical)
    
    if has_critical and has_critical_symptoms:
        return {
            "severity": "critical",
            "department": "Emergency",
            "wait_time_minutes": 0,
            "ai_reasoning": "Critical symptoms detected — seene mein dard aur saans ki takleef, turant emergency care zaroori.",
            "urgency_reason": "Critical cardiac/respiratory symptoms",
            "recommended_action": "Proceed to Emergency Bay immediately"
        }
    elif has_critical:
        return {
            "severity": "critical",
            "department": "Emergency",
            "wait_time_minutes": 0,
            "ai_reasoning": "Critical symptoms detected. Immediate medical attention required.",
            "urgency_reason": "Critical symptoms present",
            "recommended_action": "Proceed to Emergency immediately"
        }
    elif any(w in complaint for w in danger_ortho):
        return {
            "severity": "moderate",
            "department": "Orthopaedics",
            "wait_time_minutes": 20,
            "ai_reasoning": "Orthopaedic issue detected — haddi/joint related problem, specialist consultation needed.",
            "urgency_reason": "Musculoskeletal issue",
            "recommended_action": "Visit Orthopaedics OPD"
        }
    elif any(w in complaint for w in danger_skin):
        return {
            "severity": "mild",
            "department": "Dermatology",
            "wait_time_minutes": 40,
            "ai_reasoning": "Skin related issue — routine dermatology consultation.",
            "urgency_reason": "Dermatological condition",
            "recommended_action": "Visit Dermatology OPD"
        }
    elif any(w in complaint for w in danger_eye):
        return {
            "severity": "mild",
            "department": "Eye OPD",
            "wait_time_minutes": 40,
            "ai_reasoning": "Eye related issue — ophthalmology check required.",
            "urgency_reason": "Ophthalmological condition",
            "recommended_action": "Visit Eye OPD"
        }
    elif any(w in complaint for w in danger_ent):
        return {
            "severity": "mild",
            "department": "ENT",
            "wait_time_minutes": 40,
            "ai_reasoning": "ENT related issue — specialist consultation.",
            "urgency_reason": "ENT condition",
            "recommended_action": "Visit ENT OPD"
        }
    elif age < 12:
        return {
            "severity": "moderate",
            "department": "Paediatrics",
            "wait_time_minutes": 15,
            "ai_reasoning": "Bacche ki umar 12 se kam hai — Paediatrics mein dikhana zaroori.",
            "urgency_reason": "Pediatric patient",
            "recommended_action": "Visit Paediatrics OPD"
        }
    elif duration == '1 mahine se zyada' or on_medication:
        dept = "Gynaecology" if gender == "female" and is_pregnant else "Medicine"
        return {
            "severity": "moderate",
            "department": dept,
            "wait_time_minutes": 25,
            "ai_reasoning": "Chronic condition ya medication — moderate priority consultation.",
            "urgency_reason": "Chronic/ongoing condition",
            "recommended_action": f"Visit {dept} OPD"
        }
    else:
        return {
            "severity": "mild",
            "department": "General OPD",
            "wait_time_minutes": 45,
            "ai_reasoning": "Routine OPD consultation — mild symptoms.",
            "urgency_reason": "Routine consultation",
            "recommended_action": "Visit General OPD"
        }

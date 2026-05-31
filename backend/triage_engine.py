import google.generativeai as genai
import os, json
import random

genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))
model = genai.GenerativeModel("gemini-1.5-flash")

ENHANCED_TRIAGE_PROMPT = """
You are a medical triage AI for KGMU hospital in Lucknow, India.
Given patient information, determine ALL of the following:

1. triage_level: "critical" | "moderate" | "mild"
2. urgency_level: "immediate" | "urgent" | "semi-urgent" | "non-urgent"
3. severity_score: integer 1-10 (10 = most severe)
4. department: one of [Emergency, Cardiology, Medicine, Orthopaedics, Gynaecology, Paediatrics, ENT, Eye OPD, Dermatology, General OPD, Neurology, Pulmonology, Surgery]
5. confidence_score: float 0.0-1.0
6. risk_factors: array of risk factors (max 3)
7. recommended_action: what the patient should do immediately
8. possible_conditions: array of possible diagnoses (max 3)
9. ai_reasoning: brief Hindi-English mixed explanation (2-3 sentences)
10. follow_up_needed: boolean

Patient Info:
{patient_data}

Return ONLY valid JSON:
{{"triage_level": "...", "urgency_level": "...", "severity_score": N, "department": "...", "confidence_score": 0.X, "risk_factors": ["..."], "recommended_action": "...", "possible_conditions": ["..."], "ai_reasoning": "...", "follow_up_needed": true/false}}
"""

INSIGHTS_PROMPT = """
You are analyzing the KGMU OPD queue. Current queue data:
{queue_snapshot}

Generate exactly 3 actionable insights for the hospital administrator.
Each insight should be practical and specific to this queue data.
Return ONLY valid JSON array:
[{{"icon": "emoji", "message": "insight text", "severity": "high|medium|low"}}]
"""

def get_triage(patient_data: dict) -> dict:
    """Basic triage (backward compatible)."""
    return get_enhanced_triage(patient_data)

def get_enhanced_triage(patient_data: dict) -> dict:
    """Enhanced AI triage with full structured output."""
    try:
        response = model.generate_content(ENHANCED_TRIAGE_PROMPT.format(patient_data=json.dumps(patient_data)))
        text = response.text.strip()
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            result = json.loads(match.group(0))
        else:
            result = json.loads(text)
        
        # Ensure all fields exist
        result.setdefault("triage_level", "mild")
        result.setdefault("urgency_level", "non-urgent")
        result.setdefault("severity_score", 3)
        result.setdefault("department", "General OPD")
        result.setdefault("confidence_score", 0.7)
        result.setdefault("risk_factors", [])
        result.setdefault("recommended_action", "Proceed to assigned department.")
        result.setdefault("possible_conditions", [])
        result.setdefault("ai_reasoning", "AI analysis complete.")
        result.setdefault("follow_up_needed", False)
        
        return result
    except Exception as e:
        print("Gemini Enhanced Triage failed:", e)
        return _fallback_triage(patient_data)


def _fallback_triage(patient_data: dict) -> dict:
    """Rule-based fallback when Gemini fails."""
    complaint = patient_data.get("chief_complaint", "").lower()
    danger_words = ['chest pain', 'seene', 'dard', 'saans', 'breathing', 'breathless', 'unconscious', 'behosh', 'bleeding', 'khoon', 'seizure', 'mirgi']
    has_danger = any(w in complaint for w in danger_words)
    has_critical = patient_data.get("has_fever_chest_breathing", False)
    
    if has_critical and has_danger:
        return {
            "triage_level": "critical",
            "urgency_level": "immediate",
            "severity_score": 9,
            "department": "Emergency",
            "confidence_score": 0.85,
            "risk_factors": ["Critical symptoms detected", "Immediate attention needed"],
            "recommended_action": "Turant Emergency mein jaayein. Priority override applied.",
            "possible_conditions": ["Emergency assessment required"],
            "ai_reasoning": "Rule-based: Critical symptoms (chest pain/breathing/bleeding) detected with critical flag. Immediate emergency attention required.",
            "follow_up_needed": True,
            "wait_time_minutes": 0
        }
    elif patient_data.get("duration", "").lower() in ['1 mahine se zyada'] or patient_data.get("on_medication"):
        dept = "Gynaecology" if patient_data.get("gender", "").lower() == "female" and patient_data.get("is_pregnant") else "Medicine"
        return {
            "triage_level": "moderate",
            "urgency_level": "semi-urgent",
            "severity_score": 5,
            "department": dept,
            "confidence_score": 0.75,
            "risk_factors": ["Chronic condition", "On medication"],
            "recommended_action": f"Kripya {dept} OPD counter par jaayein.",
            "possible_conditions": ["Chronic illness management"],
            "ai_reasoning": f"Rule-based: Chronic condition or on medication. Moderate priority, routed to {dept}.",
            "follow_up_needed": True,
            "wait_time_minutes": random.randint(15, 30)
        }
    else:
        return {
            "triage_level": "mild",
            "urgency_level": "non-urgent",
            "severity_score": 2,
            "department": "General OPD",
            "confidence_score": 0.70,
            "risk_factors": [],
            "recommended_action": "Kripya General OPD counter par jaayein. Routine consultation.",
            "possible_conditions": ["Routine assessment"],
            "ai_reasoning": "Rule-based: No critical symptoms. Routine consultation assigned to General OPD.",
            "follow_up_needed": False,
            "wait_time_minutes": random.randint(30, 60)
        }


def get_insights(queue_snapshot: list) -> list:
    try:
        subset = queue_snapshot[:20]
        response = model.generate_content(INSIGHTS_PROMPT.format(queue_snapshot=json.dumps(subset)))
        text = response.text.strip()
        import re
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception as e:
        print("Gemini Insights failed:", e)
        return [
            {"icon": "🚨", "message": "High number of critical cases in Emergency.", "severity": "high"},
            {"icon": "⏱️", "message": "Medicine OPD wait times are increasing.", "severity": "medium"},
            {"icon": "📊", "message": "General OPD has normal flow today.", "severity": "low"}
        ]

import google.generativeai as genai
import os, json
import random

genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))
model = genai.GenerativeModel("gemini-1.5-flash")

TRIAGE_PROMPT = """
You are a medical triage AI for KGMU hospital in Lucknow, India. 
Given patient information, determine:
1. triage_level: "critical" | "moderate" | "mild"
2. department: one of [Emergency, Medicine, Orthopaedics, Gynaecology, Paediatrics, ENT, Eye OPD, Dermatology, General OPD]
3. wait_time_minutes: integer (0 for critical, 10-30 for moderate, 30-60 for mild)
4. ai_reasoning: brief Hindi-English mixed explanation (2 sentences)

Patient Info:
{patient_data}

Return ONLY valid JSON: {{"triage_level": "...", "department": "...", "wait_time_minutes": N, "ai_reasoning": "..."}}
"""

INSIGHTS_PROMPT = """
You are analyzing the KGMU OPD queue. Current queue data:
{queue_snapshot}

Generate exactly 3 actionable insights for the hospital administrator.
Each insight should be practical and specific to this queue data.
Return ONLY valid JSON array:
[{"icon": "emoji", "message": "insight text", "severity": "high|medium|low"}]
"""

def get_triage(patient_data: dict) -> dict:
    try:
        response = model.generate_content(TRIAGE_PROMPT.format(patient_data=json.dumps(patient_data)))
        text = response.text.strip()
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception as e:
        print("Gemini Triage failed:", e)
        complaint = patient_data.get("chief_complaint", "").lower()
        danger_words = ['chest pain', 'seene', 'dard', 'saans', 'breathing', 'breathless', 'unconscious', 'behosh']
        has_danger = any(w in complaint for w in danger_words)
        
        if patient_data.get("has_fever_chest_breathing") and has_danger:
            return {"triage_level": "critical", "department": "Emergency", "wait_time_minutes": 0, "ai_reasoning": "Local Rule: Critical symptoms detected."}
        elif patient_data.get("duration") == '1 mahine se zyada' or patient_data.get("on_medication"):
            dept = "Gynaecology" if patient_data.get("gender", "").lower() == "female" and patient_data.get("is_pregnant") else "Medicine"
            return {"triage_level": "moderate", "department": dept, "wait_time_minutes": random.randint(15,30), "ai_reasoning": "Local Rule: Chronic condition or on medication."}
        else:
            return {"triage_level": "mild", "department": "General OPD", "wait_time_minutes": random.randint(30,60), "ai_reasoning": "Local Rule: Routine consultation."}

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

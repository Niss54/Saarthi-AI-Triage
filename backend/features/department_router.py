"""
Saarthi AI - Department Auto-Routing Engine
Maps symptoms to hospital departments with confidence scoring.
"""

DEPARTMENT_ROUTING_MAP = {
    "Emergency": {
        "keywords": [
            "chest pain", "seene mein dard", "heart attack", "dil ka daura",
            "breathing difficulty", "saans nahi aa rahi", "saans lene mein takleef",
            "unconscious", "behosh", "hosh nahi", "severe bleeding", "bahut khoon",
            "seizure", "mirgi", "fits", "stroke", "lakwa", "paralysis",
            "poisoning", "zeher", "severe burn", "jal gaya", "anaphylaxis",
            "cardiac arrest", "choking", "drowning", "electrocution",
            "severe trauma", "accident", "road accident", "hadsa"
        ],
        "priority": 1,
        "avg_consultation_min": 5,
        "doctors": ["Dr. R.K. Sharma", "Dr. Priya Verma"],
        "rooms": ["ER-1", "ER-2", "ER-3"]
    },
    "Cardiology": {
        "keywords": [
            "chest pain", "seene mein dard", "heart", "dil", "palpitation",
            "dhadkan", "BP high", "blood pressure", "hypertension",
            "heart murmur", "angina", "irregular heartbeat", "dil ki dhadkan tez"
        ],
        "priority": 2,
        "avg_consultation_min": 15,
        "doctors": ["Dr. A.K. Mehta", "Dr. Sunita Gupta"],
        "rooms": ["Card-101", "Card-102"]
    },
    "Neurology": {
        "keywords": [
            "head injury", "sir mein chot", "headache", "sir dard", "migraine",
            "seizure", "mirgi", "numbness", "sunn", "stroke", "lakwa",
            "dizziness", "chakkar", "vertigo", "memory loss", "yaaddaasht",
            "tremor", "kaampna", "fainting", "behoshi", "brain"
        ],
        "priority": 2,
        "avg_consultation_min": 15,
        "doctors": ["Dr. Vikram Singh", "Dr. Neha Agarwal"],
        "rooms": ["Neuro-201", "Neuro-202"]
    },
    "Pulmonology": {
        "keywords": [
            "asthma", "dama", "cough", "khansi", "breathing", "saans",
            "TB", "tuberculosis", "pneumonia", "bronchitis", "wheezing",
            "oxygen", "lung", "phephda", "COPD", "chest congestion",
            "seene mein jalan", "cold", "sardi"
        ],
        "priority": 3,
        "avg_consultation_min": 12,
        "doctors": ["Dr. Rajesh Kumar", "Dr. Anita Yadav"],
        "rooms": ["Pulm-301", "Pulm-302"]
    },
    "Orthopaedics": {
        "keywords": [
            "fracture", "haddi tooti", "bone", "haddi", "joint pain", "jod dard",
            "sprain", "moch", "back pain", "kamar dard", "knee pain",
            "ghutna dard", "shoulder pain", "kandha dard", "slip disc",
            "arthritis", "gathiya", "swelling joint", "sujan"
        ],
        "priority": 3,
        "avg_consultation_min": 12,
        "doctors": ["Dr. Manoj Tiwari", "Dr. Kavita Mishra"],
        "rooms": ["Ortho-401", "Ortho-402"]
    },
    "Gynaecology": {
        "keywords": [
            "pregnancy", "pregnant", "garbhvati", "periods", "mahavari",
            "menstrual", "bleeding", "PCOS", "ovary", "uterus", "bachedani",
            "delivery", "labour pain", "pet mein dard female", "breast",
            "prenatal", "postnatal", "miscarriage", "infertility"
        ],
        "priority": 3,
        "avg_consultation_min": 15,
        "doctors": ["Dr. Seema Sharma", "Dr. Pooja Rastogi"],
        "rooms": ["Gynae-501", "Gynae-502"]
    },
    "Paediatrics": {
        "keywords": [
            "child", "bachcha", "baby", "infant", "shishu", "fever child",
            "vaccination", "teeka", "growth", "vikas", "crying",
            "rona", "not eating", "khana nahi kha raha", "diarrhea child",
            "dast bachche", "colic", "measles", "khasra"
        ],
        "priority": 3,
        "avg_consultation_min": 10,
        "doctors": ["Dr. Amit Saxena", "Dr. Ritu Agarwal"],
        "rooms": ["Paed-601", "Paed-602"]
    },
    "ENT": {
        "keywords": [
            "ear pain", "kaan dard", "hearing", "sunai", "throat",
            "gala", "gale mein dard", "nose", "naak", "nose bleed",
            "naak se khoon", "tonsil", "sinus", "snoring", "kharrate",
            "voice problem", "awaaz", "ear infection", "kaan behna"
        ],
        "priority": 4,
        "avg_consultation_min": 10,
        "doctors": ["Dr. Sandeep Verma", "Dr. Nidhi Gupta"],
        "rooms": ["ENT-701", "ENT-702"]
    },
    "Eye OPD": {
        "keywords": [
            "eye", "aankh", "vision", "nazar", "blurred vision", "dhundla",
            "eye pain", "aankh mein dard", "redness eye", "aankh laal",
            "cataract", "motiyabind", "glaucoma", "kala motia",
            "spectacles", "chashma", "itching eye", "aankh mein khujli"
        ],
        "priority": 4,
        "avg_consultation_min": 10,
        "doctors": ["Dr. Ravi Shankar", "Dr. Meenakshi Jain"],
        "rooms": ["Eye-801", "Eye-802"]
    },
    "Dermatology": {
        "keywords": [
            "skin", "chamdi", "twacha", "rash", "daane", "itching",
            "khujli", "allergy", "acne", "pimple", "muhase", "fungal",
            "ring worm", "daad", "eczema", "psoriasis", "hair fall",
            "baal jharna", "burn", "jalana", "wound", "ghav"
        ],
        "priority": 4,
        "avg_consultation_min": 8,
        "doctors": ["Dr. Pallavi Sinha", "Dr. Ashok Pandey"],
        "rooms": ["Derm-901", "Derm-902"]
    },
    "Surgery": {
        "keywords": [
            "hernia", "appendix", "appendicitis", "gallstone", "pathari",
            "tumor", "rasauli", "abscess", "pus", "surgical", "operation",
            "lump", "ganth", "pilonidal", "fistula", "bhagandar"
        ],
        "priority": 3,
        "avg_consultation_min": 15,
        "doctors": ["Dr. Suresh Chandra", "Dr. Deepika Singh"],
        "rooms": ["Surg-1001", "Surg-1002"]
    },
    "Medicine": {
        "keywords": [
            "fever", "bukhar", "diabetes", "sugar", "thyroid",
            "weakness", "kamzori", "fatigue", "thakan", "vomiting",
            "ulti", "nausea", "ji machlana", "diarrhea", "dast",
            "constipation", "kabz", "stomach", "pet", "body pain",
            "badan dard", "infection", "blood test", "general checkup"
        ],
        "priority": 3,
        "avg_consultation_min": 10,
        "doctors": ["Dr. S.P. Mishra", "Dr. Rekha Dubey"],
        "rooms": ["Med-1101", "Med-1102"]
    },
    "General OPD": {
        "keywords": [
            "checkup", "general", "consultation", "follow up", "report",
            "certificate", "dawai", "medicine refill", "routine",
            "health check", "normal", "minor"
        ],
        "priority": 5,
        "avg_consultation_min": 8,
        "doctors": ["Dr. V.K. Singh", "Dr. Anju Chaurasia"],
        "rooms": ["OPD-1", "OPD-2", "OPD-3"]
    }
}

EMERGENCY_KEYWORDS = [
    "chest pain", "seene mein dard", "heart attack", "breathing difficulty",
    "saans nahi", "unconscious", "behosh", "severe bleeding", "bahut khoon",
    "seizure", "mirgi", "stroke", "lakwa", "poisoning", "zeher",
    "severe burn", "accident", "hadsa", "cardiac arrest", "choking",
    "anaphylaxis", "not breathing", "saans band"
]


def route_to_department(symptoms: str, age: int = 30, gender: str = "Male") -> dict:
    """Route patient to the best department based on symptoms."""
    symptoms_lower = symptoms.lower()
    
    # Check emergency first
    is_emergency = any(kw in symptoms_lower for kw in EMERGENCY_KEYWORDS)
    
    if is_emergency:
        dept_info = DEPARTMENT_ROUTING_MAP["Emergency"]
        return {
            "department": "Emergency",
            "confidence": 0.95,
            "reasoning": f"Emergency keywords detected in symptoms. Immediate attention required.",
            "alternative_department": None,
            "is_emergency": True,
            "doctor": dept_info["doctors"][0],
            "room": dept_info["rooms"][0],
            "avg_consultation_min": dept_info["avg_consultation_min"]
        }
    
    # Age-based routing
    if age < 12:
        # Check pediatrics first for children
        dept_info = DEPARTMENT_ROUTING_MAP["Paediatrics"]
        paed_match = any(kw in symptoms_lower for kw in dept_info["keywords"])
        if paed_match or not _find_best_department(symptoms_lower):
            return {
                "department": "Paediatrics",
                "confidence": 0.85,
                "reasoning": f"Patient is {age} years old (child). Routing to Paediatrics.",
                "alternative_department": _find_best_department(symptoms_lower) or "General OPD",
                "is_emergency": False,
                "doctor": dept_info["doctors"][0],
                "room": dept_info["rooms"][0],
                "avg_consultation_min": dept_info["avg_consultation_min"]
            }
    
    # Gender-based routing for pregnancy
    if gender.lower() == "female":
        gynae_info = DEPARTMENT_ROUTING_MAP["Gynaecology"]
        gynae_match = any(kw in symptoms_lower for kw in gynae_info["keywords"])
        if gynae_match:
            return {
                "department": "Gynaecology",
                "confidence": 0.90,
                "reasoning": f"Female patient with gynaecological symptoms detected.",
                "alternative_department": "Medicine",
                "is_emergency": False,
                "doctor": gynae_info["doctors"][0],
                "room": gynae_info["rooms"][0],
                "avg_consultation_min": gynae_info["avg_consultation_min"]
            }
    
    # Score each department
    scores = {}
    for dept_name, dept_info in DEPARTMENT_ROUTING_MAP.items():
        if dept_name in ["Emergency", "General OPD"]:
            continue
        score = sum(1 for kw in dept_info["keywords"] if kw in symptoms_lower)
        if score > 0:
            scores[dept_name] = score
    
    if scores:
        best_dept = max(scores, key=scores.get)
        best_score = scores[best_dept]
        total_keywords = len(DEPARTMENT_ROUTING_MAP[best_dept]["keywords"])
        confidence = min(0.95, 0.5 + (best_score / total_keywords) * 0.5)
        
        # Find alternative
        sorted_depts = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        alt_dept = sorted_depts[1][0] if len(sorted_depts) > 1 else "General OPD"
        
        dept_info = DEPARTMENT_ROUTING_MAP[best_dept]
        return {
            "department": best_dept,
            "confidence": round(confidence, 2),
            "reasoning": f"Matched {best_score} symptom keywords for {best_dept}.",
            "alternative_department": alt_dept,
            "is_emergency": False,
            "doctor": dept_info["doctors"][0],
            "room": dept_info["rooms"][0],
            "avg_consultation_min": dept_info["avg_consultation_min"]
        }
    
    # Default
    dept_info = DEPARTMENT_ROUTING_MAP["General OPD"]
    return {
        "department": "General OPD",
        "confidence": 0.50,
        "reasoning": "No specific department match found. Routing to General OPD.",
        "alternative_department": "Medicine",
        "is_emergency": False,
        "doctor": dept_info["doctors"][0],
        "room": dept_info["rooms"][0],
        "avg_consultation_min": dept_info["avg_consultation_min"]
    }


def _find_best_department(symptoms_lower: str) -> str:
    """Find best matching department for symptoms."""
    scores = {}
    for dept_name, dept_info in DEPARTMENT_ROUTING_MAP.items():
        if dept_name in ["Emergency", "General OPD"]:
            continue
        score = sum(1 for kw in dept_info["keywords"] if kw in symptoms_lower)
        if score > 0:
            scores[dept_name] = score
    return max(scores, key=scores.get) if scores else ""


def get_department_info(department: str) -> dict:
    """Get department details."""
    dept = DEPARTMENT_ROUTING_MAP.get(department, DEPARTMENT_ROUTING_MAP["General OPD"])
    return {
        "name": department,
        "avg_consultation_min": dept["avg_consultation_min"],
        "doctors": dept["doctors"],
        "rooms": dept["rooms"],
        "priority": dept["priority"]
    }

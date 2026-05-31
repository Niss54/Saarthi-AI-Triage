"""
Saarthi AI - Wait Time Prediction Engine
Predicts OPD waiting time based on queue state and department load.
"""

from features.department_router import DEPARTMENT_ROUTING_MAP


def predict_wait_time(department: str, queue_items: list, triage_level: str = "mild") -> dict:
    """
    Predict wait time for a department.
    Formula: patients_ahead × avg_consultation_time × load_factor
    """
    dept_info = DEPARTMENT_ROUTING_MAP.get(department, DEPARTMENT_ROUTING_MAP["General OPD"])
    avg_time = dept_info.get("avg_consultation_min", 10)
    num_doctors = len(dept_info.get("doctors", [1]))
    
    # Count patients ahead in same department (not done)
    patients_in_dept = [
        p for p in queue_items
        if p.get("department") == department and p.get("status") not in ["done"]
    ]
    patients_ahead = len(patients_in_dept)
    
    # Critical patients skip ahead
    if triage_level == "critical":
        patients_ahead = 0
    elif triage_level == "moderate":
        # Only count critical patients ahead
        patients_ahead = len([p for p in patients_in_dept if p.get("triageLevel") == "critical"])
    
    # Load factor (more doctors = faster)
    load_factor = max(0.5, 1.0 / num_doctors) if num_doctors > 0 else 1.0
    
    # Calculate wait time
    estimated_wait = int(patients_ahead * avg_time * load_factor)
    
    # Capacity check
    capacity = dept_info.get("capacity", 50) if "capacity" in dept_info else 50
    dept_load_percent = int((patients_ahead / max(capacity, 1)) * 100)
    
    # Crowd status
    if patients_ahead == 0:
        crowd_status = "Empty"
    elif patients_ahead <= 3:
        crowd_status = "Low"
    elif patients_ahead <= 8:
        crowd_status = "Moderate"
    elif patients_ahead <= 15:
        crowd_status = "Busy"
    else:
        crowd_status = "Overcrowded"
    
    # Department load label
    if dept_load_percent < 30:
        load_label = "Low Load"
    elif dept_load_percent < 60:
        load_label = "Normal Load"
    elif dept_load_percent < 80:
        load_label = "High Load"
    else:
        load_label = "Overloaded"
    
    return {
        "estimated_wait_minutes": max(0, estimated_wait),
        "queue_position": patients_ahead + 1,
        "patients_ahead": patients_ahead,
        "crowd_status": crowd_status,
        "department_load": load_label,
        "department_load_percent": min(100, dept_load_percent)
    }

DEPARTMENTS = [
    'Emergency', 'Medicine', 'Orthopaedics', 'Gynaecology',
    'Paediatrics', 'ENT', 'Eye OPD', 'Dermatology', 'General OPD'
]

mock_stats = {
    'totalToday': 1247,
    'avgWaitTime': 23,
    'criticalCount': 14,
    'activeDepartments': 8,
}

mock_queue = [
    {'id': '1', 'token': 'APL-4821', 'name': 'Ramesh Kumar', 'age': 55, 'triageLevel': 'critical', 'chiefComplaint': 'Seene mein tej dard, saans mein takleef', 'department': 'Emergency', 'waitTime': 0, 'status': 'called', 'timestamp': '09:12 AM'},
    {'id': '2', 'token': 'APL-4822', 'name': 'Sunita Devi', 'age': 62, 'triageLevel': 'critical', 'chiefComplaint': 'Bukhar, chest pain, breathlessness', 'department': 'Emergency', 'waitTime': 0, 'status': 'in-consultation', 'timestamp': '09:15 AM'},
    {'id': '3', 'token': 'APL-4823', 'name': 'Arun Mishra', 'age': 45, 'triageLevel': 'critical', 'chiefComplaint': 'Severe breathing difficulty, high fever', 'department': 'Emergency', 'waitTime': 0, 'status': 'waiting', 'timestamp': '09:22 AM'},
    {'id': '4', 'token': 'APL-4824', 'name': 'Priya Sharma', 'age': 28, 'triageLevel': 'moderate', 'chiefComplaint': 'Bukhar 5 din se, weakness', 'department': 'Medicine', 'waitTime': 18, 'status': 'waiting', 'timestamp': '09:30 AM'},
    {'id': '5', 'token': 'APL-4825', 'name': 'Mohammad Irfan', 'age': 35, 'triageLevel': 'moderate', 'chiefComplaint': 'Peeth mein dard, 2 mahine se', 'department': 'Orthopaedics', 'waitTime': 22, 'status': 'called', 'timestamp': '09:33 AM'},
    {'id': '6', 'token': 'APL-4826', 'name': 'Kavita Yadav', 'age': 32, 'triageLevel': 'moderate', 'chiefComplaint': 'Pregnancy check-up, 6 months', 'department': 'Gynaecology', 'waitTime': 15, 'status': 'in-consultation', 'timestamp': '09:35 AM'},
    {'id': '7', 'token': 'APL-4827', 'name': 'Rajesh Tiwari', 'age': 50, 'triageLevel': 'moderate', 'chiefComplaint': 'Sugar ki dawai, follow-up', 'department': 'Medicine', 'waitTime': 25, 'status': 'waiting', 'timestamp': '09:40 AM'},
    {'id': '8', 'token': 'APL-4828', 'name': 'Anita Gupta', 'age': 41, 'triageLevel': 'moderate', 'chiefComplaint': 'Ghutne mein dard, 1 mahina', 'department': 'Orthopaedics', 'waitTime': 28, 'status': 'waiting', 'timestamp': '09:42 AM'},
    {'id': '9', 'token': 'APL-4829', 'name': 'Vikram Singh', 'age': 22, 'triageLevel': 'mild', 'chiefComplaint': 'Sardi khaansi, 3 din', 'department': 'General OPD', 'waitTime': 35, 'status': 'waiting', 'timestamp': '09:45 AM'},
    {'id': '10', 'token': 'APL-4830', 'name': 'Neha Patel', 'age': 19, 'triageLevel': 'mild', 'chiefComplaint': 'Skin rash, khujli', 'department': 'Dermatology', 'waitTime': 40, 'status': 'called', 'timestamp': '09:48 AM'},
    {'id': '11', 'token': 'APL-4831', 'name': 'Suresh Verma', 'age': 60, 'triageLevel': 'moderate', 'chiefComplaint': 'BP ki dawai, dizziness', 'department': 'Medicine', 'waitTime': 20, 'status': 'waiting', 'timestamp': '09:50 AM'},
    {'id': '12', 'token': 'APL-4832', 'name': 'Fatima Khan', 'age': 38, 'triageLevel': 'mild', 'chiefComplaint': 'Sar mein dard, 2 din', 'department': 'General OPD', 'waitTime': 45, 'status': 'waiting', 'timestamp': '09:52 AM'},
    {'id': '13', 'token': 'APL-4833', 'name': 'Deepak Pandey', 'age': 8, 'triageLevel': 'moderate', 'chiefComplaint': 'Tez bukhar, ulti', 'department': 'Paediatrics', 'waitTime': 12, 'status': 'called', 'timestamp': '09:55 AM'},
    {'id': '14', 'token': 'APL-4834', 'name': 'Lakshmi Agarwal', 'age': 70, 'triageLevel': 'mild', 'chiefComplaint': 'Aankh mein dhundlaahat', 'department': 'Eye OPD', 'waitTime': 38, 'status': 'waiting', 'timestamp': '09:58 AM'},
    {'id': '15', 'token': 'APL-4835', 'name': 'Amit Saxena', 'age': 29, 'triageLevel': 'mild', 'chiefComplaint': 'Kaan mein dard, 4 din', 'department': 'ENT', 'waitTime': 42, 'status': 'waiting', 'timestamp': '10:00 AM'},
]

mock_departments = [
    {'name': 'Emergency', 'patientCount': 8, 'avgWaitMinutes': 2, 'capacity': 15, 'status': 'critical'},
    {'name': 'Medicine', 'patientCount': 34, 'avgWaitMinutes': 28, 'capacity': 50, 'status': 'busy'},
    {'name': 'Orthopaedics', 'patientCount': 19, 'avgWaitMinutes': 25, 'capacity': 30, 'status': 'normal'},
    {'name': 'Gynaecology', 'patientCount': 12, 'avgWaitMinutes': 18, 'capacity': 20, 'status': 'normal'},
    {'name': 'Paediatrics', 'patientCount': 22, 'avgWaitMinutes': 15, 'capacity': 30, 'status': 'normal'},
    {'name': 'ENT', 'patientCount': 9, 'avgWaitMinutes': 30, 'capacity': 15, 'status': 'normal'},
    {'name': 'Eye OPD', 'patientCount': 14, 'avgWaitMinutes': 35, 'capacity': 20, 'status': 'normal'},
    {'name': 'Dermatology', 'patientCount': 7, 'avgWaitMinutes': 22, 'capacity': 15, 'status': 'normal'},
]

random_names = [
    'Rohit Chauhan', 'Sneha Tripathi', 'Manish Srivastava', 'Pooja Rawat',
    'Dinesh Awasthi', 'Rekha Bajpai', 'Shivam Dubey', 'Meera Jaiswal',
    'Arvind Pal', 'Sapna Nigam', 'Gaurav Shukla', 'Nandini Pathak'
]

random_complaints = [
    'Tez bukhar, 2 din se', 'Pet mein dard', 'Sar mein dard',
    'Khujli aur rash', 'Ghutne mein sujan', 'Kaan bahna',
    'Aankh laal, jalan', 'Khaaansi 1 hafta', 'Kamzori aur chakkar',
    'Kamar dard', 'Ulti aur loose motion', 'Nind nahi aati'
]

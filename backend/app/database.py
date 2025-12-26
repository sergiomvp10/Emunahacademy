"""
In-memory database for EmunahAcademy.
Note: Data will be lost when the server restarts. This is a proof of concept.
For production, a persistent database like PostgreSQL should be used.
"""

from datetime import datetime
from typing import Dict, List, Optional
from app.models import (
    User, UserRole, Course, Lesson, LessonType,
    Evaluation, StudentEvaluation, CalendarEvent, EventType,
    QuizResult, Enrollment
)

# In-memory storage
users_db: Dict[int, dict] = {}
courses_db: Dict[int, dict] = {}
lessons_db: Dict[int, dict] = {}
evaluations_db: Dict[int, dict] = {}
submissions_db: Dict[int, dict] = {}
calendar_events_db: Dict[int, dict] = {}
quiz_results_db: Dict[int, dict] = {}
enrollments_db: Dict[int, dict] = {}
parent_student_links: List[dict] = []
lesson_completions: List[dict] = []  # {student_id, lesson_id, completed_at}
messages_db: Dict[int, dict] = {}

# Auto-increment counters
user_counter = 0
course_counter = 0
lesson_counter = 0
evaluation_counter = 0
submission_counter = 0
event_counter = 0
quiz_result_counter = 0
enrollment_counter = 0
message_counter = 0

def get_next_user_id() -> int:
    global user_counter
    user_counter += 1
    return user_counter

def get_next_course_id() -> int:
    global course_counter
    course_counter += 1
    return course_counter

def get_next_lesson_id() -> int:
    global lesson_counter
    lesson_counter += 1
    return lesson_counter

def get_next_evaluation_id() -> int:
    global evaluation_counter
    evaluation_counter += 1
    return evaluation_counter

def get_next_submission_id() -> int:
    global submission_counter
    submission_counter += 1
    return submission_counter

def get_next_event_id() -> int:
    global event_counter
    event_counter += 1
    return event_counter

def get_next_quiz_result_id() -> int:
    global quiz_result_counter
    quiz_result_counter += 1
    return quiz_result_counter

def get_next_enrollment_id() -> int:
    global enrollment_counter
    enrollment_counter += 1
    return enrollment_counter

def get_next_message_id() -> int:
    global message_counter
    message_counter += 1
    return message_counter

def init_sample_data():
    """Initialize with sample data for demonstration."""
    global user_counter, course_counter, lesson_counter, evaluation_counter, event_counter, enrollment_counter
    
    # Create sample users
    sample_users = [
        {"email": "admin@emunahacademy.com", "name": "Administrador", "role": UserRole.SUPERUSER, "password": "admin123"},
        {"email": "directora@emunahacademy.com", "name": "Maria Garcia", "role": UserRole.DIRECTOR, "password": "director123"},
        {"email": "profesor1@emunahacademy.com", "name": "Carlos Rodriguez", "role": UserRole.TEACHER, "password": "teacher123"},
        {"email": "profesor2@emunahacademy.com", "name": "Ana Martinez", "role": UserRole.TEACHER, "password": "teacher123"},
        {"email": "estudiante1@emunahacademy.com", "name": "Juan Perez", "role": UserRole.STUDENT, "password": "student123"},
        {"email": "estudiante2@emunahacademy.com", "name": "Sofia Lopez", "role": UserRole.STUDENT, "password": "student123"},
        {"email": "padre1@emunahacademy.com", "name": "Roberto Perez", "role": UserRole.PARENT, "password": "parent123"},
    ]
    
    for user_data in sample_users:
        user_id = get_next_user_id()
        users_db[user_id] = {
            "id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "role": user_data["role"],
            "password": user_data["password"],
            "created_at": datetime.now(),
            "is_active": True
        }
    
    # Link parent to student (parent_id=7 is Roberto Perez, student_id=5 is Juan Perez)
    parent_student_links.append({"parent_id": 7, "student_id": 5})
    
    # Create sample courses
    sample_courses = [
        {"title": "Matematicas Basicas", "description": "Curso introductorio de matematicas para principiantes", "teacher_id": 2},
        {"title": "Lectura y Escritura", "description": "Desarrollo de habilidades de lectoescritura", "teacher_id": 3},
        {"title": "Ciencias Naturales", "description": "Explorando el mundo natural", "teacher_id": 2},
    ]
    
    for course_data in sample_courses:
        course_id = get_next_course_id()
        teacher = users_db[course_data["teacher_id"]]
        courses_db[course_id] = {
            "id": course_id,
            "title": course_data["title"],
            "description": course_data["description"],
            "thumbnail_url": None,
            "teacher_id": course_data["teacher_id"],
            "teacher_name": teacher["name"],
            "created_at": datetime.now(),
            "is_published": True
        }
    
    # Enroll students in courses
    enrollment_counter = 0
    for student_id in [4, 5]:
        for course_id in [1, 2]:
            eid = get_next_enrollment_id()
            enrollments_db[eid] = {
                "id": eid,
                "student_id": student_id,
                "course_id": course_id,
                "enrolled_at": datetime.now()
            }
    
    # Create sample lessons for first course
    sample_lessons = [
        {"course_id": 1, "title": "Introduccion a los numeros", "lesson_type": LessonType.TEXT, "content": "<h1>Los Numeros</h1><p>Los numeros son simbolos que usamos para contar...</p>", "order": 1},
        {"course_id": 1, "title": "Video: Sumando numeros", "lesson_type": LessonType.VIDEO, "content": "https://www.youtube.com/embed/dQw4w9WgXcQ", "order": 2},
        {"course_id": 1, "title": "Quiz: Operaciones basicas", "lesson_type": LessonType.QUIZ, "content": '[{"question": "Cuanto es 2 + 2?", "options": ["3", "4", "5", "6"], "correct_answer": 1}, {"question": "Cuanto es 5 - 3?", "options": ["1", "2", "3", "4"], "correct_answer": 1}]', "order": 3},
    ]
    
    for lesson_data in sample_lessons:
        lesson_id = get_next_lesson_id()
        lessons_db[lesson_id] = {
            "id": lesson_id,
            **lesson_data,
            "created_at": datetime.now()
        }
    
    # Create sample calendar events
    sample_events = [
        {"title": "Clase de Matematicas", "description": "Clase semanal", "event_type": EventType.CLASS, "start_time": datetime(2025, 12, 27, 10, 0), "end_time": datetime(2025, 12, 27, 11, 0), "course_id": 1, "created_by": 2},
        {"title": "Evaluacion Final", "description": "Examen del primer modulo", "event_type": EventType.EVALUATION, "start_time": datetime(2025, 12, 30, 14, 0), "end_time": datetime(2025, 12, 30, 16, 0), "course_id": 1, "created_by": 2},
    ]
    
    for event_data in sample_events:
        event_id = get_next_event_id()
        calendar_events_db[event_id] = {
            "id": event_id,
            **event_data,
            "created_at": datetime.now()
        }

# Initialize sample data on module load
init_sample_data()

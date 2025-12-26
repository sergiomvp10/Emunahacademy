from datetime import datetime
from sqlalchemy.orm import Session
from app.db_models import (
    Base, User, Course, Lesson, Enrollment, CalendarEvent, ParentStudentLink,
    UserRoleEnum, LessonTypeEnum, EventTypeEnum
)
from app.db_config import engine, SessionLocal

def create_tables():
    Base.metadata.create_all(bind=engine)

def seed_sample_data(db: Session):
    existing_user = db.query(User).filter(User.email == "admin@emunahacademy.com").first()
    if existing_user:
        return
    
    users_data = [
        {"email": "admin@emunahacademy.com", "name": "Administrador", "role": UserRoleEnum.SUPERUSER, "password": "admin123"},
        {"email": "directora@emunahacademy.com", "name": "Maria Garcia", "role": UserRoleEnum.DIRECTOR, "password": "director123"},
        {"email": "profesor1@emunahacademy.com", "name": "Carlos Rodriguez", "role": UserRoleEnum.TEACHER, "password": "teacher123"},
        {"email": "profesor2@emunahacademy.com", "name": "Ana Martinez", "role": UserRoleEnum.TEACHER, "password": "teacher123"},
        {"email": "estudiante1@emunahacademy.com", "name": "Juan Perez", "role": UserRoleEnum.STUDENT, "password": "student123"},
        {"email": "estudiante2@emunahacademy.com", "name": "Sofia Lopez", "role": UserRoleEnum.STUDENT, "password": "student123"},
        {"email": "padre1@emunahacademy.com", "name": "Roberto Perez", "role": UserRoleEnum.PARENT, "password": "parent123"},
    ]
    
    users = []
    for user_data in users_data:
        user = User(**user_data)
        db.add(user)
        users.append(user)
    db.flush()
    
    courses_data = [
        {"title": "Matematicas Basicas", "description": "Curso introductorio de matematicas para principiantes", "teacher_id": users[1].id, "is_published": True},
        {"title": "Lectura y Escritura", "description": "Desarrollo de habilidades de lectoescritura", "teacher_id": users[2].id, "is_published": True},
        {"title": "Ciencias Naturales", "description": "Explorando el mundo natural", "teacher_id": users[1].id, "is_published": True},
    ]
    
    courses = []
    for course_data in courses_data:
        course = Course(**course_data)
        db.add(course)
        courses.append(course)
    db.flush()
    
    for student in [users[4], users[5]]:
        for course in [courses[0], courses[1]]:
            enrollment = Enrollment(student_id=student.id, course_id=course.id)
            db.add(enrollment)
    
    lessons_data = [
        {"course_id": courses[0].id, "title": "Introduccion a los numeros", "lesson_type": LessonTypeEnum.TEXT, "content": "<h1>Los Numeros</h1><p>Los numeros son simbolos que usamos para contar...</p>", "order": 1},
        {"course_id": courses[0].id, "title": "Video: Sumando numeros", "lesson_type": LessonTypeEnum.VIDEO, "content": "https://www.youtube.com/embed/dQw4w9WgXcQ", "order": 2},
        {"course_id": courses[0].id, "title": "Quiz: Operaciones basicas", "lesson_type": LessonTypeEnum.QUIZ, "content": '[{"question": "Cuanto es 2 + 2?", "options": ["3", "4", "5", "6"], "correct_answer": 1}, {"question": "Cuanto es 5 - 3?", "options": ["1", "2", "3", "4"], "correct_answer": 1}]', "order": 3},
    ]
    
    for lesson_data in lessons_data:
        lesson = Lesson(**lesson_data)
        db.add(lesson)
    
    events_data = [
        {"title": "Clase de Matematicas", "description": "Clase semanal", "event_type": EventTypeEnum.CLASS, "start_time": datetime(2025, 12, 27, 10, 0), "end_time": datetime(2025, 12, 27, 11, 0), "course_id": courses[0].id, "created_by": users[1].id},
        {"title": "Evaluacion Final", "description": "Examen del primer modulo", "event_type": EventTypeEnum.EVALUATION, "start_time": datetime(2025, 12, 30, 14, 0), "end_time": datetime(2025, 12, 30, 16, 0), "course_id": courses[0].id, "created_by": users[1].id},
    ]
    
    for event_data in events_data:
        event = CalendarEvent(**event_data)
        db.add(event)
    
    parent_link = ParentStudentLink(parent_id=users[6].id, student_id=users[4].id)
    db.add(parent_link)
    
    db.commit()

def init_database():
    create_tables()
    db = SessionLocal()
    try:
        seed_sample_data(db)
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("Database initialized successfully!")

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime
import json
import os

from app.models import (
    UserCreate, User, UserLogin, Token, UserRole,
    CourseCreate, Course, LessonCreate, Lesson, LessonType,
    EvaluationCreate, Evaluation, EvaluationSubmission, EvaluationGrade, StudentEvaluation,
    CalendarEventCreate, CalendarEvent,
    QuizSubmission, QuizResult, QuizQuestion,
    EnrollmentCreate, Enrollment,
    StudentProgress, ParentStudentLink, ChildProgress,
    MessageCreate, Message, Conversation,
    SiteContentUpdate, SiteContent,
    StudentApplicationCreate, StudentApplication, ApplicationStatus
)
from app.database import (
    users_db, courses_db, lessons_db, evaluations_db, submissions_db,
    calendar_events_db, quiz_results_db, enrollments_db, parent_student_links,
    lesson_completions, messages_db, site_content_db, applications_db,
    get_next_user_id, get_next_course_id, get_next_lesson_id,
    get_next_evaluation_id, get_next_submission_id, get_next_event_id,
    get_next_quiz_result_id, get_next_enrollment_id, get_next_message_id,
    get_next_application_id
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("DATABASE_URL"):
        from app.db_init import init_database
        init_database()
        print("PostgreSQL database initialized")
    yield

app = FastAPI(
    title="EmunahAcademy API",
    description="API para la plataforma educativa EmunahAcademy",
    version="1.0.0",
    lifespan=lifespan
)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate):
    # Check if email already exists
    for existing_user in users_db.values():
        if existing_user["email"] == user.email:
            raise HTTPException(status_code=400, detail="Email ya registrado")
    
    user_id = get_next_user_id()
    users_db[user_id] = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "password": user.password,
        "created_at": datetime.now(),
        "is_active": True
    }
    
    user_data = User(
        id=user_id,
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=users_db[user_id]["created_at"],
        is_active=True
    )
    
    return Token(
        access_token=f"token_{user_id}",
        token_type="bearer",
        user=user_data
    )

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    for user_id, user in users_db.items():
        if user["email"] == credentials.email and user["password"] == credentials.password:
            user_data = User(
                id=user_id,
                email=user["email"],
                name=user["name"],
                role=user["role"],
                created_at=user["created_at"],
                is_active=user["is_active"]
            )
            return Token(
                access_token=f"token_{user_id}",
                token_type="bearer",
                user=user_data
            )
    raise HTTPException(status_code=401, detail="Credenciales invalidas")

@app.get("/api/auth/me", response_model=User)
async def get_current_user(token: str):
    # Simple token validation (in production, use JWT)
    try:
        user_id = int(token.replace("token_", ""))
        if user_id in users_db:
            user = users_db[user_id]
            return User(
                id=user_id,
                email=user["email"],
                name=user["name"],
                role=user["role"],
                created_at=user["created_at"],
                is_active=user["is_active"]
            )
    except (ValueError, KeyError):
        pass
    raise HTTPException(status_code=401, detail="Token invalido")

# ==================== USER MANAGEMENT ====================

@app.get("/api/users", response_model=List[User])
async def get_users(role: Optional[UserRole] = None, grade_level: Optional[str] = None):
    users = []
    for user_id, user in users_db.items():
        if role is None or user["role"] == role:
            user_grade = user.get("grade_level")
            if grade_level and user_grade != grade_level:
                continue
            users.append(User(
                id=user_id,
                email=user["email"],
                name=user["name"],
                role=user["role"],
                grade_level=user_grade,
                created_at=user["created_at"],
                is_active=user["is_active"]
            ))
    return users

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user = users_db[user_id]
    return User(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
        is_active=user["is_active"]
    )

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    del users_db[user_id]
    return {"message": "Usuario eliminado"}

@app.put("/api/users/{user_id}/grade")
async def update_user_grade(user_id: int, grade_level: Optional[str] = None):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user = users_db[user_id]
    if user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Solo estudiantes pueden tener grado asignado")
    
    users_db[user_id]["grade_level"] = grade_level
    return User(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=user["role"],
        grade_level=grade_level,
        created_at=user["created_at"],
        is_active=user["is_active"]
    )

# ==================== COURSE ENDPOINTS ====================

@app.get("/api/courses", response_model=List[Course])
async def get_courses(teacher_id: Optional[int] = None, published_only: bool = False):
    courses = []
    for course_id, course in courses_db.items():
        if teacher_id and course["teacher_id"] != teacher_id:
            continue
        if published_only and not course["is_published"]:
            continue
        courses.append(Course(**course))
    return courses

@app.get("/api/courses/{course_id}", response_model=Course)
async def get_course(course_id: int):
    if course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return Course(**courses_db[course_id])

@app.post("/api/courses", response_model=Course)
async def create_course(course: CourseCreate, teacher_id: int):
    if teacher_id not in users_db:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    
    teacher = users_db[teacher_id]
    if teacher["role"] not in [UserRole.TEACHER, UserRole.DIRECTOR, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Solo profesores pueden crear cursos")
    
    course_id = get_next_course_id()
    courses_db[course_id] = {
        "id": course_id,
        "title": course.title,
        "description": course.description,
        "thumbnail_url": course.thumbnail_url,
        "grade_level": course.grade_level,
        "teacher_id": teacher_id,
        "teacher_name": teacher["name"],
        "created_at": datetime.now(),
        "is_published": False
    }
    return Course(**courses_db[course_id])

@app.put("/api/courses/{course_id}", response_model=Course)
async def update_course(course_id: int, course: CourseCreate):
    if course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    courses_db[course_id].update({
        "title": course.title,
        "description": course.description,
        "thumbnail_url": course.thumbnail_url,
        "grade_level": course.grade_level
    })
    return Course(**courses_db[course_id])

@app.post("/api/courses/{course_id}/publish")
async def publish_course(course_id: int):
    if course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    courses_db[course_id]["is_published"] = True
    return {"message": "Curso publicado"}

@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: int):
    if course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    del courses_db[course_id]
    return {"message": "Curso eliminado"}

# ==================== LESSON ENDPOINTS ====================

@app.get("/api/courses/{course_id}/lessons", response_model=List[Lesson])
async def get_lessons(course_id: int):
    if course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    lessons = [Lesson(**l) for l in lessons_db.values() if l["course_id"] == course_id]
    return sorted(lessons, key=lambda x: x.order)

@app.get("/api/lessons/{lesson_id}", response_model=Lesson)
async def get_lesson(lesson_id: int):
    if lesson_id not in lessons_db:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    return Lesson(**lessons_db[lesson_id])

@app.post("/api/lessons", response_model=Lesson)
async def create_lesson(lesson: LessonCreate):
    if lesson.course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    lesson_id = get_next_lesson_id()
    lessons_db[lesson_id] = {
        "id": lesson_id,
        "course_id": lesson.course_id,
        "title": lesson.title,
        "lesson_type": lesson.lesson_type,
        "content": lesson.content,
        "order": lesson.order,
        "created_at": datetime.now()
    }
    return Lesson(**lessons_db[lesson_id])

@app.put("/api/lessons/{lesson_id}", response_model=Lesson)
async def update_lesson(lesson_id: int, lesson: LessonCreate):
    if lesson_id not in lessons_db:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    
    lessons_db[lesson_id].update({
        "title": lesson.title,
        "lesson_type": lesson.lesson_type,
        "content": lesson.content,
        "order": lesson.order
    })
    return Lesson(**lessons_db[lesson_id])

@app.delete("/api/lessons/{lesson_id}")
async def delete_lesson(lesson_id: int):
    if lesson_id not in lessons_db:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    del lessons_db[lesson_id]
    return {"message": "Leccion eliminada"}

@app.post("/api/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: int, student_id: int):
    if lesson_id not in lessons_db:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    
    # Check if already completed
    for completion in lesson_completions:
        if completion["lesson_id"] == lesson_id and completion["student_id"] == student_id:
            return {"message": "Leccion ya completada"}
    
    lesson_completions.append({
        "student_id": student_id,
        "lesson_id": lesson_id,
        "completed_at": datetime.now()
    })
    return {"message": "Leccion completada"}

# ==================== QUIZ ENDPOINTS ====================

@app.post("/api/quizzes/submit", response_model=QuizResult)
async def submit_quiz(submission: QuizSubmission, student_id: int):
    if submission.lesson_id not in lessons_db:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    lesson = lessons_db[submission.lesson_id]
    if lesson["lesson_type"] != LessonType.QUIZ:
        raise HTTPException(status_code=400, detail="Esta leccion no es un quiz")
    
    # Parse quiz questions
    questions = json.loads(lesson["content"])
    
    # Calculate score
    correct = 0
    for i, answer in enumerate(submission.answers):
        if i < len(questions) and questions[i]["correct_answer"] == answer:
            correct += 1
    
    score = (correct / len(questions)) * 100 if questions else 0
    
    result_id = get_next_quiz_result_id()
    result = {
        "id": result_id,
        "lesson_id": submission.lesson_id,
        "student_id": student_id,
        "score": score,
        "total_questions": len(questions),
        "correct_answers": correct,
        "submitted_at": datetime.now()
    }
    quiz_results_db[result_id] = result
    
    # Mark lesson as completed
    await complete_lesson(submission.lesson_id, student_id)
    
    return QuizResult(**result)

@app.get("/api/quizzes/results/{student_id}", response_model=List[QuizResult])
async def get_quiz_results(student_id: int):
    results = [QuizResult(**r) for r in quiz_results_db.values() if r["student_id"] == student_id]
    return results

# ==================== EVALUATION ENDPOINTS ====================

@app.get("/api/evaluations", response_model=List[Evaluation])
async def get_evaluations(course_id: Optional[int] = None):
    evals = []
    for eval_id, evaluation in evaluations_db.items():
        if course_id and evaluation["course_id"] != course_id:
            continue
        evals.append(Evaluation(**evaluation))
    return evals

@app.get("/api/evaluations/{evaluation_id}", response_model=Evaluation)
async def get_evaluation(evaluation_id: int):
    if evaluation_id not in evaluations_db:
        raise HTTPException(status_code=404, detail="Evaluacion no encontrada")
    return Evaluation(**evaluations_db[evaluation_id])

@app.post("/api/evaluations", response_model=Evaluation)
async def create_evaluation(evaluation: EvaluationCreate):
    if evaluation.course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    eval_id = get_next_evaluation_id()
    evaluations_db[eval_id] = {
        "id": eval_id,
        "title": evaluation.title,
        "description": evaluation.description,
        "course_id": evaluation.course_id,
        "due_date": evaluation.due_date,
        "max_score": evaluation.max_score,
        "created_at": datetime.now()
    }
    return Evaluation(**evaluations_db[eval_id])

@app.post("/api/evaluations/submit", response_model=StudentEvaluation)
async def submit_evaluation(submission: EvaluationSubmission, student_id: int):
    if submission.evaluation_id not in evaluations_db:
        raise HTTPException(status_code=404, detail="Evaluacion no encontrada")
    
    if student_id not in users_db:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    sub_id = get_next_submission_id()
    submissions_db[sub_id] = {
        "id": sub_id,
        "evaluation_id": submission.evaluation_id,
        "student_id": student_id,
        "student_name": users_db[student_id]["name"],
        "content": submission.content,
        "score": None,
        "feedback": None,
        "submitted_at": datetime.now(),
        "graded_at": None
    }
    return StudentEvaluation(**submissions_db[sub_id])

@app.get("/api/evaluations/{evaluation_id}/submissions", response_model=List[StudentEvaluation])
async def get_evaluation_submissions(evaluation_id: int):
    subs = [StudentEvaluation(**s) for s in submissions_db.values() if s["evaluation_id"] == evaluation_id]
    return subs

@app.post("/api/evaluations/grade", response_model=StudentEvaluation)
async def grade_evaluation(grade: EvaluationGrade):
    if grade.submission_id not in submissions_db:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    submissions_db[grade.submission_id].update({
        "score": grade.score,
        "feedback": grade.feedback,
        "graded_at": datetime.now()
    })
    return StudentEvaluation(**submissions_db[grade.submission_id])

# ==================== CALENDAR ENDPOINTS ====================

@app.get("/api/calendar", response_model=List[CalendarEvent])
async def get_calendar_events(
    course_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    events = []
    for event_id, event in calendar_events_db.items():
        if course_id and event.get("course_id") != course_id:
            continue
        if start_date and event["start_time"] < start_date:
            continue
        if end_date and event["end_time"] > end_date:
            continue
        events.append(CalendarEvent(**event))
    return sorted(events, key=lambda x: x.start_time)

@app.post("/api/calendar", response_model=CalendarEvent)
async def create_calendar_event(event: CalendarEventCreate, created_by: int):
    if created_by not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    event_id = get_next_event_id()
    calendar_events_db[event_id] = {
        "id": event_id,
        "title": event.title,
        "description": event.description,
        "event_type": event.event_type,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "course_id": event.course_id,
        "created_by": created_by,
        "created_at": datetime.now()
    }
    return CalendarEvent(**calendar_events_db[event_id])

@app.delete("/api/calendar/{event_id}")
async def delete_calendar_event(event_id: int):
    if event_id not in calendar_events_db:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    del calendar_events_db[event_id]
    return {"message": "Evento eliminado"}

# ==================== ENROLLMENT ENDPOINTS ====================

@app.get("/api/enrollments", response_model=List[Enrollment])
async def get_enrollments(student_id: Optional[int] = None, course_id: Optional[int] = None):
    enrollments = []
    for enroll_id, enrollment in enrollments_db.items():
        if student_id and enrollment["student_id"] != student_id:
            continue
        if course_id and enrollment["course_id"] != course_id:
            continue
        enrollments.append(Enrollment(**enrollment))
    return enrollments

@app.post("/api/enrollments", response_model=Enrollment)
async def create_enrollment(enrollment: EnrollmentCreate):
    if enrollment.student_id not in users_db:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    if enrollment.course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    # Check if already enrolled
    for e in enrollments_db.values():
        if e["student_id"] == enrollment.student_id and e["course_id"] == enrollment.course_id:
            raise HTTPException(status_code=400, detail="Estudiante ya inscrito en este curso")
    
    enroll_id = get_next_enrollment_id()
    enrollments_db[enroll_id] = {
        "id": enroll_id,
        "student_id": enrollment.student_id,
        "course_id": enrollment.course_id,
        "enrolled_at": datetime.now()
    }
    return Enrollment(**enrollments_db[enroll_id])

@app.delete("/api/enrollments/{enrollment_id}")
async def delete_enrollment(enrollment_id: int):
    if enrollment_id not in enrollments_db:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")
    del enrollments_db[enrollment_id]
    return {"message": "Inscripcion eliminada"}

# ==================== PROGRESS ENDPOINTS ====================

@app.get("/api/progress/{student_id}", response_model=List[StudentProgress])
async def get_student_progress(student_id: int):
    if student_id not in users_db:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    student = users_db[student_id]
    progress_list = []
    
    # Get enrolled courses
    enrolled_courses = [e["course_id"] for e in enrollments_db.values() if e["student_id"] == student_id]
    
    for course_id in enrolled_courses:
        if course_id not in courses_db:
            continue
        
        course = courses_db[course_id]
        
        # Get lessons for this course
        course_lessons = [l for l in lessons_db.values() if l["course_id"] == course_id]
        total_lessons = len(course_lessons)
        
        # Get completed lessons
        completed = len([c for c in lesson_completions 
                        if c["student_id"] == student_id 
                        and c["lesson_id"] in [l["id"] for l in course_lessons]])
        
        # Get quiz scores
        quiz_lesson_ids = [l["id"] for l in course_lessons if l["lesson_type"] == LessonType.QUIZ]
        quiz_scores = [r["score"] for r in quiz_results_db.values() 
                      if r["student_id"] == student_id and r["lesson_id"] in quiz_lesson_ids]
        avg_quiz = sum(quiz_scores) / len(quiz_scores) if quiz_scores else None
        
        # Get evaluations
        course_evals = [e["id"] for e in evaluations_db.values() if e["course_id"] == course_id]
        completed_evals = len([s for s in submissions_db.values() 
                              if s["student_id"] == student_id and s["evaluation_id"] in course_evals])
        
        progress_list.append(StudentProgress(
            student_id=student_id,
            student_name=student["name"],
            course_id=course_id,
            course_title=course["title"],
            completed_lessons=completed,
            total_lessons=total_lessons,
            average_quiz_score=avg_quiz,
            evaluations_completed=completed_evals,
            total_evaluations=len(course_evals)
        ))
    
    return progress_list

# ==================== PARENT ENDPOINTS ====================

@app.post("/api/parents/link")
async def link_parent_to_student(link: ParentStudentLink):
    if link.parent_id not in users_db:
        raise HTTPException(status_code=404, detail="Padre no encontrado")
    if link.student_id not in users_db:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    if users_db[link.parent_id]["role"] != UserRole.PARENT:
        raise HTTPException(status_code=400, detail="El usuario no es un padre")
    if users_db[link.student_id]["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="El usuario no es un estudiante")
    
    # Check if link already exists
    for existing in parent_student_links:
        if existing["parent_id"] == link.parent_id and existing["student_id"] == link.student_id:
            raise HTTPException(status_code=400, detail="Vinculo ya existe")
    
    parent_student_links.append({
        "parent_id": link.parent_id,
        "student_id": link.student_id
    })
    return {"message": "Vinculo creado"}

@app.get("/api/parents/{parent_id}/children", response_model=List[ChildProgress])
async def get_children_progress(parent_id: int):
    if parent_id not in users_db:
        raise HTTPException(status_code=404, detail="Padre no encontrado")
    
    if users_db[parent_id]["role"] != UserRole.PARENT:
        raise HTTPException(status_code=400, detail="El usuario no es un padre")
    
    children = []
    for link in parent_student_links:
        if link["parent_id"] == parent_id:
            student_id = link["student_id"]
            if student_id in users_db:
                student = users_db[student_id]
                progress = await get_student_progress(student_id)
                children.append(ChildProgress(
                    student=User(
                        id=student_id,
                        email=student["email"],
                        name=student["name"],
                        role=student["role"],
                        created_at=student["created_at"],
                        is_active=student["is_active"]
                    ),
                    courses=progress
                ))
    
    return children

# ==================== STATISTICS ENDPOINTS (Director) ====================

@app.get("/api/statistics")
async def get_statistics():
    total_users = len(users_db)
    total_students = len([u for u in users_db.values() if u["role"] == UserRole.STUDENT])
    total_teachers = len([u for u in users_db.values() if u["role"] == UserRole.TEACHER])
    total_parents = len([u for u in users_db.values() if u["role"] == UserRole.PARENT])
    total_courses = len(courses_db)
    published_courses = len([c for c in courses_db.values() if c["is_published"]])
    total_enrollments = len(enrollments_db)
    total_lessons = len(lessons_db)
    total_evaluations = len(evaluations_db)
    
    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_parents": total_parents,
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_enrollments": total_enrollments,
        "total_lessons": total_lessons,
        "total_evaluations": total_evaluations
    }

# ==================== MESSAGING ENDPOINTS ====================

@app.get("/api/messages/conversations", response_model=List[Conversation])
async def get_conversations(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    conversations = {}
    for msg in messages_db.values():
        other_id = msg["receiver_id"] if msg["sender_id"] == user_id else msg["sender_id"]
        if msg["sender_id"] != user_id and msg["receiver_id"] != user_id:
            continue
        
        if other_id not in conversations:
            other_user = users_db.get(other_id)
            if other_user:
                conversations[other_id] = {
                    "user_id": other_id,
                    "user_name": other_user["name"],
                    "user_role": other_user["role"],
                    "last_message": msg["content"],
                    "last_message_time": msg["created_at"],
                    "unread_count": 0
                }
        
        if msg["created_at"] > conversations[other_id]["last_message_time"]:
            conversations[other_id]["last_message"] = msg["content"]
            conversations[other_id]["last_message_time"] = msg["created_at"]
        
        if msg["receiver_id"] == user_id and not msg["is_read"]:
            conversations[other_id]["unread_count"] += 1
    
    return sorted(
        [Conversation(**c) for c in conversations.values()],
        key=lambda x: x.last_message_time,
        reverse=True
    )

@app.get("/api/messages/{other_user_id}", response_model=List[Message])
async def get_messages(other_user_id: int, user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if other_user_id not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    messages = []
    for msg in messages_db.values():
        if (msg["sender_id"] == user_id and msg["receiver_id"] == other_user_id) or \
           (msg["sender_id"] == other_user_id and msg["receiver_id"] == user_id):
            messages.append(Message(**msg))
    
    return sorted(messages, key=lambda x: x.created_at)

@app.post("/api/messages", response_model=Message)
async def send_message(message: MessageCreate, sender_id: int):
    if sender_id not in users_db:
        raise HTTPException(status_code=404, detail="Remitente no encontrado")
    if message.receiver_id not in users_db:
        raise HTTPException(status_code=404, detail="Destinatario no encontrado")
    
    msg_id = get_next_message_id()
    sender = users_db[sender_id]
    receiver = users_db[message.receiver_id]
    
    messages_db[msg_id] = {
        "id": msg_id,
        "sender_id": sender_id,
        "sender_name": sender["name"],
        "receiver_id": message.receiver_id,
        "receiver_name": receiver["name"],
        "content": message.content,
        "is_read": False,
        "created_at": datetime.now()
    }
    return Message(**messages_db[msg_id])

@app.post("/api/messages/{message_id}/read")
async def mark_message_read(message_id: int):
    if message_id not in messages_db:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    messages_db[message_id]["is_read"] = True
    return {"message": "Mensaje marcado como leido"}

@app.post("/api/messages/read-all")
async def mark_all_read(user_id: int, other_user_id: int):
    for msg in messages_db.values():
        if msg["sender_id"] == other_user_id and msg["receiver_id"] == user_id:
            msg["is_read"] = True
    return {"message": "Mensajes marcados como leidos"}

@app.get("/api/messages/contacts", response_model=List[User])
async def get_contacts(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user = users_db[user_id]
    contacts = []
    
    if user["role"] == UserRole.STUDENT:
        for u in users_db.values():
            if u["role"] in [UserRole.TEACHER, UserRole.DIRECTOR]:
                contacts.append(User(
                    id=u["id"],
                    email=u["email"],
                    name=u["name"],
                    role=u["role"],
                    created_at=u["created_at"],
                    is_active=u["is_active"]
                ))
    elif user["role"] == UserRole.PARENT:
        for u in users_db.values():
            if u["role"] in [UserRole.TEACHER, UserRole.DIRECTOR]:
                contacts.append(User(
                    id=u["id"],
                    email=u["email"],
                    name=u["name"],
                    role=u["role"],
                    created_at=u["created_at"],
                    is_active=u["is_active"]
                ))
    elif user["role"] in [UserRole.TEACHER, UserRole.DIRECTOR]:
        for u in users_db.values():
            if u["id"] != user_id:
                contacts.append(User(
                    id=u["id"],
                    email=u["email"],
                    name=u["name"],
                    role=u["role"],
                    created_at=u["created_at"],
                    is_active=u["is_active"]
                ))
    
    return contacts

# ==================== SITE CONTENT ENDPOINTS ====================

# Default site content
DEFAULT_SITE_CONTENT = {
    "hero": {
        "title": "Empowering Vulnerable Communities Through Education",
        "subtitle": "Emunah Academy provides free, quality education to children from underserved communities around the world. Join us in transforming lives through learning.",
        "cta_primary": "Apply Now",
        "cta_secondary": "Learn More"
    },
    "about": {
        "title": "About Emunah Academy",
        "description": "Emunah Academy is a non-profit educational organization dedicated to providing quality education to vulnerable communities worldwide. Our mission is to break the cycle of poverty through education, offering comprehensive programs from Kindergarten through 8th grade.",
        "mission": "To empower children from underserved communities with the knowledge, skills, and values they need to succeed in life.",
        "vision": "A world where every child has access to quality education, regardless of their circumstances."
    },
    "how_it_works": {
        "title": "How It Works",
        "steps": [
            {"number": "1", "title": "Apply", "description": "Fill out our simple application form with your child's information."},
            {"number": "2", "title": "Review", "description": "Our team reviews your application and contacts you within 48 hours."},
            {"number": "3", "title": "Enroll", "description": "Once approved, your child gains access to our complete learning platform."},
            {"number": "4", "title": "Learn", "description": "Students access video lessons, interactive quizzes, and personalized support."}
        ]
    },
    "programs": {
        "title": "Our Programs",
        "subtitle": "Comprehensive education from Kindergarten through 8th Grade",
        "grades": [
            {"level": "K", "name": "Kindergarten", "description": "Foundation skills in reading, math, and social development"},
            {"level": "1-2", "name": "Early Elementary", "description": "Building core literacy and numeracy skills"},
            {"level": "3-5", "name": "Upper Elementary", "description": "Expanding knowledge in science, history, and critical thinking"},
            {"level": "6-8", "name": "Middle School", "description": "Preparing students for high school with advanced subjects"}
        ]
    },
    "impact": {
        "title": "Our Impact",
        "stats": [
            {"number": "500+", "label": "Students Enrolled"},
            {"number": "15+", "label": "Countries Reached"},
            {"number": "50+", "label": "Expert Teachers"},
            {"number": "95%", "label": "Completion Rate"}
        ]
    },
    "faq": {
        "title": "Frequently Asked Questions",
        "questions": [
            {"question": "Is Emunah Academy really free?", "answer": "Yes! Emunah Academy is completely free for all students. We are funded by generous donors who believe in our mission."},
            {"question": "What grades do you offer?", "answer": "We offer comprehensive education from Kindergarten through 8th grade, covering all core subjects."},
            {"question": "What technology do I need?", "answer": "Students need a device with internet access (computer, tablet, or smartphone) to access our online platform."},
            {"question": "How do I apply?", "answer": "Simply fill out our application form on this page. A parent or guardian must complete the application for students under 18."},
            {"question": "What language are classes taught in?", "answer": "Currently, our classes are taught in English with plans to expand to Spanish and other languages."}
        ]
    },
    "contact": {
        "title": "Contact Us",
        "email": "info@emunahacademy.org",
        "phone": "",
        "address": ""
    }
}

@app.get("/api/site-content")
async def get_all_site_content():
    content = {}
    for section in DEFAULT_SITE_CONTENT.keys():
        if section in site_content_db:
            content[section] = site_content_db[section]["content"]
        else:
            content[section] = DEFAULT_SITE_CONTENT[section]
    return content

@app.get("/api/site-content/{section}")
async def get_site_content(section: str):
    if section in site_content_db:
        return SiteContent(
            section=section,
            content=site_content_db[section]["content"],
            updated_at=site_content_db[section]["updated_at"]
        )
    elif section in DEFAULT_SITE_CONTENT:
        return SiteContent(
            section=section,
            content=DEFAULT_SITE_CONTENT[section],
            updated_at=datetime.now()
        )
    raise HTTPException(status_code=404, detail="Section not found")

@app.put("/api/site-content/{section}")
async def update_site_content(section: str, update: SiteContentUpdate):
    if section not in DEFAULT_SITE_CONTENT:
        raise HTTPException(status_code=400, detail="Invalid section")
    
    site_content_db[section] = {
        "section": section,
        "content": update.content,
        "updated_at": datetime.now()
    }
    return SiteContent(
        section=section,
        content=update.content,
        updated_at=site_content_db[section]["updated_at"]
    )

# ==================== STUDENT APPLICATION ENDPOINTS ====================

@app.get("/api/applications", response_model=List[StudentApplication])
async def get_applications(status: Optional[ApplicationStatus] = None):
    apps = []
    for app_id, application in applications_db.items():
        if status and application["status"] != status:
            continue
        apps.append(StudentApplication(**application))
    return sorted(apps, key=lambda x: x.created_at, reverse=True)

@app.get("/api/applications/{application_id}", response_model=StudentApplication)
async def get_application(application_id: int):
    if application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")
    return StudentApplication(**applications_db[application_id])

@app.post("/api/applications", response_model=StudentApplication)
async def create_application(application: StudentApplicationCreate):
    app_id = get_next_application_id()
    applications_db[app_id] = {
        "id": app_id,
        "student_name": application.student_name,
        "student_age": application.student_age,
        "grade_level": application.grade_level,
        "parent_name": application.parent_name,
        "parent_email": application.parent_email,
        "parent_phone": application.parent_phone,
        "address": application.address,
        "message": application.message,
        "status": ApplicationStatus.PENDING,
        "created_at": datetime.now(),
        "reviewed_at": None,
        "reviewed_by": None
    }
    return StudentApplication(**applications_db[app_id])

@app.put("/api/applications/{application_id}/status")
async def update_application_status(
    application_id: int, 
    status: ApplicationStatus,
    reviewed_by: int
):
    if application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if reviewed_by not in users_db:
        raise HTTPException(status_code=404, detail="Reviewer not found")
    
    reviewer = users_db[reviewed_by]
    if reviewer["role"] not in [UserRole.SUPERUSER, UserRole.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Only superuser or director can review applications")
    
    applications_db[application_id]["status"] = status
    applications_db[application_id]["reviewed_at"] = datetime.now()
    applications_db[application_id]["reviewed_by"] = reviewed_by
    
    return StudentApplication(**applications_db[application_id])

@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: int):
    if application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")
    del applications_db[application_id]
    return {"message": "Application deleted"}

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
import json
import os

from app.models import (
    UserCreate, User as UserSchema, UserLogin, Token, UserRole,
    CourseCreate, Course as CourseSchema, LessonCreate, Lesson as LessonSchema, LessonType,
    EvaluationCreate, Evaluation as EvaluationSchema, EvaluationSubmission as EvaluationSubmissionSchema, EvaluationGrade, StudentEvaluation,
    CalendarEventCreate, CalendarEvent as CalendarEventSchema,
    QuizSubmission, QuizResult as QuizResultSchema, QuizQuestion,
    EnrollmentCreate, Enrollment as EnrollmentSchema,
    StudentProgress, ParentStudentLink as ParentStudentLinkSchema, ChildProgress,
    MessageCreate, Message as MessageSchema, Conversation,
    SiteContentUpdate, SiteContent,
    StudentApplicationCreate, StudentApplication, ApplicationStatus
)
from app.db_config import get_db, engine
from app.db_models import (
    Base, User, Course, Lesson, Enrollment, CalendarEvent, ParentStudentLink,
    QuizResult, Evaluation, EvaluationSubmission, LessonCompletion, Message,
    UserRoleEnum, LessonTypeEnum, EventTypeEnum
)
from app.db_init import init_database

# In-memory storage for site content and applications (these don't need persistence for now)
site_content_db = {}
applications_db = {}
application_counter = 0

def get_next_application_id():
    global application_counter
    application_counter += 1
    return application_counter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
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
async def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    db_user = User(
        email=user.email,
        name=user.name,
        role=UserRoleEnum(user.role.value),
        password=user.password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    user_data = UserSchema(
        id=db_user.id,
        email=db_user.email,
        name=db_user.name,
        role=UserRole(db_user.role.value),
        created_at=db_user.created_at,
        is_active=db_user.is_active
    )
    
    return Token(
        access_token=f"token_{db_user.id}",
        token_type="bearer",
        user=user_data
    )

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == credentials.email,
        User.password == credentials.password
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    
    user_data = UserSchema(
        id=user.id,
        email=user.email,
        name=user.name,
        role=UserRole(user.role.value),
        grade_level=user.grade_level,
        created_at=user.created_at,
        is_active=user.is_active
    )
    return Token(
        access_token=f"token_{user.id}",
        token_type="bearer",
        user=user_data
    )

@app.get("/api/auth/me", response_model=UserSchema)
async def get_current_user(token: str, db: Session = Depends(get_db)):
    try:
        user_id = int(token.replace("token_", ""))
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return UserSchema(
                id=user.id,
                email=user.email,
                name=user.name,
                role=UserRole(user.role.value),
                grade_level=user.grade_level,
                created_at=user.created_at,
                is_active=user.is_active
            )
    except (ValueError, KeyError):
        pass
    raise HTTPException(status_code=401, detail="Token invalido")

# ==================== USER MANAGEMENT ====================

@app.get("/api/users", response_model=List[UserSchema])
async def get_users(role: Optional[UserRole] = None, grade_level: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == UserRoleEnum(role.value))
    if grade_level:
        query = query.filter(User.grade_level == grade_level)
    
    users = query.all()
    return [UserSchema(
        id=u.id,
        email=u.email,
        name=u.name,
        role=UserRole(u.role.value),
        grade_level=u.grade_level,
        created_at=u.created_at,
        is_active=u.is_active
    ) for u in users]

@app.get("/api/users/{user_id}", response_model=UserSchema)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserSchema(
        id=user.id,
        email=user.email,
        name=user.name,
        role=UserRole(user.role.value),
        grade_level=user.grade_level,
        created_at=user.created_at,
        is_active=user.is_active
    )

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado"}

@app.put("/api/users/{user_id}/grade")
async def update_user_grade(user_id: int, grade_level: Optional[str] = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role != UserRoleEnum.STUDENT:
        raise HTTPException(status_code=400, detail="Solo estudiantes pueden tener grado asignado")
    
    user.grade_level = grade_level
    db.commit()
    db.refresh(user)
    
    return UserSchema(
        id=user.id,
        email=user.email,
        name=user.name,
        role=UserRole(user.role.value),
        grade_level=user.grade_level,
        created_at=user.created_at,
        is_active=user.is_active
    )

# ==================== COURSE ENDPOINTS ====================

@app.get("/api/courses", response_model=List[CourseSchema])
async def get_courses(teacher_id: Optional[int] = None, published_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(Course)
    if teacher_id:
        query = query.filter(Course.teacher_id == teacher_id)
    if published_only:
        query = query.filter(Course.is_published == True)
    
    courses = query.all()
    return [CourseSchema(
        id=c.id,
        title=c.title,
        description=c.description,
        thumbnail_url=c.thumbnail_url,
        grade_level=c.grade_level,
        teacher_id=c.teacher_id,
        teacher_name=c.teacher.name if c.teacher else "Unknown",
        created_at=c.created_at,
        is_published=c.is_published
    ) for c in courses]

@app.get("/api/courses/{course_id}", response_model=CourseSchema)
async def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return CourseSchema(
        id=course.id,
        title=course.title,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        grade_level=course.grade_level,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher.name if course.teacher else "Unknown",
        created_at=course.created_at,
        is_published=course.is_published
    )

@app.post("/api/courses", response_model=CourseSchema)
async def create_course(course: CourseCreate, teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    
    if teacher.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Solo profesores pueden crear cursos")
    
    db_course = Course(
        title=course.title,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        grade_level=course.grade_level,
        teacher_id=teacher_id,
        is_published=False
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    
    return CourseSchema(
        id=db_course.id,
        title=db_course.title,
        description=db_course.description,
        thumbnail_url=db_course.thumbnail_url,
        grade_level=db_course.grade_level,
        teacher_id=db_course.teacher_id,
        teacher_name=teacher.name,
        created_at=db_course.created_at,
        is_published=db_course.is_published
    )

@app.put("/api/courses/{course_id}", response_model=CourseSchema)
async def update_course(course_id: int, course: CourseCreate, db: Session = Depends(get_db)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    db_course.title = course.title
    db_course.description = course.description
    db_course.thumbnail_url = course.thumbnail_url
    db_course.grade_level = course.grade_level
    db.commit()
    db.refresh(db_course)
    
    return CourseSchema(
        id=db_course.id,
        title=db_course.title,
        description=db_course.description,
        thumbnail_url=db_course.thumbnail_url,
        grade_level=db_course.grade_level,
        teacher_id=db_course.teacher_id,
        teacher_name=db_course.teacher.name if db_course.teacher else "Unknown",
        created_at=db_course.created_at,
        is_published=db_course.is_published
    )

@app.post("/api/courses/{course_id}/publish")
async def publish_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    course.is_published = True
    db.commit()
    return {"message": "Curso publicado"}

@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    db.delete(course)
    db.commit()
    return {"message": "Curso eliminado"}

# ==================== LESSON ENDPOINTS ====================

@app.get("/api/courses/{course_id}/lessons", response_model=List[LessonSchema])
async def get_lessons(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    lessons = db.query(Lesson).filter(Lesson.course_id == course_id).order_by(Lesson.order).all()
    return [LessonSchema(
        id=l.id,
        course_id=l.course_id,
        title=l.title,
        lesson_type=LessonType(l.lesson_type.value),
        content=l.content,
        order=l.order,
        created_at=l.created_at
    ) for l in lessons]

@app.get("/api/lessons/{lesson_id}", response_model=LessonSchema)
async def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    return LessonSchema(
        id=lesson.id,
        course_id=lesson.course_id,
        title=lesson.title,
        lesson_type=LessonType(lesson.lesson_type.value),
        content=lesson.content,
        order=lesson.order,
        created_at=lesson.created_at
    )

@app.post("/api/lessons", response_model=LessonSchema)
async def create_lesson(lesson: LessonCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    db_lesson = Lesson(
        course_id=lesson.course_id,
        title=lesson.title,
        lesson_type=LessonTypeEnum(lesson.lesson_type.value),
        content=lesson.content,
        order=lesson.order
    )
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    
    return LessonSchema(
        id=db_lesson.id,
        course_id=db_lesson.course_id,
        title=db_lesson.title,
        lesson_type=LessonType(db_lesson.lesson_type.value),
        content=db_lesson.content,
        order=db_lesson.order,
        created_at=db_lesson.created_at
    )

@app.put("/api/lessons/{lesson_id}", response_model=LessonSchema)
async def update_lesson(lesson_id: int, lesson: LessonCreate, db: Session = Depends(get_db)):
    db_lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    
    db_lesson.title = lesson.title
    db_lesson.lesson_type = LessonTypeEnum(lesson.lesson_type.value)
    db_lesson.content = lesson.content
    db_lesson.order = lesson.order
    db.commit()
    db.refresh(db_lesson)
    
    return LessonSchema(
        id=db_lesson.id,
        course_id=db_lesson.course_id,
        title=db_lesson.title,
        lesson_type=LessonType(db_lesson.lesson_type.value),
        content=db_lesson.content,
        order=db_lesson.order,
        created_at=db_lesson.created_at
    )

@app.delete("/api/lessons/{lesson_id}")
async def delete_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    db.delete(lesson)
    db.commit()
    return {"message": "Leccion eliminada"}

@app.post("/api/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: int, student_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    
    existing = db.query(LessonCompletion).filter(
        LessonCompletion.lesson_id == lesson_id,
        LessonCompletion.student_id == student_id
    ).first()
    
    if existing:
        return {"message": "Leccion ya completada"}
    
    completion = LessonCompletion(
        student_id=student_id,
        lesson_id=lesson_id
    )
    db.add(completion)
    db.commit()
    return {"message": "Leccion completada"}

# ==================== QUIZ ENDPOINTS ====================

@app.post("/api/quizzes/submit", response_model=QuizResultSchema)
async def submit_quiz(submission: QuizSubmission, student_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == submission.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Quiz no encontrado")
    
    if lesson.lesson_type != LessonTypeEnum.QUIZ:
        raise HTTPException(status_code=400, detail="Esta leccion no es un quiz")
    
    questions = json.loads(lesson.content)
    
    correct = 0
    for i, answer in enumerate(submission.answers):
        if i < len(questions) and questions[i]["correct_answer"] == answer:
            correct += 1
    
    score = (correct / len(questions)) * 100 if questions else 0
    
    db_result = QuizResult(
        lesson_id=submission.lesson_id,
        student_id=student_id,
        score=score,
        total_questions=len(questions),
        correct_answers=correct
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    await complete_lesson(submission.lesson_id, student_id, db)
    
    return QuizResultSchema(
        id=db_result.id,
        lesson_id=db_result.lesson_id,
        student_id=db_result.student_id,
        score=db_result.score,
        total_questions=db_result.total_questions,
        correct_answers=db_result.correct_answers,
        submitted_at=db_result.submitted_at
    )

@app.get("/api/quizzes/results/{student_id}", response_model=List[QuizResultSchema])
async def get_quiz_results(student_id: int, db: Session = Depends(get_db)):
    results = db.query(QuizResult).filter(QuizResult.student_id == student_id).all()
    return [QuizResultSchema(
        id=r.id,
        lesson_id=r.lesson_id,
        student_id=r.student_id,
        score=r.score,
        total_questions=r.total_questions,
        correct_answers=r.correct_answers,
        submitted_at=r.submitted_at
    ) for r in results]

# ==================== EVALUATION ENDPOINTS ====================

@app.get("/api/evaluations", response_model=List[EvaluationSchema])
async def get_evaluations(course_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Evaluation)
    if course_id:
        query = query.filter(Evaluation.course_id == course_id)
    
    evals = query.all()
    return [EvaluationSchema(
        id=e.id,
        title=e.title,
        description=e.description,
        course_id=e.course_id,
        due_date=e.due_date,
        max_score=e.max_score,
        created_at=e.created_at
    ) for e in evals]

@app.get("/api/evaluations/{evaluation_id}", response_model=EvaluationSchema)
async def get_evaluation(evaluation_id: int, db: Session = Depends(get_db)):
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluacion no encontrada")
    return EvaluationSchema(
        id=evaluation.id,
        title=evaluation.title,
        description=evaluation.description,
        course_id=evaluation.course_id,
        due_date=evaluation.due_date,
        max_score=evaluation.max_score,
        created_at=evaluation.created_at
    )

@app.post("/api/evaluations", response_model=EvaluationSchema)
async def create_evaluation(evaluation: EvaluationCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == evaluation.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    db_eval = Evaluation(
        title=evaluation.title,
        description=evaluation.description,
        course_id=evaluation.course_id,
        due_date=evaluation.due_date,
        max_score=evaluation.max_score
    )
    db.add(db_eval)
    db.commit()
    db.refresh(db_eval)
    
    return EvaluationSchema(
        id=db_eval.id,
        title=db_eval.title,
        description=db_eval.description,
        course_id=db_eval.course_id,
        due_date=db_eval.due_date,
        max_score=db_eval.max_score,
        created_at=db_eval.created_at
    )

@app.post("/api/evaluations/submit", response_model=StudentEvaluation)
async def submit_evaluation(submission: EvaluationSubmissionSchema, student_id: int, db: Session = Depends(get_db)):
    evaluation = db.query(Evaluation).filter(Evaluation.id == submission.evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluacion no encontrada")
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    db_submission = EvaluationSubmission(
        evaluation_id=submission.evaluation_id,
        student_id=student_id,
        content=submission.content
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    
    return StudentEvaluation(
        id=db_submission.id,
        evaluation_id=db_submission.evaluation_id,
        student_id=db_submission.student_id,
        student_name=student.name,
        content=db_submission.content,
        score=db_submission.score,
        feedback=db_submission.feedback,
        submitted_at=db_submission.submitted_at,
        graded_at=db_submission.graded_at
    )

@app.get("/api/evaluations/{evaluation_id}/submissions", response_model=List[StudentEvaluation])
async def get_evaluation_submissions(evaluation_id: int, db: Session = Depends(get_db)):
    submissions = db.query(EvaluationSubmission).filter(
        EvaluationSubmission.evaluation_id == evaluation_id
    ).all()
    
    result = []
    for s in submissions:
        student = db.query(User).filter(User.id == s.student_id).first()
        result.append(StudentEvaluation(
            id=s.id,
            evaluation_id=s.evaluation_id,
            student_id=s.student_id,
            student_name=student.name if student else "Unknown",
            content=s.content,
            score=s.score,
            feedback=s.feedback,
            submitted_at=s.submitted_at,
            graded_at=s.graded_at
        ))
    return result

@app.post("/api/evaluations/grade", response_model=StudentEvaluation)
async def grade_evaluation(grade: EvaluationGrade, db: Session = Depends(get_db)):
    submission = db.query(EvaluationSubmission).filter(
        EvaluationSubmission.id == grade.submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    submission.score = grade.score
    submission.feedback = grade.feedback
    submission.graded_at = datetime.now()
    db.commit()
    db.refresh(submission)
    
    student = db.query(User).filter(User.id == submission.student_id).first()
    return StudentEvaluation(
        id=submission.id,
        evaluation_id=submission.evaluation_id,
        student_id=submission.student_id,
        student_name=student.name if student else "Unknown",
        content=submission.content,
        score=submission.score,
        feedback=submission.feedback,
        submitted_at=submission.submitted_at,
        graded_at=submission.graded_at
    )

# ==================== CALENDAR ENDPOINTS ====================

@app.get("/api/calendar", response_model=List[CalendarEventSchema])
async def get_calendar_events(
    course_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CalendarEvent)
    if course_id:
        query = query.filter(CalendarEvent.course_id == course_id)
    if start_date:
        query = query.filter(CalendarEvent.start_time >= start_date)
    if end_date:
        query = query.filter(CalendarEvent.end_time <= end_date)
    
    events = query.order_by(CalendarEvent.start_time).all()
    return [CalendarEventSchema(
        id=e.id,
        title=e.title,
        description=e.description,
        event_type=e.event_type.value,
        start_time=e.start_time,
        end_time=e.end_time,
        course_id=e.course_id,
        created_by=e.created_by,
        created_at=e.created_at
    ) for e in events]

@app.post("/api/calendar", response_model=CalendarEventSchema)
async def create_calendar_event(event: CalendarEventCreate, created_by: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == created_by).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db_event = CalendarEvent(
        title=event.title,
        description=event.description,
        event_type=EventTypeEnum(event.event_type.value),
        start_time=event.start_time,
        end_time=event.end_time,
        course_id=event.course_id,
        created_by=created_by
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return CalendarEventSchema(
        id=db_event.id,
        title=db_event.title,
        description=db_event.description,
        event_type=db_event.event_type.value,
        start_time=db_event.start_time,
        end_time=db_event.end_time,
        course_id=db_event.course_id,
        created_by=db_event.created_by,
        created_at=db_event.created_at
    )

@app.delete("/api/calendar/{event_id}")
async def delete_calendar_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    db.delete(event)
    db.commit()
    return {"message": "Evento eliminado"}

# ==================== ENROLLMENT ENDPOINTS ====================

@app.get("/api/enrollments", response_model=List[EnrollmentSchema])
async def get_enrollments(student_id: Optional[int] = None, course_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Enrollment)
    if student_id:
        query = query.filter(Enrollment.student_id == student_id)
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    
    enrollments = query.all()
    return [EnrollmentSchema(
        id=e.id,
        student_id=e.student_id,
        course_id=e.course_id,
        enrolled_at=e.enrolled_at
    ) for e in enrollments]

@app.post("/api/enrollments", response_model=EnrollmentSchema)
async def create_enrollment(enrollment: EnrollmentCreate, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == enrollment.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == enrollment.student_id,
        Enrollment.course_id == enrollment.course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Estudiante ya inscrito en este curso")
    
    db_enrollment = Enrollment(
        student_id=enrollment.student_id,
        course_id=enrollment.course_id
    )
    db.add(db_enrollment)
    db.commit()
    db.refresh(db_enrollment)
    
    return EnrollmentSchema(
        id=db_enrollment.id,
        student_id=db_enrollment.student_id,
        course_id=db_enrollment.course_id,
        enrolled_at=db_enrollment.enrolled_at
    )

@app.delete("/api/enrollments/{enrollment_id}")
async def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")
    db.delete(enrollment)
    db.commit()
    return {"message": "Inscripcion eliminada"}

# ==================== PROGRESS ENDPOINTS ====================

@app.get("/api/progress/{student_id}", response_model=List[StudentProgress])
async def get_student_progress(student_id: int, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    progress_list = []
    
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    
    for enrollment in enrollments:
        course = db.query(Course).filter(Course.id == enrollment.course_id).first()
        if not course:
            continue
        
        lessons = db.query(Lesson).filter(Lesson.course_id == course.id).all()
        total_lessons = len(lessons)
        
        lesson_ids = [l.id for l in lessons]
        completed = db.query(LessonCompletion).filter(
            LessonCompletion.student_id == student_id,
            LessonCompletion.lesson_id.in_(lesson_ids)
        ).count() if lesson_ids else 0
        
        quiz_lesson_ids = [l.id for l in lessons if l.lesson_type == LessonTypeEnum.QUIZ]
        quiz_results = db.query(QuizResult).filter(
            QuizResult.student_id == student_id,
            QuizResult.lesson_id.in_(quiz_lesson_ids)
        ).all() if quiz_lesson_ids else []
        avg_quiz = sum(r.score for r in quiz_results) / len(quiz_results) if quiz_results else None
        
        evaluations = db.query(Evaluation).filter(Evaluation.course_id == course.id).all()
        eval_ids = [e.id for e in evaluations]
        completed_evals = db.query(EvaluationSubmission).filter(
            EvaluationSubmission.student_id == student_id,
            EvaluationSubmission.evaluation_id.in_(eval_ids)
        ).count() if eval_ids else 0
        
        progress_list.append(StudentProgress(
            student_id=student_id,
            student_name=student.name,
            course_id=course.id,
            course_title=course.title,
            completed_lessons=completed,
            total_lessons=total_lessons,
            average_quiz_score=avg_quiz,
            evaluations_completed=completed_evals,
            total_evaluations=len(evaluations)
        ))
    
    return progress_list

# ==================== PARENT ENDPOINTS ====================

@app.post("/api/parents/link")
async def link_parent_to_student(link: ParentStudentLinkSchema, db: Session = Depends(get_db)):
    parent = db.query(User).filter(User.id == link.parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Padre no encontrado")
    
    student = db.query(User).filter(User.id == link.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    if parent.role != UserRoleEnum.PARENT:
        raise HTTPException(status_code=400, detail="El usuario no es un padre")
    if student.role != UserRoleEnum.STUDENT:
        raise HTTPException(status_code=400, detail="El usuario no es un estudiante")
    
    existing = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == link.parent_id,
        ParentStudentLink.student_id == link.student_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vinculo ya existe")
    
    db_link = ParentStudentLink(
        parent_id=link.parent_id,
        student_id=link.student_id
    )
    db.add(db_link)
    db.commit()
    return {"message": "Vinculo creado"}

@app.get("/api/parents/{parent_id}/children", response_model=List[ChildProgress])
async def get_children_progress(parent_id: int, db: Session = Depends(get_db)):
    parent = db.query(User).filter(User.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Padre no encontrado")
    
    if parent.role != UserRoleEnum.PARENT:
        raise HTTPException(status_code=400, detail="El usuario no es un padre")
    
    children = []
    links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_id == parent_id).all()
    
    for link in links:
        student = db.query(User).filter(User.id == link.student_id).first()
        if student:
            progress = await get_student_progress(student.id, db)
            children.append(ChildProgress(
                student=UserSchema(
                    id=student.id,
                    email=student.email,
                    name=student.name,
                    role=UserRole(student.role.value),
                    created_at=student.created_at,
                    is_active=student.is_active
                ),
                courses=progress
            ))
    
    return children

# ==================== STATISTICS ENDPOINTS ====================

@app.get("/api/statistics")
async def get_statistics(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == UserRoleEnum.STUDENT).count()
    total_teachers = db.query(User).filter(User.role == UserRoleEnum.TEACHER).count()
    total_parents = db.query(User).filter(User.role == UserRoleEnum.PARENT).count()
    total_courses = db.query(Course).count()
    published_courses = db.query(Course).filter(Course.is_published == True).count()
    total_enrollments = db.query(Enrollment).count()
    total_lessons = db.query(Lesson).count()
    total_evaluations = db.query(Evaluation).count()
    
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
async def get_conversations(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    messages = db.query(Message).filter(
        (Message.sender_id == user_id) | (Message.receiver_id == user_id)
    ).all()
    
    conversations = {}
    for msg in messages:
        other_id = msg.receiver_id if msg.sender_id == user_id else msg.sender_id
        
        if other_id not in conversations:
            other_user = db.query(User).filter(User.id == other_id).first()
            if other_user:
                conversations[other_id] = {
                    "user_id": other_id,
                    "user_name": other_user.name,
                    "user_role": UserRole(other_user.role.value),
                    "last_message": msg.content,
                    "last_message_time": msg.created_at,
                    "unread_count": 0
                }
        
        if other_id in conversations and msg.created_at > conversations[other_id]["last_message_time"]:
            conversations[other_id]["last_message"] = msg.content
            conversations[other_id]["last_message_time"] = msg.created_at
        
        if other_id in conversations and msg.receiver_id == user_id and not msg.is_read:
            conversations[other_id]["unread_count"] += 1
    
    return sorted(
        [Conversation(**c) for c in conversations.values()],
        key=lambda x: x.last_message_time,
        reverse=True
    )

@app.get("/api/messages/{other_user_id}", response_model=List[MessageSchema])
async def get_messages(other_user_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    other_user = db.query(User).filter(User.id == other_user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    messages = db.query(Message).filter(
        ((Message.sender_id == user_id) & (Message.receiver_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.receiver_id == user_id))
    ).order_by(Message.created_at).all()
    
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        receiver = db.query(User).filter(User.id == msg.receiver_id).first()
        result.append(MessageSchema(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=sender.name if sender else "Unknown",
            receiver_id=msg.receiver_id,
            receiver_name=receiver.name if receiver else "Unknown",
            content=msg.content,
            is_read=msg.is_read,
            created_at=msg.created_at
        ))
    return result

@app.post("/api/messages", response_model=MessageSchema)
async def send_message(message: MessageCreate, sender_id: int, db: Session = Depends(get_db)):
    sender = db.query(User).filter(User.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Remitente no encontrado")
    
    receiver = db.query(User).filter(User.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Destinatario no encontrado")
    
    db_message = Message(
        sender_id=sender_id,
        receiver_id=message.receiver_id,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return MessageSchema(
        id=db_message.id,
        sender_id=db_message.sender_id,
        sender_name=sender.name,
        receiver_id=db_message.receiver_id,
        receiver_name=receiver.name,
        content=db_message.content,
        is_read=db_message.is_read,
        created_at=db_message.created_at
    )

@app.post("/api/messages/{message_id}/read")
async def mark_message_read(message_id: int, db: Session = Depends(get_db)):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    message.is_read = True
    db.commit()
    return {"message": "Mensaje marcado como leido"}

@app.post("/api/messages/read-all")
async def mark_all_read(user_id: int, other_user_id: int, db: Session = Depends(get_db)):
    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == user_id
    ).update({"is_read": True})
    db.commit()
    return {"message": "Mensajes marcados como leidos"}

@app.get("/api/messages/contacts", response_model=List[UserSchema])
async def get_contacts(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role == UserRoleEnum.STUDENT:
        users = db.query(User).filter(
            User.role.in_([UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR])
        ).all()
    elif user.role == UserRoleEnum.PARENT:
        users = db.query(User).filter(
            User.role.in_([UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR])
        ).all()
    elif user.role in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR]:
        users = db.query(User).filter(User.id != user_id).all()
    else:
        users = db.query(User).filter(User.id != user_id).all()
    
    return [UserSchema(
        id=u.id,
        email=u.email,
        name=u.name,
        role=UserRole(u.role.value),
        created_at=u.created_at,
        is_active=u.is_active
    ) for u in users]

# ==================== SITE CONTENT ENDPOINTS ====================

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
async def get_applications(status: Optional[ApplicationStatus] = None, db: Session = Depends(get_db)):
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
    reviewed_by: int,
    db: Session = Depends(get_db)
):
    if application_id not in applications_db:
        raise HTTPException(status_code=404, detail="Application not found")
    
    reviewer = db.query(User).filter(User.id == reviewed_by).first()
    if not reviewer:
        raise HTTPException(status_code=404, detail="Reviewer not found")
    
    if reviewer.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR]:
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

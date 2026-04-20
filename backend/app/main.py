from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
import json
import os
import uuid
import shutil
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

_email_executor = ThreadPoolExecutor(max_workers=2)

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB max file size
MAX_BOOK_FILE_SIZE = 50 * 1024 * 1024  # 50MB max for book PDFs

from app.models import (
    UserCreate, User as UserSchema, UserLogin, Token, UserRole, ChangePassword,
    CourseCreate, Course as CourseSchema, LessonCreate, Lesson as LessonSchema, LessonType,
    EvaluationCreate, Evaluation as EvaluationSchema, EvaluationSubmission as EvaluationSubmissionSchema, EvaluationGrade, StudentEvaluation,
    CalendarEventCreate, CalendarEvent as CalendarEventSchema,
    QuizSubmission, QuizResult as QuizResultSchema, QuizQuestion,
    EnrollmentCreate, Enrollment as EnrollmentSchema,
    StudentProgress, ParentStudentLink as ParentStudentLinkSchema, ChildProgress,
    MessageCreate, Message as MessageSchema, Conversation,
    SiteContentUpdate, SiteContent,
    StudentApplicationCreate, StudentApplication, ApplicationStatus,
    PaymentCreate, PaymentUpdate, Payment as PaymentSchema, PaymentStatus,
    AssignmentCreate, Assignment as AssignmentSchema, AssignmentSubmissionCreate, 
    AssignmentSubmissionGrade, AssignmentSubmission as AssignmentSubmissionSchema, 
    AssignmentStatus, StudentAssignment,
    BookCategoryCreate, BookCategory as BookCategorySchema, BookCreate, BookUpdate, Book as BookSchema
)
from app.db_config import get_db, engine
from app.db_models import (
    Base, User, Course, Lesson, Enrollment, CalendarEvent, ParentStudentLink,
    QuizResult, Evaluation, EvaluationSubmission, LessonCompletion, Message, Payment,
    Assignment, AssignmentSubmission, SiteContentDB, BookCategory, Book,
    UserRoleEnum, LessonTypeEnum, EventTypeEnum, PaymentStatusEnum, AssignmentStatusEnum
)
import json
from app.db_init import init_database

# In-memory storage for applications (site content is now persisted in the database)
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

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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

@app.put("/api/auth/change-password")
async def change_password(data: ChangePassword, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.password != data.current_password:
        raise HTTPException(status_code=400, detail="Contrasena actual incorrecta")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contrasena debe tener al menos 6 caracteres")
    
    user.password = data.new_password
    db.commit()
    return {"message": "Contrasena actualizada exitosamente"}

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
    grade_level: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CalendarEvent)
    if course_id:
        query = query.filter(CalendarEvent.course_id == course_id)
    if start_date:
        query = query.filter(CalendarEvent.start_time >= start_date)
    if end_date:
        query = query.filter(CalendarEvent.end_time <= end_date)
    
    # If user_id is provided, filter events for that user's grade level
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.role == UserRoleEnum.STUDENT and user.grade_level:
            # Show events for student's grade or events for all grades (grade_level is null)
            query = query.filter(
                (CalendarEvent.grade_level == user.grade_level) | 
                (CalendarEvent.grade_level == None)
            )
    elif grade_level:
        # Filter by specific grade level
        query = query.filter(CalendarEvent.grade_level == grade_level)
    
    events = query.order_by(CalendarEvent.start_time).all()
    return [CalendarEventSchema(
        id=e.id,
        title=e.title,
        description=e.description,
        event_type=e.event_type.value,
        start_time=e.start_time,
        end_time=e.end_time,
        course_id=e.course_id,
        grade_level=e.grade_level,
        created_by=e.created_by,
        created_at=e.created_at
    ) for e in events]

@app.post("/api/calendar", response_model=CalendarEventSchema)
async def create_calendar_event(event: CalendarEventCreate, created_by: int, notify: bool = False, db: Session = Depends(get_db)):
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
        grade_level=event.grade_level,
        created_by=created_by
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    # Send notifications to students if requested
    if notify:
        students_query = db.query(User).filter(User.role == UserRoleEnum.STUDENT)
        if event.grade_level:
            # Notify only students of the specific grade
            students_query = students_query.filter(User.grade_level == event.grade_level)
        
        students = students_query.all()
        notification_content = f"Nuevo evento en el calendario: {event.title}\nFecha: {event.start_time.strftime('%d/%m/%Y %H:%M')}"
        if event.description:
            notification_content += f"\nDescripcion: {event.description}"
        
        for student in students:
            notification = Message(
                sender_id=created_by,
                receiver_id=student.id,
                content=notification_content,
                is_read=False
            )
            db.add(notification)
        db.commit()
    
    return CalendarEventSchema(
        id=db_event.id,
        title=db_event.title,
        description=db_event.description,
        event_type=db_event.event_type.value,
        start_time=db_event.start_time,
        end_time=db_event.end_time,
        course_id=db_event.course_id,
        grade_level=db_event.grade_level,
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

# ==================== FILE UPLOAD ENDPOINTS ====================

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_ext = Path(file.filename).suffix.lower() if file.filename else ''
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de archivo no permitido. Tipos permitidos: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"Archivo demasiado grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    file_url = f"/uploads/{unique_filename}"
    
    is_image = file_ext in {'.jpg', '.jpeg', '.png', '.gif'}
    file_type = "image" if is_image else "document"
    
    return {
        "file_url": file_url,
        "file_name": file.filename,
        "file_type": file_type
    }

# ==================== MESSAGING ENDPOINTS ====================

@app.get("/api/messages/contacts", response_model=List[UserSchema])
async def get_contacts(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role == UserRoleEnum.STUDENT:
        users = db.query(User).filter(
            User.role.in_([UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER])
        ).all()
    elif user.role == UserRoleEnum.PARENT:
        users = db.query(User).filter(
            User.role.in_([UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER])
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

@app.get("/api/messages/unread-count")
async def get_unread_count(user_id: int, db: Session = Depends(get_db)):
    count = db.query(Message).filter(
        Message.receiver_id == user_id,
        Message.is_read == False
    ).count()
    return {"unread_count": count}

@app.post("/api/messages/read-all")
async def mark_all_read(user_id: int, other_user_id: int, db: Session = Depends(get_db)):
    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == user_id
    ).update({"is_read": True})
    db.commit()
    return {"message": "Mensajes marcados como leidos"}

@app.delete("/api/messages/conversation/{other_user_id}")
async def delete_conversation(other_user_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    messages_as_sender = db.query(Message).filter(
        Message.sender_id == user_id,
        Message.receiver_id == other_user_id
    ).all()
    for msg in messages_as_sender:
        msg.deleted_by_sender = True
    
    messages_as_receiver = db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == user_id
    ).all()
    for msg in messages_as_receiver:
        msg.deleted_by_receiver = True
    
    db.commit()
    return {"message": "Conversacion eliminada"}

@app.get("/api/messages/conversations", response_model=List[Conversation])
async def get_conversations(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    messages = db.query(Message).filter(
        (Message.sender_id == user_id) | (Message.receiver_id == user_id)
    ).filter(
        ~((Message.sender_id == user_id) & (Message.deleted_by_sender == True)) &
        ~((Message.receiver_id == user_id) & (Message.deleted_by_receiver == True))
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
    ).filter(
        ~((Message.sender_id == user_id) & (Message.deleted_by_sender == True)) &
        ~((Message.receiver_id == user_id) & (Message.deleted_by_receiver == True))
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
            created_at=msg.created_at,
            file_url=msg.file_url,
            file_name=msg.file_name,
            file_type=msg.file_type
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
        content=message.content,
        file_url=message.file_url,
        file_name=message.file_name,
        file_type=message.file_type
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
        created_at=db_message.created_at,
        file_url=db_message.file_url,
        file_name=db_message.file_name,
        file_type=db_message.file_type
    )

@app.post("/api/messages/{message_id}/read")
async def mark_message_read(message_id: int, db: Session = Depends(get_db)):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    message.is_read = True
    db.commit()
    return {"message": "Mensaje marcado como leido"}

# ==================== SITE CONTENT ENDPOINTS ====================

DEFAULT_SITE_CONTENT = {
    "hero": {
        "title": "Emunah Academy is rooted in the Torah and Devoted to Yeshua.",
        "subtitle": "Emunah Academy is a K-12 faith-based school devoted to helping children grow in love for Yeshua and obedience to the Torah. It provides a nurturing, family-like environment where students are encouraged to develop strong character, academic excellence and a living faith. The Academy works closely with families. Teachers model a life of Emunah (faith) and help students from kindergarten through 12th grade discover their calling, serve others, and walk in the ways of Yeshua with joy and conviction.",
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

DEFAULT_SITE_CONTENT_ES = {
    "hero": {
        "title": "Emunah Academy esta enraizada en la Torah y Dedicada a Yeshua.",
        "subtitle": "Emunah Academy es una escuela de fe K-12 dedicada a ayudar a los ninos a crecer en amor por Yeshua y obediencia a la Torah. Proporciona un ambiente familiar y acogedor donde los estudiantes son alentados a desarrollar un caracter fuerte, excelencia academica y una fe viva. La Academia trabaja estrechamente con las familias. Los maestros modelan una vida de Emunah (fe) y ayudan a los estudiantes desde kindergarten hasta el grado 12 a descubrir su llamado, servir a otros y caminar en los caminos de Yeshua con gozo y conviccion.",
        "cta_primary": "Aplicar Ahora",
        "cta_secondary": "Conocer Mas"
    },
    "about": {
        "title": "Acerca de Emunah Academy",
        "description": "Emunah Academy es una organizacion educativa sin fines de lucro dedicada a proporcionar educacion de calidad a comunidades vulnerables en todo el mundo. Nuestra mision es romper el ciclo de pobreza a traves de la educacion, ofreciendo programas integrales desde Kindergarten hasta 8vo grado.",
        "mission": "Empoderar a ninos de comunidades desatendidas con el conocimiento, las habilidades y los valores que necesitan para tener exito en la vida.",
        "vision": "Un mundo donde cada nino tenga acceso a educacion de calidad, sin importar sus circunstancias."
    },
    "how_it_works": {
        "title": "Como Funciona",
        "steps": [
            {"number": "1", "title": "Aplicar", "description": "Complete nuestro sencillo formulario de solicitud con la informacion de su hijo."},
            {"number": "2", "title": "Revision", "description": "Nuestro equipo revisa su solicitud y lo contacta dentro de 48 horas."},
            {"number": "3", "title": "Inscripcion", "description": "Una vez aprobado, su hijo obtiene acceso a nuestra plataforma de aprendizaje completa."},
            {"number": "4", "title": "Aprender", "description": "Los estudiantes acceden a lecciones en video, cuestionarios interactivos y apoyo personalizado."}
        ]
    },
    "programs": {
        "title": "Nuestros Programas",
        "subtitle": "Educacion integral desde Kindergarten hasta 8vo Grado",
        "grades": [
            {"level": "K", "name": "Kindergarten", "description": "Habilidades fundamentales en lectura, matematicas y desarrollo social"},
            {"level": "1-2", "name": "Primaria Temprana", "description": "Construyendo habilidades basicas de lectoescritura y matematicas"},
            {"level": "3-5", "name": "Primaria Superior", "description": "Expandiendo conocimientos en ciencias, historia y pensamiento critico"},
            {"level": "6-8", "name": "Secundaria", "description": "Preparando estudiantes para la preparatoria con materias avanzadas"}
        ]
    },
    "impact": {
        "title": "Nuestro Impacto",
        "stats": [
            {"number": "500+", "label": "Estudiantes Inscritos"},
            {"number": "15+", "label": "Paises Alcanzados"},
            {"number": "50+", "label": "Profesores Expertos"},
            {"number": "95%", "label": "Tasa de Completacion"}
        ]
    },
    "faq": {
        "title": "Preguntas Frecuentes",
        "questions": [
            {"question": "Es Emunah Academy realmente gratuita?", "answer": "Si! Emunah Academy es completamente gratuita para todos los estudiantes. Somos financiados por generosos donantes que creen en nuestra mision."},
            {"question": "Que grados ofrecen?", "answer": "Ofrecemos educacion integral desde Kindergarten hasta 8vo grado, cubriendo todas las materias principales."},
            {"question": "Que tecnologia necesito?", "answer": "Los estudiantes necesitan un dispositivo con acceso a internet (computadora, tablet o telefono) para acceder a nuestra plataforma en linea."},
            {"question": "Como puedo aplicar?", "answer": "Simplemente complete nuestro formulario de solicitud en esta pagina. Un padre o tutor debe completar la solicitud para estudiantes menores de 18 anos."},
            {"question": "En que idioma se imparten las clases?", "answer": "Actualmente, nuestras clases se imparten en ingles con planes de expandirnos al espanol y otros idiomas."}
        ]
    },
    "contact": {
        "title": "Contactenos",
        "email": "info@emunahacademy.org",
        "phone": "",
        "address": ""
    }
}

@app.get("/api/site-content")
async def get_all_site_content(lang: str = "en", db: Session = Depends(get_db)):
    defaults = DEFAULT_SITE_CONTENT_ES if lang == "es" else DEFAULT_SITE_CONTENT
    content = {}
    for section in DEFAULT_SITE_CONTENT.keys():
        section_key = f"{section}_{lang}" if lang != "en" else section
        row = db.query(SiteContentDB).filter(SiteContentDB.section == section_key).first()
        if row:
            content[section] = json.loads(row.content)
        else:
            # Fallback: try base (English) DB key, then defaults
            row_fallback = db.query(SiteContentDB).filter(SiteContentDB.section == section).first()
            if row_fallback:
                en_content = json.loads(row_fallback.content)
                # Auto-translate and save for future requests
                if lang != "en":
                    try:
                        translated = _translate_content(en_content, "en", lang)
                        new_row = SiteContentDB(section=section_key, content=json.dumps(translated))
                        db.add(new_row)
                        db.commit()
                        content[section] = translated
                    except Exception:
                        content[section] = en_content
                else:
                    content[section] = en_content
            else:
                content[section] = defaults[section]
    return content

@app.get("/api/site-content/{section}")
async def get_site_content(section: str, lang: str = "en", db: Session = Depends(get_db)):
    defaults = DEFAULT_SITE_CONTENT_ES if lang == "es" else DEFAULT_SITE_CONTENT
    base_section = section.replace("_es", "").replace("_en", "")
    section_key = f"{base_section}_{lang}" if lang != "en" else base_section
    
    row = db.query(SiteContentDB).filter(SiteContentDB.section == section_key).first()
    if row:
        return SiteContent(
            section=base_section,
            content=json.loads(row.content),
            updated_at=row.updated_at
        )
    # Fallback to base (English) DB key for any language
    row_fallback = db.query(SiteContentDB).filter(SiteContentDB.section == base_section).first()
    if row_fallback:
        return SiteContent(
            section=base_section,
            content=json.loads(row_fallback.content),
            updated_at=row_fallback.updated_at
        )
    if base_section in defaults:
        return SiteContent(
            section=base_section,
            content=defaults[base_section],
            updated_at=datetime.now()
        )
    raise HTTPException(status_code=404, detail="Section not found")

def _translate_content(content: dict, source_lang: str, target_lang: str) -> dict:
    """Recursively translate all string values in a dict."""
    translator = GoogleTranslator(source=source_lang, target=target_lang)
    translated = {}
    for key, value in content.items():
        if isinstance(value, str) and value.strip():
            try:
                translated[key] = translator.translate(value)
            except Exception:
                translated[key] = value
        elif isinstance(value, list):
            translated_list = []
            for item in value:
                if isinstance(item, dict):
                    translated_list.append(_translate_content(item, source_lang, target_lang))
                elif isinstance(item, str) and item.strip():
                    try:
                        translated_list.append(translator.translate(item))
                    except Exception:
                        translated_list.append(item)
                else:
                    translated_list.append(item)
            translated[key] = translated_list
        elif isinstance(value, dict):
            translated[key] = _translate_content(value, source_lang, target_lang)
        else:
            translated[key] = value
    return translated

@app.put("/api/site-content/{section}")
async def update_site_content(section: str, update: SiteContentUpdate, lang: str = "en", db: Session = Depends(get_db)):
    base_section = section.replace("_es", "").replace("_en", "")
    if base_section not in DEFAULT_SITE_CONTENT:
        raise HTTPException(status_code=400, detail="Invalid section")
    
    # Save the content for the requested language
    section_key = f"{base_section}_{lang}" if lang != "en" else base_section
    row = db.query(SiteContentDB).filter(SiteContentDB.section == section_key).first()
    if row:
        row.content = json.dumps(update.content)
        row.updated_at = datetime.now()
    else:
        row = SiteContentDB(
            section=section_key,
            content=json.dumps(update.content),
        )
        db.add(row)
    
    # Auto-translate to the other language
    try:
        other_lang = "es" if lang == "en" else "en"
        source = "en" if lang == "en" else "es"
        target = "es" if lang == "en" else "en"
        translated = _translate_content(update.content, source, target)
        
        other_key = f"{base_section}_{other_lang}" if other_lang != "en" else base_section
        other_row = db.query(SiteContentDB).filter(SiteContentDB.section == other_key).first()
        if other_row:
            other_row.content = json.dumps(translated)
            other_row.updated_at = datetime.now()
        else:
            other_row = SiteContentDB(
                section=other_key,
                content=json.dumps(translated),
            )
            db.add(other_row)
    except Exception as e:
        logger.warning(f"Auto-translation failed: {e}")
    
    db.commit()
    db.refresh(row)
    return SiteContent(
        section=base_section,
        content=json.loads(row.content),
        updated_at=row.updated_at
    )

@app.post("/api/site-content/translate-all")
async def translate_all_site_content(lang: str = "en", db: Session = Depends(get_db)):
    """Translate all existing site content sections from one language to the other."""
    source = "en" if lang == "en" else "es"
    target = "es" if lang == "en" else "en"
    translated_sections = []
    
    for section in DEFAULT_SITE_CONTENT.keys():
        # Get source content
        source_key = f"{section}_{source}" if source != "en" else section
        row = db.query(SiteContentDB).filter(SiteContentDB.section == source_key).first()
        if not row:
            continue
        
        try:
            content = json.loads(row.content)
            translated = _translate_content(content, source, target)
            
            target_key = f"{section}_{target}" if target != "en" else section
            target_row = db.query(SiteContentDB).filter(SiteContentDB.section == target_key).first()
            if target_row:
                target_row.content = json.dumps(translated)
                target_row.updated_at = datetime.now()
            else:
                target_row = SiteContentDB(
                    section=target_key,
                    content=json.dumps(translated),
                )
                db.add(target_row)
            translated_sections.append(section)
        except Exception as e:
            logger.warning(f"Failed to translate section {section}: {e}")
    
    db.commit()
    return {"translated": translated_sections, "source": source, "target": target}

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
    from app.email_service import send_application_confirmation, send_admin_notification

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
        "has_esa": application.has_esa,
        "status": ApplicationStatus.PENDING,
        "created_at": datetime.now(),
        "reviewed_at": None,
        "reviewed_by": None
    }

    # Send emails in background threads so the API response is not delayed
    _email_executor.submit(
        send_application_confirmation,
        parent_name=application.parent_name,
        parent_email=application.parent_email,
        student_name=application.student_name,
        application_id=app_id,
    )
    _email_executor.submit(
        send_admin_notification,
        student_name=application.student_name,
        student_age=application.student_age,
        grade_level=application.grade_level,
        parent_name=application.parent_name,
        parent_email=application.parent_email,
        parent_phone=application.parent_phone,
        address=application.address,
        message=application.message,
        has_esa=application.has_esa,
    )

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

# ==================== PAYMENT ENDPOINTS ====================

@app.get("/api/payments/students", response_model=List[dict])
async def get_students_for_payments(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR]:
        raise HTTPException(status_code=403, detail="No tiene permiso")
    
    students = db.query(User).filter(User.role == UserRoleEnum.STUDENT).all()
    result = []
    for student in students:
        parent_link = db.query(ParentStudentLink).filter(ParentStudentLink.student_id == student.id).first()
        parent = db.query(User).filter(User.id == parent_link.parent_id).first() if parent_link else None
        result.append({
            "id": student.id,
            "name": student.name,
            "grade_level": student.grade_level,
            "parent_name": parent.name if parent else None
        })
    return result

@app.get("/api/payments", response_model=List[PaymentSchema])
async def get_payments(
    student_id: Optional[int] = None,
    parent_id: Optional[int] = None,
    status: Optional[PaymentStatus] = None,
    year: Optional[int] = None,
    user_id: int = None,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    query = db.query(Payment)
    
    if user.role == UserRoleEnum.PARENT:
        children_links = db.query(ParentStudentLink).filter(ParentStudentLink.parent_id == user_id).all()
        children_ids = [link.student_id for link in children_links]
        query = query.filter(Payment.student_id.in_(children_ids))
    elif user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR]:
        raise HTTPException(status_code=403, detail="No tiene permiso para ver pagos")
    
    if student_id:
        query = query.filter(Payment.student_id == student_id)
    if parent_id:
        query = query.filter(Payment.parent_id == parent_id)
    if status:
        query = query.filter(Payment.status == PaymentStatusEnum(status.value))
    if year:
        query = query.filter(Payment.year == year)
    
    payments = query.order_by(Payment.due_date.desc()).all()
    
    result = []
    for payment in payments:
        student = db.query(User).filter(User.id == payment.student_id).first()
        parent = db.query(User).filter(User.id == payment.parent_id).first() if payment.parent_id else None
        result.append(PaymentSchema(
            id=payment.id,
            student_id=payment.student_id,
            student_name=student.name if student else "Desconocido",
            parent_id=payment.parent_id,
            parent_name=parent.name if parent else None,
            amount=payment.amount,
            month=payment.month,
            year=payment.year,
            status=PaymentStatus(payment.status.value),
            payment_date=payment.payment_date,
            due_date=payment.due_date,
            notes=payment.notes,
            created_at=payment.created_at,
            created_by=payment.created_by
        ))
    return result

@app.get("/api/payments/{payment_id}", response_model=PaymentSchema)
async def get_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    student = db.query(User).filter(User.id == payment.student_id).first()
    parent = db.query(User).filter(User.id == payment.parent_id).first() if payment.parent_id else None
    
    return PaymentSchema(
        id=payment.id,
        student_id=payment.student_id,
        student_name=student.name if student else "Desconocido",
        parent_id=payment.parent_id,
        parent_name=parent.name if parent else None,
        amount=payment.amount,
        month=payment.month,
        year=payment.year,
        status=PaymentStatus(payment.status.value),
        payment_date=payment.payment_date,
        due_date=payment.due_date,
        notes=payment.notes,
        created_at=payment.created_at,
        created_by=payment.created_by
    )

@app.post("/api/payments", response_model=PaymentSchema)
async def create_payment(payment: PaymentCreate, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Solo administradores y directores pueden crear pagos")
    
    student = db.query(User).filter(User.id == payment.student_id).first()
    if not student or student.role != UserRoleEnum.STUDENT:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    parent_link = db.query(ParentStudentLink).filter(ParentStudentLink.student_id == payment.student_id).first()
    parent_id = parent_link.parent_id if parent_link else None
    
    new_payment = Payment(
        student_id=payment.student_id,
        parent_id=parent_id,
        amount=payment.amount,
        month=payment.month,
        year=payment.year,
        status=PaymentStatusEnum.PENDING,
        due_date=payment.due_date,
        notes=payment.notes,
        created_by=user_id
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    
    parent = db.query(User).filter(User.id == parent_id).first() if parent_id else None
    
    return PaymentSchema(
        id=new_payment.id,
        student_id=new_payment.student_id,
        student_name=student.name,
        parent_id=new_payment.parent_id,
        parent_name=parent.name if parent else None,
        amount=new_payment.amount,
        month=new_payment.month,
        year=new_payment.year,
        status=PaymentStatus(new_payment.status.value),
        payment_date=new_payment.payment_date,
        due_date=new_payment.due_date,
        notes=new_payment.notes,
        created_at=new_payment.created_at,
        created_by=new_payment.created_by
    )

@app.put("/api/payments/{payment_id}", response_model=PaymentSchema)
async def update_payment(payment_id: int, update: PaymentUpdate, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Solo administradores y directores pueden actualizar pagos")
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    payment.status = PaymentStatusEnum(update.status.value)
    if update.payment_date:
        payment.payment_date = update.payment_date
    if update.notes is not None:
        payment.notes = update.notes
    
    db.commit()
    db.refresh(payment)
    
    student = db.query(User).filter(User.id == payment.student_id).first()
    parent = db.query(User).filter(User.id == payment.parent_id).first() if payment.parent_id else None
    
    return PaymentSchema(
        id=payment.id,
        student_id=payment.student_id,
        student_name=student.name if student else "Desconocido",
        parent_id=payment.parent_id,
        parent_name=parent.name if parent else None,
        amount=payment.amount,
        month=payment.month,
        year=payment.year,
        status=PaymentStatus(payment.status.value),
        payment_date=payment.payment_date,
        due_date=payment.due_date,
        notes=payment.notes,
        created_at=payment.created_at,
        created_by=payment.created_by
    )

@app.delete("/api/payments/{payment_id}")
async def delete_payment(payment_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Solo administradores y directores pueden eliminar pagos")
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    db.delete(payment)
    db.commit()
    return {"message": "Pago eliminado"}

# ==================== ASSIGNMENT ENDPOINTS ====================

@app.get("/api/assignments", response_model=List[AssignmentSchema])
async def get_assignments(course_id: Optional[int] = None, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Assignment)
    
    if course_id:
        query = query.filter(Assignment.course_id == course_id)
    
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.role == UserRoleEnum.STUDENT:
            enrollments = db.query(Enrollment).filter(Enrollment.student_id == user_id).all()
            enrolled_course_ids = [e.course_id for e in enrollments]
            query = query.filter(Assignment.course_id.in_(enrolled_course_ids))
    
    assignments = query.order_by(Assignment.due_date.desc()).all()
    
    result = []
    for a in assignments:
        submissions = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).all()
        graded = [s for s in submissions if s.status == AssignmentStatusEnum.GRADED]
        
        result.append(AssignmentSchema(
            id=a.id,
            title=a.title,
            description=a.description,
            course_id=a.course_id,
            due_date=a.due_date,
            max_score=a.max_score,
            created_by=a.created_by,
            created_at=a.created_at,
            course_title=a.course.title if a.course else None,
            creator_name=a.creator.name if a.creator else None,
            submissions_count=len(submissions),
            graded_count=len(graded)
        ))
    
    return result

@app.get("/api/assignments/{assignment_id}", response_model=AssignmentSchema)
async def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    submissions = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == assignment_id).all()
    graded = [s for s in submissions if s.status == AssignmentStatusEnum.GRADED]
    
    return AssignmentSchema(
        id=assignment.id,
        title=assignment.title,
        description=assignment.description,
        course_id=assignment.course_id,
        due_date=assignment.due_date,
        max_score=assignment.max_score,
        created_by=assignment.created_by,
        created_at=assignment.created_at,
        course_title=assignment.course.title if assignment.course else None,
        creator_name=assignment.creator.name if assignment.creator else None,
        submissions_count=len(submissions),
        graded_count=len(graded)
    )

@app.post("/api/assignments", response_model=AssignmentSchema)
async def create_assignment(assignment: AssignmentCreate, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR, UserRoleEnum.TEACHER]:
        raise HTTPException(status_code=403, detail="Solo profesores pueden crear tareas")
    
    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    db_assignment = Assignment(
        title=assignment.title,
        description=assignment.description,
        course_id=assignment.course_id,
        due_date=assignment.due_date,
        max_score=assignment.max_score,
        created_by=user_id
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    
    return AssignmentSchema(
        id=db_assignment.id,
        title=db_assignment.title,
        description=db_assignment.description,
        course_id=db_assignment.course_id,
        due_date=db_assignment.due_date,
        max_score=db_assignment.max_score,
        created_by=db_assignment.created_by,
        created_at=db_assignment.created_at,
        course_title=course.title,
        creator_name=user.name,
        submissions_count=0,
        graded_count=0
    )

@app.put("/api/assignments/{assignment_id}", response_model=AssignmentSchema)
async def update_assignment(assignment_id: int, assignment: AssignmentCreate, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR, UserRoleEnum.TEACHER]:
        raise HTTPException(status_code=403, detail="Solo profesores pueden editar tareas")
    
    db_assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    db_assignment.title = assignment.title
    db_assignment.description = assignment.description
    db_assignment.course_id = assignment.course_id
    db_assignment.due_date = assignment.due_date
    db_assignment.max_score = assignment.max_score
    
    db.commit()
    db.refresh(db_assignment)
    
    submissions = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == assignment_id).all()
    graded = [s for s in submissions if s.status == AssignmentStatusEnum.GRADED]
    
    return AssignmentSchema(
        id=db_assignment.id,
        title=db_assignment.title,
        description=db_assignment.description,
        course_id=db_assignment.course_id,
        due_date=db_assignment.due_date,
        max_score=db_assignment.max_score,
        created_by=db_assignment.created_by,
        created_at=db_assignment.created_at,
        course_title=db_assignment.course.title if db_assignment.course else None,
        creator_name=db_assignment.creator.name if db_assignment.creator else None,
        submissions_count=len(submissions),
        graded_count=len(graded)
    )

@app.delete("/api/assignments/{assignment_id}")
async def delete_assignment(assignment_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR, UserRoleEnum.TEACHER]:
        raise HTTPException(status_code=403, detail="Solo profesores pueden eliminar tareas")
    
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    db.delete(assignment)
    db.commit()
    return {"message": "Tarea eliminada"}

# ==================== ASSIGNMENT SUBMISSION ENDPOINTS ====================

@app.get("/api/assignments/{assignment_id}/submissions", response_model=List[AssignmentSubmissionSchema])
async def get_assignment_submissions(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    submissions = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id
    ).all()
    
    result = []
    for s in submissions:
        student = db.query(User).filter(User.id == s.student_id).first()
        grader = db.query(User).filter(User.id == s.graded_by).first() if s.graded_by else None
        
        result.append(AssignmentSubmissionSchema(
            id=s.id,
            assignment_id=s.assignment_id,
            student_id=s.student_id,
            student_name=student.name if student else "Desconocido",
            content=s.content,
            file_url=s.file_url,
            file_name=s.file_name,
            status=AssignmentStatus(s.status.value),
            score=s.score,
            feedback=s.feedback,
            submitted_at=s.submitted_at,
            graded_at=s.graded_at,
            graded_by=s.graded_by,
            grader_name=grader.name if grader else None
        ))
    
    return result

@app.get("/api/students/{student_id}/assignments", response_model=List[StudentAssignment])
async def get_student_assignments(student_id: int, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    enrolled_course_ids = [e.course_id for e in enrollments]
    
    assignments = db.query(Assignment).filter(
        Assignment.course_id.in_(enrolled_course_ids)
    ).order_by(Assignment.due_date.desc()).all()
    
    result = []
    for a in assignments:
        submission = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == a.id,
            AssignmentSubmission.student_id == student_id
        ).first()
        
        all_submissions = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).all()
        graded = [s for s in all_submissions if s.status == AssignmentStatusEnum.GRADED]
        
        assignment_schema = AssignmentSchema(
            id=a.id,
            title=a.title,
            description=a.description,
            course_id=a.course_id,
            due_date=a.due_date,
            max_score=a.max_score,
            created_by=a.created_by,
            created_at=a.created_at,
            course_title=a.course.title if a.course else None,
            creator_name=a.creator.name if a.creator else None,
            submissions_count=len(all_submissions),
            graded_count=len(graded)
        )
        
        submission_schema = None
        if submission:
            grader = db.query(User).filter(User.id == submission.graded_by).first() if submission.graded_by else None
            submission_schema = AssignmentSubmissionSchema(
                id=submission.id,
                assignment_id=submission.assignment_id,
                student_id=submission.student_id,
                student_name=student.name,
                content=submission.content,
                file_url=submission.file_url,
                file_name=submission.file_name,
                status=AssignmentStatus(submission.status.value),
                score=submission.score,
                feedback=submission.feedback,
                submitted_at=submission.submitted_at,
                graded_at=submission.graded_at,
                graded_by=submission.graded_by,
                grader_name=grader.name if grader else None
            )
        
        result.append(StudentAssignment(
            assignment=assignment_schema,
            submission=submission_schema
        ))
    
    return result

@app.post("/api/assignments/submit", response_model=AssignmentSubmissionSchema)
async def submit_assignment(submission: AssignmentSubmissionCreate, student_id: int, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    if student.role != UserRoleEnum.STUDENT:
        raise HTTPException(status_code=403, detail="Solo estudiantes pueden entregar tareas")
    
    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == submission.assignment_id,
        AssignmentSubmission.student_id == student_id
    ).first()
    
    now = datetime.utcnow()
    is_late = now > assignment.due_date
    status = AssignmentStatusEnum.LATE if is_late else AssignmentStatusEnum.SUBMITTED
    
    if existing:
        existing.content = submission.content
        existing.file_url = submission.file_url
        existing.file_name = submission.file_name
        existing.submitted_at = now
        existing.status = status
        db.commit()
        db.refresh(existing)
        db_submission = existing
    else:
        db_submission = AssignmentSubmission(
            assignment_id=submission.assignment_id,
            student_id=student_id,
            content=submission.content,
            file_url=submission.file_url,
            file_name=submission.file_name,
            status=status,
            submitted_at=now
        )
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
    
    return AssignmentSubmissionSchema(
        id=db_submission.id,
        assignment_id=db_submission.assignment_id,
        student_id=db_submission.student_id,
        student_name=student.name,
        content=db_submission.content,
        file_url=db_submission.file_url,
        file_name=db_submission.file_name,
        status=AssignmentStatus(db_submission.status.value),
        score=db_submission.score,
        feedback=db_submission.feedback,
        submitted_at=db_submission.submitted_at,
        graded_at=db_submission.graded_at,
        graded_by=db_submission.graded_by,
        grader_name=None
    )

@app.post("/api/assignments/grade", response_model=AssignmentSubmissionSchema)
async def grade_assignment(grade: AssignmentSubmissionGrade, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.role not in [UserRoleEnum.SUPERUSER, UserRoleEnum.DIRECTOR, UserRoleEnum.TEACHER]:
        raise HTTPException(status_code=403, detail="Solo profesores pueden calificar tareas")
    
    submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == grade.submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    submission.score = grade.score
    submission.feedback = grade.feedback
    submission.status = AssignmentStatusEnum.GRADED
    submission.graded_at = datetime.utcnow()
    submission.graded_by = user_id
    
    db.commit()
    db.refresh(submission)
    
    student = db.query(User).filter(User.id == submission.student_id).first()
    
    return AssignmentSubmissionSchema(
        id=submission.id,
        assignment_id=submission.assignment_id,
        student_id=submission.student_id,
        student_name=student.name if student else "Desconocido",
        content=submission.content,
        file_url=submission.file_url,
        file_name=submission.file_name,
        status=AssignmentStatus(submission.status.value),
        score=submission.score,
        feedback=submission.feedback,
        submitted_at=submission.submitted_at,
        graded_at=submission.graded_at,
        graded_by=submission.graded_by,
        grader_name=user.name
    )

# ==================== BASE44 COURSE SEED ENDPOINT ====================

@app.post("/api/seed-base44-courses")
async def seed_base44_courses(teacher_id: int, db: Session = Depends(get_db)):
    """Import courses from Base44 MathModules seed data.
    
    Creates 25 courses (5 subjects x 5 grade levels) with 250 total lessons.
    Requires a teacher_id to assign as the course creator.
    Skips courses that already exist (matched by title).
    """
    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    
    if teacher.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Solo profesores/directores/superusuarios pueden importar cursos")
    
    # Load seed data
    seed_path = Path(__file__).parent / "base44_seed_data.json"
    if not seed_path.exists():
        raise HTTPException(status_code=500, detail="Archivo de datos Base44 no encontrado")
    
    with open(seed_path, "r", encoding="utf-8") as f:
        seed_data = json.load(f)
    
    courses_created = 0
    lessons_created = 0
    courses_skipped = 0
    
    for course_data in seed_data["courses"]:
        # Check if course already exists
        existing = db.query(Course).filter(Course.title == course_data["title"]).first()
        if existing:
            courses_skipped += 1
            continue
        
        # Create course
        db_course = Course(
            title=course_data["title"],
            description=course_data["description"],
            thumbnail_url=None,
            grade_level=course_data.get("grade_level"),
            teacher_id=teacher_id,
            is_published=True
        )
        db.add(db_course)
        db.flush()  # Get the course ID
        
        # Create lessons for this course
        for lesson_data in course_data["lessons"]:
            db_lesson = Lesson(
                course_id=db_course.id,
                title=lesson_data["title"],
                lesson_type=LessonTypeEnum.TEXT,
                content=lesson_data["content"],
                order=lesson_data["order"]
            )
            db.add(db_lesson)
            lessons_created += 1
        
        courses_created += 1
    
    db.commit()
    
    return {
        "message": f"Importacion completada: {courses_created} cursos creados, {lessons_created} lecciones creadas, {courses_skipped} cursos omitidos (ya existian)",
        "courses_created": courses_created,
        "lessons_created": lessons_created,
        "courses_skipped": courses_skipped
    }

# ==================== BOOKS ENDPOINTS ====================

@app.get("/api/book-categories", response_model=List[BookCategorySchema])
async def get_book_categories(db: Session = Depends(get_db)):
    categories = db.query(BookCategory).order_by(BookCategory.name).all()
    result = []
    for cat in categories:
        book_count = db.query(Book).filter(Book.category_id == cat.id).count()
        result.append(BookCategorySchema(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            color=cat.color or "#6366f1",
            icon=cat.icon or "folder",
            created_by=cat.created_by,
            created_at=cat.created_at,
            book_count=book_count
        ))
    return result

@app.post("/api/book-categories", response_model=BookCategorySchema)
async def create_book_category(category: BookCategoryCreate, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="No tienes permiso para crear categorias")
    
    db_category = BookCategory(
        name=category.name,
        description=category.description,
        color=category.color,
        icon=category.icon,
        created_by=user_id
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return BookCategorySchema(
        id=db_category.id,
        name=db_category.name,
        description=db_category.description,
        color=db_category.color or "#6366f1",
        icon=db_category.icon or "folder",
        created_by=db_category.created_by,
        created_at=db_category.created_at,
        book_count=0
    )

@app.delete("/api/book-categories/{category_id}")
async def delete_book_category(category_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar categorias")
    
    category = db.query(BookCategory).filter(BookCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    
    # Move books to uncategorized before deleting
    db.query(Book).filter(Book.category_id == category_id).update({"category_id": None})
    db.delete(category)
    db.commit()
    return {"message": "Categoria eliminada"}

@app.get("/api/books", response_model=List[BookSchema])
async def get_books(category_id: Optional[int] = None, grade_level: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Book)
    
    if category_id is not None:
        query = query.filter(Book.category_id == category_id)
    if grade_level:
        query = query.filter(Book.grade_level == grade_level)
    if search:
        query = query.filter(
            (Book.title.ilike(f"%{search}%")) | 
            (Book.author.ilike(f"%{search}%"))
        )
    
    books = query.order_by(Book.created_at.desc()).all()
    result = []
    for book in books:
        uploader = db.query(User).filter(User.id == book.uploaded_by).first()
        category = db.query(BookCategory).filter(BookCategory.id == book.category_id).first() if book.category_id else None
        result.append(BookSchema(
            id=book.id,
            title=book.title,
            author=book.author,
            description=book.description,
            cover_url=book.cover_url,
            file_url=book.file_url,
            file_name=book.file_name,
            file_size=book.file_size,
            category_id=book.category_id,
            grade_level=book.grade_level,
            uploaded_by=book.uploaded_by,
            uploader_name=uploader.name if uploader else "Desconocido",
            category_name=category.name if category else None,
            created_at=book.created_at
        ))
    return result

@app.post("/api/books/upload")
async def upload_book_file(file: UploadFile = File(...)):
    """Upload a PDF file for a book. Returns the file URL."""
    file_ext = Path(file.filename).suffix.lower() if file.filename else ''
    if file_ext != '.pdf':
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    contents = await file.read()
    if len(contents) > MAX_BOOK_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Archivo demasiado grande. Tamano maximo: {MAX_BOOK_FILE_SIZE // (1024*1024)}MB")
    
    unique_filename = f"books/{uuid.uuid4()}{file_ext}"
    books_dir = UPLOAD_DIR / "books"
    books_dir.mkdir(exist_ok=True)
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    return {
        "file_url": f"/uploads/{unique_filename}",
        "file_name": file.filename,
        "file_size": len(contents)
    }

@app.post("/api/books", response_model=BookSchema)
async def create_book(book: BookCreate, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="No tienes permiso para agregar libros")
    
    db_book = Book(
        title=book.title,
        author=book.author,
        description=book.description,
        cover_url=book.cover_url,
        file_url=book.file_url,
        file_name=book.file_name,
        file_size=book.file_size,
        category_id=book.category_id,
        grade_level=book.grade_level,
        uploaded_by=user_id
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    
    category = db.query(BookCategory).filter(BookCategory.id == db_book.category_id).first() if db_book.category_id else None
    
    return BookSchema(
        id=db_book.id,
        title=db_book.title,
        author=db_book.author,
        description=db_book.description,
        cover_url=db_book.cover_url,
        file_url=db_book.file_url,
        file_name=db_book.file_name,
        file_size=db_book.file_size,
        category_id=db_book.category_id,
        grade_level=db_book.grade_level,
        uploaded_by=db_book.uploaded_by,
        uploader_name=user.name,
        category_name=category.name if category else None,
        created_at=db_book.created_at
    )

@app.put("/api/books/{book_id}", response_model=BookSchema)
async def update_book(book_id: int, book_update: BookUpdate, user_id: int, db: Session = Depends(get_db)):
    """Update a book's details (title, author, description, category, grade level)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar libros")
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    if book_update.title is not None:
        book.title = book_update.title
    if book_update.author is not None:
        book.author = book_update.author
    if book_update.description is not None:
        book.description = book_update.description
    if book_update.category_id is not None:
        book.category_id = book_update.category_id if book_update.category_id != 0 else None
    if book_update.grade_level is not None:
        book.grade_level = book_update.grade_level
    
    db.commit()
    db.refresh(book)
    
    uploader = db.query(User).filter(User.id == book.uploaded_by).first()
    category = db.query(BookCategory).filter(BookCategory.id == book.category_id).first() if book.category_id else None
    
    return BookSchema(
        id=book.id,
        title=book.title,
        author=book.author,
        description=book.description,
        cover_url=book.cover_url,
        file_url=book.file_url,
        file_name=book.file_name,
        file_size=book.file_size,
        category_id=book.category_id,
        grade_level=book.grade_level,
        uploaded_by=book.uploaded_by,
        uploader_name=uploader.name if uploader else "Desconocido",
        category_name=category.name if category else None,
        created_at=book.created_at
    )

@app.put("/api/books/{book_id}/cover", response_model=BookSchema)
async def update_book_cover(book_id: int, user_id: int, cover_url: str, db: Session = Depends(get_db)):
    """Update a book's cover image URL."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar libros")
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    book.cover_url = cover_url
    db.commit()
    db.refresh(book)
    
    uploader = db.query(User).filter(User.id == book.uploaded_by).first()
    category = db.query(BookCategory).filter(BookCategory.id == book.category_id).first() if book.category_id else None
    
    return BookSchema(
        id=book.id,
        title=book.title,
        author=book.author,
        description=book.description,
        cover_url=book.cover_url,
        file_url=book.file_url,
        file_name=book.file_name,
        file_size=book.file_size,
        category_id=book.category_id,
        grade_level=book.grade_level,
        uploaded_by=book.uploaded_by,
        uploader_name=uploader.name if uploader else "Desconocido",
        category_name=category.name if category else None,
        created_at=book.created_at
    )

@app.delete("/api/books/{book_id}")
async def delete_book(book_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRoleEnum.TEACHER, UserRoleEnum.DIRECTOR, UserRoleEnum.SUPERUSER]:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar libros")
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    # Try to delete the physical file
    file_path = Path(book.file_url.lstrip("/")) if book.file_url else None
    if file_path and file_path.exists():
        file_path.unlink(missing_ok=True)
    
    db.delete(book)
    db.commit()
    return {"message": "Libro eliminado"}

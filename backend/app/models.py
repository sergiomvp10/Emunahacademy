from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    SUPERUSER = "superuser"  # Full system access - can manage everything
    DIRECTOR = "director"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"

class GradeLevel(str, Enum):
    K = "K"
    GRADE_1 = "1"
    GRADE_2 = "2"
    GRADE_3 = "3"
    GRADE_4 = "4"
    GRADE_5 = "5"
    GRADE_6 = "6"
    GRADE_7 = "7"
    GRADE_8 = "8"
    GRADE_9 = "9"
    GRADE_10 = "10"
    GRADE_11 = "11"
    GRADE_12 = "12"

class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole
    grade_level: Optional[str] = None  # For students: K, 1, 2, 3, 4, 5, 6, 7, 8

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Course Models
class CourseBase(BaseModel):
    title: str
    description: str
    thumbnail_url: Optional[str] = None
    grade_level: Optional[str] = None  # K, 1, 2, 3, 4, 5, 6, 7, 8

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    teacher_id: int
    teacher_name: str
    created_at: datetime
    is_published: bool = False
    
    class Config:
        from_attributes = True

# Lesson Models
class LessonType(str, Enum):
    VIDEO = "video"
    TEXT = "text"
    QUIZ = "quiz"

class LessonBase(BaseModel):
    title: str
    lesson_type: LessonType
    content: str  # URL for video, HTML/markdown for text, JSON for quiz
    order: int

class LessonCreate(LessonBase):
    course_id: int

class Lesson(LessonBase):
    id: int
    course_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Quiz Models
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int  # Index of correct option

class QuizSubmission(BaseModel):
    lesson_id: int
    answers: List[int]  # List of selected option indices

class QuizResult(BaseModel):
    lesson_id: int
    student_id: int
    score: float
    total_questions: int
    correct_answers: int
    submitted_at: datetime

# Evaluation Models
class EvaluationBase(BaseModel):
    title: str
    description: str
    course_id: int
    due_date: datetime
    max_score: float = 100.0

class EvaluationCreate(EvaluationBase):
    pass

class Evaluation(EvaluationBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class EvaluationSubmission(BaseModel):
    evaluation_id: int
    content: str  # Student's submission content

class EvaluationGrade(BaseModel):
    submission_id: int
    score: float
    feedback: str

class StudentEvaluation(BaseModel):
    id: int
    evaluation_id: int
    student_id: int
    student_name: str
    content: str
    score: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: datetime
    graded_at: Optional[datetime] = None

# Calendar Models
class EventType(str, Enum):
    CLASS = "class"
    EVALUATION = "evaluation"
    MEETING = "meeting"
    HOLIDAY = "holiday"
    OTHER = "other"

class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: EventType
    start_time: datetime
    end_time: datetime
    course_id: Optional[int] = None
    grade_level: Optional[str] = None  # K, 1, 2, 3, 4, 5, 6, 7, 8 or null for "all"

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEvent(CalendarEventBase):
    id: int
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Progress Models
class StudentProgress(BaseModel):
    student_id: int
    student_name: str
    course_id: int
    course_title: str
    completed_lessons: int
    total_lessons: int
    average_quiz_score: Optional[float] = None
    evaluations_completed: int
    total_evaluations: int

# Enrollment Models
class EnrollmentCreate(BaseModel):
    student_id: int
    course_id: int

class Enrollment(BaseModel):
    id: int
    student_id: int
    course_id: int
    enrolled_at: datetime
    
    class Config:
        from_attributes = True

# Parent-Student Relationship
class ParentStudentLink(BaseModel):
    parent_id: int
    student_id: int

class ChildProgress(BaseModel):
    student: User
    courses: List[StudentProgress]

# Messaging Models
class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None

class Message(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    receiver_id: int
    receiver_name: str
    content: str
    is_read: bool = False
    created_at: datetime
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    
    class Config:
        from_attributes = True

class Conversation(BaseModel):
    user_id: int
    user_name: str
    user_role: UserRole
    last_message: str
    last_message_time: datetime
    unread_count: int

# Site Content Models
class SiteContentUpdate(BaseModel):
    content: dict

class SiteContent(BaseModel):
    section: str
    content: dict
    updated_at: datetime

# Student Application Models
class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class StudentApplicationCreate(BaseModel):
    student_name: str
    student_age: int
    grade_level: str
    parent_name: str
    parent_email: str
    parent_phone: str
    address: Optional[str] = None
    message: Optional[str] = None
    has_esa: bool = False

class StudentApplication(BaseModel):
    id: int
    student_name: str
    student_age: int
    grade_level: str
    parent_name: str
    parent_email: str
    parent_phone: str
    address: Optional[str] = None
    message: Optional[str] = None
    has_esa: bool = False
    status: ApplicationStatus
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class AssignmentStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"

class PaymentCreate(BaseModel):
    student_id: int
    amount: float
    month: str
    year: int
    due_date: datetime
    notes: Optional[str] = None

class PaymentUpdate(BaseModel):
    status: PaymentStatus
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None

class Payment(BaseModel):
    id: int
    student_id: int
    student_name: str
    parent_id: Optional[int] = None
    parent_name: Optional[str] = None
    amount: float
    month: str
    year: int
    status: PaymentStatus
    payment_date: Optional[datetime] = None
    due_date: datetime
    notes: Optional[str] = None
    created_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

# Assignment Models
class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    course_id: int
    due_date: datetime
    max_score: float = 100.0

class AssignmentCreate(AssignmentBase):
    pass

class Assignment(AssignmentBase):
    id: int
    created_by: int
    created_at: datetime
    course_title: Optional[str] = None
    creator_name: Optional[str] = None
    submissions_count: int = 0
    graded_count: int = 0
    
    class Config:
        from_attributes = True

class AssignmentSubmissionCreate(BaseModel):
    assignment_id: int
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class AssignmentSubmissionGrade(BaseModel):
    submission_id: int
    score: float
    feedback: Optional[str] = None

class AssignmentSubmission(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    student_name: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    status: AssignmentStatus
    score: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[int] = None
    grader_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class StudentAssignment(BaseModel):
    assignment: Assignment
    submission: Optional[AssignmentSubmission] = None

# Book Models
class BookCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"
    icon: str = "folder"

class BookCategoryCreate(BookCategoryBase):
    pass

class BookCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class BookCategory(BookCategoryBase):
    id: int
    created_by: int
    created_at: datetime
    book_count: int = 0
    
    class Config:
        from_attributes = True

class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    grade_level: Optional[str] = None

class BookCreate(BookBase):
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    cover_url: Optional[str] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    grade_level: Optional[str] = None

class Book(BookBase):
    id: int
    cover_url: Optional[str] = None
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    uploaded_by: int
    uploader_name: str
    category_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

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

class Message(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    receiver_id: int
    receiver_name: str
    content: str
    is_read: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

class Conversation(BaseModel):
    user_id: int
    user_name: str
    user_role: UserRole
    last_message: str
    last_message_time: datetime
    unread_count: int

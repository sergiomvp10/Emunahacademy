from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRoleEnum(str, enum.Enum):
    SUPERUSER = "superuser"
    DIRECTOR = "director"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"

class LessonTypeEnum(str, enum.Enum):
    VIDEO = "video"
    TEXT = "text"
    QUIZ = "quiz"

class EventTypeEnum(str, enum.Enum):
    CLASS = "class"
    EVALUATION = "evaluation"
    MEETING = "meeting"
    HOLIDAY = "holiday"
    OTHER = "other"

class GradeLevelEnum(str, enum.Enum):
    K = "K"
    GRADE_1 = "1"
    GRADE_2 = "2"
    GRADE_3 = "3"
    GRADE_4 = "4"
    GRADE_5 = "5"
    GRADE_6 = "6"
    GRADE_7 = "7"
    GRADE_8 = "8"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRoleEnum), nullable=False)
    password = Column(String(255), nullable=False)
    grade_level = Column(String(10), nullable=True)  # For students: K, 1, 2, 3, 4, 5, 6, 7, 8
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    courses_taught = relationship("Course", back_populates="teacher")
    enrollments = relationship("Enrollment", back_populates="student")
    quiz_results = relationship("QuizResult", back_populates="student")
    evaluation_submissions = relationship("EvaluationSubmission", back_populates="student")
    calendar_events_created = relationship("CalendarEvent", back_populates="creator")
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    messages_received = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    children = relationship("ParentStudentLink", foreign_keys="ParentStudentLink.parent_id", back_populates="parent")
    parents = relationship("ParentStudentLink", foreign_keys="ParentStudentLink.student_id", back_populates="student")

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String(500))
    grade_level = Column(String(10), nullable=True)  # K, 1, 2, 3, 4, 5, 6, 7, 8
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_published = Column(Boolean, default=False)
    
    teacher = relationship("User", back_populates="courses_taught")
    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="course", cascade="all, delete-orphan")
    calendar_events = relationship("CalendarEvent", back_populates="course")

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    lesson_type = Column(SQLEnum(LessonTypeEnum), nullable=False)
    content = Column(Text, nullable=False)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    course = relationship("Course", back_populates="lessons")
    completions = relationship("LessonCompletion", back_populates="lesson", cascade="all, delete-orphan")
    quiz_results = relationship("QuizResult", back_populates="lesson", cascade="all, delete-orphan")

class LessonCompletion(Base):
    __tablename__ = "lesson_completions"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)
    
    lesson = relationship("Lesson", back_populates="completions")

class QuizResult(Base):
    __tablename__ = "quiz_results"
    
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    lesson = relationship("Lesson", back_populates="quiz_results")
    student = relationship("User", back_populates="quiz_results")

class Enrollment(Base):
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class Evaluation(Base):
    __tablename__ = "evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    due_date = Column(DateTime, nullable=False)
    max_score = Column(Float, default=100.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    course = relationship("Course", back_populates="evaluations")
    submissions = relationship("EvaluationSubmission", back_populates="evaluation", cascade="all, delete-orphan")

class EvaluationSubmission(Base):
    __tablename__ = "evaluation_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    score = Column(Float)
    feedback = Column(Text)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime)
    
    evaluation = relationship("Evaluation", back_populates="submissions")
    student = relationship("User", back_populates="evaluation_submissions")

class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    event_type = Column(SQLEnum(EventTypeEnum), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"))
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    course = relationship("Course", back_populates="calendar_events")
    creator = relationship("User", back_populates="calendar_events_created")

class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"
    
    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    parent = relationship("User", foreign_keys=[parent_id], back_populates="children")
    student = relationship("User", foreign_keys=[student_id], back_populates="parents")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id], back_populates="messages_sent")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="messages_received")

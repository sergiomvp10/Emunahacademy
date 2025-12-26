export type UserRole = 'director' | 'teacher' | 'student' | 'parent';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  teacher_id: number;
  teacher_name: string;
  created_at: string;
  is_published: boolean;
}

export type LessonType = 'video' | 'text' | 'quiz';

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  lesson_type: LessonType;
  content: string;
  order: number;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

export interface QuizResult {
  lesson_id: number;
  student_id: number;
  score: number;
  total_questions: number;
  correct_answers: number;
  submitted_at: string;
}

export interface Evaluation {
  id: number;
  title: string;
  description: string;
  course_id: number;
  due_date: string;
  max_score: number;
  created_at: string;
}

export interface StudentEvaluation {
  id: number;
  evaluation_id: number;
  student_id: number;
  student_name: string;
  content: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
}

export type EventType = 'class' | 'evaluation' | 'meeting' | 'holiday' | 'other';

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  event_type: EventType;
  start_time: string;
  end_time: string;
  course_id: number | null;
  created_by: number;
  created_at: string;
}

export interface StudentProgress {
  student_id: number;
  student_name: string;
  course_id: number;
  course_title: string;
  completed_lessons: number;
  total_lessons: number;
  average_quiz_score: number | null;
  evaluations_completed: number;
  total_evaluations: number;
}

export interface ChildProgress {
  student: User;
  courses: StudentProgress[];
}

export interface Statistics {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_parents: number;
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  total_lessons: number;
  total_evaluations: number;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  enrolled_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  receiver_id: number;
  receiver_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  user_id: number;
  user_name: string;
  user_role: UserRole;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

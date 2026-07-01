export type UserRole = 'superuser' | 'director' | 'teacher' | 'student' | 'parent';

export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  grade_level?: GradeLevel | null;
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
  grade_level?: GradeLevel | null;
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
  grade_level: GradeLevel | null;
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
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

export interface Conversation {
  user_id: number;
  user_name: string;
  user_role: UserRole;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Payment {
  id: number;
  student_id: number;
  student_name: string;
  parent_id: number | null;
  parent_name: string | null;
  amount: number;
  month: string;
  year: number;
  status: PaymentStatus;
  payment_date: string | null;
  due_date: string;
  notes: string | null;
  created_at: string;
  created_by: number;
}

export interface StudentForPayment {
  id: number;
  name: string;
  grade_level: string | null;
  parent_name: string | null;
}

export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'late';

export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  course_id: number;
  due_date: string;
  max_score: number;
  created_by: number;
  created_at: string;
  course_title: string | null;
  creator_name: string | null;
  submissions_count: number;
  graded_count: number;
}

export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  status: AssignmentStatus;
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: number | null;
  grader_name: string | null;
}

export interface StudentAssignment {
  assignment: Assignment;
  submission: AssignmentSubmission | null;
}

export interface BookCategory {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_by: number;
  created_at: string;
  book_count: number;
}

export interface Book {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  category_id: number | null;
  grade_level: GradeLevel | null;
  uploaded_by: number;
  uploader_name: string;
  category_name: string | null;
  created_at: string;
}

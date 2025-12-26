import { 
  User, Token, Course, Lesson, Evaluation, StudentEvaluation,
  CalendarEvent, QuizResult, StudentProgress, ChildProgress, 
  Statistics, Enrollment, UserRole, Message, Conversation
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_AUTH = import.meta.env.VITE_API_AUTH || '';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(API_AUTH ? { 'Authorization': `Basic ${btoa(API_AUTH)}` } : {}),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(error.detail || 'Error en la solicitud');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<Token> {
    const result = await this.request<Token>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.access_token);
    return result;
  }

  async register(email: string, password: string, name: string, role: UserRole): Promise<Token> {
    const result = await this.request<Token>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    this.setToken(result.access_token);
    return result;
  }

  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) throw new Error('No autenticado');
    return this.request<User>(`/api/auth/me?token=${token}`);
  }

  logout() {
    this.setToken(null);
  }

  // Users
  async getUsers(role?: UserRole): Promise<User[]> {
    const params = role ? `?role=${role}` : '';
    return this.request<User[]>(`/api/users${params}`);
  }

  async getUser(userId: number): Promise<User> {
    return this.request<User>(`/api/users/${userId}`);
  }

  async deleteUser(userId: number): Promise<void> {
    await this.request(`/api/users/${userId}`, { method: 'DELETE' });
  }

  // Courses
  async getCourses(teacherId?: number, publishedOnly?: boolean): Promise<Course[]> {
    const params = new URLSearchParams();
    if (teacherId) params.append('teacher_id', teacherId.toString());
    if (publishedOnly) params.append('published_only', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Course[]>(`/api/courses${query}`);
  }

  async getCourse(courseId: number): Promise<Course> {
    return this.request<Course>(`/api/courses/${courseId}`);
  }

  async createCourse(course: { title: string; description: string; thumbnail_url?: string }, teacherId: number): Promise<Course> {
    return this.request<Course>(`/api/courses?teacher_id=${teacherId}`, {
      method: 'POST',
      body: JSON.stringify(course),
    });
  }

  async updateCourse(courseId: number, course: { title: string; description: string; thumbnail_url?: string }): Promise<Course> {
    return this.request<Course>(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    });
  }

  async publishCourse(courseId: number): Promise<void> {
    await this.request(`/api/courses/${courseId}/publish`, { method: 'POST' });
  }

  async deleteCourse(courseId: number): Promise<void> {
    await this.request(`/api/courses/${courseId}`, { method: 'DELETE' });
  }

  // Lessons
  async getLessons(courseId: number): Promise<Lesson[]> {
    return this.request<Lesson[]>(`/api/courses/${courseId}/lessons`);
  }

  async getLesson(lessonId: number): Promise<Lesson> {
    return this.request<Lesson>(`/api/lessons/${lessonId}`);
  }

  async createLesson(lesson: { course_id: number; title: string; lesson_type: string; content: string; order: number }): Promise<Lesson> {
    return this.request<Lesson>('/api/lessons', {
      method: 'POST',
      body: JSON.stringify(lesson),
    });
  }

  async updateLesson(lessonId: number, lesson: { course_id: number; title: string; lesson_type: string; content: string; order: number }): Promise<Lesson> {
    return this.request<Lesson>(`/api/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lesson),
    });
  }

  async deleteLesson(lessonId: number): Promise<void> {
    await this.request(`/api/lessons/${lessonId}`, { method: 'DELETE' });
  }

  async completeLesson(lessonId: number, studentId: number): Promise<void> {
    await this.request(`/api/lessons/${lessonId}/complete?student_id=${studentId}`, { method: 'POST' });
  }

  // Quizzes
  async submitQuiz(lessonId: number, answers: number[], studentId: number): Promise<QuizResult> {
    return this.request<QuizResult>(`/api/quizzes/submit?student_id=${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ lesson_id: lessonId, answers }),
    });
  }

  async getQuizResults(studentId: number): Promise<QuizResult[]> {
    return this.request<QuizResult[]>(`/api/quizzes/results/${studentId}`);
  }

  // Evaluations
  async getEvaluations(courseId?: number): Promise<Evaluation[]> {
    const params = courseId ? `?course_id=${courseId}` : '';
    return this.request<Evaluation[]>(`/api/evaluations${params}`);
  }

  async getEvaluation(evaluationId: number): Promise<Evaluation> {
    return this.request<Evaluation>(`/api/evaluations/${evaluationId}`);
  }

  async createEvaluation(evaluation: { title: string; description: string; course_id: number; due_date: string; max_score: number }): Promise<Evaluation> {
    return this.request<Evaluation>('/api/evaluations', {
      method: 'POST',
      body: JSON.stringify(evaluation),
    });
  }

  async submitEvaluation(evaluationId: number, content: string, studentId: number): Promise<StudentEvaluation> {
    return this.request<StudentEvaluation>(`/api/evaluations/submit?student_id=${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ evaluation_id: evaluationId, content }),
    });
  }

  async getEvaluationSubmissions(evaluationId: number): Promise<StudentEvaluation[]> {
    return this.request<StudentEvaluation[]>(`/api/evaluations/${evaluationId}/submissions`);
  }

  async gradeEvaluation(submissionId: number, score: number, feedback: string): Promise<StudentEvaluation> {
    return this.request<StudentEvaluation>('/api/evaluations/grade', {
      method: 'POST',
      body: JSON.stringify({ submission_id: submissionId, score, feedback }),
    });
  }

  // Calendar
  async getCalendarEvents(courseId?: number, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<CalendarEvent[]>(`/api/calendar${query}`);
  }

  async createCalendarEvent(event: { title: string; description?: string; event_type: string; start_time: string; end_time: string; course_id?: number }, createdBy: number): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(`/api/calendar?created_by=${createdBy}`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async deleteCalendarEvent(eventId: number): Promise<void> {
    await this.request(`/api/calendar/${eventId}`, { method: 'DELETE' });
  }

  // Enrollments
  async getEnrollments(studentId?: number, courseId?: number): Promise<Enrollment[]> {
    const params = new URLSearchParams();
    if (studentId) params.append('student_id', studentId.toString());
    if (courseId) params.append('course_id', courseId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Enrollment[]>(`/api/enrollments${query}`);
  }

  async createEnrollment(studentId: number, courseId: number): Promise<Enrollment> {
    return this.request<Enrollment>('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, course_id: courseId }),
    });
  }

  async deleteEnrollment(enrollmentId: number): Promise<void> {
    await this.request(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
  }

  // Progress
  async getStudentProgress(studentId: number): Promise<StudentProgress[]> {
    return this.request<StudentProgress[]>(`/api/progress/${studentId}`);
  }

  // Parent
  async getChildrenProgress(parentId: number): Promise<ChildProgress[]> {
    return this.request<ChildProgress[]>(`/api/parents/${parentId}/children`);
  }

  // Statistics
  async getStatistics(): Promise<Statistics> {
    return this.request<Statistics>('/api/statistics');
  }

  // Messaging
  async getConversations(userId: number): Promise<Conversation[]> {
    return this.request<Conversation[]>(`/api/messages/conversations?user_id=${userId}`);
  }

  async getMessages(otherUserId: number, userId: number): Promise<Message[]> {
    return this.request<Message[]>(`/api/messages/${otherUserId}?user_id=${userId}`);
  }

  async sendMessage(receiverId: number, content: string, senderId: number): Promise<Message> {
    return this.request<Message>(`/api/messages?sender_id=${senderId}`, {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, content }),
    });
  }

  async markMessageRead(messageId: number): Promise<void> {
    await this.request(`/api/messages/${messageId}/read`, { method: 'POST' });
  }

  async markAllRead(userId: number, otherUserId: number): Promise<void> {
    await this.request(`/api/messages/read-all?user_id=${userId}&other_user_id=${otherUserId}`, { method: 'POST' });
  }

  async getContacts(userId: number): Promise<User[]> {
    return this.request<User[]>(`/api/messages/contacts?user_id=${userId}`);
  }
}

export const api = new ApiService();

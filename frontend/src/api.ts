import { 
  User, Token, Course, Lesson, Evaluation, StudentEvaluation,
  CalendarEvent, QuizResult, StudentProgress, ChildProgress, 
  Statistics, Enrollment, UserRole, Message, Conversation,
  Payment, PaymentStatus, StudentForPayment,
  Assignment, AssignmentSubmission, StudentAssignment,
  BookCategory, Book
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

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/auth/change-password?user_id=${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // Users
    async getUsers(role?: UserRole, gradeLevel?: string): Promise<User[]> {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (gradeLevel) params.append('grade_level', gradeLevel);
      const query = params.toString() ? `?${params.toString()}` : '';
      return this.request<User[]>(`/api/users${query}`);
    }

    async updateUserGrade(userId: number, gradeLevel: string | null): Promise<User> {
      const params = gradeLevel ? `?grade_level=${gradeLevel}` : '';
      return this.request<User>(`/api/users/${userId}/grade${params}`, {
        method: 'PUT',
      });
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

    async createCourse(course: { title: string; description: string; thumbnail_url?: string | null; grade_level?: string | null }, teacherId: number): Promise<Course> {
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
  async getCalendarEvents(courseId?: number, startDate?: string, endDate?: string, userId?: number): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (userId) params.append('user_id', userId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<CalendarEvent[]>(`/api/calendar${query}`);
  }

  async createCalendarEvent(event: { title: string; description?: string; event_type: string; start_time: string; end_time: string; course_id?: number; grade_level?: string | null }, createdBy: number, notify: boolean = false): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(`/api/calendar?created_by=${createdBy}&notify=${notify}`, {
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

  async sendMessage(
    receiverId: number, 
    content: string, 
    senderId: number,
    fileUrl?: string,
    fileName?: string,
    fileType?: string
  ): Promise<Message> {
    return this.request<Message>(`/api/messages?sender_id=${senderId}`, {
      method: 'POST',
      body: JSON.stringify({ 
        receiver_id: receiverId, 
        content,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType
      }),
    });
  }

  async uploadFile(file: File): Promise<{ file_url: string; file_name: string; file_type: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al subir archivo');
    }
    
    return response.json();
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

  async getUnreadCount(userId: number): Promise<{ unread_count: number }> {
    return this.request<{ unread_count: number }>(`/api/messages/unread-count?user_id=${userId}`);
  }

  async deleteConversation(otherUserId: number, userId: number): Promise<void> {
    await this.request(`/api/messages/conversation/${otherUserId}?user_id=${userId}`, { method: 'DELETE' });
  }

  // Site Content
  async getSiteContent(lang: string = 'en'): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/api/site-content?lang=${lang}`);
  }

  async getSiteContentSection(section: string, lang: string = 'en'): Promise<{ section: string; content: Record<string, unknown>; updated_at: string }> {
    return this.request<{ section: string; content: Record<string, unknown>; updated_at: string }>(`/api/site-content/${section}?lang=${lang}`);
  }

  async updateSiteContent(section: string, content: Record<string, unknown>, lang: string = 'en'): Promise<{ section: string; content: Record<string, unknown>; updated_at: string }> {
    return this.request<{ section: string; content: Record<string, unknown>; updated_at: string }>(`/api/site-content/${section}?lang=${lang}`, {
      method: 'PUT',
      body: JSON.stringify({ section, content }),
    });
  }

  async translateAllSiteContent(lang: string = 'en'): Promise<{ translated: string[]; source: string; target: string }> {
    return this.request<{ translated: string[]; source: string; target: string }>(`/api/site-content/translate-all?lang=${lang}`, {
      method: 'POST',
    });
  }

  // Applications
  async getApplications(status?: string): Promise<StudentApplication[]> {
    const params = status ? `?status=${status}` : '';
    return this.request<StudentApplication[]>(`/api/applications${params}`);
  }

  async getApplication(applicationId: number): Promise<StudentApplication> {
    return this.request<StudentApplication>(`/api/applications/${applicationId}`);
  }

  async submitApplication(application: {
    student_name: string;
    student_age: number;
    grade_level: string;
    parent_name: string;
    parent_email: string;
    parent_phone: string;
    address?: string;
    message?: string;
    has_esa?: boolean;
  }): Promise<StudentApplication> {
    return this.request<StudentApplication>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(application),
    });
  }

  async updateApplicationStatus(applicationId: number, status: string, reviewedBy: number): Promise<StudentApplication> {
    return this.request<StudentApplication>(`/api/applications/${applicationId}/status?status=${status}&reviewed_by=${reviewedBy}`, {
      method: 'PUT',
    });
  }

  async deleteApplication(applicationId: number): Promise<void> {
    await this.request(`/api/applications/${applicationId}`, { method: 'DELETE' });
  }

  // Payments
  async getPayments(userId: number, studentId?: number, status?: PaymentStatus, year?: number): Promise<Payment[]> {
    const params = new URLSearchParams();
    params.append('user_id', userId.toString());
    if (studentId) params.append('student_id', studentId.toString());
    if (status) params.append('status', status);
    if (year) params.append('year', year.toString());
    return this.request<Payment[]>(`/api/payments?${params.toString()}`);
  }

  async getPayment(paymentId: number): Promise<Payment> {
    return this.request<Payment>(`/api/payments/${paymentId}`);
  }

  async createPayment(payment: {
    student_id: number;
    amount: number;
    month: string;
    year: number;
    due_date: string;
    notes?: string;
  }, userId: number): Promise<Payment> {
    return this.request<Payment>(`/api/payments?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async updatePayment(paymentId: number, update: {
    status: PaymentStatus;
    payment_date?: string;
    notes?: string;
  }, userId: number): Promise<Payment> {
    return this.request<Payment>(`/api/payments/${paymentId}?user_id=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async deletePayment(paymentId: number, userId: number): Promise<void> {
    await this.request(`/api/payments/${paymentId}?user_id=${userId}`, { method: 'DELETE' });
  }

  async getStudentsForPayments(userId: number): Promise<StudentForPayment[]> {
    return this.request<StudentForPayment[]>(`/api/payments/students?user_id=${userId}`);
  }

  // Assignments
  async getAssignments(courseId?: number, userId?: number): Promise<Assignment[]> {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId.toString());
    if (userId) params.append('user_id', userId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Assignment[]>(`/api/assignments${query}`);
  }

  async getAssignment(assignmentId: number): Promise<Assignment> {
    return this.request<Assignment>(`/api/assignments/${assignmentId}`);
  }

  async createAssignment(assignment: {
    title: string;
    description?: string;
    course_id: number;
    due_date: string;
    max_score: number;
  }, userId: number): Promise<Assignment> {
    return this.request<Assignment>(`/api/assignments?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }

  async updateAssignment(assignmentId: number, assignment: {
    title: string;
    description?: string;
    course_id: number;
    due_date: string;
    max_score: number;
  }, userId: number): Promise<Assignment> {
    return this.request<Assignment>(`/api/assignments/${assignmentId}?user_id=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(assignment),
    });
  }

  async deleteAssignment(assignmentId: number, userId: number): Promise<void> {
    await this.request(`/api/assignments/${assignmentId}?user_id=${userId}`, { method: 'DELETE' });
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<AssignmentSubmission[]> {
    return this.request<AssignmentSubmission[]>(`/api/assignments/${assignmentId}/submissions`);
  }

  async getStudentAssignments(studentId: number): Promise<StudentAssignment[]> {
    return this.request<StudentAssignment[]>(`/api/students/${studentId}/assignments`);
  }

  async submitAssignment(submission: {
    assignment_id: number;
    content?: string;
    file_url?: string;
    file_name?: string;
  }, studentId: number): Promise<AssignmentSubmission> {
    return this.request<AssignmentSubmission>(`/api/assignments/submit?student_id=${studentId}`, {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async gradeAssignment(submissionId: number, score: number, feedback: string, userId: number): Promise<AssignmentSubmission> {
    return this.request<AssignmentSubmission>(`/api/assignments/grade?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ submission_id: submissionId, score, feedback }),
    });
  }

  async seedBase44Courses(teacherId: number): Promise<{ message: string; courses_created: number; lessons_created: number; courses_skipped: number }> {
    return this.request<{ message: string; courses_created: number; lessons_created: number; courses_skipped: number }>(`/api/seed-base44-courses?teacher_id=${teacherId}`, {
      method: 'POST',
    });
  }

  // Books
  async getBookCategories(): Promise<BookCategory[]> {
    return this.request<BookCategory[]>('/api/book-categories');
  }

  async createBookCategory(category: { name: string; description?: string; color?: string; icon?: string }, userId: number): Promise<BookCategory> {
    return this.request<BookCategory>(`/api/book-categories?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  async deleteBookCategory(categoryId: number, userId: number): Promise<void> {
    return this.request<void>(`/api/book-categories/${categoryId}?user_id=${userId}`, {
      method: 'DELETE',
    });
  }

  async getBooks(categoryId?: number, gradeLevel?: string, search?: string): Promise<Book[]> {
    const params = new URLSearchParams();
    if (categoryId !== undefined) params.append('category_id', categoryId.toString());
    if (gradeLevel) params.append('grade_level', gradeLevel);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Book[]>(`/api/books${query}`);
  }

  async uploadBookFile(file: File): Promise<{ file_url: string; file_name: string; file_size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}/api/books/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }
    return response.json();
  }

  async createBook(book: { title: string; author?: string; description?: string; category_id?: number; grade_level?: string; file_url: string; file_name: string; file_size?: number; cover_url?: string }, userId: number): Promise<Book> {
    return this.request<Book>(`/api/books?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(book),
    });
  }

  async updateBookCover(bookId: number, coverUrl: string, userId: number): Promise<Book> {
    return this.request<Book>(`/api/books/${bookId}/cover?user_id=${userId}&cover_url=${encodeURIComponent(coverUrl)}`, {
      method: 'PUT',
    });
  }

  async deleteBook(bookId: number, userId: number): Promise<void> {
    return this.request<void>(`/api/books/${bookId}?user_id=${userId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();

// Types for applications
export interface StudentApplication {
  id: number;
  student_name: string;
  student_age: number;
  grade_level: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  address?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
}

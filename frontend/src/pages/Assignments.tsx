import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { Assignment, AssignmentSubmission, StudentAssignment, Course } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, FileText, Clock, CheckCircle, Send, Star, Upload, AlertCircle, Trash2
} from 'lucide-react';

export function Assignments() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Record<number, AssignmentSubmission[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gradeData, setGradeData] = useState({ score: '', feedback: '' });
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: '',
    max_score: '100'
  });

  const texts = {
    es: {
      title: 'Tareas',
      subtitleManage: 'Gestiona las tareas y califica entregas',
      subtitleStudent: 'Revisa y entrega tus tareas pendientes',
      newAssignment: 'Nueva Tarea',
      createAssignment: 'Crear Tarea',
      assignmentTitle: 'Titulo',
      titlePlaceholder: 'Ej: Tarea de Matematicas',
      assignmentDescription: 'Descripcion',
      descriptionPlaceholder: 'Instrucciones para la tarea...',
      course: 'Curso',
      selectCourse: 'Seleccionar curso',
      dueDate: 'Fecha limite',
      maxScore: 'Puntuacion maxima',
      overdue: 'Vencida',
      active: 'Activa',
      pending: 'Pendiente',
      submitted: 'Entregada',
      graded: 'Calificada',
      late: 'Tarde',
      submissions: 'Entregas',
      noAssignments: 'No hay tareas',
      createFirst: 'Crea la primera tarea para tus estudiantes',
      noPending: 'No tienes tareas pendientes',
      submit: 'Entregar',
      submitTitle: 'Entregar Tarea',
      yourAnswer: 'Tu respuesta',
      answerPlaceholder: 'Escribe tu respuesta aqui...',
      attachFile: 'Adjuntar archivo',
      sendSubmission: 'Enviar Entrega',
      grade: 'Calificar',
      scoreMax: 'Puntuacion (max',
      feedback: 'Retroalimentacion',
      feedbackPlaceholder: 'Comentarios para el estudiante...',
      saveGrade: 'Guardar Calificacion',
      viewSubmissions: 'Ver Entregas',
      studentAnswer: 'Respuesta del estudiante',
      attachedFile: 'Archivo adjunto',
      noSubmissions: 'Sin entregas aun',
      unknownCourse: 'Curso desconocido',
      delete: 'Eliminar',
      confirmDelete: 'Estas seguro de eliminar esta tarea?',
      yourScore: 'Tu calificacion',
      teacherFeedback: 'Retroalimentacion del profesor'
    },
    en: {
      title: 'Assignments',
      subtitleManage: 'Manage assignments and grade submissions',
      subtitleStudent: 'Review and submit your pending assignments',
      newAssignment: 'New Assignment',
      createAssignment: 'Create Assignment',
      assignmentTitle: 'Title',
      titlePlaceholder: 'Ex: Math Assignment',
      assignmentDescription: 'Description',
      descriptionPlaceholder: 'Instructions for the assignment...',
      course: 'Course',
      selectCourse: 'Select course',
      dueDate: 'Due date',
      maxScore: 'Maximum score',
      overdue: 'Overdue',
      active: 'Active',
      pending: 'Pending',
      submitted: 'Submitted',
      graded: 'Graded',
      late: 'Late',
      submissions: 'Submissions',
      noAssignments: 'No assignments',
      createFirst: 'Create the first assignment for your students',
      noPending: 'You have no pending assignments',
      submit: 'Submit',
      submitTitle: 'Submit Assignment',
      yourAnswer: 'Your answer',
      answerPlaceholder: 'Write your answer here...',
      attachFile: 'Attach file',
      sendSubmission: 'Send Submission',
      grade: 'Grade',
      scoreMax: 'Score (max',
      feedback: 'Feedback',
      feedbackPlaceholder: 'Comments for the student...',
      saveGrade: 'Save Grade',
      viewSubmissions: 'View Submissions',
      studentAnswer: 'Student answer',
      attachedFile: 'Attached file',
      noSubmissions: 'No submissions yet',
      unknownCourse: 'Unknown course',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this assignment?',
      yourScore: 'Your score',
      teacherFeedback: 'Teacher feedback'
    }
  };

  const t = texts[language] || texts.es;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const coursesData = await api.getCourses();
      setCourses(coursesData);

      if (user.role === 'student') {
        const studentData = await api.getStudentAssignments(user.id);
        setStudentAssignments(studentData);
      } else {
        const assignmentsData = await api.getAssignments();
        setAssignments(assignmentsData);

        if (user.role === 'teacher' || user.role === 'director' || user.role === 'superuser') {
          const subsMap: Record<number, AssignmentSubmission[]> = {};
          for (const assignment of assignmentsData) {
            const subs = await api.getAssignmentSubmissions(assignment.id);
            subsMap[assignment.id] = subs;
          }
          setSubmissions(subsMap);
        }
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.title || !newAssignment.course_id || !newAssignment.due_date || !user) return;
    try {
      await api.createAssignment({
        title: newAssignment.title,
        description: newAssignment.description,
        course_id: parseInt(newAssignment.course_id),
        due_date: new Date(newAssignment.due_date).toISOString(),
        max_score: parseFloat(newAssignment.max_score)
      }, user.id);
      setNewAssignment({ title: '', description: '', course_id: '', due_date: '', max_score: '100' });
      setShowAddAssignment(false);
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!user || !confirm(t.confirmDelete)) return;
    try {
      await api.deleteAssignment(assignmentId, user.id);
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      setSubmissionFile({ url: result.file_url, name: result.file_name });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !user || (!submissionContent && !submissionFile)) return;
    try {
      await api.submitAssignment({
        assignment_id: selectedAssignment.id,
        content: submissionContent || undefined,
        file_url: submissionFile?.url,
        file_name: submissionFile?.name
      }, user.id);
      setSubmissionContent('');
      setSubmissionFile(null);
      setShowSubmitDialog(false);
      setSelectedAssignment(null);
      loadData();
    } catch (error) {
      console.error('Error submitting assignment:', error);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !gradeData.score || !user) return;
    try {
      await api.gradeAssignment(
        selectedSubmission.id,
        parseFloat(gradeData.score),
        gradeData.feedback,
        user.id
      );
      setGradeData({ score: '', feedback: '' });
      setShowGradeDialog(false);
      setSelectedSubmission(null);
      loadData();
    } catch (error) {
      console.error('Error grading submission:', error);
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  const canManage = user?.role === 'teacher' || user?.role === 'director' || user?.role === 'superuser';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">{t.pending}</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-700">{t.submitted}</Badge>;
      case 'graded':
        return <Badge className="bg-green-100 text-green-700">{t.graded}</Badge>;
      case 'late':
        return <Badge className="bg-orange-100 text-orange-700">{t.late}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
          <p className="text-gray-500">
            {canManage ? t.subtitleManage : t.subtitleStudent}
          </p>
        </div>
        {canManage && (
          <Dialog open={showAddAssignment} onOpenChange={setShowAddAssignment}>
            <DialogTrigger asChild>
              <Button className="bg-teal-500 hover:bg-teal-600">
                <Plus className="h-4 w-4 mr-2" />
                {t.newAssignment}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.createAssignment}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t.assignmentTitle}</Label>
                  <Input
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder={t.titlePlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.assignmentDescription}</Label>
                  <Textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    placeholder={t.descriptionPlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.course}</Label>
                  <Select
                    value={newAssignment.course_id}
                    onValueChange={(value) => setNewAssignment({ ...newAssignment, course_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectCourse} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.dueDate}</Label>
                    <Input
                      type="datetime-local"
                      value={newAssignment.due_date}
                      onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.maxScore}</Label>
                    <Input
                      type="number"
                      value={newAssignment.max_score}
                      onChange={(e) => setNewAssignment({ ...newAssignment, max_score: e.target.value })}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  onClick={handleAddAssignment}
                  disabled={!newAssignment.title || !newAssignment.course_id || !newAssignment.due_date}
                >
                  {t.createAssignment}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Student View */}
      {user?.role === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentAssignments.map(({ assignment, submission }) => (
            <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <p className="text-sm text-gray-500">{assignment.course_title}</p>
                  </div>
                  {submission ? (
                    getStatusBadge(submission.status)
                  ) : isOverdue(assignment.due_date) ? (
                    <Badge variant="destructive">{t.overdue}</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">{t.active}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{assignment.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(assignment.due_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {assignment.max_score} pts
                  </span>
                </div>

                {/* Show grade if graded */}
                {submission?.status === 'graded' && (
                  <div className="p-3 bg-green-50 rounded-lg mb-4">
                    <p className="text-sm font-medium text-green-700">
                      {t.yourScore}: {submission.score}/{assignment.max_score}
                    </p>
                    {submission.feedback && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">{t.teacherFeedback}:</span> {submission.feedback}
                      </p>
                    )}
                  </div>
                )}

                {/* Submit button for students */}
                {!submission && !isOverdue(assignment.due_date) && (
                  <Button 
                    className="w-full bg-teal-500 hover:bg-teal-600"
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setShowSubmitDialog(true);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t.submit}
                  </Button>
                )}

                {/* Late submission warning */}
                {!submission && isOverdue(assignment.due_date) && (
                  <div className="flex items-center gap-2 text-orange-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {t.overdue}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {studentAssignments.length === 0 && (
            <Card className="col-span-full p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">{t.noAssignments}</h3>
              <p className="text-gray-500">{t.noPending}</p>
            </Card>
          )}
        </div>
      )}

      {/* Teacher/Admin View */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(assignment => (
            <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <p className="text-sm text-gray-500">{assignment.course_title}</p>
                  </div>
                  {isOverdue(assignment.due_date) ? (
                    <Badge variant="destructive">{t.overdue}</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">{t.active}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{assignment.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(assignment.due_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {assignment.max_score} pts
                  </span>
                </div>

                {/* Submissions summary */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm">
                    <span className="font-medium">{t.submissions}:</span> {assignment.submissions_count}
                  </p>
                  <p className="text-sm text-green-600">
                    {t.graded}: {assignment.graded_count}
                  </p>
                </div>

                {/* View submissions button */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-teal-500 hover:bg-teal-600"
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setShowSubmissionsDialog(true);
                    }}
                  >
                    {t.viewSubmissions}
                  </Button>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {assignments.length === 0 && (
            <Card className="col-span-full p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">{t.noAssignments}</h3>
              <p className="text-gray-500">{t.createFirst}</p>
            </Card>
          )}
        </div>
      )}

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.submitTitle}: {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">{selectedAssignment?.description}</p>
            <div className="space-y-2">
              <Label>{t.yourAnswer}</Label>
              <Textarea
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder={t.answerPlaceholder}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.attachFile}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
              </div>
              {submissionFile && (
                <p className="text-sm text-green-600">{submissionFile.name}</p>
              )}
            </div>
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600"
              onClick={handleSubmitAssignment}
              disabled={!submissionContent && !submissionFile}
            >
              <Send className="h-4 w-4 mr-2" />
              {t.sendSubmission}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Submissions Dialog */}
      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.submissions}: {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
            {selectedAssignment && submissions[selectedAssignment.id]?.length > 0 ? (
              submissions[selectedAssignment.id].map(sub => (
                <div 
                  key={sub.id} 
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{sub.student_name}</span>
                    {getStatusBadge(sub.status)}
                  </div>
                  {sub.content && (
                    <p className="text-sm text-gray-600 mb-2">{sub.content}</p>
                  )}
                  {sub.file_url && (
                    <a 
                      href={sub.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:underline flex items-center gap-1"
                    >
                      <Upload className="h-4 w-4" />
                      {sub.file_name || t.attachedFile}
                    </a>
                  )}
                  {sub.submitted_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(sub.submitted_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                    </p>
                  )}
                  {sub.status !== 'graded' && sub.status !== 'pending' && (
                    <Button
                      size="sm"
                      className="mt-2 bg-teal-500 hover:bg-teal-600"
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setShowGradeDialog(true);
                      }}
                    >
                      {t.grade}
                    </Button>
                  )}
                  {sub.status === 'graded' && (
                    <div className="mt-2 p-2 bg-green-50 rounded">
                      <p className="text-sm text-green-700">
                        {t.scoreMax} {selectedAssignment.max_score}): {sub.score}
                      </p>
                      {sub.feedback && (
                        <p className="text-sm text-gray-600">{sub.feedback}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">{t.noSubmissions}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.grade}: {selectedSubmission?.student_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">{t.studentAnswer}:</p>
              <p className="text-sm text-gray-600">{selectedSubmission?.content}</p>
              {selectedSubmission?.file_url && (
                <a 
                  href={selectedSubmission.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-teal-600 hover:underline flex items-center gap-1 mt-2"
                >
                  <Upload className="h-4 w-4" />
                  {selectedSubmission.file_name || t.attachedFile}
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.scoreMax} {selectedAssignment?.max_score})</Label>
                <Input
                  type="number"
                  value={gradeData.score}
                  onChange={(e) => setGradeData({ ...gradeData, score: e.target.value })}
                  max={selectedAssignment?.max_score}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.feedback}</Label>
              <Textarea
                value={gradeData.feedback}
                onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                placeholder={t.feedbackPlaceholder}
              />
            </div>
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600"
              onClick={handleGradeSubmission}
              disabled={!gradeData.score}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t.saveGrade}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

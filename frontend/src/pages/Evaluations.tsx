import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { Evaluation, StudentEvaluation, Course } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, FileText, Clock, CheckCircle, Send, Star
} from 'lucide-react';

export function Evaluations() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Record<number, StudentEvaluation[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddEval, setShowAddEval] = useState(false);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentEvaluation | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [gradeData, setGradeData] = useState({ score: '', feedback: '' });
  const [newEval, setNewEval] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: '',
    max_score: '100'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const evalsData = await api.getEvaluations();
      setEvaluations(evalsData);
      const coursesData = await api.getCourses();
      setCourses(coursesData);

      // Load submissions for each evaluation (for teachers)
      if (user?.role === 'teacher' || user?.role === 'director') {
        const subsMap: Record<number, StudentEvaluation[]> = {};
        for (const eval_ of evalsData) {
          const subs = await api.getEvaluationSubmissions(eval_.id);
          subsMap[eval_.id] = subs;
        }
        setSubmissions(subsMap);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvaluation = async () => {
    if (!newEval.title || !newEval.course_id || !newEval.due_date) return;
    try {
      await api.createEvaluation({
        title: newEval.title,
        description: newEval.description,
        course_id: parseInt(newEval.course_id),
        due_date: new Date(newEval.due_date).toISOString(),
        max_score: parseFloat(newEval.max_score)
      });
      setNewEval({ title: '', description: '', course_id: '', due_date: '', max_score: '100' });
      setShowAddEval(false);
      loadData();
    } catch (error) {
      console.error('Error creating evaluation:', error);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedEval || !user || !submissionContent) return;
    try {
      await api.submitEvaluation(selectedEval.id, submissionContent, user.id);
      setSubmissionContent('');
      setShowSubmitDialog(false);
      setSelectedEval(null);
      loadData();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !gradeData.score) return;
    try {
      await api.gradeEvaluation(
        selectedSubmission.id,
        parseFloat(gradeData.score),
        gradeData.feedback
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
  const canManage = user?.role === 'teacher' || user?.role === 'director';

    const getCourseName = (courseId: number) => {
      const course = courses.find(c => c.id === courseId);
      return course?.title || t.evaluations.unknownCourse;
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
                  <h1 className="text-2xl font-bold text-gray-800">{t.evaluations.title}</h1>
                  <p className="text-gray-500">
                    {canManage ? t.evaluations.subtitleManage : t.evaluations.subtitleStudent}
                  </p>
                </div>
        {canManage && (
          <Dialog open={showAddEval} onOpenChange={setShowAddEval}>
            <DialogTrigger asChild>
                          <Button className="bg-teal-500 hover:bg-teal-600">
                            <Plus className="h-4 w-4 mr-2" />
                            {t.evaluations.newEvaluation}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t.evaluations.createEvaluation}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>{t.evaluations.evaluationTitle}</Label>
                              <Input
                                value={newEval.title}
                                onChange={(e) => setNewEval({ ...newEval, title: e.target.value })}
                                placeholder={t.evaluations.titlePlaceholder}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.evaluations.evaluationDescription}</Label>
                              <Textarea
                                value={newEval.description}
                                onChange={(e) => setNewEval({ ...newEval, description: e.target.value })}
                                placeholder={t.evaluations.descriptionPlaceholder}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.evaluations.course}</Label>
                              <Select
                                value={newEval.course_id}
                                onValueChange={(value) => setNewEval({ ...newEval, course_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t.evaluations.selectCourse} />
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
                                <Label>{t.evaluations.dueDate}</Label>
                                <Input
                                  type="datetime-local"
                                  value={newEval.due_date}
                                  onChange={(e) => setNewEval({ ...newEval, due_date: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t.evaluations.maxScore}</Label>
                                <Input
                                  type="number"
                                  value={newEval.max_score}
                                  onChange={(e) => setNewEval({ ...newEval, max_score: e.target.value })}
                                />
                              </div>
                            </div>
                            <Button 
                              className="w-full bg-teal-500 hover:bg-teal-600"
                              onClick={handleAddEvaluation}
                              disabled={!newEval.title || !newEval.course_id || !newEval.due_date}
                            >
                              {t.evaluations.createEvaluation}
                            </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Evaluations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evaluations.map(eval_ => (
          <Card key={eval_.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{eval_.title}</CardTitle>
                  <p className="text-sm text-gray-500">{getCourseName(eval_.course_id)}</p>
                </div>
                                {isOverdue(eval_.due_date) ? (
                                  <Badge variant="destructive">{t.evaluations.overdue}</Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-700">{t.evaluations.active}</Badge>
                                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{eval_.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                                    {new Date(eval_.due_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {eval_.max_score} pts
                </span>
              </div>

              {/* Student: Submit button */}
              {user?.role === 'student' && !isOverdue(eval_.due_date) && (
                <Button 
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  onClick={() => {
                    setSelectedEval(eval_);
                    setShowSubmitDialog(true);
                  }}
                >
                                  <Send className="h-4 w-4 mr-2" />
                                  {t.evaluations.submit}
                                </Button>
              )}

              {/* Teacher: View submissions */}
              {canManage && submissions[eval_.id] && (
                <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                      {t.evaluations.submissions}: {submissions[eval_.id].length}
                                    </p>
                  {submissions[eval_.id].slice(0, 3).map(sub => (
                    <div 
                      key={sub.id} 
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm">{sub.student_name}</span>
                      {sub.score !== null ? (
                        <Badge className="bg-green-100 text-green-700">
                          {sub.score}/{eval_.max_score}
                        </Badge>
                      ) : (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => {
                                                    setSelectedSubmission(sub);
                                                    setSelectedEval(eval_);
                                                    setShowGradeDialog(true);
                                                  }}
                                                >
                                                  {t.evaluations.gradeVerb}
                                                </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

            {evaluations.length === 0 && (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">{t.evaluations.noEvaluations}</h3>
                <p className="text-gray-500">
                  {canManage ? t.evaluations.createFirst : t.evaluations.noPending}
                </p>
              </Card>
            )}

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
                      <DialogTitle>{t.evaluations.submitTitle}: {selectedEval?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <p className="text-sm text-gray-600">{selectedEval?.description}</p>
                      <div className="space-y-2">
                        <Label>{t.evaluations.yourAnswer}</Label>
                        <Textarea
                          value={submissionContent}
                          onChange={(e) => setSubmissionContent(e.target.value)}
                          placeholder={t.evaluations.answerPlaceholder}
                          rows={6}
                        />
                      </div>
                      <Button 
                        className="w-full bg-teal-500 hover:bg-teal-600"
                        onClick={handleSubmitEvaluation}
                        disabled={!submissionContent}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t.evaluations.sendSubmission}
                      </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent>
          <DialogHeader>
                      <DialogTitle>{t.evaluations.gradeVerb}: {selectedSubmission?.student_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-2">{t.evaluations.studentAnswer}:</p>
                        <p className="text-sm text-gray-600">{selectedSubmission?.content}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t.evaluations.scoreMax}: {selectedEval?.max_score})</Label>
                          <Input
                            type="number"
                            value={gradeData.score}
                            onChange={(e) => setGradeData({ ...gradeData, score: e.target.value })}
                            max={selectedEval?.max_score}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t.evaluations.feedback}</Label>
                        <Textarea
                          value={gradeData.feedback}
                          onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                          placeholder={t.evaluations.feedbackPlaceholder}
                        />
                      </div>
                      <Button 
                        className="w-full bg-teal-500 hover:bg-teal-600"
                        onClick={handleGradeSubmission}
                        disabled={!gradeData.score}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t.evaluations.saveGrade}
                      </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

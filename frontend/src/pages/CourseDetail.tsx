import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Course, Lesson, QuizQuestion } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, Play, FileText, HelpCircle, Plus, Trash2, 
  CheckCircle, BookOpen, Users
} from 'lucide-react';

export function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({
    title: '',
    lesson_type: 'text' as 'video' | 'text' | 'quiz',
    content: '',
    order: 1
  });
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  
  // Quiz builder state
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    question: string;
    options: string[];
    correct_answer: number;
  }>>([{ question: '', options: ['', ''], correct_answer: 0 }]);

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    try {
      const courseData = await api.getCourse(parseInt(courseId));
      setCourse(courseData);
      const lessonsData = await api.getLessons(parseInt(courseId));
      setLessons(lessonsData);
      if (lessonsData.length > 0) {
        setSelectedLesson(lessonsData[0]);
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = async () => {
    if (!newLesson.title || !courseId) return;
    
    let content = newLesson.content;
    
    // If it's a quiz, convert the quiz builder state to JSON
    if (newLesson.lesson_type === 'quiz') {
      // Validate quiz questions
      const validQuestions = quizQuestions.filter(q => 
        q.question.trim() && q.options.filter(o => o.trim()).length >= 2
      );
      if (validQuestions.length === 0) {
        alert('Agrega al menos una pregunta con 2 opciones');
        return;
      }
      content = JSON.stringify(validQuestions);
    }
    
    try {
      await api.createLesson({
        course_id: parseInt(courseId),
        title: newLesson.title,
        lesson_type: newLesson.lesson_type,
        content: content,
        order: lessons.length + 1
      });
      setNewLesson({ title: '', lesson_type: 'text', content: '', order: 1 });
      setQuizQuestions([{ question: '', options: ['', ''], correct_answer: 0 }]);
      setShowAddLesson(false);
      loadCourse();
    } catch (error) {
      console.error('Error creating lesson:', error);
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm('Eliminar esta leccion?')) return;
    try {
      await api.deleteLesson(lessonId);
      loadCourse();
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  const handleCompleteLesson = async (lessonId: number) => {
    if (!user) return;
    try {
      await api.completeLesson(lessonId, user.id);
    } catch (error) {
      console.error('Error completing lesson:', error);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedLesson || !user) return;
    try {
      const result = await api.submitQuiz(selectedLesson.id, quizAnswers, user.id);
      setQuizScore(result.score);
      setQuizSubmitted(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const canManage = user?.role === 'superuser' || user?.role === 'director' || (user?.role === 'teacher' && course?.teacher_id === user?.id);

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'quiz': return <HelpCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'quiz': return 'Quiz';
      default: return 'Texto';
    }
  };

  // Quiz builder helper functions
  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, { question: '', options: ['', ''], correct_answer: 0 }]);
  };

  const removeQuestion = (index: number) => {
    if (quizQuestions.length > 1) {
      setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, question: string) => {
    const updated = [...quizQuestions];
    updated[index].question = question;
    setQuizQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...quizQuestions];
    updated[questionIndex].options.push('');
    setQuizQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...quizQuestions];
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
      if (updated[questionIndex].correct_answer >= updated[questionIndex].options.length) {
        updated[questionIndex].correct_answer = 0;
      }
      setQuizQuestions(updated);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...quizQuestions];
    updated[questionIndex].options[optionIndex] = value;
    setQuizQuestions(updated);
  };

  const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const updated = [...quizQuestions];
    updated[questionIndex].correct_answer = optionIndex;
    setQuizQuestions(updated);
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // Already an embed URL
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // Extract video ID from various YouTube URL formats
    let videoId = '';
    
    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }
    
    // Format: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }
    
    // Format: https://www.youtube.com/v/VIDEO_ID
    const vMatch = url.match(/youtube\.com\/v\/([^?&]+)/);
    if (vMatch) {
      videoId = vMatch[1];
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Return original URL if no match (might be another video platform)
    return url;
  };

  const renderLessonContent = () => {
    if (!selectedLesson) return null;

    if (selectedLesson.lesson_type === 'video') {
      return (
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            src={getYouTubeEmbedUrl(selectedLesson.content)}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }

    if (selectedLesson.lesson_type === 'quiz') {
      let questions: QuizQuestion[] = [];
      try {
        questions = JSON.parse(selectedLesson.content);
      } catch (e) {
        return <p className="text-red-500">Error al cargar el quiz</p>;
      }

      if (quizSubmitted) {
        return (
          <Card className="p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Quiz Completado!</h3>
            <p className="text-3xl font-bold text-teal-600 mb-4">{quizScore?.toFixed(0)}%</p>
            <Button onClick={() => {
              setQuizSubmitted(false);
              setQuizAnswers([]);
              setQuizScore(null);
            }}>
              Intentar de Nuevo
            </Button>
          </Card>
        );
      }

      return (
        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <Card key={qIndex} className="p-4">
              <h4 className="font-medium mb-3">{qIndex + 1}. {q.question}</h4>
              <RadioGroup
                value={quizAnswers[qIndex]?.toString()}
                onValueChange={(value) => {
                  const newAnswers = [...quizAnswers];
                  newAnswers[qIndex] = parseInt(value);
                  setQuizAnswers(newAnswers);
                }}
              >
                {q.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center space-x-2">
                    <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                    <Label htmlFor={`q${qIndex}-o${oIndex}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </Card>
          ))}
          <Button 
            className="w-full bg-teal-500 hover:bg-teal-600"
            onClick={handleSubmitQuiz}
            disabled={quizAnswers.length !== questions.length}
          >
            Enviar Respuestas
          </Button>
        </div>
      );
    }

    // Text content
    return (
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Curso no encontrado</p>
        <Button variant="link" onClick={() => navigate('/app/courses')}>
          Volver a cursos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/app/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Course Info */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="bg-white/20 mb-2">{course.is_published ? 'Publicado' : 'Borrador'}</Badge>
            <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
            <p className="text-teal-100 mb-4">{course.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {course.teacher_name}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {lessons.length} lecciones
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lessons List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lecciones</CardTitle>
                {canManage && (
                  <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agregar Leccion</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Titulo</Label>
                          <Input
                            value={newLesson.title}
                            onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                            placeholder="Titulo de la leccion"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={newLesson.lesson_type}
                            onValueChange={(value: 'video' | 'text' | 'quiz') => 
                              setNewLesson({ ...newLesson, lesson_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Content field - different for each lesson type */}
                        {newLesson.lesson_type === 'video' && (
                          <div className="space-y-2">
                            <Label>URL del Video (YouTube)</Label>
                            <Input
                              value={newLesson.content}
                              onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
                              placeholder="https://www.youtube.com/watch?v=..."
                            />
                            <p className="text-xs text-gray-500">Pega cualquier link de YouTube</p>
                          </div>
                        )}

                        {newLesson.lesson_type === 'text' && (
                          <div className="space-y-2">
                            <Label>Contenido</Label>
                            <Textarea
                              value={newLesson.content}
                              onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
                              placeholder="Escribe el contenido de la leccion..."
                              rows={5}
                            />
                          </div>
                        )}

                        {newLesson.lesson_type === 'quiz' && (
                          <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            <Label>Preguntas del Quiz</Label>
                            {quizQuestions.map((q, qIndex) => (
                              <Card key={qIndex} className="p-4 bg-gray-50">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">Pregunta {qIndex + 1}</span>
                                    {quizQuestions.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeQuestion(qIndex)}
                                      >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                  <Input
                                    value={q.question}
                                    onChange={(e) => updateQuestion(qIndex, e.target.value)}
                                    placeholder="Escribe la pregunta..."
                                  />
                                  <div className="space-y-2">
                                    <span className="text-xs text-gray-500">Opciones (haz clic en la correcta)</span>
                                    {q.options.map((option, oIndex) => (
                                      <div key={oIndex} className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setCorrectAnswer(qIndex, oIndex)}
                                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            q.correct_answer === oIndex
                                              ? 'bg-green-500 border-green-500 text-white'
                                              : 'border-gray-300 hover:border-green-400'
                                          }`}
                                        >
                                          {q.correct_answer === oIndex && <CheckCircle className="h-4 w-4" />}
                                        </button>
                                        <Input
                                          value={option}
                                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                          placeholder={`Opcion ${oIndex + 1}`}
                                          className="flex-1"
                                        />
                                        {q.options.length > 2 && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOption(qIndex, oIndex)}
                                          >
                                            <Trash2 className="h-3 w-3 text-gray-400" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addOption(qIndex)}
                                      className="w-full mt-2"
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Agregar Opcion
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addQuestion}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" /> Agregar Pregunta
                            </Button>
                          </div>
                        )}
                        <Button 
                          className="w-full bg-teal-500 hover:bg-teal-600"
                          onClick={handleAddLesson}
                        >
                          Agregar Leccion
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedLesson?.id === lesson.id 
                      ? 'bg-teal-50 border border-teal-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedLesson(lesson);
                    setQuizSubmitted(false);
                    setQuizAnswers([]);
                    setQuizScore(null);
                  }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedLesson?.id === lesson.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getLessonIcon(lesson.lesson_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lesson.title}</p>
                    <p className="text-xs text-gray-500">{getLessonTypeLabel(lesson.lesson_type)}</p>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLesson(lesson.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              {lessons.length === 0 && (
                <p className="text-center text-gray-500 py-4">No hay lecciones</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lesson Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{selectedLesson?.title || 'Selecciona una leccion'}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLesson ? (
                <div>
                  {renderLessonContent()}
                  {selectedLesson.lesson_type !== 'quiz' && user?.role === 'student' && (
                    <Button 
                      className="mt-4 bg-teal-500 hover:bg-teal-600"
                      onClick={() => handleCompleteLesson(selectedLesson.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Completada
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">
                  Selecciona una leccion para ver su contenido
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

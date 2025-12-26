import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { StudentProgress, ChildProgress } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle, Award, TrendingUp, BarChart3, Target
} from 'lucide-react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function ProgressPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    try {
      if (user.role === 'student') {
        const data = await api.getStudentProgress(user.id);
        setProgress(data);
      } else if (user.role === 'parent') {
        const data = await api.getChildrenProgress(user.id);
        setChildrenProgress(data);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallProgress = (progressList: StudentProgress[]) => {
    if (progressList.length === 0) return 0;
    const totalCompleted = progressList.reduce((sum, p) => sum + p.completed_lessons, 0);
    const totalLessons = progressList.reduce((sum, p) => sum + p.total_lessons, 0);
    return totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;
  };

  const calculateAverageScore = (progressList: StudentProgress[]) => {
    const scores = progressList.filter(p => p.average_quiz_score !== null).map(p => p.average_quiz_score!);
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  };

  const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Student View
  if (user?.role === 'student') {
    const overallProgress = calculateOverallProgress(progress);
    const averageScore = calculateAverageScore(progress);
    const totalCompleted = progress.reduce((sum, p) => sum + p.completed_lessons, 0);
    const totalLessons = progress.reduce((sum, p) => sum + p.total_lessons, 0);
    const totalEvaluations = progress.reduce((sum, p) => sum + p.evaluations_completed, 0);

    const pieData = progress.map(p => ({
      name: p.course_title,
      value: p.completed_lessons
    }));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mi Progreso</h1>
          <p className="text-gray-500">Seguimiento de tu aprendizaje</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm">Progreso General</p>
                  <p className="text-3xl font-bold">{overallProgress.toFixed(0)}%</p>
                </div>
                <TrendingUp className="h-10 w-10 text-teal-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Lecciones Completadas</p>
                  <p className="text-2xl font-bold">{totalCompleted}/{totalLessons}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Promedio Quizzes</p>
                  <p className="text-2xl font-bold">
                    {averageScore !== null ? `${averageScore.toFixed(0)}%` : 'N/A'}
                  </p>
                </div>
                <Award className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Evaluaciones</p>
                  <p className="text-2xl font-bold">{totalEvaluations}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress by Course */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progreso por Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {progress.map((p, index) => (
                <div key={p.course_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{p.course_title}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {p.completed_lessons}/{p.total_lessons}
                    </span>
                  </div>
                  <Progress 
                    value={p.total_lessons > 0 ? (p.completed_lessons / p.total_lessons) * 100 : 0}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {p.average_quiz_score !== null 
                        ? `Quiz: ${p.average_quiz_score.toFixed(0)}%` 
                        : 'Sin quizzes'}
                    </span>
                    <span>
                      Evaluaciones: {p.evaluations_completed}/{p.total_evaluations}
                    </span>
                  </div>
                </div>
              ))}
              {progress.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No estas inscrito en ningun curso
                </p>
              )}
            </CardContent>
          </Card>

          {/* Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribucion de Lecciones</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12">
                  No hay datos para mostrar
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Parent View
  if (user?.role === 'parent') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Progreso de Mis Hijos</h1>
          <p className="text-gray-500">Seguimiento del aprendizaje de tus hijos</p>
        </div>

        {childrenProgress.map((child) => {
          const childOverall = calculateOverallProgress(child.courses);
          const childAverage = calculateAverageScore(child.courses);

          return (
            <Card key={child.student.id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-teal-100 text-teal-600 text-lg">
                      {child.student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{child.student.name}</CardTitle>
                    <p className="text-sm text-gray-500">{child.student.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Child Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-teal-50 rounded-lg">
                    <p className="text-2xl font-bold text-teal-600">{childOverall.toFixed(0)}%</p>
                    <p className="text-xs text-gray-500">Progreso General</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">
                      {childAverage !== null ? `${childAverage.toFixed(0)}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">Promedio Quizzes</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{child.courses.length}</p>
                    <p className="text-xs text-gray-500">Cursos Inscritos</p>
                  </div>
                </div>

                {/* Course Progress */}
                <div className="space-y-3">
                  {child.courses.map((course) => (
                    <div key={course.course_id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{course.course_title}</span>
                        <span className="text-xs text-gray-500">
                          {course.completed_lessons}/{course.total_lessons} lecciones
                        </span>
                      </div>
                      <Progress 
                        value={course.total_lessons > 0 ? (course.completed_lessons / course.total_lessons) * 100 : 0}
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {childrenProgress.length === 0 && (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Sin hijos vinculados</h3>
            <p className="text-gray-500">
              Contacta al administrador para vincular a tus hijos
            </p>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Course, Statistics, StudentProgress, ChildProgress, User } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, BookOpen, GraduationCap, Award, TrendingUp, 
  Play, Plus
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const coursesData = await api.getCourses(undefined, true);
      setCourses(coursesData);

      if (user?.role === 'director') {
        const stats = await api.getStatistics();
        setStatistics(stats);
        const teachersList = await api.getUsers('teacher');
        setTeachers(teachersList);
      }

      if (user?.role === 'student') {
        const progressData = await api.getStudentProgress(user.id);
        setProgress(progressData);
      }

      if (user?.role === 'parent') {
        const childrenData = await api.getChildrenProgress(user.id);
        setChildrenProgress(childrenData);
      }

      if (user?.role === 'teacher') {
        const teacherCourses = await api.getCourses(user.id);
        setCourses(teacherCourses);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const mockProgressData = [
    { month: 'Ene', progress: 20 },
    { month: 'Feb', progress: 35 },
    { month: 'Mar', progress: 45 },
    { month: 'Abr', progress: 55 },
    { month: 'May', progress: 70 },
    { month: 'Jun', progress: 85 },
  ];

  const getCourseColor = (index: number) => {
    const colors = ['bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-purple-500', 'bg-blue-500'];
    return colors[index % colors.length];
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">Aprende Efectivamente Con Nosotros!</h1>
          <p className="text-teal-100 mb-4">Bienvenido a EmunahAcademy - Tu plataforma de aprendizaje</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-full">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statistics?.total_students || courses.length * 10}+</p>
                <p className="text-xs text-teal-100">Estudiantes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-full">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statistics?.total_teachers || teachers.length}+</p>
                <p className="text-xs text-teal-100">Mentores Expertos</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 flex items-center justify-center opacity-20">
          <GraduationCap className="h-48 w-48" />
        </div>
      </div>

      {/* Stats Cards for Director */}
      {user?.role === 'director' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Usuarios</p>
                  <p className="text-2xl font-bold">{statistics.total_users}</p>
                </div>
                <div className="bg-teal-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cursos Activos</p>
                  <p className="text-2xl font-bold">{statistics.published_courses}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inscripciones</p>
                  <p className="text-2xl font-bold">{statistics.total_enrollments}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Lecciones</p>
                  <p className="text-2xl font-bold">{statistics.total_lessons}</p>
                </div>
                <div className="bg-rose-100 p-3 rounded-full">
                  <Play className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions for Director/Teacher */}
      {(user?.role === 'director' || user?.role === 'teacher') && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Tienes mas conocimiento para compartir?</h3>
                <p className="text-sm text-gray-500">Crea un nuevo curso y comparte tu experiencia</p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate('/courses')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Nuevo Curso
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Courses */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Cursos Populares</CardTitle>
                <Button variant="link" className="text-teal-600 p-0" onClick={() => navigate('/courses')}>
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {courses.slice(0, 4).map((course, index) => (
                <div 
                  key={course.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <div className={`${getCourseColor(index)} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold`}>
                    {course.title.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{course.title}</p>
                    <p className="text-xs text-gray-500">{course.teacher_name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-teal-600">
                    Ver Curso
                  </Button>
                </div>
              ))}
              {courses.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay cursos disponibles</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Actividad Actual</CardTitle>
              <p className="text-sm text-gray-500">Progreso Mensual</p>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockProgressData}>
                    <defs>
                      <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="#14b8a6" 
                      fillOpacity={1} 
                      fill="url(#colorProgress)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-amber-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">450+</p>
                  <p className="text-xs text-amber-700">Estudiantes Activos</p>
                </div>
                <div className="bg-rose-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-rose-600">200+</p>
                  <p className="text-xs text-rose-700">Video Cursos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best Instructors */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Mejores Instructores</CardTitle>
                <Button variant="link" className="text-teal-600 p-0">Ver Todos</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {teachers.slice(0, 4).map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-teal-100 text-teal-600">
                        {teacher.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-800">{teacher.name}</p>
                      <p className="text-xs text-gray-500">Profesor</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Cursos</Button>
                </div>
              ))}
              {teachers.length === 0 && (
                <div className="space-y-3">
                  {['Carlos Rodriguez', 'Ana Martinez', 'Luis Garcia'].map((name, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-teal-100 text-teal-600">
                            {name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-800">{name}</p>
                          <p className="text-xs text-gray-500">Profesor</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Cursos</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Progress Section */}
      {user?.role === 'student' && progress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mi Progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.map((p) => (
              <div key={p.course_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.course_title}</span>
                  <span className="text-sm text-gray-500">
                    {p.completed_lessons}/{p.total_lessons} lecciones
                  </span>
                </div>
                <Progress 
                  value={p.total_lessons > 0 ? (p.completed_lessons / p.total_lessons) * 100 : 0} 
                  className="h-2"
                />
                {p.average_quiz_score !== null && (
                  <p className="text-xs text-gray-500">
                    Promedio en quizzes: {p.average_quiz_score.toFixed(1)}%
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Parent - Children Progress */}
      {user?.role === 'parent' && childrenProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progreso de Mis Hijos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {childrenProgress.map((child) => (
              <div key={child.student.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-teal-100 text-teal-600">
                      {child.student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{child.student.name}</span>
                </div>
                {child.courses.map((course) => (
                  <div key={course.course_id} className="ml-12 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{course.course_title}</span>
                      <span className="text-xs text-gray-500">
                        {course.completed_lessons}/{course.total_lessons}
                      </span>
                    </div>
                    <Progress 
                      value={course.total_lessons > 0 ? (course.completed_lessons / course.total_lessons) * 100 : 0} 
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

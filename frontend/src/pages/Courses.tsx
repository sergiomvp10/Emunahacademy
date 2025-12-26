import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Course, GradeLevel } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, BookOpen, Users, 
  Edit, Trash2, CheckCircle
} from 'lucide-react';

const GRADE_LEVELS: { value: GradeLevel; label: string }[] = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1er Grado' },
  { value: '2', label: '2do Grado' },
  { value: '3', label: '3er Grado' },
  { value: '4', label: '4to Grado' },
  { value: '5', label: '5to Grado' },
  { value: '6', label: '6to Grado' },
  { value: '7', label: '7mo Grado' },
  { value: '8', label: '8vo Grado' },
];

export function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', thumbnail_url: '', grade_level: '' as GradeLevel | '' });
  const [creating, setCreating] = useState(false);
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all');

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    try {
      let coursesData: Course[];
      if (user?.role === 'teacher') {
        coursesData = await api.getCourses(user.id);
      } else if (user?.role === 'student') {
        coursesData = await api.getCourses(undefined, true);
      } else {
        coursesData = await api.getCourses();
      }
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!user || !newCourse.title) return;
    setCreating(true);
    try {
      const courseData = {
        title: newCourse.title,
        description: newCourse.description,
        thumbnail_url: newCourse.thumbnail_url || null,
        grade_level: newCourse.grade_level || null
      };
      await api.createCourse(courseData, user.id);
      setNewCourse({ title: '', description: '', thumbnail_url: '', grade_level: '' });
      setShowCreateDialog(false);
      loadCourses();
    } catch (error) {
      console.error('Error creating course:', error);
    } finally {
      setCreating(false);
    }
  };

  const getGradeLevelLabel = (grade: string | null | undefined) => {
    if (!grade) return null;
    const found = GRADE_LEVELS.find(g => g.value === grade);
    return found ? found.label : `Grado ${grade}`;
  };

  const filteredCourses = filterGrade === 'all' 
    ? courses 
    : courses.filter(c => c.grade_level === filterGrade);

  const handlePublishCourse = async (courseId: number) => {
    try {
      await api.publishCourse(courseId);
      loadCourses();
    } catch (error) {
      console.error('Error publishing course:', error);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm('Estas seguro de eliminar este curso?')) return;
    try {
      await api.deleteCourse(courseId);
      loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const getCourseColor = (index: number) => {
    const colors = [
      'from-amber-400 to-amber-600',
      'from-rose-400 to-rose-600',
      'from-teal-400 to-teal-600',
      'from-purple-400 to-purple-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
    ];
    return colors[index % colors.length];
  };

  const canManageCourses = user?.role === 'superuser' || user?.role === 'director' || user?.role === 'teacher';

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cursos</h1>
          <p className="text-gray-500">
            {canManageCourses ? 'Gestiona tus cursos' : 'Explora los cursos disponibles'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterGrade} onValueChange={(value) => setFilterGrade(value as GradeLevel | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por grado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grados</SelectItem>
              {GRADE_LEVELS.map((grade) => (
                <SelectItem key={grade.value} value={grade.value}>
                  {grade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        {canManageCourses && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-teal-500 hover:bg-teal-600">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Curso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titulo del Curso</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Matematicas Basicas"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe el contenido del curso..."
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_level">Grado</Label>
                  <Select
                    value={newCourse.grade_level}
                    onValueChange={(value) => setNewCourse({ ...newCourse, grade_level: value as GradeLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">URL de Imagen (opcional)</Label>
                  <Input
                    id="thumbnail"
                    placeholder="https://..."
                    value={newCourse.thumbnail_url}
                    onChange={(e) => setNewCourse({ ...newCourse, thumbnail_url: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full bg-teal-500 hover:bg-teal-600" 
                  onClick={handleCreateCourse}
                  disabled={creating || !newCourse.title}
                >
                  {creating ? 'Creando...' : 'Crear Curso'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course, index) => (
          <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
            <div 
              className={`h-32 bg-gradient-to-br ${getCourseColor(index)} relative`}
              onClick={() => navigate(`/app/courses/${course.id}`)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-white/30" />
              </div>
              <div className="absolute top-3 right-3 flex gap-1">
                {course.grade_level && (
                  <Badge className="bg-blue-500">{getGradeLevelLabel(course.grade_level)}</Badge>
                )}
                {course.is_published ? (
                  <Badge className="bg-green-500">Publicado</Badge>
                ) : (
                  <Badge variant="secondary">Borrador</Badge>
                )}
              </div>
            </div>
            <CardContent className="p-4">
              <h3 
                className="font-semibold text-lg text-gray-800 mb-1 group-hover:text-teal-600 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/courses/${course.id}`)}
              >
                {course.title}
              </h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>{course.teacher_name}</span>
                </div>
                {canManageCourses && (user?.role === 'superuser' || course.teacher_id === user?.id) && (
                  <div className="flex gap-1">
                    {!course.is_published && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublishCourse(course.id);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/courses/${course.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No hay cursos disponibles</h3>
          <p className="text-gray-500 mb-4">
            {canManageCourses 
              ? 'Crea tu primer curso para comenzar' 
              : 'Los cursos estaran disponibles pronto'}
          </p>
          {canManageCourses && (
            <Button 
              className="bg-teal-500 hover:bg-teal-600"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Curso
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

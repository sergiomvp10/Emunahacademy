import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  Plus, BookOpen, 
  Edit, Trash2, CheckCircle, Upload, X, Download
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const resolveUploadUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const GRADE_LEVEL_KEYS: { value: GradeLevel; key: keyof typeof import('../i18n').es.grades }[] = [
  { value: 'K', key: 'kindergarten' },
  { value: '1', key: 'grade1' },
  { value: '2', key: 'grade2' },
  { value: '3', key: 'grade3' },
  { value: '4', key: 'grade4' },
  { value: '5', key: 'grade5' },
  { value: '6', key: 'grade6' },
  { value: '7', key: 'grade7' },
  { value: '8', key: 'grade8' },
];

export function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', thumbnail_url: '', grade_level: '' as GradeLevel | '' });
  const [creating, setCreating] = useState(false);
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importingBase44, setImportingBase44] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', description: '', thumbnail_url: '', grade_level: '' as GradeLevel | '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [brokenCovers, setBrokenCovers] = useState<Set<number>>(new Set());

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await api.uploadFile(file);
      setNewCourse({ ...newCourse, thumbnail_url: result.file_url });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditImage(true);
    try {
      const result = await api.uploadFile(file);
      setEditDraft((prev) => ({ ...prev, thumbnail_url: result.file_url }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploadingEditImage(false);
    }
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setEditDraft({
      title: course.title,
      description: course.description || '',
      thumbnail_url: course.thumbnail_url || '',
      grade_level: (course.grade_level as GradeLevel) || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCourse || !editDraft.title) return;
    setSavingEdit(true);
    try {
      await api.updateCourse(editingCourse.id, {
        title: editDraft.title,
        description: editDraft.description,
        thumbnail_url: editDraft.thumbnail_url || null,
        grade_level: editDraft.grade_level || null,
      });
      setEditingCourse(null);
      loadCourses();
    } catch (error) {
      console.error('Error updating course:', error);
    } finally {
      setSavingEdit(false);
    }
  };

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
      const found = GRADE_LEVEL_KEYS.find(g => g.value === grade);
      return found ? t.grades[found.key] : `${t.grades.grade} ${grade}`;
    };

  const getCourseSubject = (title: string): string => {
    const idx = title.indexOf(' — ');
    return idx > 0 ? title.slice(0, idx).trim() : 'Other';
  };

  const subjectOptions = Array.from(
    new Set(courses.map((c) => getCourseSubject(c.title)))
  ).sort((a, b) => a.localeCompare(b));

  const filteredCourses = courses.filter((c) => {
    const gradeMatch = filterGrade === 'all' || c.grade_level === filterGrade;
    const subjectMatch = filterSubject === 'all' || getCourseSubject(c.title) === filterSubject;
    return gradeMatch && subjectMatch;
  });

  const handlePublishCourse = async (courseId: number) => {
    try {
      await api.publishCourse(courseId);
      loadCourses();
    } catch (error) {
      console.error('Error publishing course:', error);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm(t.courses.confirmDelete)) return;
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

  const handleImportBase44 = async () => {
    if (!user) return;
    if (!confirm(t.courses.importBase44 + '? (25 cursos, 250 lecciones)')) return;
    setImportingBase44(true);
    try {
      const result = await api.seedBase44Courses(user.id);
      alert(result.message);
      loadCourses();
    } catch (error) {
      console.error('Error importing Base44 courses:', error);
      alert(t.courses.importError);
    } finally {
      setImportingBase44(false);
    }
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
                  <h1 className="text-2xl font-bold text-gray-800">{t.courses.title}</h1>
                  <p className="text-gray-500">
                    {canManageCourses ? t.courses.manageCourses : t.courses.exploreCourses}
                  </p>
                </div>
        <div className="flex items-center gap-3">
          <Select value={filterGrade} onValueChange={(value) => setFilterGrade(value as GradeLevel | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.courses.filterByGrade} />
            </SelectTrigger>
            <SelectContent>
                            <SelectItem value="all">{t.courses.allGrades}</SelectItem>
                            {GRADE_LEVEL_KEYS.map((grade) => (
                              <SelectItem key={grade.value} value={grade.value}>
                                {t.grades[grade.key]}
                              </SelectItem>
                            ))}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t.courses.filterBySubject} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.courses.allSubjects}</SelectItem>
              {subjectOptions.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        {canManageCourses && (
          <Button 
            variant="outline" 
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
            onClick={handleImportBase44}
            disabled={importingBase44}
          >
            <Download className="h-4 w-4 mr-2" />
            {importingBase44 ? t.courses.importing : t.courses.importBase44}
          </Button>
        )}
        {canManageCourses && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
                            <Button className="bg-teal-500 hover:bg-teal-600">
                              <Plus className="h-4 w-4 mr-2" />
                              {t.courses.newCourse}
                            </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.courses.createNewCourse}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                                    <Label htmlFor="title">{t.courses.courseTitle}</Label>
                                    <Input
                                      id="title"
                                      placeholder={t.courses.titlePlaceholder}
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                                    <Label htmlFor="description">{t.courses.courseDescription}</Label>
                                    <Textarea
                                      id="description"
                                      placeholder={t.courses.descriptionPlaceholder}
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                                    <Label htmlFor="grade_level">{t.grades.grade}</Label>
                                    <Select
                                      value={newCourse.grade_level}
                                      onValueChange={(value) => setNewCourse({ ...newCourse, grade_level: value as GradeLevel })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t.courses.selectGrade} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {GRADE_LEVEL_KEYS.map((grade) => (
                                          <SelectItem key={grade.value} value={grade.value}>
                                            {t.grades[grade.key]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.courses.courseImage}</Label>
                  {newCourse.thumbnail_url ? (
                    <div className="relative inline-block">
                      <img 
                        src={resolveUploadUrl(newCourse.thumbnail_url)} 
                        alt="Course preview" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => setNewCourse({ ...newCourse, thumbnail_url: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors">
                        <Upload className="h-6 w-6 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {uploadingImage ? t.courses.uploading : t.courses.uploadImage}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <Button
                  className="w-full bg-teal-500 hover:bg-teal-600" 
                  onClick={handleCreateCourse}
                  disabled={creating || !newCourse.title}
                >
                  {creating ? t.courses.creating : t.courses.createCourse}
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
              className={`h-40 ${course.thumbnail_url && !brokenCovers.has(course.id) ? '' : `bg-gradient-to-br ${getCourseColor(index)}`} relative`}
              onClick={() => navigate(`/app/courses/${course.id}`)}
            >
              {course.thumbnail_url && !brokenCovers.has(course.id) ? (
                <img 
                  src={resolveUploadUrl(course.thumbnail_url)} 
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setBrokenCovers((prev) => {
                    if (prev.has(course.id)) return prev;
                    const next = new Set(prev);
                    next.add(course.id);
                    return next;
                  })}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-white/30" />
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-1">
                {course.grade_level && (
                  <Badge className="bg-blue-500">{getGradeLevelLabel(course.grade_level)}</Badge>
                )}
                                {course.is_published ? (
                                  <Badge className="bg-green-500">{t.courses.published}</Badge>
                                ) : (
                                  <Badge variant="secondary">{t.courses.draft}</Badge>
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
              <div className="flex items-center justify-end">
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
                        openEditDialog(course);
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

      <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.courses.editCourseTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">{t.courses.courseTitle}</Label>
              <Input
                id="edit-title"
                placeholder={t.courses.titlePlaceholder}
                value={editDraft.title}
                onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t.courses.courseDescription}</Label>
              <Textarea
                id="edit-description"
                placeholder={t.courses.descriptionPlaceholder}
                value={editDraft.description}
                onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-grade">{t.grades.grade}</Label>
              <Select
                value={editDraft.grade_level}
                onValueChange={(value) => setEditDraft({ ...editDraft, grade_level: value as GradeLevel })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.courses.selectGrade} />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVEL_KEYS.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {t.grades[grade.key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.courses.courseImage}</Label>
              {editDraft.thumbnail_url ? (
                <div className="relative inline-block">
                  <img
                    src={resolveUploadUrl(editDraft.thumbnail_url)}
                    alt="Course preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => setEditDraft({ ...editDraft, thumbnail_url: '' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {uploadingEditImage ? t.courses.uploading : t.courses.uploadImage}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    disabled={uploadingEditImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <Button
              className="w-full bg-teal-500 hover:bg-teal-600"
              onClick={handleSaveEdit}
              disabled={savingEdit || !editDraft.title}
            >
              {savingEdit ? t.courses.saving : t.courses.saveChanges}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {filteredCourses.length === 0 && (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">{t.courses.noCourses}</h3>
                    <p className="text-gray-500 mb-4">
                      {canManageCourses 
                        ? t.courses.createFirst 
                        : t.courses.comingSoon}
                    </p>
          {canManageCourses && (
                        <Button 
                          className="bg-teal-500 hover:bg-teal-600"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t.courses.createCourse}
                        </Button>
          )}
        </Card>
      )}
    </div>
  );
}

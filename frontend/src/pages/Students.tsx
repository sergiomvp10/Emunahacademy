import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { User, GradeLevel } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, Users as UsersIcon, UserCircle, Search, Edit2, GraduationCap
} from 'lucide-react';

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

export function Students() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    grade_level: '' as GradeLevel | ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const usersData = await api.getUsers('student');
      setStudents(usersData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.password) return;
    try {
      await api.register(newStudent.email, newStudent.password, newStudent.name, 'student');
      setNewStudent({ name: '', email: '', password: '', grade_level: '' });
      setShowAddStudent(false);
      loadStudents();
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };

  const handleUpdateGrade = async (studentId: number, gradeLevel: GradeLevel | null) => {
    try {
      await api.updateUserGrade(studentId, gradeLevel);
      loadStudents();
      setEditingStudent(null);
    } catch (error) {
      console.error('Error updating grade:', error);
    }
  };

    const getGradeLevelLabel = (grade: string | null | undefined) => {
      if (!grade) return t.students.unassigned;
      const found = GRADE_LEVEL_KEYS.find(g => g.value === grade);
      return found ? t.grades[found.key] : `${t.grades.grade} ${grade}`;
    };

  const getGradeColor = (grade: string | null | undefined) => {
    if (!grade) return 'bg-gray-100 text-gray-600';
    const colors: Record<string, string> = {
      'K': 'bg-pink-100 text-pink-700',
      '1': 'bg-red-100 text-red-700',
      '2': 'bg-orange-100 text-orange-700',
      '3': 'bg-amber-100 text-amber-700',
      '4': 'bg-yellow-100 text-yellow-700',
      '5': 'bg-lime-100 text-lime-700',
      '6': 'bg-green-100 text-green-700',
      '7': 'bg-teal-100 text-teal-700',
      '8': 'bg-blue-100 text-blue-700',
    };
    return colors[grade] || 'bg-gray-100 text-gray-600';
  };

  const filteredStudents = students.filter(s => {
    const matchesGrade = filterGrade === 'all' || s.grade_level === filterGrade;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGrade && matchesSearch;
  });

    const gradeStats = GRADE_LEVEL_KEYS.map(grade => ({
      ...grade,
      label: t.grades[grade.key],
      count: students.filter(s => s.grade_level === grade.value).length
    }));

  const unassignedCount = students.filter(s => !s.grade_level).length;

  const canManageStudents = user?.role === 'superuser' || user?.role === 'director' || user?.role === 'teacher';

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
                  <h1 className="text-2xl font-bold text-gray-800">{t.students.title}</h1>
                  <p className="text-gray-500">{t.students.subtitle}</p>
                </div>
        {canManageStudents && (
          <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
            <DialogTrigger asChild>
                          <Button className="bg-teal-500 hover:bg-teal-600">
                            <Plus className="h-4 w-4 mr-2" />
                            {t.students.newStudent}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t.students.addStudent}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>{t.students.name}</Label>
                              <Input
                                value={newStudent.name}
                                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                placeholder={t.students.namePlaceholder}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.students.email}</Label>
                              <Input
                                type="email"
                                value={newStudent.email}
                                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                placeholder={t.students.emailPlaceholder}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.students.password}</Label>
                              <Input
                                type="password"
                                value={newStudent.password}
                                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                                placeholder="********"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.students.gradeLevel}</Label>
                              <Select
                                value={newStudent.grade_level}
                                onValueChange={(value) => setNewStudent({ ...newStudent, grade_level: value as GradeLevel })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t.students.selectGrade} />
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
                            <Button 
                              className="w-full bg-teal-500 hover:bg-teal-600"
                              onClick={handleAddStudent}
                              disabled={!newStudent.name || !newStudent.email || !newStudent.password}
                            >
                              {t.students.addStudent}
                            </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Grade Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
        <Card 
          className={`cursor-pointer hover:shadow-md transition-shadow ${filterGrade === 'all' ? 'ring-2 ring-teal-500' : ''}`}
          onClick={() => setFilterGrade('all')}
        >
          <CardContent className="p-3 text-center">
            <UsersIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
            <p className="text-xl font-bold">{students.length}</p>
            <p className="text-xs text-gray-500">{t.common.all}</p>
          </CardContent>
        </Card>
        {gradeStats.map((grade) => (
          <Card 
            key={grade.value}
            className={`cursor-pointer hover:shadow-md transition-shadow ${filterGrade === grade.value ? 'ring-2 ring-teal-500' : ''}`}
            onClick={() => setFilterGrade(grade.value)}
          >
            <CardContent className="p-3 text-center">
              <GraduationCap className={`h-6 w-6 mx-auto mb-1 ${getGradeColor(grade.value).replace('bg-', 'text-').replace('-100', '-500')}`} />
              <p className="text-xl font-bold">{grade.count}</p>
              <p className="text-xs text-gray-500">{grade.value === 'K' ? t.students.kinder : `${grade.value}°`}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t.students.searchStudents}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterGrade} onValueChange={(value) => setFilterGrade(value as GradeLevel | 'all')}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t.students.filterByGrade} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.students.allGrades}</SelectItem>
                    {GRADE_LEVEL_KEYS.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {t.grades[grade.key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
      </div>

      {/* Unassigned Warning */}
      {unassignedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <UserCircle className="h-6 w-6 text-amber-500" />
          <div>
                        <p className="font-medium text-amber-800">
                          {unassignedCount} {t.students.unassignedWarning}
                        </p>
                        <p className="text-sm text-amber-600">
                          {t.students.assignGradeHint}
                        </p>
          </div>
        </div>
      )}

      {/* Students List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredStudents.map(student => (
              <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-teal-100 text-teal-700">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-800">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {editingStudent?.id === student.id ? (
                    <Select
                      value={editingStudent.grade_level || ''}
                      onValueChange={(value) => handleUpdateGrade(student.id, value as GradeLevel)}
                    >
                                            <SelectTrigger className="w-40">
                                              <SelectValue placeholder={t.students.selectGradeShort} />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {GRADE_LEVEL_KEYS.map((grade) => (
                                                <SelectItem key={grade.value} value={grade.value}>
                                                  {t.grades[grade.key]}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Badge className={getGradeColor(student.grade_level)}>
                        {getGradeLevelLabel(student.grade_level)}
                      </Badge>
                      {canManageStudents && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStudent(student)}
                        >
                          <Edit2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
                    {filteredStudents.length === 0 && (
                      <p className="text-center text-gray-500 py-8">{t.students.noStudentsFound}</p>
                    )}
        </CardContent>
      </Card>
    </div>
  );
}

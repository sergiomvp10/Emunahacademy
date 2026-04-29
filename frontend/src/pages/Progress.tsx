import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { StudentProgress, ChildProgress, User, GradeLevel } from '../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  BarChart3,
  Calculator,
  FlaskConical,
  Landmark,
  BookOpen,
  Globe,
  Lightbulb,
  GraduationCap,
  Clock,
  CheckSquare,
  Flame,
  ChevronRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

type SubjectKey = 'math' | 'ela' | 'science' | 'history' | 'geography' | 'other';

interface SubjectMeta {
  key: SubjectKey;
  Icon: typeof Calculator;
  gradient: string;
  chartColor: string;
}

const SUBJECTS: Record<SubjectKey, SubjectMeta> = {
  math: {
    key: 'math',
    Icon: Calculator,
    gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500',
    chartColor: '#8b5cf6',
  },
  ela: {
    key: 'ela',
    Icon: BookOpen,
    gradient: 'from-sky-500 via-blue-500 to-indigo-500',
    chartColor: '#3b82f6',
  },
  science: {
    key: 'science',
    Icon: FlaskConical,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    chartColor: '#14b8a6',
  },
  history: {
    key: 'history',
    Icon: Landmark,
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    chartColor: '#f59e0b',
  },
  geography: {
    key: 'geography',
    Icon: Globe,
    gradient: 'from-cyan-500 via-sky-500 to-blue-500',
    chartColor: '#06b6d4',
  },
  other: {
    key: 'other',
    Icon: Lightbulb,
    gradient: 'from-purple-500 via-violet-500 to-indigo-500',
    chartColor: '#a855f7',
  },
};

function detectSubject(title: string): SubjectKey {
  const lower = title.toLowerCase();
  if (lower.startsWith('math') || lower.includes('matemat')) return 'math';
  if (
    lower.startsWith('ela') ||
    lower.includes('english') ||
    lower.includes('language arts') ||
    lower.includes('lengua')
  )
    return 'ela';
  if (lower.startsWith('science') || lower.includes('cienc')) return 'science';
  if (lower.startsWith('history') || lower.includes('histor')) return 'history';
  if (
    lower.startsWith('geography') ||
    lower.includes('geograf')
  )
    return 'geography';
  return 'other';
}

function subjectLabel(
  key: SubjectKey,
  t: { progress: { [k: string]: string } }
) {
  switch (key) {
    case 'math':
      return t.progress.subjectMath;
    case 'ela':
      return t.progress.subjectEla;
    case 'science':
      return t.progress.subjectScience;
    case 'history':
      return t.progress.subjectHistory;
    case 'geography':
      return t.progress.subjectGeography;
    default:
      return t.progress.subjectOther;
  }
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F'];

function todayWeekdayIdx(): number {
  const d = new Date().getDay(); // 0=Sun..6=Sat
  if (d >= 1 && d <= 5) return d - 1;
  return -1;
}

interface CourseCardProps {
  p: StudentProgress;
  isEs: boolean;
  t: { progress: { [k: string]: string } };
}

function CourseCard({ p, t }: CourseCardProps) {
  const subjectKey = detectSubject(p.course_title);
  const subject = SUBJECTS[subjectKey];
  const SubjectIcon = subject.Icon;
  const pct = p.total_lessons > 0 ? Math.round((p.completed_lessons / p.total_lessons) * 100) : 0;
  const score = p.average_quiz_score !== null ? Math.round(p.average_quiz_score) : 0;
  const inSuccessZone = score >= 80;
  const goalStreak = 0;
  const today = todayWeekdayIdx();
  const activeDays: boolean[] = [false, false, false, false, false];

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br ${subject.gradient} text-white p-5 shadow-md overflow-hidden`}
    >
      <ChevronRight className="h-5 w-5 absolute top-4 right-4 opacity-90" />

      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <SubjectIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[10px] font-bold tracking-[0.18em] opacity-90">
            {subjectLabel(subjectKey, t)}
          </p>
          <p className="text-base font-semibold truncate mt-0.5">{p.course_title}</p>

          <div className="flex items-center gap-1.5 mt-2">
            {DAY_LETTERS.map((d, i) => {
              const isToday = i === today;
              const done = activeDays[i];
              return (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    done
                      ? 'bg-white text-gray-700'
                      : isToday
                      ? 'bg-white/90 text-gray-700'
                      : 'bg-white/25 text-white/85'
                  }`}
                >
                  {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : d}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-white/25 overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 items-center">
        <div>
          <p className="text-2xl font-bold leading-none">{pct}%</p>
          <p className="text-[10px] opacity-90 mt-1.5">{t.progress.overallScore}</p>
        </div>
        <div className="flex justify-center">
          <div
            className={`h-14 w-14 rounded-full border-[3px] ${
              inSuccessZone ? 'border-white' : 'border-white/40'
            } flex items-center justify-center text-center leading-tight`}
          >
            <span className="text-[10px] font-semibold whitespace-pre-line">
              {t.progress.successZone.replace(' ', '\n')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-bold flex items-center justify-end gap-1 leading-none">
            <Flame className="h-4 w-4" />
            {goalStreak > 0 ? `${goalStreak}-${t.progress.days}` : '—'}
          </p>
          <p className="text-[10px] opacity-90 mt-1.5">{t.progress.goalStreak}</p>
        </div>
      </div>
    </div>
  );
}

const ADMIN_ROLES = new Set(['superuser', 'director', 'teacher']);
const GRADE_ORDER: (GradeLevel | 'unassigned')[] = [
  'K',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  'unassigned',
];

function gradeBucketLabel(
  bucket: GradeLevel | 'unassigned',
  t: ReturnType<typeof useLanguage>['t'],
): string {
  if (bucket === 'unassigned') return t.progress.gradeUnassigned;
  if (bucket === 'K') return t.progress.gradeKindergarten;
  return `${t.progress.gradeLabel} ${bucket}`;
}

export function ProgressPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isEs = language === 'es';
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const isAdmin = !!user && ADMIN_ROLES.has(user.role);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      try {
        if (user.role === 'student') {
          const data = await api.getStudentProgress(user.id);
          setProgress(data);
        } else if (user.role === 'parent') {
          const data = await api.getChildrenProgress(user.id);
          setChildrenProgress(data);
        } else if (ADMIN_ROLES.has(user.role)) {
          const list = await api.getUsers('student');
          setStudents(list);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!selectedStudent) {
      setProgress([]);
      return;
    }
    setLoadingSelected(true);
    (async () => {
      try {
        const data = await api.getStudentProgress(selectedStudent.id);
        setProgress(data);
      } catch (error) {
        console.error('Error loading student progress:', error);
      } finally {
        setLoadingSelected(false);
      }
    })();
  }, [selectedStudent, isAdmin]);

  const groupedStudents = useMemo(() => {
    const buckets: Record<string, User[]> = {};
    students.forEach((s) => {
      const key = s.grade_level || 'unassigned';
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(s);
    });
    Object.values(buckets).forEach((arr) =>
      arr.sort((a, b) => a.name.localeCompare(b.name)),
    );
    return buckets;
  }, [students]);

  const calculateOverallProgress = (progressList: StudentProgress[]) => {
    if (progressList.length === 0) return 0;
    const totalCompleted = progressList.reduce((sum, p) => sum + p.completed_lessons, 0);
    const totalLessons = progressList.reduce((sum, p) => sum + p.total_lessons, 0);
    return totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;
  };

  const calculateAverageScore = (progressList: StudentProgress[]) => {
    const scores = progressList.filter((p) => p.average_quiz_score !== null).map((p) => p.average_quiz_score!);
    if (scores.length === 0) return null;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  };

  const weeklyChartData = useMemo(() => {
    const buckets: Record<SubjectKey, number> = {
      math: 0,
      ela: 0,
      science: 0,
      history: 0,
      geography: 0,
      other: 0,
    };
    progress.forEach((p) => {
      const k = detectSubject(p.course_title);
      buckets[k] += 0;
    });
    return (Object.keys(buckets) as SubjectKey[])
      .filter((k) => progress.some((p) => detectSubject(p.course_title) === k))
      .map((k) => ({
        name: subjectLabel(k, t)
          .toLowerCase()
          .replace(/^./, (c) => c.toUpperCase()),
        value: buckets[k],
        color: SUBJECTS[k].chartColor,
      }));
  }, [progress, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const gpa = (() => {
    const avg = calculateAverageScore(progress);
    if (avg === null) return 0;
    return Math.max(0, Math.min(4, (avg / 100) * 4));
  })();
  const timeSpentHours = 0;
  const workCompletedToday = 0;

  const studentDashboardBody = (
    <>
      {progress.length === 0 ? (
        <Card className="p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t.progress.notEnrolled}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {progress.map((p) => (
              <CourseCard key={p.course_id} p={p} isEs={isEs} t={t} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <Card className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t.progress.gradePointAverage}</p>
                  <p className="text-2xl font-bold text-gray-800 leading-none mt-1">
                    {gpa.toFixed(2)}
                  </p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t.progress.timeSpentThisWeek}</p>
                  <p className="text-2xl font-bold text-gray-800 leading-none mt-1">
                    {timeSpentHours} {t.progress.hours}
                  </p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t.progress.workCompletedToday}</p>
                  <p className="text-2xl font-bold text-gray-800 leading-none mt-1">
                    {workCompletedToday} {t.progress.steps}
                  </p>
                </div>
              </Card>
            </div>

            <Card className="p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-800 mb-3">
                {t.progress.workCompletedThisWeek}
              </h3>
              <div className="h-56">
                {weeklyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 50]}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#a5b4fc" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    {t.progress.noData}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );

  if (user?.role === 'student') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.progress.myProgress}</h1>
          <p className="text-gray-500">{t.progress.subtitle}</p>
        </div>
        {studentDashboardBody}
      </div>
    );
  }

  if (isAdmin) {
    if (selectedStudent) {
      const gradeBadge = selectedStudent.grade_level
        ? gradeBucketLabel(selectedStudent.grade_level, t)
        : t.progress.gradeUnassigned;
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t.progress.back}
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-teal-100 text-teal-600">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-800 truncate">
                  {selectedStudent.name}
                </h1>
                <p className="text-sm text-gray-500 truncate">
                  {gradeBadge} · {selectedStudent.email}
                </p>
              </div>
            </div>
          </div>
          {loadingSelected ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : (
            studentDashboardBody
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.progress.studentsByGrade}</h1>
          <p className="text-gray-500">{t.progress.adminSubtitle}</p>
        </div>

        {students.length === 0 ? (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t.progress.noStudents}</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {GRADE_ORDER.filter((g) => groupedStudents[g] && groupedStudents[g].length > 0).map(
              (g) => (
                <Card key={g} className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">{gradeBucketLabel(g, t)}</h3>
                    <span className="text-xs text-gray-500">
                      {groupedStudents[g].length} {t.progress.studentsCount}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupedStudents[g].map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition"
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-teal-100 text-teal-600">
                            {s.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedStudent(s)}
                          className="flex-shrink-0"
                        >
                          {t.progress.viewProgress}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    );
  }

  if (user?.role === 'parent') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.progress.childrenProgress}</h1>
          <p className="text-gray-500">{t.progress.childrenSubtitle}</p>
        </div>

        {childrenProgress.map((child) => {
          const childOverall = calculateOverallProgress(child.courses);
          const childAverage = calculateAverageScore(child.courses);

          return (
            <Card key={child.student.id} className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-teal-100 text-teal-600 text-lg">
                    {child.student.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-800">{child.student.name}</p>
                  <p className="text-sm text-gray-500">{child.student.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center p-3 bg-teal-50 rounded-lg">
                  <p className="text-2xl font-bold text-teal-600">{childOverall.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">{t.progress.overallProgress}</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {childAverage !== null ? `${childAverage.toFixed(0)}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">{t.progress.quizAverage}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{child.courses.length}</p>
                  <p className="text-xs text-gray-500">{t.progress.enrolledCourses}</p>
                </div>
              </div>

              {child.courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {child.courses.map((course) => (
                    <CourseCard key={course.course_id} p={course} isEs={isEs} t={t} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {child.courses.map((course) => (
                    <div key={course.course_id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{course.course_title}</span>
                        <span className="text-xs text-gray-500">
                          {course.completed_lessons}/{course.total_lessons} {t.progress.lessons}
                        </span>
                      </div>
                      <ProgressBar
                        value={
                          course.total_lessons > 0
                            ? (course.completed_lessons / course.total_lessons) * 100
                            : 0
                        }
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}

        {childrenProgress.length === 0 && (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {t.progress.noChildrenLinked}
            </h3>
            <p className="text-gray-500">{t.progress.contactAdmin}</p>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

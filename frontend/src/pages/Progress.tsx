import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { StudentProgress, ChildProgress, User } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Flag, Printer, ArrowUpRight, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
} from 'recharts';

type TabKey = 'active' | 'completed' | 'archived';

const SUBJECT_COLORS: Record<string, string> = {
  Math: '#3b82f6',
  'English Language Arts': '#f97316',
  Science: '#10b981',
  History: '#8b5cf6',
  Geography: '#14b8a6',
  Other: '#9ca3af',
};

const getCourseSubject = (title: string): string => {
  const idx = title.indexOf(' — ');
  return idx > 0 ? title.slice(0, idx).trim() : 'Other';
};

const getSubjectColor = (subject: string): string =>
  SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.Other;

const getLetterGrade = (score: number | null): string => {
  if (score === null || Number.isNaN(score)) return '—';
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
};

const computeGpa = (scores: Array<number | null>): number => {
  const valid = scores.filter((s): s is number => s !== null && !Number.isNaN(s));
  if (valid.length === 0) return 0;
  const avg = valid.reduce((sum, s) => sum + s, 0) / valid.length;
  return Math.max(0, Math.min(4, (avg / 100) * 4));
};

interface DashboardProps {
  studentName: string;
  courses: StudentProgress[];
}

function ProgressDashboard({ studentName, courses }: DashboardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [workWindow, setWorkWindow] = useState<'last' | 'this'>('this');

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const pct = c.total_lessons > 0 ? (c.completed_lessons / c.total_lessons) * 100 : 0;
      if (activeTab === 'completed') return pct >= 100 && c.total_lessons > 0;
      if (activeTab === 'archived') return false;
      return pct < 100 || c.total_lessons === 0;
    });
  }, [courses, activeTab]);

  const gpa = useMemo(
    () => computeGpa(courses.map((c) => c.average_quiz_score)),
    [courses]
  );

  const totalCompletedSteps = courses.reduce((sum, c) => sum + c.completed_lessons, 0);

  const subjectPieData = useMemo(() => {
    const byTitle = new Map<string, number>();
    courses.forEach((c) => {
      const subject = getCourseSubject(c.course_title);
      byTitle.set(subject, (byTitle.get(subject) ?? 0) + c.completed_lessons);
    });
    const entries = Array.from(byTitle.entries()).filter(([, v]) => v > 0);
    if (entries.length === 0) return [];
    return entries.map(([name, value]) => ({ name, value }));
  }, [courses]);

  const subjectsForLegend = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => set.add(getCourseSubject(c.course_title)));
    return Array.from(set);
  }, [courses]);

  const weekData = useMemo(() => {
    const labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    return labels.map((label) => ({ day: label, value: 0 }));
  }, []);

  const totalHours = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.progress.coursesHeading}</h1>
          {studentName && <p className="text-gray-500 text-sm">{studentName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 px-2 py-1"
            >
              <Printer className="h-4 w-4" />
              {t.progress.print}
            </button>
            <div className="inline-flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              {(['active', 'completed', 'archived'] as TabKey[]).map((key) => {
                const label =
                  key === 'active'
                    ? t.progress.tabActive
                    : key === 'completed'
                    ? t.progress.tabCompleted
                    : t.progress.tabArchived;
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-1.5 text-sm rounded-full transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCourses.map((c) => {
              const pct = c.total_lessons > 0 ? (c.completed_lessons / c.total_lessons) * 100 : 0;
              const stepsLeft = Math.max(0, c.total_lessons - c.completed_lessons);
              const letter = getLetterGrade(c.average_quiz_score);
              const subject = getCourseSubject(c.course_title);
              const color = getSubjectColor(subject);

              return (
                <button
                  key={c.course_id}
                  onClick={() => navigate(`/courses/${c.course_id}`)}
                  className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400">{t.progress.projectedCompletion}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <h3 className="font-semibold text-indigo-600 truncate">{c.course_title}</h3>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 border border-amber-100 rounded-full px-2.5 py-1">
                        <Flag className="h-3 w-3" />
                        {stepsLeft} {t.progress.stepsLeftToMeetGoal}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="font-semibold text-gray-700">
                          {pct.toFixed(0)}% {t.progress.completedLabel}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {c.completed_lessons} / {c.total_lessons}
                        </span>
                      </div>
                      <ProgressBar value={pct} className="h-2 mt-2" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500" />
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-indigo-200 text-indigo-600">
                        <span className="text-base font-bold leading-none">{letter}</span>
                        <span className="text-[10px] tracking-wide text-gray-400 mt-0.5">
                          GRADE
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredCourses.length === 0 && (
              <Card className="md:col-span-2 p-12 text-center">
                <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t.progress.notEnrolled}</p>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden border-0 text-white relative">
            <div
              className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-600"
              aria-hidden="true"
            />
            <CardContent className="relative p-5 flex items-center justify-between">
              <span className="text-2xl font-bold tracking-wide">{t.progress.gpa}</span>
              <span className="bg-amber-400 text-indigo-900 px-3 py-1 rounded-full text-2xl font-bold shadow">
                {gpa.toFixed(2)}
              </span>
            </CardContent>
          </Card>

          <Card className="border-gray-100">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {t.progress.timeSpentThisWeek}
                  </h3>
                  <p className="text-xs text-gray-400">{t.progress.timeSpentSubtitle}</p>
                </div>
                <button className="text-xs text-indigo-500 hover:underline">
                  {t.progress.more} →
                </button>
              </div>
              <div className="flex items-center gap-3">
                <ul className="text-xs text-gray-600 space-y-1.5 flex-1 min-w-0">
                  {subjectsForLegend.length === 0 && (
                    <li className="text-gray-400 italic">{t.progress.noData}</li>
                  )}
                  {subjectsForLegend.map((subject) => (
                    <li key={subject} className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getSubjectColor(subject) }}
                      />
                      <span className="truncate">{subject}</span>
                    </li>
                  ))}
                </ul>
                <div className="w-32 h-32 flex-shrink-0">
                  {subjectPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subjectPieData}
                          dataKey="value"
                          innerRadius={28}
                          outerRadius={60}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {subjectPieData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={getSubjectColor(entry.name)}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full rounded-full border-[14px] border-gray-100" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{t.progress.workCompleted}</h3>
                <div className="inline-flex bg-gray-50 border border-gray-200 rounded-full p-0.5 text-xs">
                  <button
                    onClick={() => setWorkWindow('last')}
                    className={`px-3 py-1 rounded-full ${
                      workWindow === 'last'
                        ? 'bg-white shadow text-gray-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {t.progress.lastWeek}
                  </button>
                  <button
                    onClick={() => setWorkWindow('this')}
                    className={`px-3 py-1 rounded-full ${
                      workWindow === 'this'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-400'
                    }`}
                  >
                    {t.progress.thisWeek}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">{t.progress.totalTimeSpent}</p>
                  <p className="font-bold text-gray-800 text-xl">
                    {totalHours.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-gray-400">{t.progress.hours}</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">{t.progress.stepsCompleted}</p>
                  <p className="font-bold text-gray-800 text-xl">
                    {totalCompletedSteps}{' '}
                    <span className="text-xs font-normal text-gray-400">{t.progress.steps}</span>
                  </p>
                </div>
              </div>

              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                    />
                    <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => navigate('/courses')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {t.progress.learningActivities}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProgressPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [childrenProgress, setChildrenProgress] = useState<ChildProgress[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      if (!user) return;
      setLoading(true);
      try {
        if (user.role === 'student') {
          const data = await api.getStudentProgress(user.id);
          setProgress(data);
        } else if (user.role === 'parent') {
          const data = await api.getChildrenProgress(user.id);
          setChildrenProgress(data);
          if (data.length > 0) setSelectedChildId(data[0].student.id);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (user?.role === 'student') {
    return <ProgressDashboard studentName={user.name} courses={progress} />;
  }

  if (user?.role === 'parent') {
    if (childrenProgress.length === 0) {
      return (
        <Card className="p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {t.progress.noChildrenLinked}
          </h3>
          <p className="text-gray-500">{t.progress.contactAdmin}</p>
        </Card>
      );
    }

    const selected =
      childrenProgress.find((c) => c.student.id === selectedChildId) ?? childrenProgress[0];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{t.progress.childrenProgress}</h1>
          <div className="flex flex-wrap gap-2 ml-auto">
            {childrenProgress.map((child) => {
              const isSelected = child.student.id === selected.student.id;
              return (
                <button
                  key={child.student.id}
                  onClick={() => setSelectedChildId(child.student.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-white text-indigo-600">
                      {(child.student as User).name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {child.student.name}
                </button>
              );
            })}
          </div>
        </div>

        <ProgressDashboard studentName={selected.student.name} courses={selected.courses} />
      </div>
    );
  }

  return null;
}

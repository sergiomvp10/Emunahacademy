import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { CalendarEvent, Course, GradeLevel } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, ChevronRight, Plus, Clock, Trash2, Bell
} from 'lucide-react';

const GRADE_LEVELS: { value: GradeLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos los grados' },
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

export function Calendar() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [notifyStudents, setNotifyStudents] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'class' as 'class' | 'evaluation' | 'meeting' | 'holiday' | 'other',
    start_time: '',
    end_time: '',
    course_id: '',
    grade_level: 'all' as GradeLevel | 'all'
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    try {
      // If user is a student, filter events by their grade level
      const eventsData = await api.getCalendarEvents(undefined, undefined, undefined, user?.id);
      setEvents(eventsData);
      const coursesData = await api.getCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!user || !newEvent.title || !newEvent.start_time || !newEvent.end_time) return;
    try {
      await api.createCalendarEvent({
        title: newEvent.title,
        description: newEvent.description || undefined,
        event_type: newEvent.event_type,
        start_time: new Date(newEvent.start_time).toISOString(),
        end_time: new Date(newEvent.end_time).toISOString(),
        course_id: newEvent.course_id ? parseInt(newEvent.course_id) : undefined,
        grade_level: newEvent.grade_level === 'all' ? null : newEvent.grade_level
      }, user.id, notifyStudents);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'class',
        start_time: '',
        end_time: '',
        course_id: '',
        grade_level: 'all'
      });
      setNotifyStudents(false);
      setShowAddEvent(false);
      loadData();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm(t.calendar.confirmDelete)) return;
    try {
      await api.deleteCalendarEvent(eventId);
      loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      class: 'bg-teal-500',
      evaluation: 'bg-amber-500',
      meeting: 'bg-blue-500',
      holiday: 'bg-green-500',
      other: 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
  };

    const getEventTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        class: t.calendar.class,
        evaluation: t.calendar.evaluation,
        meeting: t.calendar.meeting,
        holiday: t.calendar.holiday,
        other: t.calendar.other
      };
      return labels[type] || type;
    };

    const monthNames = [
      t.months.january, t.months.february, t.months.march, t.months.april, t.months.may, t.months.june,
      t.months.july, t.months.august, t.months.september, t.months.october, t.months.november, t.months.december
    ];

    const dayNames = [t.calendar.days.sun, t.calendar.days.mon, t.calendar.days.tue, t.calendar.days.wed, t.calendar.days.thu, t.calendar.days.fri, t.calendar.days.sat];

  const canManageEvents = user?.role === 'director' || user?.role === 'teacher';

  const days = getDaysInMonth(currentDate);
  const today = new Date();

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
                  <h1 className="text-2xl font-bold text-gray-800">{t.calendar.title}</h1>
                  <p className="text-gray-500">{t.calendar.subtitle}</p>
                </div>
        {canManageEvents && (
          <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
            <DialogTrigger asChild>
                            <Button className="bg-teal-500 hover:bg-teal-600">
                              <Plus className="h-4 w-4 mr-2" />
                              {t.calendar.newEvent}
                            </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                              <DialogTitle>{t.calendar.createEvent}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>{t.calendar.eventTitle}</Label>
                                <Input
                                  value={newEvent.title}
                                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                  placeholder={t.calendar.eventTitlePlaceholder}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t.calendar.eventDescription}</Label>
                                <Textarea
                                  value={newEvent.description}
                                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                  placeholder={t.calendar.descriptionPlaceholder}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t.calendar.eventType}</Label>
                                <Select
                                  value={newEvent.event_type}
                                  onValueChange={(value: any) => setNewEvent({ ...newEvent, event_type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="class">{t.calendar.class}</SelectItem>
                                    <SelectItem value="evaluation">{t.calendar.evaluation}</SelectItem>
                                    <SelectItem value="meeting">{t.calendar.meeting}</SelectItem>
                                    <SelectItem value="holiday">{t.calendar.holiday}</SelectItem>
                                    <SelectItem value="other">{t.calendar.other}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>{t.calendar.start}</Label>
                                  <Input
                                    type="datetime-local"
                                    value={newEvent.start_time}
                                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>{t.calendar.end}</Label>
                                  <Input
                                    type="datetime-local"
                                    value={newEvent.end_time}
                                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>{t.calendar.courseOptional}</Label>
                                <Select
                                  value={newEvent.course_id}
                                  onValueChange={(value) => setNewEvent({ ...newEvent, course_id: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t.calendar.selectCourse} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">{t.common.none}</SelectItem>
                                    {courses.map(course => (
                                      <SelectItem key={course.id} value={course.id.toString()}>
                                        {course.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Grado</Label>
                                <Select
                                  value={newEvent.grade_level}
                                  onValueChange={(value: GradeLevel | 'all') => setNewEvent({ ...newEvent, grade_level: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar grado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {GRADE_LEVELS.map(grade => (
                                      <SelectItem key={grade.value} value={grade.value}>
                                        {grade.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                                <Checkbox
                                  id="notify"
                                  checked={notifyStudents}
                                  onCheckedChange={(checked) => setNotifyStudents(checked === true)}
                                />
                                <div className="flex items-center gap-2">
                                  <Bell className="h-4 w-4 text-blue-600" />
                                  <Label htmlFor="notify" className="text-sm cursor-pointer">
                                    Notificar a los estudiantes
                                  </Label>
                                </div>
                              </div>
                              <Button 
                                className="w-full bg-teal-500 hover:bg-teal-600"
                                onClick={handleAddEvent}
                                disabled={!newEvent.title || !newEvent.start_time || !newEvent.end_time}
                              >
                                {t.calendar.createEvent}
                              </Button>
                            </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {days.map((day, index) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const isToday = day === today.getDate() && 
                                  currentDate.getMonth() === today.getMonth() && 
                                  currentDate.getFullYear() === today.getFullYear();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-1 border rounded-lg ${
                        day ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'border-teal-500 border-2' : 'border-gray-100'}`}
                    >
                      {day && (
                        <>
                          <span className={`text-sm ${isToday ? 'font-bold text-teal-600' : 'text-gray-600'}`}>
                            {day}
                          </span>
                          <div className="space-y-1 mt-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className={`${getEventColor(event.event_type)} text-white text-xs px-1 py-0.5 rounded truncate`}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-xs text-gray-500">+{dayEvents.length - 2} {t.calendar.more}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.calendar.upcomingEvents}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events
                .filter(e => new Date(e.start_time) >= new Date())
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .slice(0, 5)
                .map(event => (
                  <div key={event.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${getEventColor(event.event_type)}`} />
                          <span className="font-medium text-sm">{event.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                                                        {new Date(event.start_time).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          hour: '2-digit',
                                                          minute: '2-digit'
                                                        })}
                          </span>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {getEventTypeLabel(event.event_type)}
                        </Badge>
                      </div>
                      {canManageEvents && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              {events.filter(e => new Date(e.start_time) >= new Date()).length === 0 && (
                <p className="text-center text-gray-500 py-4">{t.calendar.noUpcomingEvents}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

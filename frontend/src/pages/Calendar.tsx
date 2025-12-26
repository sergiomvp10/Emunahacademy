import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { CalendarEvent, Course } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, Plus, Clock, Trash2
} from 'lucide-react';

export function Calendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'class' as 'class' | 'evaluation' | 'meeting' | 'holiday' | 'other',
    start_time: '',
    end_time: '',
    course_id: ''
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    try {
      const eventsData = await api.getCalendarEvents();
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
        course_id: newEvent.course_id ? parseInt(newEvent.course_id) : undefined
      }, user.id);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'class',
        start_time: '',
        end_time: '',
        course_id: ''
      });
      setShowAddEvent(false);
      loadData();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Eliminar este evento?')) return;
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
      class: 'Clase',
      evaluation: 'Evaluacion',
      meeting: 'Reunion',
      holiday: 'Feriado',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

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
          <h1 className="text-2xl font-bold text-gray-800">Calendario</h1>
          <p className="text-gray-500">Eventos y actividades programadas</p>
        </div>
        {canManageEvents && (
          <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
            <DialogTrigger asChild>
              <Button className="bg-teal-500 hover:bg-teal-600">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Titulo del evento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripcion</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Descripcion (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select
                    value={newEvent.event_type}
                    onValueChange={(value: any) => setNewEvent({ ...newEvent, event_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">Clase</SelectItem>
                      <SelectItem value="evaluation">Evaluacion</SelectItem>
                      <SelectItem value="meeting">Reunion</SelectItem>
                      <SelectItem value="holiday">Feriado</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inicio</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Curso (opcional)</Label>
                  <Select
                    value={newEvent.course_id}
                    onValueChange={(value) => setNewEvent({ ...newEvent, course_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Ninguno</SelectItem>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  onClick={handleAddEvent}
                  disabled={!newEvent.title || !newEvent.start_time || !newEvent.end_time}
                >
                  Crear Evento
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
                              <span className="text-xs text-gray-500">+{dayEvents.length - 2} mas</span>
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
              <CardTitle className="text-lg">Proximos Eventos</CardTitle>
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
                            {new Date(event.start_time).toLocaleDateString('es-ES', {
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
                <p className="text-center text-gray-500 py-4">No hay eventos proximos</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

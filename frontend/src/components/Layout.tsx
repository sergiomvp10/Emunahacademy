import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, BookOpen, Calendar, Users, MessageSquare, 
  LogOut, Menu, Bell, Search, ChevronDown,
  GraduationCap, FileText, BarChart3, Settings, ClipboardList
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Get current page from path (handle /app prefix)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPage = pathParts[1] || pathParts[0] || 'dashboard';

  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'courses', label: 'Cursos', icon: BookOpen },
      { id: 'calendar', label: 'Calendario', icon: Calendar },
      { id: 'messages', label: 'Mensajes', icon: MessageSquare },
    ];

    if (user?.role === 'superuser') {
      return [
        ...baseItems,
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'students', label: 'Estudiantes', icon: GraduationCap },
        { id: 'evaluations', label: 'Evaluaciones', icon: FileText },
        { id: 'progress', label: 'Progreso', icon: BarChart3 },
        { id: 'applications', label: 'Solicitudes', icon: ClipboardList },
        { id: 'site-settings', label: 'Configuracion', icon: Settings },
      ];
    }

    if (user?.role === 'director') {
      return [
        ...baseItems,
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'students', label: 'Estudiantes', icon: GraduationCap },
        { id: 'applications', label: 'Solicitudes', icon: ClipboardList },
      ];
    }

    if (user?.role === 'teacher') {
      return [
        ...baseItems,
        { id: 'students', label: 'Estudiantes', icon: GraduationCap },
        { id: 'evaluations', label: 'Evaluaciones', icon: FileText },
      ];
    }

    if (user?.role === 'student') {
      return [
        ...baseItems,
        { id: 'progress', label: 'Mi Progreso', icon: BarChart3 },
        { id: 'evaluations', label: 'Evaluaciones', icon: FileText },
      ];
    }

    if (user?.role === 'parent') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'children', label: 'Mis Hijos', icon: Users },
        { id: 'calendar', label: 'Calendario', icon: Calendar },
        { id: 'messages', label: 'Mensajes', icon: MessageSquare },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleNavigate = (page: string) => {
    navigate(`/app/${page}`);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superuser: 'Administrador',
      director: 'Directora',
      teacher: 'Profesor',
      student: 'Estudiante',
      parent: 'Padre/Madre'
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500 p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-xl text-gray-800">EmunahAcademy</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? 'bg-teal-50 text-teal-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Cerrar Sesion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  className="pl-10 w-64 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-teal-100 text-teal-600">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500">{getRoleLabel(user?.role || '')}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

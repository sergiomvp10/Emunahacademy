import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { 
  LayoutDashboard, BookOpen, Calendar, Users, MessageSquare, 
  LogOut, Menu, Bell, Search, ChevronDown,
  GraduationCap, FileText, BarChart3, Settings, ClipboardList, DollarSign, Globe, ClipboardCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Layout() {
  const { user, logout } = useAuth();
  const { language, t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    try {
      const data = await api.getUnreadCount(user.id);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // Get current page from path (handle /app prefix)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPage = pathParts[1] || pathParts[0] || 'dashboard';

    const getMenuItems = () => {
      const baseItems = [
        { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { id: 'courses', label: t.nav.courses, icon: BookOpen },
        { id: 'calendar', label: t.nav.calendar, icon: Calendar },
        { id: 'messages', label: t.nav.messages, icon: MessageSquare },
      ];

      if (user?.role === 'superuser') {
        return [
          ...baseItems,
          { id: 'users', label: t.nav.users, icon: Users },
          { id: 'students', label: t.nav.students, icon: GraduationCap },
          { id: 'evaluations', label: t.nav.evaluations, icon: FileText },
          { id: 'assignments', label: t.nav.assignments, icon: ClipboardCheck },
          { id: 'progress', label: t.nav.progress, icon: BarChart3 },
          { id: 'applications', label: t.nav.applications, icon: ClipboardList },
          { id: 'payments', label: t.nav.payments, icon: DollarSign },
          { id: 'site-settings', label: t.nav.settings, icon: Settings },
        ];
      }

      if (user?.role === 'director') {
        return [
          ...baseItems,
          { id: 'users', label: t.nav.users, icon: Users },
          { id: 'students', label: t.nav.students, icon: GraduationCap },
          { id: 'applications', label: t.nav.applications, icon: ClipboardList },
          { id: 'payments', label: t.nav.payments, icon: DollarSign },
        ];
      }

      if (user?.role === 'teacher') {
        return [
          ...baseItems,
          { id: 'students', label: t.nav.students, icon: GraduationCap },
          { id: 'evaluations', label: t.nav.evaluations, icon: FileText },
          { id: 'assignments', label: t.nav.assignments, icon: ClipboardCheck },
        ];
      }

      if (user?.role === 'student') {
        return [
          ...baseItems,
          { id: 'progress', label: t.nav.myProgress, icon: BarChart3 },
          { id: 'evaluations', label: t.nav.evaluations, icon: FileText },
          { id: 'assignments', label: t.nav.assignments, icon: ClipboardCheck },
        ];
      }

      if (user?.role === 'parent') {
        return [
          { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'children', label: t.nav.myChildren, icon: Users },
          { id: 'calendar', label: t.nav.calendar, icon: Calendar },
          { id: 'messages', label: t.nav.messages, icon: MessageSquare },
          { id: 'payments', label: t.nav.payments, icon: DollarSign },
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
        superuser: t.roles.superuser,
        director: t.roles.director,
        teacher: t.roles.teacher,
        student: t.roles.student,
        parent: t.roles.parent
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
                      {sidebarOpen && <span>{t.common.logout}</span>}
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
                                  placeholder={t.common.search + '...'}
                                  className="pl-10 w-64 bg-gray-50 border-gray-200"
                                />
              </div>
            </div>

                        <div className="flex items-center gap-4">
                          <button 
                            onClick={toggleLanguage}
                            className="p-2 hover:bg-gray-100 rounded-lg flex items-center gap-1 text-xs font-medium text-gray-600"
                            title={t.settings.language}
                          >
                            <Globe className="h-4 w-4" />
                            <span className="uppercase">{language}</span>
                          </button>
                          <button 
                            className="p-2 hover:bg-gray-100 rounded-lg relative"
                            onClick={() => navigate('/app/messages')}
                          >
                            <Bell className="h-5 w-5 text-gray-600" />
                            {unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
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

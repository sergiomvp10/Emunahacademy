import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, Briefcase, Home } from 'lucide-react';
import { api } from '../api';

type LoginRole = 'student' | 'parent' | 'staff';

const STAFF_ROLES = ['teacher', 'director', 'superuser'];

interface RoleConfig {
  key: LoginRole;
  title: { es: string; en: string };
  description: { es: string; en: string };
  bg: string;
  accent: string;
  accentHover: string;
  icon: typeof GraduationCap;
  demoAccounts: { email: string; password: string; label: string }[];
  allowedRoles: string[];
  mismatchMessage: { es: string; en: string };
}

const ROLE_CONFIGS: Record<LoginRole, RoleConfig> = {
  student: {
    key: 'student',
    title: { es: 'Ingreso Estudiantes', en: 'Student Sign-In' },
    description: {
      es: 'Continúa tu aprendizaje con EmunahAcademy',
      en: 'Continue your learning with EmunahAcademy',
    },
    bg: 'from-emerald-700 via-emerald-600 to-teal-500',
    accent: 'bg-emerald-600',
    accentHover: 'hover:bg-emerald-700',
    icon: GraduationCap,
    demoAccounts: [
      { email: 'estudiante1@emunahacademy.com', password: 'student123', label: 'Estudiante 1' },
    ],
    allowedRoles: ['student'],
    mismatchMessage: {
      es: 'Esta entrada es solo para estudiantes. Usa Ingreso Padres o Ingreso Personal según tu cuenta.',
      en: 'This entry is for students only. Use Parent Sign-In or Staff Sign-In for your account type.',
    },
  },
  parent: {
    key: 'parent',
    title: { es: 'Ingreso Padres', en: 'Parent Sign-In' },
    description: {
      es: 'Acompaña el progreso académico de tus hijos',
      en: "Track your children's academic progress",
    },
    bg: 'from-sky-700 via-sky-600 to-blue-500',
    accent: 'bg-sky-600',
    accentHover: 'hover:bg-sky-700',
    icon: Home,
    demoAccounts: [
      { email: 'padre1@emunahacademy.com', password: 'parent123', label: 'Padre/Madre' },
    ],
    allowedRoles: ['parent'],
    mismatchMessage: {
      es: 'Esta entrada es solo para padres. Usa Ingreso Estudiantes o Ingreso Personal según tu cuenta.',
      en: 'This entry is for parents only. Use Student Sign-In or Staff Sign-In for your account type.',
    },
  },
  staff: {
    key: 'staff',
    title: { es: 'Ingreso Personal', en: 'Staff Sign-In' },
    description: {
      es: 'Acceso para administradores, directores y docentes',
      en: 'Access for administrators, directors and teachers',
    },
    bg: 'from-blue-900 via-blue-800 to-amber-600',
    accent: 'bg-blue-700',
    accentHover: 'hover:bg-blue-800',
    icon: Briefcase,
    demoAccounts: [
      { email: 'directora@emunahacademy.com', password: 'director123', label: 'Directora' },
      { email: 'profesor1@emunahacademy.com', password: 'teacher123', label: 'Profesor' },
    ],
    allowedRoles: STAFF_ROLES,
    mismatchMessage: {
      es: 'Esta entrada es solo para personal del colegio. Usa Ingreso Estudiantes o Ingreso Padres según tu cuenta.',
      en: 'This entry is for school staff only. Use Student Sign-In or Parent Sign-In for your account type.',
    },
  },
};

function parseRole(raw: string | null): LoginRole {
  if (raw === 'parent') return 'parent';
  if (raw === 'student') return 'student';
  if (raw === 'staff' || raw === 'admin' || raw === 'teacher' || raw === 'director') return 'staff';
  return 'staff';
}

export function Login() {
  const { login, logout } = useAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const role: LoginRole = useMemo(() => parseRole(searchParams.get('role')), [searchParams]);
  const config = ROLE_CONFIGS[role];
  const lang = language === 'en' ? 'en' : 'es';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const me = await api.getCurrentUser();
      if (!config.allowedRoles.includes(me.role)) {
        logout();
        setError(config.mismatchMessage[lang]);
        setLoading(false);
        return;
      }
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || (lang === 'es' ? 'Error al iniciar sesión' : 'Sign-in failed'));
    } finally {
      setLoading(false);
    }
  };

  const Icon = config.icon;
  const otherDoors: { role: LoginRole; label: { es: string; en: string } }[] = (
    [
      { role: 'student' as LoginRole, label: ROLE_CONFIGS.student.title },
      { role: 'parent' as LoginRole, label: ROLE_CONFIGS.parent.title },
      { role: 'staff' as LoginRole, label: ROLE_CONFIGS.staff.title },
    ]
  ).filter((d) => d.role !== role);

  const labels = {
    email: lang === 'es' ? 'Correo electrónico' : 'Email',
    password: lang === 'es' ? 'Contraseña' : 'Password',
    submit: lang === 'es' ? 'Iniciar sesión' : 'Sign in',
    submitting: lang === 'es' ? 'Iniciando...' : 'Signing in...',
    demoAccounts: lang === 'es' ? 'Cuentas de prueba' : 'Demo accounts',
    noAccount: lang === 'es' ? '¿No tienes cuenta? Aplica aquí' : 'No account? Apply here',
    otherDoorsTitle: lang === 'es' ? 'Tu entrada es otra:' : 'Use a different entrance:',
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bg} flex items-center justify-center p-4`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img src="/emunah-logo.png" alt="Emunah Academy" className="h-24 w-auto object-contain" />
          </div>
          <div className="flex justify-center mb-2">
            <div className={`${config.accent} p-2 rounded-full`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-900">Emunah Academy</CardTitle>
          <CardDescription className="text-base font-semibold text-gray-700 mt-1">
            {config.title[lang]}
          </CardDescription>
          <CardDescription className="text-sm mt-1">
            {config.description[lang]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{labels.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{labels.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>
            )}
            <Button
              type="submit"
              className={`w-full ${config.accent} ${config.accentHover} text-white font-semibold`}
              disabled={loading}
            >
              {loading ? labels.submitting : labels.submit}
            </Button>
          </form>

          {config.demoAccounts.length > 0 && (
            <div className="mt-6">
              <p className="text-center text-xs text-gray-500 mb-2">{labels.demoAccounts}</p>
              <div className="grid grid-cols-2 gap-2">
                {config.demoAccounts.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500 mb-2">{labels.otherDoorsTitle}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {otherDoors.map((door) => (
                <Link
                  key={door.role}
                  to={`/login?role=${door.role}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {door.label[lang]}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/#apply"
              className="text-blue-600 hover:underline text-sm"
            >
              {labels.noAccount}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, role);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-amber-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-900">Crear Cuenta</CardTitle>
          <CardDescription>Únete a EmunahAcademy</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Tipo de cuenta</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Estudiante</SelectItem>
                  <SelectItem value="parent">Padre/Madre</SelectItem>
                  <SelectItem value="teacher">Profesor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/login?role=staff"
              className="text-blue-600 hover:underline text-sm"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login, Register } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { CourseDetail } from './pages/CourseDetail';
import { Calendar } from './pages/Calendar';
import { Users } from './pages/Users';
import { Students } from './pages/Students';
import { Evaluations } from './pages/Evaluations';
import { ProgressPage } from './pages/Progress';
import { Messages } from './pages/Messages';
import { LandingPage } from './pages/LandingPage';
import { SiteSettings } from './pages/SiteSettings';
import { Applications } from './pages/Applications';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/app" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:courseId" element={<CourseDetail />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="users" element={<Users />} />
        <Route path="students" element={<Students />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="children" element={<ProgressPage />} />
        <Route path="messages" element={<Messages />} />
        <Route path="site-settings" element={<SiteSettings />} />
        <Route path="applications" element={<Applications />} />
      </Route>
      
      {/* Redirect old routes to new /app prefix */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/courses" element={<Navigate to="/app/courses" replace />} />
      <Route path="/courses/:courseId" element={<Navigate to="/app/courses/:courseId" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App

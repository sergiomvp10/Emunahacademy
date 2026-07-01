import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api, StudentApplication } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { 
  FileText, Search, CheckCircle, XCircle, Clock, 
  User, Mail, Phone, MapPin, Calendar, GraduationCap, Trash2
} from 'lucide-react';

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const GRADE_KEYS: Record<string, keyof typeof import('../i18n').es.grades> = {
  'K': 'kindergarten',
  '1': 'grade1',
  '2': 'grade2',
  '3': 'grade3',
  '4': 'grade4',
  '5': 'grade5',
  '6': 'grade6',
  '7': 'grade7',
  '8': 'grade8',
  '9': 'grade9',
  '10': 'grade10',
  '11': 'grade11',
  '12': 'grade12',
};

export function Applications() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<StudentApplication | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await api.getApplications();
      setApplications(data);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

    const handleStatusUpdate = async (applicationId: number, status: 'approved' | 'rejected') => {
      if (!user) return;
      setUpdating(true);
      try {
        await api.updateApplicationStatus(applicationId, status, user.id);
        await loadApplications();
        setDetailsOpen(false);
      } catch (error) {
        console.error('Error updating application:', error);
        alert(t.applications.errorUpdating);
      } finally {
        setUpdating(false);
      }
    };

    const handleDelete = async (applicationId: number) => {
      if (!confirm(t.applications.confirmDelete)) return;
      try {
        await api.deleteApplication(applicationId);
        await loadApplications();
        setDetailsOpen(false);
      } catch (error) {
        console.error('Error deleting application:', error);
        alert(t.applications.errorDeleting);
      }
    };

    const getStatusLabel = (status: 'pending' | 'approved' | 'rejected') => {
      return t.applications[status];
    };

    const getGradeLabel = (grade: string) => {
      const key = GRADE_KEYS[grade];
      return key ? t.grades[key] : grade;
    };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.parent_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

    if (user?.role !== 'superuser' && user?.role !== 'director') {
      return (
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">{t.applications.noPermission}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  {t.applications.title}
                </h1>
                <p className="text-gray-500 mt-1">{t.applications.subtitle}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-teal-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-500">{t.applications.totalApplications}</div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
                  onClick={() => setStatusFilter('pending')}
                >
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-gray-500">{t.applications.pendingReview}</div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => setStatusFilter('approved')}
                >
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                    <div className="text-sm text-gray-500">{t.applications.approved}</div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
                  onClick={() => setStatusFilter('rejected')}
                >
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                    <div className="text-sm text-gray-500">{t.applications.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t.applications.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">{t.applications.noApplicationsFound}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
                    {filteredApplications.map((app) => {
                      const StatusIcon = STATUS_ICONS[app.status];
                      return (
                        <Card 
                          key={app.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => { setSelectedApp(app); setDetailsOpen(true); }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                                  <GraduationCap className="h-6 w-6 text-teal-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-800">{app.student_name}</h3>
                                  <p className="text-sm text-gray-500">
                                    {getGradeLabel(app.grade_level)} | {t.applications.age}: {app.student_age}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right hidden md:block">
                                  <p className="text-sm text-gray-600">{app.parent_name}</p>
                                  <p className="text-xs text-gray-400">{app.parent_email}</p>
                                </div>
                                <Badge className={STATUS_COLORS[app.status]}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {getStatusLabel(app.status)}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
        </div>
      )}

      {/* Application Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedApp && (
            <>
              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <GraduationCap className="h-5 w-5" />
                                  {t.applications.applicationDetails}
                                </DialogTitle>
                                <DialogDescription>
                                  {t.applications.submittedOn} {new Date(selectedApp.created_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                                    <Badge className={`${STATUS_COLORS[selectedApp.status]} text-sm px-3 py-1`}>
                                      {getStatusLabel(selectedApp.status)}
                                    </Badge>
                                    {selectedApp.reviewed_at && (
                                      <span className="text-sm text-gray-500">
                                        {t.applications.reviewedOn} {new Date(selectedApp.reviewed_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                                      </span>
                                    )}
                </div>

                {/* Student Info */}
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-gray-500">{t.applications.studentInfo}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <span className="font-medium">{selectedApp.student_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span>{t.applications.age}: {selectedApp.student_age}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <GraduationCap className="h-4 w-4 text-gray-400" />
                                      <span>{getGradeLabel(selectedApp.grade_level)}</span>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Parent Info */}
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-gray-500">{t.applications.parentInfo}</CardTitle>
                                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{selectedApp.parent_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${selectedApp.parent_email}`} className="text-teal-600 hover:underline">
                        {selectedApp.parent_email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${selectedApp.parent_phone}`} className="text-teal-600 hover:underline">
                        {selectedApp.parent_phone}
                      </a>
                    </div>
                    {selectedApp.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{selectedApp.address}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Message */}
                                {selectedApp.message && (
                                  <Card>
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-sm text-gray-500">{t.applications.additionalInfo}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-gray-700">{selectedApp.message}</p>
                                    </CardContent>
                                  </Card>
                                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedApp.status === 'pending' && (
                  <>
                                    <Button
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                                      disabled={updating}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      {t.applications.reject}
                                    </Button>
                                    <Button
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleStatusUpdate(selectedApp.id, 'approved')}
                                      disabled={updating}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t.applications.approve}
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(selectedApp.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t.applications.delete}
                                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

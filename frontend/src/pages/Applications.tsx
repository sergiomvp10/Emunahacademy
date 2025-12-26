import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const GRADE_LABELS: Record<string, string> = {
  'K': 'Kindergarten',
  '1': '1st Grade',
  '2': '2nd Grade',
  '3': '3rd Grade',
  '4': '4th Grade',
  '5': '5th Grade',
  '6': '6th Grade',
  '7': '7th Grade',
  '8': '8th Grade',
};

export function Applications() {
  const { user } = useAuth();
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
      alert('Error updating application. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (applicationId: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      await api.deleteApplication(applicationId);
      await loadApplications();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Error deleting application. Please try again.');
    }
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
            <p className="text-gray-500">You don't have permission to access this page.</p>
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
          Student Applications
        </h1>
        <p className="text-gray-500 mt-1">Review and manage student applications</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-teal-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Applications</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending Review</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-500">Approved</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-500">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by student name, parent name, or email..."
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
            <p className="text-gray-500">No applications found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const StatusIcon = STATUS_CONFIG[app.status].icon;
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
                          {GRADE_LABELS[app.grade_level] || app.grade_level} | Age: {app.student_age}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-gray-600">{app.parent_name}</p>
                        <p className="text-xs text-gray-400">{app.parent_email}</p>
                      </div>
                      <Badge className={STATUS_CONFIG[app.status].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_CONFIG[app.status].label}
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
                  Application Details
                </DialogTitle>
                <DialogDescription>
                  Submitted on {new Date(selectedApp.created_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge className={`${STATUS_CONFIG[selectedApp.status].color} text-sm px-3 py-1`}>
                    {STATUS_CONFIG[selectedApp.status].label}
                  </Badge>
                  {selectedApp.reviewed_at && (
                    <span className="text-sm text-gray-500">
                      Reviewed on {new Date(selectedApp.reviewed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Student Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Student Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{selectedApp.student_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Age: {selectedApp.student_age}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-gray-400" />
                      <span>{GRADE_LABELS[selectedApp.grade_level] || selectedApp.grade_level}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Parent Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500">Parent/Guardian Information</CardTitle>
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
                      <CardTitle className="text-sm text-gray-500">Additional Information</CardTitle>
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
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusUpdate(selectedApp.id, 'approved')}
                      disabled={updating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(selectedApp.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

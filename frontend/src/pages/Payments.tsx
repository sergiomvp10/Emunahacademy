import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Payment, PaymentStatus, StudentForPayment } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { 
  DollarSign, Search, CheckCircle, XCircle, Clock, AlertCircle,
  Plus, Calendar, User, Trash2
} from 'lucide-react';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  overdue: { label: 'Vencido', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<StudentForPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [newPayment, setNewPayment] = useState({
    student_id: 0,
    amount: 0,
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    due_date: '',
    notes: ''
  });

  const isAdmin = user?.role === 'superuser' || user?.role === 'director';
  const isParent = user?.role === 'parent';

  useEffect(() => {
    loadPayments();
    if (isAdmin) {
      loadStudents();
    }
  }, [user, yearFilter]);

  const loadPayments = async () => {
    if (!user) return;
    try {
      const data = await api.getPayments(user.id, undefined, undefined, yearFilter);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!user) return;
    try {
      const data = await api.getStudentsForPayments(user.id);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleCreatePayment = async () => {
    if (!user || !newPayment.student_id || !newPayment.amount || !newPayment.due_date) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    setUpdating(true);
    try {
      await api.createPayment({
        student_id: newPayment.student_id,
        amount: newPayment.amount,
        month: newPayment.month,
        year: newPayment.year,
        due_date: newPayment.due_date,
        notes: newPayment.notes || undefined
      }, user.id);
      await loadPayments();
      setCreateOpen(false);
      setNewPayment({
        student_id: 0,
        amount: 0,
        month: MONTHS[new Date().getMonth()],
        year: new Date().getFullYear(),
        due_date: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Error al crear el pago. Por favor intente de nuevo.');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (paymentId: number, status: PaymentStatus) => {
    if (!user) return;
    setUpdating(true);
    try {
      const paymentDate = status === 'paid' ? new Date().toISOString() : undefined;
      await api.updatePayment(paymentId, { status, payment_date: paymentDate }, user.id);
      await loadPayments();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error al actualizar el pago. Por favor intente de nuevo.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (paymentId: number) => {
    if (!user) return;
    if (!confirm('Esta seguro que desea eliminar este pago?')) return;
    try {
      await api.deletePayment(paymentId, user.id);
      await loadPayments();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error al eliminar el pago. Por favor intente de nuevo.');
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.parent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    paid: payments.filter(p => p.status === 'paid').length,
    overdue: payments.filter(p => p.status === 'overdue').length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    paidAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
  };

  if (!isAdmin && !isParent) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No tiene permiso para acceder a esta pagina.</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Pagos
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Gestionar pagos de estudiantes' : 'Ver historial de pagos'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pago
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-teal-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Pagos</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pendientes</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'paid' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter('paid')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-sm text-gray-500">Pagados</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'overdue' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter('overdue')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-500">Vencidos</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-500">Total {yearFilter}:</span>
              <span className="ml-2 font-bold text-gray-800">${stats.totalAmount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Recaudado:</span>
              <span className="ml-2 font-bold text-green-600">${stats.paidAmount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Pendiente:</span>
              <span className="ml-2 font-bold text-yellow-600">${(stats.totalAmount - stats.paidAmount).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre de estudiante o padre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={yearFilter.toString()} onValueChange={(v) => setYearFilter(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron pagos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => {
            const StatusIcon = STATUS_CONFIG[payment.status].icon;
            return (
              <Card 
                key={payment.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedPayment(payment); setDetailsOpen(true); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{payment.student_name}</h3>
                        <p className="text-sm text-gray-500">
                          {payment.month} {payment.year} | Vence: {new Date(payment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-800">${payment.amount.toLocaleString()}</p>
                        {payment.parent_name && (
                          <p className="text-xs text-gray-400">{payment.parent_name}</p>
                        )}
                      </div>
                      <Badge className={STATUS_CONFIG[payment.status].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_CONFIG[payment.status].label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Detalles del Pago
                </DialogTitle>
                <DialogDescription>
                  Creado el {new Date(selectedPayment.created_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={`${STATUS_CONFIG[selectedPayment.status].color} text-sm px-3 py-1`}>
                    {STATUS_CONFIG[selectedPayment.status].label}
                  </Badge>
                  <span className="text-2xl font-bold text-gray-800">
                    ${selectedPayment.amount.toLocaleString()}
                  </span>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Estudiante:</span>
                      <span className="font-medium">{selectedPayment.student_name}</span>
                    </div>
                    {selectedPayment.parent_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Padre:</span>
                        <span className="font-medium">{selectedPayment.parent_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Periodo:</span>
                      <span className="font-medium">{selectedPayment.month} {selectedPayment.year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Vencimiento:</span>
                      <span className="font-medium">{new Date(selectedPayment.due_date).toLocaleDateString()}</span>
                    </div>
                    {selectedPayment.payment_date && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-600">Fecha de pago:</span>
                        <span className="font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedPayment.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-gray-600">Notas:</span>
                        <p className="mt-1 text-gray-700">{selectedPayment.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {isAdmin && (
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  {selectedPayment.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleStatusUpdate(selectedPayment.id, 'overdue')}
                        disabled={updating}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Marcar Vencido
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusUpdate(selectedPayment.id, 'paid')}
                        disabled={updating}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marcar Pagado
                      </Button>
                    </>
                  )}
                  {selectedPayment.status === 'overdue' && (
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusUpdate(selectedPayment.id, 'paid')}
                      disabled={updating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar Pagado
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(selectedPayment.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Payment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nuevo Pago
            </DialogTitle>
            <DialogDescription>
              Crear un nuevo registro de pago para un estudiante
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estudiante *</Label>
              <Select 
                value={newPayment.student_id.toString()} 
                onValueChange={(v) => setNewPayment({...newPayment, student_id: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name} {student.grade_level ? `(${student.grade_level})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes *</Label>
                <Select 
                  value={newPayment.month} 
                  onValueChange={(v) => setNewPayment({...newPayment, month: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano *</Label>
                <Select 
                  value={newPayment.year.toString()} 
                  onValueChange={(v) => setNewPayment({...newPayment, year: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newPayment.amount || ''}
                onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Vencimiento *</Label>
              <Input
                type="date"
                value={newPayment.due_date}
                onChange={(e) => setNewPayment({...newPayment, due_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Notas adicionales..."
                value={newPayment.notes}
                onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreatePayment} 
              disabled={updating}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updating ? 'Creando...' : 'Crear Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

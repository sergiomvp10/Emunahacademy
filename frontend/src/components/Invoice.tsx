import { useRef } from 'react';
import { Payment } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';

interface InvoiceProps {
  payment: Payment;
  open: boolean;
  onClose: () => void;
}

export function Invoice({ payment, open, onClose }: InvoiceProps) {
  const { t, language } = useLanguage();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const getMonthLabel = (monthKey: string) => {
    return t.months[monthKey as keyof typeof t.months] || monthKey;
  };

  const getStatusLabel = (status: string) => {
    return t.payments.status[status as keyof typeof t.payments.status] || status;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const invoiceNumber = `EA-${payment.year}-${String(payment.id).padStart(5, '0')}`;
  const invoiceLabels = language === 'es' ? {
    invoice: 'Factura',
    invoiceNumber: 'No. de Factura',
    date: 'Fecha de Emision',
    billTo: 'Facturar a',
    description: 'Descripcion',
    period: 'Periodo',
    qty: 'Cant.',
    unitPrice: 'Precio',
    total: 'Total',
    subtotal: 'Subtotal',
    grandTotal: 'Total a Pagar',
    status: 'Estado',
    dueDate: 'Fecha de Vencimiento',
    paymentDate: 'Fecha de Pago',
    notes: 'Notas',
    tuitionFee: 'Colegiatura Mensual',
    thankYou: 'Gracias por su pago. Bendiciones.',
    print: 'Imprimir',
    download: 'Descargar PDF',
    from: 'De',
  } : {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice No.',
    date: 'Issue Date',
    billTo: 'Bill To',
    description: 'Description',
    period: 'Period',
    qty: 'Qty',
    unitPrice: 'Price',
    total: 'Total',
    subtotal: 'Subtotal',
    grandTotal: 'Total Due',
    status: 'Status',
    dueDate: 'Due Date',
    paymentDate: 'Payment Date',
    notes: 'Notes',
    tuitionFee: 'Monthly Tuition Fee',
    thankYou: 'Thank you for your payment. Blessings.',
    print: 'Print',
    download: 'Download PDF',
    from: 'From',
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoiceLabels.invoice} ${invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: #fff; }
            .invoice-container { max-width: 800px; margin: 0 auto; padding: 40px; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #0d9488; padding-bottom: 24px; }
            .logo-section { display: flex; align-items: center; gap: 12px; }
            .logo-section img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; }
            .logo-section .name { font-size: 24px; font-weight: 700; color: #1a1a1a; }
            .logo-section .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { font-size: 32px; font-weight: 700; color: #0d9488; letter-spacing: 2px; }
            .invoice-title .invoice-number { font-size: 14px; color: #6b7280; margin-top: 4px; }
            .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
            .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #0d9488; font-weight: 600; margin-bottom: 8px; }
            .meta-block p { font-size: 14px; color: #374151; line-height: 1.6; }
            .meta-block .name { font-weight: 600; font-size: 16px; color: #1a1a1a; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .invoice-table thead th { background: #0d9488; color: #fff; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .invoice-table thead th:last-child { text-align: right; }
            .invoice-table tbody td { padding: 14px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
            .invoice-table tbody td:last-child { text-align: right; font-weight: 600; }
            .invoice-table tbody td.description-cell .main { font-weight: 500; color: #1a1a1a; }
            .invoice-table tbody td.description-cell .sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
            .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
            .totals-table { width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #374151; }
            .totals-row.grand { border-top: 2px solid #0d9488; padding-top: 12px; margin-top: 4px; font-size: 18px; font-weight: 700; color: #0d9488; }
            .status-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-overdue { background: #fee2e2; color: #991b1b; }
            .status-cancelled { background: #f3f4f6; color: #374151; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 32px; padding: 16px; background: #f9fafb; border-radius: 8px; }
            .info-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; display: block; margin-bottom: 4px; }
            .info-item span { font-size: 14px; font-weight: 500; color: #1a1a1a; }
            .notes-section { background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 32px; }
            .notes-section h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 8px; }
            .notes-section p { font-size: 14px; color: #374151; }
            .invoice-footer { text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; }
            .invoice-footer p { font-size: 13px; color: #9ca3af; }
            .invoice-footer .thank-you { font-size: 15px; color: #0d9488; font-weight: 500; margin-bottom: 8px; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .invoice-container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const statusClass = payment.status === 'paid' ? 'status-paid'
    : payment.status === 'pending' ? 'status-pending'
    : payment.status === 'overdue' ? 'status-overdue'
    : 'status-cancelled';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{invoiceLabels.invoice} {invoiceNumber}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {invoiceLabels.print}
              </Button>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={handlePrint}>
                <Download className="h-4 w-4 mr-2" />
                {invoiceLabels.download}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={invoiceRef}>
          <div className="invoice-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '32px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '3px solid #0d9488', paddingBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/emunah-logo.png" alt="Emunah Academy" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a' }}>Emunah Academy</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Faith-Based Education</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#0d9488', letterSpacing: '2px' }}>
                  {invoiceLabels.invoice.toUpperCase()}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  {invoiceLabels.invoiceNumber}: {invoiceNumber}
                </div>
              </div>
            </div>

            {/* From / Bill To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#0d9488', fontWeight: 600, marginBottom: '8px' }}>
                  {invoiceLabels.from}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>Emunah Academy</div>
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                  admin@emunahacademy.org
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#0d9488', fontWeight: 600, marginBottom: '8px' }}>
                  {invoiceLabels.billTo}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
                  {payment.parent_name || payment.student_name}
                </div>
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                  {language === 'es' ? 'Estudiante' : 'Student'}: {payment.student_name}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px', padding: '14px', background: '#f9fafb', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '4px' }}>
                  {invoiceLabels.date}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
                  {formatDate(payment.created_at)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '4px' }}>
                  {invoiceLabels.dueDate}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
                  {formatDate(payment.due_date)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '4px' }}>
                  {invoiceLabels.status}
                </div>
                <span className={statusClass} style={{
                  display: 'inline-block',
                  padding: '3px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: payment.status === 'paid' ? '#d1fae5' : payment.status === 'pending' ? '#fef3c7' : payment.status === 'overdue' ? '#fee2e2' : '#f3f4f6',
                  color: payment.status === 'paid' ? '#065f46' : payment.status === 'pending' ? '#92400e' : payment.status === 'overdue' ? '#991b1b' : '#374151',
                }}>
                  {getStatusLabel(payment.status)}
                </span>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#0d9488', color: '#fff', padding: '12px 16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {invoiceLabels.description}
                  </th>
                  <th style={{ background: '#0d9488', color: '#fff', padding: '12px 16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {invoiceLabels.period}
                  </th>
                  <th style={{ background: '#0d9488', color: '#fff', padding: '12px 16px', textAlign: 'center', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {invoiceLabels.qty}
                  </th>
                  <th style={{ background: '#0d9488', color: '#fff', padding: '12px 16px', textAlign: 'right', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {invoiceLabels.total}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '14px' }}>
                    <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{invoiceLabels.tuitionFee}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{payment.student_name}</div>
                  </td>
                  <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
                    {getMonthLabel(payment.month)} {payment.year}
                  </td>
                  <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '14px', color: '#374151', textAlign: 'center' }}>
                    1
                  </td>
                  <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '14px', fontWeight: 600, textAlign: 'right', color: '#1a1a1a' }}>
                    ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
              <div style={{ width: '280px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#374151' }}>
                  <span>{invoiceLabels.subtotal}</span>
                  <span>${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 700, color: '#0d9488', borderTop: '2px solid #0d9488', marginTop: '4px' }}>
                  <span>{invoiceLabels.grandTotal}</span>
                  <span>${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Payment Date (if paid) */}
            {payment.payment_date && (
              <div style={{ background: '#d1fae5', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#065f46' }}>
                  {invoiceLabels.paymentDate}: <strong>{formatDate(payment.payment_date)}</strong>
                </span>
              </div>
            )}

            {/* Notes */}
            {payment.notes && (
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '28px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '6px' }}>
                  {invoiceLabels.notes}
                </div>
                <div style={{ fontSize: '14px', color: '#374151' }}>{payment.notes}</div>
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '14px', color: '#0d9488', fontWeight: 500, marginBottom: '6px' }}>
                {invoiceLabels.thankYou}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                Emunah Academy | admin@emunahacademy.org
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus, History, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { paymentService } from '../services/api';
import { Card, Button, Input, PageHeader, EmptyState, StatusBadge } from '../components/UI';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    appointmentId: '',
    amount: '',
    paymentMethod: 'Credit Card',
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('medibook_user');
      if (!userStr) {
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userStr);
      if (!user.userId) {
        navigate('/login');
        return;
      }
      const response = await paymentService.getPaymentsByPatient(user.userId);
      setPayments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (!validatePaymentForm()) return;

    try {
      setLoading(true);
      const userStr = localStorage.getItem('medibook_user');
      const user = JSON.parse(userStr);
      
      const paymentData = {
        appointmentId: paymentForm.appointmentId,
        patientId: user.userId,
        providerId: paymentForm.providerId || '', 
        amount: parseFloat(paymentForm.amount),
        mode: paymentForm.paymentMethod === 'Credit Card' ? 'Card' : 
              paymentForm.paymentMethod === 'Net Banking' ? 'NetBanking' : 
              paymentForm.paymentMethod,
        currency: 'USD',
        notes: `Manual payment for appointment ${paymentForm.appointmentId}`,
        paymentDetails: {
          cardNumber: paymentForm.cardNumber.replace(/\s/g, '').slice(-4),
          cardHolder: paymentForm.cardHolder,
          expiryDate: paymentForm.expiryDate,
        }
      };

      const response = await paymentService.createPayment(paymentData);
      toast.success('Payment processed successfully!');
      setShowAddPayment(false);
      setPaymentForm({
        appointmentId: '',
        amount: '',
        paymentMethod: 'Credit Card',
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
      });
      fetchPayments();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment processing failed');
    } finally {
      setLoading(false);
    }
  }

  function validatePaymentForm() {
    const e = {};
    if (!paymentForm.appointmentId.trim()) e.appointmentId = 'Appointment ID is required';
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) e.amount = 'Valid amount is required';
    if (!paymentForm.cardNumber.trim()) e.cardNumber = 'Card number is required';
    if (!paymentForm.cardHolder.trim()) e.cardHolder = 'Card holder name is required';
    if (!paymentForm.expiryDate.trim()) e.expiryDate = 'Expiry date is required';
    if (!paymentForm.cvv.trim()) e.cvv = 'CVV is required';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function getStatusColor(status) {
    switch (status) {
      case 'Paid':
      case 'Completed': return '#10b981';
      case 'Pending': return '#f59e0b';
      case 'Failed': return '#ef4444';
      case 'Refunded': return '#6366f1';
      default: return '#64748b';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'Paid':
      case 'Completed': return CheckCircle;
      case 'Pending': return Clock;
      case 'Failed': return XCircle;
      case 'Refunded': return ArrowLeft;
      default: return Clock;
    }
  }

  if (loading && payments.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div>Loading payments...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <PageHeader
        title="Payment Management"
        subtitle="Manage your payments and view transaction history"
        actions={
          <Button onClick={() => setShowAddPayment(true)}>
            <Plus size={16} style={{ marginRight: 6 }} />
            New Payment
          </Button>
        }
      />

      {/* Payment History */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <History size={20} style={{ marginRight: 8 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Payment History</h3>
        </div>
        
        {payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No Payment History"
            description="You haven't made any payments yet. Your payment history will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {payments.map((payment) => {
              const StatusIcon = getStatusIcon(payment.status);
              return (
                <div
                  key={payment.paymentId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        ${payment.amount?.toFixed(2) || '0.00'}
                      </span>
                      <StatusBadge status={payment.status} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>
                      Appointment: {payment.appointmentId?.slice(0, 8)}…
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(payment.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusIcon size={16} color={getStatusColor(payment.status)} />
                    <span style={{ fontSize: '0.85rem', color: getStatusColor(payment.status) }}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Payment Modal */}
      {showAddPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <Card style={{ padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <CreditCard size={24} style={{ marginRight: 12 }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Process Payment</h3>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Appointment ID"
                  value={paymentForm.appointmentId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, appointmentId: e.target.value })}
                  error={errors.appointmentId}
                  placeholder="Enter appointment ID"
                />

                <Input
                  label="Amount ($)"
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  error={errors.amount}
                  placeholder="0.00"
                />

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: '#fff',
                      fontSize: '0.92rem',
                      color: 'var(--text)',
                      outline: 'none',
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <Input
                  label="Card Number"
                  value={paymentForm.cardNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value })}
                  error={errors.cardNumber}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />

                <Input
                  label="Card Holder Name"
                  value={paymentForm.cardHolder}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cardHolder: e.target.value })}
                  error={errors.cardHolder}
                  placeholder="John Doe"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="Expiry Date"
                    value={paymentForm.expiryDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, expiryDate: e.target.value })}
                    error={errors.expiryDate}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  <Input
                    label="CVV"
                    type="password"
                    value={paymentForm.cvv}
                    onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value })}
                    error={errors.cvv}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Process Payment'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowAddPayment(false);
                      setPaymentForm({
                        appointmentId: '',
                        amount: '',
                        paymentMethod: 'Credit Card',
                        cardNumber: '',
                        cardHolder: '',
                        expiryDate: '',
                        cvv: '',
                      });
                      setErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Calendar, CreditCard } from 'lucide-react';
import { appointmentService, availabilityService, providerService, paymentService, notificationService } from '../services/api';
import { Card, Button, Input, Select, PageHeader, EmptyState } from '../components/UI';
import toast from 'react-hot-toast';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [providers, setProviders] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'Credit Card',
    amount: '',
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });
  const [paymentErrors, setPaymentErrors] = useState({});
  const [form, setForm] = useState({
    patientId: '',
    providerId: '',
    slotId: '',
    serviceType: '',
    appointmentDate: '',
    startTime: '',
    endTime: '',
    modeOfConsultation: 'In-Person',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Fetch providers and service types on component mount
  useEffect(() => {
    fetchProviders();
    fetchServiceTypes();
    
    // Auto-fill patientId if user is logged in
    const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
    if (user.userId) {
      set('patientId', user.userId);
    }
  }, []);

  // Fetch available slots when provider or date changes
  useEffect(() => {
    if (form.providerId && form.appointmentDate) {
      fetchAvailableSlots();
    }
  }, [form.providerId, form.appointmentDate]);

  async function fetchProviders() {
    setLoadingProviders(true);
    try {
      const response = await providerService.getAll();
      const verifiedProviders = (response.data || []).filter(p => p.isVerified);
      setProviders(verifiedProviders);
      
      // Set default provider if available
      if (verifiedProviders.length > 0 && !form.providerId) {
        set('providerId', verifiedProviders[0].providerId);
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      toast.error('Failed to load providers');
    } finally {
      setLoadingProviders(false);
    }
  }

  async function fetchServiceTypes() {
    try {
      // Service types could come from a config service or be hardcoded based on provider specializations
      const commonServiceTypes = [
        'General Consultation', 
        'Follow-up', 
        'Specialist Referral', 
        'Diagnostic', 
        'Emergency', 
        'Vaccination', 
        'Dental', 
        'Ophthalmology', 
        'Physiotherapy',
        'Cardiology',
        'Dermatology',
        'Pediatrics',
        'Orthopedics',
        'Neurology',
        'Gynecology'
      ];
      setServiceTypes(commonServiceTypes);
      
      // Set default service type if available
      if (commonServiceTypes.length > 0 && !form.serviceType) {
        set('serviceType', commonServiceTypes[0]);
      }
    } catch (err) {
      console.error('Failed to fetch service types:', err);
    }
  }

  async function fetchAvailableSlots() {
    if (!form.providerId || !form.appointmentDate) {
      setAvailableSlots([]);
      return;
    }

    console.log('Fetching slots for provider:', form.providerId, 'on date:', form.appointmentDate);

    setLoadingSlots(true);
    try {
      const response = await availabilityService.getAvailableSlots(
        form.providerId, 
        form.appointmentDate
      );
      console.log('Available slots response:', response.data);
      setAvailableSlots(response.data || []);
    } catch (err) {
      console.error('Failed to fetch available slots:', err);
      setAvailableSlots([]);
      toast.error('Failed to fetch available slots');
    } finally {
      setLoadingSlots(false);
    }
  }

  function validate() {
    const e = {};
    if (!form.patientId.trim()) e.patientId = 'Patient ID is required';
    if (!form.providerId.trim()) e.providerId = 'Please select a provider';
    if (!form.slotId.trim()) e.slotId = 'Please select a time slot';
    if (!form.appointmentDate) e.appointmentDate = 'Date is required';
    if (!form.serviceType.trim()) e.serviceType = 'Please select a service type';
    if (!form.startTime) e.startTime = 'Start time is required';
    if (!form.endTime) e.endTime = 'End time is required';
    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      e.endTime = 'End time must be after start time';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        startTime: form.startTime + ':00',
        endTime: form.endTime + ':00',
        appointmentDate: new Date(form.appointmentDate).toISOString(),
      };
      const res = await appointmentService.book(payload);
      setBookedAppointment(res.data);
      setShowPaymentModal(true);
      toast.success('Appointment booked! Please complete payment.');
    } catch (err) {
      console.error('Booking failure details:', err.response?.data);
      toast.error(err?.response?.data?.message || 'Failed to book appointment');
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
      
      const appointmentFee = parseFloat(paymentForm.amount);
      
      const paymentData = {
        appointmentId: bookedAppointment.appointmentId,
        patientId: user.userId || form.patientId,
        providerId: bookedAppointment.providerId,
        amount: appointmentFee,
        mode: paymentForm.paymentMethod === 'Credit Card' ? 'Card' : 
              paymentForm.paymentMethod === 'Net Banking' ? 'NetBanking' : 
              paymentForm.paymentMethod,
        currency: 'USD',
        notes: `Payment for appointment on ${form.appointmentDate}`,
        paymentDetails: {
          cardNumber: paymentForm.cardNumber.replace(/\s/g, '').slice(-4),
          cardHolder: paymentForm.cardHolder,
          expiryDate: paymentForm.expiryDate,
        }
      };

      const paymentResponse = await paymentService.createPayment(paymentData);
      
      try {
        // Resolve the provider's userId to send the notification to the correct account
        const providerObj = providers.find(p => p.providerId === bookedAppointment.providerId);
        const recipientUserId = providerObj ? providerObj.userId : bookedAppointment.providerId;

        await notificationService.createNotification({
          recipientId: recipientUserId,
          type: 'BOOKING',
          title: 'New Appointment Booked',
          message: `A new appointment has been booked for ${form.appointmentDate} at ${form.startTime}.`,
          channel: 'APP',
          relatedId: bookedAppointment.appointmentId,
          relatedType: 'Appointment'
        });
      } catch (err) {
        console.error('Failed to notify provider:', err);
      }

      toast.success('Payment processed successfully!');
      setShowPaymentModal(false);
      setSuccess(bookedAppointment);
      
      // Reset payment form
      setPaymentForm({
        paymentMethod: 'Credit Card',
        amount: '',
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
      });
      setPaymentErrors({});
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment processing failed');
    } finally {
      setLoading(false);
    }
  }

  function validatePaymentForm() {
    const e = {};
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      e.amount = 'Please enter a valid amount';
    }
    
    if (paymentForm.paymentMethod === 'Credit Card') {
      if (!paymentForm.cardNumber?.trim()) e.cardNumber = 'Card number is required';
      if (!paymentForm.cardHolder?.trim()) e.cardHolder = 'Card holder name is required';
      if (!paymentForm.expiryDate?.trim()) e.expiryDate = 'Expiry date is required';
      if (!paymentForm.cvv?.trim()) e.cvv = 'CVV is required';
    } else if (paymentForm.paymentMethod === 'UPI') {
      if (!paymentForm.upiId?.trim()) e.upiId = 'UPI ID is required';
    } else if (paymentForm.paymentMethod === 'Net Banking') {
      if (!paymentForm.bankName) e.bankName = 'Please select a bank';
    }
    
    setPaymentErrors(e);
    return Object.keys(e).length === 0;
  }

  if (success) {
    return (
      <div className="animate-fade-up" style={styles.successWrap}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}><CheckCircle size={48} color="var(--teal)" /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>Appointment Booked!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            Your appointment has been confirmed.
          </p>
          <div style={styles.successMeta}>
            {[
              ['Appointment ID', success.appointmentId],
              ['Service', success.serviceType],
              ['Date', new Date(success.appointmentDate).toLocaleDateString()],
              ['Mode', success.modeOfConsultation],
              ['Status', success.status],
            ].map(([k, v]) => (
              <div key={k} style={styles.metaRow}>
                <span style={styles.metaKey}>{k}</span>
                <span style={styles.metaVal}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Button variant="dark" onClick={() => navigate(`/appointments/${success.appointmentId}`)}>
              View Details
            </Button>
            <Button variant="ghost" onClick={() => { setSuccess(null); setForm(f => ({ ...f, slotId: '', appointmentDate: '', startTime: '', endTime: '', notes: '' })); }}>
              Book Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Book Appointment"
        subtitle="Schedule a new medical appointment"
        action={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </Button>
        }
      />

      <div style={styles.formGrid}>
        <Card style={{ padding: 28 }}>
          <h3 style={styles.sectionTitle}>Patient & Provider</h3>
          <div style={styles.fieldGrid}>
            <Input label="Patient ID *" value={form.patientId} onChange={e => set('patientId', e.target.value)} error={errors.patientId} placeholder="Enter your patient ID" />
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                Provider *
              </label>
              <select
                value={form.providerId}
                onChange={e => set('providerId', e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  border: `1px solid ${errors.providerId ? '#ef4444' : 'var(--border)'}`,
                  background: '#fff', fontSize: '0.92rem', color: 'var(--text)',
                  outline: 'none', width: '100%', cursor: 'pointer',
                }}
                disabled={loadingProviders}
              >
                <option value="">Select a provider</option>
                {providers.map(provider => (
                  <option key={provider.providerId} value={provider.providerId}>
                    Dr. {provider.fullName} - {provider.specialization}
                  </option>
                ))}
              </select>
              {errors.providerId && <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>{errors.providerId}</span>}
            </div>
            <Select label="Mode of Consultation *" value={form.modeOfConsultation} onChange={e => set('modeOfConsultation', e.target.value)}>
              <option value="In-Person">In-Person</option>
              <option value="Teleconsultation">Teleconsultation</option>
            </Select>
          </div>
        </Card>

        <Card style={{ padding: 28 }}>
          <h3 style={styles.sectionTitle}>Available Time Slots</h3>
          <div style={styles.fieldGrid}>
            <Input 
              label="Appointment Date *" 
              type="date" 
              value={form.appointmentDate} 
              onChange={e => set('appointmentDate', e.target.value)} 
              error={errors.appointmentDate} 
              min={new Date().toISOString().split('T')[0]} 
            />
          </div>
          
          {form.appointmentDate && (
            <div style={{ marginTop: 16 }}>
              {loadingSlots ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  Loading available slots...
                </div>
              ) : availableSlots.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No Available Slots"
                  description={!form.providerId || !form.appointmentDate 
                    ? "Please select a provider and date to view available time slots."
                    : "No time slots are available for this provider on the selected date. Please ensure the provider is verified and has added slots."}
                />
              ) : (
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>
                    Select a Time Slot
                  </h4>
                  <div style={styles.slotsGrid}>
                    {availableSlots.map(slot => (
                      <button
                        key={slot.slotId}
                        type="button"
                        onClick={() => {
                          set('slotId', slot.slotId);
                          set('startTime', slot.startTime.substring(0, 5));
                          set('endTime', slot.endTime.substring(0, 5));
                        }}
                        style={{
                          ...styles.slotButton,
                          ...(form.slotId === slot.slotId ? styles.slotButtonSelected : {})
                        }}
                      >
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {Math.floor((new Date(`2000-01-01 ${slot.endTime}`) - new Date(`2000-01-01 ${slot.startTime}`)) / 1000 / 60)} min
                        </div>
                      </button>
                    ))}
                  </div>
                  {form.slotId && (
                    <div style={{ marginTop: 12, padding: '12px', background: 'var(--teal-light)', borderRadius: 8, border: '1px solid var(--teal)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--teal-dark)' }}>
                        Selected: {form.startTime} - {form.endTime}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card style={{ padding: 28 }}>
          <h3 style={styles.sectionTitle}>Appointment Details</h3>
          <div style={styles.fieldGrid}>
            <Select label="Service Type *" value={form.serviceType} onChange={e => set('serviceType', e.target.value)}>
              <option value="">Select a service type</option>
              {serviceTypes.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
        </Card>

        <Card style={{ padding: 28, gridColumn: '1 / -1' }}>
          <h3 style={styles.sectionTitle}>Additional Notes</h3>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any additional information or special requirements..."
            rows={4}
            style={styles.textarea}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="dark" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Booking...' : 'Book Appointment'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && bookedAppointment && (
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
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Complete Payment</h3>
            </div>

            <div style={{ 
              padding: '16px', 
              backgroundColor: 'var(--surface)', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Provider</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {providers.find(p => p.providerId === bookedAppointment.providerId)?.fullName || 'Provider'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Service Type</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{bookedAppointment.serviceType}</span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Amount ($)"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Enter amount to pay"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  error={paymentErrors.amount}
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
                    <option value="UPI">UPI</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>

                {paymentForm.paymentMethod === 'Credit Card' && (
                  <>
                    <Input
                      label="Card Number"
                      value={paymentForm.cardNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value })}
                      error={paymentErrors.cardNumber}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                    <Input
                      label="Card Holder Name"
                      value={paymentForm.cardHolder}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cardHolder: e.target.value })}
                      error={paymentErrors.cardHolder}
                      placeholder="John Doe"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <Input
                        label="Expiry Date"
                        value={paymentForm.expiryDate}
                        onChange={(e) => setPaymentForm({ ...paymentForm, expiryDate: e.target.value })}
                        error={paymentErrors.expiryDate}
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                      <Input
                        label="CVV"
                        type="password"
                        value={paymentForm.cvv}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value })}
                        error={paymentErrors.cvv}
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </>
                )}

                {paymentForm.paymentMethod === 'UPI' && (
                  <Input
                    label="UPI ID"
                    value={paymentForm.upiId || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, upiId: e.target.value })}
                    error={paymentErrors.upiId}
                    placeholder="username@upi"
                  />
                )}

                {paymentForm.paymentMethod === 'Net Banking' && (
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                      Select Bank
                    </label>
                    <select
                      value={paymentForm.bankName || ''}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: paymentErrors.bankName ? '1px solid var(--red)' : '1px solid var(--border)',
                        background: '#fff',
                        fontSize: '0.92rem',
                        color: 'var(--text)',
                        outline: 'none',
                        width: '100%',
                      }}
                    >
                      <option value="">Select your bank</option>
                      <option value="HDFC">HDFC Bank</option>
                      <option value="SBI">State Bank of India</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="AXIS">Axis Bank</option>
                    </select>
                    {paymentErrors.bankName && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: '4px', display: 'block' }}>
                        {paymentErrors.bankName}
                      </span>
                    )}
                  </div>
                )}



                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Pay'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentForm({
                        paymentMethod: 'Credit Card',
                        cardNumber: '',
                        cardHolder: '',
                        expiryDate: '',
                        cvv: '',
                      });
                      setPaymentErrors({});
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

const styles = {
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  sectionTitle: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  slotsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 },
  slotButton: {
    padding: '16px 12px',
    border: '1px solid var(--border)',
    borderRadius: 12,
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    textAlign: 'center',
  },
  slotButtonSelected: {
    borderColor: 'var(--teal)',
    background: 'var(--teal-light)',
    color: 'var(--teal-dark)',
  },
  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid var(--border)', fontFamily: 'var(--font-body)',
    fontSize: '0.92rem', resize: 'vertical', outline: 'none',
    color: 'var(--text)',
  },
  successWrap: { display: 'flex', justifyContent: 'center', padding: '60px 0' },
  successCard: {
    background: '#fff', borderRadius: 20, padding: '48px',
    border: '1px solid var(--border)', textAlign: 'center',
    maxWidth: 480, width: '100%', boxShadow: 'var(--shadow-lg)',
  },
  successIcon: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'var(--teal-light)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
  },
  successMeta: { background: 'var(--surface)', borderRadius: 12, padding: '16px', textAlign: 'left' },
  metaRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' },
  metaKey: { fontSize: '0.82rem', color: 'var(--text-muted)' },
  metaVal: { fontSize: '0.82rem', fontWeight: 600 },
};

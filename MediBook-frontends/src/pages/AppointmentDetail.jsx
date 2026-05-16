import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Activity, ArrowLeft, MoreHorizontal, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { appointmentService, paymentService, recordService, notificationService, providerService } from '../services/api';
import { Card, Button, PageHeader, StatusBadge, Spinner } from '../components/UI';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
  const isProvider = user.role === 'Provider';
  const [appointment, setAppointment] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const get = (obj, key) => {
    if (!obj) return null;
    return obj[key] || obj[key.charAt(0).toLowerCase() + key.slice(1)] || obj[key.charAt(0).toUpperCase() + key.slice(1)];
  };
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);
  const [recordForm, setRecordForm] = useState({
    diagnosis: '',
    prescription: '',
    labTests: '',
    notes: ''
  });
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  async function fetchAppointment() {
    try {
      setLoading(true);
      const res = await appointmentService.getById(id);
      setAppointment(res.data);
      
      // Fetch associated payment and existing medical record
      fetchPayment(id);
      fetchExistingRecord(id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  }

  async function fetchExistingRecord(appointmentId) {
    if (!appointmentId) return;
    try {
      const res = await recordService.getRecordByAppointment(appointmentId);
      // Check if data is not just empty object
      if (res.data && res.data.recordId) {
        setExistingRecord(res.data);
        setRecordForm({
          diagnosis: res.data.diagnosis || '',
          prescription: res.data.prescription || '',
          labTests: '',
          notes: res.data.notes || ''
        });
      } else {
        setExistingRecord(null);
      }
    } catch (err) {
      setExistingRecord(null);
    }
  }

  async function fetchPayment(appointmentId) {
    try {
      setPaymentLoading(true);
      const res = await paymentService.getPaymentByAppointment(appointmentId);
      setPayment(res.data);
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.error('Failed to load payment:', err);
      }
      setPayment(null);
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleStatusUpdate(status) {
    try {
      await appointmentService.updateStatus(id, status);
      toast.success(`Appointment marked as ${status}`);
      
      // Trigger notification if cancelled
      if (status === 'Cancelled' && appointment) {
        const recipientId = isProvider ? get(appointment, 'PatientId') : get(appointment, 'ProviderId');
        
        let targetUserId = recipientId;
        if (!isProvider) {
          // If patient is cancelling, we need to resolve the provider's USER ID
          try {
            const provRes = await providerService.getById(recipientId);
            if (provRes.data && provRes.data.userId) {
              targetUserId = provRes.data.userId;
            }
          } catch (err) {
            console.error('Failed to fetch provider userId', err);
          }
        }

        try {
          await notificationService.createNotification({
            recipientId: targetUserId,
            type: 'CANCELLATION',
            title: 'Appointment Cancelled',
            message: `The appointment on ${new Date(get(appointment, 'AppointmentDate')).toLocaleDateString()} has been cancelled by the ${isProvider ? 'provider' : 'patient'}.`,
            channel: 'APP',
            relatedId: id,
            relatedType: 'Appointment'
          });
        } catch (err) {
          console.error('Notification failed', err);
        }
      }

      fetchAppointment();
    } catch (err) {
      toast.error('Failed to update status');
    }
  }

  async function handleAddNotes() {
    if (!recordForm.diagnosis.trim() && !recordForm.notes.trim()) {
      toast.error('Please add at least a diagnosis or notes');
      return;
    }
    try {
      setSavingNote(true);
      const apptId = get(appointment, 'AppointmentId');
      
      const recordData = {
        appointmentId: apptId,
        patientId: get(appointment, 'PatientId'),
        providerId: get(appointment, 'ProviderId'),
        diagnosis: recordForm.diagnosis.trim() || 'General Consultation',
        prescription: recordForm.prescription.trim() || 'No prescription provided',
        notes: (recordForm.notes.trim() + (recordForm.labTests.trim() ? '\n\nLab Tests: ' + recordForm.labTests : '')).trim() || 'No clinical notes added',
      };

      await recordService.createRecord(recordData);
      toast.success('Medical record saved successfully');
      
      setShowNotesModal(false);
      fetchExistingRecord(apptId);
    } catch (err) {
      console.error('Save failed:', err.response?.data);
      const msg = err.response?.data?.message || 'Failed to save record';
      toast.error(`Error: ${msg}`);
    } finally {
      setSavingNote(false);
    }
  }


  const formatTime = (timespan) => {
    if (!timespan) return '—';
    const parts = timespan.toString().split(':');
    if (parts.length < 2) return timespan;
    const h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2>Appointment Not Found</h2>
        <Button onClick={() => navigate('/appointments')} style={{ marginTop: 20 }}>
          Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 20 }}>
        <button 
          onClick={() => navigate('/appointments')}
          style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 6, 
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '0.9rem', padding: 0
          }}
        >
          <ArrowLeft size={16} /> Back to List
        </button>
      </div>

      <PageHeader 
        title="Appointment Details"
        subtitle={`Reference ID: ${appointment.appointmentId}`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            {appointment.status === 'Scheduled' && (
              <>
                <Button variant="danger" onClick={() => handleStatusUpdate('Cancelled')}>
                  <XCircle size={16} /> Cancel
                </Button>
                {isProvider && (
                  <Button onClick={() => handleStatusUpdate('Completed')}>
                    <CheckCircle size={16} /> Mark Completed
                  </Button>
                )}
              </>
            )}
            {!isProvider && !payment && appointment.status === 'Scheduled' && (
              <Button onClick={() => navigate('/dashboard/payments')}>
                <CreditCard size={16} /> Pay Now
              </Button>
            )}
            <Button variant="ghost">
              <MoreHorizontal size={16} />
            </Button>
          </div>
        }
      />

      <div style={styles.grid}>
        <div style={styles.mainCol}>
          <Card style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={styles.sectionTitle}>General Information</h3>
            <div style={styles.infoGrid}>
              <InfoItem icon={User} label="Patient ID" value={get(appointment, 'PatientId')} />
              <InfoItem icon={Activity} label="Provider ID" value={get(appointment, 'ProviderId')} />
              <InfoItem icon={Calendar} label="Date" value={format(new Date(get(appointment, 'AppointmentDate')), 'MMMM dd, yyyy')} />
              <InfoItem icon={Clock} label="Time" value={`${formatTime(get(appointment, 'StartTime'))} - ${formatTime(get(appointment, 'EndTime'))}`} />
              <InfoItem icon={Activity} label="Service Type" value={get(appointment, 'ServiceType')} />
              <InfoItem icon={Activity} label="Consultation Mode" value={get(appointment, 'ModeOfConsultation')} />
            </div>
          </Card>

          <Card style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={styles.sectionTitle}>Payment Details</h3>
            {paymentLoading ? (
              <Spinner size="sm" />
            ) : payment ? (
              <div style={styles.infoGrid}>
                <InfoItem icon={CreditCard} label="Transaction ID" value={payment.transactionId} />
                <InfoItem icon={Activity} label="Amount" value={`$${payment.amount.toFixed(2)}`} />
                <InfoItem icon={Activity} label="Status" value={<StatusBadge status={payment.status} />} />
                <InfoItem icon={Calendar} label="Date" value={format(new Date(payment.createdAt), 'MMM dd, yyyy')} />
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No payment record found for this appointment.</p>
            )}
          </Card>

          <Card style={{ padding: 24 }}>
            <h3 style={styles.sectionTitle}>Status History</h3>
            <div style={styles.timeline}>
              <div style={styles.timelineItem}>
                <div style={styles.timelineMarker} />
                <div>
                  <p style={styles.timelineTitle}>Appointment {appointment.status}</p>
                  <p style={styles.timelineDate}>Last updated: {format(new Date(appointment.updatedAt || new Date()), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <div style={{ ...styles.timelineItem, opacity: 0.5 }}>
                <div style={{ ...styles.timelineMarker, background: 'var(--border)' }} />
                <div>
                  <p style={styles.timelineTitle}>Appointment Created</p>
                  <p style={styles.timelineDate}>{format(new Date(appointment.createdAt), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            </div>
          </Card>
          
          {existingRecord && (
            <Card style={{ padding: 24, marginTop: 24, borderLeft: '4px solid var(--teal)' }}>
              <h3 style={styles.sectionTitle}>Medical Record Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={styles.infoLabel}>Diagnosis</p>
                  <p style={styles.infoValue}>{existingRecord.diagnosis}</p>
                </div>
                <div>
                  <p style={styles.infoLabel}>Prescription</p>
                  <p style={{ ...styles.infoValue, whiteSpace: 'pre-wrap' }}>{existingRecord.prescription}</p>
                </div>
                <div>
                  <p style={styles.infoLabel}>Notes</p>
                  <p style={{ ...styles.infoValue, whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{existingRecord.notes}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div style={styles.sideCol}>
          <Card style={{ padding: 24, textAlign: 'center', background: 'var(--surface)' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Current Status</p>
            <StatusBadge status={appointment.status} />
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Please ensure all medical records are updated after the consultation.
              </p>
            </div>
          </Card>

          <Card style={{ padding: 24, marginTop: 24 }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Reschedule — both roles */}
              {appointment?.status === 'Scheduled' && (
                <Button variant="ghost" fullWidth onClick={() => navigate(`/appointments/${id}/reschedule`)}>
                  Reschedule
                </Button>
              )}
              {/* Add / Edit Record — providers only */}
              {isProvider && (
                <Button variant="ghost" fullWidth onClick={() => setShowNotesModal(true)}>
                  {existingRecord ? 'Edit Medical Record' : 'Add Medical Record'}
                </Button>
              )}
              {/* Cancel — both roles, when Scheduled */}
              {appointment?.status === 'Scheduled' && (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => handleStatusUpdate('Cancelled')}
                >
                  Cancel Appointment
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Medical Record Modal — providers only */}
      {showNotesModal && isProvider && (
        <div style={styles.modalOverlay}>
          <Card style={{ ...styles.modalCard, maxWidth: 600 }}>
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={20} color="var(--teal)" />
              {existingRecord ? 'Edit Medical Record' : 'Add Medical Record'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={styles.label}>Diagnosis / Assessment</label>
                <input
                  placeholder="e.g. Hypertension, Seasonal Allergies"
                  value={recordForm.diagnosis}
                  onChange={e => setRecordForm({...recordForm, diagnosis: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Prescription</label>
                <textarea
                  placeholder="List medications, dosage, and frequency..."
                  value={recordForm.prescription}
                  onChange={e => setRecordForm({...recordForm, prescription: e.target.value})}
                  style={{ ...styles.textarea, height: 80 }}
                />
              </div>

              <div>
                <label style={styles.label}>Lab Tests / Investigations</label>
                <input
                  placeholder="e.g. Blood Work, X-Ray, MRI"
                  value={recordForm.labTests}
                  onChange={e => setRecordForm({...recordForm, labTests: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Clinical Notes</label>
                <textarea
                  placeholder="Additional observations or advice..."
                  value={recordForm.notes}
                  onChange={e => setRecordForm({...recordForm, notes: e.target.value})}
                  style={{ ...styles.textarea, height: 100 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowNotesModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNotes} loading={savingNote}>
                {existingRecord ? 'Update Record' : 'Save Record'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div style={styles.infoItem}>
      <div style={styles.infoIcon}>
        <Icon size={18} />
      </div>
      <div>
        <p style={styles.infoLabel}>{label}</p>
        <p style={styles.infoValue}>{value || 'N/A'}</p>
      </div>
    </div>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 },
  mainCol: {},
  sideCol: {},
  sectionTitle: { fontSize: '1.1rem', marginBottom: 20, fontWeight: 600 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  infoItem: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  infoIcon: { 
    width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)'
  },
  infoLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 2 },
  infoValue: { fontSize: '0.95rem', fontWeight: 500 },
  timeline: { position: 'relative', paddingLeft: 20 },
  timelineItem: { position: 'relative', paddingBottom: 24, display: 'flex', gap: 16 },
  timelineMarker: { 
    position: 'absolute', left: -20, top: 5, width: 12, height: 12, 
    borderRadius: '50%', background: 'var(--teal)', border: '3px solid #fff', zIndex: 1
  },
  timelineTitle: { fontSize: '0.9rem', fontWeight: 500, marginBottom: 2 },
  timelineDate: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20
  },
  modalCard: { width: '100%', maxWidth: 500, padding: 24 },
  label: {
    display: 'block', fontSize: '0.85rem', fontWeight: 500,
    marginBottom: 6, color: 'var(--text-muted)',
  },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', fontSize: '0.9rem',
    outline: 'none', background: '#fff',
  },
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', fontSize: '0.9rem',
    outline: 'none', background: '#fff', resize: 'vertical',
    fontFamily: 'inherit',
  },
};

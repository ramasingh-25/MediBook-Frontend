import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { appointmentService, notificationService, providerService } from '../services/api';
import { Card, Button, Input, PageHeader, Spinner, StatusBadge } from '../components/UI';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function RescheduleAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ newSlotId: '', newAppointmentDate: '', newStartTime: '', newEndTime: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    appointmentService.getById(id)
      .then(r => { setAppt(r.data); })
      .catch(() => { toast.error('Appointment not found'); navigate('/appointments'); })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.newSlotId.trim()) e.newSlotId = 'Slot ID is required';
    if (!form.newAppointmentDate) e.newAppointmentDate = 'Date is required';
    if (!form.newStartTime) e.newStartTime = 'Start time is required';
    if (!form.newEndTime) e.newEndTime = 'End time is required';
    if (form.newStartTime && form.newEndTime && form.newStartTime >= form.newEndTime)
      e.newEndTime = 'End time must be after start time';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      await appointmentService.reschedule(id, {
        newSlotId: form.newSlotId,
        newAppointmentDate: new Date(form.newAppointmentDate).toISOString(),
        newStartTime: form.newStartTime + ':00',
        newEndTime: form.newEndTime + ':00',
      });

      const userStr = localStorage.getItem('medibook_user');
      const user = JSON.parse(userStr || '{}');
      if (appt) {
        const isProvider = user.role === 'Provider';
        let recipientId = isProvider ? appt.patientId : appt.providerId;

        // If patient is rescheduling, we need to find the provider's USER ID
        if (!isProvider) {
          try {
            const provRes = await providerService.getById(appt.providerId);
            if (provRes.data && provRes.data.userId) {
              recipientId = provRes.data.userId;
            }
          } catch (err) {
            console.error('Failed to fetch provider userId', err);
          }
        }
        
        try {
          await notificationService.createNotification({
            recipientId,
            type: 'RESCHEDULE',
            title: 'Appointment Rescheduled',
            message: `Your appointment has been rescheduled to ${new Date(form.newAppointmentDate).toLocaleDateString()} at ${form.newStartTime} by the ${isProvider ? 'provider' : 'patient'}.`,
            channel: 'APP',
            relatedId: id,
            relatedType: 'Appointment'
          });
        } catch (err) {
          console.error('Notification failed', err);
        }
      }

      toast.success('Appointment rescheduled');
      setDone(true);
    } catch {
      toast.error('Failed to reschedule');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  if (done) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, textAlign: 'center', border: '1px solid var(--border)', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={36} color="var(--teal)" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 8 }}>Rescheduled!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>Your appointment has been rescheduled successfully.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="dark" onClick={() => navigate(`/appointments/${id}`)}>View Appointment</Button>
          <Button variant="ghost" onClick={() => navigate('/appointments')}>All Appointments</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Reschedule Appointment"
        subtitle="Choose a new date and time slot"
        action={<Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <Card style={{ padding: 28 }}>
          <h3 style={styles.sectionTitle}>New Schedule</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input label="New Slot ID *" value={form.newSlotId} onChange={e => set('newSlotId', e.target.value)} error={errors.newSlotId} placeholder="e.g. slot-456" />
            <Input label="New Date *" type="date" value={form.newAppointmentDate} onChange={e => set('newAppointmentDate', e.target.value)} error={errors.newAppointmentDate} min={new Date().toISOString().split('T')[0]} />
            <Input label="New Start Time *" type="time" value={form.newStartTime} onChange={e => set('newStartTime', e.target.value)} error={errors.newStartTime} />
            <Input label="New End Time *" type="time" value={form.newEndTime} onChange={e => set('newEndTime', e.target.value)} error={errors.newEndTime} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="dark" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Reschedule'}
            </Button>
          </div>
        </Card>

        {appt && (
          <Card style={{ padding: 20 }}>
            <h3 style={styles.sectionTitle}>Current Appointment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StatusBadge status={appt.status} />
              {[
                ['Service', appt.serviceType],
                ['Date', (() => { try { return format(new Date(appt.appointmentDate), 'MMM dd, yyyy'); } catch { return appt.appointmentDate; } })()],
                ['Slot', appt.slotId],
                ['Mode', appt.modeOfConsultation],
              ].map(([k, v]) => (
                <div key={k}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</p>
                  <p style={{ fontSize: '0.88rem', fontWeight: 500, marginTop: 2 }}>{v}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 },
};

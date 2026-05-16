import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, XCircle, Clock, Plus, ArrowRight, FileText, Pill, Stethoscope, Star } from 'lucide-react';
import { appointmentService, recordService } from '../services/api';
import { Card, StatCard, Button, StatusBadge, Spinner, PageHeader } from '../components/UI';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('medibook_token');
    const userStr = localStorage.getItem('medibook_user');
    if (!token || !userStr) {
      toast.error('Please login to access dashboard');
      navigate('/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'Provider') { navigate('/provider/dashboard', { replace: true }); return; }
      if (user.role === 'Admin') { navigate('/admin/dashboard', { replace: true }); return; }
    } catch { }

    async function fetchData() {
      try {
        const user = JSON.parse(userStr);
        const userId = user.userId;

        const [allRes, upcomingRes, recordsRes] = await Promise.allSettled([
          appointmentService.getByPatient(userId),
          appointmentService.getUpcomingByPatient(userId),
          recordService.getRecordsByPatient(userId),
        ]);
        if (allRes.status === 'fulfilled') setAppointments(allRes.value.data || []);
        if (upcomingRes.status === 'fulfilled') setUpcoming(upcomingRes.value.data || []);
        if (recordsRes.status === 'fulfilled') setMedicalRecords(recordsRes.value.data || []);
      } catch (err) {
        toast.error('Could not load dashboard data');
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('medibook_token');
          localStorage.removeItem('medibook_user');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  const counts = {
    total: appointments.length,
    scheduled: appointments.filter(a => (a.status || a.Status) === 'Scheduled').length,
    completed: appointments.filter(a => (a.status || a.Status) === 'Completed').length,
    cancelled: appointments.filter(a => (a.status || a.Status) === 'Cancelled').length,
  };

  const formatDate = (d) => { try { return format(new Date(d), 'MMM dd, yyyy'); } catch { return d; } };
  const formatTime = (t) => {
    if (!t) return '';
    const parts = t.toString().split(':');
    const h = parseInt(parts[0]);
    return `${h % 12 || 12}:${parts[1]} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back · ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}
        action={
          <Button variant="dark" onClick={() => navigate('/appointments/book')}>
            <Plus size={16} /> New Appointment
          </Button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner size={36} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={styles.statsGrid}>
            <StatCard label="Total Appointments" value={counts.total} icon={Calendar} color="var(--teal)" />
            <StatCard label="Scheduled" value={counts.scheduled} icon={Clock} color="#0369a1" />
            <StatCard label="Completed" value={counts.completed} icon={CheckCircle} color="#15803d" />
            <StatCard label="Cancelled" value={counts.cancelled} icon={XCircle} color="#b91c1c" />
          </div>

          <div style={styles.grid2}>
            {/* Upcoming appointments */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Upcoming Appointments</h2>
                <Button size="sm" variant="ghost" onClick={() => navigate('/appointments')}>
                  View all <ArrowRight size={14} />
                </Button>
              </div>
              {upcoming.length === 0 ? (
                <div style={styles.empty}>
                  <Calendar size={28} color="var(--border)" />
                  <p>No upcoming appointments</p>
                </div>
              ) : (
                <div>
                  {upcoming.slice(0, 5).map((appt) => (
                    <div
                      key={appt.appointmentId}
                      style={styles.apptRow}
                      onClick={() => navigate(`/appointments/${appt.appointmentId}`)}
                    >
                      <div style={styles.apptDateBox}>
                        <span style={styles.apptDay}>{format(new Date(appt.appointmentDate || appt.AppointmentDate), 'dd')}</span>
                        <span style={styles.apptMonth}>{format(new Date(appt.appointmentDate || appt.AppointmentDate), 'MMM')}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{appt.serviceType || appt.ServiceType}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatTime(appt.startTime || appt.StartTime)} · {appt.modeOfConsultation || appt.ModeOfConsultation}
                        </p>
                      </div>
                      <StatusBadge status={appt.status || appt.Status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card style={{ padding: 24 }}>
                <h2 style={{ ...styles.cardTitle, marginBottom: 16 }}>Quick Actions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Book New Appointment', icon: Plus, to: '/appointments/book' },
                    { label: 'View All Appointments', icon: Calendar, to: '/appointments' },
                    { label: 'My Reviews', icon: Star, to: '/dashboard/reviews' },
                  ].map(({ label, icon: Icon, to }) => (
                    <button key={to} onClick={() => navigate(to)} style={styles.quickAction}>
                      <div style={styles.qaIcon}><Icon size={18} color="var(--teal)" /></div>
                      <span style={{ flex: 1, textAlign: 'left', fontWeight: 500, fontSize: '0.9rem' }}>{label}</span>
                      <ArrowRight size={16} color="var(--text-muted)" />
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* ── Medical Records ────────────────────────────── */}
          <Card style={{ padding: 0, overflow: 'hidden', marginTop: 24 }}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={20} color="var(--teal)" />
                <h2 style={styles.cardTitle}>My Medical Records</h2>
              </div>
              <span style={styles.recordCount}>{medicalRecords.length} record{medicalRecords.length !== 1 ? 's' : ''}</span>
            </div>
            {medicalRecords.length === 0 ? (
              <div style={styles.empty}>
                <FileText size={28} color="var(--border)" />
                <p>No medical records yet. Records added by your doctor will appear here.</p>
              </div>
            ) : (
              <div style={styles.recordsGrid}>
                {medicalRecords.map((record) => (
                  <div key={record.recordId} style={styles.recordCard}>
                    <div style={styles.recordCardHeader}>
                      <div style={styles.recordIcon}><Stethoscope size={18} color="var(--teal)" /></div>
                      <div style={{ flex: 1 }}>
                        <p style={styles.recordDiagnosis}>{record.diagnosis}</p>
                        <p style={styles.recordDate}>
                          {record.createdAt ? format(new Date(record.createdAt), 'MMM dd, yyyy') : '—'}
                        </p>
                      </div>
                    </div>
                    {record.prescription && record.prescription !== 'No prescription provided' && (
                      <div style={styles.recordSection}>
                        <div style={styles.recordSectionLabel}>
                          <Pill size={13} color="#6366f1" />
                          <span>Prescription</span>
                        </div>
                        <p style={styles.recordSectionText}>{record.prescription}</p>
                      </div>
                    )}
                    {record.notes && record.notes !== 'No clinical notes added' && (
                      <div style={styles.recordSection}>
                        <div style={styles.recordSectionLabel}>
                          <FileText size={13} color="#f59e0b" />
                          <span>Notes</span>
                        </div>
                        <p style={styles.recordSectionText}>{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

const styles = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 20px', borderBottom: '1px solid var(--border)',
  },
  cardTitle: { fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 600 },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 10, padding: '48px 24px', color: 'var(--text-muted)', fontSize: '0.88rem',
  },
  apptRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px', cursor: 'pointer', transition: 'background 0.1s',
    borderBottom: '1px solid var(--border)',
  },
  apptDateBox: {
    width: 44, height: 44, borderRadius: 10,
    background: 'var(--teal-light)', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  apptDay: { fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--teal-dark)', lineHeight: 1 },
  apptMonth: { fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 600 },
  quickAction: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', border: '1px solid var(--border)',
    borderRadius: 10, background: '#fff', cursor: 'pointer', transition: 'all 0.15s',
  },
  qaIcon: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--teal-light)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  recordCount: { fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--surface)', padding: '4px 12px', borderRadius: 99 },
  recordsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, padding: 20 },
  recordCard: { border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: '#fff' },
  recordCardHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  recordIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: 'var(--teal-light)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  recordDiagnosis: { fontWeight: 600, fontSize: '0.95rem', margin: '0 0 2px', color: 'var(--text)' },
  recordDate: { fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 },
  recordSection: { borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 },
  recordSectionLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 },
  recordSectionText: { fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' },
};

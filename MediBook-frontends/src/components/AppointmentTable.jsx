import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, Button } from './UI';
import { Eye, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';

export default function AppointmentTable({ appointments, onCancel, onComplete, showProvider, loading }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
  const isProvider = user.role === 'Provider';

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading appointments...
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No appointments found.
      </div>
    );
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

  const formatDate = (dateStr) => {
    try { return format(new Date(dateStr), 'MMM dd, yyyy'); } catch { return dateStr; }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={styles.th}>Patient</th>
            {showProvider && <th style={styles.th}>Provider</th>}
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Time</th>
            <th style={styles.th}>Service</th>
            <th style={styles.th}>Mode</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appt) => {
            // Helper to handle both PascalCase and camelCase from backend
            const get = (key) => appt[key] || appt[key.charAt(0).toLowerCase() + key.slice(1)] || appt[key.charAt(0).toUpperCase() + key.slice(1)];
            
            const appointmentId = get('AppointmentId') || Math.random().toString();
            const patientId = get('PatientId') || 'Unknown';
            const providerId = get('ProviderId') || 'Unknown';
            const appointmentDate = get('AppointmentDate');
            const startTime = get('StartTime');
            const endTime = get('EndTime');
            const serviceType = get('ServiceType') || 'General';
            const mode = get('ModeOfConsultation') || 'Clinic';
            const status = get('Status') || 'Pending';

            return (
              <tr key={appointmentId} style={styles.row}>
                <td style={styles.td}>
                  <span style={styles.idChip}>{patientId?.toString().slice(0, 8)}…</span>
                </td>
                {showProvider && (
                  <td style={styles.td}>
                    <span style={styles.idChip}>{providerId?.toString().slice(0, 8)}…</span>
                  </td>
                )}
                <td style={styles.td}>{formatDate(appointmentDate)}</td>
                <td style={styles.td}>
                  {formatTime(startTime)} – {formatTime(endTime)}
                </td>
                <td style={styles.td}>
                  <span style={styles.serviceTag}>{serviceType}</span>
                </td>
                <td style={styles.td}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {mode}
                  </span>
                </td>
                <td style={styles.td}>
                  <StatusBadge status={status} />
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => navigate(`/appointments/${appointmentId}`)}
                    >
                      <Eye size={14} /> View
                    </Button>
                    {(status === 'Scheduled' || status === 'Pending') && (
                      <>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => navigate(`/appointments/${appointmentId}/reschedule`)}
                        >
                          <Calendar size={14} />
                        </Button>
                        <Button
                          size="sm" variant="danger"
                          onClick={() => onCancel && onCancel(appointmentId)}
                        >
                          <X size={14} />
                        </Button>
                      </>
                    )}
                    {status === 'Scheduled' && onComplete && isProvider && (
                      <Button
                        size="sm"
                        onClick={() => onComplete(appointmentId)}
                        style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}
                      >
                        ✓ Done
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem',
  },
  thead: { background: 'var(--surface)' },
  th: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
  },
  row: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.1s',
  },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  idChip: {
    fontFamily: 'monospace', fontSize: '0.78rem',
    background: 'var(--surface-2)', padding: '2px 7px',
    borderRadius: 6, color: 'var(--text-muted)',
  },
  serviceTag: {
    fontSize: '0.78rem', background: 'var(--teal-light)',
    color: 'var(--teal-dark)', padding: '2px 9px', borderRadius: 6,
    fontWeight: 500,
  },
};

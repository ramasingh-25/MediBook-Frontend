import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar } from 'lucide-react';
import { appointmentService, providerService, notificationService } from '../services/api';
import { Card, Button, PageHeader, EmptyState, Input } from '../components/UI';
import AppointmentTable from '../components/AppointmentTable';
import toast from 'react-hot-toast';



export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    let list = appointments;
    if (statusFilter !== 'All') list = list.filter(a => a.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        a.patientId?.toLowerCase().includes(s) ||
        a.providerId?.toLowerCase().includes(s) ||
        a.serviceType?.toLowerCase().includes(s) ||
        a.appointmentId?.toLowerCase().includes(s)
      );
    }
    setFiltered(list);
  }, [appointments, search, statusFilter]);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('medibook_user');
      const user = JSON.parse(userStr || '{}');
      const userId = user.userId;
      
      if (!userId) {
        navigate('/login');
        return;
      }

      // If provider, we fetch BOTH as patient (personal) and as provider (professional)
      let combinedData = [];
      try {
        // 1. Always fetch as patient first (everyone can have personal appointments)
        const patientRes = await appointmentService.getByPatient(userId);
        combinedData = [...(patientRes.data || [])];
        
        // 2. If provider, fetch as doctor
        if (user.role === 'Provider') {
          const providerRes = await providerService.getByUserId(userId);
          const actualProviderId = providerRes.data?.providerId;
          
          if (actualProviderId) {
            const profRes = await appointmentService.getByProvider(actualProviderId);
            const profData = profRes.data || [];
            
            // Merge and remove duplicates by appointmentId
            const patientApptIds = new Set(combinedData.map(a => a.appointmentId));
            profData.forEach(appt => {
              if (!patientApptIds.has(appt.appointmentId)) {
                combinedData.push(appt);
              }
            });
          }
        }
      } catch (err) {
        // Silent fail
      }
        
      setAppointments(combinedData);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await appointmentService.cancel(id);
      
      const userStr = localStorage.getItem('medibook_user');
      const user = JSON.parse(userStr || '{}');
      const appt = appointments.find(a => a.appointmentId === id);
      
      if (appt) {
        const isProvider = user.role === 'Provider';
        let recipientId = isProvider ? appt.patientId : appt.providerId;
        
        // If patient is cancelling, we need to find the provider's USER ID
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
            type: 'CANCELLATION',
            title: 'Appointment Cancelled',
            message: `The appointment on ${new Date(appt.appointmentDate).toLocaleDateString()} has been cancelled by the ${isProvider ? 'provider' : 'patient'}.`,
            channel: 'APP',
            relatedId: id,
            relatedType: 'Appointment'
          });
        } catch (err) {
          console.error('Notification failed', err);
        }
      }

      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch {
      toast.error('Failed to cancel appointment');
    }
  }

  async function handleComplete(id) {
    try {
      await appointmentService.complete(id);
      toast.success('Appointment marked as completed');
      fetchAppointments();
    } catch {
      toast.error('Failed to complete appointment');
    }
  }

  const statuses = ['All', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Appointments"
        subtitle="Manage all patient appointments"
        action={
          <Button variant="dark" onClick={() => navigate('/appointments/book')}>
            <Plus size={16} /> Book Appointment
          </Button>
        }
      />

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={styles.searchIcon} />
          <input
            placeholder="Search by patient, provider, service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.statusFilters}>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                ...styles.filterChip,
                ...(statusFilter === s ? styles.filterChipActive : {}),
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description="Try adjusting your filters or book a new appointment."
          />
        ) : (
          <AppointmentTable
            appointments={filtered}
            onCancel={handleCancel}
            onComplete={handleComplete}
            showProvider
          />
        )}
      </Card>

      {!loading && (
        <p style={styles.countText}>
          Showing {filtered.length} of {appointments.length} appointments
        </p>
      )}
    </div>
  );
}

const styles = {
  filtersRow: {
    display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 16, flexWrap: 'wrap',
  },
  searchIcon: {
    position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)', color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%', padding: '9px 12px 9px 36px',
    border: '1px solid var(--border)', borderRadius: 10,
    fontSize: '0.88rem', outline: 'none', background: '#fff',
  },
  statusFilters: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterChip: {
    padding: '6px 14px', borderRadius: 99,
    border: '1px solid var(--border)', background: '#fff',
    fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
    color: 'var(--text-muted)', transition: 'all 0.15s',
  },
  filterChipActive: {
    background: 'var(--ink)', color: '#fff',
    border: '1px solid var(--ink)',
  },
  countText: {
    fontSize: '0.8rem', color: 'var(--text-muted)',
    marginTop: 10, textAlign: 'right',
  },
};

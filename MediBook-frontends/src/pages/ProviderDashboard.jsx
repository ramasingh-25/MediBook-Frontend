import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, DollarSign, Star, TrendingUp, CheckCircle, XCircle, AlertCircle, Plus, Eye, Edit, Settings } from 'lucide-react';
import { appointmentService, providerService, availabilityService, paymentService, reviewService } from '../services/api';
import { Card, StatCard, Button, StatusBadge, Spinner, PageHeader } from '../components/UI';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Get the logged-in provider's ID from user data or use demo as fallback
const getProviderId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
    return user.userId || 'provider-001';
  } catch {
    return 'provider-001';
  }
};

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [provider, setProvider] = useState(null);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    upcomingAppointments: 0,
    totalRevenue: 0,
    averageRating: 0,
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    async function fetchProviderData() {
      try {
        setLoading(true);
        const userId = getProviderId();
        const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
        console.log('Fetching profile for user:', userId);

        let actualProviderId = null;

        try {
          const providerRes = await providerService.getByUserId(userId);
          if (providerRes.data) {
            const providerData = providerRes.data;
            // Merge auth user data with provider data
            setProvider({
              ...providerData,
              fullName: user.fullName || providerData.clinicName || 'Provider',
              email: user.email || '',
              experience: providerData.experienceYears || 0,
              isProfileComplete: true,
            });
            actualProviderId = providerData.providerId;
            console.log('Found provider profile. Real ProviderId:', actualProviderId);
          }
        } catch (providerError) {
          console.log('Provider not found, showing incomplete profile...');
          setProvider({
            providerId: null,
            fullName: user.fullName || 'Provider Name',
            email: user.email || 'provider@medibook.com',
            phone: user.phone || '+1-555-0000',
            specialization: 'Not specified',
            qualification: 'Not specified',
            experience: 0,
            experienceYears: 0,
            clinicName: 'Not specified',
            clinicAddress: 'Not specified',
            bio: 'Profile not completed yet. Please complete your provider registration.',
            isVerified: false,
            rating: 0,
            isProfileComplete: false
          });
        }

        // Fetch appointments using the real ProviderId
        if (actualProviderId) {
          try {
            const apptRes = await appointmentService.getByProvider(actualProviderId);
            const apptList = apptRes.data || [];
            setAppointments(apptList);
            
            const completed = apptList.filter(a => a.status === 'Completed').length;
            const upcoming = apptList.filter(a => a.status === 'Scheduled').length;
            const revenue = apptList.filter(a => a.status === 'Completed').reduce((s, a) => s + (a.consultationFee || 50), 0);
            
            setStats(prev => ({
              ...prev,
              totalAppointments: apptList.length,
              completedAppointments: completed,
              upcomingAppointments: upcoming,
            }));
          } catch (appointmentError) {
            console.log('Could not fetch appointments:', appointmentError.message);
            setAppointments([]);
          }
        }

        // Fetch available slots, payments, and ratings using actualProviderId
        try {
          if (actualProviderId) {
            setSlotsLoading(true);
            const today = new Date().toISOString().split('T')[0];
            
            // Execute all three parallel requests
            const [slotsRes, paymentsRes, ratingRes] = await Promise.all([
              availabilityService.getAvailableSlots(actualProviderId, today),
              paymentService.getPaymentsByProvider(actualProviderId),
              reviewService.getProviderRating(actualProviderId).catch(() => ({ data: { averageRating: 0 } }))
            ]);

            setAvailableSlots(slotsRes.data || []);
            
            // Calculate real revenue from successful payments
            const successfulPayments = (paymentsRes.data || []).filter(p => p.status === 'Completed' || p.status === 'Paid' || p.status === 'Success');
            const realRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            
            setStats(prev => ({
              ...prev,
              totalRevenue: realRevenue,
              averageRating: ratingRes.data?.averageRating || 0
            }));
          }
        } catch (err) {
          console.error('Error fetching dashboard sub-data:', err);
        } finally {
          setSlotsLoading(false);
        }
      } catch (error) {
        toast.error('Failed to load provider data');
        console.error('Provider dashboard error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProviderData();
  }, []);

  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'Scheduled')
    .slice(0, 5)
    .sort((a, b) => {
      const dateA = new Date(a.appointmentDate || a.AppointmentDate || 0);
      const dateB = new Date(b.appointmentDate || b.AppointmentDate || 0);
      return dateA - dateB;
    });

  const safeDate = (dateVal, formatStr = 'MMM dd, yyyy') => {
    try {
      if (!dateVal) return '—';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      return format(d, formatStr);
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Spinner size="lg" />
        <p style={styles.loadingText}>Loading provider dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={`Welcome, ${provider?.fullName || 'Provider'}`}
        subtitle="Manage your appointments and practice"
        actions={
          <div style={styles.headerActions}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/provider/register')}>
              <Settings size={16} style={{ marginRight: 6 }} />
              Profile Settings
            </Button>
            <Button variant="dark" size="sm" onClick={() => navigate('/provider/availability')}>
              <Calendar size={16} style={{ marginRight: 6 }} />
              Manage Availability
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          label="Total Appointments"
          value={stats.totalAppointments}
          icon={Calendar}
          color="#00b5a3"
        />
        <StatCard
          label="Completed"
          value={stats.completedAppointments}
          icon={CheckCircle}
          color="#10b981"
        />
        <StatCard
          label="Upcoming"
          value={stats.upcomingAppointments}
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          label="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          color="#6366f1"
        />
        <StatCard
          label="Average Rating"
          value={stats.averageRating.toFixed(1)}
          icon={Star}
          color="#8b5cf6"
        />
      </div>

      <div style={styles.contentGrid}>
        {/* Upcoming Appointments */}
        <Card style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Upcoming Appointments</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>
              View All
            </Button>
          </div>
          <div style={styles.appointmentsList}>
            {upcomingAppointments.length === 0 ? (
              <div style={styles.emptyState}>
                <Calendar size={48} color="#e2e8f0" />
                <p style={styles.emptyText}>No upcoming appointments</p>
              </div>
            ) : (
              upcomingAppointments.map((appointment) => (
                <div key={appointment.appointmentId} style={styles.appointmentItem}>
                  <div style={styles.appointmentInfo}>
                    <div style={styles.appointmentHeader}>
                      <h4 style={styles.patientName}>{appointment.patientName || 'Patient'}</h4>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <div style={styles.appointmentDetails}>
                      <p style={styles.appointmentDate}>
                        {safeDate(appointment.appointmentDate || appointment.AppointmentDate)}
                      </p>
                      <p style={styles.appointmentTime}>{appointment.startTime || appointment.StartTime}</p>
                      <p style={styles.appointmentType}>{appointment.serviceType || appointment.ServiceType}</p>
                    </div>
                  </div>
                  <div style={styles.appointmentActions}>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/appointments/${appointment.appointmentId}`)}>
                      <Eye size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Provider Profile Summary */}
        <Card style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Profile Summary</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/provider/register')}>
              <Edit size={16} />
            </Button>
          </div>
          
          {/* Profile Completion Prompt */}
          {provider?.isProfileComplete === false && (
            <div style={styles.completionPrompt}>
              <AlertCircle size={20} color="#f59e0b" />
              <div style={styles.completionContent}>
                <h4 style={styles.completionTitle}>Complete Your Profile</h4>
                <p style={styles.completionText}>
                  Your provider profile is incomplete. Complete your registration to start accepting appointments.
                </p>
                <Button 
                  variant="dark" 
                  size="sm" 
                  onClick={() => navigate('/provider/register')}
                  style={styles.completeProfileBtn}
                >
                  Complete Profile
                </Button>
              </div>
            </div>
          )}
          
          <div style={styles.profileContent}>
            <div style={styles.profileInfo}>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>Specialization:</span>
                <span style={styles.profileValue}>{provider?.specialization || 'Not specified'}</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>Experience:</span>
                <span style={styles.profileValue}>{provider?.experienceYears || provider?.experience || '0'} years</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>Verification Status:</span>
                <StatusBadge status={provider?.isVerified ? 'Verified' : 'Pending'} />
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>Average Rating:</span>
                <div style={styles.ratingContainer}>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" />
                  <span style={styles.profileValue}>{stats.averageRating.toFixed(1)}</span>
                </div>
              </div>
            </div>
            <div style={styles.quickActions}>
              <Button variant="dark" size="sm" onClick={() => navigate('/provider/availability')}>
                <Plus size={16} style={{ marginRight: 6 }} />
                Add Availability
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/provider/dashboard/reviews')}>
                <Star size={16} style={{ marginRight: 6 }} />
                View Reviews
              </Button>
            </div>
          </div>
        </Card>

        {/* Available Slots Card */}
        <Card style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Today's Available Slots</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/provider/availability')}>
              Manage
            </Button>
          </div>
          <div style={styles.slotsList}>
            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}><Spinner size="sm" /></div>
            ) : availableSlots.length === 0 ? (
              <div style={styles.emptySlots}>
                <Clock size={32} color="#cbd5e1" />
                <p style={styles.emptySlotsText}>No slots available for today</p>
                <Button variant="primary" size="sm" style={{ marginTop: 10 }} onClick={() => navigate('/provider/availability')}>
                  Add Slots
                </Button>
              </div>
            ) : (
              <div style={styles.slotsGrid}>
                {availableSlots.map(slot => (
                  <div key={slot.slotId} style={styles.slotChip}>
                    {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 12 }}>Quick Actions</h4>
            <div style={styles.quickActions}>
              <Button variant="dark" size="sm" onClick={() => navigate('/provider/availability')}>
                <Plus size={16} style={{ marginRight: 6 }} />
                Add Availability
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/provider/dashboard/reviews')}>
                <Star size={16} style={{ marginRight: 6 }} />
                View Reviews
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  loadingText: {
    marginTop: '16px',
    color: '#64748b',
    fontSize: '1rem',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
  },
  card: {
    padding: '24px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0a1628',
    margin: 0,
  },
  appointmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  appointmentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  patientName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0a1628',
    margin: 0,
  },
  appointmentDetails: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  appointmentDate: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0,
  },
  appointmentTime: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0,
  },
  appointmentType: {
    fontSize: '0.9rem',
    color: '#00b5a3',
    margin: 0,
  },
  appointmentActions: {
    display: 'flex',
    gap: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  emptyText: {
    marginTop: '12px',
    fontSize: '0.9rem',
    margin: 0,
  },
  profileContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  profileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  profileValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#0a1628',
  },
  completionPrompt: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  completionContent: {
    flex: 1,
  },
  completionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#92400e',
    margin: '0 0 8px 0',
  },
  completionText: {
    fontSize: '0.9rem',
    color: '#78350f',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  },
  completeProfileBtn: {
    backgroundColor: '#f59e0b',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  ratingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  slotsList: {
    marginTop: '10px',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px',
  },
  slotChip: {
    padding: '6px 10px',
    backgroundColor: '#f0fdfa',
    border: '1px solid #99f6e4',
    borderRadius: '6px',
    color: '#0d9488',
    fontSize: '0.8rem',
    fontWeight: 500,
    textAlign: 'center',
  },
  emptySlots: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  emptySlotsText: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: '8px 0',
  },
};

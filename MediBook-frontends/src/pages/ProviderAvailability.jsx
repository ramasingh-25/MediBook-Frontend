import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { availabilityService, providerService } from '../services/api';
import { Card, Button, Input, PageHeader, Spinner, StatusBadge } from '../components/UI';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// Helper to get provider ID
const getProviderId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
    return user.userId || 'provider-001';
  } catch {
    return 'provider-001';
  }
};

export default function ProviderAvailability() {
  const providerId = getProviderId();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actualProviderId, setActualProviderId] = useState(null);
  const [providerError, setProviderError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSlot, setNewSlot] = useState({
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30
  });

  useEffect(() => {
    async function init() {
      try {
        const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
        console.log('Fetching provider profile for userId:', user.userId);
        const res = await providerService.getByUserId(user.userId);
        if (res.data && res.data.providerId) {
          console.log('Found providerId GUID:', res.data.providerId);
          setActualProviderId(res.data.providerId);
          setProviderError(null);
        } else {
          setProviderError('No provider profile found. Please contact admin.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch provider profile:', err);
        setProviderError('Could not load provider profile. Make sure your account has been set up by an administrator.');
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (actualProviderId) {
      fetchSlots();
    }
  }, [selectedDate, actualProviderId]);

  async function fetchSlots() {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await availabilityService.getSlotsByProvider(actualProviderId);
      if (res.data) {
        const filtered = res.data.filter(slot => 
          format(new Date(slot.date), 'yyyy-MM-dd') === dateStr
        );
        setSlots(filtered.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      toast.error('Failed to load availability slots');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSlot(e) {
    e.preventDefault();
    console.log('Adding slot for providerId:', actualProviderId, 'on date:', format(selectedDate, 'yyyy-MM-dd'));
    try {
      const data = {
        providerId: actualProviderId,
        date: selectedDate.toISOString(),
        startTime: newSlot.startTime + ':00', // Format as TimeSpan HH:mm:ss
        endTime: newSlot.endTime + ':00',
        durationMinutes: parseInt(newSlot.durationMinutes)
      };

      await availabilityService.createSlot(data);
      toast.success('Slot added successfully');
      setIsAdding(false);
      fetchSlots();
    } catch (err) {
      console.error('Error adding slot:', err);
      toast.error('Failed to add slot. Check for overlapping times.');
    }
  }

  async function handleDeleteSlot(slotId) {
    if (!window.confirm('Are you sure you want to delete this availability slot?')) return;
    try {
      await availabilityService.deleteSlot(slotId);
      toast.success('Slot deleted');
      fetchSlots();
    } catch (err) {
      console.error('Error deleting slot:', err);
      toast.error('Failed to delete slot');
    }
  }

  // Week View Calendar logic
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: addDays(currentWeekStart, 6)
  });

  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));

  return (
    <div style={styles.container}>
      <PageHeader 
        title="Manage Availability" 
        subtitle="Set your working hours and available time slots"
      />

      {providerError && (
        <Card style={{ padding: 20, marginBottom: 20, border: '1px solid #fbbf24', background: '#fffbeb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={24} color="#f59e0b" />
            <div>
              <p style={{ fontWeight: 600, color: '#92400e', margin: 0 }}>{providerError}</p>
              <p style={{ fontSize: '0.85rem', color: '#a16207', margin: '4px 0 0' }}>
                Your user ID: {getProviderId()}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div style={styles.contentGrid}>
        {/* Left Side: Calendar Control */}
        <Card style={styles.calendarCard}>
          <div style={styles.calendarHeader}>
            <h3 style={styles.monthTitle}>{format(currentWeekStart, 'MMMM yyyy')}</h3>
            <div style={styles.navBtns}>
              <button onClick={prevWeek} style={styles.navBtn}><ChevronLeft size={20} /></button>
              <button onClick={nextWeek} style={styles.navBtn}><ChevronRight size={20} /></button>
            </div>
          </div>
          
          <div style={styles.weekGrid}>
            {weekDays.map(day => (
              <div 
                key={day.toString()} 
                onClick={() => setSelectedDate(day)}
                style={{
                  ...styles.dayBox,
                  ...(isSameDay(day, selectedDate) ? styles.activeDay : {}),
                  ...(isToday(day) ? styles.todayBox : {})
                }}
              >
                <span style={styles.dayName}>{format(day, 'EEE')}</span>
                <span style={styles.dayNumber}>{format(day, 'd')}</span>
                {isToday(day) && <span style={styles.todayIndicator} />}
              </div>
            ))}
          </div>

          <div style={styles.calendarInfo}>
            <p style={styles.selectedInfo}>
              Showing availability for <strong>{format(selectedDate, 'EEEE, MMMM do')}</strong>
            </p>
          </div>
        </Card>

        {/* Right Side: Slots Management */}
        <div style={styles.slotsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Available Slots</h2>
            <Button 
              variant="dark" 
              size="sm" 
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus size={16} style={{ marginRight: 8 }} />
              Add Slot
            </Button>
          </div>

          {isAdding && (
            <Card style={styles.addSlotCard}>
              <form onSubmit={handleAddSlot} style={styles.addForm}>
                <div style={styles.formRow}>
                  <div style={{ flex: 1 }}>
                    <Input 
                      label="Start Time" 
                      type="time" 
                      value={newSlot.startTime}
                      onChange={e => setNewSlot({...newSlot, startTime: e.target.value})}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input 
                      label="End Time" 
                      type="time" 
                      value={newSlot.endTime}
                      onChange={e => setNewSlot({...newSlot, endTime: e.target.value})}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input 
                      label="Duration (min)" 
                      type="number" 
                      value={newSlot.durationMinutes}
                      onChange={e => setNewSlot({...newSlot, durationMinutes: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div style={styles.formActions}>
                  <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Save Slot</Button>
                </div>
              </form>
            </Card>
          )}

          <div style={styles.slotsList}>
            {loading ? (
              <div style={styles.loaderWrap}><Spinner size="lg" /></div>
            ) : slots.length === 0 ? (
              <div style={styles.emptyState}>
                <Clock size={48} color="#cbd5e1" />
                <h3>No slots for this day</h3>
                <p>You haven't added any availability for this date yet.</p>
                <Button variant="ghost" onClick={() => setIsAdding(true)}>Add your first slot</Button>
              </div>
            ) : (
              <div style={styles.slotsGrid}>
                {slots.map(slot => (
                  <div key={slot.slotId} style={styles.slotCard}>
                    <div style={styles.slotInfo}>
                      <Clock size={16} color="#64748b" />
                      <span style={styles.slotTime}>
                        {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                      </span>
                      <span style={styles.slotDuration}>{slot.durationMinutes} min</span>
                    </div>
                    <div style={styles.slotStatus}>
                      {slot.isBooked ? (
                        <StatusBadge status="Booked" />
                      ) : (
                        <div style={styles.slotActions}>
                          <StatusBadge status="Available" />
                          <button 
                            onClick={() => handleDeleteSlot(slot.slotId)}
                            style={styles.deleteBtn}
                            title="Delete Slot"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '24px',
    marginTop: '24px',
  },
  calendarCard: {
    padding: '20px',
    height: 'fit-content',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  monthTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  navBtns: {
    display: 'flex',
    gap: '8px',
  },
  navBtn: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '4px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
  },
  dayBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid transparent',
    position: 'relative',
  },
  dayName: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    color: '#94a3b8',
    fontWeight: 600,
    marginBottom: '4px',
  },
  dayNumber: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#334155',
  },
  activeDay: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  'activeDay span': {
    color: '#fff !important',
  },
  todayBox: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  todayIndicator: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#0d9488',
    position: 'absolute',
    bottom: '6px',
  },
  calendarInfo: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9',
  },
  selectedInfo: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0,
    textAlign: 'center',
  },
  slotsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  addSlotCard: {
    padding: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  slotsList: {
    minHeight: '300px',
  },
  loaderWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px dashed #e2e8f0',
    color: '#64748b',
    textAlign: 'center',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  slotCard: {
    backgroundColor: '#fff',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    }
  },
  slotInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  slotTime: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  slotDuration: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '100px',
  },
  slotStatus: {
    display: 'flex',
    alignItems: 'center',
  },
  slotActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      color: '#ef4444',
      backgroundColor: '#fef2f2',
    }
  }
};

import React, { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { appointmentService } from '../services/api';
import { Card, Button, Input, PageHeader, EmptyState, StatusBadge } from '../components/UI';
import AppointmentTable from '../components/AppointmentTable';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ProviderSchedule() {
  const [providerId, setProviderId] = useState('provider-001');
  const [date, setDate] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!providerId.trim()) { toast.error('Enter a provider ID'); return; }
    setLoading(true);
    try {
      const [apptRes, countRes] = await Promise.allSettled([
        date
          ? appointmentService.getByProviderAndDate(providerId, new Date(date).toISOString())
          : appointmentService.getByProvider(providerId),
        appointmentService.getProviderCount(providerId),
      ]);
      setAppointments(apptRes.status === 'fulfilled' ? apptRes.value.data || [] : []);
      setCount(countRes.status === 'fulfilled' ? countRes.value.data : null);
      setSearched(true);
    } catch {
      toast.error('Failed to fetch provider schedule');
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-up">
      <PageHeader title="Provider Schedule" subtitle="View appointments for a specific provider" />

      <Card style={{ padding: 24, marginBottom: 20 }}>
        <div style={styles.searchRow}>
          <div style={{ flex: 1 }}>
            <Input
              label="Provider ID"
              value={providerId}
              onChange={e => setProviderId(e.target.value)}
              placeholder="e.g. provider-001"
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Filter by Date (optional)"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <Button variant="dark" onClick={handleSearch} disabled={loading}>
              <Search size={16} /> {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          {date && (
            <div style={{ alignSelf: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setDate('')}>Clear Date</Button>
            </div>
          )}
        </div>
      </Card>

      {searched && (
        <>
          {/* Summary */}
          <div style={styles.summaryRow}>
            {count !== null && (
              <div style={styles.summaryCard}>
                <span style={styles.summaryNum}>{count}</span>
                <span style={styles.summaryLabel}>Total All Time</span>
              </div>
            )}
            {Object.entries(statusCounts).map(([status, n]) => (
              <div key={status} style={styles.summaryCard}>
                <span style={styles.summaryNum}>{n}</span>
                <StatusBadge status={status} />
              </div>
            ))}
          </div>

          <Card style={{ overflow: 'hidden' }}>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>
                Schedule for <code style={styles.code}>{providerId}</code>
                {date && ` · ${format(new Date(date), 'MMM dd, yyyy')}`}
              </h3>
              <span style={styles.resultCount}>{appointments.length} result{appointments.length !== 1 ? 's' : ''}</span>
            </div>
            {appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments found"
                description="This provider has no appointments for the selected criteria."
              />
            ) : (
              <AppointmentTable appointments={appointments} />
            )}
          </Card>
        </>
      )}

      {!searched && (
        <div style={styles.placeholder}>
          <div style={styles.placeholderIcon}><Search size={32} color="var(--border)" /></div>
          <p style={styles.placeholderText}>Enter a provider ID above to view their schedule</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  searchRow: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  summaryRow: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  summaryCard: {
    background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
    padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4,
  },
  summaryNum: { fontFamily: 'var(--font-display)', fontSize: '1.8rem', lineHeight: 1 },
  summaryLabel: { fontSize: '0.78rem', color: 'var(--text-muted)' },
  tableHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid var(--border)',
  },
  tableTitle: { fontSize: '0.92rem', fontWeight: 600 },
  code: { fontFamily: 'monospace', fontSize: '0.85rem', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 },
  resultCount: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  placeholder: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, padding: '80px 24px', color: 'var(--text-muted)',
  },
  placeholderIcon: {
    width: 72, height: 72, borderRadius: 16,
    background: 'var(--surface-2)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderText: { fontSize: '0.9rem' },
};

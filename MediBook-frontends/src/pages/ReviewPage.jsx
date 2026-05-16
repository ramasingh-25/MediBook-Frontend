import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, CheckCircle, Clock, XCircle, Award, TrendingUp } from 'lucide-react';
import { reviewService, appointmentService, providerService } from '../services/api';
import { Card, Button, PageHeader, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

// ── Star renderer ────────────────────────────────────────────────────
function Stars({ rating, interactive = false, onRate }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={interactive ? 28 : 16}
          fill={s <= rating ? '#fbbf24' : 'none'}
          color={s <= rating ? '#fbbf24' : '#d1d5db'}
          style={{ cursor: interactive ? 'pointer' : 'default', transition: 'color 0.15s' }}
          onClick={interactive ? () => onRate(s) : undefined}
        />
      ))}
    </div>
  );
}

// ── Review Card ──────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const date = review.reviewDate ? new Date(review.reviewDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  return (
    <div style={styles.reviewCard}>
      <div style={styles.reviewHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h4 style={styles.reviewTitle}>{review.title || 'Untitled Review'}</h4>
            {review.isVerified && (
              <span style={styles.verifiedBadge}><CheckCircle size={12} /> Verified</span>
            )}
          </div>
          <Stars rating={review.rating} />
        </div>
        <span style={styles.reviewDate}>{date}</span>
      </div>
      <p style={styles.reviewComment}>{review.comment}</p>
    </div>
  );
}

// ── Write Review Modal ───────────────────────────────────────────────
function WriteReviewModal({ appointment, onClose, onSuccess }) {
  const [form, setForm] = useState({ rating: 5, title: '', comment: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.comment.trim()) e.comment = 'Comment is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    try {
      setSaving(true);
      await reviewService.createReview({
        appointmentId: appointment.appointmentId,
        providerId: appointment.providerId,
        patientId: user.userId,
        rating: form.rating,
        title: form.title,
        comment: form.comment,
        reviewDate: new Date().toISOString(),
        isVerified: false,
      });
      toast.success('Review submitted!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <Card style={styles.modal}>
        <div style={styles.modalHeader}>
          <Star size={22} color="var(--teal)" />
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Write a Review</h3>
        </div>
        <p style={styles.apptInfo}>
          {appointment.serviceType || 'Consultation'} ·{' '}
          {appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : ''}
        </p>

        {/* Star rating */}
        <div style={{ marginBottom: 20 }}>
          <label style={styles.fieldLabel}>Your Rating</label>
          <Stars rating={form.rating} interactive onRate={(r) => setForm({ ...form, rating: r })} />
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={styles.fieldLabel}>Title</label>
          <input
            style={{ ...styles.input, borderColor: errors.title ? '#ef4444' : 'var(--border)' }}
            placeholder="Summarize your experience"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          {errors.title && <p style={styles.errorText}>{errors.title}</p>}
        </div>

        {/* Comment */}
        <div style={{ marginBottom: 24 }}>
          <label style={styles.fieldLabel}>Comment</label>
          <textarea
            style={{ ...styles.input, ...styles.textarea, borderColor: errors.comment ? '#ef4444' : 'var(--border)' }}
            rows={4}
            placeholder="Share your detailed experience..."
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
          {errors.comment && <p style={styles.errorText}>{errors.comment}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={submit} loading={saving}>Submit Review</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function ReviewPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
  const isProvider = user.role === 'Provider';

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [reviewedAppointmentIds, setReviewedAppointmentIds] = useState(new Set());
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    if (!user.userId) { navigate('/login'); return; }
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      if (isProvider) {
        // Provider: fetch reviews of themselves from their providerId
        let actualProviderId = user.providerId;
        if (!actualProviderId) {
          try {
            const pRes = await providerService.getByUserId(user.userId);
            actualProviderId = pRes.data?.providerId;
          } catch (e) {
            console.error('Failed to fetch provider details:', e);
          }
        }
        
        const provId = actualProviderId || user.userId;
        const res = await reviewService.getReviewsByProvider(provId);
        setReviews(res.data || []);
      } else {
        // Patient: fetch their submitted reviews + completed appointments
        const [reviewRes, apptRes] = await Promise.allSettled([
          reviewService.getReviewsByPatient(user.userId),
          appointmentService.getByPatient(user.userId),
        ]);
        const myReviews = reviewRes.status === 'fulfilled' ? (reviewRes.value.data || []) : [];
        const allAppts = apptRes.status === 'fulfilled' ? (apptRes.value.data || []) : [];

        setReviews(myReviews);

        // Filter completed appointments without reviews
        const reviewedIds = new Set(myReviews.map((r) => r.appointmentId));
        setReviewedAppointmentIds(reviewedIds);
        const completed = allAppts.filter((a) => {
          const status = a.status || a.Status || '';
          return status === 'Completed';
        });
        setCompletedAppointments(completed);
      }
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }

  // Compute avg rating for provider view
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  // Appointments eligible for review (completed but not yet reviewed)
  const reviewableAppts = completedAppointments.filter(
    (a) => !reviewedAppointmentIds.has(a.appointmentId)
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={isProvider ? 'Patient Reviews' : 'My Reviews'}
        subtitle={isProvider ? 'See what patients are saying about you' : 'Manage your feedback for completed appointments'}
      />

      {/* ── PROVIDER VIEW ── */}
      {isProvider && (
        <>
          {/* Summary stats */}
          <div style={styles.statsRow}>
            <Card style={styles.statBox}>
              <Award size={22} color="var(--teal)" style={{ marginBottom: 8 }} />
              <p style={styles.statValue}>{avgRating}</p>
              <p style={styles.statLabel}>Average Rating</p>
              {reviews.length > 0 && <Stars rating={Math.round(parseFloat(avgRating))} />}
            </Card>
            <Card style={styles.statBox}>
              <MessageSquare size={22} color="#6366f1" style={{ marginBottom: 8 }} />
              <p style={styles.statValue}>{reviews.length}</p>
              <p style={styles.statLabel}>Total Reviews</p>
            </Card>
            <Card style={styles.statBox}>
              <CheckCircle size={22} color="#10b981" style={{ marginBottom: 8 }} />
              <p style={styles.statValue}>{reviews.filter((r) => r.isVerified).length}</p>
              <p style={styles.statLabel}>Verified Reviews</p>
            </Card>
            <Card style={styles.statBox}>
              <TrendingUp size={22} color="#f59e0b" style={{ marginBottom: 8 }} />
              <p style={styles.statValue}>{reviews.filter((r) => r.rating >= 4).length}</p>
              <p style={styles.statLabel}>Positive Reviews</p>
            </Card>
          </div>

          {/* Reviews list */}
          <Card style={{ padding: 24 }}>
            <h3 style={styles.sectionTitle}>All Reviews</h3>
            {reviews.length === 0 ? (
              <EmptyState icon={Star} title="No Reviews Yet" description="You haven't received any patient reviews yet." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {reviews.map((r) => <ReviewCard key={r.reviewId} review={r} />)}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── PATIENT VIEW ── */}
      {!isProvider && (
        <div style={styles.patientGrid}>
          {/* Left: Eligible appointments to review */}
          <div>
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={styles.sectionTitle}>Appointments Awaiting Review</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Rate your completed appointments to help other patients.
              </p>
              {reviewableAppts.length === 0 ? (
                <div style={styles.emptySmall}>
                  <CheckCircle size={28} color="var(--teal)" />
                  <p>All your completed appointments have been reviewed!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reviewableAppts.map((appt) => (
                    <div key={appt.appointmentId} style={styles.apptReviewRow}>
                      <div style={styles.apptBadge}>
                        <span style={styles.apptDay}>
                          {appt.appointmentDate ? new Date(appt.appointmentDate).getDate() : '?'}
                        </span>
                        <span style={styles.apptMonth}>
                          {appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleString('en', { month: 'short' }) : ''}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                          {appt.serviceType || appt.ServiceType || 'Consultation'}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                          Completed · Tap to review
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setSelectedAppointment(appt)}>
                        <Star size={14} /> Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right: Past reviews */}
          <div>
            <Card style={{ padding: 24 }}>
              <h3 style={styles.sectionTitle}>Your Submitted Reviews</h3>
              {reviews.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No Reviews Yet" description="Your submitted reviews will appear here." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {reviews.map((r) => <ReviewCard key={r.reviewId} review={r} />)}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {selectedAppointment && (
        <WriteReviewModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onSuccess={() => { setSelectedAppointment(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

const styles = {
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statBox: { padding: 24, textAlign: 'center' },
  statValue: { fontFamily: 'var(--font-display)', fontSize: '2rem', margin: '4px 0', color: 'var(--text)' },
  statLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, margin: '0 0 16px' },
  patientGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  reviewCard: {
    border: '1px solid var(--border)', borderRadius: 12, padding: 20,
    background: '#fff',
  },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  reviewTitle: { margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600 },
  reviewDate: { fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' },
  reviewComment: { fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '12px 0 0' },
  verifiedBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: '0.7rem', fontWeight: 600, color: '#15803d',
    background: '#dcfce7', padding: '2px 8px', borderRadius: 99,
  },
  apptReviewRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', border: '1px solid var(--border)',
    borderRadius: 10, background: '#fff',
  },
  apptBadge: {
    width: 44, height: 44, borderRadius: 10,
    background: 'var(--teal-light)', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  apptDay: { fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--teal-dark)', lineHeight: 1 },
  apptMonth: { fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 600 },
  emptySmall: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.88rem' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: { padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  apptInfo: { fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px' },
  fieldLabel: { display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid var(--border)', fontFamily: 'var(--font-body)',
    fontSize: '0.92rem', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
  },
  textarea: { resize: 'vertical', minHeight: 100 },
  errorText: { fontSize: '0.78rem', color: '#ef4444', margin: '4px 0 0' },
};

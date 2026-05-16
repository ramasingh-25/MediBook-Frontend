import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Trash2, ArrowLeft } from 'lucide-react';
import { notificationService } from '../services/api';
import { Card, Button, PageHeader, EmptyState } from '../components/UI';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('medibook_user');
      const user = JSON.parse(userStr || '{}');
      if (!user.userId) {
        navigate('/login');
        return;
      }
      const response = await notificationService.getNotificationsByUser(user.userId);
      // Sort by newest first using sentAt field from backend
      const sorted = (response.data || []).sort((a, b) => {
        const dateA = new Date(a.sentAt || a.SentAt || 0);
        const dateB = new Date(b.sentAt || b.SentAt || 0);
        return dateB - dateA;
      });
      setNotifications(sorted);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id) {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const userStr = localStorage.getItem('medibook_user');
      const user = JSON.parse(userStr || '{}');
      await notificationService.markAllAsRead(user.userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.notificationId !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Notifications"
        subtitle="View and manage your alerts"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Back
            </Button>
          </div>
        }
      />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All caught up!"
            description="You don't have any notifications at the moment."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map(notif => (
              <div 
                key={notif.notificationId} 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border)',
                  background: notif.isRead ? '#fff' : 'var(--teal-light)'
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: notif.isRead ? 'var(--surface)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: notif.isRead ? 'var(--text-muted)' : 'var(--teal)'
                }}>
                  <Bell size={20} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: notif.isRead ? 500 : 600, color: 'var(--text)' }}>
                      {notif.title}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(() => {
                        const date = new Date(notif.sentAt || notif.SentAt);
                        return isNaN(date.getTime()) ? 'Recently' : formatDistanceToNow(date, { addSuffix: true });
                      })()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                    {notif.message}
                  </p>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    {!notif.isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(notif.notificationId)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        <CheckCircle size={14} /> Mark as read
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(notif.notificationId)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

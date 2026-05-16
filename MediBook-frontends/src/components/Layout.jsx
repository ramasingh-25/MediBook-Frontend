import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, PlusCircle, Stethoscope, CreditCard, Star,
  Menu, X, Activity, ChevronRight, LogOut, Bell
} from 'lucide-react';
import { notificationService } from '../services/api';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
  const role = user.role;

  useEffect(() => {
    if (!user.userId) return;
    
    const fetchUnread = () => {
      notificationService.getUnreadCount(user.userId)
        .then(res => setUnreadCount(res.data || 0))
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user.userId]);

  const handleLogout = () => {
    localStorage.removeItem('medibook_user');
    window.location.href = '/login';
  };

  const navItems = [
    { 
      to: role === 'Provider' ? '/provider/dashboard' : '/dashboard', 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      exact: true 
    },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
  ];

  if (role === 'Provider') {
    navItems.push({ to: '/provider/availability', icon: Stethoscope, label: 'Manage Availability' });
  } else {
    navItems.push({ to: '/appointments/book', icon: PlusCircle, label: 'Book Appointment' });
    navItems.push({ to: '/dashboard/payments', icon: CreditCard, label: 'Payments' });
  }
  
  navItems.push({ to: role === 'Provider' ? '/provider/dashboard/reviews' : '/dashboard/reviews', icon: Star, label: 'Reviews' });

  return (
    <div style={styles.root}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, ...(sidebarOpen ? styles.sidebarOpen : {}) }}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Activity size={20} color="#fff" />
          </div>
          <span style={styles.logoText}>Medi<span style={{ color: '#00b5a3' }}>Book</span></span>
          <button style={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div style={styles.navSection}>
          <p style={styles.navLabel}>Main Menu</p>
          <nav style={styles.nav}>
            {navItems.map(({ to, icon: Icon, label, exact }) => {
              const isActive = exact 
                ? location.pathname === to 
                : location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
          <div style={styles.versionBadge}>v1.0 · Appointment Service</div>
        </div>
      </aside>

      {/* Main content */}
      <div style={styles.main}>
        {/* Topbar */}
        <header style={styles.topbar}>
          <button style={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div style={styles.topbarRight}>
            <button 
              onClick={() => navigate(role === 'Provider' ? '/provider/dashboard/notifications' : '/dashboard/notifications')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', marginRight: 16, color: 'var(--text-muted)' }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'var(--red)', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 'bold',
                  width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
            <div style={styles.statusDot} />
            <span style={styles.statusText}>API Connected</span>
          </div>
        </header>

        {/* Page content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex', height: '100vh', overflow: 'hidden',
    background: 'var(--surface)',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.5)',
    zIndex: 40, display: 'none',
    '@media(max-width:768px)': { display: 'block' },
  },
  sidebar: {
    width: 260, background: 'var(--ink)', display: 'flex',
    flexDirection: 'column', flexShrink: 0,
    transition: 'transform 0.3s ease',
    zIndex: 50,
  },
  sidebarOpen: {},
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'var(--teal)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: 'var(--font-display)', fontSize: '1.3rem',
    color: '#fff', flex: 1,
  },
  closeBtn: {
    background: 'none', color: 'rgba(255,255,255,0.4)',
    display: 'none', padding: 4, borderRadius: 6,
  },
  navSection: { flex: 1, padding: '20px 12px 0' },
  navLabel: {
    fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
    padding: '0 8px', marginBottom: 8,
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem',
    fontWeight: 400, transition: 'all 0.15s ease',
    textDecoration: 'none',
  },
  navItemActive: {
    background: 'rgba(0,181,163,0.18)', color: '#00b5a3',
    fontWeight: 500,
  },
  sidebarFooter: {
    padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  versionBadge: {
    fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)',
    marginTop: 12,
  },
  logoutBtn: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    background: 'rgba(255,59,48,0.1)', color: '#ff3b30',
    border: 'none', cursor: 'pointer', fontSize: '0.9rem',
    fontWeight: 500, transition: 'all 0.15s ease',
  },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  topbar: {
    height: 60, background: 'var(--white)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    padding: '0 24px', justifyContent: 'space-between',
    flexShrink: 0,
  },
  menuBtn: {
    background: 'none', color: 'var(--text-muted)',
    padding: 6, borderRadius: 8,
    display: 'none',
  },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--teal)',
    boxShadow: '0 0 0 2px rgba(0,181,163,0.25)',
  },
  statusText: { fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 },
  content: {
    flex: 1, overflow: 'auto', padding: '28px 32px',
  },
};

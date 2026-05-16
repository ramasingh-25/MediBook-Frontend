import React from 'react';

// ── Badge ──────────────────────────────────────────────────────────
const statusColors = {
  Scheduled: { bg: '#e0f2fe', color: '#0369a1' },
  Completed: { bg: '#dcfce7', color: '#15803d' },
  Paid: { bg: '#dcfce7', color: '#15803d' },
  paid: { bg: '#dcfce7', color: '#15803d' },
  Pending: { bg: '#fef3c7', color: '#d97706' },
  pending: { bg: '#fef3c7', color: '#d97706' },
  Cancelled: { bg: '#fee2e2', color: '#b91c1c' },
  Failed: { bg: '#fee2e2', color: '#b91c1c' },
  Refunded: { bg: '#ede9fe', color: '#6d28d9' },
  'No-Show': { bg: '#fef9c3', color: '#92400e' },
};

export function StatusBadge({ status }) {
  const colors = statusColors[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      fontSize: '0.78rem', fontWeight: 600,
      background: colors.bg, color: colors.color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: colors.color,
      }} />
      {status}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, style, className }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: '0 2px 8px rgba(10,22,40,0.04)',
      ...style,
    }} className={className}>
      {children}
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy }) {
  const [isFocused, setIsFocused] = React.useState(false);
  
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    fontWeight: 500, borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease', border: 'none',
    fontFamily: 'var(--font-body)',
    opacity: disabled ? 0.55 : 1,
    outline: 'none',
    boxShadow: isFocused ? '0 0 0 3px rgba(0, 181, 163, 0.3)' : 'none',
    ...(size === 'sm' ? { padding: '6px 14px', fontSize: '0.82rem' } :
        size === 'lg' ? { padding: '13px 28px', fontSize: '1rem' } :
        { padding: '9px 20px', fontSize: '0.9rem' }),
    ...(variant === 'primary' ? { background: 'var(--teal)', color: '#fff' } :
        variant === 'danger' ? { background: '#fee2e2', color: '#b91c1c' } :
        variant === 'ghost' ? { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' } :
        variant === 'dark' ? { background: 'var(--ink)', color: '#fff' } :
        { background: 'var(--surface-2)', color: 'var(--text)' }),
    ...style,
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };

  const buttonText = typeof children === 'string' ? children : null;
  const label = ariaLabel || buttonText;

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      style={base}
      aria-label={label}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────
export function Input({ label, error, id, ...props }) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label 
          htmlFor={inputId} 
          style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={errorId}
        style={{
          padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          background: '#fff', fontSize: '0.92rem', color: 'var(--text)',
          outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
          width: '100%',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--teal)';
          e.target.style.boxShadow = '0 0 0 3px rgba(0, 181, 163, 0.1)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : 'var(--border)';
          e.target.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
      {error && (
        <span 
          id={errorId} 
          role="alert" 
          style={{ fontSize: '0.78rem', color: '#ef4444' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────
export function Select({ label, children, error, id, ...props }) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label 
          htmlFor={selectId} 
          style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={errorId}
        style={{
          padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          background: '#fff', fontSize: '0.92rem', color: 'var(--text)',
          outline: 'none', width: '100%', cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--teal)';
          e.target.style.boxShadow = '0 0 0 3px rgba(0, 181, 163, 0.1)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : 'var(--border)';
          e.target.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      >
        {children}
      </select>
      {error && (
        <span 
          id={errorId} 
          role="alert" 
          style={{ fontSize: '0.78rem', color: '#ef4444' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--teal)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ── Empty State ────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'var(--teal-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={28} color="var(--teal)" />
      </div>
      <h3 style={{ fontSize: '1.05rem', color: 'var(--text)' }}>{title}</h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 320 }}>{description}</p>
    </div>
  );
}

// ── Page Header ────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 28,
    }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 4 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>{subtitle}</p>}
      </div>
      {actions || action}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'var(--teal)', trend }) {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          <p style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</p>
          {trend && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{trend}</p>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </Card>
  );
}

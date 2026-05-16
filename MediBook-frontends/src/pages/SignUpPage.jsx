import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Mail, Lock, User, Phone, Eye, EyeOff, Shield } from 'lucide-react';
import { authService } from '../services/api';
import { Card, Button, Input, PageHeader } from '../components/UI';
import toast from 'react-hot-toast';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'Patient',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authService.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role,
      });
      toast.success('Account created successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Logo */}
        <div style={styles.logo}>
          <Stethoscope size={40} color="#00b5a3" />
          <h1 style={styles.brandName}>MediBook</h1>
        </div>

        {/* Sign Up Card */}
        <Card style={styles.card}>
          <PageHeader
            title="Create Account"
            subtitle="Join MediBook today"
            style={{ padding: 0, marginBottom: 32 }}
          />

          <form onSubmit={handleSubmit} style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={e => set('fullName', e.target.value)}
              error={errors.fullName}
              icon={<User size={18} />}
            />

            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              error={errors.email}
              icon={<Mail size={18} />}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              error={errors.phone}
              icon={<Phone size={18} />}
            />

            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <Input
                value="Patient"
                disabled
                icon={<Shield size={18} />}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Only patients can sign up. Providers must be registered by an administrator.
              </p>
            </div>

            <div style={styles.passwordWrapper}>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                error={errors.password}
                icon={<Lock size={18} />}
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              icon={<Lock size={18} />}
            />

            <Button
              type="submit"
              variant="dark"
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>

          {/* Login Link */}
          <div style={styles.switch}>
            <p style={styles.switchText}>
              Already have an account?{' '}
              <button
                type="button"
                style={styles.switchLink}
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </p>
          </div>
        </Card>

        {/* Back Button */}
        <button
          type="button"
          style={styles.backBtn}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8f5f2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  content: {
    width: '100%',
    maxWidth: 420,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  brandName: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0a1628',
    margin: 0,
    fontFamily: 'DM Sans, sans-serif',
  },
  card: {
    padding: 40,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 38,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: 4,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: '0.9rem',
    background: '#fff',
    color: 'var(--ink)',
    cursor: 'pointer',
  },
  submitBtn: {
    marginTop: 8,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
  },
  dividerText: {
    padding: '0 16px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
  },
  switch: {
    textAlign: 'center',
  },
  switchText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
  },
  switchLink: {
    background: 'none',
    border: 'none',
    color: '#00b5a3',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '24px auto 0',
    padding: '8px 16px',
    borderRadius: 8,
    transition: 'all 0.3s ease',
  },
};

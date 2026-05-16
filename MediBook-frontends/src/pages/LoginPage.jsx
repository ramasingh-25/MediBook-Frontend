import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authService } from '../services/api';
import { Card, Button, Input, PageHeader } from '../components/UI';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const trimmedForm = {
        email: form.email.trim(),
        password: form.password.trim()
      };
      console.log('Attempting login with:', trimmedForm);
      const res = await authService.login(trimmedForm);
      console.log('Login response:', res); // Debug log
      console.log('Login response data:', res.data); // Debug log
      
      if (res.data && res.data.token) {
        localStorage.setItem('medibook_token', res.data.token);
        
        // Store user info from response
        const userInfo = {
          userId: res.data.userId,
          fullName: res.data.fullName,
          email: res.data.email,
          role: res.data.role
        };
        localStorage.setItem('medibook_user', JSON.stringify(userInfo));
        toast.success('Login successful!');
        
        // Redirect based on user role
        const userRole = res.data.role;
        console.log('User role:', userRole); // Debug log
        switch (userRole) {
          case 'Provider':
            navigate('/provider/dashboard');
            break;
          case 'Admin':
            navigate('/admin/dashboard');
            break;
          case 'Patient':
          default:
            navigate('/dashboard');
            break;
        }
      } else {
        console.error('Invalid login response:', res);
        toast.error('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err); // Debug log
      console.error('Login error response:', err?.response?.data); // Debug log
      toast.error(err?.response?.data?.message || err?.message || 'Login failed');
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

        {/* Login Card */}
        <Card style={styles.card}>
          <PageHeader
            title="Welcome Back"
            subtitle="Sign in to your account"
            style={{ padding: 0, marginBottom: 32 }}
          />

          <form onSubmit={handleSubmit} style={styles.form}>
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              error={errors.email}
              icon={<Mail size={18} />}
            />

            <div style={styles.passwordWrapper}>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
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

            <Button
              type="submit"
              variant="dark"
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            

          </form>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>

          {/* Sign Up Link */}
          <div style={styles.switch}>
            <p style={styles.switchText}>
              Don't have an account?{' '}
              <button
                type="button"
                style={styles.switchLink}
                onClick={() => navigate('/signup')}
              >
                Sign up
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
    maxWidth: 400,
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
    gap: 20,
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

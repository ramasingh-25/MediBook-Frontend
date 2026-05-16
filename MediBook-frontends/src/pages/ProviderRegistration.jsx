import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowLeft, User, Mail, Phone, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import { providerService, authService } from '../services/api';
import { Card, Button, Input, PageHeader } from '../components/UI';
import toast from 'react-hot-toast';

export default function ProviderRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Auth guard — redirect to login if not authenticated
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('medibook_user') || '{}'); } catch { return {}; }
  })();
  const isLoggedIn = !!(localStorage.getItem('medibook_token') && storedUser.userId);

  const [form, setForm] = useState({
    fullName: storedUser.fullName || '',
    email: storedUser.email || '',
    phone: '',
    specialization: '',
    qualification: '',
    experience: '',
    clinicName: '',
    clinicAddress: '',
    bio: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isLoggedIn) {
      toast.error('Please login first to complete your provider registration.');
      navigate('/login', { state: { from: '/provider/register' } });
      return;
    }

    // Try to fetch existing profile to pre-fill form for updates
    const fetchProfile = async () => {
      try {
        const res = await providerService.getByUserId(storedUser.userId);
        if (res.data) {
          setForm(f => ({
            ...f,
            specialization: res.data.specialization || '',
            qualification: res.data.qualification || '',
            experience: res.data.experienceYears || '',
            clinicName: res.data.clinicName || '',
            clinicAddress: res.data.clinicAddress || '',
            bio: res.data.bio || '',
          }));
        }
      } catch (err) {
        // Profile doesn't exist yet — that's fine, user will create one
        console.log('No existing provider profile found, showing blank form.');
      }
    };
    fetchProfile();
  }, [isLoggedIn, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.specialization.trim()) e.specialization = 'Specialization is required';
    if (!form.qualification.trim()) e.qualification = 'Qualification is required';
    if (!form.experience || form.experience < 0) e.experience = 'Valid experience is required';
    if (!form.clinicName.trim()) e.clinicName = 'Clinic name is required';
    if (!form.clinicAddress.trim()) e.clinicAddress = 'Clinic address is required';
    if (!form.bio.trim()) e.bio = 'Bio is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const userId = storedUser.userId;
      const updatePayload = {
        fullName: form.fullName,
        specialization: form.specialization,
        qualification: form.qualification,
        experienceYears: parseInt(form.experience),
        bio: form.bio,
        clinicName: form.clinicName,
        clinicAddress: form.clinicAddress,
      };

      console.log('Submitting provider registration for userId:', userId, updatePayload);

      // Step 1: Check if a profile already exists for this user
      let existingProviderId = null;
      try {
        const existingRes = await providerService.getByUserId(userId);
        existingProviderId = existingRes.data?.providerId;
        console.log('Existing provider found with ID:', existingProviderId);
      } catch (getErr) {
        // 404 = no profile yet, that's fine
        if (getErr?.response?.status !== 404) {
          console.warn('Unexpected error checking existing profile:', getErr);
        }
      }

      if (existingProviderId) {
        // Step 2a: Update existing profile
        console.log('Updating existing provider:', existingProviderId);
        await providerService.updateProvider(existingProviderId, updatePayload);
        toast.success('Provider profile updated successfully!');
      } else {
        // Step 2b: Create new profile
        console.log('Creating new provider profile...');
        await providerService.registerProvider({ userId, ...updatePayload });
        toast.success('Provider profile created successfully!');
      }

      // Step 3: Update User profile if name or email changed
      if (form.fullName !== storedUser.fullName || form.email !== storedUser.email) {
        // Update localStorage immediately so changes reflect in UI regardless of API success
        const updatedUser = { ...storedUser, fullName: form.fullName, email: form.email };
        localStorage.setItem('medibook_user', JSON.stringify(updatedUser));
        console.log('localStorage updated with new profile data.');

        try {
          console.log('Updating auth profile on backend...');
          await authService.updateProfile({ 
            fullName: form.fullName, 
            email: form.email 
          });
          console.log('Auth profile updated on backend.');
        } catch (authErr) {
          console.warn('Failed to update auth profile on backend (non-critical):', authErr);
        }
      }

      navigate('/provider/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.';
      toast.error(msg);
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

        {/* Registration Card */}
        <Card style={styles.card}>
          <PageHeader
            title="Provider Registration"
            subtitle="Complete your provider profile"
            style={{ padding: 0, marginBottom: 32 }}
          />

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Personal Information</h3>
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
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Professional Information</h3>
              <Input
                label="Specialization"
                placeholder="e.g., Cardiology, General Practice"
                value={form.specialization}
                onChange={e => set('specialization', e.target.value)}
                error={errors.specialization}
                icon={<Briefcase size={18} />}
              />
              <Input
                label="Qualification"
                placeholder="e.g., MD, MBBS, DO"
                value={form.qualification}
                onChange={e => set('qualification', e.target.value)}
                error={errors.qualification}
                icon={<GraduationCap size={18} />}
              />
              <Input
                label="Years of Experience"
                type="number"
                placeholder="Enter years of experience"
                value={form.experience}
                onChange={e => set('experience', e.target.value)}
                error={errors.experience}
                icon={<Briefcase size={18} />}
              />
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Clinic Information</h3>
              <Input
                label="Clinic/Hospital Name"
                placeholder="Enter clinic or hospital name"
                value={form.clinicName}
                onChange={e => set('clinicName', e.target.value)}
                error={errors.clinicName}
                icon={<Briefcase size={18} />}
              />
              <Input
                label="Clinic Address"
                placeholder="Enter clinic address"
                value={form.clinicAddress}
                onChange={e => set('clinicAddress', e.target.value)}
                error={errors.clinicAddress}
                icon={<MapPin size={18} />}
              />
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Professional Bio</h3>
              <div style={styles.field}>
                <label style={styles.label}>Bio *</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Tell us about your experience and approach to patient care..."
                  value={form.bio}
                  onChange={e => set('bio', e.target.value)}
                  rows={4}
                />
                {errors.bio && <span style={styles.error}>{errors.bio}</span>}
              </div>
            </div>

            <Button
              type="submit"
              variant="dark"
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? 'Creating Profile...' : 'Create Provider Profile'}
            </Button>
          </form>
        </Card>

        {/* Back Button */}
        <button
          type="button"
          style={styles.backBtn}
          onClick={() => navigate('/login')}
        >
          <ArrowLeft size={16} /> Back to Login
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
    maxWidth: 600,
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
    gap: 24,
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#0a1628',
    margin: 0,
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: 8,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#0a1628',
    marginBottom: 6,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: '0.9rem',
    color: '#0a1628',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    fontFamily: 'DM Sans, sans-serif',
    resize: 'vertical',
  },
  error: {
    fontSize: '0.78rem',
    color: '#ef4444',
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 8,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowRight, Calendar, Users, Clock, Shield } from 'lucide-react';
import { Button, Card } from '../components/UI';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: 'Easy Booking',
      description: 'Book appointments with healthcare providers in just a few clicks'
    },

    {
      icon: Clock,
      title: 'Manage Schedule',
      description: 'View and manage all your appointments in one place'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health information is protected with advanced security'
    }
  ];

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.logo}>
            <Stethoscope size={48} color="#00b5a3" />
            <h1 style={styles.brandName}>MediBook</h1>
          </div>
          
          <h2 style={styles.heroTitle}>
            Your Health, Your Schedule
          </h2>
          <p style={styles.heroSubtitle}>
            Book medical appointments online with ease. Connect with healthcare providers and manage your health journey.
          </p>
          
          <div style={styles.ctaButtons}>
            <Button 
              variant="dark" 
              size="lg" 
              onClick={() => navigate('/login')}
              style={styles.primaryBtn}
            >
              Login
              <ArrowRight size={20} style={{ marginLeft: 8 }} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={() => navigate('/signup')}
              style={styles.secondaryBtn}
            >
              Sign Up
              <ArrowRight size={20} style={{ marginLeft: 8 }} />
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div style={styles.features}>
        <div style={styles.featuresContent}>
          <h3 style={styles.featuresTitle}>Why Choose MediBook?</h3>
          <div style={styles.featuresGrid}>
            {features.map(({ icon: Icon, title, description }, index) => (
              <Card key={index} style={styles.featureCard}>
                <div style={styles.featureIcon}>
                  <Icon size={32} color="#00b5a3" />
                </div>
                <h4 style={styles.featureTitle}>{title}</h4>
                <p style={styles.featureDescription}>{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          © 2026 MediBook. Your trusted healthcare booking platform.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8f5f2 100%)',
    display: 'flex',
    flexDirection: 'column',
  },
  hero: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  heroContent: {
    maxWidth: 800,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  brandName: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#0a1628',
    margin: 0,
    fontFamily: 'DM Sans, sans-serif',
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: 700,
    color: '#0a1628',
    margin: '0 0 20px 0',
    lineHeight: 1.2,
    fontFamily: 'DM Sans, sans-serif',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: '#64748b',
    margin: '0 0 40px 0',
    lineHeight: 1.6,
    fontFamily: 'DM Sans, sans-serif',
  },
  ctaButtons: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    fontSize: '1.1rem',
    padding: '16px 32px',
    borderRadius: 12,
    transition: 'all 0.3s ease',
  },
  secondaryBtn: {
    fontSize: '1.1rem',
    padding: '16px 32px',
    borderRadius: 12,
    border: '2px solid #00b5a3',
    color: '#00b5a3',
    transition: 'all 0.3s ease',
  },
  features: {
    padding: '80px 20px',
    backgroundColor: '#ffffff',
  },
  featuresContent: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  featuresTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#0a1628',
    textAlign: 'center',
    margin: '0 0 60px 0',
    fontFamily: 'DM Sans, sans-serif',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 32,
  },
  featureCard: {
    padding: 32,
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#e8f5f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px auto',
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0a1628',
    margin: '0 0 12px 0',
    fontFamily: 'DM Sans, sans-serif',
  },
  featureDescription: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
    fontFamily: 'DM Sans, sans-serif',
  },
  footer: {
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0,
    fontFamily: 'DM Sans, sans-serif',
  },
};

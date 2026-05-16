import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import AppointmentsPage from './pages/AppointmentsPage';
import BookAppointment from './pages/BookAppointment';
import AppointmentDetail from './pages/AppointmentDetail';
import ProviderSchedule from './pages/ProviderSchedule';
import ProviderAvailability from './pages/ProviderAvailability';
import RescheduleAppointment from './pages/RescheduleAppointment';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProviderRegistration from './pages/ProviderRegistration';
import PaymentPage from './pages/PaymentPage';
import ReviewPage from './pages/ReviewPage';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.9rem',
            borderRadius: '10px',
            background: '#0a1628',
            color: '#fff',
          },
          success: { iconTheme: { primary: '#00b5a3', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/provider/register" element={
          <ProtectedRoute requiredRole="Provider">
            <ProviderRegistration />
          </ProtectedRoute>
        } />
        <Route path="/appointments" element={<Layout />}>
          <Route index element={<AppointmentsPage />} />
          <Route path="book" element={<BookAppointment />} />
          <Route path=":id" element={<AppointmentDetail />} />
          <Route path=":id/reschedule" element={<RescheduleAppointment />} />
        </Route>
        <Route path="/provider/availability" element={
          <ProtectedRoute requiredRole="Provider">
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<ProviderAvailability />} />
        </Route>
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="payments" element={<PaymentPage />} />
          <Route path="reviews" element={<ReviewPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="/provider/dashboard" element={
          <ProtectedRoute requiredRole="Provider">
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<ProviderDashboard />} />
          <Route path="reviews" element={<ReviewPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="Admin">
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;

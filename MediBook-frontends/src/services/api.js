import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Create separate axios instance for AuthService
const authApi = axios.create({
  baseURL: `${process.env.REACT_APP_AUTH_SERVICE_URL || 'http://localhost:5040'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to auth requests
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Appointment endpoints
export const appointmentService = {
  book: (data) => api.post('/appointments', data),
  getById: (id) => api.get(`/appointments/${id}`),
  getByPatient: (patientId) => api.get(`/appointments/patient/${patientId}`),
  getUpcomingByPatient: (patientId) => api.get(`/appointments/patient/${patientId}/upcoming`),
  getByProvider: (providerId) => api.get(`/appointments/provider/${providerId}`),
  getByProviderAndDate: (providerId, date) =>
    api.get(`/appointments/provider/${providerId}/date/${date}`),
  cancel: (id) => api.put(`/appointments/${id}/cancel`),
  reschedule: (id, data) => api.put(`/appointments/${id}/reschedule`, data),
  complete: (id) => api.put(`/appointments/${id}/complete`),
  updateStatus: (id, status) => api.put(`/appointments/${id}/status`, JSON.stringify(status)),
  getProviderCount: (providerId) => api.get(`/appointments/provider/${providerId}/count`),
};

// Create separate axios instance for ProviderService
const providerApi = axios.create({
  baseURL: `${process.env.REACT_APP_PROVIDER_SERVICE_URL || 'http://localhost:5268'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to provider requests
providerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mock authentication for testing
const DEFAULT_MOCK_USERS = [
  {
    email: 'admin@medibook.com',
    password: 'admin123',
    userId: 'admin-001',
    fullName: 'Admin User',
    role: 'Admin'
  },
  {
    email: 'provider@medibook.com', 
    password: 'provider123',
    userId: 'provider-001',
    fullName: 'Dr. John Smith',
    role: 'Provider'
  },
  {
    email: 'patient@medibook.com',
    password: 'patient123', 
    userId: 'patient-001',
    fullName: 'Jane Doe',
    role: 'Patient'
  }
];

// Load mock users from localStorage or fallback to defaults
let mockUsers = (() => {
  try {
    const saved = localStorage.getItem('medibook_mock_users');
    return saved ? JSON.parse(saved) : DEFAULT_MOCK_USERS;
  } catch {
    return DEFAULT_MOCK_USERS;
  }
})();

const saveMockUsers = () => {
  localStorage.setItem('medibook_mock_users', JSON.stringify(mockUsers));
};

const mockAuth = {
  users: mockUsers
};

// Auth endpoints
export const authService = {
  register: async (data) => {
    if (process.env.REACT_APP_MOCK_AUTH === 'true') {
      if (data.role === 'Admin') {
        throw { response: { data: { message: 'Registration as Admin is not allowed' } } };
      }

      const email = data.email.trim().toLowerCase();
      if (email === 'admin@medibook.com') {
        throw { response: { data: { message: 'This email is reserved for system administration' } } };
      }

      const existingUser = mockUsers.find(u => u.email.toLowerCase() === email);
      if (existingUser) {
        throw { response: { data: { message: 'Email already registered' } } };
      }
      
      const newUser = {
        userId: `${data.role.toLowerCase()}-${Math.floor(100 + Math.random() * 900)}`,
        fullName: data.fullName,
        email: email,
        password: data.password, // In mock we don't hash
        role: data.role,
        phone: data.phone
      };
      
      mockUsers.push(newUser);
      saveMockUsers();
      console.log('Mock Registration Success:', newUser);
      return { data: { success: true, message: 'Mock registration successful', userId: newUser.userId } };
    }
    return authApi.post('/auth/register', data);
  },
  login: async (data) => {
    // Use mock auth if enabled and backend is not available
    if (process.env.REACT_APP_MOCK_AUTH === 'true') {
      const email = data.email.trim().toLowerCase();
      const password = data.password.trim();
      console.log('Mock Login Attempt:', { email, password });
      
      const user = mockUsers.find(u => 
        u.email.trim().toLowerCase() === email && 
        u.password.trim() === password
      );
      
      if (user) {
        console.log('Mock Login Success:', user.email);
        const token = 'mock-jwt-token-' + Date.now();
        return {
          data: {
            token,
            userId: user.userId,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          }
        };
      } else {
        console.log('Mock Login Failed. Available users:', mockUsers.map(u => u.email).join(', '));
        throw { response: { data: { message: 'Invalid email or password' } } };
      }
    }
    return authApi.post('/auth/login', data);
  },
  logout: () => authApi.post('/auth/logout'),
  refreshToken: (data) => authApi.post('/auth/refresh', data),
  getProfile: async () => {
    if (process.env.REACT_APP_MOCK_AUTH === 'true') {
      const user = JSON.parse(localStorage.getItem('medibook_user') || '{}');
      return { data: user };
    }
    return authApi.get('/auth/profile');
  },
  updateProfile: async (data) => {
    if (process.env.REACT_APP_MOCK_AUTH === 'true') {
      console.log('Mock Update Profile:', data);
      return { data: { success: true, ...data } };
    }
    return authApi.put('/auth/profile', data);
  },
  changePassword: (data) => authApi.put('/auth/password', data),
  deactivateAccount: () => authApi.delete('/auth/deactivate'),
};

// Create separate axios instance for AvailabilityService
const availabilityApi = axios.create({
  baseURL: `${process.env.REACT_APP_AVAILABILITY_SERVICE_URL || 'http://localhost:5211'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to availability requests
availabilityApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Create separate axios instance for PaymentService
const paymentApi = axios.create({
  baseURL: `${process.env.REACT_APP_PAYMENT_SERVICE_URL || 'http://localhost:5289'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to payment requests
paymentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Create separate axios instance for NotificationService
const notificationApi = axios.create({
  baseURL: `${process.env.REACT_APP_NOTIFICATION_SERVICE_URL || 'http://localhost:5134'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to notification requests
notificationApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Create separate axios instance for RecordService
const recordApi = axios.create({
  baseURL: `${process.env.REACT_APP_RECORD_SERVICE_URL || 'http://localhost:5174'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to record requests
recordApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Create separate axios instance for ReviewService
const reviewApi = axios.create({
  baseURL: `${process.env.REACT_APP_REVIEW_SERVICE_URL || 'http://localhost:5071'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to review requests
reviewApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Provider endpoints
export const providerService = {
  registerProvider: (data) => providerApi.post('/providers', data),
  getById: (providerId) => providerApi.get(`/providers/${providerId}`),
  getByUserId: (userId) => providerApi.get(`/providers/user/${userId}`),
  getBySpecialization: (specialization) => providerApi.get(`/providers/specialization/${specialization}`),
  searchProviders: (term) => providerApi.get('/providers/search', { params: { term } }),
  getAll: () => providerApi.get('/providers'),
  updateProvider: (providerId, data) => providerApi.put(`/providers/${providerId}`, data),
  verifyProvider: (providerId) => providerApi.put(`/providers/${providerId}/verify`),
  setAvailability: (providerId, data) => providerApi.put(`/providers/${providerId}/availability`, data),
  deleteProvider: (providerId) => providerApi.delete(`/providers/${providerId}`),
  updateRating: (providerId, rating) => providerApi.put(`/providers/${providerId}/rating`, rating),
};

// Availability endpoints
export const availabilityService = {
  createSlot: (data) => availabilityApi.post('/slots', data),
  getSlotsByProvider: (providerId) => availabilityApi.get(`/slots/provider/${providerId}`),
  getSlotsByDate: (providerId, date) => availabilityApi.get(`/slots/provider/${providerId}/date/${date}`),
  updateSlot: (slotId, data) => availabilityApi.put(`/slots/${slotId}`, data),
  deleteSlot: (slotId) => availabilityApi.delete(`/slots/${slotId}`),
  getAvailableSlots: (providerId, date) => availabilityApi.get(`/slots/provider/${providerId}/available`, { params: { date } }),
};

// Payment endpoints
export const paymentService = {
  createPayment: (data) => paymentApi.post('/payments/process', data),
  getPaymentById: (paymentId) => paymentApi.get(`/payments/${paymentId}`),
  getPaymentByAppointment: (appointmentId) => paymentApi.get(`/payments/appointment/${appointmentId}`),
  getPaymentsByPatient: (patientId) => paymentApi.get(`/payments/patient/${patientId}`),
  getPaymentsByProvider: (providerId) => paymentApi.get(`/payments/provider/${providerId}`),
  updatePaymentStatus: (paymentId, status) => paymentApi.put(`/payments/${paymentId}/status`, JSON.stringify(status)),
  refundPayment: (paymentId, data) => paymentApi.post(`/payments/${paymentId}/refund`, data),
  getAllPayments: () => paymentApi.get('/payments/admin-all'),
};

// Notification endpoints
export const notificationService = {
  createNotification: (data) => notificationApi.post('/notifications/send', data),
  getNotificationsByUser: (userId) => notificationApi.get(`/notifications/recipient/${userId}`),
  markAsRead: (notificationId) => notificationApi.put(`/notifications/${notificationId}/markAsRead`),
  markAllAsRead: (userId) => notificationApi.put(`/notifications/recipient/${userId}/markAllRead`),
  deleteNotification: (notificationId) => notificationApi.delete(`/notifications/${notificationId}`),
  getUnreadCount: (userId) => notificationApi.get(`/notifications/recipient/${userId}/unreadCount`),
  getAllNotifications: () => notificationApi.get('/notifications/all'),
};

// Medical Record endpoints
export const recordService = {
  createRecord: (data) => recordApi.post('/records', data),
  getRecordById: (recordId) => recordApi.get(`/records/${recordId}`),
  getRecordByAppointment: (appointmentId) => recordApi.get(`/records/appointment/${appointmentId}`),
  getRecordsByPatient: (patientId) => recordApi.get(`/records/patient/${patientId}`),
  getRecordsByProvider: (providerId) => recordApi.get(`/records/provider/${providerId}`),
  updateRecord: (recordId, data) => recordApi.put(`/records/${recordId}`, data),
  shareRecord: (recordId, data) => recordApi.post(`/records/${recordId}/share`, data),
  getSharedRecords: (userId) => recordApi.get(`/records/shared/${userId}`),
};

// Review endpoints
export const reviewService = {
  createReview: (data) => reviewApi.post('/reviews', data),
  getReviewById: (reviewId) => reviewApi.get(`/reviews/${reviewId}`),
  getReviewsByProvider: (providerId) => reviewApi.get(`/reviews/provider/${providerId}`),
  getReviewsByPatient: (patientId) => reviewApi.get(`/reviews/patient/${patientId}`),
  updateReview: (reviewId, data) => reviewApi.put(`/reviews/${reviewId}`, data),
  deleteReview: (reviewId) => reviewApi.delete(`/reviews/${reviewId}`),
  getProviderRating: (providerId) => reviewApi.get(`/reviews/provider/${providerId}/rating`),
  getProviderReviewsSummary: (providerId) => reviewApi.get(`/reviews/provider/${providerId}/summary`),
  getAllReviews: () => reviewApi.get('/reviews/all'),
};

export default api;

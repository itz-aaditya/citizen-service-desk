const API_BASE = ''; // uses Vite proxy

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.detail || 'An unexpected error occurred';
    const errorCode = data?.error?.code || 'error';
    const err = new Error(errorMsg);
    err.code = errorCode;
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, full_name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),
  getMe: () => request('/auth/me'),
  createStaff: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),

  // Catalogue
  getServices: () => request('/services'),
  getOffices: () => request('/offices'),
  getAvailability: (officeCode, day) => request(`/offices/${officeCode}/availability?day=${day}`),

  // Public Tracking
  trackReference: (reference) => request(`/track/${encodeURIComponent(reference)}`),

  // Requests
  getRequests: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.service_type) q.set('service_type', params.service_type);
    return request(`/requests?${q.toString()}`);
  },
  createRequest: (service_code, notes) => request('/requests', { method: 'POST', body: JSON.stringify({ service_code, notes }) }),
  getRequestDetail: (id) => request(`/requests/${id}`),
  getRequestEvents: (id) => request(`/requests/${id}/events`),
  assignOfficer: (id, officer_id) => request(`/requests/${id}/assign`, { method: 'POST', body: JSON.stringify({ officer_id }) }),
  transitionRequest: (id, to_status, reason) => request(`/requests/${id}/transition`, { method: 'POST', body: JSON.stringify({ to_status, reason }) }),

  // Appointments
  getAppointments: () => request('/appointments'),
  bookAppointment: (office_code, appointment_date, slot_start) => request('/appointments', {
    method: 'POST',
    body: JSON.stringify({ office_code, appointment_date, slot_start })
  }),
  cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: 'POST' }),

  // Alerts & Reports
  getDelayReport: () => request('/reports/delays'),
  scanAlerts: () => request('/alerts/scan', { method: 'POST' }),
  getAlerts: (acknowledged) => {
    const q = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    return request(`/alerts${q}`);
  },
  ackAlert: (id) => request(`/alerts/${id}/ack`, { method: 'POST' }),
};

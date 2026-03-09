const API_BASE_URL = 'http://127.0.0.1:8000';

// Helper function to get auth token
const getToken = () => {
  return localStorage.getItem('studly_token');
};

// Helper function to set auth token
const setToken = (token) => {
  localStorage.setItem('studly_token', token);
};

// Helper function to remove auth token
const removeToken = () => {
  localStorage.removeItem('studly_token');
};

// Generic fetch wrapper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      removeToken();
      localStorage.removeItem('studly_user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) return {};
  return response.json();
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data;
  },

  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    const token = data.access_token ?? data.accessToken;
    if (token) {
      setToken(token);
      localStorage.setItem('studly_user', JSON.stringify(data.user));
    }
    
    return data;
  },

  logout: () => {
    removeToken();
    localStorage.removeItem('studly_user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('studly_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Subjects API
export const subjectsAPI = {
  getAll: async () => {
    return apiRequest('/api/subjects');
  },

  getById: async (id) => {
    return apiRequest(`/api/subjects/${id}`);
  },

  create: async (subjectData) => {
    return apiRequest('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    });
  },

  update: async (id, subjectData) => {
    return apiRequest(`/api/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subjectData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/api/subjects/${id}`, {
      method: 'DELETE',
    });
  },
};

// Tasks API
export const tasksAPI = {
  getBySubject: async (subjectId) => {
    return apiRequest(`/api/tasks/subject/${subjectId}`);
  },

  create: async (taskData) => {
    return apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  update: async (id, taskData) => {
    return apiRequest(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};

// Sessions API
export const sessionsAPI = {
  getAll: async (statusFilter = null) => {
    const query = statusFilter ? `?status_filter=${statusFilter}` : '';
    return apiRequest(`/api/sessions${query}`);
  },

  getById: async (id) => {
    return apiRequest(`/api/sessions/${id}`);
  },

  create: async (sessionData) => {
    return apiRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  update: async (id, sessionData) => {
    return apiRequest(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/api/sessions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Stats API
export const statsAPI = {
  getDashboard: async () => apiRequest('/api/stats/dashboard'),
  getWeekly: async () => apiRequest('/api/stats/weekly'),
  getSubjects: async () => apiRequest('/api/stats/subjects'),
  getQuote: async () => apiRequest('/api/stats/quote'),
};

// Achievements API
export const achievementsAPI = {
  getAll: async () => apiRequest('/api/achievements'),
};

// Goals API
export const goalsAPI = {
  getAll: async () => apiRequest('/api/goals'),
  create: async (goal) => apiRequest('/api/goals', { method: 'POST', body: JSON.stringify(goal) }),
  update: async (id, goal) => apiRequest(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) }),
};

// Activity zones API (для AI планировщика)
export const activityZonesAPI = {
  getAll: async () => apiRequest('/api/activity-zones'),
};

// AI API
export const aiAPI = {
  generatePlan: async () => apiRequest('/api/ai/generate-plan', { method: 'POST', body: JSON.stringify({}) }),
  generateTest: async (goal, subjectName) =>
    apiRequest('/api/ai/generate-test', {
      method: 'POST',
      body: JSON.stringify({ goal: goal || 'изученный материал', subject_name: subjectName || null }),
    }),
};

// Profile API
export const profileAPI = {
  get: async () => apiRequest('/api/profile'),
  update: async (profileData) => apiRequest('/api/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
  getInviteCode: async () => apiRequest('/api/profile/invite-code'),
  generateInviteCode: async () => apiRequest('/api/profile/invite-code', { method: 'POST' }),
};

// Parent API
export const parentAPI = {
  getChildren: async () => apiRequest('/api/parent/children'),
  linkChild: async (code) => apiRequest('/api/parent/children/link', { method: 'POST', body: JSON.stringify({ code }) }),
  unlinkChild: async (childId) => apiRequest(`/api/parent/children/${childId}`, { method: 'DELETE' }),
  getChildStats: async (childId) => apiRequest(`/api/parent/children/${childId}/stats`),
  getChildWeekly: async (childId) => apiRequest(`/api/parent/children/${childId}/weekly`),
  getChildSessions: async (childId) => apiRequest(`/api/parent/children/${childId}/sessions`),
  getChildSubjects: async (childId) => apiRequest(`/api/parent/children/${childId}/subjects`),
  createSessionForChild: async (childId, sessionData) =>
    apiRequest(`/api/parent/children/${childId}/sessions`, { method: 'POST', body: JSON.stringify(sessionData) }),
};

// Admin API
export const adminAPI = {
  getUsers: async (role, search) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    return apiRequest(`/api/admin/users?${params}`);
  },
  getStats: async () => apiRequest('/api/admin/stats'),
};

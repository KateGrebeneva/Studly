// адрес бэкенда можно поменять через REACT_APP_API_URL в .env
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const getToken = () => {
  return localStorage.getItem('studly_token');
};

const setToken = (token) => {
  localStorage.setItem('studly_token', token);
};

const removeToken = () => {
  localStorage.removeItem('studly_token');
};

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new Error('Сервер Studly недоступен. Проверь, что бэкенд запущен.');
  }

  if (!response.ok) {
    const isAuthRequest = endpoint.startsWith('/api/auth/');
    // разлогиниваем только на 401, 403 — это просто нет доступа
    if (response.status === 401 && !isAuthRequest) {
      removeToken();
      localStorage.removeItem('studly_user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const error = await response.json().catch(() => ({}));
    let message = error.detail;
    if (Array.isArray(message)) {
      // ошибки валидации от FastAPI
      message = message.map((e) => e.msg).filter(Boolean).join('; ');
    }
    throw new Error(message || `Ошибка сервера (${response.status})`);
  }

  if (response.status === 204) return {};
  return response.json();
};

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

export const subjectsAPI = {
  getAll: async () => {
    return apiRequest('/api/subjects');
  },

  create: async (subjectData) => {
    return apiRequest('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/api/subjects/${id}`, {
      method: 'DELETE',
    });
  },
};

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

export const statsAPI = {
  getDashboard: async () => apiRequest('/api/stats/dashboard'),
  getWeekly: async () => apiRequest('/api/stats/weekly'),
  getSubjects: async () => apiRequest('/api/stats/subjects'),
  getQuote: async () => apiRequest('/api/stats/quote'),
  getDaily: async (days = 120) => apiRequest(`/api/stats/daily?days=${days}`),
};

export const achievementsAPI = {
  getAll: async () => apiRequest('/api/achievements'),
};

export const goalsAPI = {
  getAll: async () => apiRequest('/api/goals'),
  create: async (goal) => apiRequest('/api/goals', { method: 'POST', body: JSON.stringify(goal) }),
  update: async (id, goal) => apiRequest(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) }),
  delete: async (id) => apiRequest(`/api/goals/${id}`, { method: 'DELETE' }),
};

export const activityZonesAPI = {
  getAll: async () => apiRequest('/api/activity-zones'),
};

export const aiAPI = {
  generatePlan: async () => apiRequest('/api/ai/generate-plan', { method: 'POST', body: JSON.stringify({}) }),
  generateTest: async (goal, subjectName) =>
    apiRequest('/api/ai/generate-test', {
      method: 'POST',
      body: JSON.stringify({ goal: goal || 'изученный материал', subject_name: subjectName || null }),
    }),
};

export const profileAPI = {
  get: async () => apiRequest('/api/profile'),
  update: async (profileData) => apiRequest('/api/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
  getInviteCode: async () => apiRequest('/api/profile/invite-code'),
  generateInviteCode: async () => apiRequest('/api/profile/invite-code', { method: 'POST' }),
};

export const parentAPI = {
  getChildren: async () => apiRequest('/api/parent/children'),
  linkChild: async (code) => apiRequest('/api/parent/children/link', { method: 'POST', body: JSON.stringify({ code }) }),
  unlinkChild: async (childId) => apiRequest(`/api/parent/children/${childId}`, { method: 'DELETE' }),
  getChildSessions: async (childId) => apiRequest(`/api/parent/children/${childId}/sessions`),
  getChildOverview: async (childId, days = 30) => apiRequest(`/api/parent/children/${childId}/overview?days=${days}`),
  getChildSubject: async (childId, subjectId, days = 30) =>
    apiRequest(`/api/parent/children/${childId}/subjects/${subjectId}?days=${days}`),
  createSessionForChild: async (childId, sessionData) =>
    apiRequest(`/api/parent/children/${childId}/sessions`, { method: 'POST', body: JSON.stringify(sessionData) }),
};

export const adminAPI = {
  getUsers: async (role, search) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    return apiRequest(`/api/admin/users?${params}`);
  },
  getStats: async () => apiRequest('/api/admin/stats'),
  updateUser: async (id, userData) =>
    apiRequest(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
};

import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ttm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ttm_token');
      localStorage.removeItem('ttm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const signup = (data) => API.post('/auth/signup', data);
export const login = (data) => API.post('/auth/login', data);

// Users
export const getMe = () => API.get('/users/me');
export const getAllUsers = () => API.get('/users');
export const updateProfile = (data) => API.put('/users/me', data);

// Projects
export const getProjects = () => API.get('/projects');
export const getProject = (id) => API.get(`/projects/${id}`);
export const createProject = (data) => API.post('/projects', data);
export const updateProject = (id, data) => API.put(`/projects/${id}`, data);
export const deleteProject = (id) => API.delete(`/projects/${id}`);
export const addMember = (projectId, userId) => API.post(`/projects/${projectId}/members`, { userId });
export const removeMember = (projectId, userId) => API.delete(`/projects/${projectId}/members/${userId}`);

// Join Requests
export const requestJoin = (projectId) => API.post(`/projects/${projectId}/join-request`);
export const getPendingRequests = () => API.get('/projects/pending-requests');
export const acceptRequest = (projectId, userId) => API.put(`/projects/${projectId}/join-request/${userId}/accept`);
export const rejectRequest = (projectId, userId) => API.put(`/projects/${projectId}/join-request/${userId}/reject`);

// Tasks
export const getTasks = (params) => API.get('/tasks', { params });
export const getDashboard = () => API.get('/tasks/dashboard');
export const getTask = (id) => API.get(`/tasks/${id}`);
export const createTask = (data) => API.post('/tasks', data);
export const updateTask = (id, data) => API.put(`/tasks/${id}`, data);
export const updateTaskStatus = (id, status) => API.patch(`/tasks/${id}/status`, { status });
export const deleteTask = (id) => API.delete(`/tasks/${id}`);

export default API;

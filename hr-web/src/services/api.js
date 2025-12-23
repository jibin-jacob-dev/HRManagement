import axios from 'axios';

const API_URL = 'http://localhost:5227/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to include the JWT token in headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            const userWithRoles = { ...response.data.user, roles: response.data.roles };
            localStorage.setItem('user', JSON.stringify(userWithRoles));
        }
        return response.data;
    },
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    isAdmin: () => {
        const user = authService.getCurrentUser();
        return user?.roles?.includes('Admin') || false;
    }
};

export const userService = {
    getUsers: async () => {
        const response = await api.get('/users');
        return response.data;
    },
    getUser: async (id) => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },
    updateUser: async (id, userData) => {
        const response = await api.put(`/users/${id}`, userData);
        return response.data;
    },
    deleteUser: async (id) => {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },
    createUser: async (userData) => {
        const response = await api.post('/users', userData);
        return response.data;
    },
    getRoles: async () => {
        const response = await api.get('/users/roles');
        return response.data;
    }
};

export default api;

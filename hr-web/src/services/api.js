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
            // Handle case sensitivity of Roles/roles from backend
            const backendUser = response.data.user;
            const roles = backendUser.roles || backendUser.Roles || [];
            const userWithRoles = { ...backendUser, roles: roles };
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

export const roleService = {
    getRoles: async () => {
        const response = await api.get('/roles');
        return response.data;
    },
    createRole: async (roleName) => {
        const response = await api.post('/roles', { name: roleName });
        return response.data;
    },
    deleteRole: async (roleName) => {
        const response = await api.delete(`/roles/${roleName}`);
        return response.data;
    }
};

export const menuService = {
    getMenus: async () => {
        const response = await api.get('/menus');
        return response.data;
    },
    getMenu: async (id) => {
        const response = await api.get(`/menus/${id}`);
        return response.data;
    },
    createMenu: async (menu) => {
        const response = await api.post('/menus', menu);
        return response.data;
    },
    updateMenu: async (id, menu) => {
        const response = await api.put(`/menus/${id}`, menu);
        return response.data;
    },
    deleteMenu: async (id) => {
        const response = await api.delete(`/menus/${id}`);
        return response.data;
    },
    getRoleMenus: async (roleId) => {
        const response = await api.get(`/menus/role/${roleId}`);
        return response.data; // Now returns list of objects { menuId, permissionType }
    },
    updateRoleMenus: async (roleId, menuPermissions) => {
        // menuPermissions should be array of { menuId, permissionType }
        const response = await api.post(`/menus/role/${roleId}`, menuPermissions);
        return response.data;
    },
    getCurrentUserMenus: async () => {
        const response = await api.get('/menus/current-user');
        return response.data;
    }
};

export const employeeProfileService = {
    getProfile: async () => {
        const response = await api.get('/employeeprofile');
        return response.data;
    },
    getProfileByUserId: async (userId) => {
        const response = await api.get(`/employeeprofile/${userId}`);
        return response.data;
    },
    updatePersonalInfo: async (data) => {
        const response = await api.put('/employeeprofile/personal', data);
        return response.data;
    },
    uploadPicture: async (formData) => {
        const response = await api.post('/employeeprofile/picture', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },
    updateProfessionalInfo: async (data) => {
        const response = await api.put('/employeeprofile/professional', data);
        return response.data;
    },
    addExperience: async (data) => {
        const response = await api.post('/employeeprofile/experience', data);
        return response.data;
    },
    deleteExperience: async (id) => {
        const response = await api.delete(`/employeeprofile/remove-experience/${id}`);
        return response.data;
    },
    updateExperience: async (id, data) => {
        const response = await api.put(`/employeeprofile/experience/${id}`, data);
        return response.data;
    },
    addEducation: async (data) => {
        const response = await api.post('/employeeprofile/education', data);
        return response.data;
    },
    deleteEducation: async (id) => {
        const response = await api.delete(`/employeeprofile/remove-education/${id}`);
        return response.data;
    },
    updateEducation: async (id, data) => {
        const response = await api.put(`/employeeprofile/education/${id}`, data);
        return response.data;
    },
    addCertification: async (data) => {
        const response = await api.post('/employeeprofile/certification', data);
        return response.data;
    },
    deleteCertification: async (id) => {
        const response = await api.delete(`/employeeprofile/remove-certification/${id}`);
        return response.data;
    },
    updateCertification: async (id, data) => {
        const response = await api.put(`/employeeprofile/certification/${id}`, data);
        return response.data;
    },
    uploadCertificate: async (formData) => {
        const response = await api.post('/employeeprofile/upload-certification', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },
    getEmployeeList: async () => {
        const response = await api.get('/employees/list');
        return response.data;
    }
};

export const positionService = {
    getPositions: async () => {
        const response = await api.get('/positions');
        return response.data;
    },
    getPosition: async (id) => {
        const response = await api.get(`/positions/${id}`);
        return response.data;
    },
    createPosition: async (position) => {
        const response = await api.post('/positions', position);
        return response.data;
    },
    updatePosition: async (id, position) => {
        const response = await api.put(`/positions/${id}`, position);
        return response.data;
    },
    deletePosition: async (id) => {
        const response = await api.delete(`/positions/${id}`);
        return response.data;
    }
};

export const levelService = {
    getLevels: async () => {
        const response = await api.get('/levels');
        return response.data;
    },
    getLevel: async (id) => {
        const response = await api.get(`/levels/${id}`);
        return response.data;
    },
    createLevel: async (level) => {
        const response = await api.post('/levels', level);
        return response.data;
    },
    updateLevel: async (id, level) => {
        const response = await api.put(`/levels/${id}`, level);
        return response.data;
    },
    deleteLevel: async (id) => {
        const response = await api.delete(`/levels/${id}`);
        return response.data;
    }
};

export const departmentService = {
    getDepartments: async () => {
        const response = await api.get('/departments');
        return response.data;
    },
    getDepartment: async (id) => {
        const response = await api.get(`/departments/${id}`);
        return response.data;
    },
    createDepartment: async (department) => {
        const response = await api.post('/departments', department);
        return response.data;
    },
    updateDepartment: async (id, department) => {
        const response = await api.put(`/departments/${id}`, department);
        return response.data;
    },
    deleteDepartment: async (id) => {
        const response = await api.delete(`/departments/${id}`);
        return response.data;
    }
};

export const attendanceService = {
    getAttendances: async (startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await api.get(`/attendance?${params.toString()}`);
        return response.data;
    },
    getAttendance: async (id) => {
        const response = await api.get(`/attendance/${id}`);
        return response.data;
    },
    createAttendance: async (attendance) => {
        const response = await api.post('/attendance', attendance);
        return response.data;
    },
    updateAttendance: async (id, attendance) => {
        const response = await api.put(`/attendance/${id}`, attendance);
        return response.data;
    },
    deleteAttendance: async (id) => {
        const response = await api.delete(`/attendance/${id}`);
        return response.data;
    }
};

export const leaveService = {
    getLeaves: async (status) => {
        const params = status ? `?status=${status}` : '';
        const response = await api.get(`/leave${params}`);
        return response.data;
    },
    getLeave: async (id) => {
        const response = await api.get(`/leave/${id}`);
        return response.data;
    },
    createLeave: async (leave) => {
        const response = await api.post('/leave', leave);
        return response.data;
    },
    updateLeave: async (id, leave) => {
        const response = await api.put(`/leave/${id}`, leave);
        return response.data;
    },
    approveLeave: async (id, comments) => {
        const response = await api.post(`/leave/${id}/approve`, { comments });
        return response.data;
    },
    rejectLeave: async (id, comments) => {
        const response = await api.post(`/leave/${id}/reject`, { comments });
        return response.data;
    },
    deleteLeave: async (id) => {
        const response = await api.delete(`/leave/${id}`);
        return response.data;
    }
};

export const publicHolidayService = {
    getPublicHolidays: async (year) => {
        const params = year ? `?year=${year}` : '';
        const response = await api.get(`/publicholidays${params}`);
        return response.data;
    },
    getPublicHoliday: async (id) => {
        const response = await api.get(`/publicholidays/${id}`);
        return response.data;
    },
    createPublicHoliday: async (holiday) => {
        const response = await api.post('/publicholidays', holiday);
        return response.data;
    },
    updatePublicHoliday: async (id, holiday) => {
        const response = await api.put(`/publicholidays/${id}`, holiday);
        return response.data;
    },
    deletePublicHoliday: async (id) => {
        const response = await api.delete(`/publicholidays/${id}`);
        return response.data;
    }
};

export const leaveTypeService = {
    getLeaveTypes: async () => {
        const response = await api.get('/leavetypes');
        return response.data;
    },
    getLeaveType: async (id) => {
        const response = await api.get(`/leavetypes/${id}`);
        return response.data;
    },
    createLeaveType: async (leaveType) => {
        const response = await api.post('/leavetypes', leaveType);
        return response.data;
    },
    updateLeaveType: async (id, leaveType) => {
        const response = await api.put(`/leavetypes/${id}`, leaveType);
        return response.data;
    },
    deleteLeaveType: async (id) => {
        const response = await api.delete(`/leavetypes/${id}`);
        return response.data;
    }
};

export const leaveBalanceService = {
    getLeaveBalances: async (employeeId) => {
        const params = employeeId ? `?employeeId=${employeeId}` : '';
        const response = await api.get(`/leavebalance${params}`);
        return response.data;
    },
    getLeaveBalance: async (id) => {
        const response = await api.get(`/leavebalance/${id}`);
        return response.data;
    },
    getEmployeeLeaveBalance: async (employeeId, year) => {
        const response = await api.get(`/leavebalance/employee/${employeeId}/year/${year}`);
        return response.data;
    },
    createLeaveBalance: async (leaveBalance) => {
        const response = await api.post('/leavebalance', leaveBalance);
        return response.data;
    },
    updateLeaveBalance: async (id, leaveBalance) => {
        const response = await api.put(`/leavebalance/${id}`, leaveBalance);
        return response.data;
    },
    deleteLeaveBalance: async (id) => {
        const response = await api.delete(`/leavebalance/${id}`);
        return response.data;
    },
    initializeYearBalances: async (year) => {
        const response = await api.post('/leavebalance/initialize-year', { year });
        return response.data;
    }
};

export default api;

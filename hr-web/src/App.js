import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';

import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import MenuManagement from './pages/MenuManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import PositionManagement from './pages/PositionManagement';
import LevelManagement from './pages/LevelManagement';
import { MenuProvider } from './context/MenuContext';
import Layout from './components/layout/Layout';
import Profile from './pages/Profile';
import EmployeeList from './pages/EmployeeList';
import AttendanceManagement from './pages/AttendanceManagement';
import LeaveManagement from './pages/LeaveManagement';

// Simple component to protect routes
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route 
                        path="/*" 
                        element={
                            <ProtectedRoute>
                                <MenuProvider>
                                    <Layout>
                                        <Routes>
                                            <Route path="/dashboard" element={<Dashboard />} />
                                            <Route path="/user-management" element={<UserManagement />} />
                                            <Route path="/role-management" element={<RoleManagement />} />
                                            <Route path="/menu-management" element={<MenuManagement />} />
                                            <Route path="/departments" element={<DepartmentManagement />} />
                                            <Route path="/positions" element={<PositionManagement />} />
                                            <Route path="/levels" element={<LevelManagement />} />
                                            <Route path="/employees" element={<EmployeeList />} />
                                            <Route path="/attendance" element={<AttendanceManagement />} />
                                            <Route path="/leave-management" element={<LeaveManagement />} />
                                            <Route path="/profile" element={<Profile />} />
                                            <Route path="/profile/:userId" element={<Profile />} />
                                            <Route path="/" element={<Navigate to="/dashboard" />} />
                                        </Routes>
                                    </Layout>
                                </MenuProvider>
                            </ProtectedRoute>
                        } 
                    />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;

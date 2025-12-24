import React from 'react';
import { Nav, Button } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { authService } from '../../services/api';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const isAdmin = authService.isAdmin();

    return (
        <>
            {/* Mobile Overlay */}
            {!isCollapsed && (
                <div className="sidebar-overlay d-lg-none" onClick={toggleSidebar}></div>
            )}
            
            <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} shadow-sm`}>
                {/* Brand Section */}
                <div className="sidebar-brand d-flex justify-content-between align-items-center w-100">
                    <div className="d-flex align-items-center">
                        <i className="fas fa-rocket fs-4"></i>
                        <span className="fs-5 sidebar-text ms-3">HR Pro</span>
                    </div>
                    {/* Mobile Close Button */}
                    <Button 
                        variant="link" 
                        className="d-lg-none text-secondary p-0" 
                        onClick={toggleSidebar}
                    >
                        <i className="fas fa-times fs-4"></i>
                    </Button>
                </div>

                <Nav className="flex-column mt-2">
                    <Nav.Item>
                        <Nav.Link 
                            as={NavLink} 
                            to="/dashboard" 
                            className={({ isActive }) => `${isActive ? 'active-link' : 'sidebar-link'}`}
                        >
                            <i className="fas fa-th-large"></i>
                            <span className="sidebar-text">Dashboard</span>
                        </Nav.Link>
                    </Nav.Item>

                    <Nav.Item>
                        <Nav.Link 
                            as={NavLink} 
                            to="/user-management" 
                            className={({ isActive }) => `${isActive ? 'active-link' : 'sidebar-link'}`}
                        >
                            <i className="fas fa-user-shield"></i>
                            <span className="sidebar-text">User Management</span>
                        </Nav.Link>
                    </Nav.Item>

                    <Nav.Item>
                        <Nav.Link 
                            as={NavLink} 
                            to="/role-management" 
                            className={({ isActive }) => `${isActive ? 'active-link' : 'sidebar-link'}`}
                        >
                            <i className="fas fa-shield-alt"></i>
                            <span className="sidebar-text">Role Management</span>
                        </Nav.Link>
                    </Nav.Item>

                    <Nav.Item>
                        <Nav.Link 
                            as={NavLink} 
                            to="/employees" 
                            className={({ isActive }) => `${isActive ? 'active-link' : 'sidebar-link'}`}
                        >
                            <i className="fas fa-user-friends"></i>
                            <span className="sidebar-text">Employees</span>
                        </Nav.Link>
                    </Nav.Item>
                </Nav>
            </div>
        </>
    );
};

export default Sidebar;

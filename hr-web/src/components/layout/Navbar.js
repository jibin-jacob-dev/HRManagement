import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Form, InputGroup, Dropdown, Badge } from 'react-bootstrap';
import { authService } from '../../services/api';
import ThemeToggle from '../common/ThemeToggle';
import FontSizeControl from '../common/FontSizeControl';

const CustomNavbar = ({ toggleSidebar, isCollapsed }) => {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const getInitials = () => {
        if (!user) return '??';
        return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
    };

    return (
        <Navbar expand="lg" className="shadow-sm bg-body p-0 border-bottom sticky-top">
            <Container fluid className="px-2 px-md-3 d-flex align-items-center justify-content-between flex-nowrap" style={{ height: '64px' }}>
                <div className="d-flex align-items-center gap-1 gap-md-2 flex-shrink-0 mb-0">
                    {/* Sidebar Toggle - Bootstrap Style */}
                    <Button 
                        variant="link" 
                        className="text-secondary p-0 shadow-none border-0 d-flex align-items-center justify-content-center" 
                        onClick={toggleSidebar}
                        style={{ width: '40px', height: '40px' }}
                    >
                        <span className="navbar-toggler-icon" style={{ width: '1.5rem', height: '1.5rem' }}></span>
                    </Button>

                    {/* Search Bar - Hidden on Mobile */}
                    <div className="d-none d-md-block ms-2" style={{ width: '300px' }}>
                        <InputGroup className="bg-body-tertiary rounded-3 border">
                            <InputGroup.Text className="bg-transparent border-0 pe-1">
                                <i className="fas fa-search text-muted small"></i>
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="Search..."
                                className="bg-transparent border-0 shadow-none ps-1 py-1 small"
                            />
                        </InputGroup>
                    </div>
                </div>

                {/* Right Side Actions */}
                <Nav className="flex-row align-items-center gap-1 gap-md-3 flex-shrink-0 mb-0">
                    <ThemeToggle />
                    
                    <Button variant="link" className="text-secondary p-0 position-relative d-flex align-items-center justify-content-center text-decoration-none"
                            style={{ width: '40px', height: '40px' }}>
                        <i className="fas fa-bell fs-5"></i>
                        <Badge bg="danger" className="position-absolute rounded-circle d-flex align-items-center justify-content-center" 
                               style={{ width: '16px', height: '16px', fontSize: '0.6rem', top: '4px', right: '4px' }}>
                            3
                        </Badge>
                    </Button>

                    <Dropdown align="end">
                        <Dropdown.Toggle variant="link" id="profile-dropdown" className="p-0 border-0 shadow-none no-caret d-flex align-items-center ms-1">
                            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm" 
                                 style={{ width: '38px', height: '38px', fontWeight: 'bold', fontSize: '0.9rem' }}
                                 title={`${user?.firstName} ${user?.lastName}`}
                            >
                                {getInitials()}
                            </div>
                        </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow-lg border-0 mt-3 p-2" style={{ minWidth: '320px', borderRadius: '12px' }}>
                             <div className="p-3 border-bottom mb-2">
                                <h6 className="mb-0 fw-bold">{user?.firstName} {user?.lastName}</h6>
                                <small className="text-muted">{user?.email}</small>
                            </div>
                            
                            <div className="px-3 py-2 border-bottom mb-2">
                                <div className="small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.05rem' }}>
                                    Appearance
                                </div>
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                    <span className="small">Font Size</span>
                                    <FontSizeControl />
                                </div>
                            </div>

                            <Dropdown.Item as={Link} to="/profile" className="rounded-3 py-2 small">
                                <i className="fas fa-user-circle me-2 opacity-75"></i> Profile
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} to="/settings" className="rounded-3 py-2 small">
                                <i className="fas fa-cog me-2 opacity-75"></i> Settings
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={handleLogout} className="text-danger rounded-3 py-2 small">
                                <i className="fas fa-sign-out-alt me-2 opacity-75"></i> Logout
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Nav>
            </Container>
        </Navbar>
    );
};

export default CustomNavbar;

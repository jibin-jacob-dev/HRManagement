import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Form, InputGroup, Dropdown, Badge } from 'react-bootstrap';
import { authService } from '../../services/api';
import ThemeToggle from '../common/ThemeToggle';
import FontSizeControl from '../common/FontSizeControl';
import { useNotifications } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import './Navbar.css';

const CustomNavbar = ({ toggleSidebar, isCollapsed }) => {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    
    // Timer to refresh relative time labels (e.g., from "just now" to "1 minute ago")
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

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
                    
                    <Dropdown align="end" className="notification-dropdown">
                        <Dropdown.Toggle as="div" className="no-caret" style={{ cursor: 'pointer' }}>
                            <Button variant="link" className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''} text-secondary p-0 position-relative d-flex align-items-center justify-content-center text-decoration-none`}
                                    style={{ width: '40px', height: '40px' }}>
                                <i className="fas fa-bell fs-5"></i>
                                {unreadCount > 0 && (
                                    <Badge bg="danger" className="position-absolute rounded-circle d-flex align-items-center justify-content-center" 
                                           style={{ width: '18px', height: '18px', fontSize: '0.65rem', top: '2px', right: '2px', border: '2px solid white' }}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Badge>
                                )}
                            </Button>
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="notification-menu shadow-lg border-0 mt-3 p-0">
                            <div className="notification-header p-3 d-flex align-items-center justify-content-between">
                                <h6 className="mb-0 fw-bold">Notifications</h6>
                                {unreadCount > 0 && (
                                    <Button variant="link" className="mark-all-btn p-0 text-decoration-none small" onClick={markAllAsRead}>
                                        Mark all as read
                                    </Button>
                                )}
                            </div>
                            <div className="notification-list" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                                {notifications.length > 0 ? (
                                    notifications.map((notification) => (
                                        <div 
                                            key={notification.notificationId} 
                                            className={`notification-item p-3 border-bottom ${!notification.isRead ? 'unread' : ''}`}
                                            onClick={() => {
                                                if (!notification.isRead) markAsRead(notification.notificationId);
                                                if (notification.targetUrl) navigate(notification.targetUrl);
                                            }}
                                        >
                                            <div className="d-flex gap-3">
                                                <div className={`notification-icon-wrapper rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 type-${notification.type?.toLowerCase()}`}>
                                                    <i className={`fas ${
                                                        notification.type === 'LeaveRequest' ? 'fa-paper-plane' : 
                                                        notification.type === 'LeaveApproval' ? 'fa-check-circle' : 
                                                        notification.type === 'LeaveRejection' ? 'fa-times-circle' : 'fa-bell'
                                                    }`}></i>
                                                </div>
                                                <div className="notification-content flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                                        <span className="notification-title small fw-bold">
                                                            {notification.title}
                                                        </span>
                                                        <small className="notification-time text-muted">
                                                            {(() => {
                                                                try {
                                                                    let dateStr = notification.createdDate;
                                                                    if (!dateStr) return 'just now';

                                                                    dateStr = dateStr.toString();

                                                                    let date;
                                                                    if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-')) {
                                                                        date = new Date(dateStr + 'Z');
                                                                    } else {
                                                                        date = new Date(dateStr);
                                                                    }

                                                                    const now = new Date();
                                                                    const diffInSeconds = Math.floor((now - date) / 1000);

                                                                    // Compensation for +5:30 offset bugs and live notifications
                                                                    if (diffInSeconds < 60 || (notification.isLive && diffInSeconds < 21600)) {
                                                                        return 'just now';
                                                                    }

                                                                    return formatDistanceToNow(date, { addSuffix: true });
                                                                } catch (e) {
                                                                    return 'just now';
                                                                }
                                                            })()}
                                                        </small>
                                                    </div>
                                                    <p className="notification-message mb-0 text-muted small lh-sm">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-5 text-center empty-notifications">
                                        <div className="empty-icon-bg mb-3">
                                            <i className="fas fa-bell-slash"></i>
                                        </div>
                                        <p className="text-muted small mb-0">You're all caught up!</p>
                                    </div>
                                )}
                            </div>
                            <div className="notification-footer p-2 text-center bg-light-subtle">
                                <Button variant="link" className="text-decoration-none small p-0 text-primary fw-medium">
                                    View all activity
                                </Button>
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>

                    <Dropdown align="end" className="profile-dropdown">
                        <Dropdown.Toggle variant="link" id="profile-dropdown" className="p-0 border-0 shadow-none no-caret d-flex align-items-center ms-1">
                            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm" 
                                 style={{ width: '40px', height: '40px', fontWeight: 'bold', fontSize: '0.95rem' }}
                                 title={`${user?.firstName} ${user?.lastName}`}
                            >
                                {user?.profilePicture ? (
                                    <img 
                                        src={`http://localhost:5227${user.profilePicture}`} 
                                        alt="Profile" 
                                        className="rounded-circle"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = getInitials(); }}
                                    />
                                ) : (
                                    getInitials()
                                )}
                            </div>
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="profile-menu shadow-lg border-0 mt-3 p-0">
                            <div className="profile-header p-3 border-bottom">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" 
                                         style={{ width: '48px', height: '48px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        {user?.profilePicture ? (
                                            <img 
                                                src={`http://localhost:5227${user.profilePicture}`} 
                                                alt="Profile" 
                                                className="rounded-circle"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = getInitials(); }}
                                            />
                                        ) : (
                                            getInitials()
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h6 className="mb-0 fw-bold text-truncate">{user?.firstName} {user?.lastName}</h6>
                                        <p className="small mb-0 text-truncate opacity-75" style={{ fontSize: '0.75rem' }}>{user?.email}</p>
                                    </div>
                                </div>
                                <div className="d-flex flex-wrap gap-1 mt-2">
                                    {(user?.roles || []).map((role, index) => (
                                        <Badge 
                                            key={index} 
                                            bg="light" 
                                            className="fw-normal text-white bg-opacity-25 border border-white border-opacity-25"
                                            style={{ fontSize: '0.6rem' }}
                                        >
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-2">
                                <div className="px-2 py-1">
                                    <div className="small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.05rem' }}>
                                        Account
                                    </div>
                                    <Dropdown.Item as={Link} to="/profile" className="rounded-2 py-2 small">
                                        <i className="fas fa-user-circle me-3 opacity-75 text-primary"></i> My Profile
                                    </Dropdown.Item>
                                    <Dropdown.Item as={Link} to="/settings" className="rounded-2 py-2 small">
                                        <i className="fas fa-cog me-3 opacity-75 text-success"></i> Account Settings
                                    </Dropdown.Item>
                                </div>

                                <div className="px-2 py-1 border-top mt-2 overflow-hidden">
                                    <div className="small fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.05rem' }}>
                                        Experience & Preferences
                                    </div>
                                    <div className="d-flex flex-column gap-2 mt-2">
                                        <div className="d-flex align-items-center justify-content-between mb-1">
                                            <span className="small text-muted">Aesthetics</span>
                                            <span className="small fw-medium text-primary">Font Size Control</span>
                                        </div>
                                        <FontSizeControl />
                                    </div>
                                </div>

                                <div className="px-2 py-1 border-top mt-2">
                                    <Dropdown.Item onClick={handleLogout} className="text-danger rounded-2 py-2 small">
                                        <i className="fas fa-sign-out-alt me-3 opacity-75"></i> Sign Out
                                    </Dropdown.Item>
                                </div>
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>
                </Nav>
            </Container>
        </Navbar>
    );
};

export default CustomNavbar;

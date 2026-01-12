import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Accordion, Badge } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';
import alertService from '../services/alertService';
import FontSizeControl from '../components/common/FontSizeControl';
import ThemeToggle from '../components/common/ThemeToggle';

const Settings = () => {
    const { isDarkMode } = useTheme();
    const [sessionTimeout, setSessionTimeout] = useState('15');

    useEffect(() => {
        const stored = localStorage.getItem('sessionTimeout');
        if (stored) {
            setSessionTimeout(stored);
        }
    }, []);

    const handleTimeoutChange = (e) => {
        const val = e.target.value;
        setSessionTimeout(val);
        localStorage.setItem('sessionTimeout', val);
        
        // Dispatch event for SessionMonitor
        window.dispatchEvent(new Event('session-config-changed'));
        
        alertService.showToast(`Session timeout set to ${val} minutes`);
    };

    return (
        <Container fluid className="py-4">
            <Row className="justify-content-center">
                <Col md={10} lg={8}>
                    <div className="d-flex align-items-center mb-4">
                        <div>
                            <h2 className="fw-bold mb-1">Account Settings</h2>
                            <p className="text-muted mb-0">Manage your application preferences and security settings.</p>
                        </div>
                    </div>

                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-0">
                            <Accordion defaultActiveKey="0" flush className="settings-accordion">
                                {/* Security & Session Section */}
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>
                                        <div className="d-flex align-items-center">
                                            <div className="icon-box bg-primary bg-opacity-10 text-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                <i className="fas fa-shield-alt"></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold">Security & Session</div>
                                                <div className="small text-muted">Manage timeout and security preferences</div>
                                            </div>
                                        </div>
                                    </Accordion.Header>
                                    <Accordion.Body className="px-5 py-4">
                                        <div className="mb-4">
                                            <label className="form-label fw-bold text-muted small text-uppercase mb-3">Idle Session Timeout</label>
                                            <div className="d-flex align-items-center gap-3">
                                                <Form.Select 
                                                    value={sessionTimeout}
                                                    onChange={handleTimeoutChange}
                                                    className="form-control-lg border-2"
                                                    style={{ maxWidth: '300px' }}
                                                >
                                                    <option value="5">5 Minutes</option>
                                                    <option value="15">15 Minutes (Default)</option>
                                                    <option value="30">30 Minutes</option>
                                                    <option value="60">1 Hour</option>
                                                    <option value="120">2 Hours</option>
                                                </Form.Select>
                                                <Badge bg="info" className="bg-opacity-10 text-info fw-normal px-2 py-1">
                                                    <i className="fas fa-info-circle me-1"></i>
                                                    Auto-logout enabled
                                                </Badge>
                                            </div>
                                            <Form.Text className="text-muted mt-2 d-block">
                                                For your security, the system will automatically log you out after this period of inactivity. 
                                                You will receive a warning 2 minutes before expiration.
                                            </Form.Text>
                                        </div>
                                    </Accordion.Body>
                                </Accordion.Item>

                                {/* Appearance Section */}
                                <Accordion.Item eventKey="1">
                                    <Accordion.Header>
                                        <div className="d-flex align-items-center">
                                            <div className="icon-box bg-success bg-opacity-10 text-success rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                <i className="fas fa-paint-brush"></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold">Appearance & Accessibility</div>
                                                <div className="small text-muted">Customize the look and feel</div>
                                            </div>
                                        </div>
                                    </Accordion.Header>
                                    <Accordion.Body className="px-5 py-4">
                                        <div className="row g-4">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold text-muted small text-uppercase mb-2">Theme Mode</label>
                                                <label className="form-label fw-bold text-muted small text-uppercase mb-2">Theme Mode</label>
                                                <div className="d-flex align-items-center p-3 border rounded-3 bg-light-subtle justify-content-between">
                                                    <div>
                                                        <div className="fw-bold">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</div>
                                                        <div className="small text-muted">Toggle application theme</div>
                                                    </div>
                                                    <ThemeToggle />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold text-muted small text-uppercase mb-2">Font Size</label>
                                                <div className="p-3 border rounded-3 bg-light-subtle">
                                                    <FontSizeControl />
                                                </div>
                                            </div>
                                        </div>
                                    </Accordion.Body>
                                </Accordion.Item>
                                
                                {/* Notifications Section (Placeholder for future) */}
                                <Accordion.Item eventKey="2">
                                     <Accordion.Header>
                                        <div className="d-flex align-items-center">
                                            <div className="icon-box bg-warning bg-opacity-10 text-warning rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                <i className="fas fa-bell"></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold">Notifications</div>
                                                <div className="small text-muted">Configure how you receive alerts</div>
                                            </div>
                                        </div>
                                    </Accordion.Header>
                                    <Accordion.Body className="px-5 py-4">
                                        <p className="text-muted text-center py-3">Notification preferences coming soon.</p>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Settings;

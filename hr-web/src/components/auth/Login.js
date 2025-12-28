import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/api';
import alertService from '../../services/alertService';
import { Form, Button, Card, Row, Col, Spinner, Carousel } from 'react-bootstrap';
import ThemeToggle from '../common/ThemeToggle';
import FontSizeControl from '../common/FontSizeControl';
import './Auth.css';
import carousel1 from '../../assets/auth/carousel-1.png';
import carousel2 from '../../assets/auth/carousel-2.png';
import carousel3 from '../../assets/auth/carousel-3.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await authService.login(email, password);
            navigate('/dashboard');
        } catch (err) {
            const message = err.response?.data?.message || 'Invalid email or password. Please try again.';
            alertService.showError('Login Failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-wrapper">
            <div className="position-fixed top-0 end-0 p-4 d-flex align-items-center gap-3" style={{ zIndex: 1000 }}>
                <FontSizeControl />
                <ThemeToggle />
            </div>
            
            <Card className="auth-card">
                <Row className="g-0">
                    <Col md={6} className="auth-carousel-section">
                        <Carousel controls={false} indicators={true} fade className="w-100">
                            <Carousel.Item interval={3000}>
                                <div className="carousel-img-container">
                                    <img className="carousel-img" src={carousel1} alt="Collaboration" />
                                </div>
                                <div className="carousel-caption-text">
                                    <h3>Collaborate seamlessly</h3>
                                    <p>Empower your teams with modern HR tools designed for better collaboration.</p>
                                </div>
                            </Carousel.Item>
                            <Carousel.Item interval={3000}>
                                <div className="carousel-img-container">
                                    <img className="carousel-img" src={carousel2} alt="Analytics" />
                                </div>
                                <div className="carousel-caption-text">
                                    <h3>Data-driven insights</h3>
                                    <p>Make informed decisions with real-time workforce analytics and reporting.</p>
                                </div>
                            </Carousel.Item>
                            <Carousel.Item interval={3000}>
                                <div className="carousel-img-container">
                                    <img className="carousel-img" src={carousel3} alt="Growth" />
                                </div>
                                <div className="carousel-caption-text">
                                    <h3>Nurture growth</h3>
                                    <p>Track employee development and help your talent reach their full potential.</p>
                                </div>
                            </Carousel.Item>
                        </Carousel>
                    </Col>
                    
                    <Col md={6} className="auth-form-section">
                        <div className="auth-brand">HR Pro</div>
                        <h2>Welcome back!</h2>
                        <p className="text-muted mb-4">Login to manage your workforce</p>
                        
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" id="email">
                                <Form.Label className="small fw-bold">Email Address</Form.Label>
                                <Form.Control 
                                    className="auth-input"
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                />
                            </Form.Group>
                            <Form.Group className="mb-4" id="password">
                                <Form.Label className="small fw-bold">Password</Form.Label>
                                <Form.Control 
                                    className="auth-input"
                                    type="password" 
                                    required 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                />
                            </Form.Group>
                            <Button disabled={loading} className="w-100 mb-3 auth-btn btn-primary" type="submit">
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                        Logging in...
                                    </>
                                ) : 'Sign In'}
                            </Button>
                        </Form>
                        <div className="w-100 text-center mt-3 text-muted small">
                            Don't have an account? <Link to="/register" className="text-primary fw-bold text-decoration-none">Create Account</Link>
                        </div>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default Login;

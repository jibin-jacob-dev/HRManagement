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

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return alertService.showToast('Passwords do not match', 'warning');
        }

        setLoading(true);
        try {
            const userData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password
            };
            await authService.register(userData);
            alertService.showSuccess('Registration successful!', 'Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            const data = err.response?.data;
            let errorMessage = 'Failed to create an account';
            if (typeof data === 'object' && !data.message) {
                const errors = Object.values(data).flat().join('. ');
                errorMessage = errors || errorMessage;
            } else {
                errorMessage = data?.message || errorMessage;
            }
            alertService.showError('Registration Failed', errorMessage);
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
                                    <h3>Join our community</h3>
                                    <p>Start your journey with a modern HR platform designed for growth.</p>
                                </div>
                            </Carousel.Item>
                            <Carousel.Item interval={3000}>
                                <div className="carousel-img-container">
                                    <img className="carousel-img" src={carousel2} alt="Analytics" />
                                </div>
                                <div className="carousel-caption-text">
                                    <h3>Manage with ease</h3>
                                    <p>Experience the simplicity of powerful management tools at your fingertips.</p>
                                </div>
                            </Carousel.Item>
                            <Carousel.Item interval={3000}>
                                <div className="carousel-img-container">
                                    <img className="carousel-img" src={carousel3} alt="Growth" />
                                </div>
                                <div className="carousel-caption-text">
                                    <h3>Scale your talent</h3>
                                    <p>Build a workforce that excels and grows together with our specialized modules.</p>
                                </div>
                            </Carousel.Item>
                        </Carousel>
                    </Col>
                    
                    <Col md={6} className="auth-form-section">
                        <div className="auth-brand">HR Pro</div>
                        <h2>Create Account</h2>
                        <p className="text-muted mb-4">Get started with your free account</p>
                        
                        <Form onSubmit={handleSubmit}>
                            <Row className="mb-3">
                                <Col sm={6}>
                                    <Form.Group id="firstName">
                                        <Form.Label className="small fw-bold">First Name</Form.Label>
                                        <Form.Control 
                                            className="auth-input"
                                            type="text" 
                                            id="firstName"
                                            required 
                                            value={formData.firstName} 
                                            onChange={handleChange} 
                                        />
                                    </Form.Group>
                                </Col>
                                <Col sm={6}>
                                    <Form.Group id="lastName">
                                        <Form.Label className="small fw-bold">Last Name</Form.Label>
                                        <Form.Control 
                                            className="auth-input"
                                            type="text" 
                                            id="lastName"
                                            required 
                                            value={formData.lastName} 
                                            onChange={handleChange} 
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Email Address</Form.Label>
                                <Form.Control 
                                    className="auth-input"
                                    type="email" 
                                    id="email" 
                                    required 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Password</Form.Label>
                                <Form.Control 
                                    className="auth-input"
                                    type="password" 
                                    id="password" 
                                    required 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold">Confirm Password</Form.Label>
                                <Form.Control 
                                    className="auth-input"
                                    type="password" 
                                    id="confirmPassword" 
                                    required 
                                    value={formData.confirmPassword} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                            <Button disabled={loading} className="w-100 mb-3 auth-btn btn-primary" type="submit">
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                        Registering...
                                    </>
                                ) : 'Sign Up'}
                            </Button>
                        </Form>
                        <div className="w-100 text-center mt-3 text-muted small">
                            Already have an account? <Link to="/login" className="text-primary fw-bold text-decoration-none">Log In</Link>
                        </div>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default Register;

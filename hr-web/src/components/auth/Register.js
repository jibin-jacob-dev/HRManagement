import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/api';
import alertService from '../../services/alertService';
import { Form, Button, Card, Container, Spinner } from 'react-bootstrap';
import ThemeToggle from '../common/ThemeToggle';

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
                // Handle Identity errors array
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
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="position-fixed top-0 end-0 p-4">
                <ThemeToggle />
            </div>
            <div className="w-100" style={{ maxWidth: '500px' }}>
                <Card className="shadow-lg border-0">
                    <Card.Body className="p-4">
                        <h2 className="text-center mb-4 text-primary">HR Management</h2>
                        <h4 className="text-center mb-4">Create Account</h4>
                        <Form onSubmit={handleSubmit}>
                            <div className="d-flex gap-2">
                                <Form.Group className="mb-3 w-50">
                                    <Form.Label>First Name</Form.Label>
                                    <Form.Control type="text" id="firstName" required value={formData.firstName} onChange={handleChange} />
                                </Form.Group>
                                <Form.Group className="mb-3 w-50">
                                    <Form.Label>Last Name</Form.Label>
                                    <Form.Control type="text" id="lastName" required value={formData.lastName} onChange={handleChange} />
                                </Form.Group>
                            </div>
                            <Form.Group className="mb-3">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control type="email" id="email" required value={formData.email} onChange={handleChange} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control type="password" id="password" required value={formData.password} onChange={handleChange} />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control type="password" id="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} />
                            </Form.Group>
                            <Button disabled={loading} className="w-100 mb-3" type="submit">
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                        Registering...
                                    </>
                                ) : 'Sign Up'}
                            </Button>
                        </Form>
                        <div className="w-100 text-center mt-2">
                            Already have an account? <Link to="/login">Log In</Link>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default Register;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/api';
import { Form, Button, Card, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import ThemeToggle from '../common/ThemeToggle';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authService.login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="position-fixed top-0 end-0 p-4">
                <ThemeToggle />
            </div>
            <div className="w-100" style={{ maxWidth: '400px' }}>
                <Card className="shadow-lg border-0">
                    <Card.Body className="p-4">
                        <h2 className="text-center mb-4 text-primary">HR Management</h2>
                        <h4 className="text-center mb-4">Login</h4>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" id="email">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                />
                            </Form.Group>
                            <Form.Group className="mb-4" id="password">
                                <Form.Label>Password</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    required 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                />
                            </Form.Group>
                            <Button disabled={loading} className="w-100 mb-3" type="submit">
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                        Logging in...
                                    </>
                                ) : 'Log In'}
                            </Button>
                        </Form>
                        <div className="w-100 text-center mt-2">
                            Don't have an account? <Link to="/register">Register</Link>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default Login;

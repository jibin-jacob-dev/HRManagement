import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import Layout from '../layout/Layout';
import { authService } from '../../services/api';

const Dashboard = () => {
    const user = authService.getCurrentUser();

    return (
        <Layout>
            <Container fluid>
                <h2 className="mb-4">Dashboard Overview</h2>
                <Row className="g-4">
                    <Col xl={4} md={6}>
                        <Card className="text-center shadow-sm border-0 h-100">
                            <Card.Body className="p-4">
                                <div className="display-4 text-primary mb-2">
                                    <i className="fas fa-users"></i>
                                </div>
                                <Card.Title className="fw-bold">Employees</Card.Title>
                                <Card.Text className="h3 fw-bold">24</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xl={4} md={6}>
                        <Card className="text-center shadow-sm border-0 h-100">
                            <Card.Body className="p-4">
                                <div className="display-4 text-success mb-2">
                                    <i className="fas fa-building"></i>
                                </div>
                                <Card.Title className="fw-bold">Departments</Card.Title>
                                <Card.Text className="h3 fw-bold">5</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xl={4} md={12}>
                        <Card className="text-center shadow-sm border-0 h-100">
                            <Card.Body className="p-4">
                                <div className="display-4 text-info mb-2">
                                    <i className="fas fa-calendar-check"></i>
                                </div>
                                <Card.Title className="fw-bold">Leave Requests</Card.Title>
                                <Card.Text className="h3 fw-bold">3 Pending</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Card className="mt-4 shadow-sm border-0">
                    <Card.Header className="bg-transparent fw-bold py-3 text-primary">System Information</Card.Header>
                    <Card.Body className="p-4">
                        <p className="lead">Welcome back, <strong>{user?.firstName}</strong>! You're logged into the HR Management portal.</p>
                        <div className="alert alert-info border-0 shadow-sm">
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Status:</strong> Your account is active. You are logged in as an {user?.roles?.[0] || 'Employee'}.
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </Layout>
    );
};

export default Dashboard;

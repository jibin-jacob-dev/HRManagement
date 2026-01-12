import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Modal, Badge, ListGroup, Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { payrollService, authService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import moment from 'moment';
import './MyPayslips.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const MyPayslips = () => {
    const { isDarkMode, gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');
    const currentUser = authService.getCurrentUser();

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchMyPayrolls();
    }, []);

    const fetchMyPayrolls = async () => {
        setLoading(true);
        try {
            const data = await payrollService.getMyPayrolls();
            setPayrolls(data);
        } catch (error) {
            const errorMsg = error.response?.data || 'Failed to fetch your payslips';
            alertService.showToast(typeof errorMsg === 'string' ? errorMsg : 'Failed to fetch your payslips', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleViewPayslip = (payroll) => {
        setSelectedPayroll(payroll);
        setShowModal(true);
    };

    const columnDefs = useMemo(() => [
        { 
            headerName: 'Period',
            valueGetter: (params) => {
                const monthName = months[params.data.payrollRun.month - 1];
                return `${monthName} ${params.data.payrollRun.year}`;
            },
            flex: 1
        },
        { 
            headerName: 'Net Salary', 
            field: 'netSalary',
            valueFormatter: (params) => `₹${params.value?.toLocaleString('en-IN')}`,
            cellClass: 'fw-bold',
            flex: 1
        },
        { 
            headerName: 'Status', 
            field: 'paymentStatus',
            cellRenderer: (params) => (
                <Badge bg={params.value === 1 ? 'success' : 'warning'} className="bg-opacity-10 text-success border-0">
                    {params.value === 1 ? 'Paid' : 'Processed'}
                </Badge>
            ),
            flex: 0.8
        },
        {
            headerName: 'Action',
            cellRenderer: (params) => (
                <Button 
                    variant="link" 
                    size="sm" 
                    className="text-primary fw-bold p-0"
                    onClick={() => handleViewPayslip(params.data)}
                >
                    <i className="fas fa-file-invoice me-1"></i> View Payslip
                </Button>
            ),
            width: 150
        }
    ], [payrolls]);

    return (
        <Container fluid className="payslips-container py-4">
            <div className="payslip-summary-card mb-4">
                <Row className="align-items-center">
                    <Col md={8}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h2 className="fw-bold mb-2">My Payslips</h2>
                                <p className="mb-0 opacity-75">View and download your monthly salary statements</p>
                            </div>
                            <div className="search-box-wrapper shadow-sm ms-4" style={{ minWidth: '300px' }}>
                                <i className="fas fa-search search-icon text-muted"></i>
                                <Form.Control
                                    type="text"
                                    placeholder="Search payslips..."
                                    className="search-input border-0"
                                    value={quickFilterText}
                                    onChange={(e) => setQuickFilterText(e.target.value)}
                                />
                            </div>
                        </div>
                    </Col>
                    <Col md={4} className="text-md-end mt-3 mt-md-0">
                        <div className="d-inline-block text-start bg-white bg-opacity-10 p-3 rounded-3 border border-white border-opacity-25">
                            <small className="d-block opacity-75">Latest Net Pay</small>
                            <h3 className="fw-bold mb-0">
                                ₹{payrolls[0]?.netSalary?.toLocaleString('en-IN') || '0.00'}
                            </h3>
                        </div>
                    </Col>
                </Row>
            </div>

            <GridContainer title="Payment History" loading={loading}>
                <AgGridReact
                    rowData={payrolls}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    theme={gridTheme}
                    suppressCellFocus={suppressCellFocus}
                    quickFilterText={quickFilterText}
                />
            </GridContainer>

            {/* Payslip View Modal */}
            <Modal 
                show={showModal} 
                onHide={() => setShowModal(false)} 
                size="lg" 
                className="payslip-details-modal"
                centered
            >
                <div className="payslip-header text-center py-4 bg-light border-bottom">
                    <div className="company-logo fw-bold text-primary mb-2" style={{ letterSpacing: '2px' }}>HR CORE</div>
                    <h4 className="fw-bold mb-0">PAYSLIP STATEMENT</h4>
                    <p className="text-muted small mb-0">
                        For the period of {selectedPayroll && months[selectedPayroll.payrollRun.month - 1]} {selectedPayroll?.payrollRun.year}
                    </p>
                </div>
                <Modal.Body className="payslip-body p-4">
                    <Row className="mb-4">
                        <Col sm={6}>
                            <h6 className="text-muted small fw-bold text-uppercase mb-2">Employee Details</h6>
                            <div className="fw-bold fs-5">{selectedPayroll?.employee?.firstName} {selectedPayroll?.employee?.lastName}</div>
                            <div className="text-muted small fw-bold mb-1">{selectedPayroll?.employee?.position?.positionTitle}</div>
                            <div className="text-muted small">{selectedPayroll?.employee?.department?.departmentName}</div>
                            <div className="small text-muted">ID: EMP-{selectedPayroll?.employeeId}</div>
                        </Col>
                        <Col sm={6} className="text-sm-end">
                            <h6 className="text-muted small fw-bold text-uppercase mb-2">Payment Details</h6>
                            <div className="small">Pay Date: <strong>{selectedPayroll?.payrollRun?.processedDate ? moment(selectedPayroll.payrollRun.processedDate).format('DD MMM YYYY') : 'N/A'}</strong></div>
                            <div className="small">Working Days: <strong>{selectedPayroll?.daysWorked}</strong></div>
                            <div className="small">Loss of Pay Days: <strong>{selectedPayroll?.lossOfPayDays}</strong></div>
                        </Col>
                    </Row>

                    <Row className="mb-4">
                        <Col md={6}>
                            <Card className="border-0 shadow-sm mb-3">
                                <Card.Header className="bg-transparent border-0 py-3">
                                    <h6 className="mb-0 fw-bold text-info"><i className="fas fa-plus-circle me-2"></i>Earnings</h6>
                                </Card.Header>
                                <ListGroup variant="flush">
                                    {selectedPayroll?.payrollDetails?.filter(d => d.salaryComponent.type === 0).map(item => (
                                        <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center py-2 px-3 border-0">
                                            <span className="small text-muted">{item.salaryComponent.name}</span>
                                            <span className="small fw-bold">₹{item.amount.toLocaleString('en-IN')}</span>
                                        </ListGroup.Item>
                                    ))}
                                    <ListGroup.Item className="d-flex justify-content-between align-items-center py-3 px-3 border-top bg-light bg-opacity-50">
                                        <span className="fw-bold">Total Earnings</span>
                                        <span className="fw-bold text-info">₹{selectedPayroll?.totalEarnings.toLocaleString('en-IN')}</span>
                                    </ListGroup.Item>
                                </ListGroup>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="border-0 shadow-sm mb-3">
                                <Card.Header className="bg-transparent border-0 py-3">
                                    <h6 className="mb-0 fw-bold text-warning"><i className="fas fa-minus-circle me-2"></i>Deductions</h6>
                                </Card.Header>
                                <ListGroup variant="flush">
                                    {selectedPayroll?.payrollDetails?.filter(d => d.salaryComponent.type === 1).map(item => (
                                        <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center py-2 px-3 border-0">
                                            <span className="small text-muted">{item.salaryComponent.name}</span>
                                            <span className="small fw-bold">₹{item.amount.toLocaleString('en-IN')}</span>
                                        </ListGroup.Item>
                                    ))}
                                    <ListGroup.Item className="d-flex justify-content-between align-items-center py-3 px-3 border-top bg-light bg-opacity-50">
                                        <span className="fw-bold">Total Deductions</span>
                                        <span className="fw-bold text-warning">₹{selectedPayroll?.totalDeductions.toLocaleString('en-IN')}</span>
                                    </ListGroup.Item>
                                </ListGroup>
                            </Card>
                        </Col>
                    </Row>

                    <div className="net-salary-section bg-primary bg-opacity-10 rounded-4 p-4 d-flex justify-content-between align-items-center border border-primary border-opacity-25">
                        <div>
                            <div className="small fw-bold text-primary text-uppercase" style={{ letterSpacing: '1px' }}>Net Salary Payable</div>
                            <h2 className="fw-bold mb-0 text-primary">₹{selectedPayroll?.netSalary.toLocaleString('en-IN')}</h2>
                        </div>
                        <div className="text-end">
                            <Badge bg={selectedPayroll?.paymentStatus === 1 ? 'success' : 'primary'} className="rounded-pill px-3 py-2 mb-2">
                                {selectedPayroll?.paymentStatus === 1 ? 'PAID' : 'PROCESSED'}
                            </Badge>
                            <div className="small text-muted">
                                {selectedPayroll?.paymentStatus === 1 ? 'Bank Transfer' : 'Direct Deposit'}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 p-4 pt-0">
                    <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                        Close Window
                    </Button>
                    <Button variant="outline-primary" className="fw-bold px-4 rounded-pill" onClick={() => window.print()}>
                        <i className="fas fa-print me-2"></i> Print Statement
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MyPayslips;

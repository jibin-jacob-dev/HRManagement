import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Button, Card, Badge, Form, Modal, Spinner } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { payrollService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';
import moment from 'moment';
import './PayrollProcessing.css';

import Select from 'react-select';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const PayrollProcessing = () => {
    const { isDarkMode, gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const { canEdit } = usePermission('/payroll-processing');
    
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Details Modal State
    const [showDetails, setShowDetails] = useState(false);
    const [selectedRun, setSelectedRun] = useState(null);
    const [runDetails, setRunDetails] = useState([]);

    const [quickFilterText, setQuickFilterText] = useState('');
    const [detailSearchText, setDetailSearchText] = useState('');

    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' },
        { value: 3, label: 'March' }, { value: 4, label: 'April' },
        { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' },
        { value: 9, label: 'September' }, { value: 10, label: 'October' },
        { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() }));

    const reactSelectStyles = {
        control: (base) => ({
            ...base,
            minHeight: '48px',
            borderRadius: '10px',
            borderColor: 'rgba(0,0,0,0.1)',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#0d6efd'
            }
        }),
        menu: (base) => ({
            ...base,
            zIndex: 9999
        })
    };

    useEffect(() => {
        fetchRuns();
    }, []);

    const fetchRuns = async () => {
        setLoading(true);
        try {
            const data = await payrollService.getPayrollRuns();
            setRuns(data);
        } catch (error) {
            alertService.showToast('Failed to fetch payroll runs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        if (!canEdit) {
            alertService.showToast('You do not have permission to process payroll', 'error');
            return;
        }

        const monthLabel = months.find(m => m.value === selectedMonth)?.label;
        const confirm = await alertService.showConfirm(
            'Process Payroll?',
            `Are you sure you want to process payroll for ${monthLabel} ${selectedYear}?`,
            'Yes, Process It',
            'question',
            '#0d6efd' // Primary blue
        );
        
        if (!confirm) return;

        setProcessing(true);
        try {
            await payrollService.processPayroll(selectedMonth, selectedYear);
            alertService.showToast('Payroll processed successfully');
            fetchRuns();
        } catch (error) {
            const msg = error.response?.data || 'Failed to process payroll';
            alertService.showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleViewDetails = async (run) => {
        setSelectedRun(run);
        try {
            const details = await payrollService.getPayrollRunDetails(run.id);
            setRunDetails(details.employeePayrolls || []);
            setShowDetails(true);
        } catch (error) {
            alertService.showToast('Failed to fetch run details', 'error');
        }
    };

    const handleFinalize = async (id) => {
        if (!canEdit) {
            alertService.showToast('You do not have permission to finalize payroll', 'error');
            return;
        }

        const confirm = await alertService.showConfirm(
            'Finalize Payroll?',
            'Once finalized, payroll records cannot be modified or deleted. Proceed?',
            'Yes, Finalize',
            'warning',
            '#198754' // Success green
        );
        
        if (!confirm) return;

        try {
            await payrollService.finalizePayroll(id);
            alertService.showToast('Payroll finalized successfully');
            fetchRuns();
        } catch (error) {
            const msg = error.response?.data || 'Failed to finalize payroll';
            alertService.showToast(msg, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!canEdit) {
            alertService.showToast('You do not have permission to delete payroll', 'error');
            return;
        }

        const confirm = await alertService.showConfirm(
            'Delete Payroll Run?',
            'Are you sure you want to delete this payroll run? All associated records will be removed.',
            'Yes, Delete',
            'warning',
            '#d33' // Danger red
        );
        
        if (!confirm) return;

        try {
            await payrollService.deletePayrollRun(id);
            alertService.showToast('Payroll run deleted successfully');
            fetchRuns();
        } catch (error) {
            const msg = error.response?.data || 'Failed to delete payroll run';
            alertService.showToast(msg, 'error');
        }
    };

    const columnDefs = useMemo(() => [
        { 
            headerName: 'Period',
            valueGetter: (params) => {
                const monthName = months.find(m => m.value === params.data.month)?.label;
                return `${monthName} ${params.data.year}`;
            },
            flex: 1
        },
        { 
            headerName: 'Processed Date', 
            field: 'processedDate',
            valueFormatter: (params) => moment(params.value).format('DD MMM YYYY, h:mm A'),
            flex: 1
        },
        { 
            headerName: 'Total Payout', 
            field: 'totalPayout',
            valueFormatter: (params) => `₹${params.value?.toLocaleString('en-IN')}`,
            cellClass: 'amount-column',
            flex: 1
        },
        { 
            headerName: 'Status', 
            field: 'status',
            cellRenderer: (params) => {
                const isFinalized = params.value === 1; // Finalized
                return (
                    <span className={`status-badge ${isFinalized ? 'status-finalized' : 'status-draft'}`}>
                        {isFinalized ? 'Finalized' : 'Draft'}
                    </span>
                );
            },
            flex: 0.8
        },
        {
            headerName: 'Actions',
            cellRenderer: (params) => (
                <div className="d-flex gap-2 align-items-center h-100">
                    <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="btn-action"
                        onClick={() => handleViewDetails(params.data)}
                        title="View Details"
                    >
                        <i className="fas fa-eye"></i>
                    </Button>
                    {params.data.status === 0 && ( // Draft
                        <>
                            <Button 
                                variant="outline-success" 
                                size="sm" 
                                className="btn-action"
                                onClick={() => handleFinalize(params.data.id)}
                                title="Finalize"
                            >
                                <i className="fas fa-check"></i>
                            </Button>
                            <Button 
                                variant="outline-danger" 
                                size="sm" 
                                className="btn-action"
                                onClick={() => handleDelete(params.data.id)}
                                title="Delete"
                            >
                                <i className="fas fa-trash"></i>
                            </Button>
                        </>
                    )}
                </div>
            ),
            width: 150,
            sortable: false,
            filter: false
        }
    ], [runs]);

    const detailsColumnDefs = useMemo(() => [
        { 
            headerName: 'Employee', 
            field: 'employee',
            valueGetter: (params) => `${params.data.employee?.firstName} ${params.data.employee?.lastName}`,
            flex: 1.5
        },
        { headerName: 'Days', field: 'daysWorked', width: 80 },
        { 
            headerName: 'Earnings', 
            field: 'totalEarnings',
            valueFormatter: (params) => `₹${params.value?.toLocaleString('en-IN')}`,
            cellClass: 'text-success fw-bold',
            flex: 1
        },
        { 
            headerName: 'Deductions', 
            field: 'totalDeductions',
            valueFormatter: (params) => `₹${params.value?.toLocaleString('en-IN')}`,
            cellClass: 'text-danger fw-bold',
            flex: 1
        },
        { 
            headerName: 'Net Salary', 
            field: 'netSalary',
            valueFormatter: (params) => `₹${params.value?.toLocaleString('en-IN')}`,
            cellClass: 'fw-bold',
            flex: 1
        }
    ], []);

    return (
        <Container fluid className="payroll-container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">Payroll Processing</h2>
                    <p className="text-muted small mb-0">Manage monthly salary processing and generate payslips</p>
                </div>
                <div className="search-box-wrapper shadow-sm">
                    <i className="fas fa-search search-icon text-muted"></i>
                    <Form.Control
                        type="text"
                        placeholder="Search payroll runs..."
                        className="search-input border-0"
                        value={quickFilterText}
                        onChange={(e) => setQuickFilterText(e.target.value)}
                    />
                </div>
            </div>

            <Row>
                <Col lg={3}>
                    <Card className="processing-card shadow-sm border-0">
                        <Card.Body>
                            <h5 className="fw-bold mb-4">Run New Payroll</h5>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">Month</Form.Label>
                                <Select
                                    options={months}
                                    value={months.find(m => m.value === selectedMonth)}
                                    onChange={(option) => setSelectedMonth(option.value)}
                                    styles={reactSelectStyles}
                                    classNamePrefix="react-select"
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-muted text-uppercase">Year</Form.Label>
                                <Select
                                    options={years}
                                    value={years.find(y => y.value === selectedYear)}
                                    onChange={(option) => setSelectedYear(option.value)}
                                    styles={reactSelectStyles}
                                    classNamePrefix="react-select"
                                />
                            </Form.Group>
                            <Button 
                                variant="primary" 
                                className="w-100 py-3 fw-bold rounded-3 shadow-sm"
                                onClick={handleProcess}
                                disabled={processing || !canEdit}
                            >
                                {processing ? (
                                    <><Spinner animation="border" size="sm" className="me-2" /> Processing...</>
                                ) : (
                                    <><i className="fas fa-play me-2"></i> Process Payroll</>
                                )}
                            </Button>
                            <div className="mt-3 p-3 rounded-3 bg-info bg-opacity-10 border border-info border-opacity-25">
                                <small className="text-info d-block">
                                    <i className="fas fa-info-circle me-1"></i> 
                                    Processing will calculate salaries based on active salary structures and attendance.
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={9}>
                    <GridContainer title="Recent Payroll Runs" loading={loading}>
                        <AgGridReact
                            rowData={runs}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            theme={gridTheme}
                            suppressCellFocus={suppressCellFocus}
                            pagination={true}
                            paginationPageSize={10}
                            quickFilterText={quickFilterText}
                        />
                    </GridContainer>
                </Col>
            </Row>

            {/* Run Details Modal */}
            <Modal 
                show={showDetails} 
                onHide={() => setShowDetails(false)} 
                size="xl"
                className="payroll-details-modal"
                centered
            >
                <Modal.Header closeButton className="border-0 pb-0 card-header-custom">
                    <div className="w-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <Modal.Title className="fw-bold">
                                    {selectedRun && months.find(m => m.value === selectedRun.month).label} {selectedRun?.year}
                                </Modal.Title>
                                <p className="text-muted small mb-0">
                                    <i className="fas fa-calendar-alt me-2"></i>
                                    Processed: {moment(selectedRun?.processedDate).format('DD MMM YYYY, h:mm A')}
                                </p>
                            </div>
                            <div className="text-end">
                                <h3 className="fw-bold text-success mb-0">₹{selectedRun?.totalPayout?.toLocaleString('en-IN')}</h3>
                                <small className="text-muted text-uppercase fw-bold">Total Payout</small>
                            </div>
                        </div>
                        <div className="search-box-wrapper shadow-sm w-100">
                            <i className="fas fa-search search-icon text-muted"></i>
                            <Form.Control
                                type="text"
                                placeholder="Search employees in this run..."
                                className="search-input border-0 bg-light"
                                autoFocus
                                onChange={(e) => {
                                    // Use AG Grid filter API if available, or simpler quickFilter prop approach
                                    // Since we can't easily access the grid API ref here without rewriting, 
                                    // we'll update a new state variable specifically for this modal's grid
                                    setDetailSearchText(e.target.value); 
                                }}
                            />
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <div className="payroll-details-grid" style={{ height: '60vh' }}>
                        <AgGridReact
                            rowData={runDetails}
                            columnDefs={detailsColumnDefs}
                            defaultColDef={defaultColDef}
                            theme={gridTheme}
                            suppressCellFocus={suppressCellFocus}
                            pagination={true}
                            paginationPageSize={10}
                            quickFilterText={detailSearchText}
                            rowHeight={50}
                            headerHeight={48}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light">
                    <Button variant="link" className="text-decoration-none text-muted me-auto" onClick={() => setShowDetails(false)}>
                        Close
                    </Button>
                    <Button variant="outline-primary" size="sm" onClick={() => {/* Placeholder for export */}}>
                        <i className="fas fa-download me-2"></i> Export Report
                    </Button>
                    {selectedRun?.status === 0 && canEdit && ( // Draft
                         <Button 
                            variant="success" 
                            size="sm"
                            className="fw-bold px-4"
                            onClick={() => {
                                setShowDetails(false);
                                handleFinalize(selectedRun.id);
                            }}
                        >
                            <i className="fas fa-check-circle me-2"></i> Finalize This Run
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PayrollProcessing;

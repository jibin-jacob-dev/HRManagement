import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { leaveService, leaveTypeService, leaveBalanceService, employeeProfileService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import moment from 'moment';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select'; // Import React Select
import './LeaveManagement.css'; // Shared Styles

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const LeaveRequests = () => {
    const { gridTheme, defaultColDef, suppressCellFocus, isDarkMode } = useGridSettings();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quickFilterText, setQuickFilterText] = useState(''); // Add Filter State
    
    // Modal & Data States
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [calculatedDays, setCalculatedDays] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [typesData, profileData, leavesData] = await Promise.all([
                leaveTypeService.getLeaveTypes(),
                employeeProfileService.getProfile(),
                leaveService.getMyLeaves()
            ]);

            setLeaveTypes(Array.isArray(typesData) ? typesData : []);
            setLeaves(Array.isArray(leavesData) ? leavesData : []);
            
            if (profileData?.employeeId) {
                const balances = await leaveBalanceService.getLeaveBalances(profileData.employeeId);
                setLeaveBalances(Array.isArray(balances) ? balances : []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            alertService.showToast('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaves = async () => {
        try {
            const data = await leaveService.getMyLeaves();
            setLeaves(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        }
    };

    const calculateDays = async (start, end) => {
        try {
            const s = moment(start).format('YYYY-MM-DD');
            const e = moment(end).format('YYYY-MM-DD');
            const result = await leaveService.calculateDays(s, e);
            setCalculatedDays(result);
        } catch (error) {
            console.error('Calculation error', error);
        }
    };

    const formik = useFormik({
        initialValues: {
            leaveTypeId: '',
            startDate: new Date(),
            endDate: new Date(),
            reason: ''
        },
        validationSchema: Yup.object({
            leaveTypeId: Yup.number().required('Leave type is required'),
            startDate: Yup.date().required('Start date is required'),
            endDate: Yup.date()
                .required('End date is required')
                .min(Yup.ref('startDate'), 'End date cannot be before start date'),
            reason: Yup.string().required('Reason is required')
        }),
        onSubmit: async (values) => {
            try {
                if (calculatedDays && calculatedDays.totalDays <= 0) {
                    alertService.showToast('Selected period has 0 working days.', 'warning');
                    return;
                }
                const payload = {
                    leaveTypeId: parseInt(values.leaveTypeId),
                    startDate: moment(values.startDate).format('YYYY-MM-DD'),
                    endDate: moment(values.endDate).format('YYYY-MM-DD'),
                    reason: values.reason
                };
                await leaveService.applyLeave(payload);
                alertService.showToast('Leave request submitted successfully');
                setShowApplyModal(false);
                fetchLeaves();
            } catch (error) {
                console.error('Submit error:', error);
                 const msg = error.response?.data || 'Failed to submit application';
                alertService.showToast(msg, 'error');
            }
        }
    });

    useEffect(() => {
        if (formik.values.startDate && formik.values.endDate && showApplyModal) {
             if (moment(formik.values.endDate).isSameOrAfter(moment(formik.values.startDate))) {
                 calculateDays(formik.values.startDate, formik.values.endDate);
             }
        }
    }, [formik.values.startDate, formik.values.endDate, showApplyModal]);

    const selectedBalance = useMemo(() => {
        if (!formik.values.leaveTypeId) return null;
        const typeId = parseInt(formik.values.leaveTypeId);
        const year = moment(formik.values.startDate).year();
        return leaveBalances.find(b => b.leaveTypeId === typeId && b.year === year);
    }, [formik.values.leaveTypeId, leaveBalances, formik.values.startDate]);

    const cancelLeave = async (id) => {
        if (await alertService.showConfirm('Cancel Leave?', 'Are you sure?')) {
            try {
                await leaveService.deleteLeave(id);
                alertService.showToast('Leave cancelled');
                fetchLeaves();
            } catch (error) {
                 alertService.showToast('Failed to cancel', 'error');
            }
        }
    };

    const columnDefs = useMemo(() => [
        // Match UserManagement styling
        { field: 'leaveId', headerName: 'ID', width: 80, hide: true },
        { 
            field: 'leaveTypeName', headerName: 'Type', width: 150, sortable: true, filter: true, 
            cellClass: 'd-flex align-items-center fw-medium' 
        },
        { 
            field: 'startDate', headerName: 'Start', width: 120, sortable: true,
            valueFormatter: p => moment(p.value).format('MMM DD, YYYY'),
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'endDate', headerName: 'End', width: 120, sortable: true,
            valueFormatter: p => moment(p.value).format('MMM DD, YYYY'),
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'days', headerName: 'Days', width: 100, 
            cellClass: 'd-flex align-items-center fw-bold text-center' 
        },
        { 
            field: 'reason', headerName: 'Reason', flex: 1, 
            cellClass: 'd-flex align-items-center' 
        },
        { 
            field: 'status', headerName: 'Status', width: 130,
            cellRenderer: (params) => {
                const color = params.value === 'Approved' ? 'success' : params.value === 'Rejected' ? 'danger' : 'warning';
                return (
                    <div className="d-flex h-100 align-items-center">
                        <Badge bg={color} className={`bg-opacity-10 text-${color} border border-${color} rounded-pill px-3`}>
                            {params.value}
                        </Badge>
                    </div>
                );
            }
        },
        {
            headerName: 'Actions', width: 120,
            cellRenderer: (params) => {
                if (params.data.status !== 'Pending') return null;
                return (
                    <div className="d-flex h-100 align-items-center justify-content-center">
                        <Button 
                            variant="link" 
                            className="p-0 grid-action-btn text-danger" 
                            onClick={() => cancelLeave(params.data.leaveId)} 
                            title="Cancel Request"
                        >
                            <i className="fas fa-trash"></i>
                        </Button>
                    </div>
                );
            }
        }
    ], []);

    // Memoize Default Col Def
    const defaultColDefMemo = useMemo(() => defaultColDef, [defaultColDef]);

    return (
        <Container fluid className="leave-management-container page-animate p-0">
             <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">My Leave Applications</h2>
                    <p className="text-muted small mb-0">Total requests: <span className="fw-bold text-primary">{leaves.length}</span></p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            className="search-input"
                            placeholder="Search requests..."
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" className="px-4 shadow-sm" onClick={() => { formik.resetForm(); setShowApplyModal(true); }}>
                        <i className="fas fa-plus me-2"></i> Apply for Leave
                    </Button>
                </div>
            </div>

            <GridContainer>
                {loading ? (
                    <div className="d-flex h-100 justify-content-center align-items-center">
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                            <p className="text-muted fw-bold">Loading Data...</p>
                        </div>
                    </div>
                ) : (
                    <AgGridReact
                        rowData={leaves}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDefMemo}
                        animateRows={true}
                        pagination={true}
                        paginationPageSize={10}
                        quickFilterText={quickFilterText} // Connected Filter
                        rowHeight={60} // Matches UserManagement
                        headerHeight={52} // Matches UserManagement
                        theme={gridTheme}
                        suppressCellFocus={suppressCellFocus}
                    />
                )}
            </GridContainer>

            {/* Modal - Kept Same */}
            <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)} backdrop="static" centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Apply for Leave</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={formik.handleSubmit}>
                        <Row className="g-4">
                            <Col md={7}>
                                <div className="mb-4">
                                    <Form.Label className="modal-form-label">Leave Type</Form.Label>
                                    <Select 
                                        name="leaveTypeId"
                                        options={leaveTypes.map(lt => ({ value: lt.leaveTypeId, label: lt.name }))}
                                        value={leaveTypes.map(lt => ({ value: lt.leaveTypeId, label: lt.name }))
                                            .find(option => option.value === parseInt(formik.values.leaveTypeId))}
                                        onChange={(option) => formik.setFieldValue('leaveTypeId', option ? option.value : '')}
                                        classNamePrefix="react-select"
                                        placeholder="Select Leave Type..."
                                        styles={{
                                            control: (base, state) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#2b3035' : '#ffffff',
                                                borderColor: isDarkMode ? '#495057' : '#dee2e6',
                                                borderRadius: '8px',
                                                padding: '2px',
                                                boxShadow: state.isFocused ? (isDarkMode ? '0 0 0 4px rgba(13, 110, 253, 0.25)' : '0 0 0 4px rgba(13, 110, 253, 0.1)') : 'none',
                                                '&:hover': {
                                                    borderColor: isDarkMode ? '#6c757d' : '#0d6efd'
                                                }
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#2b3035' : '#ffffff',
                                                zIndex: 9999
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isSelected 
                                                    ? '#0d6efd' 
                                                    : state.isFocused 
                                                        ? (isDarkMode ? '#3d4246' : '#f8f9fa') 
                                                        : 'transparent',
                                                color: state.isSelected ? '#ffffff' : (isDarkMode ? '#dee2e6' : '#212529'),
                                                '&:active': {
                                                    backgroundColor: '#0d6efd'
                                                }
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#dee2e6' : '#212529'
                                            }),
                                            placeholder: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#adb5bd' : '#6c757d'
                                            })
                                        }}
                                    />
                                    {formik.touched.leaveTypeId && formik.errors.leaveTypeId && (
                                        <div className="text-danger small mt-1">{formik.errors.leaveTypeId}</div>
                                    )}
                                </div>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="modal-form-label">Start Date</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={formik.values.startDate}
                                                    onChange={date => formik.setFieldValue('startDate', date)}
                                                    className="form-control"
                                                    dateFormat="MMM d, yyyy"
                                                    placeholderText="Select start date"
                                                    portalId="datepicker-portal"
                                                    popperPlacement="bottom-start"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="modal-form-label">End Date</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={formik.values.endDate}
                                                    onChange={date => formik.setFieldValue('endDate', date)}
                                                    className="form-control"
                                                    dateFormat="MMM d, yyyy"
                                                    minDate={formik.values.startDate}
                                                    placeholderText="Select end date"
                                                    portalId="datepicker-portal"
                                                    popperPlacement="bottom-start"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Col>

                            <Col md={5}>
                                <div className={`balance-card ${!selectedBalance || selectedBalance.remainingDays <= 0 ? 'low-balance' : 'has-balance'}`}>
                                    <small className="text-body-secondary text-uppercase fw-bold text-center" style={{fontSize: '0.7rem', letterSpacing: '0.1em'}}>Available Balance</small>
                                    <div className="balance-value">
                                        {selectedBalance ? selectedBalance.remainingDays : '-'}
                                    </div>
                                    <small className="text-body-secondary fw-bold">Days Remaining</small>
                                    
                                    {calculatedDays && (
                                        <div className="mt-3 pt-3 border-top w-100 text-center">
                                            <small className="d-block text-body-secondary mb-1" style={{fontSize: '0.75rem'}}>After Request</small>
                                            <div className={`fw-bold ${selectedBalance && (selectedBalance.remainingDays - calculatedDays.totalDays < 0) ? 'text-danger' : ''}`} style={{fontSize: '1.2rem'}}>
                                                {selectedBalance ? (selectedBalance.remainingDays - calculatedDays.totalDays) : '-'} <small className="text-body-secondary fw-normal" style={{fontSize: '0.8rem'}}>days</small>
                                            </div>
                                            <div className="badge bg-danger bg-opacity-10 text-danger border border-danger rounded-pill mt-2">
                                                -{calculatedDays.totalDays} Days
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>

                        <Form.Group className="mt-3">
                            <Form.Label className="modal-form-label">Reason for Leave</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={3} 
                                name="reason"
                                value={formik.values.reason} 
                                onChange={formik.handleChange}
                                isInvalid={formik.touched.reason && !!formik.errors.reason}
                                placeholder="Please provide a brief reason..."
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowApplyModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={formik.handleSubmit} disabled={loading}>
                         Submit Application
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default LeaveRequests;

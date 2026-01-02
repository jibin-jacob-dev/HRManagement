import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { leaveService, userService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import moment from 'moment';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { usePermission } from '../hooks/usePermission';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const LeaveManagement = () => {
    const { canEdit } = usePermission('/leave-management');
    const { gridTheme, defaultColDef, suppressCellFocus, isDarkMode } = useGridSettings();
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [approvalAction, setApprovalAction] = useState('approve');
    const [quickFilterText, setQuickFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    const [formData, setFormData] = useState({
        employeeId: '',
        leaveType: 'Sick',
        startDate: new Date(),
        endDate: new Date(),
        reason: ''
    });

    const [approvalComments, setApprovalComments] = useState('');

    useEffect(() => {
        fetchData();
        fetchEmployees();
    }, [statusFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await leaveService.getLeaves(statusFilter);
            setLeaves(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching leaves:', error);
            alertService.showToast('Failed to fetch leave records', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await userService.getUsers();
            const employeeList = Array.isArray(data) ? data : (data.value || []);
            setEmployees(employeeList);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleAdd = () => {
        setModalMode('add');
        setSelectedLeave(null);
        setFormData({
            employeeId: '',
            leaveType: 'Sick',
            startDate: new Date(),
            endDate: new Date(),
            reason: ''
        });
        setShowModal(true);
    };

    const handleEdit = (leave) => {
        setModalMode('edit');
        setSelectedLeave(leave);
        setFormData({
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            startDate: new Date(leave.startDate),
            endDate: new Date(leave.endDate),
            reason: leave.reason || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                employeeId: parseInt(formData.employeeId),
                startDate: moment(formData.startDate).format('YYYY-MM-DD'),
                endDate: moment(formData.endDate).format('YYYY-MM-DD')
            };

            if (modalMode === 'add') {
                await leaveService.createLeave(payload);
                alertService.showToast('Leave request created successfully');
            } else {
                await leaveService.updateLeave(selectedLeave.leaveId, payload);
                alertService.showToast('Leave request updated successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving leave:', error);
            alertService.showToast('Failed to save leave request', 'error');
        }
    };

    const handleApprovalClick = (leave, action) => {
        setSelectedLeave(leave);
        setApprovalAction(action);
        setApprovalComments('');
        setShowApprovalModal(true);
    };

    const handleApprovalSubmit = async () => {
        try {
            if (approvalAction === 'approve') {
                await leaveService.approveLeave(selectedLeave.leaveId, approvalComments);
                alertService.showToast('Leave approved successfully', 'success');
            } else {
                await leaveService.rejectLeave(selectedLeave.leaveId, approvalComments);
                alertService.showToast('Leave rejected successfully', 'info');
            }
            setShowApprovalModal(false);
            fetchData();
        } catch (error) {
            console.error('Error processing leave:', error);
            alertService.showToast('Failed to process leave request', 'error');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Leave?',
            'Are you sure you want to delete this leave request?'
        );

        if (confirmed) {
            try {
                await leaveService.deleteLeave(id);
                alertService.showToast('Leave request deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Error deleting leave:', error);
                alertService.showToast('Failed to delete leave request', 'error');
            }
        }
    };

    const columnDefs = useMemo(() => [
        { 
            field: 'employeeName', 
            headerName: 'Employee', 
            sortable: true, 
            filter: true,
            flex: 1,
            cellClass: 'd-flex align-items-center fw-medium'
        },
        { 
            field: 'leaveType', 
            headerName: 'Type', 
            sortable: true, 
            filter: true,
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'startDate', 
            headerName: 'Start Date', 
            sortable: true, 
            filter: true,
            valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'endDate', 
            headerName: 'End Date', 
            sortable: true,
            valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'days', 
            headerName: 'Days', 
            sortable: true,
            width: 100,
            cellClass: 'd-flex align-items-center fw-bold text-primary'
        },
        { 
            field: 'status', 
            headerName: 'Status', 
            sortable: true,
            filter: true,
            cellRenderer: (params) => {
                const statusColors = {
                    'Pending': 'warning',
                    'Approved': 'success',
                    'Rejected': 'danger'
                };
                const color = statusColors[params.value] || 'secondary';
                return (
                    <div className="d-flex h-100 align-items-center">
                        <Badge className={`bg-${color} bg-opacity-10 text-${color} border border-${color}`}>
                            {params.value}
                        </Badge>
                    </div>
                );
            }
        },
        {
            headerName: 'Actions',
            width: 180,
            sortable: false,
            filter: false,
            cellRenderer: (params) => {
                const isPending = params.data.status === 'Pending';
                return (
                    <div className="d-flex gap-2 h-100 align-items-center justify-content-center">
                        {canEdit && isPending && (
                            <>
                                <Button 
                                    variant="link" 
                                    className="p-0 grid-action-btn text-success" 
                                    onClick={() => handleApprovalClick(params.data, 'approve')}
                                    title="Approve"
                                >
                                    <i className="fas fa-check-circle"></i>
                                </Button>
                                <Button 
                                    variant="link" 
                                    className="p-0 grid-action-btn text-danger" 
                                    onClick={() => handleApprovalClick(params.data, 'reject')}
                                    title="Reject"
                                >
                                    <i className="fas fa-times-circle"></i>
                                </Button>
                            </>
                        )}
                        {canEdit && isPending && (
                            <>
                                <Button 
                                    variant="link" 
                                    className="p-0 grid-action-btn text-primary" 
                                    onClick={() => handleEdit(params.data)}
                                    title="Edit"
                                >
                                    <i className="fas fa-edit"></i>
                                </Button>
                                <Button 
                                    variant="link" 
                                    className="p-0 grid-action-btn text-danger" 
                                    onClick={() => handleDelete(params.data.leaveId)}
                                    title="Delete"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </Button>
                            </>
                        )}
                    </div>
                );
            }
        }
    ], [canEdit]);

    return (
        <Container fluid className="leave-management-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Leave Management</h2>
                    <p className="text-muted small mb-0">Total requests: <span className="fw-bold text-primary">{leaves.length}</span></p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ width: '150px' }}
                    >
                        <option value="">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </Form.Select>
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
                    {canEdit && (
                        <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                            <i className="fas fa-plus me-2"></i>
                            Add Leave
                        </Button>
                    )}
                </div>
            </div>

            <GridContainer>
                {loading ? (
                    <div className="d-flex h-100 justify-content-center align-items-center">
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                            <p className="text-muted fw-bold">Loading Leave Requests...</p>
                        </div>
                    </div>
                ) : (
                    <AgGridReact
                        rowData={leaves}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        animateRows={true}
                        pagination={true}
                        paginationPageSize={10}
                        quickFilterText={quickFilterText}
                        rowHeight={55}
                        headerHeight={50}
                        theme={gridTheme}
                        suppressCellFocus={suppressCellFocus}
                    />
                )}
            </GridContainer>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{modalMode === 'add' ? 'Add Leave Request' : 'Edit Leave Request'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Employee</Form.Label>
                            <Form.Select
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                disabled={modalMode === 'edit'}
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Leave Type</Form.Label>
                            <Form.Select
                                value={formData.leaveType}
                                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                            >
                                <option value="Sick">Sick Leave</option>
                                <option value="Vacation">Vacation</option>
                                <option value="Personal">Personal</option>
                                <option value="Emergency">Emergency</option>
                            </Form.Select>
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">Start Date *</Form.Label>
                                <div className="datepicker-wrapper">
                                    <DatePicker
                                        selected={formData.startDate}
                                        onChange={(date) => setFormData({ ...formData, startDate: date })}
                                        dateFormat="MMMM d, yyyy"
                                        className="form-control border-2"
                                        placeholderText="Start date"
                                        showMonthDropdown
                                        showYearDropdown
                                        dropdownMode="select"
                                        required
                                        portalId="root"
                                    />
                                    <i className="fas fa-calendar-alt"></i>
                                </div>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">End Date *</Form.Label>
                                <div className="datepicker-wrapper">
                                    <DatePicker
                                        selected={formData.endDate}
                                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                                        dateFormat="MMMM d, yyyy"
                                        className="form-control border-2"
                                        placeholderText="End date"
                                        showMonthDropdown
                                        showYearDropdown
                                        dropdownMode="select"
                                        required
                                        minDate={formData.startDate}
                                        portalId="root"
                                    />
                                    <i className="fas fa-calendar-alt"></i>
                                </div>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Reason</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Reason for leave..."
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>
                        {modalMode === 'add' ? 'Submit Request' : 'Save Changes'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Approval Modal */}
            <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {approvalAction === 'approve' ? 'Approve Leave' : 'Reject Leave'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-3">
                        <strong>Employee:</strong> {selectedLeave?.employeeName}<br/>
                        <strong>Type:</strong> {selectedLeave?.leaveType}<br/>
                        <strong>Period:</strong> {selectedLeave && `${new Date(selectedLeave.startDate).toLocaleDateString()} - ${new Date(selectedLeave.endDate).toLocaleDateString()}`}
                    </p>
                    <Form.Group>
                        <Form.Label>Comments (Optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={approvalComments}
                            onChange={(e) => setApprovalComments(e.target.value)}
                            placeholder="Add comments..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>Cancel</Button>
                    <Button 
                        variant={approvalAction === 'approve' ? 'success' : 'danger'} 
                        onClick={handleApprovalSubmit}
                    >
                        {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default LeaveManagement;

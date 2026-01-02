import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { leaveService, authService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import moment from 'moment';
import './LeaveManagement.css'; // Shared Styles

ModuleRegistry.registerModules([AllCommunityModule]);

const LeaveApprovals = () => {
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quickFilterText, setQuickFilterText] = useState('');
    
    // Approval States
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [approvalAction, setApprovalAction] = useState('approve');
    const [approvalComments, setApprovalComments] = useState('');

    const currentUser = authService.getCurrentUser();
    const isManagerOrAdmin = currentUser?.roles?.includes('Admin') || currentUser?.roles?.includes('HR Manager') || currentUser?.roles?.includes('Manager');

    useEffect(() => {
        if (isManagerOrAdmin) {
            fetchLeaves();
        }
    }, []);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const data = await leaveService.getTeamLeaves();
            setLeaves(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching team leaves:', error);
            alertService.showToast('Failed to fetch requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprovalClick = (leave, action) => {
        setSelectedLeave(leave);
        setApprovalAction(action);
        setApprovalComments('');
        setShowApprovalModal(true);
    };

    const submitApproval = async () => {
        try {
            if (approvalAction === 'approve') {
                await leaveService.approveLeave(selectedLeave.leaveId, approvalComments);
            } else {
                await leaveService.rejectLeave(selectedLeave.leaveId, approvalComments);
            }
            alertService.showToast(`Leave ${approvalAction}d successfully`);
            setShowApprovalModal(false);
            fetchLeaves();
        } catch (error) {
            console.error('Approval Error:', error);
            const msg = error.response?.data || 'Operation failed';
            alertService.showToast(msg, 'error');
        }
    };

    const columnDefs = useMemo(() => [
        { field: 'employeeName', headerName: 'Employee', flex: 1, sortable: true, filter: true, cellClass: 'd-flex align-items-center fw-bold' },
        { field: 'leaveTypeName', headerName: 'Type', width: 140, cellClass: 'd-flex align-items-center' },
        { field: 'startDate', headerName: 'Start', width: 110, valueFormatter: p => moment(p.value).format('MMM DD'), cellClass: 'd-flex align-items-center' },
        { field: 'endDate', headerName: 'End', width: 110, valueFormatter: p => moment(p.value).format('MMM DD'), cellClass: 'd-flex align-items-center' },
        { field: 'days', headerName: 'Days', width: 90, cellClass: 'd-flex align-items-center justify-content-center fw-bold' },
        { field: 'reason', headerName: 'Reason', flex: 1.5, tooltipField: 'reason', cellClass: 'd-flex align-items-center' },
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
            headerName: 'Actions', width: 140,
            cellRenderer: (params) => {
                if (params.data.status !== 'Pending') return null;
                return (
                    <div className="d-flex h-100 align-items-center justify-content-center gap-2">
                         <div className="grid-action-btn text-success" onClick={() => handleApprovalClick(params.data, 'approve')} title="Approve">
                             <i className="fas fa-check-circle fs-5"></i>
                         </div>
                         <div className="grid-action-btn text-danger" onClick={() => handleApprovalClick(params.data, 'reject')} title="Reject">
                             <i className="fas fa-times-circle fs-5"></i>
                         </div>
                    </div>
                );
            }
        }
    ], []);

    const defaultColDefMemo = useMemo(() => defaultColDef, [defaultColDef]);

    if (!isManagerOrAdmin) {
        return <Container className="p-5 text-center"><h3>Access Denied</h3><p>You do not have permission to view this page.</p></Container>;
    }

    return (
        <Container fluid className="leave-management-container page-animate p-0">
             <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Leave Approvals</h2>
                    <p className="text-body-secondary small mb-0">Pending requests: <span className="fw-bold text-primary">{leaves.filter(l => l.status === 'Pending').length}</span></p>
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
                </div>
            </div>

            <GridContainer>
                {loading ? (
                    <div className="d-flex h-100 justify-content-center align-items-center">
                         <div className="spinner-border text-primary" role="status"></div>
                    </div>
                ) : (
                    <AgGridReact
                        rowData={leaves}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDefMemo}
                        animateRows={true}
                        pagination={true}
                        paginationPageSize={10}
                        quickFilterText={quickFilterText}
                        rowHeight={60}
                        headerHeight={52}
                        theme={gridTheme}
                        suppressCellFocus={suppressCellFocus}
                    />
                )}
            </GridContainer>

            {/* Approval/Rejection Modal */}
            <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)} centered className="page-animate">
                <Modal.Header closeButton className="subtle-modal-header">
                    <Modal.Title className="fw-bold">
                        {approvalAction === 'approve' ? (
                            <span className="text-success"><i className="fas fa-check-circle me-2"></i>Approve Request</span>
                        ) : (
                            <span className="text-danger"><i className="fas fa-times-circle me-2"></i>Reject Request</span>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="px-4 pb-4">
                    <div className="approval-info-card">
                        <div className="row g-3">
                            <div className="col-6">
                                <span className="info-label">Employee</span>
                                <span className="info-value">{selectedLeave?.employeeName}</span>
                            </div>
                            <div className="col-6">
                                <span className="info-label">Leave Type</span>
                                <span className="info-value">{selectedLeave?.leaveTypeName}</span>
                            </div>
                            <div className="col-6">
                                <span className="info-label">Dates</span>
                                <span className="info-value">
                                    {selectedLeave && `${moment(selectedLeave.startDate).format('MMM DD')} - ${moment(selectedLeave.endDate).format('MMM DD')}`}
                                </span>
                            </div>
                            <div className="col-6">
                                <span className="info-label">Duration</span>
                                <span className="info-value text-primary">{selectedLeave?.days} Days</span>
                            </div>
                        </div>
                    </div>

                    <Form.Group className="mb-0">
                        <Form.Label className="modal-form-label">Approver Comments</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            placeholder={approvalAction === 'approve' ? "Add a note (Optional)..." : "Please provide a reason for rejection..."}
                            value={approvalComments} 
                            onChange={e => setApprovalComments(e.target.value)}
                            className="bg-light-focus"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 px-4 pb-4 pt-0">
                    <Button variant="link" className="text-decoration-none text-secondary" onClick={() => setShowApprovalModal(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant={approvalAction === 'approve' ? 'success' : 'danger'} 
                        className="px-4 shadow-sm"
                        onClick={submitApproval}
                    >
                        Confirm {approvalAction === 'approve' ? 'Approval' : 'Rejection'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default LeaveApprovals;

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge, Alert, Row, Col } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { leaveBalanceService, leaveTypeService, employeeProfileService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const LeaveBalance = () => {
    const [balances, setBalances] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showInitModal, setShowInitModal] = useState(false);
    const [editingBalance, setEditingBalance] = useState(null);
    const [initYear, setInitYear] = useState(new Date().getFullYear());
    const [quickFilterText, setQuickFilterText] = useState('');
    const [formData, setFormData] = useState({
        employeeId: '',
        leaveTypeId: '',
        year: new Date().getFullYear(),
        totalDays: 0,
        usedDays: 0,
        carryForwardDays: 0
    });

    const { canEdit } = usePermission('Leave Balance');
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();

    useEffect(() => {
        fetchData();
        fetchLeaveTypes();
        fetchEmployees();
    }, []);

    const fetchData = async () => {
        try {
            const data = await leaveBalanceService.getLeaveBalances();
            setBalances(data);
        } catch (error) {
            alertService.showToast('Failed to fetch leave balances', 'error');
        }
    };

    const fetchLeaveTypes = async () => {
        try {
            const data = await leaveTypeService.getLeaveTypes();
            setLeaveTypes(data.filter(lt => lt.isActive));
        } catch (error) {
            alertService.error('Failed to fetch leave types');
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await employeeProfileService.getEmployeeList();
            setEmployees(data);
        } catch (error) {
            alertService.error('Failed to fetch employees');
        }
    };

    const handleAdd = () => {
        setEditingBalance(null);
        setFormData({
            employeeId: '',
            leaveTypeId: '',
            year: new Date().getFullYear(),
            totalDays: 0,
            usedDays: 0,
            carryForwardDays: 0
        });
        setShowModal(true);
    };

    const handleEdit = (balance) => {
        setEditingBalance(balance);
        setFormData({
            employeeId: balance.employeeId,
            leaveTypeId: balance.leaveTypeId,
            year: balance.year,
            totalDays: balance.totalDays,
            usedDays: balance.usedDays,
            carryForwardDays: balance.carryForwardDays
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingBalance) {
                await leaveBalanceService.updateLeaveBalance(editingBalance.id, formData);
                alertService.showToast('Leave balance updated successfully');
            } else {
                await leaveBalanceService.createLeaveBalance(formData);
                alertService.showToast('Leave balance added successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alertService.showToast(editingBalance ? 'Failed to update leave balance' : 'Failed to add leave balance', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this leave balance?')) {
            try {
                await leaveBalanceService.deleteLeaveBalance(id);
                alertService.showToast('Leave balance deleted successfully');
                fetchData();
            } catch (error) {
                alertService.showToast('Failed to delete leave balance', 'error');
            }
        }
    };

    const handleInitializeYear = async () => {
        try {
            await leaveBalanceService.initializeYearBalances(initYear);
            alertService.showToast(`Leave balances initialized for year ${initYear}`);
            setShowInitModal(false);
            fetchData();
        } catch (error) {
            alertService.showToast('Failed to initialize leave balances', 'error');
        }
    };

    const columnDefs = useMemo(() => [
        {
            headerName: 'Employee',
            field: 'employeeName',
            flex: 2,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Leave Type',
            field: 'leaveTypeName',
            flex: 1.5,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Year',
            field: 'year',
            flex: 0.8,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Total Days',
            field: 'totalDays',
            flex: 1,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Used Days',
            field: 'usedDays',
            flex: 1,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Remaining Days',
            field: 'remainingDays',
            flex: 1,
            filter: true,
            sortable: true,
            cellRenderer: (params) => (
                <Badge bg={params.value > 5 ? 'success' : params.value > 0 ? 'warning' : 'danger'}>
                    {params.value}
                </Badge>
            )
        },
        {
            headerName: 'Carry Forward',
            field: 'carryForwardDays',
            flex: 1,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Actions',
            flex: 1,
            cellRenderer: (params) => (
                <div className="d-flex h-100 align-items-center justify-content-center gap-2">
                    {canEdit && (
                        <>
                            <Button
                                variant="link"
                                className="p-0 grid-action-btn text-primary"
                                onClick={() => handleEdit(params.data)}
                                title="Edit Balance"
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                                variant="link"
                                className="p-0 grid-action-btn text-danger"
                                onClick={() => handleDelete(params.data.id)}
                                title="Delete Balance"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        </>
                    )}
                </div>
            )
        }
    ], [canEdit]);

    return (
        <Container fluid className="leave-balance-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Leave Balance</h2>
                    <p className="text-muted small mb-0">Monitor and manage employee leave quotas and accruals</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            placeholder="Search leave balances..."
                            className="search-input"
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <div className="d-flex gap-2">
                            <Button variant="outline-primary" className="px-3 shadow-sm" onClick={() => setShowInitModal(true)}>
                                <i className="fas fa-sync me-2"></i> Initialize Year
                            </Button>
                            <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                                <i className="fas fa-plus me-2"></i> Add Balance
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <GridContainer>
                    <AgGridReact
                        rowData={balances}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        theme={gridTheme}
                        suppressCellFocus={suppressCellFocus}
                        animateRows={true}
                        pagination={true}
                        paginationPageSize={10}
                        quickFilterText={quickFilterText}
                        rowHeight={60}
                        headerHeight={52}
                    />
            </GridContainer>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingBalance ? 'Edit Leave Balance' : 'Create New Leave Balance'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Employee *</Form.Label>
                            <Form.Select
                                required
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: parseInt(e.target.value) })}
                                disabled={editingBalance !== null}
                                className="form-control-lg border-2"
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.employeeId} value={emp.employeeId}>
                                        {emp.firstName} {emp.lastName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Leave Type *</Form.Label>
                            <Form.Select
                                required
                                value={formData.leaveTypeId}
                                onChange={(e) => setFormData({ ...formData, leaveTypeId: parseInt(e.target.value) })}
                                disabled={editingBalance !== null}
                                className="form-control-lg border-2"
                            >
                                <option value="">Select Leave Type</option>
                                {leaveTypes.map(lt => (
                                    <option key={lt.id} value={lt.id}>
                                        {lt.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Year *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        required
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                        min="2020"
                                        max="2100"
                                        className="border-2"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Total Days *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        required
                                        value={formData.totalDays}
                                        onChange={(e) => setFormData({ ...formData, totalDays: parseInt(e.target.value) })}
                                        min="0"
                                        className="border-2"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Used Days *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        required
                                        value={formData.usedDays}
                                        onChange={(e) => setFormData({ ...formData, usedDays: parseInt(e.target.value) })}
                                        min="0"
                                        className="border-2"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Carry Forward Days</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.carryForwardDays}
                                        onChange={(e) => setFormData({ ...formData, carryForwardDays: parseInt(e.target.value) })}
                                        min="0"
                                        className="border-2"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="px-4 shadow-sm">
                            {editingBalance ? 'Save Changes' : 'Create Balance'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Initialize Year Modal */}
            <Modal show={showInitModal} onHide={() => setShowInitModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Initialize Leave Balances</Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleInitializeYear(); }}>
                    <Modal.Body className="pt-4">
                        <Alert variant="info" className="border-0 shadow-sm mb-4">
                            <div className="d-flex">
                                <i className="fas fa-info-circle me-3 mt-1 fs-5"></i>
                                <div>
                                    This will create leave balances for all active employees based on the default days defined in leave types.
                                    Existing balances for this year will not be duplicated.
                                </div>
                            </div>
                        </Alert>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Target Year *</Form.Label>
                            <Form.Control
                                type="number"
                                required
                                value={initYear}
                                onChange={(e) => setInitYear(parseInt(e.target.value))}
                                min="2020"
                                max="2100"
                                className="form-control-lg border-2"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowInitModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="px-4 shadow-sm">
                            Initialize Now
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default LeaveBalance;

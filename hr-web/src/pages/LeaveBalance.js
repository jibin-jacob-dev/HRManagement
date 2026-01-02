import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge, Alert, Row, Col } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { leaveBalanceService, leaveTypeService, employeeProfileService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import Select from 'react-select';
import { useTheme } from '../context/ThemeContext';
import { usePermission } from '../hooks/usePermission';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const LeaveBalance = () => {
    const { isDarkMode } = useTheme();
    const { canEdit } = usePermission('Leave Balance');
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();

    const [balances, setBalances] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showInitModal, setShowInitModal] = useState(false);
    const [editingBalance, setEditingBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [initYear, setInitYear] = useState(new Date().getFullYear());

    const initialFormData = {
        employeeId: '',
        leaveTypeId: '',
        year: new Date().getFullYear(),
        totalDays: 0,
        usedDays: 0,
        carryForwardDays: 0
    };

    const [formData, setFormData] = useState(initialFormData);

    // Custom Styles for React Select
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#2b3035' : '#fff',
            borderColor: state.isFocused ? 'var(--bs-primary)' : (isDarkMode ? '#495057' : '#dee2e6'),
            color: isDarkMode ? '#fff' : '#000',
            borderRadius: '6px',
            minHeight: '38px',
            boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? 'var(--bs-primary)' : (isDarkMode ? '#6c757d' : '#bdc3c7')
            }
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#2b3035' : '#fff',
            border: isDarkMode ? '1px solid #495057' : '1px solid #dee2e6',
            zIndex: 9999,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? 'var(--bs-primary)' 
                : state.isFocused 
                    ? (isDarkMode ? '#3d4246' : '#f8f9fa') 
                    : 'transparent',
            color: state.isSelected ? '#fff' : (isDarkMode ? '#fff' : '#000'),
            cursor: 'pointer',
            padding: '8px 12px',
            '&:active': {
                backgroundColor: 'var(--bs-primary)'
            }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#000'
        }),
        input: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#000'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? '#adb5bd' : '#6c757d'
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    useEffect(() => {
        fetchData();
        fetchLeaveTypes();
        fetchEmployees();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await leaveBalanceService.getLeaveBalances();
            setBalances(Array.isArray(data) ? data : (data?.value || []));
        } catch (error) {
            console.error('Error fetching balances:', error);
            alertService.showToast('Failed to fetch leave balances', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveTypes = async () => {
        try {
            const data = await leaveTypeService.getLeaveTypes();
            const list = Array.isArray(data) ? data : (data?.value || []);
            setLeaveTypes(list.filter(lt => lt.isActive));
        } catch (error) {
            alertService.showToast('Failed to fetch leave types', 'error');
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await employeeProfileService.getEmployeeList();
            const list = Array.isArray(data) ? data : (data?.value || []);
            // Deduplicate employees by EmployeeId to prevent dropdown glitches
            const uniqueEmployees = list.filter((emp, index, self) =>
                index === self.findIndex((e) => e.employeeId === emp.employeeId)
            );
            setEmployees(uniqueEmployees);
        } catch (error) {
            alertService.showToast('Failed to fetch employees', 'error');
        }
    };

    const handleAdd = () => {
        setEditingBalance(null);
        setFormData(initialFormData);
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
            carryForwardDays: balance.carryForwardDays || 0
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingBalance) {
                await leaveBalanceService.updateLeaveBalance(editingBalance.leaveBalanceId, formData);
                alertService.showToast('Leave balance updated successfully');
            } else {
                await leaveBalanceService.createLeaveBalance(formData);
                alertService.showToast('Leave balance added successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving balance:', error);
            const errorMessage = error.response?.data?.message || (editingBalance ? 'Failed to update balance' : 'Failed to add balance');
            alertService.showToast(errorMessage, 'error');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Leave Balance?',
            'Are you sure you want to delete this leave balance? This action cannot be undone.',
            'Yes, Delete It'
        );

        if (confirmed) {
            try {
                await leaveBalanceService.deleteLeaveBalance(id);
                alertService.showToast('Leave balance deleted successfully');
                fetchData();
            } catch (error) {
                alertService.showToast('Failed to delete leave balance', 'error');
            }
        }
    };

    const handleInitializeYear = async (e) => {
        e.preventDefault();
        try {
            await leaveBalanceService.initializeYearBalances(initYear);
            alertService.showToast(`Leave balances initialized for year ${initYear}`);
            setShowInitModal(false);
            fetchData();
        } catch (error) {
            alertService.showToast('Failed to initialize leave balances', 'error');
        }
    };

    const handleLeaveTypeChange = (selectedOption) => {
        const leaveTypeId = selectedOption?.value;
        const selectedType = leaveTypes.find(lt => lt.leaveTypeId === leaveTypeId);
        
        setFormData(prev => ({
            ...prev,
            leaveTypeId: leaveTypeId,
            // Only auto-fill total days when creating a new balance
            totalDays: !editingBalance && selectedType ? selectedType.defaultDaysPerYear : prev.totalDays
        }));
    };

    const columnDefs = useMemo(() => [
        {
            headerName: 'Employee',
            field: 'employeeName',
            flex: 2,
            filter: true,
            sortable: true,
            cellClass: 'fw-medium'
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
            flex: 1,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Total',
            field: 'totalDays',
            width: 100,
            sortable: true,
            cellClass: 'text-center'
        },
        {
            headerName: 'Used',
            field: 'usedDays',
            width: 100,
            sortable: true,
            cellClass: 'text-center text-danger fw-bold'
        },
        {
            headerName: 'Remaining',
            field: 'remainingDays',
            width: 120,
            sortable: true,
            cellClass: 'text-center',
            cellRenderer: (params) => (
                <Badge bg={params.value > 5 ? 'success' : params.value > 0 ? 'warning' : 'danger'} className="px-3">
                    {params.value}
                </Badge>
            )
        },
        {
            headerName: 'Actions',
            width: 120,
            sortable: false,
            filter: false,
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
                                onClick={() => handleDelete(params.data.leaveBalanceId)}
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

    // Prepare options for react-select
    const employeeOptions = employees.map(emp => ({
        value: emp.employeeId,
        label: `${emp.firstName} ${emp.lastName}`
    }));

    const leaveTypeOptions = leaveTypes.map(lt => ({
        value: lt.leaveTypeId,
        label: lt.name
    }));

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
                            placeholder="Search records..."
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
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary mb-3" role="status"></div>
                        <p className="text-muted fw-bold">Loading Leave Balances...</p>
                    </div>
                ) : (
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
                )}
            </GridContainer>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingBalance ? 'Edit Leave Balance' : 'Create New Leave Balance'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Employee *</Form.Label>
                            <Select
                                options={employeeOptions}
                                value={employeeOptions.find(opt => opt.value === formData.employeeId)}
                                onChange={(opt) => setFormData({ ...formData, employeeId: opt?.value })}
                                placeholder="Search Employee..."
                                isDisabled={!!editingBalance}
                                styles={customSelectStyles}
                                menuPortalTarget={document.body}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Leave Type *</Form.Label>
                            <Select
                                options={leaveTypeOptions}
                                value={leaveTypeOptions.find(opt => opt.value === formData.leaveTypeId)}
                                onChange={handleLeaveTypeChange}
                                placeholder="Search Leave Type..."
                                isDisabled={!!editingBalance}
                                styles={customSelectStyles}
                                menuPortalTarget={document.body}
                                required
                            />
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
                                        className="form-control-lg border-2"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Total Days *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.5"
                                        required
                                        value={formData.totalDays}
                                        onChange={(e) => setFormData({ ...formData, totalDays: parseFloat(e.target.value) })}
                                        min="0"
                                        className="form-control-lg border-2"
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
                                        step="0.5"
                                        required
                                        value={formData.usedDays}
                                        onChange={(e) => setFormData({ ...formData, usedDays: parseFloat(e.target.value) })}
                                        min="0"
                                        className="form-control-lg border-2"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Carry Forward</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.5"
                                        value={formData.carryForwardDays}
                                        onChange={(e) => setFormData({ ...formData, carryForwardDays: parseFloat(e.target.value) })}
                                        min="0"
                                        className="form-control-lg border-2"
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
                    <Modal.Title className="fw-bold">Initialize Year Balances</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleInitializeYear}>
                    <Modal.Body className="pt-4">
                        <Alert variant="info" className="border-0 shadow-sm mb-4">
                            <div className="d-flex">
                                <i className="fas fa-info-circle me-3 mt-1 fs-5"></i>
                                <div>
                                    This will create default leave balances for all active employees for the selected year.
                                    Existing balances will not be affected.
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
                            Run Initialization
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default LeaveBalance;

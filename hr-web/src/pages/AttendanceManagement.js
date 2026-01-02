import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { attendanceService, userService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import moment from 'moment';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { usePermission } from '../hooks/usePermission';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const AttendanceManagement = () => {
    const { canEdit } = usePermission('/attendance');
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const [attendances, setAttendances] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');
    
    const [formData, setFormData] = useState({
        employeeId: '',
        date: new Date(),
        checkInTime: '',
        checkOutTime: '',
        status: 'Present',
        notes: ''
    });

    useEffect(() => {
        fetchData();
        fetchEmployees();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getAttendances();
            setAttendances(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            alertService.showToast('Failed to fetch attendance records', 'error');
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
        setSelectedAttendance(null);
        setFormData({
            employeeId: '',
            date: new Date(),
            checkInTime: '',
            checkOutTime: '',
            status: 'Present',
            notes: ''
        });
        setShowModal(true);
    };

    const handleEdit = (attendance) => {
        setModalMode('edit');
        setSelectedAttendance(attendance);
        setFormData({
            employeeId: attendance.employeeId,
            date: new Date(attendance.date),
            checkInTime: attendance.checkInTime || '',
            checkOutTime: attendance.checkOutTime || '',
            status: attendance.status,
            notes: attendance.notes || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                employeeId: parseInt(formData.employeeId),
                date: moment(formData.date).format('YYYY-MM-DD'),
                checkInTime: formData.checkInTime || null,
                checkOutTime: formData.checkOutTime || null
            };

            if (modalMode === 'add') {
                await attendanceService.createAttendance(payload);
                alertService.showToast('Attendance record created successfully');
            } else {
                await attendanceService.updateAttendance(selectedAttendance.attendanceId, payload);
                alertService.showToast('Attendance record updated successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving attendance:', error);
            alertService.showToast('Failed to save attendance record', 'error');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Attendance?',
            'Are you sure you want to delete this attendance record?'
        );

        if (confirmed) {
            try {
                await attendanceService.deleteAttendance(id);
                alertService.showToast('Attendance record deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Error deleting attendance:', error);
                alertService.showToast('Failed to delete attendance record', 'error');
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
            field: 'date', 
            headerName: 'Date', 
            sortable: true, 
            filter: true,
            valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'checkInTime', 
            headerName: 'Check In', 
            sortable: true,
            cellClass: 'd-flex align-items-center text-success'
        },
        { 
            field: 'checkOutTime', 
            headerName: 'Check Out', 
            sortable: true,
            cellClass: 'd-flex align-items-center text-danger'
        },
        { 
            field: 'workingHours', 
            headerName: 'Hours', 
            sortable: true,
            valueFormatter: (params) => params.value ? `${params.value.toFixed(2)}h` : '-',
            cellClass: 'd-flex align-items-center fw-bold text-primary'
        },
        { 
            field: 'status', 
            headerName: 'Status', 
            sortable: true,
            filter: true,
            cellRenderer: (params) => {
                const statusColors = {
                    'Present': 'success',
                    'Absent': 'danger',
                    'Late': 'warning',
                    'Half-Day': 'info'
                };
                const color = statusColors[params.value] || 'secondary';
                return (
                    <div className="d-flex h-100 align-items-center">
                        <span className={`badge bg-${color} bg-opacity-10 text-${color} border border-${color}`}>
                            {params.value}
                        </span>
                    </div>
                );
            }
        },
        {
            headerName: 'Actions',
            width: 120,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="d-flex gap-2 h-100 align-items-center justify-content-center">
                    {canEdit && (
                        <>
                            <Button 
                                variant="link" 
                                className="p-0 grid-action-btn text-primary" 
                                onClick={() => handleEdit(params.data)}
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button 
                                variant="link" 
                                className="p-0 grid-action-btn text-danger" 
                                onClick={() => handleDelete(params.data.attendanceId)}
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
        <Container fluid className="attendance-management-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Attendance Management</h2>
                    <p className="text-muted small mb-0">Total records: <span className="fw-bold text-primary">{attendances.length}</span></p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            className="search-input"
                            placeholder="Search records..."
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                            <i className="fas fa-plus me-2"></i>
                            Add Attendance
                        </Button>
                    )}
                </div>
            </div>

            <GridContainer>
                {loading ? (
                    <div className="d-flex h-100 justify-content-center align-items-center">
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                            <p className="text-muted fw-bold">Loading Attendance Records...</p>
                        </div>
                    </div>
                ) : (
                    <AgGridReact
                        rowData={attendances}
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
                    <Modal.Title>{modalMode === 'add' ? 'Add Attendance' : 'Edit Attendance'}</Modal.Title>
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
                                    <option key={emp.employeeId} value={emp.employeeId}>
                                        {emp.firstName} {emp.lastName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Date *</Form.Label>
                            <div className="datepicker-wrapper">
                                <DatePicker
                                    selected={formData.date}
                                    onChange={(date) => setFormData({ ...formData, date: date })}
                                    dateFormat="MMMM d, yyyy"
                                    className="form-control border-2"
                                    placeholderText="Select date"
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                    required
                                    portalId="root"
                                />
                                <i className="fas fa-calendar-alt"></i>
                            </div>
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label>Check In Time</Form.Label>
                                <Form.Control
                                    type="time"
                                    value={formData.checkInTime}
                                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Check Out Time</Form.Label>
                                <Form.Control
                                    type="time"
                                    value={formData.checkOutTime}
                                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Late">Late</option>
                                <option value="Half-Day">Half-Day</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Optional notes..."
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>
                        {modalMode === 'add' ? 'Create' : 'Save Changes'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AttendanceManagement;

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Row, Col, Badge, Card, Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { userService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';
import { useNavigate } from 'react-router-dom';

const EmployeeList = () => {
    const { gridTheme, defaultColDef, isDarkMode, suppressCellFocus } = useGridSettings();
    const { canEdit } = usePermission('Employees');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            // Simplify data extraction if wrapped
            const userList = Array.isArray(data) ? data : (data.value || []);
            // Filter to only show users with 'Employee' role
            setEmployees(userList);
        } catch (error) {
            console.error('Error fetching employees:', error);
            alertService.showToast('Failed to load employee directory', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (employee) => {
        setSelectedEmployee(employee);
        setShowModal(true);
    };

    const handleNavigateToProfile = (employee) => {
        if (employee) {
            navigate(`/profile/${employee.id}`);
        }
    };

    // Placeholder functions for edit/delete, replace with actual logic
    const handleEdit = (employee) => {
        alertService.showToast(`Editing employee: ${employee.firstName} ${employee.lastName}`, 'info');
        // navigate(`/employees/edit/${employee.id}`);
    };

    const handleDelete = (employeeId) => {
        alertService.showToast(`Deleting employee ID: ${employeeId}`, 'warning');
        // Implement actual delete logic here
    };

    const columnDefs = useMemo(() => [
        { 
            headerName: 'Employee', 
            field: 'firstName',
            flex: 1.5,
            minWidth: 250,
            cellRenderer: (params) => {
                const data = params.data;
                const hasPic = !!data.profilePicture; 
                
                return (
                    <div className="d-flex align-items-center h-100 w-100">
                        <div className="me-2 position-relative flex-shrink-0">
                            <div 
                                className={`rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm ${isDarkMode ? 'text-light' : 'text-white'}`}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: hasPic ? 'transparent' : (isDarkMode ? '#495057' : '#6c757d'),
                                    backgroundImage: hasPic ? `url(http://localhost:5227${data.profilePicture})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    fontSize: '1.1rem',
                                    border: isDarkMode ? '2px solid #495057' : '2px solid #fff'
                                }}
                            >
                                {!hasPic && data.firstName?.charAt(0)}
                            </div>
                            <div 
                                className={`position-absolute bottom-0 end-0 rounded-circle border border-2 ${isDarkMode ? 'border-dark' : 'border-white'} ${data.isActive ? 'bg-success' : 'bg-secondary'}`}
                                style={{ width: '10px', height: '10px' }}
                                title={data.isActive ? 'Active' : 'Inactive'}
                            ></div>
                        </div>
                        <div className="d-flex flex-column justify-content-center overflow-hidden gap-1 lh-sm" style={{ minWidth: 0 }}>
                            <span className={`fw-bold text-truncate ${isDarkMode ? 'text-light' : 'text-dark'}`} title={`${data.firstName} ${data.lastName}`}>
                                {data.firstName} {data.lastName}
                            </span>
                            <span 
                                className={`small text-truncate opacity-75 ${isDarkMode ? 'text-secondary' : 'text-muted'}`} 
                                title={data.email}
                            >
                                {data.email}
                            </span>
                        </div>
                    </div>
                );
            }
        },
        { 
            field: 'employeeId', 
            headerName: 'ID', 
            width: 100,
            cellClass: 'text-secondary fw-medium',
            hide: true // Hiding as per user request
        },
        { 
            field: 'departmentName', // Updated to match API
            headerName: 'Department', 
            flex: 1 
        },
        { 
            field: 'positionTitle', // Updated to match API
            headerName: 'Position', 
            flex: 1 
        },
        { 
            field: 'hireDate', // Updated to match API
            headerName: 'Joined', 
            width: 120,
            valueFormatter: (params) => {
                if (!params.value) return '-';
                return new Date(params.value).toLocaleDateString();
            }
        },
        {
            headerName: 'Actions',
            width: 140,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="d-flex gap-2 h-100 align-items-center">
                    <Button 
                        variant="link" 
                        className="p-0 text-primary" 
                        onClick={() => handleNavigateToProfile(params.data)}
                        title="View Profile"
                    >
                        <i className="fas fa-eye"></i>
                    </Button>
                    {canEdit && (
                        <>
                            <Button 
                                variant="link" 
                                className="p-0 text-secondary"
                                onClick={() => handleEdit(params.data)}
                                title="Edit"
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button 
                                variant="link" 
                                className="p-0 text-danger"
                                onClick={() => handleDelete(params.data.id)}
                                title="Delete"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        </>
                    )}
                </div>
            )
        }
    ], [isDarkMode, canEdit]); // Added canEdit to dependencies

    return (
        <Container fluid className="p-0 page-animate">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Employee Directory</h2>
                    <p className="text-muted small mb-0">Browse and search all company employees</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            className="search-input"
                            placeholder="Search employees..."
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <Button variant="primary" className="px-4 shadow-sm" onClick={() => setShowModal(true)}>
                            <i className="fas fa-plus me-2"></i>
                            Add Employee
                        </Button>
                    )}
                </div>
            </div>

            <GridContainer>
                {loading ? (
                     <div className="d-flex h-100 justify-content-center align-items-center">
                        <div className="spinner-border text-primary" role="status"></div>
                    </div>
                ) : (
                    <AgGridReact
                        rowData={employees}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        theme={gridTheme}
                        quickFilterText={quickFilterText}
                        pagination={true}
                        paginationPageSize={10}
                        animateRows={true}
                        suppressCellFocus={suppressCellFocus}
                        rowHeight={70} // Increased row height
                    />
                )}
            </GridContainer>

            {/* View Details Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title>Employee Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEmployee && (
                        <Row>
                            <Col md={4} className="text-center mb-3 mb-md-0">
                                <div 
                                    className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3 overflow-hidden shadow-sm"
                                    style={{ width: '120px', height: '120px' }}
                                >
                                    {selectedEmployee.profilePicture ? (
                                        <img 
                                            src={`http://localhost:5227${selectedEmployee.profilePicture}`} 
                                            alt={selectedEmployee.firstName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <i className="fas fa-user fa-4x text-secondary opacity-50"></i>
                                    )}
                                </div>
                                <h5 className="mb-1">{selectedEmployee.firstName} {selectedEmployee.lastName}</h5>
                                <p className="text-muted small">{selectedEmployee.email}</p>
                                <div className="mt-3">
                                    <Button variant="primary" size="sm" className="w-100 mb-2" onClick={handleNavigateToProfile}>
                                        View Full Profile
                                    </Button>
                                </div>
                            </Col>
                            <Col md={8}>
                                <Card className="border-0 shadow-sm bg-body-tertiary">
                                    <Card.Body>
                                        <h6 className="fw-bold mb-3 border-bottom pb-2">Basic Information</h6>
                                        <Row className="g-3">
                                            <Col sm={6}>
                                                <small className="text-muted d-block">Full Name</small>
                                                <span className="fw-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                                            </Col>
                                            <Col sm={6}>
                                                <small className="text-muted d-block">Status</small>
                                                <Badge bg={selectedEmployee.isActive ? 'success' : 'danger'}>
                                                    {selectedEmployee.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </Col>
                                            <Col sm={12}>
                                                <small className="text-muted d-block">Roles</small>
                                                <div>
                                                    {(selectedEmployee.roles || []).map(r => (
                                                        <Badge key={r} bg="secondary" className="me-1">{r}</Badge>
                                                    ))}
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default EmployeeList;

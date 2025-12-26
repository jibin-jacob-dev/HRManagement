import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { departmentService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import Swal from 'sweetalert2';

// Custom Styles
import './DepartmentManagement.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const DepartmentManagement = () => {
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');
    
    const [formData, setFormData] = useState({
        departmentName: '',
        description: ''
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await departmentService.getDepartments();
            setDepartments(Array.isArray(data) ? data : (data.value || []));
        } catch (error) {
            console.error('Error fetching departments:', error);
            alertService.showToast('Failed to fetch departments', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setModalMode('add');
        setSelectedDepartment(null);
        setFormData({
            departmentName: '',
            description: ''
        });
        setShowModal(true);
    };

    const handleEdit = (dept) => {
        setModalMode('edit');
        setSelectedDepartment(dept);
        setFormData({
            departmentName: dept.departmentName,
            description: dept.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (dept) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the ${dept.departmentName} department. This may affect associated employees.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            background: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#1e1e2d' : '#fff',
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#fff' : '#000'
        });

        if (result.isConfirmed) {
            try {
                await departmentService.deleteDepartment(dept.departmentId);
                alertService.showToast('Department deleted successfully');
                fetchDepartments();
            } catch (error) {
                console.error('Delete failed:', error);
                alertService.showToast('Failed to delete department', 'error');
            }
        }
    };

    const handleSave = async () => {
        if (!formData.departmentName.trim()) {
            alertService.showToast('Department name is required', 'warning');
            return;
        }

        try {
            if (modalMode === 'add') {
                await departmentService.createDepartment(formData);
                alertService.showToast('Department created successfully');
            } else {
                await departmentService.updateDepartment(selectedDepartment.departmentId, {
                    ...selectedDepartment,
                    ...formData
                });
                alertService.showToast('Department updated successfully');
            }
            setShowModal(false);
            fetchDepartments();
        } catch (error) {
            console.error('Save failed:', error);
            alertService.showToast(`Failed to ${modalMode} department`, 'error');
        }
    };

    const columnDefs = useMemo(() => [
        { 
            field: 'departmentId', 
            headerName: 'ID', 
            width: 80,
            sortable: true
        },
        { 
            field: 'departmentName', 
            headerName: 'Department Name', 
            sortable: true, 
            filter: true,
            flex: 1,
            cellClass: 'fw-bold text-primary'
        },
        { 
            field: 'description', 
            headerName: 'Description', 
            sortable: true, 
            filter: true,
            flex: 2,
            cellClass: 'text-muted'
        },
        { 
            field: 'createdDate', 
            headerName: 'Created Date', 
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : ''
        },
        {
            headerName: 'Actions',
            width: 120,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="d-flex h-100 align-items-center justify-content-center gap-2">
                    <Button 
                        variant="link" 
                        className="p-0 grid-action-btn text-primary" 
                        onClick={() => handleEdit(params.data)}
                        title="Edit Department"
                    >
                        <i className="fas fa-edit"></i>
                    </Button>
                    <Button 
                        variant="link" 
                        className="p-0 grid-action-btn text-danger" 
                        onClick={() => handleDelete(params.data)}
                        title="Delete Department"
                    >
                        <i className="fas fa-trash-alt"></i>
                    </Button>
                </div>
            )
        }
    ], []);

    return (
        <Container fluid className="department-management-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Department Management</h2>
                    <p className="text-muted small mb-0">Manage your company departments and organizational structure.</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            className="search-input"
                            placeholder="Search departments..."
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                        <i className="fas fa-plus me-2"></i>
                        Add Department
                    </Button>
                </div>
            </div>

            <GridContainer height="600px">
                {loading ? (
                    <div className="d-flex h-100 justify-content-center align-items-center">
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                            <p className="text-muted fw-bold">Loading Organizational Data...</p>
                        </div>
                    </div>
                ) : (
                    <AgGridReact
                        rowData={departments}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        animateRows={true}
                        pagination={true}
                        paginationPageSize={10}
                        paginationPageSizeSelector={[10, 20, 50, 100]}
                        quickFilterText={quickFilterText}
                        rowHeight={60}
                        headerHeight={52}
                        theme={gridTheme}
                        suppressCellFocus={suppressCellFocus}
                    />
                )}
            </GridContainer>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">{modalMode === 'add' ? 'Create New Department' : 'Edit Department'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-4">
                    <Form>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Department Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="e.g. Engineering, Human Resources"
                                value={formData.departmentName}
                                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                                className="form-control-lg border-2"
                                autoFocus
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={4}
                                placeholder="Describe the department's purpose and responsibilities..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="border-2"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" className="px-4 shadow-sm" onClick={handleSave}>
                        {modalMode === 'add' ? 'Create Department' : 'Save Changes'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DepartmentManagement;

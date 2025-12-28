import React, { useState, useEffect, useMemo } from 'react';
import { usePermission } from '../hooks/usePermission';
import { Container, Row, Col, Card, Button, Form, Modal } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { positionService, departmentService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import Swal from 'sweetalert2';

// Custom Styles
import './PositionManagement.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const PositionManagement = () => {
    const { canEdit } = usePermission('/positions');
    const [positions, setPositions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');

    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [posData, deptData] = await Promise.all([
                positionService.getPositions(),
                departmentService.getDepartments()
            ]);
            setPositions(posData);
            setDepartments(deptData);
        } catch (error) {
            console.error('Error fetching positions:', error);
            alertService.showToast('Failed to load positions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setCurrentPosition({ positionTitle: '', description: '', salaryRange: '', departmentId: '' });
        setShowModal(true);
    };

    const handleEdit = (position) => {
        setCurrentPosition({ ...position });
        setShowModal(true);
    };

    const handleDelete = async (position) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the ${position.positionTitle} position. This will affect associated employees.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            background: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#212529' : '#fff',
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#fff' : '#000'
        });

        if (result.isConfirmed) {
            try {
                await positionService.deletePosition(position.positionId);
                alertService.showToast('Position deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Error deleting position:', error);
                alertService.showToast('Failed to delete position', 'error');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentPosition.positionId) {
                await positionService.updatePosition(currentPosition.positionId, currentPosition);
                alertService.showToast('Position updated successfully');
            } else {
                await positionService.createPosition(currentPosition);
                alertService.showToast('Position created successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving position:', error);
            alertService.showToast('Failed to save position', 'error');
        }
    };

    const columnDefs = useMemo(() => [
        { field: 'positionId', headerName: 'ID', width: 80, sortable: true },
        { 
            field: 'positionTitle', 
            headerName: 'Job Title', 
            flex: 1, 
            sortable: true, 
            filter: true,
            cellClass: 'fw-bold text-primary'
        },
        { 
            field: 'departmentId', 
            headerName: 'Department', 
            flex: 1,
            cellClass: 'text-muted',
            valueGetter: params => {
                const dept = departments.find(d => d.departmentId === params.data.departmentId);
                return dept ? dept.departmentName : 'N/A';
            }
        },
        { field: 'salaryRange', headerName: 'Salary Range', flex: 1, cellClass: 'text-muted' },
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
                                title="Edit Position"
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button 
                                variant="link" 
                                className="p-0 grid-action-btn text-danger" 
                                onClick={() => handleDelete(params.data)}
                                title="Delete Position"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        </>
                    )}
                </div>
            )
        }
    ], [departments, canEdit]);

    return (
        <Container fluid className="position-management-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Job Title Management</h2>
                    <p className="text-muted small mb-0">Manage roles and designations across the organization</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            placeholder="Search positions..."
                            className="search-input"
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                            <i className="fas fa-plus me-2"></i> Add Position
                        </Button>
                    )}
                </div>
            </div>

            <GridContainer height="600px">
                <AgGridReact
                    rowData={positions}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    animateRows={true}
                    pagination={true}
                    paginationPageSize={10}
                    paginationPageSizeSelector={[10, 20, 50]}
                    theme={gridTheme}
                    suppressCellFocus={suppressCellFocus}
                    quickFilterText={quickFilterText}
                    rowHeight={60}
                    headerHeight={52}
                />
            </GridContainer>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {currentPosition?.positionId ? 'Edit Position' : 'Create New Position'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Job Title *</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={currentPosition?.positionTitle || ''}
                                onChange={(e) => setCurrentPosition({ ...currentPosition, positionTitle: e.target.value })}
                                placeholder="e.g. Senior Software Engineer"
                                className="form-control-lg border-2"
                                autoFocus
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Department</Form.Label>
                            <Form.Select
                                value={currentPosition?.departmentId || ''}
                                onChange={(e) => setCurrentPosition({ ...currentPosition, departmentId: e.target.value ? parseInt(e.target.value) : null })}
                                className="form-control-lg border-2"
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.departmentId} value={dept.departmentId}>
                                        {dept.departmentName}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Salary Range</Form.Label>
                            <Form.Control
                                type="text"
                                value={currentPosition?.salaryRange || ''}
                                onChange={(e) => setCurrentPosition({ ...currentPosition, salaryRange: e.target.value })}
                                placeholder="e.g. $80k - $120k"
                                className="border-2"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={currentPosition?.description || ''}
                                onChange={(e) => setCurrentPosition({ ...currentPosition, description: e.target.value })}
                                placeholder="Describe the role and responsibilities..."
                                className="border-2"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="px-4 shadow-sm">
                            {currentPosition?.positionId ? 'Save Changes' : 'Create Position'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default PositionManagement;

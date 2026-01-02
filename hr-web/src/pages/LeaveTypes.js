import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { leaveTypeService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const LeaveTypes = () => {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingLeaveType, setEditingLeaveType] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        defaultDays: 0,
        description: '',
        isActive: true
    });

    const { canEdit } = usePermission('Leave Types');
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await leaveTypeService.getLeaveTypes();
            setLeaveTypes(data);
        } catch (error) {
            alertService.showToast('Failed to fetch leave types', 'error');
        }
    };

    const handleAdd = () => {
        setEditingLeaveType(null);
        setFormData({
            name: '',
            defaultDays: 0,
            description: '',
            isActive: true
        });
        setShowModal(true);
    };

    const handleEdit = (leaveType) => {
        setEditingLeaveType(leaveType);
        setFormData({
            name: leaveType.name,
            defaultDays: leaveType.defaultDays,
            description: leaveType.description || '',
            isActive: leaveType.isActive
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingLeaveType) {
                await leaveTypeService.updateLeaveType(editingLeaveType.id, formData);
                alertService.showToast('Leave type updated successfully');
            } else {
                await leaveTypeService.createLeaveType(formData);
                alertService.showToast('Leave type added successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alertService.showToast(editingLeaveType ? 'Failed to update leave type' : 'Failed to add leave type', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this leave type?')) {
            try {
                await leaveTypeService.deleteLeaveType(id);
                alertService.showToast('Leave type deleted successfully');
                fetchData();
            } catch (error) {
                alertService.showToast('Failed to delete leave type', 'error');
            }
        }
    };

    const columnDefs = useMemo(() => [
        {
            headerName: 'Leave Type',
            field: 'name',
            flex: 2,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Default Days',
            field: 'defaultDays',
            flex: 1,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Description',
            field: 'description',
            flex: 2,
            filter: true
        },
        {
            headerName: 'Status',
            field: 'isActive',
            flex: 1,
            cellRenderer: (params) => (
                <Badge bg={params.value ? 'success' : 'secondary'}>
                    {params.value ? 'Active' : 'Inactive'}
                </Badge>
            )
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
                                title="Edit Leave Type"
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                                variant="link"
                                className="p-0 grid-action-btn text-danger"
                                onClick={() => handleDelete(params.data.id)}
                                title="Delete Leave Type"
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
        <Container fluid className="leave-types-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Leave Types</h2>
                    <p className="text-muted small mb-0">Define and manage organizational leave policies</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            placeholder="Search leave types..."
                            className="search-input"
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                            <i className="fas fa-plus me-2"></i> Add Leave Type
                        </Button>
                    )}
                </div>
            </div>

            <GridContainer>
                <AgGridReact
                    rowData={leaveTypes}
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

            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingLeaveType ? 'Edit Leave Type' : 'Create New Leave Type'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Leave Type Name *</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Annual Leave, Sick Leave"
                                className="form-control-lg border-2"
                                autoFocus
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Default Days *</Form.Label>
                            <Form.Control
                                type="number"
                                required
                                value={formData.defaultDays}
                                onChange={(e) => setFormData({ ...formData, defaultDays: parseInt(e.target.value) })}
                                placeholder="Enter default number of days"
                                min="0"
                                className="form-control-lg border-2"
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter description (optional)"
                                className="border-2"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                label="Active"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="custom-switch"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="px-4 shadow-sm">
                            {editingLeaveType ? 'Save Changes' : 'Create Leave Type'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default LeaveTypes;

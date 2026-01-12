import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { salaryComponentService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';
import './SalaryComponents.css';

import Select from 'react-select';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const SalaryComponents = () => {
    const { isDarkMode, gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const [components, setComponents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        type: 0, // 0 For Earning, 1 for Deduction based on Enum
        isTaxable: false,
        isActive: true
    });

    const typeOptions = [
        { value: 0, label: 'Earning' },
        { value: 1, label: 'Deduction' }
    ];

    const reactSelectStyles = {
        control: (base) => ({
            ...base,
            minHeight: '48px',
            borderRadius: '10px',
            borderColor: 'rgba(0,0,0,0.1)',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#0d6efd'
            }
        }),
        menu: (base) => ({
            ...base,
            zIndex: 9999
        })
    };

    const { canEdit } = usePermission('Salary Components');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await salaryComponentService.getSalaryComponents();
            setComponents(data);
        } catch (error) {
            alertService.showToast('Failed to fetch salary components', 'error');
        }
    };

    const handleAdd = () => {
        setEditingComponent(null);
        setFormData({
            name: '',
            type: 0,
            isTaxable: false,
            isActive: true
        });
        setShowModal(true);
    };

    const handleEdit = (component) => {
        setEditingComponent(component);
        setFormData({
            name: component.name,
            type: component.type, // Assuming 0: Earning, 1: Deduction
            isTaxable: component.isTaxable,
            isActive: component.isActive
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingComponent) {
                await salaryComponentService.updateSalaryComponent(editingComponent.id, {
                    ...editingComponent,
                    ...formData
                });
                alertService.showToast('Salary component updated successfully');
            } else {
                await salaryComponentService.createSalaryComponent(formData);
                alertService.showToast('Salary component added successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alertService.showToast(editingComponent ? 'Failed to update component' : 'Failed to add component', 'error');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Salary Component?',
            'Are you sure you want to delete this component? This may affect existing salary structures.',
            'Yes, Delete It',
            'warning',
            '#d33'
        );

        if (confirmed) {
            try {
                await salaryComponentService.deleteSalaryComponent(id);
                alertService.showToast('Salary component deleted successfully');
                fetchData();
            } catch (error) {
                alertService.showToast('Failed to delete component. It might be in use.', 'error');
            }
        }
    };

    const columnDefs = useMemo(() => [
        {
            headerName: 'Component Name',
            field: 'name',
            flex: 2,
            filter: true,
            sortable: true,
            cellClass: 'fw-bold',
            cellRenderer: (params) => (
                <div style={{ color: isDarkMode ? '#e9ecef' : '#212529' }}>{params.value}</div>
            )
        },
        {
            headerName: 'Type',
            field: 'type',
            flex: 1,
            filter: true,
            sortable: true,
            cellRenderer: (params) => {
                const isEarning = params.value === 0;
                const badgeColor = isEarning ? 'info' : 'warning';
                return (
                    <Badge 
                        className={`fw-normal border border-${badgeColor} bg-transparent text-${badgeColor} ${isDarkMode ? 'opacity-75' : ''}`}
                        style={{ fontSize: '0.75rem' }}
                    >
                        {isEarning ? 'Earning' : 'Deduction'}
                    </Badge>
                );
            }
        },
        {
            headerName: 'Taxable',
            field: 'isTaxable',
            flex: 1,
            cellRenderer: (params) => {
                const badgeColor = params.value ? 'danger' : 'success';
                return (
                    <Badge 
                        className={`fw-normal border border-${badgeColor} bg-transparent text-${badgeColor} ${isDarkMode ? 'opacity-75' : ''}`}
                        style={{ fontSize: '0.75rem' }}
                    >
                        {params.value ? 'Taxable' : 'Non-Taxable'}
                    </Badge>
                );
            }
        },
        {
            headerName: 'Status',
            field: 'isActive',
            flex: 1,
            cellRenderer: (params) => (
                <Badge 
                    bg={params.value ? 'success' : 'secondary'} 
                    className={`rounded-pill px-3 ${params.value ? 'bg-opacity-10 text-success border border-success' : 'bg-opacity-10 text-secondary border border-secondary'}`}
                    style={{ fontSize: '0.7rem' }}
                >
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
                                title="Edit Component"
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                                variant="link"
                                className="p-0 grid-action-btn text-danger"
                                onClick={() => handleDelete(params.data.id)}
                                title="Delete Component"
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
        <Container fluid className="salary-components-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Salary Components</h2>
                    <p className="text-muted small mb-0">Manage Earnings and Deductions for payroll calculation</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper shadow-sm">
                        <i className="fas fa-search search-icon text-muted"></i>
                        <Form.Control
                            type="text"
                            placeholder="Search records..."
                            className="search-input border-0"
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <Button variant="primary" className="px-4 shadow-sm fw-bold" onClick={handleAdd}>
                            <i className="fas fa-plus me-2"></i> Add Component
                        </Button>
                    )}
                </div>
            </div>

            <GridContainer>
                <AgGridReact
                    rowData={components}
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
                        {editingComponent ? 'Edit Salary Component' : 'Create New Salary Component'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <Modal.Body className="pt-4">
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Component Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Basic Pay, HRA, Provident Fund"
                                        className="form-control-lg border-2"
                                        autoFocus
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Component Type *</Form.Label>
                                    <Select
                                        options={typeOptions}
                                        value={typeOptions.find(o => o.value === formData.type)}
                                        onChange={(option) => setFormData({ ...formData, type: option.value })}
                                        styles={reactSelectStyles}
                                        classNamePrefix="react-select"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-muted text-uppercase">Taxability</Form.Label>
                                    <div className="mt-2">
                                        <Form.Check
                                            type="switch"
                                            id="taxable-switch"
                                            label={formData.isTaxable ? "Taxable Component" : "Non-Taxable"}
                                            checked={formData.isTaxable}
                                            onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                                            className="custom-switch"
                                        />
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                id="active-switch"
                                label="Available for Selection"
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
                        <Button variant="primary" type="submit" className="px-4 shadow-sm fw-bold">
                            {editingComponent ? 'Update Component' : 'Create Component'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default SalaryComponents;

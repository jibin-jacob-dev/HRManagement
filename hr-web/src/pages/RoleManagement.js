import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Button, Modal, Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { roleService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import Layout from '../components/layout/Layout';

// Custom Styles
import './RoleManagement.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const RoleManagement = () => {
    const { gridTheme, defaultColDef } = useGridSettings();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [quickFilterText, setQuickFilterText] = useState('');

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const data = await roleService.getRoles();
            setRoles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching roles:', error);
            alertService.showToast('Failed to fetch roles', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRole = async () => {
        if (!newRoleName.trim()) {
            alertService.showToast('Please enter a role name', 'warning');
            return;
        }

        try {
            await roleService.createRole(newRoleName);
            alertService.showToast('Role created successfully');
            setShowModal(false);
            setNewRoleName('');
            fetchRoles();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to create role';
            alertService.showToast(message, 'error');
        }
    };

    const handleDeleteRole = async (roleName) => {
        const isConfirmed = await alertService.showConfirm(
            'Are you sure?',
            `You want to delete the role "${roleName}"?`
        );

        if (!isConfirmed) {
            return;
        }

        try {
            await roleService.deleteRole(roleName);
            alertService.showToast('Role deleted successfully');
            fetchRoles();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to delete role';
            alertService.showToast(message, 'error');
        }
    };

    const columnDefs = useMemo(() => [
        { 
            field: 'name', 
            headerName: 'Role Name', 
            sortable: true, 
            filter: true,
            flex: 1,
            cellClass: 'd-flex align-items-center fw-bold'
        },
        {
            headerName: 'Actions',
            width: 120,
            sortable: false,
            filter: false,
            cellRenderer: (params) => {
                const isCoreRole = ['Admin', 'HR Manager', 'Employee'].includes(params.data.name);
                return (
                    <div className="d-flex h-100 align-items-center justify-content-center">
                        {!isCoreRole && (
                            <Button 
                                variant="link" 
                                className="p-0 grid-action-btn text-danger" 
                                onClick={() => handleDeleteRole(params.data.name)}
                                title="Delete Role"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        )}
                        {isCoreRole && (
                            <span className="text-muted small italic">System Role</span>
                        )}
                    </div>
                );
            }
        }
    ], []);

    return (
        <Layout>
            <Container fluid className="role-management-container page-animate">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <h2 className="mb-1 fw-bold">Role Management</h2>
                        <p className="text-muted small mb-0">Total system roles: <span className="fw-bold text-primary">{roles.length}</span></p>
                    </div>
                    <div className="d-flex gap-3 align-items-center">
                        <div className="search-box-wrapper">
                            <i className="fas fa-search search-icon"></i>
                            <Form.Control
                                type="text"
                                className="search-input"
                                placeholder="Search roles..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                            />
                        </div>
                        <Button variant="primary" className="px-4 shadow-sm" onClick={() => setShowModal(true)}>
                            <i className="fas fa-plus me-2"></i>
                            Add Role
                        </Button>
                    </div>
                </div>

                <GridContainer height="500px">
                    {loading ? (
                        <div className="d-flex h-100 justify-content-center align-items-center">
                            <div className="text-center">
                                <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                                <p className="text-muted fw-bold">Loading System Roles...</p>
                            </div>
                        </div>
                    ) : (
                        <AgGridReact
                            rowData={roles}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            animateRows={true}
                            pagination={true}
                            paginationPageSize={10}
                            quickFilterText={quickFilterText}
                            rowHeight={55}
                            headerHeight={50}
                            theme={gridTheme}
                        />
                    )}
                </GridContainer>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Create New Role</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Role Name</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Enter unique role name"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    autoFocus
                                />
                                <Form.Text className="text-muted">
                                    Role names are typically singular and capitalized (e.g., Accountant).
                                </Form.Text>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAddRole}>Create Role</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </Layout>
    );
};

export default RoleManagement;

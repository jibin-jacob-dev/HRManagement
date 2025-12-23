import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { userService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import Layout from '../components/layout/Layout';

// AG Grid Styles
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './UserManagement.css';

// Register AG Grid Modules for v35
ModuleRegistry.registerModules([AllCommunityModule]);

const UserManagement = () => {
    const { isDarkMode } = useTheme();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('edit'); // 'add' or 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        isActive: true,
        roles: []
    });

    useEffect(() => {
        fetchData();
        fetchRoles();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            
            let usersArray = [];
            if (Array.isArray(data)) {
                usersArray = data;
            } else if (data && typeof data === 'object' && Array.isArray(data.value)) {
                usersArray = data.value;
            }
            
            setUsers(usersArray);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const data = await userService.getRoles();
            setRoles(Array.isArray(data) ? data : (data.value || []));
        } catch (error) {
            console.error('Failed to fetch roles', error);
        }
    };

    const handleAdd = () => {
        setModalMode('add');
        setSelectedUser(null);
        setFormData({
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            isActive: true,
            roles: ['Employee']
        });
        setShowModal(true);
    };

    const handleEdit = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setFormData({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            roles: user.roles || [],
            password: '' 
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (modalMode === 'add') {
                await userService.createUser(formData);
                toast.success('User created successfully');
            } else {
                await userService.updateUser(selectedUser.id, formData);
                toast.success('User updated successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            const message = error.response?.data?.message || `Failed to ${modalMode} user`;
            toast.error(message);
        }
    };

    const handleRoleToggle = (role) => {
        const currentRoles = Array.isArray(formData.roles) ? formData.roles : [];
        const updatedRoles = currentRoles.includes(role)
            ? currentRoles.filter(r => r !== role)
            : [...currentRoles, role];
        setFormData({ ...formData, roles: updatedRoles });
    };

    const columnDefs = useMemo(() => [
        { 
            field: 'firstName', 
            headerName: 'First Name', 
            sortable: true, 
            filter: true,
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'lastName', 
            headerName: 'Last Name', 
            sortable: true, 
            filter: true,
            cellClass: 'd-flex align-items-center'
        },
        { 
            field: 'email', 
            headerName: 'Email Address', 
            sortable: true, 
            filter: true, 
            flex: 1.5,
            cellClass: 'd-flex align-items-center fw-medium text-primary'
        },
        { 
            field: 'roles', 
            headerName: 'Roles', 
            flex: 1,
            cellRenderer: (params) => {
                const userRoles = params.value || params.data?.roles || [];
                if (!Array.isArray(userRoles)) return null;
                return (
                    <div className="d-flex gap-1 h-100 align-items-center flex-wrap">
                        {userRoles.map(role => (
                            <Badge 
                                key={role} 
                                bg="none" 
                                className="fw-normal border text-dark bg-light-subtle"
                                style={{ fontSize: '0.7rem' }}
                            >
                                {role}
                            </Badge>
                        ))}
                    </div>
                );
            }
        },
        { 
            field: 'isActive', 
            headerName: 'Status', 
            width: 110,
            cellRenderer: (params) => (
                <div className="d-flex h-100 align-items-center">
                    <Badge 
                        bg={params.value ? 'success' : 'secondary'} 
                        className={`rounded-pill px-3 ${params.value ? 'bg-opacity-10 text-success border border-success' : 'bg-opacity-10 text-secondary border border-secondary'}`}
                        style={{ fontSize: '0.7rem' }}
                    >
                        {params.value ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
            )
        },
        {
            headerName: 'Actions',
            width: 100,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="d-flex h-100 align-items-center justify-content-center">
                    <Button 
                        variant="link" 
                        className="p-0 grid-action-btn text-primary" 
                        onClick={() => handleEdit(params.data)}
                    >
                        <i className="fas fa-edit"></i>
                    </Button>
                </div>
            )
        }
    ], []);

    const defaultColDef = useMemo(() => ({
        resizable: true,
        flex: 1,
        minWidth: 100
    }), []);

    const gridTheme = isDarkMode ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';

    return (
        <Layout>
            <Container fluid className="user-management-container">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <h2 className="mb-1 fw-bold">User Management</h2>
                        <p className="text-muted small mb-0">Total system users: <span className="fw-bold text-primary">{users.length}</span></p>
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
                        <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                            <i className="fas fa-plus me-2"></i>
                            Add User
                        </Button>
                        <Button variant="outline-secondary" className="shadow-sm" onClick={fetchData} disabled={loading}>
                            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm border-0 overflow-hidden" style={{ borderRadius: '15px' }}>
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
                                <div className="text-center">
                                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                                    <p className="text-muted fw-bold">Synchronizing User Directory...</p>
                                </div>
                            </div>
                        ) : (
                            <div className={gridTheme} style={{ height: '600px', width: '100%' }}>
                                <AgGridReact
                                    rowData={users}
                                    columnDefs={columnDefs}
                                    defaultColDef={defaultColDef}
                                    animateRows={true}
                                    pagination={true}
                                    paginationPageSize={10}
                                    quickFilterText={quickFilterText}
                                    rowHeight={60}
                                    headerHeight={52}
                                />
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Add/Edit Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{modalMode === 'add' ? 'Add New User' : 'Edit User'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control 
                                    type="email" 
                                    placeholder="Enter email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={modalMode === 'edit'}
                                />
                            </Form.Group>
                            {modalMode === 'add' && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Enter password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </Form.Group>
                            )}
                            <Form.Group className="mb-3">
                                <Form.Label>First Name</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Enter first name"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Last Name</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Enter last name"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Check 
                                    type="switch"
                                    label="Active Account"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            </Form.Group>
                            <Form.Label className="mb-2 d-block">Roles</Form.Label>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                {roles.map(role => (
                                    <Button
                                        key={role}
                                        variant={formData.roles.includes(role) ? 'primary' : 'outline-secondary'}
                                        size="sm"
                                        onClick={() => handleRoleToggle(role)}
                                    >
                                        {role}
                                    </Button>
                                ))}
                            </div>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave}>
                            {modalMode === 'add' ? 'Create User' : 'Save Changes'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </Layout>
    );
};

export default UserManagement;

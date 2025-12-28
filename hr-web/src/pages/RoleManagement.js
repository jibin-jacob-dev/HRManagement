import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Button, Modal, Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { roleService, menuService } from '../services/api';
import { useMenu } from '../context/MenuContext';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';

// Custom Styles
import './RoleManagement.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const RoleManagement = () => {
    const { refreshMenus } = useMenu();
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [quickFilterText, setQuickFilterText] = useState('');
    
    // Permission Modal State
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [allMenus, setAllMenus] = useState([]);
    const [assignedMenuIds, setAssignedMenuIds] = useState([]);
    const [originalAssignedMenuIds, setOriginalAssignedMenuIds] = useState([]);
    const [permissionSearch, setPermissionSearch] = useState('');

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

    const [menuTree, setMenuTree] = useState([]);

    const buildMenuTree = (items) => {
        const rootItems = [];
        const lookup = {};
        
        items.forEach(item => {
            lookup[item.id] = { ...item, children: [] };
        });

        items.forEach(item => {
            if (item.parentId && lookup[item.parentId]) {
                lookup[item.parentId].children.push(lookup[item.id]);
            } else {
                rootItems.push(lookup[item.id]);
            }
        });
        
        const sortItems = (nodes) => {
            nodes.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            nodes.forEach(node => {
                if (node.children.length > 0) sortItems(node.children);
            });
        };

        sortItems(rootItems);
        return rootItems;
    };

    const handleOpenPermissions = async (role) => {
        setSelectedRole(role);
        try {
            const [menus, roleMenuIds] = await Promise.all([
                menuService.getMenus(),
                menuService.getRoleMenuIds(role.id)
            ]);
            
            const flatMenus = Array.isArray(menus) ? menus : [];
            setAllMenus(flatMenus);
            setMenuTree(buildMenuTree(flatMenus));
            const roleIds = Array.isArray(roleMenuIds) ? roleMenuIds : [];
            setAssignedMenuIds(roleIds);
            setOriginalAssignedMenuIds([...roleIds]);
            setShowPermissionsModal(true);
        } catch (error) {
            console.error('Error fetching permissions:', error);
            alertService.showToast('Failed to load permissions', 'error');
        }
    };

    const handleClosePermissionsModal = async () => {
        const hasChanges = assignedMenuIds.length !== originalAssignedMenuIds.length || 
            assignedMenuIds.some(id => !originalAssignedMenuIds.includes(id)) ||
            originalAssignedMenuIds.some(id => !assignedMenuIds.includes(id));

        if (hasChanges) {
            const isConfirmed = await alertService.showConfirm(
                'Unsaved Changes',
                'You have unsaved changes in permissions. Are you sure you want to close?',
                'Yes, close',
                'warning'
            );
            if (!isConfirmed) return;
        }
        setShowPermissionsModal(false);
        setPermissionSearch('');
    };

    const handleSavePermissions = async () => {
        try {
            await menuService.updateRoleMenus(selectedRole.id, assignedMenuIds);
            alertService.showToast('Permissions updated successfully');
            refreshMenus(); // Trigger sidebar update
            setShowPermissionsModal(false);
        } catch (error) {
            console.error('Error saving permissions:', error);
            alertService.showToast('Failed to save permissions', 'error');
        }
    };

    const toggleMenuAssignment = (menuId) => {
        setAssignedMenuIds(prev => {
            const isRemoving = prev.includes(menuId);
            if (isRemoving) {
                // Find all descendants and remove them too
                const descendants = [];
                const findDescendants = (parentId) => {
                    allMenus.forEach(m => {
                        if (m.parentId === parentId) {
                            descendants.push(m.id);
                            findDescendants(m.id);
                        }
                    });
                };
                findDescendants(menuId);
                return prev.filter(id => id !== menuId && !descendants.includes(id));
            } else {
                return [...prev, menuId];
            }
        });
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
                        <Button 
                            variant="link" 
                            className="p-0 grid-action-btn text-info" 
                            onClick={() => handleOpenPermissions(params.data)}
                            title="Manage Permissions"
                        >
                            <i className="fas fa-key"></i>
                        </Button>
                        {!isCoreRole && (
                            <Button 
                                variant="link" 
                                className="p-0 grid-action-btn ms-2 text-danger" 
                                onClick={() => handleDeleteRole(params.data.name)}
                                title="Delete Role"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        )}
                        {isCoreRole && (
                            <span className="text-muted small italic ms-2">System Role</span>
                        )}
                    </div>
                );
            }
        }
    ], []);

    return (
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
                            suppressCellFocus={suppressCellFocus}
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

                <Modal show={showPermissionsModal} onHide={handleClosePermissionsModal} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Manage Permissions - <span className="text-primary">{selectedRole?.name}</span></Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                        <div className="mb-3">
                            <div className="search-box-wrapper w-100" style={{ maxWidth: 'none' }}>
                                <i className="fas fa-search search-icon"></i>
                                <Form.Control
                                    type="text"
                                    className="search-input"
                                    placeholder="Search permissions..."
                                    value={permissionSearch}
                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="text-muted small mb-3">Select the menus that users with this role are allowed to access.</p>
                        <div className="flex-grow-1 overflow-auto pe-2" style={{ minHeight: 0 }}>
                            <div className="d-flex flex-column gap-1">
                             {(() => {
                                const renderPermissionItem = (menu, level = 0) => (
                                    <React.Fragment key={menu.id}>
                                        <div 
                                            className={`p-2 border rounded d-flex align-items-center permission-item ${level > 0 ? 'ms-4' : ''}`}
                                            style={{ 
                                                marginLeft: level > 0 ? `${level * 25}px` : '0',
                                                opacity: menu.parentId && !assignedMenuIds.includes(menu.parentId) ? 0.6 : 1
                                            }}
                                        >
                                            <Form.Check 
                                                type="checkbox"
                                                id={`menu-${menu.id}`}
                                                checked={assignedMenuIds.includes(menu.id)}
                                                disabled={menu.parentId && !assignedMenuIds.includes(menu.parentId)}
                                                onChange={() => toggleMenuAssignment(menu.id)}
                                                label={
                                                    <span className="d-flex align-items-center gap-2">
                                                        {menu.icon && <i className={`${menu.icon} text-secondary`}></i>}
                                                        <span className="fw-bold">{menu.label}</span>
                                                        {menu.route && <span className="text-muted small">({menu.route})</span>}
                                                    </span>
                                                }
                                                className="m-0"
                                            />
                                        </div>
                                        {menu.children && menu.children.length > 0 && (
                                            <div className="nested-permissions">
                                                {menu.children.map(child => renderPermissionItem(child, level + 1))}
                                            </div>
                                        )}
                                    </React.Fragment>
                                );

                                return (() => {
                                    if (!permissionSearch) return menuTree.map(menu => renderPermissionItem(menu));

                                    // Filter tree: keep node if it or any child matches
                                    const filterTree = (nodes) => {
                                        return nodes.map(node => {
                                            const matches = node.label.toLowerCase().includes(permissionSearch.toLowerCase());
                                            const filteredChildren = node.children ? filterTree(node.children) : [];
                                            
                                            if (matches || filteredChildren.length > 0) {
                                                return { ...node, children: filteredChildren, isMatch: matches };
                                            }
                                            return null;
                                        }).filter(Boolean);
                                    };

                                    const filteredTree = filterTree(menuTree);
                                    return filteredTree.length > 0 
                                        ? filteredTree.map(menu => renderPermissionItem(menu))
                                        : <p className="text-center text-muted my-4">No permissions match your search.</p>;
                                })();
                             })()}
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClosePermissionsModal}>Cancel</Button>
                        <Button variant="primary" onClick={handleSavePermissions}>Save Changes</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
    );
};

export default RoleManagement;

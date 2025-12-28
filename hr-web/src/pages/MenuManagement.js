import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { menuService } from '../services/api';
import { useMenu } from '../context/MenuContext';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';

// Custom Styles
import './MenuManagement.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const MenuManagement = () => {
    const { refreshMenus } = useMenu();
    const { canEdit } = usePermission('/menu-management');
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const [menus, setMenus] = useState([]);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMenu, setEditingMenu] = useState(null);
    const [formData, setFormData] = useState({
        label: '',
        route: '',
        icon: '',
        orderIndex: 0,
        parentId: null
    });

    useEffect(() => {
        fetchMenus();
    }, []);

    const fetchMenus = async () => {
        try {
            setLoading(true);
            const data = await menuService.getMenus();
            const menusArray = Array.isArray(data) ? data : [];
            
            // Function to build hierarchy and then flatten for the grid
            const buildHierarchicalList = (items, parentId = null, level = 0) => {
                let result = [];
                const filtered = items
                    .filter(item => item.parentId === parentId)
                    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                
                filtered.forEach(item => {
                    result.push({ ...item, level });
                    const children = buildHierarchicalList(items, item.id, level + 1);
                    result = result.concat(children);
                });
                return result;
            };

            const hierarchicalData = buildHierarchicalList(menusArray);
            setMenus(hierarchicalData);
        } catch (error) {
            console.error('Error fetching menus:', error);
            alertService.showToast('Failed to fetch menus', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (menu = null) => {
        if (menu) {
            setEditingMenu(menu);
            setFormData({
                label: menu.label,
                route: menu.route || '',
                icon: menu.icon || '',
                orderIndex: menu.orderIndex,
                parentId: menu.parentId
            });
        } else {
            setEditingMenu(null);
            setFormData({
                label: '',
                route: '',
                icon: '',
                orderIndex: 0,
                parentId: null
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.label) {
            alertService.showToast('Label is required', 'warning');
            return;
        }

        try {
            if (editingMenu) {
                await menuService.updateMenu(editingMenu.id, { ...formData, id: editingMenu.id });
                alertService.showToast('Menu updated successfully');
            } else {
                await menuService.createMenu(formData);
                alertService.showToast('Menu created successfully');
            }
            refreshMenus(); // Trigger sidebar update
            setShowModal(false);
            fetchMenus();
        } catch (error) {
            console.error('Error saving menu:', error);
            alertService.showToast('Failed to save menu', 'error');
        }
    };

    const handleDelete = async (menu) => {
        const isConfirmed = await alertService.showConfirm(
            'Delete Menu?',
            `Are you sure you want to delete "${menu.label}"?`
        );

        if (!isConfirmed) return;

        try {
            await menuService.deleteMenu(menu.id);
            alertService.showToast('Menu deleted successfully');
            refreshMenus(); // Trigger sidebar update
            fetchMenus();
        } catch (error) {
            console.error('Error deleting menu:', error);
            alertService.showToast('Failed to delete menu', 'error');
        }
    };

    const columnDefs = useMemo(() => [
        { 
            field: 'label', 
            headerName: 'Label', 
            flex: 1.5, 
            sortable: false, // Hierarchy is our primary sort
            filter: true,
            cellRenderer: (params) => {
                const level = params.data.level || 0;
                const isChild = level > 0;
                return (
                    <div className="d-flex align-items-center h-100" style={{ paddingLeft: `${level * 25}px` }}>
                        {isChild && <i className="fas fa-level-up-alt fa-rotate-90 text-muted me-2 opacity-50"></i>}
                        <span className={isChild ? 'text-secondary-emphasis' : 'fw-bold'}>
                            {params.value}
                        </span>
                    </div>
                );
            }
        },
        { field: 'route', headerName: 'Route', flex: 1 },
        { field: 'icon', headerName: 'Icon', width: 100, cellRenderer: params => params.value ? <i className={params.value}></i> : '-' },
        { field: 'orderIndex', headerName: 'Order', width: 80, sortable: true },
        { 
            field: 'parentId', 
            headerName: 'Parent', 
            flex: 1,
            valueFormatter: params => {
                if (!params.value) return '-';
                const parent = menus.find(m => m.id === params.value);
                return parent ? parent.label : params.value;
            }
        },
        {
            headerName: 'Actions',
            width: 120,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="d-flex gap-2 justify-content-center h-100 align-items-center">
                    {canEdit && (
                        <>
                            <Button 
                                variant="link" 
                                className="p-0 text-primary" 
                                onClick={() => handleOpenModal(params.data)}
                                title="Edit"
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button 
                                variant="link" 
                                className="p-0 text-danger" 
                                onClick={() => handleDelete(params.data)}
                                title="Delete"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        </>
                    )}
                </div>
            )
        }
    ], [menus, canEdit]);

    return (
        <Container fluid className="menu-management-container page-animate p-0">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <h2 className="mb-1 fw-bold">Menu Management</h2>
                        <p className="text-muted small mb-0">Manage system navigation menus</p>
                    </div>
                    <div className="d-flex gap-3 align-items-center">
                        <div className="search-box-wrapper">
                            <i className="fas fa-search search-icon"></i>
                            <Form.Control
                                type="text"
                                className="search-input"
                                placeholder="Search menus..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                            />
                        </div>
                        {canEdit && (
                            <Button variant="primary" className="px-4 shadow-sm" onClick={() => handleOpenModal()}>
                                <i className="fas fa-plus me-2"></i>
                                Add Menu
                            </Button>
                        )}
                    </div>
                </div>

                <GridContainer>
                    <AgGridReact
                        rowData={menus}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        animateRows={true}
                        pagination={true}
                        paginationPageSize={20}
                        rowHeight={50}
                        headerHeight={50}
                        theme={gridTheme}
                        suppressCellFocus={suppressCellFocus}
                        quickFilterText={quickFilterText}
                    />
                </GridContainer>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{editingMenu ? 'Edit Menu' : 'New Menu'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Label</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.label}
                                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                                    placeholder="Menu Label"
                                />
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Route</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={formData.route}
                                            onChange={e => setFormData({ ...formData, route: e.target.value })}
                                            placeholder="/route-path"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Icon Class</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={formData.icon}
                                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                            placeholder="fas fa-home"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Order Index</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={formData.orderIndex}
                                            onChange={e => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Parent Menu</Form.Label>
                                        <Form.Select
                                            value={formData.parentId || ''}
                                            onChange={e => setFormData({ ...formData, parentId: e.target.value ? parseInt(e.target.value) : null })}
                                        >
                                            <option value="">None (Top Level)</option>
                                            {menus
                                                .filter(m => m.id !== editingMenu?.id) // Prevent self-parenting
                                                .map(m => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSubmit}>
                            {editingMenu ? 'Save Changes' : 'Create Menu'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
    );
};

export default MenuManagement;

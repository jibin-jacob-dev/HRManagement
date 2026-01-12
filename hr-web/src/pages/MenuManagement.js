import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Form, Row, Col, Badge } from 'react-bootstrap';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy,
    useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { menuService } from '../services/api';
import { useMenu } from '../context/MenuContext';
import { useTheme } from '../context/ThemeContext';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';
import Select from 'react-select';

import './MenuManagement.css';

// --- Sortable Item Component ---
const SortableMenuCard = ({ menu, level, onEdit, onDelete, isDragging }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: menu.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`menu-item-card ${level === 0 ? 'parent-item' : 'child-item'} ${isDragging ? 'dragging' : ''}`}
        >
            <div className="drag-handle" {...attributes} {...listeners}>
                <i className="fas fa-grip-vertical"></i>
            </div>
            
            <div className="menu-icon-preview">
                <i className={menu.icon || 'fas fa-link'}></i>
            </div>

            <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold">{menu.label}</span>
                    <Badge bg="light" text="dark" className="border small fw-normal">
                        {menu.route || '#'}
                    </Badge>
                </div>
            </div>

            <div className="item-actions">
                <Button variant="outline-primary" className="btn-action" onClick={() => onEdit(menu)}>
                    <i className="fas fa-edit"></i>
                </Button>
                <Button variant="outline-danger" className="btn-action" onClick={() => onDelete(menu)}>
                    <i className="fas fa-trash-alt"></i>
                </Button>
            </div>
        </div>
    );
};

const MenuManagement = () => {
    const { refreshMenus } = useMenu();
    const { isDarkMode } = useTheme();
    const { canEdit } = usePermission('/menu-management');
    
    // State
    const [menus, setMenus] = useState([]); // Hierarchical structure for rendering
    const [flatMenus, setFlatMenus] = useState([]); // Flat list for fetching
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMenu, setEditingMenu] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [activeItem, setActiveItem] = useState(null);

    const [formData, setFormData] = useState({
        label: '',
        route: '',
        icon: '',
        orderIndex: 0,
        parentId: null
    });

    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchMenus();
    }, []);

    const fetchMenus = async () => {
        try {
            setLoading(true);
            const data = await menuService.getMenus();
            const menusArray = Array.isArray(data) ? data : [];
            setFlatMenus(menusArray);
            
            // Rebuild hierarchy
            const parents = menusArray
                .filter(m => !m.parentId)
                .sort((a, b) => a.orderIndex - b.orderIndex);
            
            const hierarchical = parents.map(p => ({
                ...p,
                children: menusArray
                    .filter(c => c.parentId === p.id)
                    .sort((a, b) => a.orderIndex - b.orderIndex)
            }));
            
            setMenus(hierarchical);
            setHasChanges(false);
        } catch (error) {
            console.error('Error:', error);
            alertService.showToast('Failed to fetch menus', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Drag Handlers ---
    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);
        
        // Find the active item in our structure
        let found = null;
        menus.forEach(p => {
            if (p.id === active.id) found = p;
            p.children?.forEach(c => {
                if (c.id === active.id) found = c;
            });
        });
        setActiveItem(found);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveItem(null);

        if (!over || active.id === over.id) return;

        // Reorder Logic
        const isParentDrag = menus.some(p => p.id === active.id);
        
        if (isParentDrag) {
            const oldIndex = menus.findIndex(p => p.id === active.id);
            const newIndex = menus.findIndex(p => p.id === over.id);
            
            if (newIndex !== -1) {
                const newMenus = arrayMove(menus, oldIndex, newIndex);
                setMenus(newMenus);
                setHasChanges(true);
            }
        } else {
            // Child Drag within same parent or across parents
            // For simplicity in this "WOW" demo, we'll support movement within the same parent first
            // Cross-parent dragging is more complex but we can implement it if needed
            let updated = false;
            const newMenus = menus.map(p => {
                const childIndex = p.children.findIndex(c => c.id === active.id);
                if (childIndex !== -1) {
                    const overChildIndex = p.children.findIndex(c => c.id === over.id);
                    if (overChildIndex !== -1) {
                        const newChildren = arrayMove(p.children, childIndex, overChildIndex);
                        updated = true;
                        return { ...p, children: newChildren };
                    }
                }
                return p;
            });

            if (updated) {
                setMenus(newMenus);
                setHasChanges(true);
            }
        }
    };

    const saveOrder = async () => {
        try {
            const updates = [];
            menus.forEach((parent, pIndex) => {
                updates.push({ id: parent.id, orderIndex: pIndex, parentId: null });
                parent.children.forEach((child, cIndex) => {
                    updates.push({ id: child.id, orderIndex: cIndex, parentId: parent.id });
                });
            });

            await menuService.bulkUpdateMenus(updates);
            alertService.showToast('Structure saved successfully');
            setHasChanges(false);
            refreshMenus();
        } catch (error) {
            alertService.showToast('Failed to save structure', 'error');
        }
    };

    // --- CRUD Handlers ---
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
                orderIndex: flatMenus.length,
                parentId: null
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingMenu) {
                await menuService.updateMenu(editingMenu.id, { ...formData, id: editingMenu.id });
            } else {
                await menuService.createMenu(formData);
            }
            setShowModal(false);
            fetchMenus();
            refreshMenus();
            alertService.showToast(`Menu ${editingMenu ? 'updated' : 'created'} successfully`);
        } catch (error) {
            alertService.showToast('Failed to save menu', 'error');
        }
    };

    const handleDelete = async (menu) => {
        const confirmed = await alertService.showConfirm('Delete Menu?', `This will delete "${menu.label}" and any children.`);
        if (confirmed) {
            try {
                await menuService.deleteMenu(menu.id);
                fetchMenus();
                refreshMenus();
                alertService.showToast('Menu deleted');
            } catch (error) {
                alertService.showToast('Delete failed', 'error');
            }
        }
    };

    // --- Rendering Helpers ---
    const customSelectStyles = {
        control: (base) => ({
            ...base,
            background: isDarkMode ? '#2b3035' : '#fff',
            borderColor: isDarkMode ? '#495057' : '#dee2e6',
            color: isDarkMode ? '#fff' : '#000'
        }),
        menu: (base) => ({
            ...base,
            background: isDarkMode ? '#2b3035' : '#fff'
        }),
        option: (base, { isFocused, isSelected }) => ({
            ...base,
            background: isSelected ? 'var(--bs-primary)' : (isFocused ? (isDarkMode ? '#3d4246' : '#f8f9fa') : 'transparent'),
            color: isSelected ? '#fff' : (isDarkMode ? '#dee2e6' : '#333'),
            cursor: 'pointer'
        }),
        singleValue: (base) => ({ ...base, color: isDarkMode ? '#fff' : '#333' }),
        input: (base) => ({ ...base, color: isDarkMode ? '#fff' : '#333' }),
        placeholder: (base) => ({ ...base, color: isDarkMode ? '#adb5bd' : '#6c757d' }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    return (
        <Container fluid className={`menu-management-wrapper page-animate ${isDarkMode ? 'dark-mode' : ''}`}>
            <div className="page-header d-flex justify-content-between align-items-center">
                <div>
                    <h2 className="fw-bold mb-1">Menu Designer</h2>
                    <p className="text-muted small mb-0">Drag and drop to reorder the system navigation</p>
                </div>
                <div className="d-flex gap-2">
                    {hasChanges && (
                        <Button variant="success" className="shadow-sm" onClick={saveOrder} title="Save Structure">
                            <i className="fas fa-check"></i>
                        </Button>
                    )}
                    <Button variant="primary" className="px-4 shadow-sm" onClick={() => handleOpenModal()}>
                        <i className="fas fa-plus me-2"></i> Add Menu
                    </Button>
                </div>
            </div>

            <div className="structure-container">
                {loading ? (
                    <div className="empty-state"><i className="fas fa-spinner fa-spin fa-2x"></i></div>
                ) : (
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext 
                            items={menus.map(p => p.id)} 
                            strategy={verticalListSortingStrategy}
                        >
                            {menus.length === 0 ? (
                                <div className="empty-state">No menus found. Click "Add Menu" to begin.</div>
                            ) : (
                                menus.map(parent => (
                                    <div key={parent.id}>
                                        <SortableMenuCard 
                                            menu={parent} 
                                            level={0} 
                                            onEdit={handleOpenModal} 
                                            onDelete={handleDelete}
                                            isDragging={activeId === parent.id}
                                        />
                                        
                                        <div className="nested-container">
                                            <SortableContext 
                                                items={parent.children.map(c => c.id)} 
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {parent.children.map(child => (
                                                    <SortableMenuCard 
                                                        key={child.id}
                                                        menu={child} 
                                                        level={1} 
                                                        onEdit={handleOpenModal} 
                                                        onDelete={handleDelete}
                                                        isDragging={activeId === child.id}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </div>
                                    </div>
                                ))
                            )}
                        </SortableContext>

                        <DragOverlay dropAnimation={{
                            sideEffects: defaultDropAnimationSideEffects({
                                styles: { active: { opacity: '0.5' } },
                            })
                        }}>
                            {activeId && activeItem ? (
                                <div className={`menu-item-card drag-overlay-item ${activeItem.parentId ? 'child-item' : 'parent-item'}`}>
                                    <div className="drag-handle"><i className="fas fa-grip-vertical"></i></div>
                                    <div className="menu-icon-preview"><i className={activeItem.icon || 'fas fa-link'}></i></div>
                                    <div className="flex-grow-1"><span className="fw-bold">{activeItem.label}</span></div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {/* Edit/Add Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered className={isDarkMode ? 'dark-mode' : ''}>
                <Modal.Header closeButton className={isDarkMode ? 'border-secondary text-white' : ''} style={{ background: isDarkMode ? '#212529' : '#fff' }}>
                    <Modal.Title>{editingMenu ? 'Edit Menu Item' : 'Create New Menu'}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ background: isDarkMode ? '#212529' : '#fff', color: isDarkMode ? '#fff' : '#000' }}>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Label</Form.Label>
                            <Form.Control 
                                className={isDarkMode ? 'bg-dark text-white border-secondary' : ''}
                                value={formData.label}
                                onChange={e => setFormData({...formData, label: e.target.value})}
                                placeholder="e.g. Dashboard"
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Route</Form.Label>
                                    <Form.Control 
                                        className={isDarkMode ? 'bg-dark text-white border-secondary' : ''}
                                        value={formData.route}
                                        onChange={e => setFormData({...formData, route: e.target.value})}
                                        placeholder="/route"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Icon (FA Class)</Form.Label>
                                    <Form.Control 
                                        className={isDarkMode ? 'bg-dark text-white border-secondary' : ''}
                                        value={formData.icon}
                                        onChange={e => setFormData({...formData, icon: e.target.value})}
                                        placeholder="fas fa-home"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Parent Menu</Form.Label>
                            <Select 
                                options={[
                                    { value: null, label: 'None (Top Level)' },
                                    ...flatMenus
                                        .filter(m => !m.parentId && m.id !== editingMenu?.id)
                                        .map(m => ({ value: m.id, label: m.label }))
                                ]}
                                styles={customSelectStyles}
                                value={formData.parentId ? { value: formData.parentId, label: flatMenus.find(m => m.id === formData.parentId)?.label } : { value: null, label: 'None (Top Level)' }}
                                onChange={opt => setFormData({...formData, parentId: opt.value})}
                                menuPortalTarget={document.body}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className={isDarkMode ? 'border-secondary' : ''} style={{ background: isDarkMode ? '#212529' : '#fff' }}>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MenuManagement;

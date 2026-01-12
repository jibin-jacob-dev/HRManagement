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
import { restrictToVerticalAxis, createSnapModifier } from '@dnd-kit/modifiers';

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
    const [containerWidth, setContainerWidth] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const containerRef = React.useRef(null);

    // Derived State
    const filteredMenus = React.useMemo(() => {
        if (!searchTerm) return menus;
        
        const term = searchTerm.toLowerCase();
        return menus.filter(parent => {
            const parentMatch = parent.label.toLowerCase().includes(term) || parent.route?.toLowerCase().includes(term);
            const childrenMatch = parent.children?.some(child => 
                child.label.toLowerCase().includes(term) || child.route?.toLowerCase().includes(term)
            );
            return parentMatch || childrenMatch;
        }).map(parent => {
            // If the parent matched, keep all children. If only children matched, filter children.
            // Actually, usually easier to just show the parent and any matching children or all children.
            // Let's keep it simple: if parent or any child matches, show parent and its matching children.
            const parentMatch = parent.label.toLowerCase().includes(term) || parent.route?.toLowerCase().includes(term);
            if (parentMatch) return parent;
            
            return {
                ...parent,
                children: parent.children.filter(child => 
                    child.label.toLowerCase().includes(term) || child.route?.toLowerCase().includes(term)
                )
            };
        });
    }, [menus, searchTerm]);

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
    // --- Helper Functions ---
    const findContainer = (id) => {
        if (menus.some(p => p.id === id)) return 'root';
        const parent = menus.find(p => p.children?.some(c => c.id === id));
        return parent ? parent.id : 'root';
    };

    // --- Drag Handlers ---
    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);
        
        // Measure container inner width for perfect alignment
        if (containerRef.current) {
            const style = window.getComputedStyle(containerRef.current);
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            setContainerWidth(containerRef.current.clientWidth - paddingX);
        }

        // Find the active item
        let found = null;
        flatMenus.forEach(m => {
            if (m.id === active.id) found = m;
        });
        setActiveItem(found);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);

        // Smart Drop Logic: If we drag a child over a parent item, treat that parent as the container
        const overIsAParent = menus.some(p => p.id === over.id);
        const targetContainer = overIsAParent ? over.id : overContainer;

        if (activeContainer !== targetContainer) {
            setMenus((prev) => {
                let itemToMove;
                
                // 1. Find and Extract item
                if (activeContainer === 'root') {
                    itemToMove = prev.find(p => p.id === active.id);
                    // Don't allow nesting a parent that has its own children
                    if (itemToMove?.children?.length > 0 && targetContainer !== 'root') return prev;
                } else {
                    const parent = prev.find(p => p.id === activeContainer);
                    itemToMove = parent?.children.find(c => c.id === active.id);
                }

                if (!itemToMove) return prev;

                // 2. Remove from old container
                let nextMenus = prev.map(container => {
                    if (container.id === activeContainer) {
                        return { ...container, children: container.children.filter(c => c.id !== active.id) };
                    }
                    return container;
                });
                
                if (activeContainer === 'root') {
                    nextMenus = nextMenus.filter(p => p.id !== active.id);
                }

                // 3. Add to new container
                if (targetContainer === 'root') {
                    const overIndex = nextMenus.findIndex(p => p.id === over.id);
                    const newItem = { ...itemToMove, parentId: null, children: itemToMove.children || [] };
                    nextMenus.splice(overIndex >= 0 ? overIndex : nextMenus.length, 0, newItem);
                } else {
                    nextMenus = nextMenus.map(container => {
                        if (container.id === targetContainer) {
                            const newChildren = [...container.children];
                            // If dropping on the parent card itself, put at the end
                            const overIndex = overIsAParent ? newChildren.length : newChildren.findIndex(c => c.id === over.id);
                            const newItem = { ...itemToMove, parentId: targetContainer, children: [] };
                            newChildren.splice(overIndex >= 0 ? overIndex : newChildren.length, 0, newItem);
                            return { ...container, children: newChildren };
                        }
                        return container;
                    });
                }

                return nextMenus;
            });
            setHasChanges(true);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveItem(null);

        if (!over) return;

        if (active.id !== over.id) {
            const activeContainer = findContainer(active.id);
            const overContainer = findContainer(over.id);

            if (activeContainer === overContainer) {
                // Reorder within same container
                if (activeContainer === 'root') {
                    const oldIndex = menus.findIndex(p => p.id === active.id);
                    const newIndex = menus.findIndex(p => p.id === over.id);
                    setMenus(arrayMove(menus, oldIndex, newIndex));
                } else {
                    const newMenus = menus.map(p => {
                        if (p.id === activeContainer) {
                            const oldIndex = p.children.findIndex(c => c.id === active.id);
                            const newIndex = p.children.findIndex(c => c.id === over.id);
                            return { ...p, children: arrayMove(p.children, oldIndex, newIndex) };
                        }
                        return p;
                    });
                    setMenus(newMenus);
                }
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
                    <h2 className="mb-0">Menu Designer</h2>
                    <p className="text-muted small mb-0">Drag and drop to reorder the system navigation</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control 
                            type="text" 
                            placeholder="Search menus..." 
                            className={`search-input ${isDarkMode ? 'bg-dark text-white border-secondary' : ''}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
            </div>

            <div className="structure-container" ref={containerRef}>
                {loading ? (
                    <div className="empty-state"><i className="fas fa-spinner fa-spin fa-2x"></i></div>
                ) : (
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext 
                            id="root"
                            items={filteredMenus.map(p => p.id)} 
                            strategy={verticalListSortingStrategy}
                            disabled={!!searchTerm}
                        >
                            {filteredMenus.length === 0 ? (
                                <div className="empty-state">
                                    {searchTerm ? `No results found for "${searchTerm}"` : 'No menus found. Click "Add Menu" to begin.'}
                                </div>
                            ) : (
                                filteredMenus.map(parent => (
                                    <div key={parent.id}>
                                        <SortableMenuCard 
                                            menu={parent} 
                                            level={0} 
                                            onEdit={handleOpenModal} 
                                            onDelete={handleDelete}
                                            isDragging={activeId === parent.id}
                                        />
                                        
                                        {parent.children.length > 0 && (
                                            <div className="nested-container">
                                                <SortableContext 
                                                    id={parent.id}
                                                    items={parent.children.map(c => c.id)} 
                                                    strategy={verticalListSortingStrategy}
                                                    disabled={!!searchTerm}
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
                                        )}
                                    </div>
                                ))
                            )}
                        </SortableContext>

                        <DragOverlay 
                            portalContainer={containerRef.current}
                            dropAnimation={{
                                sideEffects: defaultDropAnimationSideEffects({
                                    styles: { active: { opacity: '0.5' } },
                                })
                            }}
                        >
                            {activeId && activeItem ? (
                                <div 
                                    className={`menu-item-card drag-overlay-item ${activeItem.parentId ? 'child-item' : 'parent-item'}`}
                                    style={{ 
                                        width: `${containerWidth}px`
                                    }}
                                >
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

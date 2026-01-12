import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Form, Row, Col, Badge } from 'react-bootstrap';
import { menuService } from '../services/api';
import { useMenu } from '../context/MenuContext';
import { useTheme } from '../context/ThemeContext';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';
import Select from 'react-select';

import './MenuManagement.css';

const MenuCard = ({ menu, level, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
    return (
        <div 
            id={menu.id}
            className={`menu-item-card ${level === 0 ? 'parent-item' : 'child-item'}`}
        >
            <div className="menu-icon-preview ms-2">
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
                <div className="d-flex flex-column me-2">
                    <Button 
                        variant="link" 
                        className="p-0 text-secondary lh-1" 
                        onClick={(e) => { e.stopPropagation(); onMoveUp(menu); }}
                        disabled={isFirst}
                        style={{ fontSize: '0.8rem', opacity: isFirst ? 0.3 : 1 }}
                    >
                        <i className="fas fa-chevron-up"></i>
                    </Button>
                    <Button 
                        variant="link" 
                        className="p-0 text-secondary lh-1" 
                        onClick={(e) => { e.stopPropagation(); onMoveDown(menu); }}
                        disabled={isLast}
                        style={{ fontSize: '0.8rem', opacity: isLast ? 0.3 : 1 }}
                    >
                        <i className="fas fa-chevron-down"></i>
                    </Button>
                </div>
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
    const [formData, setFormData] = useState({
        label: '',
        route: '',
        icon: '',
        orderIndex: 0,
        parentId: null
    });
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

    // --- Arrow Key Movement Handlers ---
    const handleMoveUp = (menu) => {
        setMenus(prev => {
            if (!menu.parentId) {
                const index = prev.findIndex(m => m.id === menu.id);
                if (index > 0) {
                    const newMenus = [...prev];
                    [newMenus[index], newMenus[index - 1]] = [newMenus[index - 1], newMenus[index]];
                    setHasChanges(true);
                    return newMenus;
                }
            } else {
                return prev.map(p => {
                    if (p.id === menu.parentId) {
                        const index = p.children.findIndex(c => c.id === menu.id);
                        if (index > 0) {
                            const newChildren = [...p.children];
                            [newChildren[index], newChildren[index - 1]] = [newChildren[index - 1], newChildren[index]];
                            setHasChanges(true); // Side effect in map but safe here as we force render
                            return { ...p, children: newChildren };
                        }
                    }
                    return p;
                });
            }
            return prev;
        });
    };

    const handleMoveDown = (menu) => {
        setMenus(prev => {
            if (!menu.parentId) {
                const index = prev.findIndex(m => m.id === menu.id);
                if (index < prev.length - 1) {
                    const newMenus = [...prev];
                    [newMenus[index], newMenus[index + 1]] = [newMenus[index + 1], newMenus[index]];
                    setHasChanges(true);
                    return newMenus;
                }
            } else {
                return prev.map(p => {
                    if (p.id === menu.parentId) {
                        const index = p.children.findIndex(c => c.id === menu.id);
                        if (index < p.children.length - 1) {
                            const newChildren = [...p.children];
                            [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
                            setHasChanges(true);
                            return { ...p, children: newChildren };
                        }
                    }
                    return p;
                });
            }
            return prev;
        });
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
                    <>
                        {filteredMenus.length === 0 ? (
                            <div className="empty-state">
                                {searchTerm ? `No results found for "${searchTerm}"` : 'No menus found. Click "Add Menu" to begin.'}
                            </div>
                        ) : (
                            filteredMenus.map((parent, pIndex) => (
                                <div key={parent.id}>
                                    <MenuCard 
                                        menu={parent} 
                                        level={0} 
                                        onEdit={handleOpenModal} 
                                        onDelete={handleDelete}
                                        onMoveUp={handleMoveUp}
                                        onMoveDown={handleMoveDown}
                                        isFirst={pIndex === 0}
                                        isLast={pIndex === filteredMenus.length - 1}
                                    />
                                    
                                    {parent.children.length > 0 && (
                                        <div className="nested-container">
                                            {parent.children.map((child, cIndex) => (
                                                <MenuCard 
                                                    key={child.id}
                                                    menu={child} 
                                                    level={1} 
                                                    onEdit={handleOpenModal} 
                                                    onDelete={handleDelete}
                                                    onMoveUp={handleMoveUp}
                                                    onMoveDown={handleMoveDown}
                                                    isFirst={cIndex === 0}
                                                    isLast={cIndex === parent.children.length - 1}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </>
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

import React, { useEffect, useState } from 'react';
import { Nav, Button, Collapse } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useMenu } from '../../context/MenuContext';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
    const { menus } = useMenu();
    const [menuTree, setMenuTree] = useState([]);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const menuRefs = React.useRef({});

    useEffect(() => {
        if (Array.isArray(menus)) {
            // Build Tree
            const buildTree = (items) => {
                const rootItems = [];
                const lookup = {};
                
                // Initialize lookup and add children array
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
                
                // Sort by order index
                const sortItems = (nodes) => {
                    nodes.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                    nodes.forEach(node => {
                        if (node.children.length > 0) sortItems(node.children);
                    });
                };

                sortItems(rootItems);
                return rootItems;
            };

            setMenuTree(buildTree(menus));
        }
    }, [menus]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (hoveredMenu) {
                // Check if click is outside all flyouts
                const flyouts = document.querySelectorAll('.submenu-flyout');
                let clickedInside = false;
                flyouts.forEach(flyout => {
                    if (flyout.contains(event.target)) clickedInside = true;
                });
                
                if (!clickedInside) {
                    setHoveredMenu(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [hoveredMenu]);

    const toggleSubMenu = (menuId, e) => {
        e.preventDefault();
        setExpandedMenus(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    };
    const renderMenuItem = (menu, level = 0) => {
        const hasChildren = menu.children && menu.children.length > 0;
        const isExpanded = expandedMenus[menu.id];
        const paddingLeft = level * 16 + 16; // Indent based on level

        return (
            <React.Fragment key={menu.id}>
                <Nav.Item 
                    className="position-relative"
                    ref={el => menuRefs.current[menu.id] = el}
                >
                    <Nav.Link 
                        as={hasChildren ? 'div' : NavLink}
                        to={hasChildren ? undefined : (menu.route || '#')}
                        className={`sidebar-link d-flex justify-content-between align-items-center ${hasChildren ? 'cursor-pointer' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasChildren) {
                                if (isCollapsed) {
                                    // Toggle flyout when collapsed
                                    setHoveredMenu(prev => prev === menu.id ? null : menu.id);
                                } else {
                                    // Toggle expansion when not collapsed
                                    toggleSubMenu(menu.id, e);
                                }
                            }
                        }}
                        style={{ paddingLeft: `${paddingLeft}px` }}
                    >
                        <div className="d-flex align-items-center">
                            <i className={`${menu.icon || 'fas fa-circle'} menu-icon-width`}></i>
                            {!isCollapsed && <span className="sidebar-text ms-2">{menu.label}</span>}
                        </div>
                        {!isCollapsed && hasChildren && (
                            <i className={`fas fa-chevron-down submenu-toggle ${isExpanded ? 'expanded' : ''}`}></i>
                        )}
                    </Nav.Link>
                    
                    {/* Flyout menu for collapsed sidebar */}
                    {isCollapsed && hasChildren && hoveredMenu === menu.id && (
                        <div 
                            className="submenu-flyout"
                            style={{
                                top: menuRefs.current[menu.id]?.getBoundingClientRect().top + 'px'
                            }}
                        >
                            <div className="flyout-header">{menu.label}</div>
                            {menu.children.map(child => (
                                <Nav.Link
                                    key={child.id}
                                    as={NavLink}
                                    to={child.route || '#'}
                                    className="flyout-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHoveredMenu(null);
                                    }}
                                >
                                    {child.icon && <i className={`${child.icon} me-2`}></i>}
                                    <span>{child.label}</span>
                                </Nav.Link>
                            ))}
                        </div>
                    )}
                </Nav.Item>
                
                {/* Render Children */}
                {!isCollapsed && hasChildren && (
                    <Collapse in={isExpanded}>
                        <div className="submenu-container">
                            {menu.children.map(child => renderMenuItem(child, level + 1))}
                        </div>
                    </Collapse>
                )}
            </React.Fragment>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {!isCollapsed && (
                <div className="sidebar-overlay d-lg-none" onClick={toggleSidebar}></div>
            )}
            
            <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} shadow-sm`}>
                {/* Brand Section */}
                <div className="sidebar-brand d-flex justify-content-between align-items-center w-100">
                    <div className="d-flex align-items-center">
                        <i className="fas fa-rocket fs-4"></i>
                        <span className="fs-5 sidebar-text ms-3">HR Pro</span>
                    </div>
                    {/* Mobile Close Button */}
                    <Button 
                        variant="link" 
                        className="d-lg-none text-secondary p-0" 
                        onClick={toggleSidebar}
                    >
                        <i className="fas fa-times fs-4"></i>
                    </Button>
                </div>

                <Nav className="flex-column mt-2">
                    {/* Always show Dashboard? Or make it databased? Let's make it databased. 
                        But as a fallback or default for "Home", we could keep it. 
                        Let's rely on DB permissions as requested. */}
                    
                    {/* Recursive Menu Renderer */}
                    {menuTree.map(menu => renderMenuItem(menu))}



                    {/* Fallback if no menus (e.g. first run) - Only for safety ensuring Admin can access Menu Setup */}
                    {menus.length === 0 && (
                        <div className="text-center text-muted small mt-4 p-2">
                            <p>No menus assigned.</p>
                            <p>Please configure menus in <a href="/menu-management">Menu Management</a></p>
                        </div>
                    )}
                </Nav>
            </div>
        </>
    );
};

export default Sidebar;

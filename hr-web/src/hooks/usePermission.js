import { useMemo } from 'react';
import { useMenu } from '../context/MenuContext';
import { authService } from '../services/api';

/**
 * Hook to check permissions for a specific menu/feature.
 * @param {string} menuName - The label or route of the menu item to check.
 * @returns {Object} { canView, canEdit, permissionType }
 */
export const usePermission = (menuName) => {
    const { menus } = useMenu();

    const permission = useMemo(() => {
        // If user is Admin, they get full access to everything
        if (authService.isAdmin()) {
            return { canView: true, canEdit: true, permissionType: 'Full' };
        }

        if (!menus || menus.length === 0) return { canView: false, canEdit: false, permissionType: null };

        // Flatten the menu tree to find the item
        const findMenu = (items) => {
            for (const item of items) {
                if (item.label === menuName || item.route === menuName) {
                    return item;
                }
                if (item.children && item.children.length > 0) {
                    const found = findMenu(item.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const menu = findMenu(menus);
        
        if (!menu) return { canView: false, canEdit: false, permissionType: null };

        // Default to 'Full' if not specified (backward compatibility)
        const type = menu.permissionType || 'Full'; 
        
        return {
            canView: true,
            canEdit: type === 'Full',
            permissionType: type
        };
    }, [menus, menuName]);

    return permission;
};

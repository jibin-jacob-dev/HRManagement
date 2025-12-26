import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { menuService } from '../services/api';

const MenuContext = createContext();

export const useMenu = () => {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
};

export const MenuProvider = ({ children }) => {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMenus = useCallback(async () => {
        try {
            const userMenus = await menuService.getCurrentUserMenus();
            if (Array.isArray(userMenus)) {
                setMenus(userMenus);
            }
        } catch (error) {
            console.error('Failed to fetch menus', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    const refreshMenus = () => {
        fetchMenus();
    };

    const value = {
        menus,
        loading,
        refreshMenus
    };

    return (
        <MenuContext.Provider value={value}>
            {children}
        </MenuContext.Provider>
    );
};

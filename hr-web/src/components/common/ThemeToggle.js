import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from 'react-bootstrap';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <Button 
            variant="link" 
            onClick={toggleTheme}
            className="text-secondary p-0 rounded-circle d-flex align-items-center justify-content-center shadow-none text-decoration-none"
            style={{ width: '40px', height: '40px' }}
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
        >
            <i className={`fas fa-${isDarkMode ? 'sun' : 'moon'}`} style={{ fontSize: '1.2rem' }}></i>
        </Button>
    );
};

export default ThemeToggle;

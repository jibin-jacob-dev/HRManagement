import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from 'react-bootstrap';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <Button 
            variant="link" 
            onClick={toggleTheme}
            className="theme-toggle-btn p-0 rounded-circle d-flex align-items-center justify-content-center shadow-none text-decoration-none"
            style={{ width: '45px', height: '45px', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
        >
            <i 
                className={`fas fa-${isDarkMode ? 'sun text-warning' : 'moon text-primary'} fs-4`} 
                style={{ 
                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isDarkMode ? 'rotate(0deg)' : 'rotate(-15deg)'
                }}
            ></i>
        </Button>
    );
};

export default ThemeToggle;

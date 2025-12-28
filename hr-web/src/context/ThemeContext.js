import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    const [fontSize, setFontSize] = useState(() => {
        const savedFontSize = localStorage.getItem('fontSize');
        return savedFontSize ? parseInt(savedFontSize) : 100;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.fontSize = `${fontSize}%`;
        localStorage.setItem('fontSize', fontSize.toString());
    }, [fontSize]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);
    
    const changeFontSize = (delta) => {
        setFontSize(prev => {
            if (delta === 0) return 100; // Reset
            const newSize = prev + delta;
            return Math.min(Math.max(newSize, 70), 150); // Clamp between 70% and 150%
        });
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, fontSize, changeFontSize }}>
            {children}
        </ThemeContext.Provider>
    );
};

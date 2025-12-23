import { useMemo } from 'react';
import { themeQuartz, colorSchemeDark } from 'ag-grid-community';
import { useTheme } from '../context/ThemeContext';

export const useGridSettings = () => {
    const { isDarkMode } = useTheme();

    const gridTheme = useMemo(() => {
        const baseTheme = isDarkMode ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;
        return baseTheme.withParams({
            gridSize: 8,
            rowHeight: 60,
            headerHeight: 52,
            fontSize: '0.95rem',
            borderRadius: 8,
            wrapperBorderRadius: 15,
            headerFontWeight: 700,
            headerPlaceholderColor: isDarkMode ? '#adb5bd' : '#6c757d',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            headerBackgroundColor: isDarkMode ? '#252525' : '#f8f9fa',
            headerForegroundColor: isDarkMode ? '#dee2e6' : '#495057',
            dataColor: isDarkMode ? '#f8f9fa' : '#212529',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            rowBorderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        });
    }, [isDarkMode]);

    const defaultColDef = useMemo(() => ({
        resizable: true,
        flex: 1,
        minWidth: 100,
        cellDataType: false, // v35 strict type fix
    }), []);

    return { gridTheme, defaultColDef, isDarkMode };
};

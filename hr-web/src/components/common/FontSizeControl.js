import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useTheme } from '../../context/ThemeContext';

const FontSizeControl = () => {
    const { changeFontSize, fontSize, isDarkMode } = useTheme();

    return (
        <ButtonGroup className="shadow-sm rounded-pill overflow-hidden" size="sm">
            <Button 
                variant={isDarkMode ? "outline-light" : "outline-secondary"}
                onClick={() => changeFontSize(-5)}
                title="Decrease Font Size"
                className="px-3 border-0 bg-transparent-hover"
                style={{ opacity: 0.8 }}
            >
                <i className="fas fa-minus small"></i> A
            </Button>
            <Button 
                variant={isDarkMode ? "outline-light" : "outline-secondary"}
                onClick={() => changeFontSize(0)}
                title={`Current: ${fontSize}% (Click to Reset)`}
                className="px-3 border-0 border-start border-end bg-transparent-hover fw-bold"
                style={{ fontSize: '0.8rem' }}
            >
                {fontSize}%
            </Button>
            <Button 
                variant={isDarkMode ? "outline-light" : "outline-secondary"}
                onClick={() => changeFontSize(5)}
                title="Increase Font Size"
                className="px-3 border-0 bg-transparent-hover"
                style={{ opacity: 0.8 }}
            >
                A <i className="fas fa-plus small"></i>
            </Button>
        </ButtonGroup>
    );
};

export default FontSizeControl;

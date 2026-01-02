import React from 'react';
import { Form } from 'react-bootstrap';
import { useTheme } from '../../context/ThemeContext';

const FontSizeControl = () => {
    const { setFontSize, fontSize } = useTheme();

    return (
        <div className="d-flex align-items-center gap-3 w-100 px-1">
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>A</span>
            <Form.Range
                min={80}
                max={130}
                step={5}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="font-size-slider flex-grow-1"
                title={`${fontSize}%`}
            />
            <span className="text-muted" style={{ fontSize: '1rem' }}>A</span>
            <span className="badge bg-light text-dark border ms-1 fw-medium" style={{ fontSize: '0.65rem', minWidth: '40px' }}>
                {fontSize}%
            </span>
        </div>
    );
};

export default FontSizeControl;

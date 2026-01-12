import React from 'react';
import { Card } from 'react-bootstrap';

const GridContainer = ({ children, height = 'calc(100vh - 280px)' }) => {
    return (
        <Card className="shadow-sm border-0 overflow-hidden" style={{ borderRadius: '15px' }}>
            <Card.Body className="p-0">
                <div style={{ height, width: '100%', minHeight: '400px' }}>
                    {children}
                </div>
            </Card.Body>
        </Card>
    );
};

export default GridContainer;

import React, { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useTheme } from '../../context/ThemeContext';
import './GlobalToast.css';

const GlobalToast = () => {
    const [toasts, setToasts] = useState([]);
    const { isDarkMode } = useTheme();

    useEffect(() => {
        const handleToastEvent = (event) => {
            const { title, icon, text } = event.detail;
            const id = Date.now();
            setToasts(prev => [...prev, { id, title, icon, text }]);
        };

        window.addEventListener('show-toast', handleToastEvent);
        return () => window.removeEventListener('show-toast', handleToastEvent);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIconClass = (icon) => {
        switch (icon) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'info': return 'fas fa-info-circle';
            default: return 'fas fa-bell';
        }
    };

    return (
        <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 10000, position: 'fixed' }}>
            {toasts.map(toast => (
                <Toast 
                    key={toast.id} 
                    onClose={() => removeToast(toast.id)} 
                    delay={4000} 
                    autohide
                    className={`custom-toast toast-${toast.icon} ${isDarkMode ? 'dark-mode' : ''} shadow-lg mb-2`}
                >
                    <div className="d-flex align-items-center w-100 p-2">
                        <div className="toast-icon-wrapper me-3">
                            <i className={getIconClass(toast.icon)}></i>
                        </div>
                        <div className="toast-content flex-grow-1">
                            <h6 className="mb-0 fw-bold">{toast.title}</h6>
                            {toast.text && <small className="opacity-75">{toast.text}</small>}
                        </div>
                        <button 
                            type="button" 
                            className="btn-close btn-close-white ms-2" 
                            onClick={() => removeToast(toast.id)} 
                            aria-label="Close"
                        ></button>
                    </div>
                </Toast>
            ))}
        </ToastContainer>
    );
};

export default GlobalToast;

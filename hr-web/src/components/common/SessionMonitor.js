import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, ProgressBar } from 'react-bootstrap';
import { authService } from '../../services/api';
import alertService from '../../services/alertService';

// Default configuration (can be moved to a settings context later)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 Minutes warning
const CHECK_INTERVAL_MS = 1000; // Check every second

const SessionMonitor = () => {
    const [showModal, setShowModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(WARNING_THRESHOLD_MS);
    const [isIdle, setIsIdle] = useState(false);
    
    const lastActivityRef = useRef(Date.now());
    const timerRef = useRef(null);

    const logoutUser = useCallback(() => {
        authService.logout();
        window.location.href = '/login';
    }, []);

    const resetTimer = useCallback(() => {
        if (!showModal) {
            lastActivityRef.current = Date.now();
        }
    }, [showModal]);

    // Attach event listeners for activity
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        
        // Throttle slightly to avoid too many updates
        let throttleTimer;
        const handleActivity = () => {
             if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    resetTimer();
                    throttleTimer = null;
                }, 1000);
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [resetTimer]);

    // Monitoring Loop
    useEffect(() => {
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            const timeRemaining = SESSION_TIMEOUT_MS - timeSinceLastActivity;

            if (timeRemaining <= 0) {
                // Time is up
                clearInterval(timerRef.current);
                logoutUser();
            } else if (timeRemaining <= WARNING_THRESHOLD_MS) {
                // Warning Zone
                if (!showModal) {
                    setShowModal(true);
                    setIsIdle(true);
                }
                setTimeLeft(timeRemaining);
            } else {
                // Safe Zone
                if (showModal) {
                    setShowModal(false);
                    setIsIdle(false);
                }
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [showModal, logoutUser]);

    const handleStayConnected = async () => {
        try {
            await authService.refreshToken();
            lastActivityRef.current = Date.now();
            setShowModal(false);
            setIsIdle(false);
            alertService.showToast('Session extended successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh token', error);
            // If refresh fails, we might already be expired, so logout
            logoutUser();
        }
    };

    const handleLogout = () => {
        logoutUser();
    };

    // Format milliseconds to MM:SS
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const progressPercentage = (timeLeft / WARNING_THRESHOLD_MS) * 100;

    return (
        <Modal 
            show={showModal} 
            onHide={() => {}} // Prevent closing by clicking outside
            backdrop="static"
            keyboard={false}
            centered
            className="session-timeout-modal"
        >
            <Modal.Header className="bg-warning bg-opacity-10 border-0">
                <Modal.Title className="text-warning fw-bold">
                    <i className="fas fa-clock me-2"></i> Session Expiring
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center py-4">
                <h4 className="fw-bold mb-3">Are you still there?</h4>
                <p className="text-muted mb-4">
                    For security, your session will time out due to inactivity in:
                </p>
                <h1 className="display-4 fw-bold text-primary mb-4 monitor-timer">
                    {formatTime(timeLeft)}
                </h1>
                <ProgressBar 
                    now={progressPercentage} 
                    variant={progressPercentage < 20 ? 'danger' : 'warning'} 
                    style={{ height: '8px' }}
                    className="mb-2"
                />
            </Modal.Body>
            <Modal.Footer className="border-0 justify-content-center pb-4">
                <Button variant="outline-secondary" className="px-4" onClick={handleLogout}>
                    Log Out
                </Button>
                <Button variant="primary" className="px-5 fw-bold" onClick={handleStayConnected}>
                    Stay Connected
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default SessionMonitor;

import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

import SessionMonitor from '../common/SessionMonitor';

const Layout = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 992);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 992) {
                setIsCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="layout-wrapper">
            <SessionMonitor />
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
            <div className="content-wrapper">
                <Navbar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_URL, notificationService } from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [connection, setConnection] = useState(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        fetchNotifications();

        const hubUrl = API_URL.replace('/api', '/notificationHub');
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => localStorage.getItem('token')
            })
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);
    }, [fetchNotifications]);

    useEffect(() => {
        if (connection) {
            connection.start()
                .then(() => {
                    console.log('Connected to NotificationHub');
                    connection.on('ReceiveNotification', (rawNotification) => {
                        // Map PascalCase to camelCase if necessary (SignalR often sends PascalCase)
                        const notification = {
                            notificationId: rawNotification.notificationId || rawNotification.NotificationId,
                            title: rawNotification.title || rawNotification.Title,
                            message: rawNotification.message || rawNotification.Message,
                            type: rawNotification.type || rawNotification.Type,
                            targetUrl: rawNotification.targetUrl || rawNotification.TargetUrl,
                            // Use local system time for live notifications to ensure perfect 'just now' display
                            createdDate: new Date().toISOString(), 
                            isRead: rawNotification.isRead !== undefined ? rawNotification.isRead : rawNotification.IsRead,
                            isLive: true
                        };

                        setNotifications(prev => [notification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        
                        // Show a browser notification
                        if (Notification.permission === 'granted') {
                            new Notification(notification.title, {
                                body: notification.message,
                            });
                        }
                    });
                })
                .catch(err => console.error('Connection failed: ', err));

            return () => {
                connection.stop();
            };
        }
    }, [connection]);

    const markAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => 
                prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const value = {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

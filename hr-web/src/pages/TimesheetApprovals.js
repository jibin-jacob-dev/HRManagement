import React, { useState, useEffect } from 'react';
import { Container, Button, Badge, Card, Modal, Form, Row, Col, Collapse } from 'react-bootstrap';
import { timesheetService } from '../services/api';
import alertService from '../services/alertService';
import moment from 'moment';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TimesheetApprovals = () => {
    const [pendingTimesheets, setPendingTimesheets] = useState([]);
    const [historyTimesheets, setHistoryTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTimesheet, setSelectedTimesheet] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [comment, setComment] = useState('');
    const [actionType, setActionType] = useState('approve');
    const [expandedId, setExpandedId] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');
    
    // Filters
    const [filters, setFilters] = useState({
        employeeName: '',
        status: '',
        startDate: ''
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [activeTab, filters.startDate, filters.status, filters.employeeName]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'pending') {
                let data = await timesheetService.getPendingTimesheets();
                if (filters.employeeName) {
                    data = data.filter(t => 
                        `${t.employee?.firstName} ${t.employee?.lastName}`
                        .toLowerCase().includes(filters.employeeName.toLowerCase())
                    );
                }
                setPendingTimesheets(data);
            } else {
                // When in history, we still might want to refresh the pending count 
                // but for simplicity and performance, we'll just fetch history here.
                // The pending count was set the last time the user was on the Pending tab.
                const data = await timesheetService.getTeamHistory({
                    status: filters.status,
                    employeeName: filters.employeeName,
                    startDate: filters.startDate
                });
                setHistoryTimesheets(data);
                
                // Optional: proactively fetch pending count if it's 0 to ensure badge is accurate
                if (pendingTimesheets.length === 0) {
                    const pending = await timesheetService.getPendingTimesheets();
                    setPendingTimesheets(pending);
                }
            }
        } catch (error) {
            console.error('Error fetching timesheets:', error);
            alertService.showToast('Failed to fetch timesheets', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        fetchData();
    };

    const handleActionClick = (timesheet, action) => {
        setSelectedTimesheet(timesheet);
        setActionType(action);
        setComment('');
        setShowModal(true);
    };

    const handleConfirmAction = async () => {
        try {
            if (actionType === 'approve') {
                await timesheetService.approveTimesheet(selectedTimesheet.timesheetId, comment);
                alertService.showToast('Timesheet approved');
            } else {
                await timesheetService.rejectTimesheet(selectedTimesheet.timesheetId, comment);
                alertService.showToast('Timesheet rejected');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error(`Error ${actionType}ing timesheet:`, error);
            alertService.showToast(`Failed to ${actionType} timesheet`, 'error');
        }
    };

    const getStatusTheme = (status) => {
        switch (status) {
            case 'Approved': return { color: 'success', icon: 'fa-check-circle' };
            case 'Rejected': return { color: 'danger', icon: 'fa-times-circle' };
            case 'Submitted': return { color: 'warning', icon: 'fa-clock' };
            default: return { color: 'primary', icon: 'fa-info-circle' };
        }
    };

    const statusOptions = [
        { value: '', label: 'All Logs' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Rejected', label: 'Rejected' },
    ];

    const isDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#f8f9fa',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '2px 0',
            boxShadow: 'none',
            cursor: 'pointer',
            minHeight: '42px'
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#2b3035' : '#fff',
            borderRadius: '0.5rem',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            zIndex: 1000
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? 'var(--bs-primary)' 
                : state.isFocused 
                    ? (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(13, 110, 253, 0.05)')
                    : 'transparent',
            color: state.isSelected 
                ? '#fff' 
                : isDarkMode ? '#dee2e6' : '#212529',
            cursor: 'pointer',
            padding: '10px 15px',
            fontSize: '0.875rem',
            fontWeight: '500',
            active: {
                backgroundColor: 'var(--bs-primary)'
            }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#dee2e6' : '#212529',
            fontSize: '0.95rem',
            fontWeight: '500'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? 'rgba(222, 226, 230, 0.5)' : 'rgba(33, 37, 41, 0.5)',
            fontSize: '0.95rem'
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? 'rgba(222, 226, 230, 0.4)' : 'rgba(33, 37, 41, 0.4)',
            '&:hover': {
                color: 'var(--bs-primary)'
            }
        })
    };

    const displayData = activeTab === 'pending' ? pendingTimesheets : historyTimesheets;

    // Helper to get Monday of the selected week
    const getWeekStart = (date) => {
        if (!date) return null;
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    const handleWeekChange = (date) => {
        if (date) {
            const weekStart = getWeekStart(date);
            const formattedDate = moment(weekStart).format('YYYY-MM-DD');
            setFilters({...filters, startDate: formattedDate});
        } else {
            setFilters({...filters, startDate: ''});
        }
    };

    return (
        <Container fluid className="timesheet-approvals-container page-animate p-0 pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="fw-bold mb-1">Timesheet Approvals</h2>
                    <p className="text-muted small mb-0">Review and approve employee weekly timesheets.</p>
                </div>
                
                <div className="approvals-tabs d-flex p-1">
                    <Button 
                        variant={activeTab === 'pending' ? 'white' : 'transparent'} 
                        className={`px-4 py-2 border-0 shadow-${activeTab === 'pending' ? 'sm' : 'none'} rounded-3 fw-semibold ${activeTab === 'pending' ? 'text-primary' : 'text-muted opacity-75'}`}
                        onClick={() => setActiveTab('pending')}
                        style={{ minWidth: '140px' }}
                    >
                        Pending <Badge bg="primary" pill className={`ms-2 bg-opacity-10 text-primary ${activeTab === 'pending' ? 'opacity-100' : 'opacity-50'}`}>{pendingTimesheets.length}</Badge>
                    </Button>
                    <Button 
                        variant={activeTab === 'history' ? 'white' : 'transparent'} 
                        className={`px-4 py-2 border-0 shadow-${activeTab === 'history' ? 'sm' : 'none'} rounded-3 fw-semibold ${activeTab === 'history' ? 'text-primary' : 'text-muted opacity-75'}`}
                        onClick={() => setActiveTab('history')}
                        style={{ minWidth: '140px' }}
                    >
                        History
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="border-0 shadow-sm mb-4 px-3 py-3 rounded-4 bg-body">
                <Form onSubmit={handleSearch} className="row g-3 align-items-end">
                    <Col md={activeTab === 'history' ? 3 : 5}>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-1 opacity-75">Employee Name</Form.Label>
                        <Form.Control 
                            type="text"
                            placeholder="All Employees..."
                            className="bg-light border-0 py-2 shadow-none"
                            value={filters.employeeName}
                            onChange={(e) => setFilters({...filters, employeeName: e.target.value})}
                        />
                    </Col>
                    
                    {activeTab === 'history' && (
                        <Col md={3}>
                            <Form.Label className="small fw-bold text-muted text-uppercase mb-1 opacity-75">Status</Form.Label>
                            <Select 
                                options={statusOptions}
                                value={statusOptions.find(opt => opt.value === filters.status)}
                                onChange={(opt) => setFilters({...filters, status: opt.value})}
                                styles={customSelectStyles}
                                isSearchable={false}
                                placeholder="Filter status..."
                            />
                        </Col>
                    )}

                    <Col md={activeTab === 'history' ? 3 : 5}>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-1 opacity-75">Week of</Form.Label>
                        <DatePicker
                            selected={filters.startDate ? new Date(filters.startDate) : null}
                            onChange={handleWeekChange}
                            showWeekNumbers
                            showWeekPicker
                            dateFormat="'Week' w, yyyy"
                            placeholderText="Select a week..."
                            className="form-control bg-light border-0 py-2 shadow-none"
                            calendarClassName="custom-week-picker"
                        />
                    </Col>

                    <Col md={activeTab === 'history' ? 3 : 2}>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-1 opacity-75" style={{visibility: 'hidden'}}>Actions</Form.Label>
                        <div className="d-flex justify-content-end">
                            <Button variant="light" className="border-0 px-3 py-2 bg-light hover-bg-primary-soft rounded-3 w-100" onClick={() => {
                                setFilters({employeeName: '', status: '', startDate: ''});
                                fetchData();
                            }}>
                                <i className="fas fa-undo opacity-50 me-2"></i>
                                <span className="small fw-bold text-muted text-uppercase tracking-wider">Reset</span>
                            </Button>
                        </div>
                    </Col>
                </Form>
            </Card>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            ) : displayData.length === 0 ? (
                <div className="text-center py-5">
                    <i className="fas fa-folder-open text-muted fa-3x mb-3 opacity-25"></i>
                    <h5 className="text-muted">No records found</h5>
                </div>
            ) : (
                <Row className="g-4">
                    {displayData.map(t => (
                        <Col lg={4} md={6} key={t.timesheetId}>
                            <Card className={`approval-card ${expandedId === t.timesheetId ? 'expanded' : ''}`}>
                                <Card.Body className="p-4">
                                    <div className="d-flex align-items-start justify-content-between mb-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="avatar-initials">
                                                {t.employee?.firstName?.charAt(0)}{t.employee?.lastName?.charAt(0)}
                                            </div>
                                            <div>
                                                <h5 className="mb-0 fw-bold">{t.employee?.firstName} {t.employee?.lastName}</h5>
                                                <div className="small text-muted d-flex align-items-center gap-1 opacity-75">
                                                    <i className="fas fa-briefcase opacity-50"></i>
                                                    {t.employee?.position?.positionTitle || 'Staff Member'}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge bg={getStatusTheme(t.status).color} className={`bg-opacity-10 text-muted border-0 rounded-pill px-3 py-2 fw-medium`}>
                                            <i className={`fas ${getStatusTheme(t.status).icon} me-1 opacity-75`}></i>
                                            {t.status}
                                        </Badge>
                                    </div>

                                    <div className="mb-4 bg-light bg-opacity-25 rounded-4 p-3 border border-light">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <span className="small fw-bold text-muted text-uppercase tracking-wider opacity-75">Weekly Summary</span>
                                            <span className="h4 mb-0 fw-bold text-primary">{t.totalHours} <small className="fs-6 text-muted fw-normal opacity-75">hrs</small></span>
                                        </div>
                                        <div className="daily-stat-grid">
                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                                                const date = moment(t.startDate).add(idx, 'days');
                                                const entry = t.entries?.find(e => moment(e.date).isSame(date, 'day'));
                                                const hours = entry ? entry.hours : 0;
                                                const isAutomated = entry?.isAutomated;
                                                
                                                return (
                                                    <div key={idx} className={`daily-stat-item ${hours > 0 ? (isAutomated ? 'automated' : 'active') : ''}`}>
                                                        <div className="daily-stat-label">{day}</div>
                                                        <div className="daily-stat-value">{hours}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="text-muted small">
                                            <i className="far fa-calendar-alt me-1"></i>
                                            {moment(t.startDate).format('MMM D')} - {moment(t.endDate).format('MMM D')}
                                        </div>
                                        <Button 
                                            variant="link" 
                                            className="p-0 text-decoration-none fw-bold small transition-300"
                                            onClick={() => setExpandedId(expandedId === t.timesheetId ? null : t.timesheetId)}
                                        >
                                            {expandedId === t.timesheetId ? 'Collapse' : 'Details'}
                                            <i className={`fas fa-chevron-${expandedId === t.timesheetId ? 'up' : 'down'} ms-1`}></i>
                                        </Button>
                                    </div>

                                    <Collapse in={expandedId === t.timesheetId}>
                                        <div className="expanded-details border-top pt-4 mt-2">
                                            <div className="details-header d-flex justify-content-between align-items-center mb-2 px-3">
                                                <span className="extra-small fw-bold text-muted text-uppercase tracking-wider">Day & Description</span>
                                                <span className="extra-small fw-bold text-muted text-uppercase tracking-wider">Hrs</span>
                                            </div>
                                            <div className="daily-list">
                                                {t.entries?.sort((a,b) => new Date(a.date) - new Date(b.date)).map((entry, idx) => (
                                                    <div key={idx} className="daily-entry-item d-flex align-items-center gap-3">
                                                        <div className={`day-circle bg-${entry.isAutomated ? 'success' : 'primary'} bg-opacity-10 text-${entry.isAutomated ? 'success' : 'primary'}`}>
                                                            <span className="extra-small opacity-75">{moment(entry.date).format('ddd')}</span>
                                                            <span className="fw-bold">{moment(entry.date).format('D')}</span>
                                                        </div>
                                                        <div className="flex-grow-1 min-width-0">
                                                            <div className="small fw-medium text-dark-emphasis text-truncate mb-0">
                                                                {entry.description || <span className="text-muted fw-normal opacity-50">No description logged</span>}
                                                            </div>
                                                            {entry.isAutomated && (
                                                                <div className="extra-small text-muted opacity-75 d-flex align-items-center gap-1 mt-1">
                                                                    <i className="fas fa-magic extra-small"></i>
                                                                    Auto-filled: {entry.automatedType}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-end ms-2">
                                                            <div className="fw-bold text-dark-emphasis">{entry.hours}</div>
                                                            <div className="extra-small text-muted opacity-50">hrs</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Collapse>

                                    <div className="card-footer-actions d-flex justify-content-between align-items-center">
                                        <div className="text-dark-emphasis opacity-75 fw-medium">
                                            {t.status === 'Submitted' ? `Submitted ${moment(t.submittedDate).fromNow()}` : `Processed ${moment(t.approvedDate || t.submittedDate).format('MMM D')}`}
                                        </div>
                                        <div className="d-flex gap-2">
                                            {t.status === 'Submitted' ? (
                                                <>
                                                    <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => handleActionClick(t, 'reject')}>Reject</Button>
                                                    <Button variant="primary" size="sm" className="rounded-pill px-4" onClick={() => handleActionClick(t, 'approve')}>
                                                        <i className="fas fa-check me-1"></i> Approve
                                                    </Button>
                                                </>
                                            ) : (
                                                <Badge className={`bg-${getStatusTheme(t.status).color} bg-opacity-10 text-${getStatusTheme(t.status).color} border border-${getStatusTheme(t.status).color} border-opacity-10 fw-bold px-3 py-2 rounded-pill small`}>
                                                    {t.totalHours}H TOTAL
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {t.managerComment && (
                                        <div className={`mt-4 p-3 rounded-4 bg-${getStatusTheme(t.status).color} bg-opacity-10 border border-${getStatusTheme(t.status).color} border-opacity-10`}>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <i className={`fas fa-comment-dots text-${getStatusTheme(t.status).color} opacity-75 extra-small`}></i>
                                                <span className={`extra-small fw-bold text-${getStatusTheme(t.status).color} text-uppercase tracking-wider`}>Manager Feedback</span>
                                            </div>
                                            <div className="small text-dark-emphasis opacity-90 line-height-sm">{t.managerComment}</div>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">{actionType === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="bg-light p-3 rounded-3 mb-3">
                        <div className="small text-muted">Timesheet for</div>
                        <div className="fw-bold">{selectedTimesheet?.employee?.firstName} {selectedTimesheet?.employee?.lastName}</div>
                    </div>
                    <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Comments (Optional)</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a reason or message..."
                            className="bg-light border-0"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 pb-4">
                    <Button variant="light" onClick={() => setShowModal(false)} className="px-4">Cancel</Button>
                    <Button 
                        variant={actionType === 'approve' ? 'success' : 'danger'} 
                        onClick={handleConfirmAction} 
                        className="px-4 fw-bold"
                    >
                        {actionType === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};


export default TimesheetApprovals;

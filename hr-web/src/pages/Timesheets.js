import React, { useState, useEffect } from 'react';
import { Container, Button, Card, Form, Badge, Row, Col } from 'react-bootstrap';
import { timesheetService } from '../services/api';
import alertService from '../services/alertService';
import moment from 'moment';

const Timesheets = () => {
    const [timesheets, setTimesheets] = useState([]);
    const [currentTimesheet, setCurrentTimesheet] = useState(null);
    const [selectedWeekStart, setSelectedWeekStart] = useState(moment().startOf('week').add(1, 'days')); // Monday
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        fetchMyTimesheets();
    }, []);

    useEffect(() => {
        loadTimesheetForWeek(selectedWeekStart);
    }, [selectedWeekStart]);

    const fetchMyTimesheets = async () => {
        try {
            const data = await timesheetService.getMyTimesheets();
            setTimesheets(data);
        } catch (error) {
            console.error('Error fetching timesheets:', error);
        }
    };

    const loadTimesheetForWeek = async (weekStart) => {
        try {
            const weekInfo = await timesheetService.getWeekInfo(weekStart.format('YYYY-MM-DD'));
            const { timesheet, holidays, leaves } = weekInfo;
            
            setCurrentTimesheet(timesheet);
            
            const days = [];
            for (let i = 0; i < 7; i++) {
                const date = moment(weekStart).add(i, 'days');
                
                // Check policy priority: Leave > Holiday > Weekend > Normal
                const holiday = holidays.find(h => moment(h.date).isSame(date, 'day'));
                const leave = leaves.find(l => 
                    moment(date).isSameOrAfter(moment(l.startDate), 'day') && 
                    moment(date).isSameOrBefore(moment(l.endDate), 'day')
                );
                const isWeekend = date.day() === 0 || date.day() === 6;

                let entry = timesheet?.entries?.find(e => moment(e.date).isSame(date, 'day'));
                
                let dayData = {
                    date: date.toDate(),
                    hours: entry ? entry.hours : 0,
                    description: entry ? entry.description || '' : '',
                    isAutomated: entry ? entry.isAutomated : false,
                    automatedType: entry ? entry.automatedType : null,
                    policyStatus: null // Local UI state for metadata
                };

                if (leave) {
                    dayData.hours = 8;
                    dayData.description = `${leave.leaveType?.name || 'Leave'} (Approved)`;
                    dayData.isAutomated = true;
                    dayData.automatedType = 'Leave';
                    dayData.policyStatus = 'On Leave';
                } else if (holiday) {
                    dayData.hours = 8;
                    dayData.description = `Public Holiday: ${holiday.name}`;
                    dayData.isAutomated = true;
                    dayData.automatedType = 'Holiday';
                    dayData.policyStatus = 'Holiday';
                } else if (isWeekend) {
                    dayData.isAutomated = true;
                    dayData.automatedType = 'Weekend';
                    dayData.policyStatus = 'Weekend';
                }

                days.push(dayData);
            }
            setEntries(days);
        } catch (error) {
            console.error('Error loading week:', error);
            alertService.showToast('Error loading timesheet info', 'error');
        } finally {
        }
    };

    const handleHourChange = (index, value) => {
        const newEntries = [...entries];
        newEntries[index].hours = parseFloat(value) || 0;
        setEntries(newEntries);
    };

    const handleDescChange = (index, value) => {
        const newEntries = [...entries];
        newEntries[index].description = value;
        setEntries(newEntries);
    };

    const handleSave = async (submit = false) => {
        try {
            const payload = {
                startDate: selectedWeekStart.format('YYYY-MM-DD'),
                entries: entries.map(e => ({
                    date: moment(e.date).format('YYYY-MM-DD'),
                    hours: e.hours,
                    description: e.description,
                    isAutomated: e.isAutomated,
                    automatedType: e.automatedType
                }))
            };

            const saved = await timesheetService.saveTimesheet(payload);
            
            if (submit) {
                await timesheetService.submitTimesheet(saved.timesheetId);
                alertService.showToast('Timesheet submitted successfully');
            } else {
                alertService.showToast('Timesheet saved as draft');
            }
            
            fetchMyTimesheets();
            loadTimesheetForWeek(selectedWeekStart);
        } catch (error) {
            console.error('Error saving timesheet:', error);
            alertService.showToast('Failed to save timesheet', 'error');
        }
    };

    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const targetHours = 40;
    const completionPercentage = Math.min((totalHours / targetHours) * 100, 100);

    const getStatusInfo = (status) => {
        const map = {
            'Draft': { color: 'secondary', icon: 'fa-pencil-alt' },
            'Submitted': { color: 'warning', icon: 'fa-paper-plane' },
            'Approved': { color: 'success', icon: 'fa-check-circle' },
            'Rejected': { color: 'danger', icon: 'fa-times-circle' }
        };
        return map[status] || { color: 'primary', icon: 'fa-info-circle' };
    };

    const isReadOnly = currentTimesheet && currentTimesheet.status !== 'Draft' && currentTimesheet.status !== 'Rejected';

    return (
        <Container fluid className="timesheets-container page-animate pb-5">
            {/* Header Area */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">My Weekly Timesheet</h2>
                    <div className="d-flex align-items-center gap-2">
                        <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                            <i className="fas fa-calendar-week me-2"></i>
                            {selectedWeekStart.format('MMMM D')} - {moment(selectedWeekStart).add(6, 'days').format('D, YYYY')}
                        </Badge>
                        {currentTimesheet && (
                            <Badge bg={getStatusInfo(currentTimesheet.status).color} className="px-3 py-2">
                                <i className={`fas ${getStatusInfo(currentTimesheet.status).icon} me-2`}></i>
                                {currentTimesheet.status}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <Button 
                        variant="light" 
                        className="btn-glass border shadow-sm"
                        onClick={() => setSelectedWeekStart(moment(selectedWeekStart).subtract(1, 'week'))}
                    >
                        <i className="fas fa-chevron-left"></i>
                    </Button>
                    <Button 
                        variant="light" 
                        className="btn-glass border shadow-sm"
                        onClick={() => setSelectedWeekStart(moment(selectedWeekStart).add(1, 'week'))}
                    >
                        <i className="fas fa-chevron-right"></i>
                    </Button>
                    <Button 
                        variant="primary" 
                        className="px-4 shadow-sm"
                        onClick={() => setSelectedWeekStart(moment().startOf('week').add(1, 'days'))}
                    >
                        Current Week
                    </Button>
                </div>
            </div>

            {/* Summary Statistics */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="stat-card p-4 h-100">
                        <div className="icon-box bg-primary bg-opacity-10 text-primary">
                            <i className="fas fa-clock"></i>
                        </div>
                        <h6 className="text-muted small fw-bold text-uppercase mb-1">Total Hours</h6>
                        <h3 className="mb-0 fw-bold">{totalHours} <small className="text-muted fs-6">/ {targetHours}</small></h3>
                        <div className="mt-3">
                            <div className="progress-glass">
                                <div 
                                    className="progress-bar bg-primary" 
                                    style={{ width: `${completionPercentage}%`, height: '100%' }}
                                ></div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="stat-card p-4 h-100">
                        <div className="icon-box bg-success bg-opacity-10 text-success">
                            <i className="fas fa-calendar-check"></i>
                        </div>
                        <h6 className="text-muted small fw-bold text-uppercase mb-1">Days Logged</h6>
                        <h3 className="mb-0 fw-bold">{entries.filter(e => e.hours > 0).length} <small className="text-muted fs-6">/ 5</small></h3>
                        <p className="text-muted small mb-0 mt-2">Active this week</p>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="stat-card p-4 h-100">
                        <div className={`icon-box bg-${getStatusInfo(currentTimesheet?.status || 'Draft').color} bg-opacity-10 text-${getStatusInfo(currentTimesheet?.status || 'Draft').color}`}>
                            <i className={`fas ${getStatusInfo(currentTimesheet?.status || 'Draft').icon}`}></i>
                        </div>
                        <h6 className="text-muted small fw-bold text-uppercase mb-1">Current Status</h6>
                        <h3 className="mb-0 fw-bold">{currentTimesheet?.status || 'Draft'}</h3>
                        <p className="text-muted small mb-0 mt-2">Week status</p>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="stat-card p-4 h-100 bg-primary text-white border-0 shadow-lg">
                        <h6 className="text-white-50 small fw-bold text-uppercase mb-3">Quick Actions</h6>
                        <div className="d-grid gap-2">
                            <Button 
                                variant="white" 
                                className="bg-white text-primary fw-bold" 
                                onClick={() => handleSave(false)}
                                disabled={isReadOnly}
                            >
                                <i className="fas fa-save me-2"></i> Save Draft
                            </Button>
                            <Button 
                                variant="outline-light" 
                                className="fw-bold border-2"
                                onClick={() => handleSave(true)}
                                disabled={isReadOnly || totalHours === 0}
                            >
                                <i className="fas fa-paper-plane me-2"></i> Submit Week
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Main Log Area */}
                <Col lg={8}>
                    <Card className="stat-card p-0 overflow-hidden border-0 shadow-sm">
                        <div className="p-4 bg-light bg-opacity-10 border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold text-dark-emphasis">Daily Time Logs</h5>
                            <span className="text-muted small">Standard working: 8h / day</span>
                        </div>
                        <div className="p-4">
                            {entries.map((entry, index) => {
                                const isAutomated = entry.isAutomated;
                                const isLocked = isReadOnly || isAutomated;
                                
                                return (
                                    <div key={index} className={`timesheet-entry-card p-3 mb-3 d-flex align-items-center gap-4 ${isAutomated ? 'automated-entry' : ''}`}>
                                        <div className="d-flex flex-column align-items-center">
                                            <div style={{ height: '22px' }}></div> {/* Empty space to match Label height */}
                                            <div className={`day-badge bg-${entry.policyStatus === 'Holiday' ? 'danger' : entry.policyStatus === 'On Leave' ? 'success' : moment(entry.date).day() === 0 || moment(entry.date).day() === 6 ? 'secondary' : 'primary'} bg-opacity-10 text-${entry.policyStatus === 'Holiday' ? 'danger' : entry.policyStatus === 'On Leave' ? 'success' : 'primary'}`}>
                                                <span style={{ fontSize: '0.6rem' }}>{moment(entry.date).format('ddd').toUpperCase()}</span>
                                                <span className="fs-5">{moment(entry.date).format('DD')}</span>
                                            </div>
                                        </div>
                                        
                                        <div style={{ width: '100px' }}>
                                            <Form.Label className="small text-muted mb-1">Hours</Form.Label>
                                            <Form.Control 
                                                type="number" 
                                                step="0.5" 
                                                min="0" 
                                                max="24"
                                                value={entry.hours}
                                                onChange={(e) => handleHourChange(index, e.target.value)}
                                                disabled={isLocked}
                                                className={`fw-bold text-center border-2 border-primary border-opacity-10 rounded-3 py-2 ${isAutomated ? 'bg-light opacity-75' : ''}`}
                                            />
                                        </div>
                                        
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-end mb-1">
                                                <Form.Label className="small text-muted mb-0">Work Description</Form.Label>
                                                {entry.policyStatus && (
                                                    <Badge bg={entry.policyStatus === 'Holiday' ? 'danger' : entry.policyStatus === 'On Leave' ? 'success' : 'secondary'} className="bg-opacity-10 text-muted border-0 fw-normal">
                                                        {entry.policyStatus}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Form.Control 
                                                type="text"
                                                placeholder={isAutomated ? "" : "e.g. Project development, Sync meeting..."}
                                                value={entry.description}
                                                onChange={(e) => handleDescChange(index, e.target.value)}
                                                disabled={isLocked}
                                                className={`border-0 bg-light-50 shadow-none px-3 fs-6 rounded-3 ${isAutomated ? 'opacity-75' : ''}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Col>

                {/* History Sidebar */}
                <Col lg={4}>
                    <Card className="stat-card p-0 border-0 shadow-sm overflow-hidden h-100">
                        <div className="p-4 bg-white bg-opacity-10 border-bottom">
                            <h5 className="mb-0 fw-bold text-primary">Recent History</h5>
                        </div>
                        <div className="p-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {timesheets.length > 0 ? (
                                timesheets.map(t => (
                                    <div 
                                        key={t.timesheetId} 
                                        className={`history-item p-3 cursor-pointer ${moment(t.startDate).isSame(selectedWeekStart, 'day') ? 'active' : ''}`}
                                        onClick={() => setSelectedWeekStart(moment(t.startDate))}
                                    >
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="fw-bold small">Week of {moment(t.startDate).format('MMM D')}</span>
                                            <Badge bg={getStatusInfo(t.status).color} size="sm" className={`bg-opacity-10 border-0 text-${getStatusInfo(t.status).color}`}>
                                                {t.status}
                                            </Badge>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="small text-muted">
                                                <i className="far fa-clock me-1"></i> {t.totalHours} hrs logged
                                            </div>
                                            <i className="fas fa-chevron-right text-muted small"></i>
                                        </div>
                                        {t.managerComment && (
                                            <div className={`mt-2 p-2 rounded-2 bg-${getStatusInfo(t.status).color} bg-opacity-10 border border-${getStatusInfo(t.status).color} border-opacity-25`}>
                                                <div className={`small fw-bold text-${getStatusInfo(t.status).color} mb-1`}>
                                                    <i className="fas fa-comment-dots me-1"></i> Feedback
                                                </div>
                                                <div className="small text-dark-emphasis opacity-75" style={{ fontSize: '0.75rem' }}>
                                                    {t.managerComment}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="fas fa-history fa-2x mb-3 opacity-25"></i>
                                    <p className="small">No previous logs found</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Timesheets;

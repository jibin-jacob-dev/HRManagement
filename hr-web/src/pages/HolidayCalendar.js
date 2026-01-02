import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Modal, Form, Badge, ButtonGroup, Card } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { publicHolidayService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './HolidayCalendar.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const localizer = momentLocalizer(moment);

const HolidayCalendar = () => {
    const [holidays, setHolidays] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [quickFilterText, setQuickFilterText] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        description: ''
    });
    const [calendarDate, setCalendarDate] = useState(new Date());

    const { canEdit } = usePermission('Holiday Calendar');
    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    // Update calendar date when year changes via dropdown
    useEffect(() => {
        if (calendarDate.getFullYear() !== selectedYear) {
            setCalendarDate(new Date(selectedYear, calendarDate.getMonth(), 1));
        }
    }, [selectedYear]);

    const fetchData = async () => {
        try {
            const data = await publicHolidayService.getPublicHolidays(selectedYear);
            setHolidays(data);
        } catch (error) {
            alertService.showToast('Failed to fetch public holidays', 'error');
        }
    };

    const handleNavigate = (newDate) => {
        setCalendarDate(newDate);
        if (newDate.getFullYear() !== selectedYear) {
            setSelectedYear(newDate.getFullYear());
        }
    };

    const handleAdd = () => {
        setEditingHoliday(null);
        setFormData({
            name: '',
            date: new Date(),
            description: ''
        });
        setShowModal(true);
    };

    const handleEdit = (holiday) => {
        setEditingHoliday(holiday);
        setFormData({
            name: holiday.name,
            date: new Date(holiday.date),
            description: holiday.description || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                date: moment(formData.date).format('YYYY-MM-DD')
            };
            if (editingHoliday) {
                await publicHolidayService.updatePublicHoliday(editingHoliday.publicHolidayId, payload);
                alertService.showToast('Holiday updated successfully');
            } else {
                await publicHolidayService.createPublicHoliday(payload);
                alertService.showToast('Holiday added successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alertService.showToast(editingHoliday ? 'Failed to update holiday' : 'Failed to add holiday', 'error');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Holiday?',
            'Are you sure you want to delete this holiday? This action cannot be undone.',
            'Yes, Delete It'
        );

        if (confirmed) {
            try {
                await publicHolidayService.deletePublicHoliday(id);
                alertService.showToast('Holiday deleted successfully');
                fetchData();
            } catch (error) {
                alertService.showToast('Failed to delete holiday', 'error');
            }
        }
    };

    const columnDefs = useMemo(() => [
        {
            headerName: 'Holiday Name',
            field: 'name',
            flex: 2,
            filter: true,
            sortable: true
        },
        {
            headerName: 'Date',
            field: 'date',
            flex: 1,
            filter: true,
            sortable: true,
            valueFormatter: (params) => {
                return params.value ? moment(params.value).format('DD MMM YYYY') : '';
            }
        },
        {
            headerName: 'Day',
            field: 'date',
            flex: 1,
            valueFormatter: (params) => {
                return params.value ? moment(params.value).format('dddd') : '';
            }
        },
        {
            headerName: 'Description',
            field: 'description',
            flex: 2,
            filter: true
        },
        {
            headerName: 'Actions',
            flex: 1,
            cellRenderer: (params) => (
                <div className="d-flex h-100 align-items-center justify-content-center gap-2">
                    {canEdit && (
                        <>
                            <Button
                                variant="link"
                                className="p-0 grid-action-btn text-primary"
                                onClick={() => handleEdit(params.data)}
                                title="Edit Holiday"
                            >
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                                variant="link"
                                className="p-0 grid-action-btn text-danger"
                                onClick={() => handleDelete(params.data.publicHolidayId)}
                                title="Delete Holiday"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        </>
                    )}
                </div>
            )
        }
    ], [canEdit]);

    // Calendar events for react-big-calendar
    const calendarEvents = useMemo(() => {
        return holidays.map(holiday => ({
            id: holiday.publicHolidayId,
            title: holiday.name,
            start: new Date(holiday.date),
            end: new Date(holiday.date),
            allDay: true,
            resource: holiday
        }));
    }, [holidays]);

    const handleSelectSlot = ({ start }) => {
        if (canEdit) {
            setEditingHoliday(null);
            setFormData({
                name: '',
                date: start,
                description: ''
            });
            setShowModal(true);
        }
    };

    const handleSelectEvent = (event) => {
        if (canEdit) {
            handleEdit(event.resource);
        }
    };

    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: 'var(--bs-primary)',
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: 'none',
                display: 'block',
                padding: '0', // Container padding removed to let custom component fill space
                fontSize: '0.85rem',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                height: '100%',
                overflow: 'hidden'
            }
        };
    };

    // Custom Component to render the event with a delete icon
    const CalendarEvent = ({ event }) => (
        <div className="d-flex align-items-center justify-content-between px-2 h-100 calendar-event-stripe">
            <span className="text-truncate me-1">{event.title}</span>
            {canEdit && (
                <button 
                    className="btn btn-link p-0 text-white opacity-75 hover-opacity-100 calendar-stripe-delete"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent opening the modal
                        handleDelete(event.id);
                    }}
                    title="Delete Holiday"
                >
                    <i className="fas fa-times-circle" style={{ fontSize: '0.9rem' }}></i>
                </button>
            )}
        </div>
    );

    return (
        <Container fluid className="holiday-calendar-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Holiday Calendar</h2>
                    <p className="text-muted small mb-0">Manage public holidays and organizational closures</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <Form.Group className="mb-0">
                        <Form.Select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            style={{ width: '120px' }}
                            className="border-2"
                        >
                            {[...Array(5)].map((_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </Form.Select>
                    </Form.Group>
                    <ButtonGroup className="shadow-sm">
                        <Button
                            variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
                            onClick={() => setViewMode('grid')}
                            className="px-3"
                        >
                            <i className="fas fa-table me-2"></i> Grid
                        </Button>
                        <Button
                            variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'}
                            onClick={() => setViewMode('calendar')}
                            className="px-3"
                        >
                            <i className="fas fa-calendar-alt me-2"></i> Calendar
                        </Button>
                    </ButtonGroup>
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            placeholder="Search holidays..."
                            className="search-input"
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                            <i className="fas fa-plus me-2"></i> Add Holiday
                        </Button>
                    )}
                </div>
            </div>

            {viewMode === 'grid' ? (
                <GridContainer>
                    <AgGridReact
                        rowData={holidays}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        theme={gridTheme}
                        suppressCellFocus={suppressCellFocus}
                        animateRows={true}
                        pagination={true}
                        paginationPageSize={10}
                        quickFilterText={quickFilterText}
                        rowHeight={60}
                        headerHeight={52}
                    />
                </GridContainer>
            ) : (
                <Card className="shadow-sm">
                    <Card.Body style={{ height: '700px' }}>
                        <Calendar
                            localizer={localizer}
                            events={calendarEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            date={calendarDate}
                            onNavigate={handleNavigate}
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            selectable={canEdit}
                            eventPropGetter={eventStyleGetter}
                            components={{
                                event: CalendarEvent
                            }}
                            views={['month', 'agenda']}
                            defaultView="month"
                        />
                    </Card.Body>
                </Card>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingHoliday ? 'Edit Holiday' : 'Create New Holiday'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Holiday Name *</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. New Year's Day"
                                className="form-control-lg border-2"
                                autoFocus
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Date *</Form.Label>
                            <div className="datepicker-wrapper">
                                <DatePicker
                                    selected={formData.date ? new Date(formData.date) : null}
                                    onChange={(date) => setFormData({ ...formData, date: date })}
                                    dateFormat="MMMM d, yyyy"
                                    className="form-control form-control-lg border-2"
                                    placeholderText="Select holiday date"
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                    required
                                    portalId="root"
                                />
                                <i className="fas fa-calendar-alt"></i>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter description (optional)"
                                className="border-2"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        {editingHoliday && canEdit && (
                            <Button 
                                variant="outline-danger" 
                                className="px-4 me-2 border-2"
                                onClick={() => {
                                    setShowModal(false);
                                    handleDelete(editingHoliday.publicHolidayId);
                                }}
                            >
                                <i className="fas fa-trash-alt me-2"></i> Delete
                            </Button>
                        )}
                        <Button variant="primary" type="submit" className="px-4 shadow-sm">
                            {editingHoliday ? 'Save Changes' : 'Create Holiday'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default HolidayCalendar;

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { levelService } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import Swal from 'sweetalert2';

// Custom Styles
import './LevelManagement.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const LevelManagement = () => {
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');

    const { gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await levelService.getLevels();
            setLevels(data);
        } catch (error) {
            console.error('Error fetching levels:', error);
            alertService.showToast('Failed to load levels', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setCurrentLevel({ levelName: '', description: '' });
        setShowModal(true);
    };

    const handleEdit = (level) => {
        setCurrentLevel({ ...level });
        setShowModal(true);
    };

    const handleDelete = async (level) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the ${level.levelName} level. This will affect employees assigned to this level.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            background: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#212529' : '#fff',
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#fff' : '#000'
        });

        if (result.isConfirmed) {
            try {
                await levelService.deleteLevel(level.levelId);
                alertService.showToast('Level deleted successfully');
                fetchData();
            } catch (error) {
                console.error('Error deleting level:', error);
                alertService.showToast('Failed to delete level', 'error');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentLevel.levelId) {
                await levelService.updateLevel(currentLevel.levelId, currentLevel);
                alertService.showToast('Level updated successfully');
            } else {
                await levelService.createLevel(currentLevel);
                alertService.showToast('Level created successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving level:', error);
            alertService.showToast('Failed to save level', 'error');
        }
    };

    const columnDefs = useMemo(() => [
        { field: 'levelId', headerName: 'ID', width: 80, sortable: true },
        { 
            field: 'levelName', 
            headerName: 'Level Name', 
            flex: 1, 
            sortable: true, 
            filter: true,
            cellClass: 'fw-bold text-primary'
        },
        { field: 'description', headerName: 'Description', flex: 2, cellClass: 'text-muted' },
        {
            headerName: 'Actions',
            width: 120,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="d-flex h-100 align-items-center justify-content-center gap-2">
                    <Button 
                        variant="link" 
                        className="p-0 grid-action-btn text-primary" 
                        onClick={() => handleEdit(params.data)}
                        title="Edit Level"
                    >
                        <i className="fas fa-edit"></i>
                    </Button>
                    <Button 
                        variant="link" 
                        className="p-0 grid-action-btn text-danger" 
                        onClick={() => handleDelete(params.data)}
                        title="Delete Level"
                    >
                        <i className="fas fa-trash-alt"></i>
                    </Button>
                </div>
            )
        }
    ], []);

    return (
        <Container fluid className="level-management-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Level Management</h2>
                    <p className="text-muted small mb-0">Define organizational hierarchy levels (e.g. L1, L2, Lead, Manager)</p>
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <div className="search-box-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <Form.Control
                            type="text"
                            placeholder="Search levels..."
                            className="search-input"
                            value={quickFilterText}
                            onChange={(e) => setQuickFilterText(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" className="px-4 shadow-sm" onClick={handleAdd}>
                        <i className="fas fa-plus me-2"></i> Add Level
                    </Button>
                </div>
            </div>

            <GridContainer height="600px">
                <AgGridReact
                    rowData={levels}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    animateRows={true}
                    pagination={true}
                    paginationPageSize={10}
                    paginationPageSizeSelector={[10, 20, 50]}
                    theme={gridTheme}
                    suppressCellFocus={suppressCellFocus}
                    quickFilterText={quickFilterText}
                    rowHeight={60}
                    headerHeight={52}
                />
            </GridContainer>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {currentLevel?.levelId ? 'Edit Level' : 'Create New Level'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Level Name *</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={currentLevel?.levelName || ''}
                                onChange={(e) => setCurrentLevel({ ...currentLevel, levelName: e.target.value })}
                                placeholder="e.g. L1 - Junior"
                                className="form-control-lg border-2"
                                autoFocus
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={currentLevel?.description || ''}
                                onChange={(e) => setCurrentLevel({ ...currentLevel, description: e.target.value })}
                                placeholder="Describe the level requirements or seniority..."
                                className="border-2"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="px-4 shadow-sm">
                            {currentLevel?.levelId ? 'Save Changes' : 'Create Level'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default LevelManagement;

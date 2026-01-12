import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Button, Modal, Form, Badge, InputGroup } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import Select, { components } from 'react-select';
import { salaryStructureService, salaryComponentService, employeeProfileService, API_URL } from '../services/api';
import { useGridSettings } from '../hooks/useGridSettings';
import GridContainer from '../components/common/GridContainer';
import alertService from '../services/alertService';
import { usePermission } from '../hooks/usePermission';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from 'moment';
import './SalaryStructure.css';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const BASE_URL = API_URL.replace('/api', '');

// Custom Option Component for React Select
const CustomOption = (props) => {
    const { data } = props;
    return (
        <components.Option {...props}>
            <div className="d-flex align-items-center justify-content-between w-100">
                <div className="d-flex align-items-center">
                    <div className="me-3">
                        {data.profilePicture ? (
                            <img 
                                src={`${BASE_URL}${data.profilePicture}`} 
                                alt={data.label}
                                className="rounded-circle shadow-sm"
                                style={{ width: '36px', height: '36px', objectFit: 'cover', border: '2px solid rgba(13,110,253,0.1)' }}
                            />
                        ) : (
                            <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
                                <i className="fas fa-user-tie text-primary" style={{ fontSize: '0.9rem' }}></i>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="fw-bold small mb-0">{data.label}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {data.positionName}
                        </div>
                    </div>
                </div>
                <div className="text-end ms-2">
                    <Badge bg="secondary" className="bg-opacity-10 text-secondary border border-secondary-subtle small fw-normal" style={{ fontSize: '0.65rem' }}>
                        {data.departmentName}
                    </Badge>
                </div>
            </div>
        </components.Option>
    );
};

// Custom SingleValue Component for React Select (Selected item)
const CustomSingleValue = (props) => {
    const { data } = props;
    return (
        <components.SingleValue {...props}>
             <div className="d-flex align-items-center">
                <div className="me-2">
                    {data.profilePicture ? (
                        <img 
                            src={`${BASE_URL}${data.profilePicture}`} 
                            alt={data.label}
                            className="rounded-circle"
                            style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                        />
                    ) : (
                        <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                            <i className="fas fa-user-tie text-primary" style={{ fontSize: '0.8rem' }}></i>
                        </div>
                    )}
                </div>
                <div className="fw-bold small">{data.label}</div>
            </div>
        </components.SingleValue>
    );
};

// Custom Option for Salary Components
const CustomComponentOption = (props) => {
    const { data } = props;
    const isEarning = data.type === 'Earning';
    const badgeColor = isEarning ? 'info' : 'warning';
    
    return (
        <components.Option {...props}>
            <div className="d-flex align-items-center justify-content-between py-1">
                <div className="fw-bold small">{data.label}</div>
                <Badge 
                    className={`fw-normal border border-${badgeColor} text-${badgeColor} bg-transparent py-1 px-2`}
                    style={{ fontSize: '0.65rem' }}
                >
                    {data.type}
                </Badge>
            </div>
        </components.Option>
    );
};

const SalaryStructure = () => {
    const { isDarkMode, gridTheme, defaultColDef, suppressCellFocus } = useGridSettings();
    const { canEdit } = usePermission('Salary Structure');
    
    const [employees, setEmployees] = useState([]);
    const [salaryComponents, setSalaryComponents] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [structureData, setStructureData] = useState([]);
    const [summary, setSummary] = useState({ totalEarnings: 0, totalDeductions: 0, netSalary: 0 });
    const [loading, setLoading] = useState(false);
    const [quickFilterText, setQuickFilterText] = useState('');
    
    // Formatting Helpers
    const formatAmount = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = val.toString().replace(/,/g, '');
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        salaryComponentId: '',
        amount: 0,
        effectiveDate: new Date()
    });

    useEffect(() => {
        const init = async () => {
            try {
                const [empList, components] = await Promise.all([
                    employeeProfileService.getEmployeeList(),
                    salaryComponentService.getSalaryComponents()
                ]);
                setEmployees(empList);
                setSalaryComponents(components.filter(c => c.isActive));
            } catch (error) {
                alertService.showToast('Failed to initialize page data', 'error');
            }
        };
        init();
    }, []);

    const employeeOptions = useMemo(() => {
        return employees.map(emp => ({
            value: emp.employeeId,
            label: `${emp.firstName} ${emp.lastName}`,
            profilePicture: emp.profilePicture,
            departmentName: emp.departmentName,
            positionName: emp.positionName
        }));
    }, [employees]);

    const salaryComponentOptions = useMemo(() => {
        return salaryComponents.map(c => ({
            value: c.id,
            label: c.name,
            type: c.type === 0 ? 'Earning' : 'Deduction'
        }));
    }, [salaryComponents]);

    const fetchStructure = async (empId) => {
        if (!empId) {
            setStructureData([]);
            setSummary({ totalEarnings: 0, totalDeductions: 0, netSalary: 0 });
            return;
        }
        
        setLoading(true);
        try {
            const [data, summaryData] = await Promise.all([
                salaryStructureService.getEmployeeStructure(empId),
                salaryStructureService.getSalarySummary(empId)
            ]);
            setStructureData(data);
            setSummary({
                totalEarnings: summaryData.totalEarnings,
                totalDeductions: summaryData.totalDeductions,
                netSalary: summaryData.netSalary
            });
        } catch (error) {
            alertService.showToast('Failed to fetch employee salary structure', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeSelect = (option) => {
        const empId = option ? option.value : '';
        setSelectedEmployeeId(empId);
        fetchStructure(empId);
    };

    const handleAdd = () => {
        if (!selectedEmployeeId) {
            alertService.showToast('Please select an employee first', 'warning');
            return;
        }
        setEditingItem(null);
        setFormData({
            salaryComponentId: '',
            amount: 0,
            effectiveDate: new Date()
        });
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            salaryComponentId: item.salaryComponentId,
            amount: item.amount,
            effectiveDate: item.effectiveDate ? new Date(item.effectiveDate) : new Date()
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                employeeId: parseInt(selectedEmployeeId),
                salaryComponentId: parseInt(formData.salaryComponentId),
                amount: formData.amount === '' ? 0 : parseFloat(formData.amount.toString().replace(/,/g, '')),
                id: editingItem ? editingItem.id : 0,
                effectiveDate: moment(formData.effectiveDate).format('YYYY-MM-DD')
            };

            if (editingItem) {
                await salaryStructureService.updateSalaryStructure(editingItem.id, payload);
                alertService.showToast('Component updated successfully');
            } else {
                await salaryStructureService.createSalaryStructure(payload);
                alertService.showToast('Component added to structure');
            }
            setShowModal(false);
            fetchStructure(selectedEmployeeId);
        } catch (error) {
            console.error('Error saving salary structure:', error);
            const errorMsg = error.response?.data || error.message || 'Failed to save salary component';
            alertService.showToast(typeof errorMsg === 'string' ? errorMsg : 'Check console for errors', 'error');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Remove Component?',
            'Are you sure you want to remove this component from the employee structure?',
            'Yes, Remove',
            'warning',
            '#d33'
        );

        if (confirmed) {
            try {
                await salaryStructureService.deleteSalaryStructure(id);
                alertService.showToast('Component removed');
                fetchStructure(selectedEmployeeId);
            } catch (error) {
                alertService.showToast('Failed to remove component', 'error');
            }
        }
    };

    const columnDefs = useMemo(() => [
        {
            headerName: 'Component',
            field: 'salaryComponent.name',
            flex: 2,
            cellRenderer: (params) => (
                <div className="fw-bold" style={{ color: isDarkMode ? '#e9ecef' : '#212529' }}>
                    {params.value}
                </div>
            )
        },
        {
            headerName: 'Type',
            field: 'salaryComponent.type',
            flex: 1,
            cellRenderer: (params) => {
                const isEarning = params.value === 0;
                const color = isEarning ? 'info' : 'warning';
                return (
                    <Badge className={`fw-normal border border-${color} text-${color} bg-transparent`}>
                        {isEarning ? 'Earning' : 'Deduction'}
                    </Badge>
                );
            }
        },
        {
            headerName: 'Amount',
            field: 'amount',
            flex: 1,
            cellRenderer: (params) => (
                <div className="fw-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(params.value)}
                </div>
            )
        },
        {
            headerName: 'Effective Date',
            field: 'effectiveDate',
            flex: 1,
            cellRenderer: (params) => (
                <span>{new Date(params.value).toLocaleDateString()}</span>
            )
        },
        {
            headerName: 'Actions',
            width: 100,
            cellRenderer: (params) => (
                <div className="d-flex h-100 align-items-center justify-content-center gap-2">
                    {canEdit && (
                        <>
                            <Button variant="link" className="p-0 text-primary" onClick={() => handleEdit(params.data)}>
                                <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="link" className="p-0 text-danger" onClick={() => handleDelete(params.data.id)}>
                                <i className="fas fa-trash-alt"></i>
                            </Button>
                        </>
                    )}
                </div>
            )
        }
    ], [isDarkMode, canEdit]);

    // Custom styles for React Select
    const selectStyles = {
        control: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#dee2e6',
            borderRadius: '10px',
            minHeight: '42px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#0d6efd'
            }
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
            borderRadius: '10px',
            overflow: 'hidden',
            zIndex: 1050
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused 
                ? (isDarkMode ? 'rgba(13,110,253,0.1)' : '#f8f9fa')
                : 'transparent',
            color: isDarkMode ? '#e9ecef' : '#212529',
            '&:active': {
                backgroundColor: 'rgba(13,110,253,0.2)'
            }
        }),
        singleValue: (base) => ({
            ...base,
            color: isDarkMode ? '#e9ecef' : '#212529'
        }),
        input: (base) => ({
            ...base,
            color: isDarkMode ? '#e9ecef' : '#212529'
        })
    };

    return (
        <Container fluid className="salary-structure-container page-animate p-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">Salary Structure</h2>
                    <p className="text-muted small mb-0">Manage and view salary breakdowns for employees</p>
                </div>
                
                <div className="d-flex gap-3 align-items-center" style={{ minWidth: '550px' }}>
                    <div className="flex-grow-1">
                        <Select
                            options={employeeOptions}
                            value={employeeOptions.find(opt => opt.value === selectedEmployeeId)}
                            onChange={handleEmployeeSelect}
                            placeholder="Search employee..."
                            components={{ Option: CustomOption, SingleValue: CustomSingleValue }}
                            styles={selectStyles}
                            isClearable
                        />
                    </div>
                    
                    {canEdit && (
                        <Button 
                            variant="primary" 
                            className="px-4 shadow-sm fw-bold no-wrap" 
                            onClick={handleAdd}
                            disabled={!selectedEmployeeId}
                            style={{ height: '42px' }}
                        >
                            <i className="fas fa-plus me-2"></i> Add Component
                        </Button>
                    )}
                </div>
            </div>

            {selectedEmployeeId ? (
                <>
                    <Row className="mb-4">
                        <Col md={4}>
                            <div className="summary-card shadow-sm">
                                <div className="summary-icon bg-info bg-opacity-10 text-info">
                                    <i className="fas fa-plus-circle fs-5"></i>
                                </div>
                                <div className="summary-label">Total Earnings</div>
                                <h3 className="summary-value text-info">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.totalEarnings)}
                                </h3>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="summary-card shadow-sm">
                                <div className="summary-icon bg-warning bg-opacity-10 text-warning">
                                    <i className="fas fa-minus-circle fs-5"></i>
                                </div>
                                <div className="summary-label">Total Deductions</div>
                                <h3 className="summary-value text-warning">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.totalDeductions)}
                                </h3>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="summary-card shadow-sm">
                                <div className="summary-icon bg-success bg-opacity-10 text-success">
                                    <i className="fas fa-wallet fs-5"></i>
                                </div>
                                <div className="summary-label">Net Salary (Monthly)</div>
                                <h3 className="summary-value text-success">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.netSalary)}
                                </h3>
                            </div>
                        </Col>
                    </Row>

                    <div className="d-flex justify-content-end mb-3">
                        <div className="search-box-wrapper shadow-sm" style={{ maxWidth: '300px' }}>
                            <i className="fas fa-search search-icon text-muted"></i>
                            <Form.Control
                                type="text"
                                placeholder="Filter components..."
                                className="search-input border-0"
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                            />
                        </div>
                    </div>

                    <GridContainer>
                        <AgGridReact
                            rowData={structureData}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            theme={gridTheme}
                            suppressCellFocus={suppressCellFocus}
                            animateRows={true}
                            pagination={true}
                            paginationPageSize={10}
                            rowHeight={60}
                            headerHeight={52}
                            loadingOverlayComponent={() => <span>Recalculating structure...</span>}
                            quickFilterText={quickFilterText}
                        />
                    </GridContainer>
                </>
            ) : (
                <div className="text-center py-5 mt-5">
                    <div className="mb-4">
                        <i className="fas fa-search-dollar fa-4x text-muted opacity-25"></i>
                    </div>
                    <h4 className="text-muted">Select an employee to manage their salary structure</h4>
                    <p className="text-muted small">Use the searchable dropdown to find an employee by name, department or position.</p>
                </div>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingItem ? 'Edit Component Amount' : 'Add Component to Structure'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <Modal.Body className="pt-4">
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Salary Component *</Form.Label>
                            <Select
                                options={salaryComponentOptions}
                                value={salaryComponentOptions.find(opt => opt.value == formData.salaryComponentId)}
                                onChange={(opt) => setFormData({ ...formData, salaryComponentId: opt ? opt.value : '' })}
                                isDisabled={editingItem !== null}
                                placeholder="Search & select component..."
                                components={{ Option: CustomComponentOption }}
                                styles={selectStyles}
                                isSearchable
                                isClearable
                            />
                        </Form.Group>
                        
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Monthly Amount *</Form.Label>
                            <InputGroup>
                                <InputGroup.Text className="bg-transparent border-2 border-end-0">₹</InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    required
                                    value={formatAmount(formData.amount)}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/,/g, '');
                                        if (rawValue === '' || !isNaN(rawValue)) {
                                            setFormData({ ...formData, amount: rawValue === '' ? '' : parseFloat(rawValue) });
                                        }
                                    }}
                                    className="form-control-lg border-2 border-start-0"
                                    placeholder="0.00"
                                />
                            </InputGroup>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted text-uppercase">Effective Date *</Form.Label>
                            <div className="datepicker-wrapper">
                                <DatePicker
                                    selected={formData.effectiveDate}
                                    onChange={(date) => setFormData({ ...formData, effectiveDate: date })}
                                    dateFormat="MMMM d, yyyy"
                                    className="form-control form-control-lg border-2"
                                    placeholderText="Select date"
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                    required
                                    portalId="root"
                                />
                            </div>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="link" className="text-muted text-decoration-none me-auto" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="px-4 shadow-sm fw-bold">
                            {editingItem ? 'Update Structure' : 'Assign Component'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default SalaryStructure;

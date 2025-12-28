import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Form, Button, InputGroup, Badge, Spinner, Modal, Dropdown } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { employeeProfileService, authService, departmentService, positionService, levelService } from '../services/api';
import alertService from '../services/alertService';
import ImageCropper from '../components/common/ImageCropper';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select, { components } from 'react-select';
import { useTheme } from '../context/ThemeContext';
import './Profile.css';

const Profile = () => {
    const { isDarkMode } = useTheme();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [editingExperience, setEditingExperience] = useState(null);
    const [showEducationModal, setShowEducationModal] = useState(false);
    const [editingEducation, setEditingEducation] = useState(null);
    const [showCertificationModal, setShowCertificationModal] = useState(false);
    const [editingCertification, setEditingCertification] = useState(null);
    const [certificateFile, setCertificateFile] = useState(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const isAdmin = authService.isAdmin();

    // Memoized initial values for modals to prevent Formik reset during re-renders (e.g. file uploads)
    const educationInitialValues = useMemo(() => ({
        institution: editingEducation?.institution || '',
        degree: editingEducation?.degree || '',
        fieldOfStudy: editingEducation?.fieldOfStudy || '',
        startDate: editingEducation?.startDate ? new Date(editingEducation.startDate) : new Date(),
        endDate: editingEducation?.endDate ? new Date(editingEducation.endDate) : null,
        grade: editingEducation?.grade || '',
        description: editingEducation?.description || ''
    }), [editingEducation]);

    const certificationInitialValues = useMemo(() => ({
        name: editingCertification?.name || '',
        issuingOrganization: editingCertification?.issuingOrganization || '',
        issueDate: editingCertification?.issueDate ? new Date(editingCertification.issueDate) : new Date(),
        expiryDate: editingCertification?.expiryDate ? new Date(editingCertification.expiryDate) : null,
        credentialId: editingCertification?.credentialId || '',
        credentialUrl: editingCertification?.credentialUrl || ''
    }), [editingCertification]);
    
    // Image Upload State
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [tempImage, setTempImage] = useState(null);
    
    // Professional Data
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [levels, setLevels] = useState([]);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        fetchProfile();
        fetchDropdownData();
    }, []);

    const fetchDropdownData = async () => {
        try {
            const [depts, posts, levs, emps] = await Promise.all([
                departmentService.getDepartments(),
                positionService.getPositions(),
                levelService.getLevels(),
                employeeProfileService.getEmployeeList()
            ]);
            setDepartments(depts);
            setPositions(posts);
            setLevels(levs);
            setEmployees(emps);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await employeeProfileService.getProfile();
            console.log('Current experiences:', data.experiences);
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            alertService.showToast('Failed to load profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(e.target.files[0]);
            reader.onload = () => {
                setTempImage(reader.result);
                setShowCropper(true);
            };
        }
    };

    const handleCropComplete = async (croppedBlob) => {
        setShowCropper(false);
        try {
            const formData = new FormData();
            formData.append('file', croppedBlob, 'profile.jpg');
            const response = await employeeProfileService.uploadPicture(formData);
            setProfile({ ...profile, profilePicture: response.profilePictureUrl });
            alertService.showToast('Profile picture updated!');
        } catch (error) {
            console.error('Upload failed:', error);
            alertService.showToast('Failed to upload image', 'error');
        }
    };

    const personalSchema = Yup.object().shape({
        firstName: Yup.string().required('First Name is required'),
        lastName: Yup.string().required('Last Name is required'),
        personalEmail: Yup.string().email('Invalid email'),
        phone: Yup.string(),
        address: Yup.string()
    });

    const handleUpdatePersonal = async (values, { setSubmitting }) => {
        try {
            setIsSaving(true);
            // Prepare payload by merging with existing profile to include required fields (Email, HireDate etc.)
            const updateData = {
                ...profile,
                ...values,
                // Ensure empty date is sent as null
                dateOfBirth: values.dateOfBirth || null
            };
            
            const response = await employeeProfileService.updatePersonalInfo(updateData);
            setProfile(response.employee);
            alertService.showToast('Personal information updated successfully');
        } catch (error) {
            console.error('Update failed:', error);
            const message = error.response?.data?.errors 
                ? 'Validation failed. Please check your data.' 
                : 'Update failed. Please try again.';
            alertService.showToast(message, 'error');
        } finally {
            setSubmitting(false);
            setIsSaving(false);
        }
    };

    const handleUpdateProfessional = async (values, { setSubmitting }) => {
        try {
            setIsSaving(true);
            const updateData = {
                ...profile,
                ...values,
                hireDate: values.hireDate || profile.hireDate,
                levelId: values.levelId || profile.levelId
            };
            
            const response = await employeeProfileService.updateProfessionalInfo(updateData);
            setProfile(response.employee);
            alertService.showToast('Professional information updated successfully');
        } finally {
            setSubmitting(false);
            setIsSaving(false);
        }
    };

    const handleSaveExperience = async (values, { setSubmitting, resetForm }) => {
        try {
            if (editingExperience) {
                await employeeProfileService.updateExperience(editingExperience.id, values);
                alertService.showToast('Experience updated successfully');
            } else {
                await employeeProfileService.addExperience(values);
                alertService.showToast('Experience added successfully');
            }
            const updatedProfile = await employeeProfileService.getProfile();
            setProfile(updatedProfile);
            setShowExperienceModal(false);
            setEditingExperience(null);
            resetForm();
        } catch (error) {
            console.error('Failed to save experience:', error);
            alertService.showToast(`Failed to ${editingExperience ? 'update' : 'add'} experience`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditExperience = (exp) => {
        setEditingExperience(exp);
        setShowExperienceModal(true);
    };

    const handleDeleteExperience = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Experience',
            'Are you sure you want to delete this experience record? This action cannot be undone.',
            'Yes, delete it!'
        );
        
        if (!confirmed) return;
        
        try {
            await employeeProfileService.deleteExperience(id);
            alertService.showToast('Experience deleted successfully');
            
            // Optimistic update: filter out the deleted experience item from local state
            setProfile(prev => ({
                ...prev,
                experiences: prev.experiences.filter(exp => exp.id !== id)
            }));

            // Then re-fetch to be safe
            const updatedProfile = await employeeProfileService.getProfile();
            setProfile(updatedProfile);
        } catch (error) {
            console.error('Failed to delete experience:', error.response?.data || error.message);
            alertService.showToast('Failed to delete experience', 'error');
        }
    };

    // Education Handlers
    const handleSaveEducation = async (values, { setSubmitting, resetForm }) => {
        try {
            if (editingEducation) {
                await employeeProfileService.updateEducation(editingEducation.id, values);
                alertService.showToast('Education record updated successfully');
            } else {
                await employeeProfileService.addEducation(values);
                alertService.showToast('Education record added successfully');
            }
            const updatedProfile = await employeeProfileService.getProfile();
            setProfile(updatedProfile);
            setShowEducationModal(false);
            setEditingEducation(null);
            resetForm();
        } catch (error) {
            console.error('Failed to save education:', error);
            alertService.showToast(`Failed to ${editingEducation ? 'update' : 'add'} education`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditEducation = (edu) => {
        setEditingEducation(edu);
        setShowEducationModal(true);
    };

    const handleDeleteEducation = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Education',
            'Are you sure you want to delete this education record?',
            'Yes, delete it!'
        );
        if (!confirmed) return;
        try {
            await employeeProfileService.deleteEducation(id);
            alertService.showToast('Education record deleted');
            setProfile(prev => ({
                ...prev,
                educations: prev.educations.filter(e => e.id !== id)
            }));
        } catch (error) {
            alertService.showToast('Failed to delete education', 'error');
        }
    };

    // Certification Handlers
    const handleSaveCertification = async (values, { setSubmitting, resetForm }) => {
        try {
            if (editingCertification) {
                await employeeProfileService.updateCertification(editingCertification.id, values);
                alertService.showToast('Certification updated successfully');
            } else {
                await employeeProfileService.addCertification(values);
                alertService.showToast('Certification added successfully');
            }
            const updatedProfile = await employeeProfileService.getProfile();
            setProfile(updatedProfile);
            setShowCertificationModal(false);
            setEditingCertification(null);
            resetForm();
        } catch (error) {
            console.error('Failed to save certification:', error);
            alertService.showToast(`Failed to ${editingCertification ? 'update' : 'add'} certification`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditCertification = (cert) => {
        setEditingCertification(cert);
        setShowCertificationModal(true);
    };

    const handleDeleteCertification = async (id) => {
        const confirmed = await alertService.showConfirm(
            'Delete Certification',
            'Are you sure you want to delete this certification?',
            'Yes, delete it!'
        );
        if (!confirmed) return;
        try {
            await employeeProfileService.deleteCertification(id);
            alertService.showToast('Certification removed');
            setProfile(prev => ({
                ...prev,
                certifications: prev.certifications.filter(c => c.id !== id)
            }));
        } catch (error) {
            alertService.showToast('Failed to delete certification', 'error');
        }
    };

    const handleCertificateFileUpload = async (eOrFile, setFieldValue) => {
        let file;
        if (eOrFile.target && eOrFile.target.files) {
            file = eOrFile.target.files[0];
        } else {
            file = eOrFile;
        }

        if (!file) return;

        try {
            setIsUploadingFile(true);
            const formData = new FormData();
            formData.append('file', file);
            const response = await employeeProfileService.uploadCertificate(formData);
            setFieldValue('credentialUrl', response.fileUrl);
            alertService.showToast('Certificate uploaded successfully');
        } catch (error) {
            console.error('Certificate upload failed:', error);
            alertService.showToast('Failed to upload certificate', 'error');
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e, setFieldValue) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleCertificateFileUpload(e.dataTransfer.files[0], setFieldValue);
            e.dataTransfer.clearData();
        }
    };

    // Custom option component for employee dropdown with avatar
    const EmployeeOption = ({ data, ...props }) => {
        const { innerRef, innerProps } = props;
        return (
            <div ref={innerRef} {...innerProps} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: props.isFocused ? (isDarkMode ? '#343a40' : '#f8f9fa') : 'transparent',
                color: isDarkMode ? '#dee2e6' : '#333'
            }}>
                <img 
                    src={data.profilePicture ? `http://localhost:5227${data.profilePicture}` : '/default-avatar.png'} 
                    alt={data.label}
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        objectFit: 'cover',
                        flexShrink: 0
                    }}
                />
                <span>{data.label}</span>
            </div>
        );
    };

    const EmployeeSingleValue = (props) => (
        <components.SingleValue {...props}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                height: '100%'
            }}>
                <img 
                    src={props.data.profilePicture ? `http://localhost:5227${props.data.profilePicture}` : '/default-avatar.png'} 
                    alt={props.data.label}
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        marginRight: '10px',
                        objectFit: 'cover',
                        flexShrink: 0
                    }}
                />
                <span style={{ 
                    color: isDarkMode ? '#fff' : '#333',
                    lineHeight: '1'
                }}>{props.data.label}</span>
            </div>
        </components.SingleValue>
    );

    // Custom Styles for React Select
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#212529' : '#fff',
            borderColor: state.isFocused ? 'var(--bs-primary)' : (isDarkMode ? '#495057' : '#dee2e6'),
            color: isDarkMode ? '#fff' : '#000',
            borderRadius: '8px',
            padding: '2px',
            boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? 'var(--bs-primary)' : (isDarkMode ? '#6c757d' : '#bdc3c7')
            }
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#2b3035' : '#fff',
            border: isDarkMode ? '1px solid #495057' : '1px solid #dee2e6',
            zIndex: 1000,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? 'var(--bs-primary)' 
                : (state.isFocused ? (isDarkMode ? '#343a40' : '#f8f9fa') : 'transparent'),
            color: state.isSelected ? '#fff' : (isDarkMode ? '#dee2e6' : '#333'),
            cursor: 'pointer',
            padding: '10px 15px',
            '&:active': {
                backgroundColor: 'var(--bs-primary)'
            }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#333',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            position: 'static',
            transform: 'none',
            maxWidth: '100%'
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '2px 12px',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            minHeight: '38px'
        }),
        input: (provided) => ({
            ...provided,
            color: isDarkMode ? '#fff' : '#333',
            margin: 0,
            padding: 0
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? '#adb5bd' : '#6c757d',
            margin: 0
        })
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <Container fluid className="profile-container pb-5">
            {/* Header Section */}
            <div className="card profile-header border-0 shadow-sm mb-4">
                <div className="profile-banner"></div>
                <div className="profile-info-wrapper">
                    <div className="profile-picture-container">
                        <div className="profile-picture-rounded shadow">
                            <img 
                                src={profile?.profilePicture ? `http://localhost:5227${profile.profilePicture}` : '/default-avatar.png'} 
                                alt="Profile" 
                            />
                            <div className="edit-overlay" onClick={() => document.getElementById('profileUpload').click()}>
                                <i className="fas fa-camera"></i>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            id="profileUpload" 
                            hidden 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                        />
                    </div>
                    <div className="profile-basic-info">
                        <h2 className="profile-name mb-1">{profile?.firstName} {profile?.lastName}</h2>
                        <p className="profile-title text-primary fw-bold mb-0">
                            {profile?.jobTitle || profile?.position?.positionTitle || 'Team Member'}
                        </p>
                        <div className="d-flex gap-2 mt-2">
                            <Badge bg="soft-primary" className="text-primary px-3 py-2 rounded-pill border border-primary-subtle bg-primary bg-opacity-10">
                                {profile?.department?.departmentName || 'Department'}
                            </Badge>
                            <Badge bg="soft-success" className="text-success px-3 py-2 rounded-pill border border-success-subtle bg-success bg-opacity-10">
                                {profile?.employmentStatus || 'Active'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <Row>
                <Col lg={3}>
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-0">
                            <Nav className="flex-column profile-sidebar-nav py-2">
                                <Nav.Link 
                                    className={activeTab === 'personal' ? 'active' : ''} 
                                    onClick={() => setActiveTab('personal')}
                                >
                                    <i className="fas fa-user-circle me-3"></i>Personal Information
                                </Nav.Link>
                                <Nav.Link 
                                    className={activeTab === 'professional' ? 'active' : ''} 
                                    onClick={() => setActiveTab('professional')}
                                >
                                    <i className="fas fa-briefcase me-3"></i>Professional Information
                                </Nav.Link>
                                <Nav.Link 
                                    className={activeTab === 'experience' ? 'active' : ''} 
                                    onClick={() => setActiveTab('experience')}
                                >
                                    <i className="fas fa-history me-3"></i>Experience Information
                                </Nav.Link>
                                <Nav.Link 
                                    className={activeTab === 'study' ? 'active' : ''} 
                                    onClick={() => setActiveTab('study')}
                                >
                                    <i className="fas fa-graduation-cap me-3"></i>Study Information
                                </Nav.Link>
                                <Nav.Link 
                                    className={activeTab === 'certification' ? 'active' : ''} 
                                    onClick={() => setActiveTab('certification')}
                                >
                                    <i className="fas fa-certificate me-3"></i>Certification Information
                                </Nav.Link>
                            </Nav>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={9}>
                    <Card className="border-0 shadow-sm content-fade-in">
                        <Card.Header className="bg-transparent border-0 pt-4 px-4">
                            <div className="d-flex justify-content-between align-items-center mb-0">
                                <h4 className="fw-bold mb-0">
                                    {activeTab === 'personal' && 'Personal Information'}
                                    {activeTab === 'professional' && 'Professional Information'}
                                    {activeTab === 'experience' && 'Experience History'}
                                    {activeTab === 'study' && 'Education History'}
                                    {activeTab === 'certification' && 'Certifications'}
                                </h4>
                                {(activeTab === 'personal' || activeTab === 'professional') && (
                                    <button 
                                        type="submit" 
                                        form={activeTab === 'personal' ? "personalForm" : "professionalForm"}
                                        className="btn-premium-save shadow-sm"
                                        title="Save Changes"
                                        disabled={isSaving}
                                    >
                                        <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                )}
                                {activeTab === 'experience' && (
                                    <button 
                                        onClick={() => {
                                            setEditingExperience(null);
                                            setShowExperienceModal(true);
                                        }}
                                        className="btn-premium-add shadow-sm"
                                    >
                                        <i className="fas fa-plus"></i>
                                        <span>Add Experience</span>
                                    </button>
                                )}
                                {activeTab === 'study' && (
                                    <button 
                                        onClick={() => {
                                            setEditingEducation(null);
                                            setShowEducationModal(true);
                                        }}
                                        className="btn-premium-add shadow-sm"
                                    >
                                        <i className="fas fa-plus"></i>
                                        <span>Add Education</span>
                                    </button>
                                )}
                                {activeTab === 'certification' && (
                                    <button 
                                        onClick={() => {
                                            setEditingCertification(null);
                                            setShowCertificationModal(true);
                                        }}
                                        className="btn-premium-add shadow-sm"
                                    >
                                        <i className="fas fa-plus"></i>
                                        <span>Add Certification</span>
                                    </button>
                                )}
                            </div>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {activeTab === 'personal' && (
                                <Formik
                                    initialValues={{
                                        firstName: profile?.firstName || '',
                                        lastName: profile?.lastName || '',
                                        personalEmail: profile?.personalEmail || '',
                                        phone: profile?.phone || '',
                                        dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
                                        gender: profile?.gender || '',
                                        maritalStatus: profile?.maritalStatus || '',
                                        nationality: profile?.nationality || '',
                                        bloodGroup: profile?.bloodGroup || '',
                                        address: profile?.address || '',
                                        city: profile?.city || '',
                                        state: profile?.state || '',
                                        zipCode: profile?.zipCode || '',
                                        country: profile?.country || ''
                                    }}
                                    validationSchema={personalSchema}
                                    onSubmit={handleUpdatePersonal}
                                    enableReinitialize
                                >
                                    {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                                        <Form onSubmit={handleSubmit} id="personalForm">
                                            <Row className="g-4">
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">First Name</Form.Label>
                                                        <Form.Control
                                                            name="firstName"
                                                            value={values.firstName}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            isInvalid={touched.firstName && !!errors.firstName}
                                                            readOnly={!isAdmin}
                                                            title={!isAdmin ? "Only Admin can edit name" : ""}
                                                        />
                                                        <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Last Name</Form.Label>
                                                        <Form.Control
                                                            name="lastName"
                                                            value={values.lastName}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            isInvalid={touched.lastName && !!errors.lastName}
                                                            readOnly={!isAdmin}
                                                            title={!isAdmin ? "Only Admin can edit name" : ""}
                                                        />
                                                        <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Personal Email</Form.Label>
                                                        <Form.Control
                                                            name="personalEmail"
                                                            value={values.personalEmail}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                            isInvalid={touched.personalEmail && !!errors.personalEmail}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Phone Number</Form.Label>
                                                        <Form.Control
                                                            name="phone"
                                                            value={values.phone}
                                                            onChange={handleChange}
                                                            onBlur={handleBlur}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Date of Birth</Form.Label>
                                                        <div className="datepicker-wrapper position-relative">
                                                            <DatePicker
                                                                selected={values.dateOfBirth ? new Date(values.dateOfBirth) : null}
                                                                onChange={(date) => {
                                                                    const dateStr = date ? date.toISOString().split('T')[0] : '';
                                                                    setFieldValue('dateOfBirth', dateStr);
                                                                }}
                                                                dateFormat="MMMM d, yyyy"
                                                                className="form-control"
                                                                placeholderText="Select Date"
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                scrollableYearDropdown={false}
                                                            />
                                                            <i className="fas fa-calendar-alt position-absolute end-0 top-50 translate-middle-y me-3 pointer-events-none opacity-50 text-primary"></i>
                                                        </div>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Gender</Form.Label>
                                                        <Form.Select name="gender" value={values.gender} onChange={handleChange}>
                                                            <option value="">Select Gender</option>
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                            <option value="Other">Other</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Marital Status</Form.Label>
                                                        <Form.Select name="maritalStatus" value={values.maritalStatus} onChange={handleChange}>
                                                            <option value="">Select Status</option>
                                                            <option value="Single">Single</option>
                                                            <option value="Married">Married</option>
                                                            <option value="Divorced">Divorced</option>
                                                            <option value="Widowed">Widowed</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Nationality</Form.Label>
                                                        <Form.Control
                                                            name="nationality"
                                                            value={values.nationality}
                                                            onChange={handleChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Blood Group</Form.Label>
                                                        <Form.Control
                                                            name="bloodGroup"
                                                            value={values.bloodGroup}
                                                            onChange={handleChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={12}>
                                                    <hr className="my-2 border-secondary-subtle" />
                                                    <h6 className="mt-3 mb-4 text-primary">Contact Address</h6>
                                                </Col>
                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Address Line</Form.Label>
                                                        <Form.Control
                                                            name="address"
                                                            value={values.address}
                                                            onChange={handleChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">City</Form.Label>
                                                        <Form.Control name="city" value={values.city} onChange={handleChange} />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">State/Province</Form.Label>
                                                        <Form.Control name="state" value={values.state} onChange={handleChange} />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Zip Code</Form.Label>
                                                        <Form.Control name="zipCode" value={values.zipCode} onChange={handleChange} />
                                                    </Form.Group>
                                                </Col>
                                                {/* Button removed from bottom */}
                                            </Row>
                                        </Form>
                                    )}
                                </Formik>
                            )}

                            {activeTab === 'professional' && (
                                <Formik
                                    initialValues={{
                                        jobTitle: profile?.jobTitle || '',
                                        hireDate: profile?.hireDate ? profile.hireDate.split('T')[0] : '',
                                        salary: profile?.salary || 0,
                                        departmentId: profile?.departmentId || '',
                                        positionId: profile?.positionId || '',
                                        levelId: profile?.levelId || '',
                                        reportsToId: profile?.reportsToId || '',
                                        employmentStatus: profile?.employmentStatus || 'Active'
                                    }}
                                    onSubmit={handleUpdateProfessional}
                                    enableReinitialize
                                >
                                    {({ values, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                                        <Form onSubmit={handleSubmit} id="professionalForm">
                                            <Row className="g-4">
                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Master Position / Job Title</Form.Label>
                                                        <Select
                                                            options={positions.map(pos => ({ value: pos.positionId, label: pos.positionTitle }))}
                                                            value={positions.map(pos => ({ value: pos.positionId, label: pos.positionTitle })).find(opt => opt.value === values.positionId)}
                                                            onChange={(opt) => {
                                                                setFieldValue('positionId', opt ? opt.value : '');
                                                                setFieldValue('jobTitle', opt ? opt.label : '');
                                                            }}
                                                            styles={customSelectStyles}
                                                            isDisabled={!isAdmin}
                                                            placeholder="Search and select position..."
                                                            isClearable
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Department</Form.Label>
                                                        <Select
                                                            options={departments.map(dept => ({ value: dept.departmentId, label: dept.departmentName }))}
                                                            value={departments.map(dept => ({ value: dept.departmentId, label: dept.departmentName })).find(opt => opt.value === values.departmentId)}
                                                            onChange={(opt) => setFieldValue('departmentId', opt ? opt.value : '')}
                                                            styles={customSelectStyles}
                                                            isDisabled={!isAdmin}
                                                            placeholder="Select Department"
                                                            isClearable
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Employee Level / Grade</Form.Label>
                                                        <Select
                                                            options={levels.map(lvl => ({ value: lvl.levelId, label: lvl.levelName }))}
                                                            value={levels.map(lvl => ({ value: lvl.levelId, label: lvl.levelName })).find(opt => opt.value === values.levelId)}
                                                            onChange={(opt) => setFieldValue('levelId', opt ? opt.value : '')}
                                                            styles={customSelectStyles}
                                                            isDisabled={!isAdmin}
                                                            placeholder="Select Level"
                                                            isClearable
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Current Salary</Form.Label>
                                                        <InputGroup>
                                                            <InputGroup.Text className={isDarkMode ? "bg-dark border-secondary text-light" : "bg-light"}>$</InputGroup.Text>
                                                            <Form.Control
                                                                type="number"
                                                                name="salary"
                                                                value={values.salary}
                                                                onChange={handleChange}
                                                                readOnly={!isAdmin}
                                                                className="border-start-0"
                                                            />
                                                        </InputGroup>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Employment Status</Form.Label>
                                                        <Form.Select 
                                                            name="employmentStatus" 
                                                            value={values.employmentStatus} 
                                                            onChange={handleChange}
                                                            disabled={!isAdmin}
                                                        >
                                                            <option value="Active">Active</option>
                                                            <option value="On Leave">On Leave</option>
                                                            <option value="Suspended">Suspended</option>
                                                            <option value="Terminated">Terminated</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Join Date (Hire Date)</Form.Label>
                                                        <div className="datepicker-wrapper position-relative">
                                                            <DatePicker
                                                                selected={values.hireDate ? new Date(values.hireDate) : null}
                                                                onChange={(date) => {
                                                                    const dateStr = date ? date.toISOString().split('T')[0] : '';
                                                                    setFieldValue('hireDate', dateStr);
                                                                }}
                                                                dateFormat="MMMM d, yyyy"
                                                                className="form-control"
                                                                placeholderText="Select Date"
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                scrollableYearDropdown={false}
                                                                readOnly={!isAdmin}
                                                                disabled={!isAdmin}
                                                            />
                                                            <i className="fas fa-calendar-alt opacity-50 text-secondary"></i>
                                                        </div>
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="text-muted small fw-bold">Reports To (Manager)</Form.Label>
                                                        <Select
                                                            options={employees.map(emp => ({ 
                                                                value: emp.employeeId, 
                                                                label: `${emp.firstName} ${emp.lastName}`,
                                                                profilePicture: emp.profilePicture
                                                            }))}
                                                            value={employees.map(emp => ({ 
                                                                value: emp.employeeId, 
                                                                label: `${emp.firstName} ${emp.lastName}`,
                                                                profilePicture: emp.profilePicture
                                                            })).find(opt => opt.value === values.reportsToId)}
                                                            onChange={(opt) => setFieldValue('reportsToId', opt ? opt.value : '')}
                                                            styles={customSelectStyles}
                                                            components={{ Option: EmployeeOption, SingleValue: EmployeeSingleValue }}
                                                            isDisabled={!isAdmin}
                                                            placeholder="Select Manager"
                                                            isClearable
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                {/* Button removed from bottom */}
                                            </Row>
                                        </Form>
                                    )}
                                </Formik>
                            )}

                            {activeTab === 'experience' && (
                                <div className="p-2">
                                    <div className="mb-4">
                                        <h5 className="fw-bold mb-0 text-primary">Work Experience</h5>
                                    </div>

                                    {profile?.experiences && profile.experiences.length > 0 ? (
                                        <div className="experience-timeline">
                                            {[...profile.experiences]
                                                .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                                                .map((exp, index) => (
                                                <div key={exp.id || index} className="timeline-item">
                                                    <div className="timeline-dot"></div>
                                                    <div className="timeline-content">
                                                        <div className="d-flex justify-content-between">
                                                            <span className="timeline-date">
                                                                {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                                                                {exp.isCurrent ? ' Present' : ` ${new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                                                            </span>
                                                            <div className="d-flex gap-2">
                                                                <Button 
                                                                    variant="link" 
                                                                    className="text-warning p-0 btn-edit-timeline"
                                                                    onClick={() => handleEditExperience(exp)}
                                                                >
                                                                    <i className="fas fa-pencil-alt"></i>
                                                                </Button>
                                                                <Button 
                                                                    variant="link" 
                                                                    className="text-danger p-0 btn-delete-timeline"
                                                                    onClick={() => handleDeleteExperience(exp.id)}
                                                                >
                                                                    <i className="fas fa-trash-alt"></i>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <h6 className="timeline-title">{exp.designation}</h6>
                                                        <span className="timeline-company">{exp.companyName}</span>
                                                        <p className="timeline-description mt-2">{exp.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 timeline-empty-state rounded-4 border border-dashed">
                                            <i className="fas fa-briefcase fs-1 text-muted mb-3"></i>
                                            <p className="text-muted mb-0">No experience records found.</p>
                                            <Button 
                                                variant="link" 
                                                className="mt-2"
                                                onClick={() => {
                                                    setEditingExperience(null);
                                                    setShowExperienceModal(true);
                                                }}
                                            >
                                                Add your first experience
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'study' && (
                                <div className="p-2">
                                    <div className="mb-4">
                                        <h5 className="fw-bold mb-0 text-primary">Academic History</h5>
                                    </div>

                                    {profile?.educations && profile.educations.length > 0 ? (
                                        <div className="education-list">
                                            {[...profile.educations]
                                                .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                                                .map((edu, index) => (
                                                <div key={edu.id || index} className="timeline-item">
                                                    <div className="timeline-dot bg-success"></div>
                                                    <div className="timeline-content">
                                                        <div className="d-flex justify-content-between">
                                                            <span className="timeline-date">
                                                                {new Date(edu.startDate).getFullYear()} - 
                                                                {edu.endDate ? ` ${new Date(edu.endDate).getFullYear()}` : ' Present'}
                                                            </span>
                                                            <div className="d-flex gap-2">
                                                                <Button variant="link" className="text-warning p-0 btn-edit-timeline" onClick={() => handleEditEducation(edu)}>
                                                                    <i className="fas fa-pencil-alt"></i>
                                                                </Button>
                                                                <Button variant="link" className="text-danger p-0 btn-delete-timeline" onClick={() => handleDeleteEducation(edu.id)}>
                                                                    <i className="fas fa-trash-alt"></i>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <h6 className="timeline-title">{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</h6>
                                                        <span className="timeline-company">{edu.institution}</span>
                                                        {edu.grade && <p className="timeline-description mt-2 mb-0"><strong>Grade:</strong> {edu.grade}%</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 timeline-empty-state rounded-4 border border-dashed">
                                            <i className="fas fa-graduation-cap fs-1 text-muted mb-3"></i>
                                            <p className="text-muted mb-0">No education records found.</p>
                                            <Button variant="link" className="mt-2" onClick={() => setShowEducationModal(true)}>Add your education</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'certification' && (
                                <div className="p-2">
                                    <div className="mb-4">
                                        <h5 className="fw-bold mb-0 text-primary">Professional Credentials</h5>
                                    </div>

                                    {profile?.certifications && profile.certifications.length > 0 ? (
                                        <Row className="g-4">
                                            {profile.certifications.map((cert) => (
                                                <Col md={6} key={cert.id}>
                                                    <Card className="h-100 border-0 shadow-sm certification-card hover-lift">
                                                        <Card.Body className="d-flex flex-column p-4">
                                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                                <div className="cert-icon-wrapper rounded-3 bg-primary bg-opacity-10 text-primary p-3">
                                                                    <i className="fas fa-certificate fs-4"></i>
                                                                </div>
                                                                <div className="d-flex gap-2 cert-actions-wrapper">
                                                                    <Button 
                                                                        variant="link" 
                                                                        className="text-primary p-0"
                                                                        onClick={() => handleEditCertification(cert)}
                                                                    >
                                                                        <i className="fas fa-pencil-alt"></i>
                                                                    </Button>
                                                                    <Button 
                                                                        variant="link" 
                                                                        className="text-danger p-0"
                                                                        onClick={() => handleDeleteCertification(cert.id)}
                                                                    >
                                                                        <i className="fas fa-trash-alt"></i>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <h5 className="fw-bold mb-1">{cert.name}</h5>
                                                            <p className="text-muted small mb-3">{cert.issuingOrganization}</p>
                                                            
                                                            <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                                                                <div className="small text-muted">
                                                                    <i className="far fa-calendar-alt me-2"></i>
                                                                    Issued: {new Date(cert.issueDate).toLocaleDateString()}
                                                                </div>
                                                                {cert.credentialUrl && (
                                                                    <a 
                                                                        href={`http://localhost:5227${cert.credentialUrl}`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="btn btn-premium-view-cert btn-sm px-3"
                                                                    >
                                                                        View Certificate
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {cert.credentialId && (
                                                                <div className="mt-2 small text-muted">
                                                                    <strong>Credential ID:</strong> {cert.credentialId}
                                                                </div>
                                                            )}
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    ) : (
                                        <div className="text-center py-5 timeline-empty-state rounded-4 border border-dashed">
                                            <i className="fas fa-certificate fs-1 text-muted mb-3"></i>
                                            <p className="text-muted mb-0">No certifications found.</p>
                                            <Button variant="link" className="mt-2" onClick={() => setShowCertificationModal(true)}>Add your first certification</Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Cropper Modal */}
            <ImageCropper 
                image={tempImage} 
                show={showCropper} 
                onHide={() => setShowCropper(false)} 
                onCropComplete={handleCropComplete} 
            />

            {/* Experience Modal */}
            <Modal show={showExperienceModal} onHide={() => {
                setShowExperienceModal(false);
                setEditingExperience(null);
            }} centered size="lg">
                <Modal.Header closeButton className="px-4 pt-4">
                    <Modal.Title className="fw-bold">{editingExperience ? 'Edit Experience' : 'Add Experience'}</Modal.Title>
                </Modal.Header>
                <Formik
                    initialValues={{
                        companyName: editingExperience?.companyName || '',
                        designation: editingExperience?.designation || '',
                        startDate: editingExperience?.startDate ? new Date(editingExperience.startDate) : new Date(),
                        endDate: editingExperience?.endDate ? new Date(editingExperience.endDate) : new Date(),
                        isCurrent: editingExperience?.isCurrent || false,
                        description: editingExperience?.description || ''
                    }}
                    validationSchema={Yup.object({
                        companyName: Yup.string().required('Required'),
                        designation: Yup.string().required('Required'),
                        startDate: Yup.date().required('Required'),
                        description: Yup.string().max(1000, 'Too long')
                    })}
                    onSubmit={handleSaveExperience}
                    enableReinitialize
                >
                    {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                        <Form onSubmit={handleSubmit}>
                            <Modal.Body className="p-4">
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Company Name</Form.Label>
                                            <Form.Control 
                                                name="companyName"
                                                value={values.companyName}
                                                onChange={handleChange}
                                                isInvalid={touched.companyName && errors.companyName}
                                                placeholder="e.g. Google"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Position / Title</Form.Label>
                                            <Form.Control 
                                                name="designation"
                                                value={values.designation}
                                                onChange={handleChange}
                                                isInvalid={touched.designation && errors.designation}
                                                placeholder="e.g. Senior Developer"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">From Date</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={values.startDate}
                                                    onChange={(date) => setFieldValue('startDate', date)}
                                                    className="form-control"
                                                    dateFormat="MM/yyyy"
                                                    showMonthYearPicker
                                                />
                                                <i className="far fa-calendar-alt text-muted"></i>
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">To Date</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={values.endDate}
                                                    onChange={(date) => setFieldValue('endDate', date)}
                                                    className="form-control"
                                                    dateFormat="MM/yyyy"
                                                    showMonthYearPicker
                                                    disabled={values.isCurrent}
                                                />
                                                <i className="far fa-calendar-alt text-muted"></i>
                                            </div>
                                            <Form.Check 
                                                type="checkbox"
                                                label="I am currently working here"
                                                name="isCurrent"
                                                checked={values.isCurrent}
                                                onChange={handleChange}
                                                className="mt-2 small"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Description (Role & Achievements)</Form.Label>
                                            <Form.Control 
                                                as="textarea"
                                                rows={4}
                                                name="description"
                                                value={values.description}
                                                onChange={handleChange}
                                                placeholder="Describe your responsibilities and key achievements..."
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Modal.Body>
                            <Modal.Footer className="border-0 px-4 pb-4">
                                <Button variant="light" onClick={() => {
                                    setShowExperienceModal(false);
                                    setEditingExperience(null);
                                }} className="rounded-pill px-4">
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" disabled={isSubmitting} className="rounded-pill px-4">
                                    {isSubmitting ? 'Saving...' : (editingExperience ? 'Update Experience' : 'Save Experience')}
                                </Button>
                            </Modal.Footer>
                        </Form>
                    )}
                </Formik>
            </Modal>

            {/* Education Modal */}
            <Modal show={showEducationModal} onHide={() => {
                setShowEducationModal(false);
                setEditingEducation(null);
            }} centered size="lg">
                <Modal.Header closeButton className="px-4 pt-4">
                    <Modal.Title className="fw-bold">{editingEducation ? 'Edit Education' : 'Add Education'}</Modal.Title>
                </Modal.Header>
                <Formik
                    initialValues={educationInitialValues}
                    validationSchema={Yup.object({
                        institution: Yup.string().required('Required'),
                        degree: Yup.string().required('Required'),
                        startDate: Yup.date().required('Required')
                    })}
                    onSubmit={handleSaveEducation}
                    enableReinitialize
                >
                    {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                        <Form onSubmit={handleSubmit}>
                            <Modal.Body className="p-4">
                                <Row className="g-3">
                                    <Col md={12}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Institution / University</Form.Label>
                                            <Form.Control 
                                                name="institution"
                                                value={values.institution}
                                                onChange={handleChange}
                                                isInvalid={touched.institution && errors.institution}
                                                placeholder="e.g. Stanford University"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Degree</Form.Label>
                                            <Form.Control 
                                                name="degree"
                                                value={values.degree}
                                                onChange={handleChange}
                                                isInvalid={touched.degree && errors.degree}
                                                placeholder="e.g. Bachelor of Science"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Field of Study</Form.Label>
                                            <Form.Control 
                                                name="fieldOfStudy"
                                                value={values.fieldOfStudy}
                                                onChange={handleChange}
                                                placeholder="e.g. Computer Science"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">From Date</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={values.startDate}
                                                    onChange={(date) => setFieldValue('startDate', date)}
                                                    className="form-control"
                                                    dateFormat="yyyy"
                                                    showYearPicker
                                                />
                                                <i className="far fa-calendar-alt text-muted"></i>
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">To Date (Expected)</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={values.endDate}
                                                    onChange={(date) => setFieldValue('endDate', date)}
                                                    className="form-control"
                                                    dateFormat="yyyy"
                                                    showYearPicker
                                                    placeholderText="Select Year"
                                                />
                                                <i className="far fa-calendar-alt text-muted"></i>
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Grade / CGPA (%)</Form.Label>
                                            <Form.Control 
                                                type="number"
                                                step="0.01"
                                                name="grade"
                                                value={values.grade}
                                                onChange={handleChange}
                                                placeholder="e.g. 85.50"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Modal.Body>
                            <Modal.Footer className="border-0 px-4 pb-4">
                                <Button variant="light" onClick={() => setShowEducationModal(false)} className="rounded-pill px-4">Cancel</Button>
                                <Button variant="primary" type="submit" disabled={isSubmitting} className="rounded-pill px-4">
                                    {isSubmitting ? 'Saving...' : 'Save Education'}
                                </Button>
                            </Modal.Footer>
                        </Form>
                    )}
                </Formik>
            </Modal>

            {/* Certification Modal */}
            <Modal show={showCertificationModal} onHide={() => {
                setShowCertificationModal(false);
                setEditingCertification(null);
            }} centered size="lg">
                <Modal.Header closeButton className="px-4 pt-4">
                    <Modal.Title className="fw-bold">{editingCertification ? 'Edit Certification' : 'Add Certification'}</Modal.Title>
                </Modal.Header>
                <Formik
                    initialValues={certificationInitialValues}
                    validationSchema={Yup.object({
                        name: Yup.string().required('Required'),
                        issuingOrganization: Yup.string().required('Required'),
                        issueDate: Yup.date().required('Required')
                    })}
                    onSubmit={handleSaveCertification}
                    enableReinitialize
                >
                    {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                        <Form onSubmit={handleSubmit}>
                            <Modal.Body className="p-4">
                                <Row className="g-3">
                                    <Col md={12}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Certification Name</Form.Label>
                                            <Form.Control 
                                                name="name"
                                                value={values.name}
                                                onChange={handleChange}
                                                isInvalid={touched.name && errors.name}
                                                placeholder="e.g. AWS Certified Solutions Architect"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Issuing Organization</Form.Label>
                                            <Form.Control 
                                                name="issuingOrganization"
                                                value={values.issuingOrganization}
                                                onChange={handleChange}
                                                isInvalid={touched.issuingOrganization && errors.issuingOrganization}
                                                placeholder="e.g. Amazon Web Services (AWS)"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Issue Date</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={values.issueDate}
                                                    onChange={(date) => setFieldValue('issueDate', date)}
                                                    className="form-control"
                                                    dateFormat="MMMM d, yyyy"
                                                />
                                                <i className="far fa-calendar-alt text-muted"></i>
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Expiry Date (Optional)</Form.Label>
                                            <div className="datepicker-wrapper">
                                                <DatePicker
                                                    selected={values.expiryDate}
                                                    onChange={(date) => setFieldValue('expiryDate', date)}
                                                    className="form-control"
                                                    dateFormat="MMMM d, yyyy"
                                                    placeholderText="Does not expire"
                                                />
                                                <i className="far fa-calendar-alt text-muted"></i>
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Credential ID</Form.Label>
                                            <Form.Control 
                                                name="credentialId"
                                                value={values.credentialId}
                                                onChange={handleChange}
                                                placeholder="Credential ID or Number"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Credential URL (Optional)</Form.Label>
                                            <Form.Control 
                                                name="credentialUrl"
                                                value={values.credentialUrl}
                                                onChange={handleChange}
                                                placeholder="Link to verify credential"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <div 
                                            className={`cert-upload-section p-4 rounded-4 border border-dashed text-center bg-transparent mt-2 ${isDragging ? 'dragging' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, setFieldValue)}
                                        >
                                            <i className={`fas ${isUploadingFile ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'} fs-2 text-primary mb-3`}></i>
                                            <h6 className="fw-bold">Upload Certificate Copy</h6>
                                            <p className="text-secondary small mb-3">Drag and drop or click the button to upload a PDF or Image</p>
                                            
                                             {values.credentialUrl && values.credentialUrl.includes('/uploads/') ? (
                                                <div className="uploaded-file-info d-flex flex-column align-items-center justify-content-center bg-success bg-opacity-10 rounded-4 p-4 border border-success-subtle mx-auto" style={{maxWidth: '450px'}}>
                                                    <div className="cert-preview-wrapper mb-3 position-relative">
                                                        {values.credentialUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                            <div className="cert-image-preview shadow-sm rounded-3 overflow-hidden" style={{width: '120px', height: '120px', background: '#fff'}}>
                                                                 <img 
                                                                    src={values.credentialUrl.startsWith('http') ? values.credentialUrl : `http://localhost:5227${values.credentialUrl}`} 
                                                                    alt="Certificate Preview" 
                                                                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = 'https://via.placeholder.com/120x120?text=No+Preview';
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="cert-file-icon shadow-sm" style={{width: '80px', height: '80px', fontSize: '2.5rem'}}>
                                                                <i className={`fas ${values.credentialUrl.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf text-danger' : 'fa-file-alt text-primary'}`}></i>
                                                            </div>
                                                        )}
                                                        <Badge bg="success" className="position-absolute bottom-0 end-0 translate-middle-x mb-n2 me-n2 rounded-circle p-2 shadow-sm border border-white">
                                                            <i className="fas fa-check"></i>
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="text-center w-100 overflow-hidden">
                                                        <div className="fw-bold text-success mb-1 text-truncate px-2">
                                                            {values.credentialUrl.split('/').pop()}
                                                        </div>
                                                        <div className="d-flex align-items-center justify-content-center gap-3 mt-2">
                                                            <a 
                                                                href={values.credentialUrl.startsWith('http') ? values.credentialUrl : `http://localhost:5227${values.credentialUrl}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="btn btn-sm btn-outline-success rounded-pill px-3"
                                                            >
                                                                <i className="fas fa-external-link-alt me-1"></i> View Full
                                                            </a>
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-sm btn-outline-danger rounded-pill px-3" 
                                                                onClick={() => setFieldValue('credentialUrl', '')}
                                                            >
                                                                <i className="fas fa-trash-alt me-1"></i> Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column align-items-center">
                                                    <input 
                                                        type="file" 
                                                        id="certFileUpload" 
                                                        hidden 
                                                        onChange={(e) => handleCertificateFileUpload(e, setFieldValue)} 
                                                    />
                                                    <Button 
                                                        variant="primary" 
                                                        size="sm" 
                                                        className="rounded-pill px-4" 
                                                        onClick={() => document.getElementById('certFileUpload').click()}
                                                        disabled={isUploadingFile}
                                                    >
                                                        {isUploadingFile ? 'Uploading...' : 'Choose File'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Col>
                                </Row>
                            </Modal.Body>
                            <Modal.Footer className="border-0 px-4 pb-4">
                                <Button variant="light" onClick={() => setShowCertificationModal(false)} className="rounded-pill px-4">Cancel</Button>
                                <Button variant="primary" type="submit" disabled={isSubmitting} className="rounded-pill px-4">
                                    {isSubmitting ? 'Saving...' : 'Save Certification'}
                                </Button>
                            </Modal.Footer>
                        </Form>
                    )}
                </Formik>
            </Modal>
        </Container>
    );
};

export default Profile;

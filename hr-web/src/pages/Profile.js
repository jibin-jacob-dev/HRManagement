import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Form, Button, InputGroup, Badge, Spinner } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { employeeProfileService, authService } from '../services/api';
import alertService from '../services/alertService';
import ImageCropper from '../components/common/ImageCropper';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './Profile.css';

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('personal');
    const isAdmin = authService.isAdmin();
    
    // Image Upload State
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [tempImage, setTempImage] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await employeeProfileService.getProfile();
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
        }
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
                            {profile?.jobTitle || profile?.position?.title || 'Team Member'}
                        </p>
                        <div className="d-flex gap-2 mt-2">
                            <Badge bg="soft-primary" className="text-primary px-3 py-2 rounded-pill border border-primary-subtle bg-primary bg-opacity-10">
                                {profile?.department?.name || 'Department'}
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
                            <h4 className="fw-bold mb-0">
                                {activeTab === 'personal' && 'Personal Information'}
                                {activeTab === 'professional' && 'Professional Information'}
                                {activeTab === 'experience' && 'Experience History'}
                                {activeTab === 'study' && 'Education History'}
                                {activeTab === 'certification' && 'Certifications'}
                            </h4>
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
                                        <Form onSubmit={handleSubmit}>
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
                                                <Col md={12}>
                                                    <div className="d-flex justify-content-end mt-4">
                                                        <Button variant="primary" type="submit" disabled={isSubmitting} className="px-5 shadow-sm">
                                                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                                                        </Button>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Form>
                                    )}
                                </Formik>
                            )}

                            {activeTab !== 'personal' && (
                                <div className="text-center py-5">
                                    <i className="fas fa-tools fa-3x text-secondary-emphasis opacity-25 mb-4"></i>
                                    <h5 className="text-muted">Under Development</h5>
                                    <p className="text-secondary small">This section will be implemented in the next step.</p>
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
        </Container>
    );
};

export default Profile;

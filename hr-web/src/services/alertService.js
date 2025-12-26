import Swal from 'sweetalert2';

// Toast Configuration
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

const alertService = {
    // Toast Notifications
    showToast: (title, icon = 'success') => {
        Toast.fire({
            icon: icon,
            title: title
        });
    },

    // Standard Alerts
    showSuccess: (title, text) => {
        return Swal.fire({
            icon: 'success',
            title: title,
            text: text,
            confirmButtonColor: '#3085d6'
        });
    },

    showError: (title, text) => {
        return Swal.fire({
            icon: 'error',
            title: title,
            text: text,
            confirmButtonColor: '#d33'
        });
    },

    showWarning: (title, text) => {
        return Swal.fire({
            icon: 'warning',
            title: title,
            text: text,
            confirmButtonColor: '#f0ad4e'
        });
    },

    showInfo: (title, text) => {
        return Swal.fire({
            icon: 'info',
            title: title,
            text: text,
            confirmButtonColor: '#3085d6'
        });
    },

    // Confirmation Dialog
    showConfirm: async (title, text, confirmButtonText = 'Yes, do it!', icon = 'warning') => {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: confirmButtonText
        });
        return result.isConfirmed;
    }
};

export default alertService;

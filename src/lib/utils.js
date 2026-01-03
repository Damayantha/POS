import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(amount, currency = 'USD', symbol = '$') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount || 0);
}

export function formatDate(date, formatStr = 'MMM d, yyyy') {
    return format(new Date(date), formatStr);
}

export function formatDateTime(date) {
    return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(date) {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function generateId() {
    return crypto.randomUUID();
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

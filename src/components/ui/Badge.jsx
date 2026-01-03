const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    default: 'bg-zinc-700 text-zinc-300',
};

export function Badge({ children, variant = 'default', className = '' }) {
    return (
        <span className={`badge ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}

export function StatusBadge({ status }) {
    const statusMap = {
        active: { label: 'Active', variant: 'success' },
        inactive: { label: 'Inactive', variant: 'danger' },
        completed: { label: 'Completed', variant: 'success' },
        pending: { label: 'Pending', variant: 'warning' },
        cancelled: { label: 'Cancelled', variant: 'danger' },
        'low-stock': { label: 'Low Stock', variant: 'warning' },
        'in-stock': { label: 'In Stock', variant: 'success' },
        'out-of-stock': { label: 'Out of Stock', variant: 'danger' },
    };

    const config = statusMap[status] || { label: status, variant: 'default' };

    return <Badge variant={config.variant}>{config.label}</Badge>;
}

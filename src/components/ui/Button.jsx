import { Loader2 } from 'lucide-react';

const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    ghost: 'btn-ghost',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
    icon: 'p-2',
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    ...props
}) {
    return (
        <button
            className={`btn ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}

export function IconButton({
    icon: Icon,
    variant = 'ghost',
    size = 'icon',
    className = '',
    ...props
}) {
    return (
        <button
            className={`btn ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            <Icon className="w-5 h-5" />
        </button>
    );
}

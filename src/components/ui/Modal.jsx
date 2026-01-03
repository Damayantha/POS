import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true }) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-6xl',
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content ${sizeClasses[size]}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    {showClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-dark-tertiary transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}

export function ModalBody({ children, className = '' }) {
    return (
        <div className={`modal-body ${className}`}>
            {children}
        </div>
    );
}

export function ModalFooter({ children, className = '' }) {
    return (
        <div className={`modal-footer ${className}`}>
            {children}
        </div>
    );
}

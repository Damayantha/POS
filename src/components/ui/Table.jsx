export function Table({ children, className = '' }) {
    return (
        <div className="table-container">
            <table className={`table ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function TableHead({ children }) {
    return <thead>{children}</thead>;
}

export function TableBody({ children }) {
    return <tbody className="bg-dark-secondary">{children}</tbody>;
}

export function TableRow({ children, onClick, className = '' }) {
    return (
        <tr
            className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

export function TableCell({ children, className = '' }) {
    return <td className={className}>{children}</td>;
}

export function TableHeader({ children, className = '' }) {
    return <th className={className}>{children}</th>;
}

export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            {Icon && (
                <div className="w-16 h-16 rounded-full bg-dark-tertiary flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-zinc-500" />
                </div>
            )}
            <h3 className="text-lg font-medium text-zinc-300 mb-1">{title}</h3>
            {description && <p className="text-sm text-zinc-500 mb-4">{description}</p>}
            {action}
        </div>
    );
}

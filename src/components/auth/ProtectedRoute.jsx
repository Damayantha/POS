/**
 * ProtectedRoute Component
 * 
 * Wraps routes to check permissions before rendering.
 * Redirects unauthorized users to appropriate fallback.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { NAV_PERMISSIONS } from '../../lib/permissions';
import { ShieldAlert } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} props.permission - Required permission for this route
 * @param {React.ReactNode} props.children - Route content
 * @param {string} props.redirectTo - Redirect path if unauthorized (default: /)
 */
export function ProtectedRoute({
    permission,
    children,
    redirectTo = '/',
    showAccessDenied = true
}) {
    const { hasPermission, isAuthenticated, currentEmployee } = useAuthStore();
    const location = useLocation();

    // If not authenticated, redirect to login (handled by App.jsx)
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Check permission
    const requiredPermission = permission || NAV_PERMISSIONS[location.pathname];

    if (requiredPermission && !hasPermission(requiredPermission)) {
        if (showAccessDenied) {
            return <AccessDenied role={currentEmployee?.role} />;
        }
        return <Navigate to={redirectTo} replace />;
    }

    return children;
}

/**
 * Access Denied Component
 */
function AccessDenied({ role }) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-zinc-400 text-center max-w-md mb-6">
                You don't have permission to access this page.
                {role && (
                    <span className="block mt-2">
                        Your role: <span className="capitalize font-medium text-zinc-300">{role}</span>
                    </span>
                )}
            </p>
            <a
                href="/"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
                ← Back to Dashboard
            </a>
        </div>
    );
}

export default ProtectedRoute;

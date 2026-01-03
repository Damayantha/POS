import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginScreen from './components/employees/LoginScreen';
import SetupWizard from './components/SetupWizard';
import ActivationScreen from './components/auth/ActivationScreen';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import GiftCardsPage from './pages/GiftCardsPage';
import BundlesPage from './pages/BundlesPage';
import PromotionsPage from './pages/PromotionsPage';
import BarcodeLabelPage from './pages/BarcodeLabelPage';
import TransactionsPage from './pages/TransactionsPage';
import ProfilePage from './pages/ProfilePage';

import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import CreditSalesPage from './pages/CreditSalesPage';
import { useAuthStore, PERMISSIONS } from './stores/authStore';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/Toast';

function App() {
    const { currentEmployee, isAuthenticated, checkAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [isActivated, setIsActivated] = useState(null); // null = loading, false = not activated, true = activated

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Check Activation Status (New)
                const activationData = await window.electronAPI.settings.get('activation_data');
                console.log('App init - activation:', activationData);

                if (activationData && activationData.uid) {
                    setIsActivated(true);
                } else {
                    setIsActivated(false);
                    setIsLoading(false); // Stop globally loading to show activation screen
                    return; // Stop initialization here
                }

                // 2. Check if setup has been completed
                const settings = await window.electronAPI.settings.getAll();
                console.log('App init - settings:', settings);

                // Handle both string 'true' and boolean true
                const setupCompleted = settings.setup_completed === 'true' || settings.setup_completed === true;
                console.log('Setup completed:', setupCompleted);

                if (!setupCompleted) {
                    setShowSetupWizard(true);
                    setIsLoading(false);
                    return;
                }

                // If setup is done, check authentication
                await checkAuth();

                // 3. Listen for Firebase Auth changes and sync token to Main Process
                const { onAuthStateChanged } = await import('firebase/auth');
                const { auth } = await import('./lib/firebase');

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        console.log('App: Firebase user detected, syncing token...');
                        const token = await user.getIdToken();
                        await window.electronAPI.sync.setToken(token);
                    } else {
                        console.log('App: No Firebase user.');
                        await window.electronAPI.sync.setToken(null);
                    }
                });
            } catch (error) {
                console.error('Init error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleSetupComplete = () => {
        setShowSetupWizard(false);
        // After setup, show login screen
        window.location.reload();
    };

    const handleActivationSuccess = () => {
        setIsActivated(true);
        window.location.reload();
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-dark-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-400">Loading POS System...</p>
                </div>
            </div>
        );
    }

    if (isActivated === false) {
        return (
            <>
                <ActivationScreen onActivationSuccess={handleActivationSuccess} />
                <Toaster />
            </>
        );
    }

    if (showSetupWizard) {
        return (
            <>
                <SetupWizard onComplete={handleSetupComplete} />
                <Toaster />
            </>
        );
    }

    if (!isAuthenticated) {
        return (
            <>
                <LoginScreen />
                <Toaster />
            </>
        );
    }

    return (
        <HashRouter>
            <MainLayout>
                <Routes>
                    <Route path="/" element={
                        <ProtectedRoute permission={PERMISSIONS.DASHBOARD_VIEW}>
                            <DashboardPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/pos" element={
                        <ProtectedRoute permission={PERMISSIONS.POS_VIEW}>
                            <POSPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/products" element={
                        <ProtectedRoute permission={PERMISSIONS.PRODUCTS_VIEW}>
                            <ProductsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/inventory" element={
                        <ProtectedRoute permission={PERMISSIONS.INVENTORY_VIEW}>
                            <InventoryPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/customers" element={
                        <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_VIEW}>
                            <CustomersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/suppliers" element={
                        <ProtectedRoute permission={PERMISSIONS.INVENTORY_VIEW}>
                            <SuppliersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/purchase-orders" element={
                        <ProtectedRoute permission={PERMISSIONS.INVENTORY_VIEW}>
                            <PurchaseOrdersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/gift-cards" element={
                        <ProtectedRoute permission={PERMISSIONS.GIFT_CARDS_VIEW}>
                            <GiftCardsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/bundles" element={
                        <ProtectedRoute permission={PERMISSIONS.BUNDLES_VIEW}>
                            <BundlesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/transactions" element={
                        <ProtectedRoute permission={PERMISSIONS.POS_VIEW}>
                            <TransactionsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/credit-sales" element={
                        <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_VIEW}>
                            <CreditSalesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/promotions" element={
                        <ProtectedRoute permission={PERMISSIONS.PROMOTIONS_VIEW}>
                            <PromotionsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/employees" element={
                        <ProtectedRoute permission={PERMISSIONS.EMPLOYEES_VIEW}>
                            <EmployeesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                        <ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW}>
                            <ReportsPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/settings" element={
                        <ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW}>
                            <SettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/barcode-labels" element={
                        <ProtectedRoute permission={PERMISSIONS.PRODUCTS_VIEW}>
                            <BarcodeLabelPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                        <ProtectedRoute permission={'profile.view'}>
                            <ProfilePage />
                        </ProtectedRoute>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </MainLayout>
            <Toaster />
        </HashRouter>
    );
}

export default App;

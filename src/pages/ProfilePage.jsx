import { useState, useEffect } from 'react';
import { User, Shield, CreditCard, Mail, Calendar, CheckCircle, ExternalLink, Edit2, Building2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UpdateEmailModal } from '../components/modals/UpdateEmailModal';
import { toast } from '../components/ui/Toast';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProfilePage() {
    const { currentEmployee } = useAuthStore();
    const [activationData, setActivationData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Business Edit State
    const [isEditingBusiness, setIsEditingBusiness] = useState(false);
    const [savingBusiness, setSavingBusiness] = useState(false);
    const [businessForm, setBusinessForm] = useState({
        businessName: '',
        businessPhone: '',
        businessAddress: ''
    });

    // Email Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // 1. Fetch activation data stored locally
                let data = await window.electronAPI.settings.get('activation_data');

                // 2. Check for Email Updates (Sync with Firebase Auth)
                if (auth.currentUser) {
                    await auth.currentUser.reload();
                    const currentFirebaseEmail = auth.currentUser.email;

                    if (data && data.email !== currentFirebaseEmail) {
                        console.log('Email change detected. Syncing...', data.email, '->', currentFirebaseEmail);

                        // Update Local Data
                        data = { ...data, email: currentFirebaseEmail };
                        await window.electronAPI.settings.set({ key: 'activation_data', value: data });

                        // Update Firestore
                        if (data.uid) {
                            const userRef = doc(db, 'users', data.uid);
                            await updateDoc(userRef, { email: currentFirebaseEmail });
                        }

                        toast.success('Email address updated verified and synced.');
                    }
                }

                setActivationData(data);

                if (data) {
                    setBusinessForm({
                        businessName: data.businessName || '',
                        businessPhone: data.businessPhone || '',
                        businessAddress: data.businessAddress || ''
                    });
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleManageSubscription = () => {
        window.open('http://localhost:3000/dashboard', '_blank');
    };

    const handleSaveBusiness = async () => {
        setSavingBusiness(true);
        try {
            // 1. Update local Settings
            const currentData = await window.electronAPI.settings.get('activation_data');
            const updatedData = {
                ...currentData,
                businessName: businessForm.businessName,
                businessPhone: businessForm.businessPhone,
                businessAddress: businessForm.businessAddress
            };

            await window.electronAPI.settings.set({ key: 'activation_data', value: updatedData });

            // 2. Update Firestore if we have a UID
            if (updatedData.uid) {
                const userRef = doc(db, 'users', updatedData.uid);
                await updateDoc(userRef, {
                    businessName: businessForm.businessName,
                    businessPhone: businessForm.businessPhone,
                    businessAddress: businessForm.businessAddress
                });
            }

            setActivationData(updatedData);
            setIsEditingBusiness(false);
            toast.success('Business information updated');
        } catch (error) {
            console.error('Failed to update business info:', error);
            toast.error('Failed to save changes');
        } finally {
            setSavingBusiness(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-zinc-500">Loading profile...</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <UpdateEmailModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                currentEmail={activationData?.email}
                onSuccess={(newEmail) => setActivationData(prev => ({ ...prev, email: newEmail }))}
            />
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">My Profile</h1>
                    <p className="text-zinc-500">Manage your account and subscription details.</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* User Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-accent-primary" />
                                Personal Information
                            </h2>
                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-zinc-500 mb-1">Full Name</label>
                                        <div className="p-3 bg-dark-tertiary rounded-lg text-white">
                                            {currentEmployee?.name || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-zinc-500 mb-1">Role</label>
                                        <div className="p-3 bg-dark-tertiary rounded-lg text-white flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-zinc-400" />
                                            <span className="capitalize">{currentEmployee?.role || 'Staff'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-500 mb-1">Email Address (Employee)</label>
                                    <div className="p-3 bg-dark-tertiary rounded-lg text-white flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-zinc-400" />
                                        {currentEmployee?.email || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Business Info (Editable) */}
                        {activationData && (
                            <div className="card">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-accent-primary" />
                                        Business Information
                                    </h2>
                                    {currentEmployee?.role === 'admin' && !isEditingBusiness && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingBusiness(true)}
                                            className="text-accent-primary hover:text-white"
                                        >
                                            <Edit2 className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                    )}
                                </div>

                                {isEditingBusiness ? (
                                    <div className="space-y-4 animate-fade-in">
                                        <Input
                                            label="Business Name"
                                            value={businessForm.businessName}
                                            onChange={(e) => setBusinessForm(prev => ({ ...prev, businessName: e.target.value }))}
                                        />
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <Input
                                                label="Phone"
                                                value={businessForm.businessPhone}
                                                onChange={(e) => setBusinessForm(prev => ({ ...prev, businessPhone: e.target.value }))}
                                            />
                                            <Input
                                                label="Address"
                                                value={businessForm.businessAddress}
                                                onChange={(e) => setBusinessForm(prev => ({ ...prev, businessAddress: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button variant="secondary" onClick={() => setIsEditingBusiness(false)} disabled={savingBusiness}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleSaveBusiness} loading={savingBusiness}>
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-4 px-1">
                                        <div>
                                            <label className="block text-sm text-zinc-500 mb-1">Business Name</label>
                                            <div className="p-3 bg-dark-tertiary rounded-lg text-white">
                                                {activationData.businessName || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-500 mb-1">Phone</label>
                                            <div className="p-3 bg-dark-tertiary rounded-lg text-white">
                                                {activationData.businessPhone || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm text-zinc-500 mb-1">Address</label>
                                            <div className="p-3 bg-dark-tertiary rounded-lg text-white">
                                                {activationData.businessAddress || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Account Owner Info (Editable Email) */}
                        <div className="card border border-accent-primary/20 bg-accent-primary/5">
                            <div className="flex flex-col md:flex-row items-start gap-4">
                                <div className="p-3 bg-accent-primary/20 rounded-full text-accent-primary shrink-0">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">License Owner</h3>
                                            <p className="text-zinc-400 text-sm mb-4">
                                                This installation is registered to the following account.
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                                if (confirm('Sign in with your new email to sync changes? Your local data will be preserved.')) {
                                                    await window.electronAPI.settings.delete('activation_data');
                                                    window.location.reload();
                                                }
                                            }}
                                            className="text-zinc-400 hover:text-white"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-1" /> Reconnect
                                        </Button>
                                    </div>

                                    <div className="grid gap-2 text-sm overflow-hidden bg-dark-tertiary/50 p-4 rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between gap-2 text-white">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="w-20 text-zinc-500 shrink-0">Account:</span>
                                                <span className="truncate font-mono">{activationData?.email || 'Unknown'}</span>
                                            </div>
                                            {currentEmployee?.role === 'admin' && (
                                                <button
                                                    onClick={() => setShowEmailModal(true)}
                                                    className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
                                                    title="Change Email"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-white">
                                            <span className="w-20 text-zinc-500 shrink-0">Activated:</span>
                                            {activationData?.activatedAt ? new Date(activationData.activatedAt).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Card */}
                    <div className="lg:col-span-1">
                        <div className="card h-full bg-gradient-to-b from-dark-secondary to-dark-tertiary border-accent-primary/10">
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500 mb-4">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-1">Current Plan</h3>
                                <div className="text-3xl font-bold text-white capitalize">
                                    {activationData?.plan || 'Free'}
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-green-400 text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    Active Subscription
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                {(() => {
                                    const planFeatures = {
                                        'free': ["1 Register", "100 Products", "Basic Reporting", "Email Support"],
                                        'pro': ["3 Registers", "Unlimited Products", "Advanced Analytics", "Inventory Management", "Priority Support"],
                                        'enterprise': ["Unlimited Registers", "Multi-store Sync", "API Access", "Dedicated Account Manager"]
                                    };

                                    const planKey = (activationData?.plan || 'free').toLowerCase();
                                    const features = planFeatures[planKey] || planFeatures['free'];

                                    return features.map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm text-zinc-400">
                                            <CheckCircle className="w-4 h-4 text-zinc-600" />
                                            <span>{feature}</span>
                                        </div>
                                    ));
                                })()}
                            </div>

                            <Button
                                variant="primary"
                                className="w-full flex items-center justify-center gap-2"
                                onClick={handleManageSubscription}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Manage Billing
                            </Button>
                            <p className="text-xs text-center text-zinc-600 mt-4">
                                Opens in your web browser
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

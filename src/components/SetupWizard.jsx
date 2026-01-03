import { useState, useEffect } from 'react';
import { Check, ChevronRight, ChevronLeft, Building2, User, Percent, Receipt, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { toast } from './ui/Toast';
import { currencies as CURRENCIES } from '../data/currencies';
import { v4 as uuid } from 'uuid';

const STEPS = [
    { id: 'welcome', title: 'Welcome', icon: Sparkles },
    { id: 'admin', title: 'Admin Profile', icon: User },
    { id: 'business', title: 'Business Info', icon: Building2 },
    { id: 'tax', title: 'Tax & Currency', icon: Percent },
    { id: 'receipt', title: 'Receipt Settings', icon: Receipt },
    { id: 'complete', title: 'Complete', icon: Check },
];

export default function SetupWizard({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Admin profile
    const [adminData, setAdminData] = useState({
        name: '',
        email: '',
        pin: '',
        confirmPin: '',
    });

    // Business info
    const [businessData, setBusinessData] = useState({
        businessName: '',
        businessAddress: '',
        businessPhone: '',
        businessEmail: '',
    });

    // Tax & Currency
    const [taxData, setTaxData] = useState({
        taxRate: '10',
        taxName: 'Tax',
        taxType: 'inclusive',
        currency: 'USD',
        currencySymbol: '$',
    });

    useEffect(() => {
        const loadActivationInfo = async () => {
            try {
                const activationData = await window.electronAPI.settings.get('activation_data');
                console.log('SetupWizard: Loaded Activation Data:', activationData);
                if (activationData) {
                    setBusinessData(prev => ({
                        ...prev,
                        businessName: activationData.businessName || '',
                        businessAddress: activationData.businessAddress || '',
                        businessPhone: activationData.businessPhone || '',
                        businessEmail: activationData.email || '', // Use account email as default business email
                    }));
                }
            } catch (error) {
                console.error('Failed to load activation data for setup:', error);
            }
        };
        loadActivationInfo();
    }, []);

    // Receipt settings
    const [receiptData, setReceiptData] = useState({
        receiptHeader: 'Thank you for your purchase!',
        receiptFooter: 'Please come again!',
    });

    const handleCurrencyChange = (currencyCode) => {
        const currency = CURRENCIES.find(c => c.code === currencyCode);
        if (currency) {
            setTaxData(prev => ({
                ...prev,
                currency: currencyCode,
                currencySymbol: currency.symbol,
            }));
        }
    };

    const validateStep = (step) => {
        switch (step) {
            case 1: // Admin
                if (!adminData.name.trim()) {
                    toast.error('Please enter admin name');
                    return false;
                }
                if (!adminData.pin || adminData.pin.length < 4) {
                    toast.error('PIN must be at least 4 digits');
                    return false;
                }
                if (adminData.pin !== adminData.confirmPin) {
                    toast.error('PINs do not match');
                    return false;
                }
                return true;
            case 2: // Business
                if (!businessData.businessName.trim()) {
                    toast.error('Please enter business name');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = async () => {
        if (!validateStep(currentStep)) return;

        if (currentStep === STEPS.length - 2) {
            // Last step before complete - save everything
            await saveAllSettings();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSkip = () => {
        setCurrentStep(prev => prev + 1);
    };

    const saveAllSettings = async () => {
        setLoading(true);
        try {
            // Clean up any existing employees (e.g. default seed)
            const existingEmployees = await window.electronAPI.employees.getAll();
            for (const emp of existingEmployees) {
                await window.electronAPI.employees.delete(emp.id);
            }

            // Create admin employee
            await window.electronAPI.employees.create({
                id: uuid(),
                name: adminData.name,
                email: adminData.email || null,
                pin: adminData.pin,
                role: 'admin',
                is_active: 1,
            });

            // Save business settings
            const storeConfig = {
                ...businessData,
                ...taxData,
                ...receiptData,
            };

            // Get existing settings and update
            const existingSettings = await window.electronAPI.settings.getAll();

            // Update store_config
            await window.electronAPI.settings.set({ key: 'store_config', value: storeConfig });

            // Mark setup as completed
            await window.electronAPI.settings.set({ key: 'setup_completed', value: 'true' });

            toast.success('Setup completed successfully!');
            setCurrentStep(STEPS.length - 1);
        } catch (error) {
            console.error('Setup error:', error);
            toast.error('Failed to save settings: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        onComplete?.();
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Welcome
                return (
                    <div className="text-center py-8">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Welcome to POS by Cirvex</h2>
                        <p className="text-zinc-400 text-lg max-w-md mx-auto">
                            Let's set up your point-of-sale system in just a few simple steps.
                        </p>
                        <div className="mt-8 space-y-3 text-left max-w-sm mx-auto">
                            <div className="flex items-center gap-3 text-zinc-300">
                                <Check className="w-5 h-5 text-green-500" />
                                <span>Create admin account</span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-300">
                                <Check className="w-5 h-5 text-green-500" />
                                <span>Configure your business</span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-300">
                                <Check className="w-5 h-5 text-green-500" />
                                <span>Set up tax & pricing</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-xs text-zinc-500 mb-2">Wrong account or missing data?</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={async () => {
                                    if (confirm('This will clear the current activation and allow you to sign in again. Continue?')) {
                                        await window.electronAPI.settings.delete('activation_data');
                                        window.location.reload();
                                    }
                                }}
                            >
                                Reset Activation
                            </Button>
                        </div>
                    </div>
                );

            case 1: // Admin Profile
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-6">Create Admin Profile</h2>
                        <Input
                            label="Full Name *"
                            value={adminData.name}
                            onChange={(e) => setAdminData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter your name"
                            required
                        />
                        <Input
                            label="Email (optional)"
                            type="email"
                            value={adminData.email}
                            onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="admin@example.com"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="PIN *"
                                type="password"
                                value={adminData.pin}
                                onChange={(e) => setAdminData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                                placeholder="4-6 digits"
                                required
                            />
                            <Input
                                label="Confirm PIN *"
                                type="password"
                                value={adminData.confirmPin}
                                onChange={(e) => setAdminData(prev => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                                placeholder="Confirm PIN"
                                required
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            This PIN will be used to log in to the POS system.
                        </p>
                    </div>
                );

            case 2: // Business Info
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-6">Business Information</h2>
                        <Input
                            label="Business Name *"
                            value={businessData.businessName}
                            onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                            placeholder="Your Business Name"
                            required
                        />
                        <Input
                            label="Address"
                            value={businessData.businessAddress}
                            onChange={(e) => setBusinessData(prev => ({ ...prev, businessAddress: e.target.value }))}
                            placeholder="123 Main Street, City"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Phone"
                                value={businessData.businessPhone}
                                onChange={(e) => setBusinessData(prev => ({ ...prev, businessPhone: e.target.value }))}
                                placeholder="+1 234 567 890"
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={businessData.businessEmail}
                                onChange={(e) => setBusinessData(prev => ({ ...prev, businessEmail: e.target.value }))}
                                placeholder="info@business.com"
                            />
                        </div>
                    </div>
                );

            case 3: // Tax & Currency
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-6">Tax & Currency Settings</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Tax Rate (%)"
                                type="number"
                                value={taxData.taxRate}
                                onChange={(e) => setTaxData(prev => ({ ...prev, taxRate: e.target.value }))}
                                placeholder="10"
                                min="0"
                                max="100"
                            />
                            <Input
                                label="Tax Name"
                                value={taxData.taxName}
                                onChange={(e) => setTaxData(prev => ({ ...prev, taxName: e.target.value }))}
                                placeholder="Tax, VAT, GST"
                            />
                        </div>
                        <Select
                            label="Tax Type"
                            value={taxData.taxType}
                            onChange={(val) => setTaxData(prev => ({ ...prev, taxType: val }))}
                            options={[
                                { value: 'inclusive', label: 'Inclusive (included in price)' },
                                { value: 'exclusive', label: 'Exclusive (added to price)' },
                            ]}
                        />
                        <Select
                            label="Currency"
                            value={taxData.currency}
                            onChange={handleCurrencyChange}
                            options={CURRENCIES.map(c => ({
                                value: c.code,
                                label: `${c.code} - ${c.name} (${c.symbol})`
                            }))}
                        />
                        <Input
                            label="Currency Symbol"
                            value={taxData.currencySymbol}
                            onChange={(e) => setTaxData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                            placeholder="$"
                            maxLength={5}
                        />
                    </div>
                );

            case 4: // Receipt Settings
                return (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-6">Receipt Settings</h2>
                        <Input
                            label="Receipt Header"
                            value={receiptData.receiptHeader}
                            onChange={(e) => setReceiptData(prev => ({ ...prev, receiptHeader: e.target.value }))}
                            placeholder="Thank you for your purchase!"
                        />
                        <Input
                            label="Receipt Footer"
                            value={receiptData.receiptFooter}
                            onChange={(e) => setReceiptData(prev => ({ ...prev, receiptFooter: e.target.value }))}
                            placeholder="Please come again!"
                        />
                        <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
                            <h4 className="text-sm font-medium mb-2 text-zinc-400">Preview</h4>
                            <div className="text-center text-sm">
                                <p className="text-zinc-300">{receiptData.receiptHeader || 'Header text'}</p>
                                <p className="text-zinc-500 my-2">--- Receipt Details ---</p>
                                <p className="text-zinc-300">{receiptData.receiptFooter || 'Footer text'}</p>
                            </div>
                        </div>
                    </div>
                );

            case 5: // Complete
                return (
                    <div className="text-center py-8">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <Check className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Setup Complete!</h2>
                        <p className="text-zinc-400 text-lg max-w-md mx-auto mb-8">
                            Your POS system is ready to use. You can always update these settings later.
                        </p>
                        <div className="bg-zinc-800/50 rounded-lg p-6 max-w-sm mx-auto">
                            <h4 className="font-medium mb-3">Quick Summary</h4>
                            <div className="space-y-2 text-sm text-left">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Admin:</span>
                                    <span>{adminData.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Business:</span>
                                    <span>{businessData.businessName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Currency:</span>
                                    <span>{taxData.currency} ({taxData.currencySymbol})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Tax:</span>
                                    <span>{taxData.taxRate}% ({taxData.taxType})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const canSkip = currentStep === 3 || currentStep === 4; // Tax & Receipt steps

    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;
                        return (
                            <div key={step.id} className="flex items-center">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                                    ${isActive ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/30' : ''}
                                    ${!isActive && !isCompleted ? 'bg-zinc-800 text-zinc-500' : ''}
                                `}>
                                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className={`
                                        w-12 md:w-20 h-1 mx-1
                                        ${isCompleted ? 'bg-green-500' : 'bg-zinc-800'}
                                    `} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step Content Card */}
                <div className="card p-8">
                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-border">
                        <div>
                            {currentStep > 0 && currentStep < STEPS.length - 1 && (
                                <Button variant="secondary" onClick={handleBack}>
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {canSkip && (
                                <Button variant="secondary" onClick={handleSkip}>
                                    Skip
                                </Button>
                            )}
                            {currentStep < STEPS.length - 1 ? (
                                <Button onClick={handleNext} loading={loading}>
                                    {currentStep === STEPS.length - 2 ? 'Complete Setup' : 'Next'}
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button onClick={handleFinish}>
                                    Launch POS
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

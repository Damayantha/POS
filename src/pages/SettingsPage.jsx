import { useState, useEffect } from 'react';
import { Settings, Building, Receipt, Percent, Database, Save, RefreshCw, Download, Upload, Mail, Cloud, Globe, Lock, ShieldCheck, CheckCircle, ExternalLink, Unlink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Tabs } from '../components/ui/Tabs';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/authStore';
import { currencies } from '../data/currencies';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { SystemLogs } from '../components/settings/SystemLogs';


const baseTabs = [
    { id: 'business', label: 'Business Info' },
    { id: 'tax', label: 'Tax Settings' },
    { id: 'mail', label: 'Email Settings' },
    { id: 'cloud', label: 'Cloud Sync' },
    { id: 'receipt', label: 'Receipt' },
    { id: 'backup', label: 'Backup' },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('business');
    const [settings, setSettings] = useState({
        businessName: '',
        businessAddress: '',
        businessPhone: '',
        businessEmail: '',
        taxRate: 10,
        taxName: 'Tax',
        taxType: 'exclusive', // 'exclusive' or 'inclusive'
        currency: 'USD',
        currencySymbol: '$',
        receiptHeader: '',
        receiptFooter: '',
        email_host: 'smtp.gmail.com',
        email_port: 587,
        email_secure: false,
        sync_provider: 'none', // 'none', 'firebase'
        sync_interval: '0', // 0 = Realtime/Instant, 5, 15, 30, 60
    });
    const [loading, setLoading] = useState(true);
    const [isManualSyncing, setIsManualSyncing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState('');


    const [saving, setSaving] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const [syncStatus, setSyncStatus] = useState({ status: 'idle', details: null });



    const { isAdmin } = useAuthStore();
    const tabs = isAdmin ? [...baseTabs, { id: 'logs', label: 'System Logs' }] : baseTabs;



    // Load initial settings
    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        const handleStatusChange = (data) => {
            setSyncStatus(data || { status: 'idle' });
            const status = data?.status;
            if (status === 'idle' || status === 'error') {
                setIsManualSyncing(false);
            } else if (status === 'syncing') {
                setIsManualSyncing(true);
            }
        };

        let unsubscribe;
        if (window.electronAPI?.sync) {
            unsubscribe = window.electronAPI.sync.onStatusChange(handleStatusChange);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const loadSettings = async () => {
        try {
            const data = await window.electronAPI.settings.getAll();

            // Parse nested JSON settings
            let parsedSettings = { ...data };

            if (data.store_config) {
                try {
                    const storeConfig = typeof data.store_config === 'string'
                        ? JSON.parse(data.store_config)
                        : data.store_config;
                    parsedSettings = { ...parsedSettings, ...storeConfig };
                } catch (e) { console.error('Failed to parse store_config', e); }
            }



            if (data.email_settings) {
                try {
                    const emailConfig = typeof data.email_settings === 'string'
                        ? JSON.parse(data.email_settings)
                        : data.email_settings;
                    parsedSettings = {
                        ...parsedSettings,
                        email_host: emailConfig.host,
                        email_port: emailConfig.port,
                        email_user: emailConfig.user,
                        email_password: emailConfig.pass,
                        email_secure: emailConfig.secure
                    };
                } catch (e) { console.error('Failed to parse email_settings', e); }
            }

            if (data.sync_settings) {
                try {
                    const syncConfig = typeof data.sync_settings === 'string'
                        ? JSON.parse(data.sync_settings)
                        : data.sync_settings;
                    parsedSettings = {
                        ...parsedSettings,
                        sync_provider: syncConfig.provider || 'none',
                        sync_interval: syncConfig.interval || '0'
                    };
                } catch (e) { console.error('Failed to parse sync_settings', e); }
            }

            setSettings(prev => ({ ...prev, ...parsedSettings }));
        } catch (error) {
            toast.error('Failed to load settings');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Group settings into JSON blobs
            const storeConfig = {
                businessName: settings.businessName,
                businessAddress: settings.businessAddress,
                businessPhone: settings.businessPhone,
                businessEmail: settings.businessEmail,
                taxRate: settings.taxRate,
                taxName: settings.taxName,
                taxType: settings.taxType,
                currency: settings.currency,
                currencySymbol: settings.currencySymbol,
                receiptHeader: settings.receiptHeader,
                receiptFooter: settings.receiptFooter,
            };

            const emailConfig = {
                host: settings.email_host,
                port: settings.email_port,
                user: settings.email_user,
                pass: settings.email_password,
                secure: settings.email_secure,
            };

            const syncConfig = {
                provider: settings.sync_provider,
                interval: settings.sync_interval
            };

            // Save structured data
            await window.electronAPI.settings.set({ key: 'store_config', value: storeConfig });
            await window.electronAPI.settings.set({ key: 'email_settings', value: emailConfig });
            await window.electronAPI.settings.set({ key: 'sync_settings', value: syncConfig });

            // If sync provider changed, we might need to trigger main process to re-init
            // For now, just saving.

            // Notify app components that settings changed (triggers SyncProvider reload)
            window.dispatchEvent(new Event('pos:settings-changed'));

            console.log('Settings saved successfully');
            toast.success('Settings saved');
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };


    const handleSyncNow = async () => {
        try {
            setIsManualSyncing(true); // Optimistic UI
            await window.electronAPI.sync.trigger();
            toast.info('Sync triggered...');
        } catch (error) {
            console.error('Sync trigger failed:', error);
            toast.error('Sync failed');
            setIsManualSyncing(false);
        }
    };

    const handleForcePush = async () => {
        if (!confirm('This will re-upload ALL local data to the cloud. Use this if your cloud data is out of sync. Continue?')) return;
        try {
            setIsManualSyncing(true); // Share loading state
            await window.electronAPI.sync.forcePush();
            toast.success('Full Re-Sync Triggered!');
        } catch (error) {
            console.error('Force Sync failed:', error);
            toast.error('Force Sync failed');
            setIsManualSyncing(false);
        }
    };

    const handleImportFromCloud = async () => {
        if (!auth.currentUser) {
            toast.error('You must be logged in to import data.');
            return;
        }

        if (!confirm('This will fetch all data from the cloud and update your local database. Existing records with same IDs will be overwritten. Continue?')) {
            return;
        }

        setImporting(true);
        setImportProgress('Starting import...');

        try {
            const uid = auth.currentUser.uid;

            const collections = [
                'products', 'customers', 'sales', 'employees',
                'gift_cards', 'bundles', 'promotions',
                'categories', 'suppliers', 'purchase_orders', 'receivings', 'supplier_invoices',
                'sale_items', 'purchase_order_items', 'receiving_items',
                'credit_sales', 'credit_payments',
                'quotations', 'quotation_items',
                'returns', 'return_items', 'supplier_payments'
            ];

            let totalImported = 0;

            for (const tableName of collections) {
                setImportProgress(`Importing ${tableName}...`);
                try {
                    const colRef = collection(db, 'tenants', uid, tableName);
                    const snapshot = await getDocs(colRef);

                    if (!snapshot.empty) {
                        console.log(`Importing ${snapshot.size} records for ${tableName}`);
                        for (const doc of snapshot.docs) {
                            await window.electronAPI.sync.incoming(tableName, doc.data());
                            totalImported++;
                        }
                    }
                } catch (err) {
                    console.error(`Error importing ${tableName}:`, err);
                    // Continue to next table
                }
            }

            toast.success(`Cloud Import Complete! Processed ${totalImported} records.`);
            setImportProgress('');
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Import failed: ' + error.message);
        } finally {
            setImporting(false);
        }
    };

    const handleExport = async () => {
        try {
            const result = await window.electronAPI.backup.create();
            if (result.success) {
                toast.success('Backup exported successfully');
            } else if (!result.canceled) {
                toast.error(`Export failed: ${result.error}`);
            }
        } catch (error) {
            toast.error('Failed to export backup');
            console.error(error);
        }
    };

    const handleImport = async () => {
        try {
            const result = await window.electronAPI.backup.restore();
            if (result.success) {
                toast.success('Backup restored successfully');
                setTimeout(() => window.location.reload(), 2000);
            } else if (!result.canceled) {
                toast.error(`Import failed: ${result.error}`);
            }
        } catch (error) {
            toast.error('Failed to import backup');
            console.error(error);
        }
    };

    const handleReset = async () => {
        try {
            const result = await window.electronAPI.backup.reset();
            if (result.success) {
                toast.success('Database reset successfully');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                toast.error(`Reset failed: ${result.error}`);
            }
        } catch (error) {
            toast.error('Failed to reset database');
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-dark-border">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Settings</h1>
                        <p className="text-zinc-500">Configure your POS system</p>
                    </div>
                    <Button onClick={handleSave} loading={saving}>
                        <Save className="w-4 h-4" />
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    <Tabs tabs={tabs} defaultTab={activeTab} onChange={setActiveTab} />

                    <div className="mt-6">
                        {activeTab === 'business' && (
                            <Card className="space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-dark-border">
                                    <div className="p-3 rounded-lg bg-accent-primary/20">
                                        <Building className="w-6 h-6 text-accent-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Business Information</h3>
                                        <p className="text-sm text-zinc-400">Your business details for receipts and reports</p>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <Input
                                        label="Business Name"
                                        value={settings.businessName}
                                        onChange={(e) => handleChange('businessName', e.target.value)}
                                        placeholder="Enter your business name"
                                    />
                                    <TextArea
                                        label="Business Address"
                                        value={settings.businessAddress}
                                        onChange={(e) => handleChange('businessAddress', e.target.value)}
                                        placeholder="Enter your business address"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Phone"
                                            value={settings.businessPhone}
                                            onChange={(e) => handleChange('businessPhone', e.target.value)}
                                            placeholder="Phone number"
                                        />
                                        <Input
                                            label="Email"
                                            type="email"
                                            value={settings.businessEmail}
                                            onChange={(e) => handleChange('businessEmail', e.target.value)}
                                            placeholder="Email address"
                                        />
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'tax' && (
                            <Card className="space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-dark-border">
                                    <div className="p-3 rounded-lg bg-amber-500/20">
                                        <Percent className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Tax Settings</h3>
                                        <p className="text-sm text-zinc-400">Configure tax rates and currency</p>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Tax Name"
                                            value={settings.taxName}
                                            onChange={(e) => handleChange('taxName', e.target.value)}
                                            placeholder="VAT, GST, Sales Tax"
                                        />
                                        <Select
                                            label="Tax Type"
                                            value={settings.taxType}
                                            onChange={(value) => handleChange('taxType', value)}
                                            options={[
                                                { value: 'exclusive', label: 'Exclusive (Added to price)' },
                                                { value: 'inclusive', label: 'Inclusive (Included in price)' },
                                            ]}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Default Tax Rate (%)"
                                            type="number"
                                            step="0.1"
                                            value={settings.taxRate}
                                            onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                                            placeholder="10"
                                        />
                                        <Select
                                            label="Currency"
                                            value={settings.currency}
                                            onChange={(value) => {
                                                const selected = currencies.find(c => c.code === value);
                                                handleChange('currency', value);
                                                if (selected) {
                                                    handleChange('currencySymbol', selected.symbol);
                                                }
                                            }}
                                            options={currencies.map(c => ({
                                                value: c.code,
                                                label: `${c.code} - ${c.name} (${c.symbol})`
                                            }))}
                                        />
                                    </div>
                                    <Input
                                        label="Currency Symbol"
                                        value={settings.currencySymbol}
                                        onChange={(e) => handleChange('currencySymbol', e.target.value)}
                                        placeholder="$"
                                        className="w-24"
                                    />
                                </div>
                            </Card>
                        )}

                        {activeTab === 'mail' && (
                            <Card className="space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-dark-border">
                                    <div className="p-3 rounded-lg bg-indigo-500/20">
                                        <Mail className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Email Settings</h3>
                                        <p className="text-sm text-zinc-400">Configure SMTP for sending receipts</p>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="SMTP Host"
                                            value={settings.email_host || ''}
                                            onChange={(e) => handleChange('email_host', e.target.value)}
                                            placeholder="smtp.gmail.com"
                                        />
                                        <Input
                                            label="SMTP Port"
                                            type="number"
                                            value={settings.email_port || ''}
                                            onChange={(e) => handleChange('email_port', e.target.value)}
                                            placeholder="587"
                                        />
                                    </div>
                                    <Input
                                        label="SMTP User / Email"
                                        value={settings.email_user || ''}
                                        onChange={(e) => handleChange('email_user', e.target.value)}
                                        placeholder="your-email@gmail.com"
                                    />
                                    <Input
                                        label="SMTP Password / App Password"
                                        type="password"
                                        value={settings.email_password || ''}
                                        onChange={(e) => handleChange('email_password', e.target.value)}
                                        placeholder="App Password"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="secure"
                                            checked={settings.email_secure || false}
                                            onChange={(e) => handleChange('email_secure', e.target.checked)}
                                            className="w-4 h-4 rounded bg-dark-tertiary border-dark-border"
                                        />
                                        <label htmlFor="secure" className="text-sm text-zinc-300">Use Secure Connection (SSL/TLS)</label>
                                    </div>
                                    <p className="text-xs text-zinc-500 ml-6">
                                        For Gmail/Outlook on Port 587: <strong>Uncheck</strong> this. <br />
                                        For Port 465: <strong>Check</strong> this.
                                    </p>

                                    <div className="pt-4 border-t border-dark-border">
                                        <Button
                                            variant="secondary"
                                            onClick={async () => {
                                                setSaving(true);
                                                try {
                                                    // Save email settings properly
                                                    const emailConfig = {
                                                        host: settings.email_host,
                                                        port: settings.email_port,
                                                        user: settings.email_user,
                                                        pass: settings.email_password,
                                                        secure: settings.email_secure,
                                                    };

                                                    await window.electronAPI.settings.set({
                                                        key: 'email_settings',
                                                        value: JSON.stringify(emailConfig)
                                                    });

                                                    // Test connection
                                                    const result = await window.electronAPI.email.testConnection({
                                                        smtp_host: settings.email_host,
                                                        smtp_port: parseInt(settings.email_port),
                                                        smtp_user: settings.email_user,
                                                        smtp_pass: settings.email_password,
                                                        smtp_secure: settings.email_secure
                                                    });

                                                    if (result.success) {
                                                        toast.success('Settings saved and connection verified!');
                                                    } else {
                                                        toast.error(`Settings saved but connection failed: ${result.message}`);
                                                        console.error('SMTP Error:', result.message);
                                                    }
                                                } catch (e) {
                                                    toast.error('Failed to save settings');
                                                    console.error(e);
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }}
                                        >
                                            Save & Test Connection
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )}


                        {activeTab === 'cloud' && (
                            <Card className="space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-dark-border">
                                    <div className="p-3 rounded-lg bg-sky-500/20">
                                        <Cloud className="w-6 h-6 text-sky-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Cloud Synchronization</h3>
                                        <p className="text-sm text-zinc-400">Sync your data across multiple devices</p>
                                    </div>
                                </div>

                                <div className="grid gap-6">
                                    {/* Provider Selection */}
                                    <div>
                                        <label className="text-sm font-medium text-zinc-300 mb-3 block">Sync Provider</label>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <button
                                                onClick={() => handleChange('sync_provider', 'none')}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${settings.sync_provider === 'none'
                                                    ? 'border-accent-primary bg-accent-primary/10'
                                                    : 'border-dark-border bg-dark-tertiary hover:border-zinc-600'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Lock className="w-5 h-5 text-zinc-400" />
                                                    {settings.sync_provider === 'none' && <CheckCircle className="w-5 h-5 text-accent-primary" />}
                                                </div>
                                                <div className="font-semibold">Local Only</div>
                                                <div className="text-xs text-zinc-500 mt-1">Data stored on this device only. No syncing.</div>
                                            </button>

                                            <button
                                                onClick={() => handleChange('sync_provider', 'firebase')}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${settings.sync_provider === 'firebase'
                                                    ? 'border-accent-primary bg-accent-primary/10'
                                                    : 'border-dark-border bg-dark-tertiary hover:border-zinc-600'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Cloud className="w-5 h-5 text-orange-400" />
                                                    {settings.sync_provider === 'firebase' && <CheckCircle className="w-5 h-5 text-accent-primary" />}
                                                </div>
                                                <div className="font-semibold">Cirvex Cloud</div>
                                                <div className="text-xs text-zinc-500 mt-1">Managed secure cloud. Best for most users.</div>
                                            </button>




                                        </div>
                                    </div>



                                    {/* Firebase Info */}
                                    {settings.sync_provider === 'firebase' && (
                                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
                                            <p className="font-semibold flex items-center gap-2 mb-1">
                                                <CheckCircle className="w-4 h-4" />
                                                Ready to Sync
                                            </p>
                                            <p className="opacity-80">
                                                Your data will be synced to our secure cloud servers. You can access your inventory from any other device logged in with this account.
                                            </p>
                                        </div>
                                    )}



                                    {/* Status Display (Mock for now, will implement actual status later) */}
                                    {/* Sync Interval Configuration */}
                                    {settings.sync_provider !== 'none' && (
                                        <div className="pt-4 border-t border-dark-border mt-6">
                                            <label className="text-sm font-medium text-zinc-300 mb-3 block">Sync Frequency</label>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <Select
                                                    label="Auto-Sync Interval"
                                                    value={settings.sync_interval}
                                                    onChange={(value) => handleChange('sync_interval', value)}
                                                    options={[
                                                        { value: '0', label: 'Realtime (Instant)' },
                                                        { value: '5', label: 'Every 5 Minutes' },
                                                        { value: '15', label: 'Every 15 Minutes' },
                                                        { value: '30', label: 'Every 30 Minutes' },
                                                        { value: '60', label: 'Every Hour' },
                                                    ]}
                                                />
                                                <div className="text-xs text-zinc-500 mt-8">
                                                    Realtime mode pushes changes immediately. Intervals are useful for saving bandwidth or as a backup.
                                                </div>
                                            </div>

                                            {/* Sync Actions */}
                                            <div className="border-t border-dark-border pt-6 mt-6">
                                                <h4 className="font-medium mb-4">Sync Actions</h4>

                                                <div className="grid md:grid-cols-3 gap-4">
                                                    {/* Sync Now */}
                                                    <div className="p-4 bg-dark-tertiary rounded-lg border border-dark-border flex flex-col justify-between">
                                                        <div>
                                                            <h5 className="font-medium mb-1">Sync Now</h5>
                                                            <p className="text-sm text-zinc-500 mb-4">
                                                                Trigger manual sync check.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            onClick={handleSyncNow}
                                                            disabled={loading || isManualSyncing}
                                                            variant="secondary"
                                                            className="w-full"
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Sync Now
                                                        </Button>
                                                    </div>

                                                    {/* Import / Download */}
                                                    <div className="p-4 bg-dark-tertiary rounded-lg border border-dark-border flex flex-col justify-between">
                                                        <div>
                                                            <h5 className="font-medium mb-1">Import from Cloud</h5>
                                                            <p className="text-sm text-zinc-500 mb-4">
                                                                Download all data from cloud.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            onClick={handleImportFromCloud}
                                                            variant="secondary"
                                                            disabled={loading || isManualSyncing || importing}
                                                            className="w-full"
                                                        >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            {importing ? importProgress : 'Download All'}
                                                        </Button>
                                                    </div>

                                                    {/* Repair / Upload */}
                                                    <div className="p-4 bg-dark-tertiary rounded-lg border border-dark-border flex flex-col justify-between">
                                                        <div>
                                                            <h5 className="font-medium mb-1">Repair Sync</h5>
                                                            <p className="text-sm text-zinc-500 mb-4">
                                                                Force re-upload ALL local data.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            onClick={handleForcePush}
                                                            variant="outline"
                                                            disabled={loading || isManualSyncing}
                                                            className="w-full border-red-500/50 hover:bg-red-500/10 text-red-400"
                                                        >
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            Re-Upload All
                                                        </Button>
                                                    </div>


                                                </div>
                                                {importing && <div className="text-xs text-accent-primary animate-pulse mt-2">{importProgress}</div>}
                                            </div>
                                        </div>
                                    )}



                                </div>
                            </Card>
                        )}

                        {activeTab === 'receipt' && (
                            <Card className="space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-dark-border">
                                    <div className="p-3 rounded-lg bg-green-500/20">
                                        <Receipt className="w-6 h-6 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Receipt Customization</h3>
                                        <p className="text-sm text-zinc-400">Customize your receipt appearance</p>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <TextArea
                                        label="Receipt Header Message"
                                        value={settings.receiptHeader}
                                        onChange={(e) => handleChange('receiptHeader', e.target.value)}
                                        placeholder="Thank you for shopping with us!"
                                    />
                                    <TextArea
                                        label="Receipt Footer Message"
                                        value={settings.receiptFooter}
                                        onChange={(e) => handleChange('receiptFooter', e.target.value)}
                                        placeholder="Please come again! Returns accepted within 30 days."
                                    />

                                    {/* Purchase Order Signature Section */}
                                    <div className="pt-4 border-t border-dark-border">
                                        <h4 className="font-medium text-zinc-300 mb-3">Purchase Order Signature</h4>
                                        <p className="text-sm text-zinc-500 mb-4">Upload a signature image and enter signatory details for Purchase Order PDFs.</p>

                                        {/* Signature Image Upload */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">Signature Image</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-48 h-24 border-2 border-dashed border-dark-border rounded-lg flex items-center justify-center bg-dark-tertiary overflow-hidden">
                                                    {settings.poSignatureImage ? (
                                                        <img
                                                            src={`app://${settings.poSignatureImage}`}
                                                            alt="Signature"
                                                            className="max-w-full max-h-full object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-zinc-500 text-sm">No signature</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={async () => {
                                                            try {
                                                                const result = await window.electronAPI.dialog.selectImage();
                                                                if (result.success && result.fileName) {
                                                                    handleChange('poSignatureImage', result.fileName);
                                                                    toast.success('Signature image uploaded');
                                                                } else if (!result.canceled) {
                                                                    toast.error('Failed to upload image');
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to select image');
                                                            }
                                                        }}
                                                    >
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Upload Image
                                                    </Button>
                                                    {settings.poSignatureImage && (
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={async () => {
                                                                try {
                                                                    await window.electronAPI.images.delete(settings.poSignatureImage);
                                                                    handleChange('poSignatureImage', '');
                                                                    toast.success('Signature image removed');
                                                                } catch (error) {
                                                                    toast.error('Failed to remove image');
                                                                }
                                                            }}
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-2">Recommended: PNG with transparent background, 300x100 pixels</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Signatory Name"
                                                value={settings.poSignatureName || ''}
                                                onChange={(e) => handleChange('poSignatureName', e.target.value)}
                                                placeholder="John Doe"
                                            />
                                            <Input
                                                label="Signatory Title"
                                                value={settings.poSignatureTitle || ''}
                                                onChange={(e) => handleChange('poSignatureTitle', e.target.value)}
                                                placeholder="Purchasing Manager"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Receipt Preview */}
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Preview</h4>
                                    <div className="bg-white text-black p-6 rounded-lg max-w-xs mx-auto text-center text-sm">
                                        <h3 className="font-bold text-lg mb-1">{settings.businessName || 'Business Name'}</h3>
                                        <p className="text-gray-600 text-xs mb-2">{settings.businessAddress || 'Business Address'}</p>
                                        <p className="text-gray-600 text-xs mb-4">{settings.businessPhone || 'Phone'}</p>
                                        <div className="border-t border-b border-gray-300 py-2 my-2">
                                            <p className="italic text-gray-600">{settings.receiptHeader || 'Header message'}</p>
                                        </div>
                                        <div className="text-left my-4 space-y-1">
                                            <div className="flex justify-between">
                                                <span>Sample Item x1</span>
                                                <span>{settings.currencySymbol}10.00</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Another Item x2</span>
                                                <span>{settings.currencySymbol}20.00</span>
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-300 pt-2 text-left">
                                            <div className="flex justify-between">
                                                <span>Subtotal</span>
                                                <span>{settings.currencySymbol}30.00</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Tax ({settings.taxRate}%)</span>
                                                <span>{settings.currencySymbol}3.00</span>
                                            </div>
                                            <div className="flex justify-between font-bold mt-1">
                                                <span>Total</span>
                                                <span>{settings.currencySymbol}33.00</span>
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-300 py-2 mt-4">
                                            <p className="italic text-gray-600">{settings.receiptFooter || 'Footer message'}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'backup' && (
                            <div className="space-y-4">
                                <Card className="space-y-6">
                                    <div className="flex items-center gap-3 pb-4 border-b border-dark-border">
                                        <div className="p-3 rounded-lg bg-blue-500/20">
                                            <Database className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Database Backup</h3>
                                            <p className="text-sm text-zinc-400">Export and import your POS data</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-dark-tertiary">
                                            <h4 className="font-medium mb-2">Export Data</h4>
                                            <p className="text-sm text-zinc-400 mb-4">
                                                Create a backup of all your products, customers, sales, and settings.
                                            </p>
                                            <Button variant="secondary" onClick={handleExport}>
                                                <Download className="w-4 h-4" />
                                                Export Backup
                                            </Button>
                                        </div>
                                        <div className="p-4 rounded-lg bg-dark-tertiary">
                                            <h4 className="font-medium mb-2">Import Data</h4>
                                            <p className="text-sm text-zinc-400 mb-4">
                                                Restore data from a previous backup file.
                                            </p>
                                            <Button variant="secondary" onClick={handleImport}>
                                                <Upload className="w-4 h-4" />
                                                Import Backup
                                            </Button>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">Reset Database</h4>
                                            <p className="text-sm text-zinc-400">
                                                Clear all data and start fresh. This cannot be undone.
                                            </p>
                                        </div>
                                        <Button
                                            variant="danger"
                                            onClick={() => setShowResetConfirm(true)}
                                        >
                                            Reset All Data
                                        </Button>
                                    </div>
                                </Card>

                                <Card>
                                    <h4 className="font-medium mb-4">System Information</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="p-3 rounded-lg bg-dark-tertiary">
                                            <p className="text-zinc-400">App Version</p>
                                            <p className="font-medium">1.0.0</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-dark-tertiary">
                                            <p className="text-zinc-400">Database</p>
                                            <p className="font-medium">SQLite</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-dark-tertiary">
                                            <p className="text-zinc-400">Platform</p>
                                            <p className="font-medium">Electron</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-dark-tertiary">
                                            <p className="text-zinc-400">Framework</p>
                                            <p className="font-medium">React + Vite</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'logs' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold">System Logs (Audit Trail)</h2>
                                </div>
                                <SystemLogs />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Reset Confirmation */}
            <ConfirmDialog
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={handleReset}
                title="Reset Database"
                message="Are you sure you want to reset the database? This will delete ALL data including products, sales, and customers. This action cannot be undone."
                confirmText="Reset Everything"
                variant="danger"
            />
        </div >
    );
}

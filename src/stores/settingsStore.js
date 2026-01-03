import { create } from 'zustand';

export const useSettingsStore = create((set, get) => ({
    settings: {
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 10,
        taxType: 'exclusive',
        taxName: 'Tax',
        businessName: '',
        businessAddress: '',
        businessPhone: '',
        businessEmail: '',
        poSignatureName: '',
        poSignatureTitle: '',
        receiptHeader: '',
        receiptFooter: ''
    },
    loading: false,
    error: null,

    loadSettings: async () => {
        set({ loading: true });
        try {
            const data = await window.electronAPI.settings.getAll();
            let parsedSettings = { ...data };

            // Parse store_config if present
            if (data.store_config) {
                try {
                    // store_config may already be an object (from getAll) or a string (legacy)
                    let storeConfig = data.store_config;
                    if (typeof storeConfig === 'string') {
                        storeConfig = JSON.parse(storeConfig);
                    }
                    parsedSettings = { ...parsedSettings, ...storeConfig };
                } catch (e) {
                    console.error('Failed to parse store_config', e);
                }
            }

            // Normalize taxRate to float
            if (parsedSettings.taxRate) {
                parsedSettings.taxRate = parseFloat(parsedSettings.taxRate) || 0;
            }

            set({ settings: { ...get().settings, ...parsedSettings }, loading: false });
        } catch (error) {
            console.error('Failed to load settings:', error);
            set({ error: error.message, loading: false });
        }
    },

    // Helper to format currency
    formatCurrency: (amount) => {
        const { currency } = get().settings;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD'
        }).format(amount || 0);
    }
}));

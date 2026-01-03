/**
 * SyncProvider Component
 * 
 * Conditionally loads the appropriate sync component based on user settings.
 * Supports: Firebase (RealtimeSync), Supabase (SupabaseSync), or None (Local Only)
 */

import { useState, useEffect } from 'react';
import { RealtimeSync } from './RealtimeSync';


export function SyncProvider() {
    const [syncConfig, setSyncConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSyncConfig();

        // Listen for settings changes from SettingsPage or other components
        const handleSettingsChange = () => {
            console.log('[SyncProvider] Settings changed, reloading config...');
            loadSyncConfig();
        };

        window.addEventListener('pos:settings-changed', handleSettingsChange);

        return () => {
            window.removeEventListener('pos:settings-changed', handleSettingsChange);
        };
    }, []);

    const loadSyncConfig = async () => {
        try {
            const settings = await window.electronAPI.settings.getAll();

            // Parse sync settings
            let syncConfigParsed = {};
            if (settings.sync_settings) {
                try {
                    syncConfigParsed = typeof settings.sync_settings === 'string'
                        ? JSON.parse(settings.sync_settings)
                        : settings.sync_settings;
                } catch (e) { console.error('[SyncProvider] Failed to parse sync_settings', e); }
            }

            // Parse legacy store_config just in case
            let storeConfig = {};
            if (settings.store_config) {
                try {
                    storeConfig = typeof settings.store_config === 'string'
                        ? JSON.parse(settings.store_config)
                        : settings.store_config;
                } catch (e) { console.error('[SyncProvider] Failed to parse store_config', e); }
            }

            // Merge settings (Priority: sync_settings > store_config > flat settings)
            const config = {
                sync_provider: syncConfigParsed.provider || storeConfig.sync_provider || settings.sync_provider || 'none',
            };

            console.log('[SyncProvider] Config loaded:', config.sync_provider);
            setSyncConfig(config);
        } catch (error) {
            console.error('[SyncProvider] Failed to load sync config:', error);
            setSyncConfig({ sync_provider: 'none' });
        } finally {
            setLoading(false);
        }
    };

    // Don't render anything while loading
    if (loading || !syncConfig) {
        return null;
    }

    // Render appropriate sync component based on provider
    switch (syncConfig.sync_provider) {
        case 'firebase':
            return <RealtimeSync />;



        case 'none':
        default:
            // No sync component needed
            console.log('[SyncProvider] Local-only mode, no cloud sync');
            return null;
    }
}

export default SyncProvider;

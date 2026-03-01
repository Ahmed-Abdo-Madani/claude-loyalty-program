import { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
    appId: 'me.madna.loyaltyapp',
    appName: 'Loyalty Program',
    webDir: 'dist',
    server: liveReloadUrl ? {
        androidScheme: 'https',
        url: liveReloadUrl,
        cleartext: true
    } : {
        androidScheme: 'https'
    }
};

export default config;

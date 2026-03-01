import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export const startNativeScan = async (onDetected, onError) => {
    try {
        const { camera } = await BarcodeScanner.checkPermissions();
        if (camera !== 'granted') {
            const { camera: newStatus } = await BarcodeScanner.requestPermissions();
            if (newStatus !== 'granted') {
                onError('Camera permission denied.');
                return () => { };
            }
        }

        await BarcodeScanner.startScan({ formats: ['QR_CODE', 'PDF_417'] });

        const listener = await BarcodeScanner.addListener('barcodeScanned', (result) => {
            onDetected([{ rawValue: result.barcode.rawValue, format: result.barcode.format }]);
        });

        return () => {
            BarcodeScanner.stopScan();
            listener.remove();
        };
    } catch (error) {
        onError(error.message || 'Failed to start native scanner');
        return () => { };
    }
};

export const stopNativeScan = async () => {
    try {
        await BarcodeScanner.stopScan();
    } catch (error) {
        console.error('Error stopping native scan', error);
    }
};

export const toggleNativeFlashlight = async (enable) => {
    try {
        if (enable) {
            await BarcodeScanner.enableTorch();
        } else {
            await BarcodeScanner.disableTorch();
        }
    } catch (error) {
        console.error('Error toggling native flashlight', error);
    }
};

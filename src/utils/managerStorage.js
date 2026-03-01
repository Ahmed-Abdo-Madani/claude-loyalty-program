import { isNative } from './platform';
import { Preferences } from '@capacitor/preferences';

export const setManagerItem = async (key, value) => {
    if (isNative()) {
        await Preferences.set({ key, value: String(value) });
    } else {
        localStorage.setItem(key, value);
    }
};

export const getManagerItem = async (key) => {
    if (isNative()) {
        const { value } = await Preferences.get({ key });
        return value;
    }
    return localStorage.getItem(key);
};

export const removeManagerItem = async (key) => {
    if (isNative()) {
        await Preferences.remove({ key });
    } else {
        localStorage.removeItem(key);
    }
};

export const clearManagerSession = async () => {
    const keys = [
        'managerAuthenticated',
        'managerToken',
        'managerBranchId',
        'managerBranchName',
        'managerLoginTimestamp'
    ];
    for (const key of keys) {
        await removeManagerItem(key);
    }
};

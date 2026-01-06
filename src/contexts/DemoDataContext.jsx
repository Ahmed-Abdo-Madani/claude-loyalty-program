import { createContext, useContext } from 'react';
import * as demoData from '../data/demoData';

const DemoDataContext = createContext(null);

export const DemoDataProvider = ({ children }) => {
    const value = {
        user: demoData.demoUser,
        analytics: demoData.demoAnalytics,
        offers: demoData.demoOffers,
        branches: demoData.demoBranches,
        products: demoData.demoProducts,
        recentActivity: demoData.demoRecentActivity,
        todaysSnapshot: demoData.demoTodaysSnapshot,
        posAnalytics: demoData.demoPOSAnalytics,
        // Also keep raw data just in case
        ...demoData
    };

    return (
        <DemoDataContext.Provider value={value}>
            {children}
        </DemoDataContext.Provider>
    );
};

export const useDemoData = () => {
    const context = useContext(DemoDataContext);
    if (!context) {
        throw new Error('useDemoData must be used within a DemoDataProvider');
    }
    return context;
};

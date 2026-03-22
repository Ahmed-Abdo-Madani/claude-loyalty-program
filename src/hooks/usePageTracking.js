import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { endpoints, publicApi } from '../config/api';

const routeNames = {
  '/': 'Landing',
  '/auth': 'Auth',
  '/admin/login': 'Admin Login',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/branch-manager-login': 'Branch Manager Login',
  '/branch-scanner': 'Branch Scanner',
  '/branch-pos': 'Branch POS',
  '/dashboard': 'Dashboard',
  '/demo': 'Demo Dashboard',
  '/admin/dashboard': 'Admin Dashboard',
  '/test': 'Test',
  '/business/register': 'Business Registration',
  '/subscription/checkout': 'Subscription Checkout',
  '/subscription/checkout/success': 'Subscription Success',
  '/subscription/success': 'Subscription Success',
  '/subscription/payment-callback': 'Payment Callback',
  '/subscription/suspended': 'Suspended Account',
  '/subscription/plans': 'Subscription Plans',
  '/complete-profile': 'Complete Profile',
  '/features': 'Features',
  '/pricing': 'Pricing',
  '/contact': 'Contact',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
  '/refund-policy': 'Refund Policy',
};

export const usePageTracking = () => {
  const location = useLocation();
  const referrerRef = useRef('');

  useEffect(() => {
    let sessionId = sessionStorage.getItem('pv_session_id');
    if (!sessionId) {
      if (window.crypto && window.crypto.randomUUID) {
        sessionId = window.crypto.randomUUID();
      } else {
        // Fallback if randomUUID is not available
        sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      sessionStorage.setItem('pv_session_id', sessionId);
    }
  }, []);

  useEffect(() => {
    const sessionId = sessionStorage.getItem('pv_session_id');
    if (!sessionId) return; // Should be set by the other effect

    const { pathname } = location;
    
    // Attempt to match static routes
    let pageName = routeNames[pathname];
    
    // Fallbacks for dynamic routes
    if (!pageName) {
      if (pathname.startsWith('/join/')) pageName = 'Customer Signup';
      else if (pathname.startsWith('/customer-signup/')) pageName = 'Customer Signup';
      else if (pathname.startsWith('/menu/business/')) pageName = 'Business Menu';
      else if (pathname.startsWith('/menu/branch/')) pageName = 'Branch Menu';
      else pageName = pathname; // fallback to path itself
    }

    const payload = {
      session_id: sessionId,
      page_path: pathname,
      page_name: pageName,
      referrer_path: referrerRef.current || null
    };

    try {
      publicApi.post(endpoints.analyticsPageView, payload).catch(() => {});
    } catch (e) {
      // fire and forget
    }

    referrerRef.current = pathname;
  }, [location]);
};

export default usePageTracking;

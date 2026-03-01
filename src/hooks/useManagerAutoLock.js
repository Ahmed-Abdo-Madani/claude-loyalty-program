import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerLogout } from '../utils/secureAuth';

export const useManagerAutoLock = (timeoutMs = 8 * 60 * 60 * 1000) => {
    const navigate = useNavigate();
    const lastActivity = useRef(Date.now());

    useEffect(() => {
        const resetActivity = () => {
            lastActivity.current = Date.now();
        };

        const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetActivity));

        const intervalId = setInterval(async () => {
            if (Date.now() - lastActivity.current > timeoutMs) {
                await managerLogout();
                navigate('/branch-manager-login', { replace: true });
            }
        }, 60000);

        return () => {
            events.forEach(event => window.removeEventListener(event, resetActivity));
            clearInterval(intervalId);
        };
    }, [navigate, timeoutMs]);
};

export default useManagerAutoLock;

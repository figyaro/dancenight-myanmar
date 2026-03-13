'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ImpersonationHandler() {
    const searchParams = useSearchParams();
    const impersonate = searchParams.get('impersonate');
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (impersonate && !initialized) {
            sessionStorage.setItem('impersonatedId', impersonate);
            // Remove the query param from URL without refreshing
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            setInitialized(true);
            window.location.reload(); // Refresh to apply impersonation IDs to all components
        }
    }, [impersonate, initialized]);

    return null;
}

export default function ImpersonationLogic() {
    return (
        <Suspense fallback={null}>
            <ImpersonationHandler />
        </Suspense>
    );
}

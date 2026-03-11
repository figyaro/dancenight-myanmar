'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import LoadingScreen from './LoadingScreen';

export default function GlobalLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = () => setLoading(true);
        const handleComplete = () => setLoading(false);

        handleStart();
        const timeout = setTimeout(handleComplete, 800);

        return () => clearTimeout(timeout);
    }, [pathname, searchParams]);

    if (!loading) return null;

    return <LoadingScreen />;
}

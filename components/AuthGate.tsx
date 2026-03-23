'use client';
import { useEffect, useState } from 'react';
import AuthPanel from '@/components/AuthPanel';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function AuthGate() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!isSupabaseConfigured || !supabaseClient) return;
        supabaseClient.auth.getUser().then(({ data }) => {
            setIsLoggedIn(Boolean(data.user));
        });
        const { data: subscription } = supabaseClient.auth.onAuthStateChange((event, session) => {
            setIsLoggedIn(Boolean(session?.user));
        });
        return () => {
            subscription.subscription.unsubscribe();
        };
    }, []);

    if (!mounted) return null;
    if (isLoggedIn) return null;

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4">
                <AuthPanel />
            </div>
        </div>
    );
}

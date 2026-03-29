'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const run = async () => {
            if (!supabaseClient) {
                router.replace('/');
                return;
            }
            const { error } = await supabaseClient.auth.exchangeCodeForSession(window.location.href);
            if (error) {
                console.error('[auth] exchangeCodeForSession failed', error);
            }
            router.replace('/');
        };
        run();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center text-sm text-text-muted">
            로그인 처리 중이에요...
        </div>
    );
}

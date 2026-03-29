'use client';
import { useState, useEffect } from 'react';
import Onboarding from './Onboarding';
import AuthPanel from './AuthPanel';
import { supabaseClient } from '@/lib/supabaseClient';

export default function GlobalOnboarding() {
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        supabaseClient?.auth.getUser().then(({ data }) => setIsLoggedIn(Boolean(data.user)));
        const { data: subscription } = supabaseClient!.auth.onAuthStateChange((event, session) => {
            setIsLoggedIn(Boolean(session?.user));
        });
        return () => subscription.subscription.unsubscribe();
    }, []);

    if (!mounted) return null;

    return (
        <>
            <Onboarding onComplete={() => {
                if (!isLoggedIn) setIsAuthOpen(true);
            }} />

            {isAuthOpen && !isLoggedIn && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4 relative">
                        <AuthPanel />
                        <div className="text-center mt-3 border-t border-border-subtle pt-3 text-xs text-text-muted font-medium">
                            나중에 언제든지 프로필 메뉴에서 로그인할 수 있어요.
                        </div>
                        <button
                            onClick={() => setIsAuthOpen(false)}
                            className="mt-3 w-full text-sm font-bold px-4 py-2 rounded-lg border border-border-strong bg-bg-surface-hover"
                        >
                            비회원으로 계속하기
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

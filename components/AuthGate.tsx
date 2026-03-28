'use client';
import { useEffect, useState } from 'react';
import AuthPanel from '@/components/AuthPanel';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthGate() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        setDismissed(localStorage.getItem('doneday-guest-continue') === '1');
        if (!isSupabaseConfigured || !supabaseClient) return;

        const checkOnboarding = async (user: any) => {
            if (!user) return;
            const { data } = await supabaseClient
                .from('user_profiles')
                .select('profile_setup_completed')
                .eq('id', user.id)
                .single();
            if (data && data.profile_setup_completed === false) {
                if (pathname !== '/onboarding') {
                    router.push('/onboarding');
                }
            }
        };
        supabaseClient!.auth.getUser().then(({ data }) => {
            setIsLoggedIn(Boolean(data.user));
            if (data.user) checkOnboarding(data.user);
        });
        const { data: subscription } = supabaseClient!.auth.onAuthStateChange((event, session) => {
            setIsLoggedIn(Boolean(session?.user));
            if (session?.user) checkOnboarding(session.user);
        });
        return () => {
            subscription.subscription.unsubscribe();
        };
    }, [pathname, router]);

    if (!mounted) return null;
    if (pathname === '/onboarding') return null; // Don't show AuthGate on onboarding page itself
    if (isLoggedIn || dismissed) return null;

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4">
                <AuthPanel />
                <button
                    onClick={() => {
                        localStorage.setItem('doneday-guest-continue', '1');
                        setDismissed(true);
                    }}
                    className="mt-3 w-full text-sm font-bold px-4 py-2 rounded-lg border border-border-strong bg-bg-surface-hover"
                >
                    비회원으로 계속하기
                </button>
            </div>
        </div>
    );
}

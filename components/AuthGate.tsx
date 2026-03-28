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
            const { data } = await supabaseClient!
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
    return null;
}

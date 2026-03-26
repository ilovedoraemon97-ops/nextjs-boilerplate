'use client';
import { useEffect, useState } from 'react';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

interface Props {
    onSignedIn?: () => void;
    onSignedOut?: () => void;
}

export default function AuthPanel({ onSignedIn, onSignedOut }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [userLabel, setUserLabel] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);

    useEffect(() => {
        if (!isSupabaseConfigured || !supabaseClient) return;
        supabaseClient.auth.getUser().then(({ data }) => {
            setUserLabel(data.user?.user_metadata?.username ?? data.user?.email ?? null);
        });
        const { data: subscription } = supabaseClient.auth.onAuthStateChange((event, session) => {
            setUserLabel(session?.user?.user_metadata?.username ?? session?.user?.email ?? null);
            if (event === 'SIGNED_IN') onSignedIn?.();
            if (event === 'SIGNED_OUT') onSignedOut?.();
        });
        return () => {
            subscription.subscription.unsubscribe();
        };
    }, [onSignedIn, onSignedOut]);

    if (!isSupabaseConfigured) {
        return (
            <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-sm text-text-muted">
                Supabase 설정이 필요합니다. `.env.local`에 키를 넣어주세요.
            </div>
        );
    }

    const normalizeUsername = (value: string) => value.trim().toLowerCase();
    const isValidUsername = (value: string) => /^[a-z0-9_]{3,20}$/.test(value);
    const usernameToEmail = (value: string) => `${value}@doneday.local`;

    const handleSignIn = async () => {
        if (!supabaseClient) return;
        const normalized = normalizeUsername(username);
        if (!normalized || !password) {
            setError('아이디와 비밀번호를 입력해주세요.');
            return;
        }
        if (!isValidUsername(normalized)) {
            setError('아이디는 영문 소문자, 숫자, _ 만 가능합니다 (3~20자).');
            return;
        }
        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email: usernameToEmail(normalized),
                password,
            });
            if (error) setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        if (!supabaseClient) return;
        const normalized = normalizeUsername(username);
        if (!normalized || !password) {
            setError('아이디와 비밀번호를 입력해주세요.');
            return;
        }
        if (!isValidUsername(normalized)) {
            setError('아이디는 영문 소문자, 숫자, _ 만 가능합니다 (3~20자).');
            return;
        }
        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: usernameToEmail(normalized),
                password,
                options: {
                    data: {
                        username: normalized,
                        recovery_email: recoveryEmail.trim() || null,
                    },
                },
            });
            if (error) {
                setError(error.message);
            } else {
                if (data.session) {
                    setNotice('회원가입이 완료되었습니다. 로그인되었습니다.');
                    if (data.user) {
                        const { error: profileError } = await supabaseClient.from('user_profiles').upsert({
                            id: data.user.id,
                            username: normalized,
                            recovery_email: recoveryEmail.trim() || null,
                        });
                        if (profileError) {
                            console.warn('[auth] failed to upsert user_profiles', profileError);
                        }
                    }
                } else {
                    setNotice('회원가입이 완료되었습니다. 로그인해 주세요.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKakaoSignIn = async () => {
        if (!supabaseClient) return;
        setLoading(true);
        setError(null);
        setNotice(null);
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'profile_nickname,profile_image',
            },
        });
        if (error) setError(error.message);
        setLoading(false);
    };

    const handleSignOut = async () => {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
    };

    return (
        <div className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col gap-3">
            <div className="text-sm font-semibold text-text-base">로그인</div>

            {userLabel ? (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-text-muted">현재 로그인: {userLabel}</div>
                    <button
                        onClick={handleSignOut}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-border-strong bg-bg-surface-hover"
                    >
                        로그아웃
                    </button>
                </div>
            ) : (
                <>
                    <input
                        type="text"
                        placeholder="아이디 (영문/숫자/_)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    {error && <div className="text-xs text-red-500 font-semibold">{error}</div>}
                    {notice && <div className="text-xs text-text-muted font-semibold">{notice}</div>}

                    <div className="flex gap-2">
                        <button
                            onClick={handleSignIn}
                            disabled={loading}
                            className="flex-1 text-sm font-bold px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
                        >
                            로그인
                        </button>
                        <button
                            onClick={() => {
                                setError(null);
                                setNotice(null);
                                setIsSignUpOpen(true);
                            }}
                            disabled={loading}
                            className="flex-1 text-sm font-bold px-4 py-2 rounded-lg border border-border-strong bg-bg-surface-hover disabled:opacity-60"
                        >
                            회원가입
                        </button>
                    </div>

                    <button
                        onClick={handleKakaoSignIn}
                        disabled={loading}
                        className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-[#FEE500] text-[#1A1A1A] disabled:opacity-60"
                    >
                        카카오로 계속하기
                    </button>
                </>
            )}

            {isSignUpOpen && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4 relative">
                        <button
                            onClick={() => setIsSignUpOpen(false)}
                            className="absolute top-3 right-3 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors"
                        >
                            ✕
                        </button>
                        <div className="text-sm font-bold text-text-base mb-3">회원가입</div>
                        <input
                            type="text"
                            placeholder="아이디 (영문/숫자/_)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2"
                        />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2"
                        />
                        <input
                            type="email"
                            placeholder="이메일 (아이디/비번 찾기용, 선택)"
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2"
                        />
                        {error && <div className="text-xs text-red-500 font-semibold mb-2">{error}</div>}
                        {notice && <div className="text-xs text-text-muted font-semibold mb-2">{notice}</div>}
                        <button
                            onClick={handleSignUp}
                            disabled={loading}
                            className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
                        >
                            회원가입 하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

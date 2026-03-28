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
    const [emailSent, setEmailSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [userLabel, setUserLabel] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
    const [recoveryEmailInput, setRecoveryEmailInput] = useState('');

    const resetSignUpState = () => {
        setUsername('');
        setPassword('');
        setRecoveryEmail('');
        setEmailSent(false);
        setOtpCode('');
        setError(null);
        setNotice(null);
    };

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
            // Get email by username via RPC
            const { data: emailData, error: rpcError } = await supabaseClient.rpc('get_email_by_username', {
                p_username: normalized
            });

            if (rpcError || !emailData) {
                setError('존재하지 않는 아이디입니다.');
                setLoading(false);
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: emailData as string,
                password,
            });
            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    setError('이메일 인증이 완료되지 않았습니다. 받은편지함을 확인해주세요.');
                } else {
                    setError('비밀번호가 일치하지 않거나 오류가 발생합니다. (아이디/비밀번호 확인)');
                    console.error('[auth] signInWithPassword error:', error);
                }
            } else if (data.session) {
                // Determine if onboarding is complete and redirect
                const { data: profile } = await supabaseClient
                    .from('user_profiles')
                    .select('profile_setup_completed')
                    .eq('id', data.user.id)
                    .single();

                if (profile?.profile_setup_completed === false) {
                    window.location.href = '/onboarding';
                } else {
                    window.location.reload();
                }
            }
        } catch (err: any) {
            setError(err.message || '네트워크 오류가 발생했습니다. (Failed to fetch)');
            console.error('[auth] signin error', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestVerification = async () => {
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
        const emailValue = recoveryEmail.trim();
        if (!emailValue || !emailValue.includes('@')) {
            setError('유효한 이메일을 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            // 1. Check if username is already taken
            const { data: isAvailable, error: checkError } = await supabaseClient.rpc('check_username_available', {
                p_username: normalized
            });

            if (checkError) {
                setError('아이디 중복 확인 중 오류가 발생했습니다.');
                setLoading(false);
                return;
            }

            if (!isAvailable) {
                setError('이미 사용중인 아이디입니다. 다른 아이디를 입력해주세요.');
                setLoading(false);
                return;
            }

            // 1.5 Check if email is already taken
            const { data: isEmailAvailable, error: emailCheckError } = await supabaseClient.rpc('check_email_available', {
                p_email: emailValue
            });

            if (emailCheckError) {
                setError('이메일 중복 확인 중 오류가 발생했습니다.');
                setLoading(false);
                return;
            }

            if (!isEmailAvailable) {
                setError('이미 가입된 이메일이에요. 로그인 화면에서 아이디/비밀번호 찾기를 진행해보세요.');
                setLoading(false);
                return;
            }

            // 2. Proceed with Supabase Auth Signup
            const { data, error } = await supabaseClient.auth.signUp({
                email: emailValue,
                password,
                options: {
                    data: {
                        username: normalized,
                        recovery_email: emailValue,
                    },
                },
            });
            if (error) {
                setError(error.message);
                setLoading(false);
            } else {
                setEmailSent(true);
                setNotice('인증메일 발송! 메일이 안오면 스팸메일함을 확인해주세요.');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || '네트워크 오류가 발생했습니다.');
            console.error('[auth] signup error', err);
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setError('올바른 6자리 인증번호를 입력해주세요.');
            return;
        }
        setVerifying(true);
        setError(null);
        const normalized = normalizeUsername(username);
        const emailValue = recoveryEmail.trim();

        try {
            const { data, error } = await supabaseClient!.auth.verifyOtp({
                email: emailValue,
                token: otpCode.trim(),
                type: 'signup'
            });

            if (error) {
                setError('인증 번호가 올바르지 않거나 만료되었습니다.');
            } else if (data.user) {
                // Upsert user profile
                const { error: profileError } = await supabaseClient!.from('user_profiles').upsert({
                    id: data.user.id,
                    username: normalized,
                    recovery_email: emailValue,
                    profile_setup_completed: false
                });
                if (profileError) {
                    console.warn('[auth] failed to upsert user_profiles', profileError);
                }

                // Finish
                window.location.href = '/onboarding';
            }
        } catch (err: any) {
            setError(err.message || '인증 오류가 발생했습니다.');
            console.error('[auth] verifyOtp error', err);
        } finally {
            setVerifying(false);
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
                                resetSignUpState();
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
                    <div className="pt-2 text-center text-xs">
                        <button
                            onClick={() => {
                                setError(null);
                                setNotice(null);
                                setRecoveryNotice(null);
                                setRecoveryEmailInput('');
                                setIsRecoveryOpen(true);
                            }}
                            className="text-text-muted hover:text-text-base underline"
                        >
                            아이디 / 비밀번호 찾기
                        </button>
                    </div>
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
                            disabled={emailSent || loading}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2 disabled:opacity-50"
                        />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            disabled={emailSent || loading}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2 disabled:opacity-50"
                        />

                        <div className="flex space-x-2 mb-2">
                            <input
                                type="email"
                                placeholder="이메일 입력"
                                value={recoveryEmail}
                                disabled={emailSent || loading}
                                onChange={(e) => setRecoveryEmail(e.target.value)}
                                className="flex-1 bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                            />
                            <button
                                onClick={handleRequestVerification}
                                disabled={loading || emailSent}
                                className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
                            >
                                {loading ? '발송중...' : (emailSent ? '발송완료' : '인증하기')}
                            </button>
                        </div>

                        {emailSent && (
                            <div className="flex space-x-2 mb-2 animate-fade-in mt-3">
                                <input
                                    type="text"
                                    placeholder="인증번호 6자리"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="flex-1 bg-bg-base border border-border-strong rounded-lg px-3 py-2 text-sm text-text-base font-bold tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={verifying}
                                    className="bg-accent text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
                                >
                                    {verifying ? '확인중...' : '가입 완료하기'}
                                </button>
                            </div>
                        )}

                        {error && <div className="text-xs text-red-500 font-semibold mb-2">{error}</div>}
                        {notice && <div className="text-xs text-text-muted font-semibold mb-2">{notice}</div>}

                        {emailSent && (
                            <div className="text-xs font-semibold text-text-muted text-center pt-2 border-t border-border-subtle">
                                인증번호가 오지 않나요?{' '}
                                <button
                                    className="text-text-base hover:text-primary underline font-bold"
                                    onClick={handleRequestVerification}
                                >
                                    다시 보내기
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isRecoveryOpen && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4 relative">
                        <button
                            onClick={() => setIsRecoveryOpen(false)}
                            className="absolute top-3 right-3 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors"
                        >
                            ✕
                        </button>
                        <div className="text-sm font-bold text-text-base mb-3">계정 찾기</div>
                        <input
                            type="email"
                            placeholder="가입 시 입력한 이메일"
                            value={recoveryEmailInput}
                            onChange={(e) => setRecoveryEmailInput(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
                        />
                        {error && <div className="text-xs text-red-500 font-semibold mb-2">{error}</div>}
                        {recoveryNotice && <div className="text-xs text-primary font-semibold mb-2 whitespace-pre-line leading-relaxed">{recoveryNotice}</div>}
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    if (!recoveryEmailInput.includes('@')) { setError('이메일을 입력해주세요.'); return; }
                                    setLoading(true); setError(null); setRecoveryNotice(null);
                                    const { data, error: rpcError } = await supabaseClient!.rpc('get_username_by_email', { p_email: recoveryEmailInput.trim() });
                                    setLoading(false);
                                    if (rpcError || !data) {
                                        setError('해당 이메일로 가입된 계정을 찾을 수 없습니다.');
                                    } else {
                                        setRecoveryNotice(`회원님의 아이디는 [ ${data} ] 입니다.\n비밀번호를 잊으셨다면 우측 버튼을 눌러 초기화하세요.`);
                                    }
                                }}
                                disabled={loading}
                                className="flex-1 text-xs font-bold px-3 py-2 rounded-lg border border-border-strong bg-bg-surface-hover disabled:opacity-60"
                            >
                                아이디 찾기
                            </button>
                            <button
                                onClick={async () => {
                                    if (!recoveryEmailInput.includes('@')) { setError('이메일을 입력해주세요.'); return; }
                                    setLoading(true); setError(null); setRecoveryNotice(null);
                                    const { error: resetError } = await supabaseClient!.auth.resetPasswordForEmail(recoveryEmailInput.trim(), {
                                        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
                                    });
                                    setLoading(false);
                                    if (resetError) {
                                        setError('이메일 발송 중 오류가 발생했습니다.');
                                    } else {
                                        setRecoveryNotice('이메일로 비밀번호 재설정 링크를 발송했습니다. 메일함을 확인해주세요.');
                                    }
                                }}
                                disabled={loading}
                                className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
                            >
                                비밀번호 재설정
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

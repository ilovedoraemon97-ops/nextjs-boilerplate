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
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
    const [recoveryEmailInput, setRecoveryEmailInput] = useState('');

    const [isIdChecked, setIsIdChecked] = useState(false);
    const [idCheckMessage, setIdCheckMessage] = useState<string | null>(null);
    const [isIdChecking, setIsIdChecking] = useState(false);

    const resetSignUpState = () => {
        setUsername('');
        setPassword('');
        setRecoveryEmail('');
        setError(null);
        setNotice(null);
        setIsIdChecked(false);
        setIdCheckMessage(null);
        setIsIdChecking(false);
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
                Supabase 설정이 필요해요. `.env.local`에 키를 넣어주세요.
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
            setError('아이디와 비밀번호를 입력해 주세요.');
            return;
        }
        if (!isValidUsername(normalized)) {
            setError('아이디는 영문 소문자/숫자/_만 가능해요. (3~20자)');
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
                setError('존재하지 않는 아이디예요.');
                setLoading(false);
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: emailData as string,
                password,
            });
            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    setError('이메일 인증이 아직 끝나지 않았어요. 메일함을 확인해 주세요.');
                } else {
                    setError('아이디 또는 비밀번호가 맞지 않아요.');
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

    const handleSignUp = async () => {
        if (!supabaseClient) return;
        const normalized = normalizeUsername(username);
        if (!normalized || !password) {
            setError('아이디와 비밀번호를 입력해 주세요.');
            return;
        }
        if (!isValidUsername(normalized)) {
            setError('아이디는 영문 소문자/숫자/_만 가능해요. (3~20자)');
            return;
        }
        if (!isIdChecked) {
            setError('아이디 중복확인을 먼저 해주세요.');
            return;
        }
        const emailValue = recoveryEmail.trim();
        if (!emailValue || !emailValue.includes('@')) {
            setError('유효한 이메일을 입력해 주세요.');
            return;
        }

        setLoading(true);
        setError(null);
        setNotice(null);
        try {
            // 1.5 Check if email is already taken
            const { data: isEmailAvailable, error: emailCheckError } = await supabaseClient.rpc('check_email_available', {
                p_email: emailValue
            });

            if (emailCheckError) {
                setError('이메일 중복 확인 중 문제가 있었어요. 잠시 후 다시 시도해 주세요.');
                setLoading(false);
                return;
            }

            if (!isEmailAvailable) {
                setError('이미 가입된 이메일이에요. 로그인 화면에서 아이디/비밀번호 찾기를 진행해 주세요.');
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
            } else if (data.session) {
                // Confirm email is OFF. Session granted.
                // Upsert user profile
                const { error: profileError } = await supabaseClient.from('user_profiles').upsert({
                    id: data.session.user.id,
                    username: normalized,
                    recovery_email: emailValue,
                    profile_setup_completed: false
                });
                if (profileError) {
                    console.warn('[auth] failed to upsert user_profiles', profileError);
                }
                window.location.href = '/onboarding';
            } else {
                setError('가입은 완료됐어요. 자동 로그인을 위해 Supabase에서 이메일 인증을 꺼주세요.');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || '네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
            console.error('[auth] signup error', err);
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
                        <div className="flex space-x-2 mb-2">
                            <input
                                type="text"
                                placeholder="아이디 (영문/숫자/_)"
                                value={username}
                                disabled={loading || isIdChecking}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    setIsIdChecked(false);
                                    setIdCheckMessage(null);
                                }}
                                className="flex-1 bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                            />
                            <button
                            onClick={async () => {
                                    const normalized = normalizeUsername(username);
                                    if (!isValidUsername(normalized)) {
                                        setIdCheckMessage('영문 소문자/숫자/_만 가능해요. (3~20자)');
                                        return;
                                    }
                                    setIsIdChecking(true);
                                    setIdCheckMessage(null);
                                    const { data: isAvailable, error: checkError } = await supabaseClient!.rpc('check_username_available', { p_username: normalized });
                                    setIsIdChecking(false);
                                    if (checkError) {
                                        setIdCheckMessage('중복 확인 중 문제가 있었어요. 잠시 후 다시 시도해 주세요.');
                                        setIsIdChecked(false);
                                    } else if (isAvailable) {
                                        setIdCheckMessage('사용 가능한 아이디예요.');
                                        setIsIdChecked(true);
                                    } else {
                                        setIdCheckMessage('이미 사용 중인 아이디예요.');
                                        setIsIdChecked(false);
                                    }
                                }}
                                disabled={loading || isIdChecking || !username}
                                className="bg-bg-surface-hover border border-border-strong text-text-base text-xs font-bold px-3 py-2 rounded-lg hover:bg-border-subtle transition-colors whitespace-nowrap disabled:opacity-50"
                            >
                                {isIdChecking ? '확인중...' : '중복확인'}
                            </button>
                        </div>
                        {idCheckMessage && (
                            <div className={`text-xs font-semibold mb-2 ${isIdChecked ? 'text-[#00C853]' : 'text-red-500'}`}>
                                {idCheckMessage}
                            </div>
                        )}
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            disabled={loading}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2 disabled:opacity-50"
                        />

                        <input
                            type="email"
                            placeholder="이메일 입력 (아이디/비번 찾기용)"
                            value={recoveryEmail}
                            disabled={loading}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2 disabled:opacity-50"
                        />

                        {error && <div className="text-xs text-red-500 font-semibold mb-2">{error}</div>}
                        {notice && <div className="text-xs text-text-muted font-semibold mb-2">{notice}</div>}

                        <button
                            onClick={handleSignUp}
                            disabled={loading || !username || !password || !recoveryEmail || !isIdChecked}
                            className="w-full bg-primary text-white text-sm font-bold mt-2 py-3 rounded-lg hover:bg-opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? '가입중...' : '가입 완료하기'}
                        </button>
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
                                    if (!recoveryEmailInput.includes('@')) { setError('이메일을 입력해 주세요.'); return; }
                                    setLoading(true); setError(null); setRecoveryNotice(null);
                                    const { data, error: rpcError } = await supabaseClient!.rpc('get_username_by_email', { p_email: recoveryEmailInput.trim() });
                                    setLoading(false);
                                    if (rpcError || !data) {
                                        setError('해당 이메일로 가입된 계정을 찾을 수 없어요.');
                                    } else {
                                        setRecoveryNotice(`회원님의 아이디는 [ ${data} ] 입니다.\n비밀번호를 잊으셨다면 우측 버튼으로 초기화해 주세요.`);
                                    }
                                }}
                                disabled={loading}
                                className="flex-1 text-xs font-bold px-3 py-2 rounded-lg border border-border-strong bg-bg-surface-hover disabled:opacity-60"
                            >
                                아이디 찾기
                            </button>
                            <button
                                onClick={async () => {
                                    if (!recoveryEmailInput.includes('@')) { setError('이메일을 입력해 주세요.'); return; }
                                    setLoading(true); setError(null); setRecoveryNotice(null);
                                    const { error: resetError } = await supabaseClient!.auth.resetPasswordForEmail(recoveryEmailInput.trim(), {
                                        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
                                    });
                                    setLoading(false);
                                    if (resetError) {
                                        setError('이메일 발송 중 문제가 있었어요.');
                                    } else {
                                        setRecoveryNotice('이메일로 비밀번호 재설정 링크를 보냈어요. 메일함을 확인해 주세요.');
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

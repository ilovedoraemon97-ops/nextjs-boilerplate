'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { Camera, RefreshCw } from 'lucide-react';

const ADJECTIVES = [
    "행복한", "슬픈", "즐거운", "화난", "배고픈", "졸린", "피곤한", "열정적인",
    "차분한", "활기찬", "똑똑한", "용감한", "수줍은", "귀여운", "멋진",
    "아름다운", "빛나는", "어두운", "조용한", "시끄러운"
];

const NOUNS = [
    "사과", "바나나", "고양이", "강아지", "호랑이",
    "사자", "토끼", "거북이", "새", "물고기"
];

export default function OnboardingPage() {
    const router = useRouter();
    const [nickname, setNickname] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            if (!supabaseClient) return;
            const { data } = await supabaseClient.auth.getUser();
            if (!data.user) {
                router.push('/');
            } else {
                setUser(data.user);
                // Check if already completed
                const { data: profile } = await supabaseClient
                    .from('user_profiles')
                    .select('profile_setup_completed')
                    .eq('id', data.user.id)
                    .single();
                if (profile?.profile_setup_completed) {
                    router.push('/');
                }
            }
        };
        checkUser();
    }, [router]);

    const generateRandomNickname = () => {
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        const num = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${adj}${noun}${num}`;
    };

    const handleRandomize = () => {
        setNickname(generateRandomNickname());
        setError(null);
    };

    const handleSubmit = async () => {
        if (!supabaseClient || !user) return;

        // Auto-generate if left blank
        let finalNickname = nickname.trim();
        if (!finalNickname) {
            finalNickname = generateRandomNickname();
            setNickname(finalNickname);
        }

        // Extremely basic profanity filter example (can be expanded)
        const blockList = ['바보', '멍청이', '개새끼', '씨발', '병신'];
        if (blockList.some(word => finalNickname.includes(word))) {
            setError('사용할 수 없는 단어가 포함되어 있습니다.');
            return;
        }

        if (statusMessage.length > 50) {
            setError('상태 메시지는 최대 50자까지 가능합니다.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Check uniqueness explicitly to show friendly error
            const { data: existing } = await supabaseClient
                .from('user_profiles')
                .select('id')
                .eq('nickname', finalNickname)
                .neq('id', user.id)
                .single();

            if (existing) {
                setError('이미 사용중인 닉네임입니다. 다른 닉네임을 입력해주세요.');
                setLoading(false);
                return;
            }

            // Update profile
            const { error: updateError } = await supabaseClient
                .from('user_profiles')
                .update({
                    nickname: finalNickname,
                    status_message: statusMessage.trim() || null,
                    profile_setup_completed: true
                })
                .eq('id', user.id);

            if (updateError) {
                // If unique constraint fails directly without triggering the select above (race condition)
                if (updateError.code === '23505') {
                    setError('이미 사용중인 닉네임입니다.');
                } else {
                    setError('프로필 저장 중 오류가 발생했습니다.');
                }
                setLoading(false);
                return;
            }

            // Update user metadata in auth for quick access
            await supabaseClient.auth.updateUser({
                data: {
                    nickname: finalNickname
                }
            });

            // Redirect
            router.push('/');
        } catch (err) {
            console.error(err);
            setError('네트워크 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    if (!user) {
        return <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">로딩중...</div>;
    }

    return (
        <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-bg-surface border border-border-strong rounded-3xl p-6 shadow-sm">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-black text-text-base mb-1">프로필 설정</h1>
                    <p className="text-sm text-text-muted font-medium">거의 다 왔어요! 당신을 표현해주세요.</p>
                </div>

                <div className="space-y-6">
                    {/* Avatar Selection (Mock) */}
                    <div className="flex flex-col items-center">
                        <div className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
                            <span className="text-4xl font-black text-primary capitalize">
                                {nickname ? nickname.charAt(0) : '?'}
                            </span>
                            <div className="absolute bottom-0 right-0 w-8 h-8 bg-bg-surface border border-border-strong rounded-full flex items-center justify-center shadow-sm">
                                <Camera className="w-4 h-4 text-text-base" />
                            </div>
                        </div>
                        <span className="text-xs text-text-muted mt-2 font-medium bg-bg-surface-hover px-2 py-1 rounded-md">사진 등록 (준비중)</span>
                    </div>

                    {/* Nickname Input */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-bold text-text-base">닉네임</label>
                            <button
                                onClick={handleRandomize}
                                className="text-xs font-bold text-accent hover:text-accent flex items-center space-x-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>랜덤 닉네임</span>
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="입력 안 할시 자동 생성"
                            value={nickname}
                            onChange={(e) => {
                                setNickname(e.target.value);
                                setError(null);
                            }}
                            className="w-full bg-bg-base border border-border-subtle rounded-xl px-3 py-3 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                        />
                    </div>

                    {/* Status Message */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-bold text-text-base">상태 메시지</label>
                            <span className="text-xs text-text-muted font-medium">{statusMessage.length}/50</span>
                        </div>
                        <textarea
                            placeholder="오늘의 다짐을 적어보세요 (선택)"
                            value={statusMessage}
                            maxLength={50}
                            onChange={(e) => setStatusMessage(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-xl px-3 py-3 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow h-24 resize-none"
                        />
                    </div>

                    {error && <div className="text-sm font-bold text-red-500 bg-red-500/10 p-3 rounded-xl">{error}</div>}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? '저장중...' : 'DoneDay 시작하기'}
                    </button>
                </div>
            </div>
        </div>
    );
}

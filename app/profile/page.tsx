'use client';
import { useState, useEffect } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import { BarChart3, Settings, Trophy, Zap } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';

export default function ProfilePage() {
    const stats = useDoneDayStore(state => state.stats);
    const settings = useDoneDayStore(state => state.settings);
    const updateSettings = useDoneDayStore(state => state.updateSettings);
    const [userName, setUserName] = useState<string>('비회원');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            if (!supabaseClient) return;
            const { data } = await supabaseClient.auth.getUser();
            if (data.user) {
                setIsLoggedIn(true);
                // Default to nickname if set during onboarding, else username, else email
                const displayName = data.user.user_metadata?.nickname || data.user.user_metadata?.username || data.user.email?.split('@')[0] || '사용자';
                setUserName(displayName);
            }
        };
        fetchUser();
    }, []);

    const handleAuthAction = async () => {
        if (!supabaseClient) return;
        if (isLoggedIn) {
            const confirmLogout = window.confirm('로그아웃 하시겠습니까?');
            if (confirmLogout) {
                await supabaseClient.auth.signOut();
                localStorage.setItem('doneday-guest-continue', '1');
                window.location.reload();
            }
        } else {
            localStorage.removeItem('doneday-guest-continue');
            window.location.reload(); // Reloads triggering AuthGate
        }
    };

    return (
        <div className="flex flex-col min-h-full pb-24">
            <Header />

            <div className="p-4 space-y-6">
                {/* User Card */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 text-center shadow-sm relative">
                    <button className="absolute top-4 right-4 text-text-muted hover:text-text-base">
                        <Settings className="w-5 h-5" />
                    </button>

                    <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4 border-2 border-primary/20">
                        <span className="text-3xl font-black text-primary capitalize">
                            {userName.charAt(0)}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold">{userName}</h2>
                    <p className="text-text-muted text-sm font-medium mt-1 mb-4">Level {stats.level} 갓생러</p>

                    <div className="bg-bg-surface-hover rounded-xl p-3 flex justify-between items-center text-left">
                        <div>
                            <div className="text-xs text-text-muted font-bold mb-1">다음 레벨까지</div>
                            <div className="flex space-x-1">
                                <div className="w-12 h-1.5 rounded-full bg-primary" />
                                <div className="w-12 h-1.5 rounded-full bg-primary" />
                                <div className="w-12 h-1.5 rounded-full bg-border-strong" />
                            </div>
                        </div>
                        <div className="text-sm font-black text-primary">300 XP</div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center space-x-2 mb-2 text-text-muted">
                            <Zap className="w-4 h-4 text-accent" />
                            <span className="text-xs font-bold">최근 스트릭</span>
                        </div>
                        <div className="text-2xl font-black">{stats.streak}일</div>
                        <div className="text-xs text-text-muted mt-1">+2일 더하면 최고 기록!</div>
                    </div>

                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center space-x-2 mb-2 text-text-muted">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold">총 갓생 시간</span>
                        </div>
                        <div className="text-2xl font-black">{stats.totalGrowthHours.toFixed(1)}h</div>
                        <div className="text-xs text-text-muted mt-1">상위 15% 진입</div>
                    </div>
                </div>

                {/* Settings Section */}
                <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-sm mb-4 flex items-center text-text-base tracking-tight">
                        <Settings className="w-4 h-4 mr-1.5 text-text-muted" /> 활동 시간 설정
                    </h3>
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-text-muted">시작 시간 (기상)</span>
                            <select
                                value={settings.activeStartHour}
                                onChange={(e) => updateSettings({ activeStartHour: Number(e.target.value) })}
                                className="bg-bg-base border border-border-strong rounded-lg p-2 text-xs font-bold w-24 outline-none"
                            >
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <option key={`start-${i}`} value={i}>{String(i).padStart(2, '0')}:00</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-text-muted">종료 시간 (취침)</span>
                            <select
                                value={settings.activeEndHour}
                                onChange={(e) => updateSettings({ activeEndHour: Number(e.target.value) })}
                                className="bg-bg-base border border-border-strong rounded-lg p-2 text-xs font-bold w-24 outline-none"
                            >
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <option key={`end-${i}`} value={i}>{String(i).padStart(2, '0')}:00</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-text-muted">달력 시간 단위</span>
                            <select
                                value={settings.timeAxisInterval || 3}
                                onChange={(e) => updateSettings({ timeAxisInterval: Number(e.target.value) as 1 | 3 })}
                                className="bg-bg-base border border-border-strong rounded-lg p-2 text-xs font-bold w-24 outline-none"
                            >
                                <option value={1}>1시간 간격</option>
                                <option value={3}>3시간 간격</option>
                            </select>
                        </div>
                        <p className="text-[10.5px] sm:text-xs text-text-muted mt-1 font-medium leading-relaxed">지정한 시간대만 달력에 표시되어 세로 공간을 효율적으로 사용합니다.</p>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-border-subtle rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <Trophy className="w-5 h-5 text-accent" />
                                <h3 className="font-bold text-lg">주간 갓생 랭킹</h3>
                            </div>
                            <p className="text-sm text-text-muted font-medium mb-4">
                                친구들 중 3위를 달리고 있어요!
                            </p>
                        </div>
                        <div className="text-3xl font-black text-accent mt-2">#3</div>
                    </div>
                    <button className="w-full bg-bg-surface py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95">
                        랭킹 보러가기
                    </button>
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleAuthAction}
                        className="w-full py-3 rounded-2xl text-sm font-bold border border-border-strong text-text-muted hover:bg-bg-surface-hover transition-colors"
                    >
                        {isLoggedIn ? '로그아웃' : '로그인 및 회원가입'}
                    </button>
                </div>
            </div>
        </div>
    );
}

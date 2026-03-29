'use client';
import { useState, useEffect, useRef } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import { BarChart3, Settings, Trophy, Zap } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import AuthPanel from '@/components/AuthPanel';

export default function ProfilePage() {
    const stats = useDoneDayStore(state => state.stats);
    const settings = useDoneDayStore(state => state.settings);
    const updateSettings = useDoneDayStore(state => state.updateSettings);
    const [userName, setUserName] = useState<string>('비회원');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [profile, setProfile] = useState({
        nickname: '',
        statusMessage: '',
        avatarUrl: '',
    });
    const [editNickname, setEditNickname] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const albumInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (!supabaseClient) return;
            const { data } = await supabaseClient.auth.getUser();
            if (data.user) {
                setIsLoggedIn(true);
                setUserId(data.user.id);
                // Default to nickname if set during onboarding, else username, else email
                const { data: profileData } = await supabaseClient
                    .from('user_profiles')
                    .select('nickname,status_message,avatar_url')
                    .eq('id', data.user.id)
                    .single();
                const displayName = profileData?.nickname || data.user.user_metadata?.nickname || data.user.user_metadata?.username || data.user.email?.split('@')[0] || '사용자';
                setUserName(displayName);
                setProfile({
                    nickname: profileData?.nickname || displayName,
                    statusMessage: profileData?.status_message || '',
                    avatarUrl: profileData?.avatar_url || '',
                });
            } else {
                const guestRaw = localStorage.getItem('doneday-guest-profile');
                if (guestRaw) {
                    const guest = JSON.parse(guestRaw);
                    setProfile({
                        nickname: guest.nickname || '비회원',
                        statusMessage: guest.statusMessage || '',
                        avatarUrl: guest.avatarUrl || '',
                    });
                    setUserName(guest.nickname || '비회원');
                }
            }
        };
        fetchUser();
    }, []);

    const handleAuthAction = async () => {
        if (!supabaseClient) return;
        if (isLoggedIn) {
            const confirmLogout = window.confirm('로그아웃할까요?');
            if (confirmLogout) {
                await supabaseClient.auth.signOut();
                localStorage.setItem('doneday-guest-continue', '1');
                window.location.reload();
            }
        } else {
            setIsAuthOpen(true);
        }
    };

    const openEditProfile = () => {
        setEditNickname(profile.nickname || userName);
        setEditStatus(profile.statusMessage || '');
        setEditAvatarUrl(profile.avatarUrl || '');
        setIsEditOpen(true);
    };

    const handleProfileSave = async () => {
        const nextNickname = editNickname.trim() || '비회원';
        const nextStatus = editStatus.trim();
        const nextAvatar = editAvatarUrl;
        if (isLoggedIn && supabaseClient && userId) {
            await supabaseClient
                .from('user_profiles')
                .update({
                    nickname: nextNickname,
                    status_message: nextStatus || null,
                    avatar_url: nextAvatar || null,
                })
                .eq('id', userId);
            await supabaseClient.auth.updateUser({ data: { nickname: nextNickname } });
        } else {
            localStorage.setItem('doneday-guest-profile', JSON.stringify({
                nickname: nextNickname,
                statusMessage: nextStatus,
                avatarUrl: nextAvatar,
            }));
        }
        setProfile({
            nickname: nextNickname,
            statusMessage: nextStatus,
            avatarUrl: nextAvatar,
        });
        setUserName(nextNickname);
        setIsEditOpen(false);
    };

    const handleAvatarFile = (file?: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setEditAvatarUrl(String(reader.result || ''));
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col min-h-full pb-24">
            <Header />

            <div className="p-4 space-y-6">
                {/* User Card */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 text-center shadow-sm relative">
                    <button onClick={openEditProfile} className="absolute top-4 right-4 text-text-muted hover:text-text-base">
                        <Settings className="w-5 h-5" />
                    </button>

                    <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4 border-2 border-primary/20 overflow-hidden">
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt="프로필 사진" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-black text-primary capitalize">
                                {userName.charAt(0)}
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl font-bold">{userName}</h2>
                    <p className="text-text-muted text-sm font-medium mt-1 mb-4">
                        {profile.statusMessage ? profile.statusMessage : `Level ${stats.level} 갓생러`}
                    </p>

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

            {isAuthOpen && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4">
                        <AuthPanel
                            onSignedIn={() => {
                                setIsAuthOpen(false);
                                window.location.reload();
                            }}
                        />
                        <button
                            onClick={() => setIsAuthOpen(false)}
                            className="mt-3 w-full text-sm font-bold px-4 py-2 rounded-lg border border-border-strong bg-bg-surface-hover"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {isEditOpen && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4">
                        <div className="text-sm font-bold text-text-base mb-3">프로필 수정</div>
                        <div className="flex flex-col items-center mb-4">
                            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                                {editAvatarUrl ? (
                                    <img src={editAvatarUrl} alt="프로필 사진" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-black text-primary capitalize">
                                        {(editNickname || userName).charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="text-xs font-bold px-3 py-2 rounded-lg border border-border-strong bg-bg-surface-hover"
                                >
                                    사진 촬영
                                </button>
                                <button
                                    onClick={() => albumInputRef.current?.click()}
                                    className="text-xs font-bold px-3 py-2 rounded-lg border border-border-strong bg-bg-surface-hover"
                                >
                                    앨범에서 선택
                                </button>
                            </div>
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                            />
                            <input
                                ref={albumInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                            />
                        </div>

                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="닉네임"
                                value={editNickname}
                                onChange={(e) => setEditNickname(e.target.value)}
                                className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <textarea
                                placeholder="상태 메시지 (선택)"
                                value={editStatus}
                                maxLength={50}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-primary/40 h-24 resize-none"
                            />
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="flex-1 text-sm font-bold px-4 py-2 rounded-lg border border-border-strong bg-bg-surface-hover"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleProfileSave}
                                className="flex-1 text-sm font-bold px-4 py-2 rounded-lg bg-primary text-white"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

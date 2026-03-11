'use client';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import { BarChart3, Settings, Trophy, Zap } from 'lucide-react';

export default function ProfilePage() {
    const stats = useDoneDayStore(state => state.stats);

    return (
        <div className="flex flex-col min-h-full pb-24">
            <Header />

            <div className="p-4 space-y-6">
                {/* User Card */}
                <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 text-center shadow-sm relative">
                    <button className="absolute top-4 right-4 text-text-muted hover:text-text-base">
                        <Settings className="w-5 h-5" />
                    </button>

                    <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                        <span className="text-3xl font-black text-primary">K</span>
                    </div>
                    <h2 className="text-xl font-bold">Kayoung</h2>
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
            </div>
        </div>
    );
}

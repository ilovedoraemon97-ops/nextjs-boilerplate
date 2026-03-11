import { GrowthBlock } from '@/types';
import { X, Share2, Award } from 'lucide-react';
import { useDoneDayStore } from '@/store/useDoneDayStore';

interface Props {
    block?: GrowthBlock;
    isOpen: boolean;
    onClose: () => void;
}

export default function AchievementCard({ block, isOpen, onClose }: Props) {
    const stats = useDoneDayStore(state => state.stats);

    if (!isOpen || !block) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-pop relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors z-10 bg-white/50 backdrop-blur-md">
                    <X className="w-5 h-5" />
                </button>

                <div className="bg-gradient-to-br from-primary to-accent p-8 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner">
                            <Award className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-black mb-1">TODAY DONE</h2>
                        <p className="font-medium opacity-90">오늘의 갓생 인증</p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-bg-base rounded-2xl p-4 mb-6 border border-border-subtle">
                        <h3 className="text-sm font-bold text-text-muted mb-3 uppercase tracking-wider">Completed Block</h3>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-lg text-text-base">{block.title}</span>
                            <span className="font-bold text-primary">{Math.floor(block.elapsedMinutes)}분</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-bg-base rounded-xl p-3 border border-border-subtle text-center">
                            <div className="text-xs font-bold text-text-muted mb-1">Total Hours</div>
                            <div className="font-black text-xl text-text-base">{stats.totalGrowthHours.toFixed(1)}h</div>
                        </div>
                        <div className="bg-bg-base rounded-xl p-3 border border-border-subtle text-center">
                            <div className="text-xs font-bold text-text-muted mb-1">Current Streak</div>
                            <div className="font-black text-xl text-accent flex items-center justify-center">
                                <span className="mr-1">🔥</span> {stats.streak}일
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-bg-surface-hover border border-border-subtle text-text-base rounded-xl py-3.5 font-bold transition-all active:scale-[0.98]"
                        >
                            닫기
                        </button>
                        <button className="flex-[2] bg-secondary text-white rounded-xl py-3.5 font-bold flex items-center justify-center transition-all active:scale-[0.98] shadow-lg shadow-secondary/20">
                            <Share2 className="w-5 h-5 mr-2" />
                            인스타그램 공유
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

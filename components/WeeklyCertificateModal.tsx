import { WeeklyGoalSummary } from '@/lib/goalProgress';
import { Goal } from '@/types';
import { X, Award } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    summary: WeeklyGoalSummary | null;
    goals: Goal[];
}

export default function WeeklyCertificateModal({ isOpen, onClose, summary, goals }: Props) {
    if (!isOpen || !summary) return null;

    const { totalGoals, completedGoals, pendingGoals, startDateStr, endDateStr } = summary;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-2xl shadow-lg border border-border-strong overflow-hidden animate-pop relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors z-10 bg-white/80 backdrop-blur-md">
                    <X className="w-5 h-5" />
                </button>

                <div className="bg-primary p-8 text-center text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Award className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-black mb-1">WEEKLY DONE</h2>
                        <p className="font-medium text-white/80">이번 주 갓생 인증서</p>
                        <p className="text-xs text-white/80 mt-2 font-semibold">
                            {startDateStr} ~ {endDateStr}
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-bg-base rounded-2xl p-4 mb-6 border border-border-subtle text-center">
                        <h3 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Weekly Summary</h3>
                        <p className="text-sm font-semibold text-text-base">
                            총 {totalGoals}개의 목표 중 {completedGoals}개 달성 완료, {pendingGoals}개 미달성
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-bg-base rounded-xl p-3 border border-border-subtle text-center">
                            <div className="text-[10px] font-bold text-text-muted mb-1">Total</div>
                            <div className="font-black text-lg text-text-base">{totalGoals}</div>
                        </div>
                        <div className="bg-bg-base rounded-xl p-3 border border-border-subtle text-center">
                            <div className="text-[10px] font-bold text-text-muted mb-1">Done</div>
                            <div className="font-black text-lg text-growth-hover">{completedGoals}</div>
                        </div>
                        <div className="bg-bg-base rounded-xl p-3 border border-border-subtle text-center">
                            <div className="text-[10px] font-bold text-text-muted mb-1">Left</div>
                            <div className="font-black text-lg text-text-muted">{pendingGoals}</div>
                        </div>
                    </div>

                    {goals.length > 0 && (
                        <div className="bg-bg-base rounded-2xl p-4 mb-6 border border-border-subtle">
                            <h3 className="text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">Goals</h3>
                            <div className="space-y-2">
                                {goals.map((goal) => {
                                    const doneMins = summary.progressByGoalId[goal.id] || 0;
                                    const percent = Math.min(100, Math.round((doneMins / goal.targetMinutesPerWeek) * 100) || 0);
                                    const isDone = percent >= 100;
                                    return (
                                        <div key={goal.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center min-w-0">
                                                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${goal.color}`} />
                                                <span className="font-semibold text-text-base truncate">{goal.title}</span>
                                            </div>
                                            <span className={`text-xs font-bold ${isDone ? 'text-growth-hover' : 'text-text-muted'}`}>
                                                {isDone ? '달성' : `${percent}%`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full bg-primary text-white rounded-xl py-3.5 font-bold transition-all active:scale-[0.98]"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';
import { X, Play, Pencil, Trash2, Target, List } from 'lucide-react';
import { Goal } from '@/types';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { useState } from 'react';
import { format, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { ko } from 'date-fns/locale';
import { GrowthBlock } from '@/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    goal: Goal | null;
    onEditGoal: () => void;
    onStartTimer: () => void;
}

export default function GoalActionModal({ isOpen, onClose, goal, onEditGoal, onStartTimer }: Props) {
    const updateGoal = useDoneDayStore(state => state.updateGoal);
    const blocks = useDoneDayStore(state => state.blocks);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    if (!isOpen || !goal) return null;

    const handleDelete = () => {
        const nextWeekStart = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');
        updateGoal(goal.id, { pendingDeleteAt: nextWeekStart });
        onClose();
    };

    const detailList = blocks
        .filter((b): b is GrowthBlock => b.type === 'GROWTH' && b.goalId === goal.id && Boolean(b.date))
        .slice()
        .sort((a, b) => (a.date! > b.date! ? -1 : 1));

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-border-strong mb-safe" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-base shrink-0">
                    <h2 className="text-sm font-bold flex items-center text-text-base">
                        <div className={`w-3 h-3 rounded-full mr-2 ${goal.color}`} />
                        {goal.title}{goal.pendingDeleteAt ? ' (다음주 삭제예정)' : ''}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-text-muted hover:bg-bg-surface rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    <button
                        onClick={() => setIsDetailOpen(true)}
                        className="w-full flex items-center justify-center bg-bg-base text-text-base border border-border-subtle hover:border-text-muted rounded-xl py-3 text-sm font-bold transition-all"
                    >
                        <List className="w-4 h-4 mr-2" />
                        진척 세부내역
                    </button>

                    <button
                        onClick={() => { onClose(); onStartTimer(); }}
                        className="w-full flex items-center justify-center bg-primary hover:bg-primary-hover text-white rounded-xl py-3.5 text-sm font-bold transition-all"
                    >
                        <Play className="w-4 h-4 mr-2 fill-white" />
                        타이머 시작
                    </button>

                    <button
                        onClick={() => { onClose(); onEditGoal(); }}
                        className="w-full flex items-center justify-center bg-bg-base text-text-base border border-border-subtle hover:border-text-muted rounded-xl py-3 text-sm font-bold transition-all"
                    >
                        <Pencil className="w-4 h-4 mr-2" />
                        목표 수정
                    </button>

                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center bg-failed-bg text-failed-hover border border-failed-border hover:border-failed-hover rounded-xl py-3 text-sm font-bold transition-all"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        목표 삭제 (다음주부터 적용)
                    </button>
                </div>
            </div>

            {isDetailOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsDetailOpen(false)}>
                    <div className="bg-bg-surface w-full max-w-sm rounded-2xl shadow-lg border border-border-strong overflow-hidden animate-pop relative" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-base">
                            <h3 className="text-sm font-bold text-text-base">진척 세부내역</h3>
                            <button onClick={() => setIsDetailOpen(false)} className="p-1.5 text-text-muted hover:bg-bg-surface rounded-full transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                            {detailList.length === 0 ? (
                                <div className="text-center text-sm text-text-muted py-8">아직 기록이 없어요.</div>
                            ) : (
                                detailList.map((b) => {
                                    const dateLabel = b.date ? format(parseISO(b.date), 'M/d(EEE)', { locale: ko }) : '';
                                    const timeLabel = b.startTime && b.endTime ? `${b.startTime}~${b.endTime}` : '';
                                    return (
                                        <div key={b.id} className="flex items-center justify-between text-sm bg-bg-base border border-border-subtle rounded-xl px-3 py-2">
                                            <div className="font-semibold text-text-base">
                                                {dateLabel} {timeLabel}
                                            </div>
                                            <div className="text-text-muted font-bold">{b.durationMinutes}분</div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-4 pt-0">
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className="w-full bg-primary text-white rounded-xl py-3.5 font-bold transition-all active:scale-[0.98]"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

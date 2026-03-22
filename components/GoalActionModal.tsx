'use client';
import { X, Play, Pencil, Trash2, Target, List } from 'lucide-react';
import { Goal } from '@/types';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { useState, useEffect } from 'react';
import { format, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { ko } from 'date-fns/locale';
import { GrowthBlock } from '@/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    goal: Goal | null;
    onEditGoal: () => void;
    onStartTimer: () => void;
    openDetailOnOpen?: boolean;
}

export default function GoalActionModal({ isOpen, onClose, goal, onEditGoal, onStartTimer, openDetailOnOpen = false }: Props) {
    const updateGoal = useDoneDayStore(state => state.updateGoal);
    const blocks = useDoneDayStore(state => state.blocks);
    const setGrowthHidden = useDoneDayStore(state => state.setGrowthHidden);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showHidden, setShowHidden] = useState(false);

    useEffect(() => {
        if (openDetailOnOpen && isOpen && goal) setIsDetailOpen(true);
    }, [openDetailOnOpen, isOpen, goal]);

    if (!isOpen || !goal) return null;

    const handleDelete = () => {
        if (goal.pendingDeleteAt) {
            updateGoal(goal.id, { pendingDeleteAt: null });
            onClose();
            return;
        }
        const nextWeekStart = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');
        updateGoal(goal.id, { pendingDeleteAt: nextWeekStart });
        onClose();
    };

    const detailList = blocks
        .filter((b): b is GrowthBlock => b.type === 'GROWTH' && b.goalId === goal.id && Boolean(b.date))
        .slice()
        .sort((a, b) => (a.date! > b.date! ? -1 : 1));

    const visibleList = detailList.filter(b => !b.hidden);
    const hiddenList = detailList.filter(b => b.hidden);

    const grouped = visibleList.reduce<Record<string, GrowthBlock[]>>((acc, b) => {
        const key = b.date || '';
        if (!acc[key]) acc[key] = [];
        acc[key].push(b);
        return acc;
    }, {});

    const groupedHidden = hiddenList.reduce<Record<string, GrowthBlock[]>>((acc, b) => {
        const key = b.date || '';
        if (!acc[key]) acc[key] = [];
        acc[key].push(b);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-border-strong mb-safe" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-base shrink-0">
                    <h2 className="text-sm font-bold flex items-center text-text-base">
                        <div className={`w-3 h-3 rounded-full mr-2 ${goal.color}`} />
                        {goal.title}{goal.pendingDeleteAt ? ' (삭제예정)' : ''}
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

                    <div className="bg-bg-base border border-border-subtle rounded-xl p-2">
                        <button
                            onClick={() => { onClose(); onStartTimer(); }}
                            className="w-full flex items-center justify-center bg-primary hover:bg-primary-hover text-white rounded-lg py-3 text-sm font-bold transition-all"
                        >
                            <Play className="w-4 h-4 mr-2 fill-white" />
                            타이머 시작
                        </button>
                    </div>

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
                        목표 삭제/유지
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
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                            {visibleList.length === 0 ? (
                                <div className="text-center text-sm text-text-muted py-8">아직 기록이 없어요.</div>
                            ) : (
                                Object.entries(grouped).map(([dateStr, items]) => {
                                    const dateLabel = dateStr ? format(parseISO(dateStr), 'M/d(EEE)', { locale: ko }) : '';
                                    const totalMinutes = items.reduce((sum, b) => sum + b.durationMinutes, 0);
                                    return (
                                        <div key={dateStr} className="bg-bg-base border border-border-subtle rounded-xl px-3 py-2">
                                            <div className="flex items-center justify-between text-sm font-bold text-text-base mb-2">
                                                <span>{dateLabel}</span>
                                                <span>총 {totalMinutes}분</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {items.map((b) => {
                                                    const timeLabel = b.startTime && b.endTime ? `${b.startTime} ~ ${b.endTime}` : '';
                                                    return (
                                                        <div key={b.id} className="flex items-center justify-between text-xs">
                                                            <div className="text-text-muted/80 font-medium">· {timeLabel}</div>
                                                            <div className="text-text-muted/80 font-semibold">{b.durationMinutes}분</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {hiddenList.length > 0 && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowHidden(!showHidden)}
                                        className="w-full flex items-center justify-between text-xs font-bold text-text-muted bg-bg-base border border-border-subtle rounded-xl px-3 py-2"
                                    >
                                        <span>숨긴 이력</span>
                                        <span>{showHidden ? '▲' : '▼'}</span>
                                    </button>
                                    {showHidden && (
                                        <div className="mt-2 space-y-3">
                                            {Object.entries(groupedHidden).map(([dateStr, items]) => {
                                                const dateLabel = dateStr ? format(parseISO(dateStr), 'M/d(EEE)', { locale: ko }) : '';
                                                return (
                                                    <div key={dateStr} className="bg-bg-base border border-border-subtle rounded-xl px-3 py-2">
                                                        <div className="text-xs font-bold text-text-muted mb-2">{dateLabel}</div>
                                                        <div className="space-y-1.5">
                                                            {items.map((b) => {
                                                                const timeLabel = b.startTime && b.endTime ? `${b.startTime} ~ ${b.endTime}` : '';
                                                                return (
                                                                    <div key={b.id} className="flex items-center justify-between text-xs">
                                                                        <div className="text-text-muted/70 font-medium">· {timeLabel}</div>
                                                                        <button
                                                                            onClick={() => setGrowthHidden(b.id, false)}
                                                                            className="text-[10px] font-bold text-primary"
                                                                        >
                                                                            복원하기
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
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

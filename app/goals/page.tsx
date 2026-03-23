'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import GoalSettingModal from '@/components/GoalSettingModal';
import GoalActionModal from '@/components/GoalActionModal';
import TimerModal from '@/components/TimerModal';
import { Target, Plus, ChevronRight } from 'lucide-react';
import { Goal } from '@/types';
import { getWeeklyGoalSummary } from '@/lib/goalProgress';
import { format, startOfWeek } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import WeeklyCertificateModal from '@/components/WeeklyCertificateModal';

function GoalsPageInner() {
    const goals = useDoneDayStore(state => state.goals);
    const blocks = useDoneDayStore(state => state.blocks);
    const purgePendingGoals = useDoneDayStore(state => state.purgePendingGoals);
    const searchParams = useSearchParams();

    const [isMounted, setIsMounted] = useState(false);
    const [fabHost, setFabHost] = useState<HTMLElement | null>(null);
    const [fabRight, setFabRight] = useState<string>('1rem');

    // Setting Modal
    const [isSettingOpen, setIsSettingOpen] = useState(false);
    const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

    // Action Modal
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
    const [openDetailOnAction, setOpenDetailOnAction] = useState(false);

    // Timer Modal
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isWeeklyCertOpen, setIsWeeklyCertOpen] = useState(false);
    const [weeklySummary, setWeeklySummary] = useState<ReturnType<typeof getWeeklyGoalSummary> | null>(null);

    useEffect(() => {
        setIsMounted(true);
        const startDateStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        purgePendingGoals(startDateStr);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        const host = document.getElementById('app-shell');
        setFabHost(host);
        const updateRight = () => {
            if (!host) return;
            const rect = host.getBoundingClientRect();
            const rightOffset = Math.max(16, window.innerWidth - rect.right + 16);
            setFabRight(`${rightOffset}px`);
        };
        updateRight();
        window.addEventListener('resize', updateRight);
        return () => window.removeEventListener('resize', updateRight);
    }, [isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        const goalId = searchParams.get('goalId');
        const openDetail = searchParams.get('detail') === '1';
        if (!goalId) return;
        const target = goals.find(g => g.id === goalId);
        if (!target) return;
        setActiveGoal(target);
        setOpenDetailOnAction(openDetail);
        setIsActionOpen(true);
    }, [isMounted, searchParams, goals]);

    if (!isMounted) return null;

    const handleGoalClick = (goal: Goal) => {
        setActiveGoal(goal);
        setOpenDetailOnAction(false);
        setIsActionOpen(true);
    };

    const handleEditGoal = () => {
        // Wait for ActionModal to close
        setTimeout(() => {
            setGoalToEdit(activeGoal);
            setIsSettingOpen(true);
        }, 50);
    };

    const handleStartTimer = () => {
        setTimeout(() => {
            setIsTimerOpen(true);
        }, 50);
    };

    const handleAddClick = () => {
        setGoalToEdit(null);
        setIsSettingOpen(true);
    };

    const weeklySummarySnapshot = getWeeklyGoalSummary(goals, blocks);
    const getGoalProgress = (goalId: string) => weeklySummarySnapshot.progressByGoalId[goalId] || 0;

    return (
        <div className="flex flex-col min-h-full pb-24">
            <Header />

            <div className="flex-1 p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center">
                        <Target className="w-5 h-5 mr-2 text-primary" />
                        주간 갓생 목표
                    </h2>
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">
                        총 {goals.length}개
                    </span>
                </div>

                {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 bg-bg-surface rounded-2xl border border-border-strong text-center">
                        <div className="w-16 h-16 bg-bg-base rounded-full flex items-center justify-center mb-4 border border-border-subtle">
                            <Target className="w-8 h-8 text-text-muted/50" />
                        </div>
                        <p className="text-text-base mb-2 font-bold">등록된 목표가 없어요</p>
                        <p className="text-sm font-medium text-text-muted">새로운 목표를 등록하고 갓생을 시작해보세요!</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-12">
                        {goals.map((goal) => {
                            const doneMins = getGoalProgress(goal.id);
                            const percent = Math.min(100, Math.round((doneMins / goal.targetMinutesPerWeek) * 100) || 0);

                            const startDateStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
                            const isPendingDelete = Boolean(goal.pendingDeleteAt && goal.pendingDeleteAt > startDateStr);
                            return (
                                <button key={goal.id} onClick={() => handleGoalClick(goal)} className="w-full text-left bg-bg-surface rounded-2xl border border-border-strong p-5 flex flex-col shadow-sm hover:shadow-md hover:border-text-muted transition-all active:scale-[0.98]">
                                    <div className="flex items-center space-x-4 w-full">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${goal.color}`}>
                                            <Target className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-bold text-text-base text-lg truncate pr-2">
                                                    {goal.title}{isPendingDelete ? ' (삭제예정)' : ''}
                                                </h3>
                                                <div className="flex items-center text-text-muted">
                                                    <span className="text-xs font-bold mr-1">
                                                        {percent}%
                                                    </span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </div>

                                            <div className="w-full bg-border-subtle/30 rounded-full h-2 mt-2 outline outline-1 outline-border-subtle overflow-hidden">
                                                <div className={`h-2 rounded-full ${goal.color} opacity-90 transition-all duration-500 ease-out`} style={{ width: `${percent}%` }} />
                                            </div>

                                            <p className="text-[10px] font-semibold text-text-muted mt-2 flex items-center justify-between">
                                                <span>진행: {Math.floor(doneMins / 60)}시간 {doneMins % 60}분</span>
                                                <span>목표: {Math.floor(goal.targetMinutesPerWeek / 60)}시간 {goal.targetMinutesPerWeek % 60}분</span>
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {fabHost && createPortal(
                <button
                    onClick={handleAddClick}
                    className="fixed bottom-24 left-auto w-14 h-14 bg-normal text-white rounded-full flex items-center justify-center shadow-lg shadow-normal/30 hover:bg-normal-hover hover:scale-105 active:scale-95 transition-all z-[90] pointer-events-auto"
                    style={{ right: `calc(${fabRight} + env(safe-area-inset-right))`, left: 'auto' }}
                    aria-label="갓생 목표 추가"
                >
                    <Target className="w-6 h-6" strokeWidth={2.5} />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-normal flex items-center justify-center shadow-sm">
                        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                </button>,
                fabHost
            )}

            <GoalSettingModal
                isOpen={isSettingOpen}
                onClose={() => setIsSettingOpen(false)}
                goalToEdit={goalToEdit}
            />

            <GoalActionModal
                isOpen={isActionOpen}
                onClose={() => setIsActionOpen(false)}
                goal={activeGoal}
                onEditGoal={handleEditGoal}
                onStartTimer={handleStartTimer}
                openDetailOnOpen={openDetailOnAction}
            />

            <TimerModal
                isOpen={isTimerOpen}
                onClose={() => setIsTimerOpen(false)}
                goal={activeGoal || undefined}
                confirmOnComplete
                onComplete={(payload) => {
                    if (payload?.becameComplete) {
                        setWeeklySummary(payload.summary);
                        setIsWeeklyCertOpen(true);
                    }
                }}
            />

            <WeeklyCertificateModal
                isOpen={isWeeklyCertOpen}
                onClose={() => setIsWeeklyCertOpen(false)}
                summary={weeklySummary}
                goals={goals}
            />
        </div>
    );
}

export default function GoalsPage() {
    return (
        <Suspense>
            <GoalsPageInner />
        </Suspense>
    );
}

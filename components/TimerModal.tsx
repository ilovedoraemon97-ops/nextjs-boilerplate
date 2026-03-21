'use client';
import { useState, useEffect } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { X, Play, Pause, CheckCircle2, Flame } from 'lucide-react';
import { Goal } from '@/types';
import { clsx } from 'clsx';
import { format, addMinutes } from 'date-fns';
import { getWeeklyGoalSummary, WeeklyGoalSummary } from '@/lib/goalProgress';

interface Props {
    goal?: Goal;
    isOpen: boolean;
    onClose: () => void;
    onComplete?: (payload: { summary: WeeklyGoalSummary; becameComplete: boolean }) => void;
}

export default function TimerModal({ goal, isOpen, onClose, onComplete }: Props) {
    const addGrowthBlock = useDoneDayStore(state => state.addGrowthBlock);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [startTimeRef, setStartTimeRef] = useState<Date | null>(null);

    useEffect(() => {
        if (isOpen && goal) {
            setSeconds(0);
            setIsActive(false);
            setStartTimeRef(null);
        } else {
            setIsActive(false);
        }
    }, [isOpen, goal]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    if (!isOpen || !goal) return null;

    const handlePlayPause = () => {
        if (!isActive && !startTimeRef) {
            setStartTimeRef(new Date());
        }
        setIsActive(!isActive);
    };

    const totalMinutes = Math.floor(seconds / 60);
    const canComplete = totalMinutes >= 1; // Require at least 1 minute

    const handleComplete = () => {
        if (!canComplete || !startTimeRef) return;

        setIsActive(false);

        const dateStr = format(startTimeRef, 'yyyy-MM-dd');
        const startStr = format(startTimeRef, 'HH:mm');
        const endStr = format(addMinutes(startTimeRef, totalMinutes), 'HH:mm');

        const before = getWeeklyGoalSummary(
            useDoneDayStore.getState().goals,
            useDoneDayStore.getState().blocks,
            startTimeRef
        );

        addGrowthBlock({
            goalId: goal.id,
            title: goal.title,
            color: goal.color,
            date: dateStr,
            startTime: startStr,
            endTime: endStr,
            durationMinutes: totalMinutes,
        });

        const after = getWeeklyGoalSummary(
            useDoneDayStore.getState().goals,
            useDoneDayStore.getState().blocks,
            startTimeRef
        );

        const becameComplete = after.completedGoalIds.some((id) => !before.completedGoalIds.includes(id));

        onClose();
        onComplete?.({ summary: after, becameComplete });
    };

    const handleClose = () => {
        // If closing without completing, we lose the session.
        // We could alert the user here, but for simplicity we just close.
        if (isActive || seconds > 0) {
            if (!confirm('타이머를 종료하시겠습니까? 기록되지 않은 시간은 사라집니다.')) return;
        }
        setIsActive(false);
        onClose();
    };

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progressPercent = Math.min(100, (seconds / (60 * 60)) * 100);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-surface p-4 animate-fade-in">
            <button onClick={handleClose} className="absolute top-6 left-6 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors z-10">
                <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center w-full max-w-sm relative">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-growth-bg text-growth-hover text-sm font-bold mb-4">
                        <Flame className="w-4 h-4 mr-1.5" />
                        갓생 타이머
                    </div>
                    <h2 className="text-3xl font-black text-text-base">{goal.title}</h2>
                    <p className="text-text-muted mt-2 font-medium">
                        순수 집중 시간을 측정합니다.
                    </p>
                    <p className="text-xs text-text-muted mt-2 font-semibold">
                        최소 1분 이상 진행해야 기록됩니다.
                    </p>
                </div>

                {/* Circular Progress & Timer */}
                <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="128" cy="128" r="120" stroke="var(--color-border-subtle)" strokeWidth="8" fill="none" />
                        <circle
                            cx="128" cy="128" r="120"
                            stroke="var(--color-primary)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 120}
                            strokeDashoffset={2 * Math.PI * 120 * (1 - progressPercent / 100)}
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    <div className="text-5xl font-black tracking-tighter text-text-base font-mono">
                        {formatTime(seconds)}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-6 mb-8">
                        <button
                            onClick={handlePlayPause}
                            className={clsx(
                                "w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95",
                                isActive ? "bg-bg-surface border-2 border-border-strong text-text-base shadow-sm" : "bg-primary text-white shadow-md shadow-primary/10"
                            )}
                        >
                            {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 ml-1 fill-current" />}
                        </button>

                        <button
                            onClick={handleComplete}
                            disabled={!canComplete}
                            className={clsx(
                                "w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-md transition-transform active:scale-95 group",
                                canComplete
                                    ? "bg-growth-hover text-white"
                                    : "bg-bg-surface border border-border-strong text-text-muted cursor-not-allowed opacity-50"
                            )}
                        >
                            <CheckCircle2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold mt-1 opacity-90">완료</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

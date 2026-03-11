'use client';
import { useState } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { Target, ArrowRight, Flame, Book, Briefcase, Dumbbell } from 'lucide-react';
import { clsx } from 'clsx';

interface PresetGoal {
    title: string;
    icon: React.ReactNode;
    color: string;
    durationMinutes: number;
    frequencyPerWeek: number;
}

const PRESETS: PresetGoal[] = [
    { title: '매일 운동하기', icon: <Dumbbell className="w-6 h-6" />, color: 'bg-blue-500', durationMinutes: 60, frequencyPerWeek: 3 },
    { title: '꾸준한 독서', icon: <Book className="w-6 h-6" />, color: 'bg-orange-500', durationMinutes: 30, frequencyPerWeek: 5 },
    { title: '사이드 프로젝트', icon: <Briefcase className="w-6 h-6" />, color: 'bg-purple-500', durationMinutes: 120, frequencyPerWeek: 2 },
    { title: '어학 공부', icon: <Flame className="w-6 h-6" />, color: 'bg-red-500', durationMinutes: 60, frequencyPerWeek: 4 },
];

export default function Onboarding() {
    const { goals, addGoal } = useDoneDayStore();
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    // Only show if no goals exist
    if (goals.length > 0) return null;

    const handleStart = () => {
        if (selectedIdx === null) return;
        const preset = PRESETS[selectedIdx];
        addGoal({
            title: preset.title,
            durationMinutes: preset.durationMinutes,
            frequencyPerWeek: preset.frequencyPerWeek,
        });
    };

    return (
        <div className="fixed inset-0 z-[200] bg-bg-base flex flex-col pt-20 pb-8 px-6 animate-fade-in overflow-y-auto">
            <div className="flex-1 max-w-sm mx-auto w-full flex flex-col justify-center">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Target className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-text-base mb-3 leading-tight">
                        어떤 목표부터<br />시작해볼까요?
                    </h1>
                    <p className="text-text-muted font-medium">
                        첫 번째 갓생 목표를 선택하시면<br />자동으로 이번 주 캘린더를 채워드립니다.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                    {PRESETS.map((preset, idx) => {
                        const isSelected = selectedIdx === idx;
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedIdx(idx)}
                                className={clsx(
                                    "p-5 rounded-2xl text-left transition-all active:scale-95 border-2",
                                    isSelected
                                        ? "bg-bg-surface border-primary shadow-lg shadow-primary/10"
                                        : "bg-bg-surface border-transparent shadow-sm hover:border-border-strong text-text-muted hover:text-text-base"
                                )}
                            >
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl text-white flex items-center justify-center mb-4 shadow-sm",
                                    isSelected ? preset.color : "bg-bg-surface-hover text-text-muted"
                                )}>
                                    {preset.icon}
                                </div>
                                <h3 className={clsx("font-bold", isSelected ? "text-text-base" : "")}>
                                    {preset.title}
                                </h3>
                                <div className="text-xs font-semibold opacity-70 mt-1">
                                    주 {preset.frequencyPerWeek}회 · {preset.durationMinutes}분
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-sm mx-auto w-full mt-auto">
                <button
                    onClick={handleStart}
                    disabled={selectedIdx === null}
                    className="w-full bg-primary hover:bg-primary-hover disabled:bg-border-strong disabled:text-text-muted/50 text-white rounded-xl py-4 font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-primary/25 disabled:shadow-none flex items-center justify-center group"
                >
                    갓생 시작하기
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}

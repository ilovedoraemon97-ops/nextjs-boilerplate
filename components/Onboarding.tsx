'use client';
import { useState } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { Target, ArrowRight, Flame, Book, Briefcase, Dumbbell, CalendarDays, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { startOfWeek, addDays, format } from 'date-fns';

interface PresetGoal {
    title: string;
    icon: React.ReactNode;
    color: string;
}

const PRESETS: PresetGoal[] = [
    { title: '운동', icon: <Dumbbell className="w-6 h-6" />, color: 'bg-blue-500' },
    { title: '독서', icon: <Book className="w-6 h-6" />, color: 'bg-orange-500' },
    { title: '사이드 프로젝트', icon: <Briefcase className="w-6 h-6" />, color: 'bg-purple-500' },
    { title: '외국어 공부', icon: <Flame className="w-6 h-6" />, color: 'bg-red-500' },
];

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const HOURS_OPTION = Array.from({ length: 25 }, (_, i) => i.toString().padStart(2, '0'));
const MINS_OPTION = ['00', '10', '20', '30', '40', '50'];

interface Routine {
    id: string;
    title: string;
    startH: string;
    startM: string;
    endH: string;
    endM: string;
    daysOfWeek: number[]; // 0=Sun, 1=Mon...
}

interface Props {
    onComplete?: () => void;
}

export default function Onboarding({ onComplete }: Props) {
    const { goals, addGoal, onboardingDismissed, dismissOnboarding, addNormalBlock, updateSettings } = useDoneDayStore();
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1 State: map of index -> string (empty string for placeholder)
    const [selectedGoals, setSelectedGoals] = useState<{ [idx: number]: string }>({});

    // Step 2 State (Routines)
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [rTitle, setRTitle] = useState('');
    const [rStartH, setRStartH] = useState('09');
    const [rStartM, setRStartM] = useState('00');
    const [rEndH, setREndH] = useState('18');
    const [rEndM, setREndM] = useState('00');
    const [rDays, setRDays] = useState<number[]>([1, 2, 3, 4, 5]);

    // Step 3 State (Active Hours)
    const [activeStartH, setActiveStartH] = useState('09');
    const [activeEndH, setActiveEndH] = useState('02');

    if (onboardingDismissed) return null;

    if (goals.length > 0) {
        return (
            <div className="fixed inset-0 z-[200] bg-bg-base flex flex-col pt-20 pb-8 px-6 animate-fade-in overflow-y-auto">
                <div className="flex-1 max-w-sm mx-auto w-full flex flex-col justify-center text-center">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Target className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-text-base mb-3 leading-tight">
                        로그인하면 기록을 이어서 볼 수 있어요
                    </h1>
                    <p className="text-text-muted font-medium">
                        로그인 없이도 이용할 수 있어요. 필요할 때 로그인해 주세요.
                    </p>
                </div>
                <div className="max-w-sm mx-auto w-full mt-auto">
                    <button
                        onClick={() => {
                            dismissOnboarding();
                            onComplete?.();
                        }}
                        className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-4 font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center group"
                    >
                        비회원으로 계속하기
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        );
    }

    const togglePreset = (idx: number) => {
        setSelectedGoals(prev => {
            const next = { ...prev };
            if (next[idx] !== undefined) delete next[idx];
            else next[idx] = ''; // empty string shows placeholder '1'
            return next;
        });
    };

    const updateGoalHour = (idx: number, hourStr: string) => {
        setSelectedGoals(prev => {
            if (prev[idx] === undefined) return prev;
            return { ...prev, [idx]: hourStr };
        });
    };

    const toggleDay = (dayIdx: number) => {
        setRDays(prev => prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]);
    };

    const handleAddRoutine = () => {
        if (!rTitle.trim() || rDays.length === 0) return;

        // Check for overlap
        const nStart = parseInt(rStartH) * 60 + parseInt(rStartM);
        let nEnd = parseInt(rEndH) * 60 + parseInt(rEndM);
        if (nEnd <= nStart) nEnd += 24 * 60;

        const hasOverlap = routines.some(existing => {
            const sharedDays = existing.daysOfWeek.filter(d => rDays.includes(d));
            if (sharedDays.length === 0) return false;

            const eStart = parseInt(existing.startH) * 60 + parseInt(existing.startM);
            let eEnd = parseInt(existing.endH) * 60 + parseInt(existing.endM);
            if (eEnd <= eStart) eEnd += 24 * 60;

            // Exclusive overlap: StartA < EndB && EndA > StartB
            return nStart < eEnd && nEnd > eStart;
        });

        if (hasOverlap) {
            alert('입력하신 일정이 기존 루틴과 겹칩니다. 요일이나 시간을 확인해주세요.');
            return;
        }

        setRoutines(prev => [...prev, {
            id: crypto.randomUUID(),
            title: rTitle.trim(),
            startH: rStartH,
            startM: rStartM,
            endH: rEndH,
            endM: rEndM,
            daysOfWeek: [...rDays].sort()
        }]);
        setRTitle('');
    };

    const handleRemoveRoutine = (id: string) => {
        setRoutines(prev => prev.filter(r => r.id !== id));
    };

    const handleFinish = () => {
        // 1. Add Goals
        Object.entries(selectedGoals).forEach(([idxStr, hourStr]) => {
            const preset = PRESETS[Number(idxStr)];
            const hours = hourStr === '' ? 1 : parseInt(hourStr);
            addGoal({
                title: `${preset.title} 하기`,
                color: preset.color,
                targetMinutesPerWeek: hours * 60,
            });
        });

        // 2. Add Routines
        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
        routines.forEach(routine => {
            for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
                const weekStart = addDays(currentWeekStart, weekOffset * 7);
                routine.daysOfWeek.forEach(dayIndex => {
                    const targetDate = addDays(weekStart, dayIndex);
                    const sh = parseInt(routine.startH);
                    const sm = parseInt(routine.startM);
                    const eh = parseInt(routine.endH);
                    const em = parseInt(routine.endM);

                    let duration = (eh * 60 + em) - (sh * 60 + sm);
                    if (duration <= 0) duration += 24 * 60; // handle passing midnight if allowed

                    if (duration > 0) {
                        addNormalBlock({
                            title: routine.title,
                            date: format(targetDate, 'yyyy-MM-dd'),
                            startTime: `${routine.startH}:${routine.startM}`,
                            endTime: `${routine.endH}:${routine.endM}`,
                            durationMinutes: duration,
                        });
                    }
                });
            }
        });

        // 3. Set Active Hours
        updateSettings({
            activeStartHour: parseInt(activeStartH),
            activeEndHour: parseInt(activeEndH),
        });

        dismissOnboarding();
        onComplete?.();
    };

    const totalSteps = 3;
    const progressPercent = Math.round((step / totalSteps) * 100);

    return (
        <div className="fixed inset-0 z-[200] bg-bg-base flex flex-col pt-12 pb-8 px-6 animate-fade-in overflow-y-auto">
            <div className="max-w-sm mx-auto w-full flex-1 flex flex-col pt-2">
                {/* Progress Gauge */}
                <div className="w-full h-1.5 bg-bg-surface border border-border-subtle rounded-full mb-8 overflow-hidden relative shadow-sm">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {step === 1 && (
                    <div className="flex-1 flex flex-col animate-fade-in">
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Target className="w-8 h-8" />
                            </div>
                            <h1 className="text-2xl font-black text-text-base mb-3 leading-tight">
                                어떤 목표부터 시작해볼까요?
                            </h1>
                            <p className="text-sm text-text-muted font-medium">
                                목표를 골라주세요 (중복선택 가능)
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 mb-10">
                            {PRESETS.map((preset, idx) => {
                                const isSelected = selectedGoals[idx] !== undefined;
                                const currentHours = selectedGoals[idx] ?? '';
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => togglePreset(idx)}
                                        className={clsx(
                                            "flex items-center p-4 rounded-2xl text-left transition-all active:scale-[0.98] border-2 cursor-pointer",
                                            isSelected
                                                ? "bg-primary/5 border-primary shadow-sm space-x-2"
                                                : "bg-bg-surface border-border-subtle hover:border-border-strong text-text-muted hover:text-text-base"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl text-white flex items-center justify-center mr-3 shrink-0 transition-colors",
                                            isSelected ? preset.color : "bg-bg-surface-hover text-text-muted"
                                        )}>
                                            {preset.icon}
                                        </div>
                                        <div className="flex-1 flex flex-col pr-2 tracking-tight">
                                            <div className="flex items-center gap-1.5 text-sm font-extrabold text-text-base">
                                                <span>주</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={3}
                                                    value={isSelected ? currentHours : ''}
                                                    placeholder={isSelected ? '1' : ''}
                                                    onChange={(e) => {
                                                        if (!isSelected) togglePreset(idx);
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        updateGoalHour(idx, val);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isSelected) {
                                                            togglePreset(idx);
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "w-10 h-10 text-center rounded-lg border-2 font-black text-lg transition-colors p-0 m-0 outline-none",
                                                        isSelected
                                                            ? "bg-bg-surface border-primary text-text-base focus:ring-4 focus:ring-primary/20 placeholder:text-text-muted/40"
                                                            : "bg-bg-surface border-border-strong text-transparent placeholder-transparent cursor-pointer"
                                                    )}
                                                />
                                                <span>시간</span>
                                            </div>
                                            <div className={clsx("font-extrabold text-lg mt-0.5", isSelected ? "text-text-base" : "text-text-muted")}>
                                                {preset.title} 하기
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle2 className="w-6 h-6 text-primary animate-pop shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex-1 flex flex-col animate-fade-in">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-normal/10 text-normal rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <CalendarDays className="w-8 h-8" />
                            </div>
                            <h1 className="text-2xl font-black text-text-base mb-3 leading-tight">
                                루틴한 일정이 있나요?
                            </h1>
                            <p className="text-sm font-medium text-text-muted/50">
                                (예시) 월~금 09:00~18:00 회사
                            </p>
                        </div>

                        <div className="bg-bg-surface border border-border-subtle p-5 rounded-2xl mb-6 shadow-sm">
                            <input
                                type="text"
                                placeholder="일정 이름 (예: 회사, 학교)"
                                value={rTitle}
                                onChange={(e) => setRTitle(e.target.value)}
                                className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm font-bold text-text-base focus:outline-none focus:border-normal mb-4"
                            />

                            <div className="flex items-center gap-2 mb-4">
                                {/* Start Time Selectors */}
                                <div className="flex items-center gap-1 bg-bg-base border border-border-subtle rounded-xl px-2 py-1.5 focus-within:border-normal flex-1">
                                    <select value={rStartH} onChange={e => setRStartH(e.target.value)} className="bg-transparent font-bold text-text-base focus:outline-none text-center flex-1 appearance-none cursor-pointer">
                                        {HOURS_OPTION.slice(0, 24).map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className="font-bold text-text-muted">:</span>
                                    <select value={rStartM} onChange={e => setRStartM(e.target.value)} className="bg-transparent font-bold text-text-base focus:outline-none text-center flex-1 appearance-none cursor-pointer">
                                        {MINS_OPTION.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <span className="text-text-muted font-bold text-base px-1 shrink-0">~</span>

                                {/* End Time Selectors */}
                                <div className="flex items-center gap-1 bg-bg-base border border-border-subtle rounded-xl px-2 py-1.5 focus-within:border-normal flex-1">
                                    <select value={rEndH} onChange={e => setREndH(e.target.value)} className="bg-transparent font-bold text-text-base focus:outline-none text-center flex-1 appearance-none cursor-pointer">
                                        {HOURS_OPTION.slice(0, 25).map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className="font-bold text-text-muted">:</span>
                                    <select value={rEndM} onChange={e => setREndM(e.target.value)} className="bg-transparent font-bold text-text-base focus:outline-none text-center flex-1 appearance-none cursor-pointer">
                                        {MINS_OPTION.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-between gap-1 mb-5">
                                {DAYS.map((day, dIdx) => {
                                    const isSelected = rDays.includes(dIdx);
                                    return (
                                        <button
                                            key={dIdx}
                                            onClick={() => toggleDay(dIdx)}
                                            className={clsx(
                                                "w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center transition-colors border",
                                                isSelected
                                                    ? "bg-normal text-white border-normal"
                                                    : "bg-bg-base text-text-muted border-border-subtle hover:border-border-strong"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleAddRoutine}
                                disabled={!rTitle.trim() || rDays.length === 0}
                                className="w-full py-3 bg-bg-base border-2 border-border-strong rounded-xl text-sm font-bold text-text-base hover:bg-bg-surface-hover disabled:opacity-50 transition-colors"
                            >
                                일정 추가하기
                            </button>
                        </div>

                        {routines.length > 0 && (
                            <div className="space-y-2 mb-6 max-h-40 overflow-y-auto pr-2">
                                {routines.map(r => (
                                    <div key={r.id} className="flex items-center justify-between bg-bg-surface px-4 py-3 rounded-xl border border-border-subtle">
                                        <div>
                                            <div className="font-bold text-sm text-text-base">{r.title}</div>
                                            <div className="text-xs text-text-muted font-medium mt-0.5">
                                                {r.daysOfWeek.map(d => DAYS[d]).join(',')} · {r.startH}:{r.startM}~{r.endH}:{r.endM}
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveRoutine(r.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="flex-1 flex flex-col animate-fade-in">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h1 className="text-2xl font-black text-text-base mb-3 leading-tight">
                                활동 시간이 언제인가요?
                            </h1>
                            <p className="text-sm text-text-muted font-medium px-4 leading-relaxed">
                                수면 시간을 제외하고 실제로 깨어있는 시간을 설정해주세요.<br />
                                이 시간에 맞춰 시간표가 생성됩니다.<br />
                                추후 개인 설정에서 수정 가능해요.
                            </p>
                        </div>

                        <div className="bg-bg-surface border border-border-subtle p-5 rounded-2xl mb-6 shadow-sm">
                            <div className="flex items-center justify-center gap-3">
                                <select
                                    value={activeStartH}
                                    onChange={e => setActiveStartH(e.target.value)}
                                    className="bg-bg-base border border-border-subtle rounded-xl px-4 py-3 font-bold text-lg text-text-base focus:outline-none focus:border-blue-500 text-center cursor-pointer appearance-none"
                                >
                                    {HOURS_OPTION.slice(0, 24).map(h => <option key={h} value={h}>{h}시</option>)}
                                </select>

                                <span className="font-bold text-text-muted text-xl">~</span>

                                <select
                                    value={activeEndH}
                                    onChange={e => setActiveEndH(e.target.value)}
                                    className="bg-bg-base border border-border-subtle rounded-xl px-4 py-3 font-bold text-lg text-text-base focus:outline-none focus:border-blue-500 text-center cursor-pointer appearance-none"
                                >
                                    {HOURS_OPTION.slice(0, 24).map(h => <option key={h} value={h}>{h}시</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-4">
                    {step === 1 ? (
                        <button
                            onClick={() => setStep(2)}
                            disabled={Object.keys(selectedGoals).length === 0}
                            className="w-full bg-primary hover:bg-primary-hover disabled:bg-border-strong disabled:text-text-muted/50 text-white rounded-xl py-4 font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center group shadow-sm"
                        >
                            다음으로
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : step === 2 ? (
                        <button
                            onClick={() => setStep(3)}
                            className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-4 font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center group shadow-sm"
                        >
                            다음으로
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-4 font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center group shadow-md shadow-primary/20"
                        >
                            완료
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

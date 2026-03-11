'use client';
import { useState } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { X, Target, Clock, CalendarDays } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function GoalSettingModal({ isOpen, onClose }: Props) {
    const addGoal = useDoneDayStore((state) => state.addGoal);

    const [title, setTitle] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [frequency, setFrequency] = useState(3);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        addGoal({
            title: title.trim(),
            durationMinutes,
            frequencyPerWeek: frequency,
        });

        setTitle('');
        setDurationMinutes(60);
        setFrequency(3);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center">
                        <Target className="w-5 h-5 text-primary mr-2" />
                        새로운 갓생 목표
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-muted">어떤 목표인가요?</label>
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="예: 운동, 영어 인강, 독서"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-muted flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                1회 소요 시간
                            </label>
                            <select
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium appearance-none"
                            >
                                <option value={30}>30분</option>
                                <option value={60}>1시간</option>
                                <option value={90}>1시간 30분</option>
                                <option value={120}>2시간</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-muted flex items-center">
                                <CalendarDays className="w-4 h-4 mr-1" />
                                주간 수행 횟수
                            </label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(Number(e.target.value))}
                                className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium appearance-none"
                            >
                                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                                    <option key={num} value={num}>주 {num}회</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm text-text-muted text-center font-medium">
                            목표를 생성하면 <strong className="text-primary">{title || '목표'}</strong> 블록이 <strong className="text-primary">{frequency}개</strong> 자동 생성됩니다.
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-3.5 font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary/25"
                        >
                            목표 시작하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

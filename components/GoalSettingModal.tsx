import { useState, useEffect } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { X, Target, Clock, CalendarDays } from 'lucide-react';
import { Goal } from '@/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    goalToEdit?: Goal | null;
}

const COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

export default function GoalSettingModal({ isOpen, onClose, goalToEdit }: Props) {
    const addGoal = useDoneDayStore((state) => state.addGoal);
    const updateGoal = useDoneDayStore((state) => state.updateGoal);

    const [title, setTitle] = useState('');
    const [color, setColor] = useState(COLORS[7]);
    const [targetHours, setTargetHours] = useState(5);
    const [targetMinutes, setTargetMinutes] = useState(0);

    useEffect(() => {
        if (isOpen) {
            if (goalToEdit) {
                setTitle(goalToEdit.title);
                setColor(goalToEdit.color || COLORS[7]);
                setTargetHours(Math.floor(goalToEdit.targetMinutesPerWeek / 60));
                setTargetMinutes(goalToEdit.targetMinutesPerWeek % 60);
            } else {
                setTitle('');
                setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
                setTargetHours(5);
                setTargetMinutes(0);
            }
        }
    }, [isOpen, goalToEdit]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const totalMins = (targetHours * 60) + targetMinutes;
        if (totalMins <= 0) return;

        if (goalToEdit) {
            updateGoal(goalToEdit.id, {
                title: title.trim(),
                color,
                targetMinutesPerWeek: totalMins,
            });
        } else {
            addGoal({
                title: title.trim(),
                color,
                targetMinutesPerWeek: totalMins,
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-lg border border-border-strong overflow-hidden animate-slide-up">
                <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center">
                        <Target className="w-5 h-5 text-primary mr-2" />
                        {goalToEdit ? '목표 수정' : '새로운 갓생 목표'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-muted">어떤 목표인가요?</label>
                            <input
                                autoFocus={!goalToEdit}
                                required
                                type="text"
                                placeholder="예: 운동, 영어 인강, 독서"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-muted">목표 색상</label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-bg-surface ring-offset-bg-surface outline outline-2 outline-primary scale-110' : 'opacity-70 hover:opacity-100 hover:scale-110'} transition-all`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-muted flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                주간 목표 시간
                            </label>
                            <div className="flex space-x-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="168"
                                        value={targetHours}
                                        onChange={(e) => setTargetHours(Number(e.target.value))}
                                        className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium pointer-events-none">시간</span>
                                </div>
                                <div className="flex-1 relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        step="5"
                                        value={targetMinutes}
                                        onChange={(e) => setTargetMinutes(Number(e.target.value))}
                                        className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium pointer-events-none">분</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm text-text-muted text-center font-medium">
                            목표를 생성하면 <strong className="text-primary">{title || '목표'}</strong> 진행률을 게이지로 확인할 수 있습니다.
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-3.5 font-bold transition-all active:scale-[0.98]"
                        >
                            {goalToEdit ? '목표 저장하기' : '목표 시작하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

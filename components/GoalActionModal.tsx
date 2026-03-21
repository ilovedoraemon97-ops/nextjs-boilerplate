'use client';
import { X, Play, Pencil, Trash2, Target } from 'lucide-react';
import { Goal } from '@/types';
import { useDoneDayStore } from '@/store/useDoneDayStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    goal: Goal | null;
    onEditGoal: () => void;
    onStartTimer: () => void;
}

export default function GoalActionModal({ isOpen, onClose, goal, onEditGoal, onStartTimer }: Props) {
    const deleteGoal = useDoneDayStore(state => state.deleteGoal);

    if (!isOpen || !goal) return null;

    const handleDelete = () => {
        if (confirm(`'${goal.title}' 목표를 삭제하시겠습니까?\n달력의 기존 기록들은 지워지지 않습니다.`)) {
            deleteGoal(goal.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-border-strong mb-safe" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-base shrink-0">
                    <h2 className="text-sm font-bold flex items-center text-text-base">
                        <div className={`w-3 h-3 rounded-full mr-2 ${goal.color}`} />
                        {goal.title}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-text-muted hover:bg-bg-surface rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-2">
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
                        목표 삭제 (기록 보존)
                    </button>
                </div>
            </div>
        </div>
    );
}

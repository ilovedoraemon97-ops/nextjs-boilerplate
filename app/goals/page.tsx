'use client';
import { useState, useEffect } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import GoalSettingModal from '@/components/GoalSettingModal';
import { Target, Plus, Pencil } from 'lucide-react';
import { Goal } from '@/types';

export default function GoalsPage() {
    const goals = useDoneDayStore(state => state.goals);
    const [isMounted, setIsMounted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const handleEditClick = (goal: Goal) => {
        setGoalToEdit(goal);
        setIsModalOpen(true);
    };

    const handleAddClick = () => {
        setGoalToEdit(null);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col min-h-full pb-24">
            <Header />

            <div className="flex-1 p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center">
                        <Target className="w-5 h-5 mr-2 text-primary" />
                        내 갓생 목표
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
                    <div className="space-y-3">
                        {goals.map((goal) => (
                            <div key={goal.id} className="bg-bg-surface rounded-2xl border border-border-strong p-4 flex items-center justify-between shadow-sm">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${goal.color}`}>
                                        <Target className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-base text-lg">{goal.title}</h3>
                                        <p className="text-xs font-medium text-text-muted mt-0.5">
                                            주 {goal.frequencyPerWeek}회 · 1회 {goal.durationMinutes}분
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleEditClick(goal)}
                                    className="p-2 text-text-muted hover:text-text-base hover:bg-bg-base rounded-full transition-colors"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={handleAddClick}
                className="fixed bottom-24 right-4 sm:right-[calc(50%-13rem)] w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all z-40"
            >
                <Plus className="w-6 h-6" strokeWidth={3} />
            </button>

            <GoalSettingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                goalToEdit={goalToEdit}
            />
        </div>
    );
}

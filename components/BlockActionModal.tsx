'use client';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { TimeBlock, GrowthBlock, Goal } from '@/types';
import { X, Play, Edit3, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    block: TimeBlock | null;
    isOpen: boolean;
    onClose: () => void;
    onOpenTimer?: () => void;
    onEditGoal?: () => void; // for Growth
    onEditNormal?: () => void; // for Normal
    onUnassignGrowth?: () => void;
    growthMode?: 'full' | 'deleteOnly';
    onHideGrowth?: (block: GrowthBlock) => void;
    onGoToGoalDetail?: (goalId: string) => void;
}

export default function BlockActionModal({ block, isOpen, onClose, onOpenTimer, onEditGoal, onEditNormal, onUnassignGrowth, growthMode = 'full', onHideGrowth, onGoToGoalDetail }: Props) {
    const deleteBlock = useDoneDayStore(state => state.deleteBlock);
    const router = useRouter();

    if (!isOpen || !block) return null;

    const handleDelete = () => {
        const message = block.type === 'GROWTH'
            ? '갓생 기록이 사라져요.'
            : `'${block.title}' 일정을 삭제하시겠습니까?`;
        if (window.confirm(message)) {
            deleteBlock(block.id);
            onClose();
        }
    };

    const isGrowth = block.type === 'GROWTH';
    const timeLabel = isGrowth && block.startTime && block.endTime
        ? `${block.startTime}~${block.endTime} (${block.durationMinutes}분)`
        : '';

    return (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-lg border border-border-strong overflow-hidden animate-slide-up relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors z-10">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    <h2 className="text-xl font-bold mb-2 text-text-base pr-8">{block.title}</h2>
                    {isGrowth && timeLabel && (
                        <div className="text-xs font-semibold text-text-muted mb-4">{timeLabel}</div>
                    )}

                    <div className="space-y-3">
                        {block.type === 'GROWTH' ? (
                            <>
                                {growthMode === 'full' && (
                                    <>
                                        <button
                                            onClick={() => { onClose(); onOpenTimer?.(); }}
                                            className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl py-4 font-bold transition-all flex items-center justify-center shadow-sm"
                                        >
                                            <Play className="w-5 h-5 mr-2 fill-current" />
                                            타이머 시작
                                        </button>
                                        <button
                                            onClick={() => { onClose(); onEditGoal?.(); }}
                                            className="w-full bg-bg-surface hover:bg-bg-surface-hover text-text-base rounded-xl py-4 font-bold transition-all flex items-center justify-center border border-border-strong"
                                        >
                                            <Edit3 className="w-5 h-5 mr-2" />
                                            목표 수정
                                        </button>
                                        {block.date && (
                                            <button
                                                onClick={() => { onClose(); onUnassignGrowth?.(); }}
                                                className="w-full bg-bg-surface-hover hover:bg-border-subtle text-text-muted rounded-xl py-4 font-bold transition-all flex items-center justify-center border border-border-strong"
                                            >
                                                달력에서 빼기 (대기 상태로)
                                            </button>
                                        )}
                                    </>
                                )}
                                {growthMode === 'deleteOnly' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const growth = block as GrowthBlock;
                                                onGoToGoalDetail ? onGoToGoalDetail(growth.goalId) : router.push(`/goals?goalId=${growth.goalId}&detail=1`);
                                                onClose();
                                            }}
                                            className="w-full bg-bg-surface hover:bg-bg-surface-hover text-text-base rounded-xl py-4 font-bold transition-all flex items-center justify-center border border-border-strong"
                                        >
                                            목표로 이동
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!window.confirm('갓생 이력이 숨겨져요.')) return;
                                                onHideGrowth?.(block as GrowthBlock);
                                                onClose();
                                            }}
                                            className="w-full bg-bg-surface-hover hover:bg-border-subtle text-text-muted rounded-xl py-4 font-bold transition-all flex items-center justify-center border border-border-strong"
                                        >
                                            기록 숨기기
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => { onClose(); onEditNormal?.(); }}
                                    className="w-full bg-normal hover:bg-normal-hover text-white rounded-xl py-4 font-bold transition-all flex items-center justify-center shadow-sm"
                                >
                                    <Edit3 className="w-5 h-5 mr-2" />
                                    일정 수정
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="w-full bg-failed-bg hover:opacity-80 text-failed-hover rounded-xl py-4 font-bold transition-all flex items-center justify-center border border-failed-hover/20"
                                >
                                    <Trash2 className="w-5 h-5 mr-2" />
                                    일정 삭제
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

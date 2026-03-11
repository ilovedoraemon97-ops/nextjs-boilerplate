import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Goal, TimeBlock, GrowthBlock, NormalBlock, UserStats } from '@/types';

interface DoneDayState {
    goals: Goal[];
    blocks: TimeBlock[];
    stats: UserStats;

    // Actions
    addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
    addNormalBlock: (block: Omit<NormalBlock, 'id' | 'type'>) => void;
    updateBlockSchedule: (id: string, date: string, startTime: string, durationMinutes: number) => void;
    deleteBlock: (id: string) => void;

    // Timer Actions (Growth Blocks only)
    startTimer: (id: string) => void;
    pauseTimer: (id: string, elapsedMinutes: number) => void;
    completeBlock: (id: string, totalElapsed: number) => void;

    // System Actions
    carryOverFailedBlocks: (currentDateStr: string) => void;
    getWeeklyGrowthRate: () => number; // Returns 0-100
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useDoneDayStore = create<DoneDayState>()(
    persist(
        (set, get) => ({
            goals: [],
            blocks: [],
            stats: {
                level: 1,
                streak: 0,
                totalGrowthHours: 0,
            },

            addGoal: (newGoal) => {
                const id = generateId();
                const goal: Goal = { ...newGoal, id, createdAt: new Date().toISOString() };

                // Auto-generate unassigned GrowthBlocks based on frequency
                const newBlocks: GrowthBlock[] = Array.from({ length: goal.frequencyPerWeek }).map((_, i) => ({
                    id: `${id}-block-${i}`,
                    type: 'GROWTH',
                    title: goal.title,
                    date: null,
                    durationMinutes: goal.durationMinutes,
                    targetMinutes: goal.durationMinutes,
                    elapsedMinutes: 0,
                    status: 'PLANNED',
                    isCarriedOver: false,
                }));

                set((state) => ({
                    goals: [...state.goals, goal],
                    blocks: [...state.blocks, ...newBlocks],
                }));
            },

            addNormalBlock: (newBlock) => {
                const block: NormalBlock = {
                    ...newBlock,
                    id: generateId(),
                    type: 'NORMAL',
                };
                set((state) => ({
                    blocks: [...state.blocks, block],
                }));
            },

            updateBlockSchedule: (id, date, startTime, durationMinutes) => {
                set((state) => ({
                    blocks: state.blocks.map(b =>
                        b.id === id ? { ...b, date, startTime, durationMinutes } : b
                    )
                }));
            },

            deleteBlock: (id) => {
                set((state) => ({
                    blocks: state.blocks.filter(b => b.id !== id),
                }));
            },

            startTimer: (id) => {
                set((state) => ({
                    blocks: state.blocks.map(b =>
                        b.id === id && b.type === 'GROWTH' ? { ...b, status: 'RUNNING' as const } : b
                    )
                }));
            },

            pauseTimer: (id, elapsedMinutes) => {
                set((state) => ({
                    blocks: state.blocks.map(b =>
                        b.id === id && b.type === 'GROWTH' ? { ...b, status: 'PLANNED' as const, elapsedMinutes } : b
                    )
                }));
            },

            completeBlock: (id, totalElapsed) => {
                set((state) => {
                    const blocks = state.blocks.map(b =>
                        b.id === id && b.type === 'GROWTH' ? { ...b, status: 'COMPLETED' as const, elapsedMinutes: totalElapsed } : b
                    );
                    return {
                        blocks,
                        stats: {
                            ...state.stats,
                            totalGrowthHours: state.stats.totalGrowthHours + (totalElapsed / 60)
                        }
                    };
                });
            },

            carryOverFailedBlocks: (currentDateStr) => {
                // Find blocks that are from dates before this week
                set((state) => {
                    let hasChanges = false;
                    const updatedBlocks = state.blocks.map(b => {
                        if (b.type === 'GROWTH' && b.status !== 'COMPLETED' && b.date) {
                            if (b.date < currentDateStr) {
                                hasChanges = true;
                                return {
                                    ...b,
                                    status: 'FAILED' as const,
                                    isCarriedOver: true,
                                    date: null,
                                    startTime: undefined
                                };
                            }
                        }
                        return b;
                    });

                    if (!hasChanges) return state;
                    return { blocks: updatedBlocks };
                });
            },

            getWeeklyGrowthRate: () => {
                const { blocks } = get();
                // Filter by GROWTH blocks that are not carried over (current week)
                const currentWeekGrowthBlocks = blocks.filter((b): b is GrowthBlock => b.type === 'GROWTH' && !b.isCarriedOver);

                if (currentWeekGrowthBlocks.length === 0) return 0;

                const completedCount = currentWeekGrowthBlocks.filter(b => b.status === 'COMPLETED').length;
                return Math.round((completedCount / currentWeekGrowthBlocks.length) * 100);
            }
        }),
        {
            name: 'doneday-storage',
        }
    )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Goal, TimeBlock, GrowthBlock, NormalBlock, UserStats, UserSettings } from '@/types';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

interface DoneDayState {
    goals: Goal[];
    blocks: TimeBlock[];
    stats: UserStats;
    settings: UserSettings;
    onboardingDismissed: boolean;

    // Actions
    updateSettings: (settings: Partial<UserSettings>) => void;
    addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
    updateGoal: (id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>) => void;
    deleteGoal: (id: string) => void;
    addNormalBlock: (block: Omit<NormalBlock, 'id' | 'type'>) => void;
    addGrowthBlock: (block: Omit<GrowthBlock, 'id' | 'type'>) => void;
    updateNormalBlock: (id: string, updates: Partial<Omit<NormalBlock, 'id' | 'type'>>) => void;
    updateBlockSchedule: (id: string, date: string, startTime: string, durationMinutes: number) => void;
    deleteBlock: (id: string) => void;
    dismissOnboarding: () => void;
    carryOverFailedBlocks: (weekStartDateStr: string) => void;

    // Supabase Sync
    syncGrowthSession: (block: GrowthBlock) => Promise<void>;
    loadProgressFromServer: () => Promise<void>;

    // System Actions
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
            settings: {
                activeStartHour: 9,
                activeEndHour: 2,
                timeAxisInterval: 3,
            },
            onboardingDismissed: false,

            updateSettings: (newSettings) => {
                set((state) => ({ settings: { ...state.settings, ...newSettings } }));
            },

            addGoal: (newGoal) => {
                const id = generateId();
                const goal: Goal = { ...newGoal, id, createdAt: new Date().toISOString() };
                set((state) => ({
                    goals: [...state.goals, goal],
                }));
            },

            updateGoal: (id, updates) => {
                set((state) => {
                    const goal = state.goals.find(g => g.id === id);
                    if (!goal) return state;
                    const updatedGoal = { ...goal, ...updates };

                    const updatedBlocks = state.blocks.map(b => {
                        if (b.type === 'GROWTH' && (b.goalId === id || b.title === goal.title)) {
                            return {
                                ...b,
                                title: updatedGoal.title,
                                color: updatedGoal.color
                            };
                        }
                        return b;
                    });

                    return {
                        goals: state.goals.map(g => g.id === id ? updatedGoal : g),
                        blocks: updatedBlocks,
                    };
                });
            },

            deleteGoal: (id) => {
                set((state) => ({
                    goals: state.goals.filter(g => g.id !== id),
                    blocks: state.blocks.filter(b => !(b.type === 'GROWTH' && b.goalId === id)),
                }));
            },

            addNormalBlock: (newBlock) => {
                const block: NormalBlock = { ...newBlock, id: generateId(), type: 'NORMAL' };
                set((state) => ({ blocks: [...state.blocks, block] }));
            },

            addGrowthBlock: (newBlock) => {
                const block: GrowthBlock = { ...newBlock, id: generateId(), type: 'GROWTH' };
                set((state) => ({
                    blocks: [...state.blocks, block],
                    stats: {
                        ...state.stats,
                        totalGrowthHours: state.stats.totalGrowthHours + (block.durationMinutes / 60)
                    }
                }));
                get().syncGrowthSession(block);
            },

            updateNormalBlock: (id, updates) => {
                set((state) => ({
                    blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
                }));
            },

            updateBlockSchedule: (id, date, startTime, durationMinutes) => {
                set((state) => {
                    if (!date || !startTime) {
                        return {
                            blocks: state.blocks.map(b =>
                                b.id === id ? { ...b, date, startTime, durationMinutes } : b
                            )
                        };
                    }

                    const timeToMins = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + m;
                    };
                    const minsToTime = (mins: number) => {
                        const m = Math.min(mins, 24 * 60 - 1); // cap at 23:59
                        const hh = Math.floor(m / 60).toString().padStart(2, '0');
                        const mm = (m % 60).toString().padStart(2, '0');
                        return `${hh}:${mm}`;
                    };

                    let updatedBlocks = [...state.blocks];
                    const targetIdx = updatedBlocks.findIndex(b => b.id === id);
                    if (targetIdx === -1) return state;

                    const targetBlock = { ...updatedBlocks[targetIdx], date, startTime, durationMinutes };
                    updatedBlocks[targetIdx] = targetBlock;

                    // Shift overlaps iteratively to avoid recursion loops
                    const shiftOverlapping = (blocksArr: typeof state.blocks, dominantBlock: any): typeof state.blocks => {
                        let current = [...blocksArr];
                        const queue: any[] = [dominantBlock];
                        const visited = new Set<string>();

                        while (queue.length > 0) {
                            const dom = queue.shift();
                            if (!dom?.startTime) continue;
                            const domKey = `${dom.id}@${dom.startTime}`;
                            if (visited.has(domKey)) continue;
                            visited.add(domKey);

                            const domStart = timeToMins(dom.startTime);
                            const domEnd = domStart + dom.durationMinutes;

                            for (let i = 0; i < current.length; i++) {
                                const b = current[i];
                                if (b.id === dom.id || b.date !== dom.date || !b.startTime) continue;

                                const bStart = timeToMins(b.startTime);
                                const bEnd = bStart + b.durationMinutes;
                                const isOverlapping = (bStart < domEnd && bEnd > domStart);
                                if (!isOverlapping) continue;

                                const nextStart = minsToTime(domEnd);
                                if (b.startTime === nextStart) continue; // prevent infinite loops

                                const updatedB = { ...b, startTime: nextStart };
                                current[i] = updatedB;
                                queue.push(updatedB);
                            }
                        }

                        return current;
                    };

                    const finalBlocks = shiftOverlapping(updatedBlocks, targetBlock);
                    return { blocks: finalBlocks };
                });
            },

            deleteBlock: (id) => {
                set((state) => ({
                    blocks: state.blocks.filter(b => b.id !== id),
                }));
            },

            dismissOnboarding: () => {
                set(() => ({ onboardingDismissed: true }));
            },

            carryOverFailedBlocks: () => {
                // No-op: growth blocks are created only after completion (post-facto).
            },

            syncGrowthSession: async (block) => {
                if (!isSupabaseConfigured || !supabaseClient) return;
                const { data } = await supabaseClient.auth.getUser();
                if (!data.user) return;
                const { error } = await supabaseClient.from('growth_sessions').insert({
                    user_id: data.user.id,
                    block_id: block.goalId, // Map to goal
                    title: block.title,
                    target_minutes: block.durationMinutes,
                    elapsed_minutes: block.durationMinutes,
                    completed_at: new Date().toISOString(),
                });
                if (error) {
                    console.error('[supabase] failed to insert growth_sessions', error);
                }
            },

            loadProgressFromServer: async () => {
                // Implementation simplified or removed for now since it was tied to pre-planned blocks
            },

            getWeeklyGrowthRate: () => {
                const { blocks, goals } = get();
                const currentWeekGrowthBlocks = blocks.filter((b): b is GrowthBlock => b.type === 'GROWTH');

                const totalTargetMins = goals.reduce((sum, g) => sum + g.targetMinutesPerWeek, 0);
                if (totalTargetMins === 0) return 0;

                const totalDoneMins = currentWeekGrowthBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);
                return Math.min(Math.round((totalDoneMins / totalTargetMins) * 100), 100);
            }
        }),
        {
            name: 'doneday-storage',
        }
    )
);

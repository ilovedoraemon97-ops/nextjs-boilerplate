import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Goal, TimeBlock, GrowthBlock, NormalBlock, UserStats, ACHIEVEMENT_TARGET_MINUTES } from '@/types';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

interface DoneDayState {
    goals: Goal[];
    blocks: TimeBlock[];
    stats: UserStats;
    onboardingDismissed: boolean;

    // Actions
    addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
    updateGoal: (id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>) => void;
    deleteGoal: (id: string) => void;
    addNormalBlock: (block: Omit<NormalBlock, 'id' | 'type'>) => void;
    updateNormalBlock: (id: string, updates: Partial<Omit<NormalBlock, 'id' | 'type'>>) => void;
    updateBlockSchedule: (id: string, date: string, startTime: string, durationMinutes: number) => void;
    deleteBlock: (id: string) => void;
    dismissOnboarding: () => void;

    // Timer Actions (Growth Blocks only)
    startTimer: (id: string) => void;
    pauseTimer: (id: string, elapsedMinutes: number) => void;
    completeBlock: (id: string, totalElapsed: number) => void;

    // Supabase Sync
    syncGrowthStart: (block: GrowthBlock) => Promise<void>;
    syncGrowthPause: (block: GrowthBlock, elapsedMinutes: number) => Promise<void>;
    syncGrowthProgress: (block: GrowthBlock, elapsedMinutes: number) => Promise<void>;
    syncGrowthCompletion: (block: GrowthBlock, totalElapsed: number) => Promise<void>;
    loadProgressFromServer: () => Promise<void>;

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
            onboardingDismissed: false,

            addGoal: (newGoal) => {
                const id = generateId();
                const goal: Goal = { ...newGoal, id, createdAt: new Date().toISOString() };

                // Auto-generate unassigned GrowthBlocks based on frequency
                const newBlocks: GrowthBlock[] = Array.from({ length: goal.frequencyPerWeek }).map((_, i) => ({
                    id: `${id}-block-${i}`,
                    type: 'GROWTH',
                    goalId: id,
                    color: goal.color,
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

            updateGoal: (id, updates) => {
                set((state) => {
                    const goal = state.goals.find(g => g.id === id);
                    if (!goal) return state;
                    const updatedGoal = { ...goal, ...updates };

                    const updatedBlocks = state.blocks.map(b => {
                        if (b.type === 'GROWTH' && b.goalId === id) {
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
                const block: NormalBlock = {
                    ...newBlock,
                    id: generateId(),
                    type: 'NORMAL',
                };
                set((state) => ({
                    blocks: [...state.blocks, block],
                }));
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

                    // Recursive shift
                    const shiftOverlapping = (blocksArr: typeof state.blocks, dominantBlock: any): typeof state.blocks => {
                        let current = [...blocksArr];
                        const domStart = timeToMins(dominantBlock.startTime);
                        const domEnd = domStart + dominantBlock.durationMinutes;

                        let didShift = false;
                        for (let i = 0; i < current.length; i++) {
                            const b = current[i];
                            if (b.id === dominantBlock.id || b.date !== dominantBlock.date || !b.startTime) continue;

                            const bStart = timeToMins(b.startTime);
                            const bEnd = bStart + b.durationMinutes;

                            const isOverlapping = (bStart < domEnd && bEnd > domStart);
                            if (isOverlapping) {
                                // Push b down to domEnd
                                const updatedB = { ...b, startTime: minsToTime(domEnd) };
                                current[i] = updatedB;
                                // Need to resolve overlaps caused by pushing b
                                current = shiftOverlapping(current, updatedB);
                                didShift = true;
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

            startTimer: (id) => {
                set((state) => ({
                    blocks: state.blocks.map(b =>
                        b.id === id && b.type === 'GROWTH' ? { ...b, status: 'RUNNING' as const } : b
                    )
                }));
                const block = get().blocks.find((b): b is GrowthBlock => b.id === id && b.type === 'GROWTH');
                if (block) get().syncGrowthStart(block);
            },

            pauseTimer: (id, elapsedMinutes) => {
                set((state) => ({
                    blocks: state.blocks.map(b =>
                        b.id === id && b.type === 'GROWTH' ? { ...b, status: 'PLANNED' as const, elapsedMinutes } : b
                    )
                }));
                const block = get().blocks.find((b): b is GrowthBlock => b.id === id && b.type === 'GROWTH');
                if (block) get().syncGrowthPause(block, elapsedMinutes);
            },

            completeBlock: (id, totalElapsed) => {
                set((state) => {
                    const blocks = state.blocks.map(b => {
                        if (b.id !== id || b.type !== 'GROWTH') return b;
                        if (totalElapsed < ACHIEVEMENT_TARGET_MINUTES) {
                            return { ...b, status: 'PLANNED' as const, elapsedMinutes: totalElapsed };
                        }
                        return { ...b, status: 'COMPLETED' as const, elapsedMinutes: totalElapsed };
                    });
                    if (totalElapsed < ACHIEVEMENT_TARGET_MINUTES) {
                        return { blocks };
                    }
                    return {
                        blocks,
                        stats: {
                            ...state.stats,
                            totalGrowthHours: state.stats.totalGrowthHours + (totalElapsed / 60)
                        }
                    };
                });
                const updatedBlock = get().blocks.find((b): b is GrowthBlock => b.id === id && b.type === 'GROWTH');
                if (updatedBlock && totalElapsed >= ACHIEVEMENT_TARGET_MINUTES) {
                    get().syncGrowthCompletion(updatedBlock, totalElapsed);
                }
            },

            syncGrowthStart: async (block) => {
                if (!isSupabaseConfigured || !supabaseClient) return;
                const { data } = await supabaseClient.auth.getUser();
                if (!data.user) return;
                const { error } = await supabaseClient.from('growth_events').insert({
                    user_id: data.user.id,
                    block_id: block.id,
                    title: block.title,
                    event_type: 'start',
                    elapsed_minutes: block.elapsedMinutes,
                    occurred_at: new Date().toISOString(),
                });
                if (error) {
                    console.error('[supabase] failed to insert growth_events (start)', error);
                }
            },

            syncGrowthPause: async (block, elapsedMinutes) => {
                if (!isSupabaseConfigured || !supabaseClient) return;
                const { data } = await supabaseClient.auth.getUser();
                if (!data.user) return;
                const { error } = await supabaseClient.from('growth_events').insert({
                    user_id: data.user.id,
                    block_id: block.id,
                    title: block.title,
                    event_type: 'pause',
                    elapsed_minutes: elapsedMinutes,
                    occurred_at: new Date().toISOString(),
                });
                if (!error) {
                    await supabaseClient.from('growth_progress').upsert({
                        user_id: data.user.id,
                        block_id: block.id,
                        elapsed_minutes: elapsedMinutes,
                        updated_at: new Date().toISOString(),
                    });
                }
                if (error) {
                    console.error('[supabase] failed to insert growth_events (pause)', error);
                }
            },

            syncGrowthProgress: async (block, elapsedMinutes) => {
                if (!isSupabaseConfigured || !supabaseClient) return;
                const { data } = await supabaseClient.auth.getUser();
                if (!data.user) return;
                const { error } = await supabaseClient.from('growth_events').insert({
                    user_id: data.user.id,
                    block_id: block.id,
                    title: block.title,
                    event_type: 'progress',
                    elapsed_minutes: elapsedMinutes,
                    occurred_at: new Date().toISOString(),
                });
                if (!error) {
                    await supabaseClient.from('growth_progress').upsert({
                        user_id: data.user.id,
                        block_id: block.id,
                        elapsed_minutes: elapsedMinutes,
                        updated_at: new Date().toISOString(),
                    });
                }
                if (error) {
                    console.error('[supabase] failed to insert growth_events (progress)', error);
                }
            },

            syncGrowthCompletion: async (block, totalElapsed) => {
                if (!isSupabaseConfigured || !supabaseClient) return;
                const { data } = await supabaseClient.auth.getUser();
                if (!data.user) return;
                const { error } = await supabaseClient.from('growth_sessions').insert({
                    user_id: data.user.id,
                    block_id: block.id,
                    title: block.title,
                    target_minutes: block.targetMinutes,
                    elapsed_minutes: totalElapsed,
                    completed_at: new Date().toISOString(),
                });
                if (!error) {
                    await supabaseClient.from('growth_events').insert({
                        user_id: data.user.id,
                        block_id: block.id,
                        title: block.title,
                        event_type: 'complete',
                        elapsed_minutes: totalElapsed,
                        occurred_at: new Date().toISOString(),
                    });
                    await supabaseClient.from('growth_progress').upsert({
                        user_id: data.user.id,
                        block_id: block.id,
                        elapsed_minutes: totalElapsed,
                        updated_at: new Date().toISOString(),
                    });
                }
                if (error) {
                    console.error('[supabase] failed to insert growth_sessions', error);
                }
            },

            loadProgressFromServer: async () => {
                if (!isSupabaseConfigured || !supabaseClient) return;
                const { data } = await supabaseClient.auth.getUser();
                if (!data.user) return;
                const { data: rows, error } = await supabaseClient
                    .from('growth_progress')
                    .select('block_id, elapsed_minutes')
                    .eq('user_id', data.user.id);
                if (error || !rows) return;
                set((state) => ({
                    blocks: state.blocks.map(b => {
                        if (b.type !== 'GROWTH' || b.status === 'COMPLETED') return b;
                        const row = rows.find(r => r.block_id === b.id);
                        if (!row) return b;
                        return { ...b, elapsedMinutes: Math.max(b.elapsedMinutes, row.elapsed_minutes) };
                    })
                }));
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

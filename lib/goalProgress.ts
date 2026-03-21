import { startOfWeek, endOfWeek, format } from 'date-fns';
import { Goal, TimeBlock, GrowthBlock } from '@/types';

export interface WeeklyGoalSummary {
    startDateStr: string;
    endDateStr: string;
    totalGoals: number;
    completedGoals: number;
    pendingGoals: number;
    progressByGoalId: Record<string, number>;
    completedGoalIds: string[];
}

export function getWeekRangeStrings(date: Date = new Date()) {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return {
        startDateStr: format(start, 'yyyy-MM-dd'),
        endDateStr: format(end, 'yyyy-MM-dd'),
    };
}

export function getWeeklyGoalSummary(goals: Goal[], blocks: TimeBlock[], date: Date = new Date()): WeeklyGoalSummary {
    const { startDateStr, endDateStr } = getWeekRangeStrings(date);

    const progressByGoalId: Record<string, number> = {};
    goals.forEach((g) => {
        progressByGoalId[g.id] = 0;
    });

    blocks.forEach((b) => {
        if (b.type !== 'GROWTH') return;
        if (b.date === null) return;
        if (b.date < startDateStr || b.date > endDateStr) return;
        const gb = b as GrowthBlock;
        progressByGoalId[gb.goalId] = (progressByGoalId[gb.goalId] || 0) + gb.durationMinutes;
    });

    const completedGoalIds = goals
        .filter((g) => progressByGoalId[g.id] >= g.targetMinutesPerWeek)
        .map((g) => g.id);

    const totalGoals = goals.length;
    const completedGoals = completedGoalIds.length;
    const pendingGoals = Math.max(0, totalGoals - completedGoals);

    return {
        startDateStr,
        endDateStr,
        totalGoals,
        completedGoals,
        pendingGoals,
        progressByGoalId,
        completedGoalIds,
    };
}

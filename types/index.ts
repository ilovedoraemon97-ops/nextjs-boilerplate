export type BlockType = 'GROWTH' | 'NORMAL';
export type BlockStatus = 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface BaseTimeBlock {
    id: string;
    type: BlockType;
    title: string;
    date: string | null; // YYYY-MM-DD for scheduled, null for unassigned
    startTime?: string; // HH:mm format
    endTime?: string; // HH:mm format
    durationMinutes: number; // Block length in minutes (e.g., 30, 60)
}

export interface GrowthBlock extends BaseTimeBlock {
    type: 'GROWTH';
    goalId: string;
    color: string;
    status: BlockStatus;
    targetMinutes: number;
    elapsedMinutes: number;
    isCarriedOver: boolean; // Indicates if block failed and carried from previous week
}

export interface NormalBlock extends BaseTimeBlock {
    type: 'NORMAL';
}

export type TimeBlock = GrowthBlock | NormalBlock;

export interface Goal {
    id: string;
    title: string;
    color: string;
    durationMinutes: number; // e.g., 60 minutes per session
    frequencyPerWeek: number; // e.g., 3 times/week
    createdAt: string;
}

export interface UserStats {
    level: number;
    streak: number;
    totalGrowthHours: number;
}

// Achievement card is issued after this many accumulated minutes.
export const ACHIEVEMENT_TARGET_MINUTES = 60;

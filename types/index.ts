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
    // Status and extra fields removed since all calendar blocks are post-facto executed sessions
}

export interface NormalBlock extends BaseTimeBlock {
    type: 'NORMAL';
}

export type TimeBlock = GrowthBlock | NormalBlock;

export interface Goal {
    id: string;
    title: string;
    color: string;
    targetMinutesPerWeek: number; // e.g., 300 minutes (5 hours) per week
    createdAt: string;
    pendingDeleteAt?: string | null; // YYYY-MM-DD (start of week to delete)
}

export interface UserStats {
    level: number;
    streak: number;
    totalGrowthHours: number;
}

export interface UserSettings {
    activeStartHour: number; // e.g. 9 for 09:00
    activeEndHour: number;   // e.g. 2 for 02:00
    timeAxisInterval: 1 | 3; // 1-hour or 3-hour intervals
}

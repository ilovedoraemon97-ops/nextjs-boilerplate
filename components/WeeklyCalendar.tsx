'use client';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { format, addDays, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { TimeBlock } from '@/types';

// Constants
const HOUR_HEIGHT = 60; // 60px per hour
const MINUTE_HEIGHT = HOUR_HEIGHT / 60; // 1px per minute

// --- Absolute Draggable Block ---
interface DraggableBlockProps {
    block: TimeBlock;
    onClick?: (block: TimeBlock) => void;
}

function AbsoluteDraggableBlock({ block, onClick }: DraggableBlockProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.id,
        data: block,
    });

    // Calculate absolute position
    const [h, m] = (block.startTime || '09:00').split(':').map(Number);
    const top = (h * 60 + m) * MINUTE_HEIGHT;
    const height = Math.max(block.durationMinutes, 30) * MINUTE_HEIGHT;

    const style = {
        top: `${top}px`,
        height: `${height}px`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 999 : 10,
    };

    const isGrowth = block.type === 'GROWTH';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onClick?.(block)}
            className={clsx(
                "absolute left-1 right-1 p-2 rounded-xl text-xs flex flex-col shadow-sm cursor-grab active:cursor-grabbing border-l-4 transition-transform overflow-hidden hover:z-50",
                isGrowth
                    ? block.isCarriedOver
                        ? "bg-failed-bg text-failed-hover border-failed-hover border-y border-r border-y-failed-hover/20 border-r-failed-hover/20"
                        : "bg-growth-bg text-growth-hover border-growth/40 border-y border-r border-y-growth/20 border-r-growth/20"
                    : "bg-normal-bg text-normal-hover border-normal/30 border-y border-r border-y-normal/20 border-r-normal/20"
            )}
        >
            <div className="flex items-center justify-between">
                <span className="font-bold truncate">{block.title}</span>
                {isGrowth && <span className="text-[10px] opacity-70 ml-1">🔥</span>}
            </div>
            {block.durationMinutes >= 60 && (
                <div className="flex items-center mt-1 text-[10px] opacity-80 font-semibold">
                    <Clock className="w-3 h-3 mr-1" />
                    {block.startTime}
                </div>
            )}
        </div>
    );
}

// --- Droppable Slot ---
function DroppableSlot({ id, top }: { id: string; top: number }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={clsx("absolute left-0 right-0 h-[30px] border-b border-border-subtle/10", isOver && "bg-primary/20 z-20")}
            style={{ top: `${top}px` }}
        />
    );
}

// --- Day Column ---
interface DayColumnProps {
    date: Date;
    blocks: TimeBlock[];
    onBlockClick?: (block: TimeBlock) => void;
}

function DayColumn({ date, blocks, onBlockClick }: DayColumnProps) {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Tetris Shift density logic (e.g. 5+ blocks in a day = highly dense)
    const isDense = blocks.length >= 5;

    return (
        <div className="flex-1 min-w-[70px] sm:min-w-[100px] flex flex-col border-r border-border-subtle last:border-r-0">
            {/* Header */}
            <div className="p-2 text-center border-b border-border-subtle sticky top-0 bg-bg-surface z-40 h-16 shadow-sm">
                <div className="text-[10px] sm:text-xs font-bold text-text-muted">
                    {format(date, 'EEE', { locale: ko })}
                </div>
                <div className={clsx(
                    "text-sm sm:text-lg font-black mt-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mx-auto",
                    format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? "bg-primary text-white"
                        : "text-text-base"
                )}>
                    {format(date, 'd')}
                </div>
                {isDense && (
                    <div className="absolute top-2 right-2 flex space-x-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow"></div>
                    </div>
                )}
            </div>

            {/* Grid Area */}
            <div className="relative flex-1 bg-bg-base overflow-hidden" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                {/* 24 Hour Lines */}
                {Array.from({ length: 24 }).map((_, i) => (
                    <div key={`line-${i}`} className="absolute left-0 right-0 border-b border-border-subtle/50" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                        {/* Only show times loosely if we want, or rely on a global axis */}
                    </div>
                ))}

                {/* 48 Droppable Slots (30 min increments) */}
                {Array.from({ length: 48 }).map((_, i) => {
                    const h = Math.floor(i / 2).toString().padStart(2, '0');
                    const m = i % 2 === 0 ? '00' : '30';
                    const slotId = `${dateStr}-${h}:${m}`;
                    return <DroppableSlot key={slotId} id={slotId} top={i * 30} />;
                })}

                {/* Render Absolute Blocks on top */}
                {blocks.map(b => (
                    <AbsoluteDraggableBlock key={b.id} block={b} onClick={onBlockClick} />
                ))}
            </div>
        </div>
    );
}

// --- Main Calendar ---
interface WeeklyCalendarProps {
    onBlockClick?: (block: TimeBlock) => void;
    onAddNormalBlock?: (dateStr: string) => void;
}

export default function WeeklyCalendar({ onBlockClick, onAddNormalBlock }: WeeklyCalendarProps) {
    const blocks = useDoneDayStore(state => state.blocks);

    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    return (
        <div className="bg-bg-surface rounded-2xl border border-border-subtle overflow-hidden shadow-sm flex flex-col h-[70vh]">
            <div className="px-4 py-3 bg-bg-surface-hover border-b border-border-subtle flex items-center justify-between z-50">
                <h2 className="font-bold flex items-center text-text-base">
                    <CalendarIcon className="w-4 h-4 mr-1.5 text-primary" />
                    이번 주 일정
                </h2>
                <div className="flex items-center space-x-2 text-xs font-semibold text-text-muted">
                    <button onClick={() => onAddNormalBlock?.(format(new Date(), 'yyyy-MM-dd'))} className="bg-bg-base hover:bg-border-subtle px-2 py-1 rounded-md transition-colors border border-border-subtle">
                        + 일반 일정
                    </button>
                    <span className="bg-bg-base px-2 py-1 rounded-md border border-border-subtle">
                        {format(startDate, 'M.d')} - {format(weekDates[6], 'M.d')}
                    </span>
                </div>
            </div>

            {/* Scrollable Container for the whole grid */}
            <div className="flex-1 overflow-y-auto overflow-x-auto relative">
                <div className="flex min-w-[700px]">
                    {/* Time Axis */}
                    <div className="w-[50px] flex-shrink-0 bg-bg-surface border-r border-border-subtle flex flex-col" style={{ paddingTop: '64px' }}>
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={`axis-${i}`} className="relative text-[10px] font-bold text-text-muted text-right pr-2" style={{ height: HOUR_HEIGHT }}>
                                <span className="absolute -top-1.5 right-2">{i.toString().padStart(2, '0')}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {weekDates.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dayBlocks = blocks.filter(b => b.date === dateStr);
                        return (
                            <DayColumn
                                key={dateStr}
                                date={date}
                                blocks={dayBlocks}
                                onBlockClick={onBlockClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

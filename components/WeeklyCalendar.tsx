'use client';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { format, addDays, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { TimeBlock } from '@/types';

// --- Utilities ---
function getTopPercent(timeStr: string | undefined, activeStartHour: number, activeEndHour: number, totalActiveMins: number) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const blockMins = h * 60 + m;
    const startMins = activeStartHour * 60;
    const endMins = activeEndHour * 60;

    let offsetMins = 0;
    if (activeStartHour === activeEndHour) {
        offsetMins = (blockMins >= startMins) ? (blockMins - startMins) : (24 * 60 - startMins + blockMins);
    } else if (activeStartHour > activeEndHour) {
        if (blockMins >= startMins) { offsetMins = blockMins - startMins; }
        else if (blockMins <= endMins) { offsetMins = (24 * 60 - startMins) + blockMins; }
        else return null;
    } else {
        if (blockMins >= startMins && blockMins <= endMins) { offsetMins = blockMins - startMins; }
        else return null;
    }
    return (offsetMins / totalActiveMins) * 100;
}

// --- Absolute Draggable Block ---
interface DraggableBlockProps {
    block: TimeBlock;
    activeStartHour: number;
    activeEndHour: number;
    totalActiveMins: number;
    onClick?: (block: TimeBlock) => void;
}

function AbsoluteDraggableBlock({ block, activeStartHour, activeEndHour, totalActiveMins, onClick }: DraggableBlockProps) {
    const isGrowth = block.type === 'GROWTH';
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.id,
        data: block,
        disabled: isGrowth,
    });

    const topPercent = getTopPercent(block.startTime, activeStartHour, activeEndHour, totalActiveMins);
    if (topPercent === null) return null; // hide if outside window

    const heightPercent = (Math.max(block.durationMinutes, 15) / totalActiveMins) * 100;

    const style = {
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 999 : 10,
    };

    const colorClass = isGrowth ? (block.color || 'bg-primary') : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onClick?.(block)}
            className={clsx(
                "absolute left-[1px] right-[1px] p-[2px] sm:p-1 rounded-[3px] sm:rounded-md text-[7px] sm:text-[9.5px] leading-tight flex flex-col border-l-[1.5px] sm:border-l-2 transition-all overflow-hidden hover:z-50 shadow-sm outline outline-1 outline-bg-base",
                isGrowth ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                isGrowth
                    ? `${colorClass} border-white border-[0.5px] text-white border-l-white/50 backdrop-blur-sm`
                    : "bg-normal-bg text-normal-hover border-normal border-white border-[0.5px] border-l-normal"
            )}
        >
            <div className="flex items-start sm:items-center justify-between">
                <span className="font-semibold truncate tracking-tight">{block.title}</span>
            </div>
            {block.durationMinutes >= 60 && (
                <div className="flex items-center mt-[-1px] sm:mt-[1px] text-[6.5px] sm:text-[8px] opacity-70 font-medium tracking-tight">
                    <Clock className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] mr-[1px] sm:mr-0.5" />
                    {block.startTime}
                </div>
            )}
        </div>
    );
}

// --- Droppable Slot ---
function DroppableSlot({ id, topPercent, totalActiveHours }: { id: string; topPercent: number; totalActiveHours: number }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={clsx("absolute left-0 right-0 border-b border-border-subtle/10", isOver && "bg-primary/20 z-20")}
            style={{ top: `${topPercent}%`, height: `${100 / (totalActiveHours * 2)}%` }}
        />
    );
}

// --- Day Column ---
interface DayColumnProps {
    date: Date;
    blocks: TimeBlock[];
    activeStartHour: number;
    activeEndHour: number;
    totalActiveHours: number;
    onBlockClick?: (block: TimeBlock) => void;
}

function DayColumn({ date, blocks, activeStartHour, activeEndHour, totalActiveHours, onBlockClick }: DayColumnProps) {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Tetris Shift density logic (e.g. 5+ blocks in a day = highly dense)
    const isDense = blocks.length >= 5;

    return (
        <div className="flex-1 flex flex-col min-w-0 border-r border-border-subtle last:border-r-0 relative">
            {/* Header */}
            <div className="p-1 sm:p-2 text-center border-b border-border-strong bg-bg-surface z-40 h-10 sm:h-14 flex flex-col justify-center flex-shrink-0 relative">
                <div className="text-[8px] sm:text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {format(date, 'EEE', { locale: ko })}
                </div>
                <div className={clsx(
                    "text-[10px] sm:text-xs font-semibold mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center mx-auto transition-colors",
                    format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-base"
                )}>
                    {format(date, 'd')}
                </div>
                {isDense && (
                    <div className="absolute top-1 right-1 flex space-x-0.5">
                        <div className="w-1 h-1 rounded-full bg-border-strong"></div>
                    </div>
                )}
            </div>

            {/* Grid Area */}
            <div className="relative flex-1 bg-bg-base w-full">
                {/* 1 Hour Lines */}
                {Array.from({ length: totalActiveHours }).map((_, i) => (
                    <div key={`line-${i}`} className="absolute left-0 right-0 border-t border-border-subtle/40" style={{ top: `${(i / totalActiveHours) * 100}%`, height: `${(1 / totalActiveHours) * 100}%` }} />
                ))}

                {/* Droppable Slots (30 min increments) */}
                {Array.from({ length: totalActiveHours * 2 }).map((_, i) => {
                    const offsetAbsoluteMins = (activeStartHour * 60) + i * 30;
                    const finalMins = offsetAbsoluteMins % (24 * 60);
                    const h = Math.floor(finalMins / 60).toString().padStart(2, '0');
                    const m = (finalMins % 60 === 0) ? '00' : '30';
                    const slotId = `${dateStr}-${h}:${m}`;
                    return <DroppableSlot key={slotId} id={slotId} topPercent={(i / (totalActiveHours * 2)) * 100} totalActiveHours={totalActiveHours} />;
                })}

                {/* Render Absolute Blocks on top */}
                {blocks.map(b => (
                    <AbsoluteDraggableBlock
                        key={b.id}
                        block={b}
                        activeStartHour={activeStartHour}
                        activeEndHour={activeEndHour}
                        totalActiveMins={totalActiveHours * 60}
                        onClick={onBlockClick}
                    />
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
    const settings = useDoneDayStore(state => state.settings);
    const { activeStartHour, activeEndHour, timeAxisInterval = 3 } = settings;

    let totalActiveHours = 24;
    if (activeStartHour !== activeEndHour) {
        totalActiveHours = activeStartHour > activeEndHour
            ? (24 - activeStartHour) + activeEndHour
            : activeEndHour - activeStartHour;
    }

    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    return (
        <div className="bg-bg-surface rounded-xl border border-border-strong flex flex-col flex-1 w-full h-full min-h-0">
            {/* Header */}
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-bg-surface border-b border-border-strong flex items-center justify-between z-50 flex-shrink-0">
                <h2 className="font-semibold text-[13px] sm:text-sm flex items-center text-text-base tracking-tight">
                    <CalendarIcon className="w-4 h-4 mr-1 sm:mr-1.5 text-text-muted" />
                    이번 주 일정
                </h2>
                <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] sm:text-xs font-medium text-text-muted">
                    <span className="text-[9px] sm:text-[10px] border border-border-strong px-1.5 py-0.5 rounded-md text-text-muted">
                        {format(startDate, 'M.d')} - {format(weekDates[6], 'M.d')}
                    </span>
                </div>
            </div>

            {/* Container for the whole grid - Fits parent exactly */}
            <div className="flex-1 relative flex flex-col min-h-0 bg-bg-base overflow-hidden">
                <div className="flex w-full h-full absolute inset-0">
                    {/* Time Axis */}
                    <div className="w-[18px] sm:w-[24px] flex-shrink-0 bg-bg-surface border-r border-border-subtle flex flex-col relative z-20">
                        <div className="h-10 sm:h-14 border-b border-border-strong bg-bg-surface flex-shrink-0 text-center"></div>
                        <div className="relative flex-1">
                            {Array.from({ length: Math.floor(totalActiveHours / timeAxisInterval) + 1 }).map((_, i) => {
                                const hour = (activeStartHour + i * timeAxisInterval) % 24;
                                const topPct = ((i * timeAxisInterval) / totalActiveHours) * 100;
                                if (topPct > 100) return null;
                                return (
                                    <div key={`axis-${i}`} className="absolute w-full text-[6px] sm:text-[8px] font-medium text-text-muted text-right pr-0.5 sm:pr-1 leading-none shadow-none" style={{ top: `${topPct}%`, transform: topPct >= 99 ? 'translateY(-100%)' : 'translateY(-50%)' }}>
                                        {hour}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Day Columns */}
                    <div className="flex flex-1 w-full h-full min-w-0">
                        {weekDates.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const dayBlocks = blocks.filter(b => b.date === dateStr);
                            return (
                                <DayColumn
                                    key={dateStr}
                                    date={date}
                                    blocks={dayBlocks}
                                    activeStartHour={activeStartHour}
                                    activeEndHour={activeEndHour}
                                    totalActiveHours={totalActiveHours}
                                    onBlockClick={onBlockClick}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

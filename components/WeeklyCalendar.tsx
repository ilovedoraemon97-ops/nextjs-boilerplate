'use client';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { format, addDays, startOfWeek, addWeeks, startOfMonth, endOfMonth, startOfWeek as startOfWeekDf, endOfWeek as endOfWeekDf, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
// Drag/drop disabled for schedule blocks
import { useState } from 'react';
import { clsx } from 'clsx';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    layout?: { left: number; width: number; zIndex: number };
    onClick?: (block: TimeBlock) => void;
}

function AbsoluteDraggableBlock({ block, activeStartHour, activeEndHour, totalActiveMins, layout, onClick }: DraggableBlockProps) {
    const isGrowth = block.type === 'GROWTH';

    const topPercent = getTopPercent(block.startTime, activeStartHour, activeEndHour, totalActiveMins);
    if (topPercent === null) return null; // hide if outside window

    const isShort = block.durationMinutes <= 30;
    const heightPercent = (block.durationMinutes / totalActiveMins) * 100;

    const leftStr = layout ? `calc(${layout.left}% + 1px)` : '1px';
    const widthStr = layout ? `calc(${layout.width}% - 2px)` : 'calc(100% - 2px)';
    const baseZIndex = layout ? layout.zIndex : 10;

    const style = {
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        minHeight: isShort ? '20px' : undefined,
        left: leftStr,
        width: widthStr,
        zIndex: baseZIndex,
    };

    const colorClass = isGrowth ? (block.color || 'bg-growth') : '';

    return (
        <div
            style={style}
            onClick={() => onClick?.(block)}
            className={clsx(
                "absolute transition-all overflow-hidden hover:z-[60] shadow-[0_1px_3px_rgba(0,0,0,0.12)] cursor-pointer backdrop-blur-sm",
                isShort
                    ? "rounded-[4px] sm:rounded-md text-[8px] sm:text-[10px] flex items-center font-bold px-1.5 py-0 border-l-[3px] sm:border-l-[4px]"
                    : "rounded-[6px] sm:rounded-lg text-[9px] sm:text-[11px] leading-tight flex flex-col p-1.5 sm:p-2 border-l-[3px] sm:border-l-[4px]",
                isGrowth
                    ? `${colorClass} border-white/20 text-white outline outline-[0.5px] outline-white/10`
                    : "bg-bg-surface/90 border-border-strong text-text-base border-l-normal hover:bg-bg-surface-hover outline outline-[0.5px] outline-border-subtle"
            )}
        >
            <div className={clsx("flex items-start justify-between w-full h-full", isShort && "items-center")}>
                <span className="font-bold truncate tracking-tight opacity-95">{block.title}</span>
            </div>
        </div>
    );
}

// --- Droppable Slot ---
function DroppableSlot({ topPercent, totalActiveHours }: { topPercent: number; totalActiveHours: number }) {
    return (
        <div
            className="absolute left-0 right-0 border-b border-border-subtle/10"
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
    const totalActiveMins = totalActiveHours * 60;

    // Tetris Shift density logic (e.g. 5+ blocks in a day = highly dense)
    const isDense = blocks.length >= 5;

    // --- Cascade Overlap Algorithm ---
    const validBlocks = blocks.map(b => {
        const topPercent = getTopPercent(b.startTime, activeStartHour, activeEndHour, totalActiveMins);
        return { block: b, topPercent };
    }).filter(b => b.topPercent !== null);

    // Sort by start time, then duration descending
    validBlocks.sort((a, b) => {
        if (Math.abs(a.topPercent! - b.topPercent!) > 0.1) return a.topPercent! - b.topPercent!;
        return b.block.durationMinutes - a.block.durationMinutes;
    });

    const layoutMap = new Map<string, { left: number, width: number, zIndex: number }>();
    validBlocks.forEach((vb, i) => {
        const startP = vb.topPercent!;
        const endP = startP + (vb.block.durationMinutes / totalActiveMins) * 100;

        const overlaps = validBlocks.slice(0, i).filter(prev => {
            const pStartP = prev.topPercent!;
            const pEndP = pStartP + (prev.block.durationMinutes / totalActiveMins) * 100;
            return startP < pEndP && endP > pStartP;
        });

        // Max depth mapping to indent properly
        const depth = overlaps.length;
        // Limit visual indent to 4 steps max to avoid squishing
        const indentStep = Math.min(depth, 4);

        layoutMap.set(vb.block.id, {
            left: indentStep * 15, // 15% indent per overlap level
            width: 100 - (indentStep * 15),
            zIndex: 10 + depth,
        });
    });

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
                    return <DroppableSlot key={`${dateStr}-${h}:${m}`} topPercent={(i / (totalActiveHours * 2)) * 100} totalActiveHours={totalActiveHours} />;
                })}

                {/* Render Absolute Blocks on top */}
                {blocks.map(b => (
                    <AbsoluteDraggableBlock
                        key={b.id}
                        block={b}
                        activeStartHour={activeStartHour}
                        activeEndHour={activeEndHour}
                        totalActiveMins={totalActiveHours * 60}
                        layout={layoutMap.get(b.id)}
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

    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
    const [hoverWeekStart, setHoverWeekStart] = useState<Date | null>(null);

    let totalActiveHours = 24;
    if (activeStartHour !== activeEndHour) {
        totalActiveHours = activeStartHour > activeEndHour
            ? (24 - activeStartHour) + activeEndHour
            : activeEndHour - activeStartHour;
    }

    const startDate = weekStart; // Monday
    const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
    const endDate = weekDates[6];
    const startYear = Number(format(startDate, 'yy'));
    const endYear = Number(format(endDate, 'yy'));
    const startLabel = format(startDate, 'MM.dd');
    const endLabel = format(endDate, 'MM.dd');
    const rangeLabel = startYear === endYear
        ? `${format(startDate, 'yy')}.${startLabel}-${endLabel}`
        : `${format(startDate, 'yy')}.${startLabel}-${format(endDate, 'yy')}.${endLabel}`;
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const currentWeekEnd = addDays(currentWeekStart, 6);
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    const gridStart = startOfWeekDf(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeekDf(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
        days.push(d);
    }

    return (
        <div className="bg-bg-surface rounded-xl border border-border-strong flex flex-col flex-1 w-full h-full min-h-0">
            {/* Header */}
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-bg-surface border-b border-border-strong flex items-center justify-between z-50 flex-shrink-0">
                <h2 className="font-semibold text-[13px] sm:text-sm flex items-center text-text-base tracking-tight">
                    <CalendarIcon className="w-4 h-4 mr-1 sm:mr-1.5 text-text-muted" />
                    이번 주 일정
                </h2>
                <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] sm:text-xs font-medium text-text-muted">
                    <button
                        onClick={() => setWeekStart((d) => addWeeks(d, -1))}
                        className="p-1 rounded-md hover:bg-bg-surface-hover transition-colors"
                        aria-label="이전 주"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { setMonthCursor(startOfMonth(startDate)); setIsMonthOpen(true); }}
                        className="text-[9px] sm:text-[10px] border border-border-strong px-1.5 py-0.5 rounded-md text-text-muted hover:bg-bg-surface-hover transition-colors"
                        aria-label="월간 달력 열기"
                    >
                        {rangeLabel}
                    </button>
                    <button
                        onClick={() => setWeekStart((d) => addWeeks(d, 1))}
                        className="p-1 rounded-md hover:bg-bg-surface-hover transition-colors"
                        aria-label="다음 주"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Container for the whole grid - Fits parent exactly */}
            <div className="flex-1 relative flex flex-col min-h-0 bg-bg-base overflow-hidden pb-12">
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
                            const dayBlocks = blocks.filter(b => b.date === dateStr && !(b.type === 'GROWTH' && b.hidden));
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

            {isMonthOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsMonthOpen(false)}>
                    <div className="bg-bg-surface w-full max-w-sm rounded-2xl shadow-lg border border-border-strong overflow-hidden animate-pop relative" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-border-subtle bg-bg-base space-y-3 relative pr-10">
                            <button
                                onClick={() => setIsMonthOpen(false)}
                                className="absolute top-3 right-3 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors"
                                aria-label="닫기"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setMonthCursor((d) => subMonths(d, 1))}
                                    className="p-1 rounded-md hover:bg-bg-surface-hover transition-colors"
                                    aria-label="이전 달"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="text-sm font-bold text-text-base">
                                    {format(monthCursor, 'yyyy.MM')}
                                </div>
                                <button
                                    onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                                    className="p-1 rounded-md hover:bg-bg-surface-hover transition-colors"
                                    aria-label="다음 달"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-center space-x-2 text-xs">
                                <span className="text-text-muted font-medium">바로 이동하기</span>
                                <select
                                    value={Number(format(monthCursor, 'yyyy'))}
                                    onChange={(e) => {
                                        const y = Number(e.target.value);
                                        const m = Number(format(monthCursor, 'M')) - 1;
                                        const next = new Date(monthCursor);
                                        next.setFullYear(y, m, 1);
                                        setMonthCursor(startOfMonth(next));
                                    }}
                                    className="bg-bg-surface border border-border-subtle rounded-lg px-2 py-1 text-center font-semibold text-text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    {Array.from({ length: 10 }).map((_, i) => {
                                        const year = 2020 + i;
                                        return <option key={year} value={year}>{year}</option>;
                                    })}
                                </select>
                                <span className="text-text-muted font-medium">년</span>
                                <select
                                    value={Number(format(monthCursor, 'M'))}
                                    onChange={(e) => {
                                        const y = Number(format(monthCursor, 'yyyy'));
                                        const m = Number(e.target.value) - 1;
                                        const next = new Date(monthCursor);
                                        next.setFullYear(y, m, 1);
                                        setMonthCursor(startOfMonth(next));
                                    }}
                                    className="bg-bg-surface border border-border-subtle rounded-lg px-2 py-1 text-center font-semibold text-text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const month = i + 1;
                                        return <option key={month} value={month}>{month}</option>;
                                    })}
                                </select>
                                <span className="text-text-muted font-medium">월</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-7 text-[10px] text-text-muted mb-2">
                                {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
                                    <div key={d} className="text-center font-semibold">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-rows-6 gap-1">
                                {Array.from({ length: Math.ceil(days.length / 7) }).map((_, rowIdx) => {
                                    const weekDays = days.slice(rowIdx * 7, rowIdx * 7 + 7);
                                    const weekStartDate = weekDays[0];
                                    const isActiveWeek = isSameDay(weekStartDate, startDate);
                                    const isCurrentWeek = isSameDay(weekStartDate, currentWeekStart);
                                    const hoverStart = hoverWeekStart ? startOfWeekDf(hoverWeekStart, { weekStartsOn: 1 }) : null;
                                    const hoverEnd = hoverStart ? addDays(hoverStart, 6) : null;
                                    const isHoverWeek = hoverStart && hoverEnd ? isWithinInterval(weekStartDate, { start: hoverStart, end: hoverEnd }) : false;
                                    return (
                                        <div
                                            key={`week-${rowIdx}`}
                                            className="relative grid grid-cols-7 gap-1"
                                            onMouseEnter={() => setHoverWeekStart(weekStartDate)}
                                            onMouseLeave={() => setHoverWeekStart(null)}
                                        >
                                            {(isActiveWeek || isCurrentWeek || isHoverWeek) && (
                                                <div
                                                    className={clsx(
                                                        "absolute inset-y-0 left-0 right-0 rounded-md",
                                                        isActiveWeek
                                                            ? "bg-text-base/10 ring-2 ring-text-base/30"
                                                            : isCurrentWeek
                                                                ? "bg-text-base/15 ring-2 ring-text-base/25"
                                                                : "bg-text-base/5"
                                                    )}
                                                />
                                            )}
                                            {weekDays.map((d) => {
                                                const inMonth = isSameMonth(d, monthCursor);
                                                const isToday = isSameDay(d, new Date());
                                                return (
                                                    <button
                                                        key={d.toISOString()}
                                                        onClick={() => {
                                                            setWeekStart(startOfWeekDf(d, { weekStartsOn: 1 }));
                                                            setIsMonthOpen(false);
                                                        }}
                                                        className={clsx(
                                                            "h-8 rounded-md text-[11px] font-semibold transition-colors relative",
                                                            inMonth ? "text-text-base" : "text-text-muted/50",
                                                            "hover:bg-bg-surface-hover",
                                                            isToday && "outline outline-1 outline-primary/40"
                                                        )}
                                                    >
                                                        {format(d, 'd')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="px-4 pb-4">
                            <button
                                onClick={() => {
                                    const now = new Date();
                                    setMonthCursor(startOfMonth(now));
                                    setWeekStart(startOfWeekDf(now, { weekStartsOn: 1 }));
                                    setIsMonthOpen(false);
                                }}
                                className="w-full bg-bg-surface-hover border border-border-strong text-text-base rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
                            >
                                이번주로 이동
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

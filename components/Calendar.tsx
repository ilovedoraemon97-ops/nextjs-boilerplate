"use client";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

import { ScheduleEvent } from "@/hooks/useSchedule";

interface CalendarProps {
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    eventsRecord?: Record<string, ScheduleEvent[]>;
    formatDateString?: (date: Date) => string;
}

export default function Calendar({
    currentMonth,
    onMonthChange,
    selectedDate,
    onSelectDate,
    eventsRecord,
    formatDateString
}: CalendarProps) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => {
        onMonthChange(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        onMonthChange(new Date(year, month + 1, 1));
    };

    const handleDateClick = (day: number) => {
        onSelectDate(new Date(year, month, day));
    };

    // Generate blank spaces for days before the 1st of the month
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    // Generate days of the month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const today = new Date();
    const isToday = (day: number) => {
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    };

    const isSelected = (day: number) => {
        if (!selectedDate) return false;
        return (
            day === selectedDate.getDate() &&
            month === selectedDate.getMonth() &&
            year === selectedDate.getFullYear()
        );
    };

    return (
        <div className="w-full bg-bg-surface rounded-2xl shadow-sm border border-border-subtle p-6 animate-fade-in transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-text-base tracking-tight">
                    {MONTHS[month]} {year}
                </h2>
                <div className="flex space-x-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-lg hover:bg-bg-surface-hover text-text-muted hover:text-text-base transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-bg-surface-hover text-text-muted hover:text-text-base transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="text-center font-medium text-sm text-text-muted py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {blanks.map((_, i) => (
                    <div key={`blank-${i}`} className="p-2 min-h-[80px]" />
                ))}
                {days.map((day) => {
                    // Check if this specific day has events
                    const thisDate = new Date(year, month, day);
                    const dateStr = formatDateString ? formatDateString(thisDate) : '';
                    const hasEvents = eventsRecord && eventsRecord[dateStr] && eventsRecord[dateStr].length > 0;

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`
                relative min-h-[80px] p-2 flex flex-col items-start justify-start rounded-xl border
                transition-all duration-200 ease-in-out group cursor-pointer
                ${isSelected(day)
                                    ? 'border-primary ring-1 ring-primary bg-primary/5'
                                    : 'border-transparent hover:border-border-subtle hover:bg-bg-surface-hover hover:shadow-sm'}
              `}
                        >
                            <span
                                className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                  ${isToday(day)
                                        ? 'bg-primary text-white shadow-md shadow-primary/30 z-10'
                                        : isSelected(day) ? 'text-primary font-bold z-10' : 'text-text-base group-hover:text-primary z-10'}
                `}
                            >
                                {day}
                            </span>

                            {/* Event Indicator Dot */}
                            {hasEvents && (
                                <div className="absolute top-4 right-3 w-1.5 h-1.5 bg-accent rounded-full animate-fade-in" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

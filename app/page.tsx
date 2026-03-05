"use client";

import { useState } from "react";
import Calendar from "@/components/Calendar";
import ScheduleModal from "@/components/ScheduleModal";
import { useSchedule, ScheduleEvent } from "@/hooks/useSchedule";

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | undefined>(undefined);

  const {
    events,
    isLoaded,
    addEvent,
    updateEvent,
    deleteEvent,
    formatDateString
  } = useSchedule();

  const handleSaveEvent = (eventData: Omit<ScheduleEvent, "id"> | ScheduleEvent) => {
    if ('id' in eventData) {
      updateEvent(eventData as ScheduleEvent);
    } else {
      addEvent(eventData);
    }
  };

  const handleEditClick = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingEvent(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, dateStr: string) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteEvent(id, dateStr);
    }
  };

  const selectedDateStr = formatDateString(selectedDate);
  const todaysEvents = events[selectedDateStr] || [];

  return (
    <div className="flex flex-col gap-8 animate-slide-up">
      <header className="py-4">
        <h1 className="text-3xl font-bold tracking-tight text-text-base">
          Schedule Manager
        </h1>
        <p className="text-text-muted mt-2">
          Manage your tasks and events seamlessly.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Calendar
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            eventsRecord={events}
            formatDateString={formatDateString}
          />
        </div>

        <div className="lg:col-span-1 border-l border-border-subtle pl-0 lg:pl-8">
          <div className="bg-bg-surface rounded-2xl shadow-sm border border-border-subtle p-6 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-text-base">
                {selectedDate.toLocaleDateString('default', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <button
                onClick={handleAddClick}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                title="Add schedule"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>

            {!isLoaded ? (
              <div className="flex items-center justify-center flex-1 text-text-muted text-sm animate-pulse">
                Loading schedules...
              </div>
            ) : todaysEvents.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {todaysEvents.map(event => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl border border-border-subtle hover:border-border-strong hover:shadow-sm transition-all bg-bg-surface group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-text-base">{event.title}</h4>
                      <div className="flex space-x-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(event)}
                          className="p-1 text-text-muted hover:text-primary transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(event.id, event.date)}
                          className="p-1 text-text-muted hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center text-sm font-medium text-primary mb-2">
                      <svg className="w-4 h-4 mr-1 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {event.time}
                    </div>
                    {event.description && (
                      <p className="text-sm text-text-muted line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-10 opacity-60">
                <svg className="w-16 h-16 text-border-strong mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-text-muted font-medium mb-1">No schedules</p>
                <p className="text-sm text-text-muted/60">Take a break or add a new event</p>
                <button
                  onClick={handleAddClick}
                  className="mt-6 px-5 py-2.5 bg-bg-surface-hover hover:bg-border-subtle text-text-base rounded-xl transition-colors font-medium cursor-pointer border border-border-subtle"
                >
                  Create Schedule
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        initialData={editingEvent}
        selectedDateStr={selectedDateStr}
      />
    </div>
  );
}

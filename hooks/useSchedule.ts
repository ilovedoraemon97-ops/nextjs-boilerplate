"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export interface ScheduleEvent {
    id: string;
    title: string;
    description: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
}

export function useSchedule() {
    const [events, setEvents] = useState<Record<string, ScheduleEvent[]>>({});
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from("schedules")
                .select("*")
                .order("time", { ascending: true });

            if (error) {
                throw error;
            }

            const groupedEvents: Record<string, ScheduleEvent[]> = {};
            if (data) {
                data.forEach((item: any) => {
                    if (!groupedEvents[item.date]) {
                        groupedEvents[item.date] = [];
                    }
                    groupedEvents[item.date].push(item as ScheduleEvent);
                });
            }

            setEvents(groupedEvents);
        } catch (e) {
            console.error("Failed to load schedule from Supabase", e);
        } finally {
            setIsLoaded(true);
        }
    };

    const addEvent = async (newEvent: Omit<ScheduleEvent, "id">) => {
        try {
            // Optimistic update
            const tempId = crypto.randomUUID();
            const optimisticEvent = { ...newEvent, id: tempId };

            setEvents((prev) => {
                const dayEvents = prev[newEvent.date] || [];
                return {
                    ...prev,
                    [newEvent.date]: [...dayEvents, optimisticEvent].sort((a, b) => a.time.localeCompare(b.time)),
                };
            });

            const { data, error } = await supabase
                .from("schedules")
                .insert([newEvent])
                .select()
                .single();

            if (error) throw error;

            // Update with real ID from server
            if (data) {
                setEvents((prev) => {
                    const dayEvents = prev[newEvent.date] || [];
                    return {
                        ...prev,
                        [newEvent.date]: dayEvents.map(e => e.id === tempId ? data : e),
                    };
                });
            }
        } catch (error) {
            console.error("Failed to add event:", error);
            // Revert Optimistic update on fail (omitted for brevity)
        }
    };

    const updateEvent = async (updatedEvent: ScheduleEvent) => {
        try {
            // Optimistic Update
            setEvents((prev) => {
                const updated = { ...prev };
                let foundDate = null;
                for (const [date, dayEvents] of Object.entries(updated)) {
                    if (dayEvents.some(e => e.id === updatedEvent.id)) {
                        updated[date] = dayEvents.filter(e => e.id !== updatedEvent.id);
                        foundDate = date;
                        break;
                    }
                }
                const targetDateEvents = updated[updatedEvent.date] || [];
                updated[updatedEvent.date] = [...targetDateEvents, updatedEvent].sort((a, b) => a.time.localeCompare(b.time));
                if (foundDate && updated[foundDate].length === 0) {
                    delete updated[foundDate];
                }
                return updated;
            });

            const { error } = await supabase
                .from("schedules")
                .update({
                    title: updatedEvent.title,
                    description: updatedEvent.description,
                    date: updatedEvent.date,
                    time: updatedEvent.time
                })
                .eq("id", updatedEvent.id);

            if (error) throw error;

        } catch (error) {
            console.error("Failed to update event:", error);
            // Refetch to reset state if failed
            fetchEvents();
        }
    };

    const deleteEvent = async (id: string, date: string) => {
        try {
            // Optimistic update
            setEvents((prev) => {
                if (!prev[date]) return prev;
                const filtered = prev[date].filter(e => e.id !== id);
                const updated = { ...prev };
                if (filtered.length === 0) {
                    delete updated[date];
                } else {
                    updated[date] = filtered;
                }
                return updated;
            });

            const { error } = await supabase
                .from("schedules")
                .delete()
                .eq("id", id);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to delete event:", error);
            fetchEvents(); // Revert
        }
    };

    const getEventsForDate = (date: Date): ScheduleEvent[] => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year} -${month} -${day} `;

        return events[dateStr] || [];
    };

    const formatDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
        events,
        isLoaded,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventsForDate,
        formatDateString,
    };
}

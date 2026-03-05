"use client";

import { useState, useEffect } from "react";
import { ScheduleEvent } from "@/hooks/useSchedule";

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Omit<ScheduleEvent, "id"> | ScheduleEvent) => void;
    initialData?: ScheduleEvent;
    selectedDateStr: string; // YYYY-MM-DD
}

export default function ScheduleModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    selectedDateStr,
}: ScheduleModalProps) {
    const [title, setTitle] = useState("");
    const [time, setTime] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setTime(initialData.time);
            setDescription(initialData.description);
        } else {
            setTitle("");
            // Round to next hour for default time
            const now = new Date();
            now.setHours(now.getHours() + 1);
            const hours = String(now.getHours()).padStart(2, "0");
            setTime(`${hours}:00`);
            setDescription("");
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !time) return;

        const eventData = {
            ...(initialData ? { id: initialData.id } : {}),
            title,
            time,
            description,
            date: selectedDateStr,
        };

        onSave(eventData as Omit<ScheduleEvent, "id"> | ScheduleEvent);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
            <div
                className="w-full max-w-md bg-bg-surface rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-border-subtle"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                    <h2 className="text-xl font-semibold text-text-base">
                        {initialData ? "Edit Schedule" : "New Schedule"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-base transition-colors rounded-lg p-1 hover:bg-bg-surface-hover cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-border-strong rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-transparent text-text-base"
                            placeholder="e.g. Design Sync"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Time</label>
                        <input
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-4 py-2 border border-border-strong rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-transparent text-text-base cursor-text [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-border-strong rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-transparent text-text-base resize-none"
                            placeholder="Add details about the event..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-text-muted hover:text-text-base rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary-hover shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                            disabled={!title.trim() || !time}
                        >
                            {initialData ? "Save Changes" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

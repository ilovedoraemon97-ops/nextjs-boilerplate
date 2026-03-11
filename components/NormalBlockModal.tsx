'use client';
import { useState } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    targetDate: string | null;
}

export default function NormalBlockModal({ isOpen, onClose, targetDate }: Props) {
    const addNormalBlock = useDoneDayStore((state) => state.addNormalBlock);

    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');

    if (!isOpen || !targetDate) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        // Calculate duration in minutes
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durationMinutes <= 0) {
            durationMinutes += 24 * 60; // handle crossing midnight (basic support)
        }

        addNormalBlock({
            title: title.trim(),
            date: targetDate,
            startTime,
            endTime,      // we need to add endTime to the type if we want to store it, or just use duration
            durationMinutes,
        });

        setTitle('');
        setStartTime('09:00');
        setEndTime('10:00');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-lg overflow-hidden animate-slide-up border border-border-strong">
                <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-normal-bg">
                    <h2 className="text-lg font-bold flex items-center text-normal">
                        <CalendarIcon className="w-5 h-5 text-normal mr-2" />
                        일반 일정 추가
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-surface rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="text-sm font-bold text-primary bg-primary/10 inline-block px-3 py-1 rounded-md mb-2">
                        {targetDate}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-muted">일정 내용</label>
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="예: 미팅, 회식, 병원"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-normal/50 transition-all font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-muted flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                시작 시간
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base focus:outline-none focus:ring-2 focus:ring-normal/50 font-medium appearance-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-muted flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                종료 시간
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-text-base focus:outline-none focus:ring-2 focus:ring-normal/50 font-medium appearance-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-normal hover:bg-normal-hover text-white rounded-xl py-3.5 font-bold transition-all active:scale-[0.98]"
                        >
                            일정 저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

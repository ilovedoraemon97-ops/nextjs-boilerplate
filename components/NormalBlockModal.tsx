'use client';
import { useState, useEffect } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { X, Calendar as CalendarIcon, Clock, Check } from 'lucide-react';
import { format, parseISO, startOfWeek, addDays, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { clsx } from 'clsx';
import { NormalBlock } from '@/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    targetDate: string | null;
    blockToEdit?: NormalBlock | null;
}

const HOURS = Array.from({ length: 24 }).map((_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '10', '20', '30', '40', '50'];
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function NormalBlockModal({ isOpen, onClose, targetDate, blockToEdit }: Props) {
    const addNormalBlock = useDoneDayStore((state) => state.addNormalBlock);
    const updateNormalBlock = useDoneDayStore((state) => state.updateNormalBlock);

    const [title, setTitle] = useState('');
    const [startH, setStartH] = useState('09');
    const [startM, setStartM] = useState('00');
    const [endH, setEndH] = useState('10');
    const [endM, setEndM] = useState('00');

    // 0 = Monday, 1 = Tuesday ... 6 = Sunday
    const [selectedDays, setSelectedDays] = useState<number[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        if (blockToEdit) {
            setTitle(blockToEdit.title);
            const [sH, sM] = blockToEdit.startTime!.split(':');
            const [eH, eM] = blockToEdit.endTime!.split(':');
            setStartH(sH);
            setStartM(sM);
            setEndH(eH);
            setEndM(eM);

            // Re-map to 0=Mon, 6=Sun
            const dateObj = parseISO(blockToEdit.date!);
            const dayIdx = (dateObj.getDay() + 6) % 7;
            setSelectedDays([dayIdx]);
        } else if (targetDate) {
            const dateObj = parseISO(targetDate);
            const dayIdx = (dateObj.getDay() + 6) % 7;
            setSelectedDays([dayIdx]);
            setTitle('');
            setStartH('09');
            setStartM('00');
            setEndH('10');
            setEndM('00');
        }
    }, [isOpen, targetDate, blockToEdit]);

    if (!isOpen || (!targetDate && !blockToEdit)) return null;

    const toggleDay = (idx: number) => {
        setSelectedDays(prev =>
            prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || selectedDays.length === 0) return;

        const sH = Number(startH);
        const sM = Number(startM);
        const eH = Number(endH);
        const eM = Number(endM);

        let durationMinutes = (eH * 60 + eM) - (sH * 60 + sM);
        if (durationMinutes <= 0) {
            durationMinutes += 24 * 60; // handle crossing midnight (basic support)
        }

        const startTime = `${startH}:${startM}`;
        const endTime = `${endH}:${endM}`;

        if (blockToEdit) {
            updateNormalBlock(blockToEdit.id, {
                title: title.trim(),
                startTime,
                endTime,
                durationMinutes,
            });
        } else if (targetDate) {
            const startOfScopeWeek = startOfWeek(parseISO(targetDate), { weekStartsOn: 1 });
            selectedDays.forEach(dayIdx => {
                const blockDate = format(addDays(startOfScopeWeek, dayIdx), 'yyyy-MM-dd');
                addNormalBlock({
                    title: title.trim(),
                    date: blockDate,
                    startTime: startTime,
                    endTime: endTime,
                    durationMinutes,
                });
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-lg overflow-hidden animate-slide-up border border-border-strong flex flex-col max-h-[75vh]">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-normal-bg shrink-0">
                    <h2 className="text-sm font-bold flex items-center text-normal">
                        <CalendarIcon className="w-4 h-4 text-normal mr-1.5" />
                        {blockToEdit ? '일정 수정' : '일정 추가'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-text-muted hover:bg-bg-surface rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 flex flex-col space-y-5">

                    {/* Date Scope Display */}
                    {!blockToEdit && targetDate && (
                        <div className="flex items-center space-x-2">
                            <div className="text-xs font-semibold text-text-muted">기준 주간:</div>
                            <div className="text-xs font-bold text-text-base bg-bg-base px-2 py-1 rounded border border-border-subtle">
                                {format(startOfWeek(parseISO(targetDate), { weekStartsOn: 1 }), 'M월 d일')} 주차
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-muted">일정 내용</label>
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="예: 미팅, 회식, 병원"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-base placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-normal/50 transition-all font-medium"
                        />
                    </div>

                    {/* Day Selector */}
                    {!blockToEdit && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-muted">반복 요일 (다중 선택)</label>
                            <div className="flex justify-between space-x-1">
                                {WEEKDAYS.map((day, idx) => {
                                    const isSelected = selectedDays.includes(idx);
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => toggleDay(idx)}
                                            className={clsx(
                                                "flex-1 py-2 rounded-lg text-xs font-bold transition-all border",
                                                isSelected
                                                    ? "bg-normal text-white border-normal"
                                                    : "bg-bg-base text-text-muted border-border-subtle hover:border-text-muted hover:text-text-base"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedDays.length === 0 && (
                                <p className="text-[10px] text-failed-hover mt-1">※ 최소 하나 이상의 요일을 선택해주세요.</p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-muted flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                시작 시간
                            </label>
                            <div className="flex space-x-1">
                                <select value={startH} onChange={e => setStartH(e.target.value)} className="w-1/2 bg-bg-base border border-border-subtle rounded-xl px-2 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-normal/50">
                                    {HOURS.map(h => <option key={h} value={h}>{h}시</option>)}
                                </select>
                                <select value={startM} onChange={e => setStartM(e.target.value)} className="w-1/2 bg-bg-base border border-border-subtle rounded-xl px-2 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-normal/50">
                                    {MINUTES.map(m => <option key={m} value={m}>{m}분</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-muted flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                종료 시간
                            </label>
                            <div className="flex space-x-1">
                                <select value={endH} onChange={e => setEndH(e.target.value)} className="w-1/2 bg-bg-base border border-border-subtle rounded-xl px-2 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-normal/50">
                                    {HOURS.map(h => <option key={h} value={h}>{h}시</option>)}
                                </select>
                                <select value={endM} onChange={e => setEndM(e.target.value)} className="w-1/2 bg-bg-base border border-border-subtle rounded-xl px-2 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-normal/50">
                                    {MINUTES.map(m => <option key={m} value={m}>{m}분</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 shrink-0 mt-auto">
                        <button
                            type="submit"
                            disabled={!blockToEdit && selectedDays.length === 0}
                            className="w-full bg-normal disabled:bg-border-strong disabled:text-text-muted hover:bg-normal-hover text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
                        >
                            {blockToEdit ? '일정 수정 저장' : `${selectedDays.length}일치 일정 저장`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

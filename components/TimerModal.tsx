'use client';
import { useState, useEffect } from 'react';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { X, Play, Pause, CheckCircle2, Flame } from 'lucide-react';
import { GrowthBlock } from '@/types';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    block?: GrowthBlock;
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void; // Used to trigger Achievement Card later
}

export default function TimerModal({ block, isOpen, onClose, onComplete }: Props) {
    const { startTimer, pauseTimer, completeBlock } = useDoneDayStore();
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (isOpen && block) {
            setSeconds(block.elapsedMinutes * 60);
            setIsActive(block.status === 'RUNNING');
        } else {
            setIsActive(false);
        }
    }, [isOpen, block]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    if (!isOpen || !block) return null;

    const handlePlayPause = () => {
        if (isActive) {
            setIsActive(false);
            pauseTimer(block.id, Math.floor(seconds / 60));
        } else {
            setIsActive(true);
            startTimer(block.id);
        }
    };

    const handleComplete = () => {
        setIsActive(false);
        completeBlock(block.id, Math.floor(seconds / 60));
        onClose();
        onComplete();
    };

    const handleClose = () => {
        if (isActive) {
            pauseTimer(block.id, Math.floor(seconds / 60));
        }
        onClose();
    };

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progressPercent = Math.min(100, (seconds / (block.targetMinutes * 60)) * 100);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-surface p-4 animate-fade-in">
            <button onClick={handleClose} className="absolute top-6 left-6 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors z-10">
                <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center w-full max-w-sm relative">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-growth-bg text-growth-hover text-sm font-bold mb-4">
                        <Flame className="w-4 h-4 mr-1.5" />
                        갓생 타이머
                    </div>
                    <h2 className="text-3xl font-black text-text-base">{block.title}</h2>
                    <p className="text-text-muted mt-2 font-medium">
                        목표 시간: {block.targetMinutes}분
                    </p>
                </div>

                {/* Circular Progress & Timer */}
                <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="128" cy="128" r="120" stroke="var(--color-border-subtle)" strokeWidth="8" fill="none" />
                        <circle
                            cx="128" cy="128" r="120"
                            stroke="var(--color-primary)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 120}
                            strokeDashoffset={2 * Math.PI * 120 * (1 - progressPercent / 100)}
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    <div className="text-5xl font-black tracking-tighter text-text-base font-mono">
                        {formatTime(seconds)}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-6">
                    <button
                        onClick={handlePlayPause}
                        className={clsx(
                            "w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95",
                            isActive ? "bg-bg-surface border-2 border-border-strong text-text-base shadow-sm" : "bg-primary text-white shadow-md shadow-primary/10"
                        )}
                    >
                        {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 ml-1 fill-current" />}
                    </button>

                    <button
                        onClick={handleComplete}
                        className="w-20 h-20 rounded-full bg-growth-hover text-white flex flex-col items-center justify-center shadow-md transition-transform active:scale-95 group"
                    >
                        <CheckCircle2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold mt-1 opacity-90">완료</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

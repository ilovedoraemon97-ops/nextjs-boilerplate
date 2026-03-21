'use client';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { Inbox } from 'lucide-react';
import { TimeBlock } from '@/types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableBlockProps {
    block: TimeBlock;
    onClick?: (block: TimeBlock) => void;
}

function DraggableBlock({ block, onClick }: DraggableBlockProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.id,
        data: block,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 1,
    };

    const isGrowth = block.type === 'GROWTH';
    const colorClass = isGrowth ? (block.color || 'bg-primary') : '';
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onClick?.(block)}
            className={clsx(
                "border-l-4 p-3 rounded-xl shadow-sm cursor-grab active:cursor-grabbing mb-2 w-[140px] shrink-0 transform transition-transform hover:scale-105 active:scale-95",
                isGrowth ? `${colorClass} text-white border-white/30` : "bg-normal-bg text-normal-hover border-normal/20"
            )}
        >
            <div className="flex items-center justify-between mb-1">
                <div className="truncate font-bold text-sm">{block.title}</div>
            </div>
            <div className="text-xs opacity-80 font-semibold flex justify-between">
                <span>{block.durationMinutes}분</span>
            </div>
        </div>
    );
}

interface UnassignedBlocksProps {
    onBlockClick?: (block: TimeBlock) => void;
}

export default function UnassignedBlocks({ onBlockClick }: UnassignedBlocksProps) {
    const blocks = useDoneDayStore(state => state.blocks);
    const unassignedBlocks = blocks.filter(b => !b.date);

    const { setNodeRef, isOver } = useDroppable({
        id: 'unassigned',
    });

    if (unassignedBlocks.length === 0) return null;

    return (
        <div className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-bold text-text-base flex items-center text-sm">
                    <Inbox className="w-4 h-4 mr-1.5 text-primary" />
                    배치 대기 중인 블록
                </h3>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {unassignedBlocks.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={clsx(
                    "flex overflow-x-auto pb-4 pt-2 px-2 -mx-2 hide-scrollbar rounded-xl transition-colors",
                    isOver && "bg-primary/5"
                )}
            >
                <div className="flex space-x-3">
                    {unassignedBlocks.map(b => (
                        <DraggableBlock key={b.id} block={b} onClick={onBlockClick} />
                    ))}
                </div>
            </div>
        </div>
    );
}

'use client';
import { useState } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import UnassignedBlocks from '@/components/UnassignedBlocks';
import GoalSettingModal from '@/components/GoalSettingModal';
import TimerModal from '@/components/TimerModal';
import AchievementCard from '@/components/AchievementCard';
import NormalBlockModal from '@/components/NormalBlockModal';
import { Plus } from 'lucide-react';
import { TimeBlock, GrowthBlock } from '@/types';

export default function Home() {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [activeBlock, setActiveBlock] = useState<GrowthBlock | undefined>(undefined);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isAchievementOpen, setIsAchievementOpen] = useState(false);

  const [isNormalModalOpen, setIsNormalModalOpen] = useState(false);
  const [selectedDateForNormal, setSelectedDateForNormal] = useState<string | null>(null);

  const updateBlockSchedule = useDoneDayStore(state => state.updateBlockSchedule);
  const blocks = useDoneDayStore(state => state.blocks);

  // Require a small movement to start drag, so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const blockId = active.id as string;
    const overId = over.id as string; // 'unassigned' or 'YYYY-MM-DD-HH:mm'

    // Find block
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    if (overId === 'unassigned') {
      // Move back to unassigned
      updateBlockSchedule(blockId, null as any, '', block.durationMinutes);
    } else {
      // overId is "YYYY-MM-DD-HH:mm"
      const datePart = overId.substring(0, 10);
      const timePart = overId.substring(11); // HH:mm

      // Update block to the exact date and time slot
      updateBlockSchedule(blockId, datePart, timePart, block.durationMinutes);
    }
  };

  const handleBlockClick = (block: TimeBlock) => {
    // Only Growth blocks have timers
    if (block.type === 'GROWTH' && block.status !== 'COMPLETED') {
      setActiveBlock(block);
      setIsTimerOpen(true);
    }
  };

  const handleTimerComplete = () => {
    setIsTimerOpen(false);
    setIsAchievementOpen(true);
  };

  const handleAddNormalBlockClick = (dateStr: string) => {
    setSelectedDateForNormal(dateStr);
    setIsNormalModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-full pb-24">
      <Header />

      <div className="flex-1 p-4 space-y-6">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <UnassignedBlocks onBlockClick={handleBlockClick} />
          <WeeklyCalendar
            onBlockClick={handleBlockClick}
            onAddNormalBlock={handleAddNormalBlockClick}
          />
        </DndContext>
      </div>

      <button
        onClick={() => setIsGoalModalOpen(true)}
        className="fixed bottom-24 right-4 sm:right-[calc(50%-13rem)] w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus className="w-6 h-6" strokeWidth={3} />
      </button>

      <GoalSettingModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
      />

      <TimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        block={activeBlock}
        onComplete={handleTimerComplete}
      />

      <AchievementCard
        isOpen={isAchievementOpen}
        onClose={() => setIsAchievementOpen(false)}
        block={activeBlock}
      />

      <NormalBlockModal
        isOpen={isNormalModalOpen}
        onClose={() => setIsNormalModalOpen(false)}
        targetDate={selectedDateForNormal}
      />
    </div>
  );
}

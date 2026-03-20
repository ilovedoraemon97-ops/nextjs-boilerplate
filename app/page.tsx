'use client';
import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { format, startOfWeek } from 'date-fns';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import AuthPanel from '@/components/AuthPanel';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import UnassignedBlocks from '@/components/UnassignedBlocks';
import TimerModal from '@/components/TimerModal';
import AchievementCard from '@/components/AchievementCard';
import NormalBlockModal from '@/components/NormalBlockModal';
import Onboarding from '@/components/Onboarding';
import BlockActionModal from '@/components/BlockActionModal';
import GoalSettingModal from '@/components/GoalSettingModal';
import { X } from 'lucide-react';
import { TimeBlock, GrowthBlock, NormalBlock, Goal } from '@/types';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function Home() {
  const [activeBlock, setActiveBlock] = useState<GrowthBlock | undefined>(undefined);
  const [actionBlock, setActionBlock] = useState<TimeBlock | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isAchievementOpen, setIsAchievementOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [isNormalModalOpen, setIsNormalModalOpen] = useState(false);
  const [selectedDateForNormal, setSelectedDateForNormal] = useState<string | null>(null);
  const [normalBlockToEdit, setNormalBlockToEdit] = useState<NormalBlock | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const updateBlockSchedule = useDoneDayStore(state => state.updateBlockSchedule);
  const blocks = useDoneDayStore(state => state.blocks);
  const carryOverFailedBlocks = useDoneDayStore(state => state.carryOverFailedBlocks);
  const loadProgressFromServer = useDoneDayStore(state => state.loadProgressFromServer);

  useEffect(() => {
    setIsMounted(true);
    // Run carry over check on mount for the start of the current week
    const startOfCurrentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    carryOverFailedBlocks(startOfCurrentWeek);
    loadProgressFromServer();
  }, [carryOverFailedBlocks, loadProgressFromServer]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabaseClient) return;
    supabaseClient.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });
    const { data: subscription } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      if (event === 'SIGNED_IN') {
        setIsAuthOpen(false);
        loadProgressFromServer();
      }
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [loadProgressFromServer]);

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
    setActionBlock(block);
  };

  const handleTimerComplete = () => {
    setIsTimerOpen(false);
    setIsAchievementOpen(true);
  };

  const handleAddNormalBlockClick = (dateStr: string) => {
    setSelectedDateForNormal(dateStr);
    setIsNormalModalOpen(true);
  };

  if (!isMounted) return null;

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

      <BlockActionModal
        block={actionBlock}
        isOpen={!!actionBlock}
        onClose={() => setActionBlock(null)}
        onOpenTimer={() => {
          if (actionBlock?.type === 'GROWTH') {
            setActiveBlock(actionBlock as GrowthBlock);
            setIsTimerOpen(true);
          }
        }}
        onEditGoal={() => {
          if (actionBlock?.type === 'GROWTH') {
            const goalId = (actionBlock as GrowthBlock).goalId;
            const goal = useDoneDayStore.getState().goals.find(g => g.id === goalId);
            if (goal) {
              setGoalToEdit(goal);
              setIsGoalModalOpen(true);
            }
          }
        }}
        onEditNormal={() => {
          if (actionBlock?.type === 'NORMAL') {
            setNormalBlockToEdit(actionBlock as NormalBlock);
            setIsNormalModalOpen(true);
          }
        }}
      />

      <GoalSettingModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setGoalToEdit(null);
        }}
        goalToEdit={goalToEdit}
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
        onClose={() => {
          setIsNormalModalOpen(false);
          setNormalBlockToEdit(null);
          setSelectedDateForNormal(null);
        }}
        targetDate={selectedDateForNormal}
        blockToEdit={normalBlockToEdit}
      />

      <Onboarding onComplete={() => {
        if (!isLoggedIn) setIsAuthOpen(true);
      }} />
      {isAuthOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border-strong shadow-lg p-4 relative">
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-3 right-3 p-2 text-text-muted hover:bg-bg-surface-hover rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <AuthPanel onSignedIn={loadProgressFromServer} />
          </div>
        </div>
      )}
    </div>
  );
}

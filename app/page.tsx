'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragStartEvent, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { format, startOfWeek } from 'date-fns';
import { useDoneDayStore } from '@/store/useDoneDayStore';
import Header from '@/components/Header';
import AuthPanel from '@/components/AuthPanel';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import TimerModal from '@/components/TimerModal';
import AchievementCard from '@/components/AchievementCard';
import WeeklyCertificateModal from '@/components/WeeklyCertificateModal';
import NormalBlockModal from '@/components/NormalBlockModal';
import Onboarding from '@/components/Onboarding';
import BlockActionModal from '@/components/BlockActionModal';
import GoalSettingModal from '@/components/GoalSettingModal';
import { X, CalendarDays } from 'lucide-react';
import { TimeBlock, GrowthBlock, NormalBlock, Goal } from '@/types';
import { WeeklyGoalSummary } from '@/lib/goalProgress';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function Home() {
  const [activeBlock, setActiveBlock] = useState<GrowthBlock | undefined>(undefined);
  const [actionBlock, setActionBlock] = useState<TimeBlock | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isAchievementOpen, setIsAchievementOpen] = useState(false);
  const [isWeeklyCertOpen, setIsWeeklyCertOpen] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyGoalSummary | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [fabHost, setFabHost] = useState<HTMLElement | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [isNormalModalOpen, setIsNormalModalOpen] = useState(false);
  const [selectedDateForNormal, setSelectedDateForNormal] = useState<string | null>(null);
  const [normalBlockToEdit, setNormalBlockToEdit] = useState<NormalBlock | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [activeDragBlock, setActiveDragBlock] = useState<TimeBlock | null>(null);
  const [timerGoal, setTimerGoal] = useState<Goal | null>(null);

  const updateBlockSchedule = useDoneDayStore(state => state.updateBlockSchedule);
  const blocks = useDoneDayStore(state => state.blocks);
  const goals = useDoneDayStore(state => state.goals);
  const carryOverFailedBlocks = useDoneDayStore(state => state.carryOverFailedBlocks);
  const loadProgressFromServer = useDoneDayStore(state => state.loadProgressFromServer);
  const purgePendingGoals = useDoneDayStore(state => state.purgePendingGoals);

  useEffect(() => {
    setIsMounted(true);
    // Run carry over check on mount for the start of the current week
    const startOfCurrentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    carryOverFailedBlocks(startOfCurrentWeek);
    purgePendingGoals(startOfCurrentWeek);
    loadProgressFromServer();
  }, [carryOverFailedBlocks, loadProgressFromServer, purgePendingGoals]);

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const block = blocks.find(b => b.id === active.id);
    if (block?.type === 'NORMAL') setActiveDragBlock(block);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragBlock(null);
    const { active, over } = event;
    if (!over) return;

    const blockId = active.id as string;
    const overId = over.id as string; // 'unassigned' or 'YYYY-MM-DD-HH:mm'

    // Find block
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    if (block.type === 'GROWTH') return;

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

  useEffect(() => {
    if (!isMounted) return;
    const host = document.getElementById('app-shell');
    setFabHost(host);
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-full pb-24">
      <Header />

      <div className="flex-1 p-4 flex flex-col min-h-0 space-y-2">

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 flex flex-col min-h-0 w-full">
            <WeeklyCalendar
              onBlockClick={handleBlockClick}
              onAddNormalBlock={handleAddNormalBlockClick}
            />
          </div>
          <DragOverlay>
            {activeDragBlock ? (
              <div
                style={{
                  width: 'calc(100vw / 7)',
                  height: `${Math.max((activeDragBlock.durationMinutes / 60) * 45, 20)}px`
                }}
                className={clsx(
                  "p-[2px] sm:p-1 rounded-[3px] sm:rounded-md text-[7px] sm:text-[9.5px] leading-tight flex flex-col border-l-[1.5px] sm:border-l-2 shadow-sm outline outline-1 outline-bg-base opacity-[0.35] overflow-hidden",
                  activeDragBlock.type === 'GROWTH'
                    ? `${(activeDragBlock as GrowthBlock).color || 'bg-primary'} border-white border-[0.5px] text-white border-l-white/50 backdrop-blur-sm`
                    : "bg-normal-bg text-normal-hover border-normal border-white border-[0.5px] border-l-normal"
                )}
              >
                <div className="flex items-start sm:items-center justify-between">
                  <span className="font-semibold truncate tracking-tight">{activeDragBlock.title}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {fabHost && createPortal(
        <button
          onClick={() => { setSelectedDateForNormal(format(new Date(), 'yyyy-MM-dd')); setIsNormalModalOpen(true); }}
          className="absolute bottom-24 right-4 left-auto w-14 h-14 bg-normal text-white rounded-full flex items-center justify-center shadow-lg shadow-normal/30 hover:bg-normal-hover hover:scale-105 active:scale-95 transition-all z-[90] pointer-events-auto"
          style={{ right: 'calc(1rem + env(safe-area-inset-right))', left: 'auto' }}
          aria-label="일반 일정 추가"
        >
          <CalendarDays className="w-6 h-6" strokeWidth={2.5} />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-normal flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
              <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
            </svg>
          </span>
        </button>,
        fabHost
      )}

      <BlockActionModal
        block={actionBlock}
        isOpen={!!actionBlock}
        onClose={() => setActionBlock(null)}
        growthMode="deleteOnly"
        onUnassignGrowth={() => {
          if (actionBlock?.type === 'GROWTH') {
            useDoneDayStore.getState().updateBlockSchedule(actionBlock.id, null as any, '', actionBlock.durationMinutes);
          }
        }}
        onEditGoal={() => {
          if (actionBlock?.type === 'GROWTH') {
            const growthBlock = actionBlock as GrowthBlock;
            const goal = useDoneDayStore.getState().goals.find(g => g.id === growthBlock.goalId || g.title === growthBlock.title);
            if (goal) {
              setGoalToEdit(goal);
              setIsGoalModalOpen(true);
            } else {
              alert('해당 목표 설정을 찾을 수 없습니다.');
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
        onClose={() => {
          setIsTimerOpen(false);
          setTimerGoal(null);
        }}
        goal={timerGoal || undefined}
        onComplete={(payload) => {
          handleTimerComplete();
          if (payload?.becameComplete) {
            setWeeklySummary(payload.summary);
            setIsWeeklyCertOpen(true);
          }
        }}
      />

      <AchievementCard
        isOpen={isAchievementOpen}
        onClose={() => setIsAchievementOpen(false)}
        block={activeBlock}
      />

      <WeeklyCertificateModal
        isOpen={isWeeklyCertOpen}
        onClose={() => setIsWeeklyCertOpen(false)}
        summary={weeklySummary}
        goals={goals}
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

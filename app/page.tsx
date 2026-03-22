'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { useRouter } from 'next/navigation';
import GoalSettingModal from '@/components/GoalSettingModal';
import { X, CalendarDays } from 'lucide-react';
import { TimeBlock, GrowthBlock, NormalBlock, Goal } from '@/types';
import { WeeklyGoalSummary } from '@/lib/goalProgress';
import { supabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function Home() {
  const [activeBlock, setActiveBlock] = useState<GrowthBlock | undefined>(undefined);
  const [actionBlock, setActionBlock] = useState<TimeBlock | null>(null);
  const [pickBlocksOpen, setPickBlocksOpen] = useState(false);
  const [pickBlocks, setPickBlocks] = useState<GrowthBlock[]>([]);
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
  const [timerGoal, setTimerGoal] = useState<Goal | null>(null);
  const router = useRouter();

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

  const handleBlockClick = (block: TimeBlock) => {
    if (block.type === 'GROWTH' && block.date && block.startTime) {
      const hour = block.startTime.split(':')[0];
      const sameHour = blocks.filter(
        (b): b is GrowthBlock =>
          b.type === 'GROWTH' &&
          b.date === block.date &&
          b.startTime?.startsWith(`${hour}:`) &&
          !(b as GrowthBlock).hidden
      );
      if (sameHour.length > 1) {
        setPickBlocks(sameHour);
        setPickBlocksOpen(true);
        return;
      }
    }
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

        <div className="flex-1 flex flex-col min-h-0 w-full">
          <WeeklyCalendar
            onBlockClick={handleBlockClick}
            onAddNormalBlock={handleAddNormalBlockClick}
          />
        </div>
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
        onHideGrowth={(block) => {
          useDoneDayStore.getState().setGrowthHidden(block.id, true);
        }}
        onGoToGoalDetail={(goalId) => {
          router.push(`/goals?goalId=${goalId}&detail=1`);
        }}
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

      {pickBlocksOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPickBlocksOpen(false)}>
          <div className="bg-bg-surface w-full max-w-sm rounded-2xl shadow-lg border border-border-strong overflow-hidden animate-pop relative" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-base">
              <h3 className="text-sm font-bold text-text-base">어떤 기록을 선택할까요?</h3>
              <button onClick={() => setPickBlocksOpen(false)} className="p-1.5 text-text-muted hover:bg-bg-surface rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {pickBlocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setPickBlocksOpen(false);
                    setActionBlock(b);
                  }}
                  className="w-full flex items-center justify-between bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm font-semibold text-text-base hover:bg-bg-surface-hover"
                >
                  <span>{b.startTime}~{b.endTime}</span>
                  <span className="text-text-muted">{b.durationMinutes}분</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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

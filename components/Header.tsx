import { useDoneDayStore } from '@/store/useDoneDayStore';

export default function Header() {
    const { stats, getWeeklyGrowthRate } = useDoneDayStore();
    const growthRate = getWeeklyGrowthRate();

    return (
        <header className="sticky top-0 z-40 bg-bg-surface/80 backdrop-blur-md border-b border-border-subtle px-4 py-3 flex items-center justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-text-base">DoneDay</h1>
                <p className="text-[11px] text-text-muted font-medium mt-0.5 tracking-tight uppercase">
                    productivity system
                </p>
            </div>

            <div className="flex items-center space-x-3 border border-border-strong px-3 py-1 rounded-full">
                <div className="flex items-center">
                    <span className="text-lg mr-1">🔥</span>
                    <span className="text-sm font-bold text-accent">{stats.streak}일</span>
                </div>
                <div className="w-px h-4 bg-border-strong"></div>
                <div className="flex items-center">
                    <span className="text-sm font-bold text-primary">Lv.{stats.level}</span>
                </div>
                <div className="w-px h-4 bg-border-strong"></div>
                <div className="flex items-center">
                    <span className="text-xs font-semibold text-text-muted mr-1">갓생</span>
                    <span className="text-sm font-bold text-growth-hover">{growthRate}%</span>
                </div>
            </div>
        </header>
    );
}

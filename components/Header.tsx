import { useDoneDayStore } from '@/store/useDoneDayStore';

export default function Header() {
    const { stats } = useDoneDayStore();

    return (
        <header className="sticky top-0 z-40 bg-bg-surface/80 backdrop-blur-md border-b border-border-subtle px-4 py-3 flex items-center justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-text-base">DoneDay</h1>
                <p className="text-xs text-text-muted font-medium mt-0.5">
                    실행을 강제하는 소셜 생산성
                </p>
            </div>

            <div className="flex items-center space-x-3 bg-bg-surface-hover px-3 py-1.5 rounded-full border border-border-subtle shadow-sm">
                <div className="flex items-center">
                    <span className="text-lg mr-1">🔥</span>
                    <span className="text-sm font-bold text-accent">{stats.streak}일</span>
                </div>
                <div className="w-px h-4 bg-border-strong"></div>
                <div className="flex items-center">
                    <span className="text-sm font-bold text-primary">Lv.{stats.level}</span>
                </div>
            </div>
        </header>
    );
}

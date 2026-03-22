'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, LineChart, Users, LayoutDashboard, Target } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
    { href: '/goals', label: 'Goals', icon: Target },
    { href: '/', label: 'Home', icon: CalendarDays },
    { href: '/feed', label: 'Feed', icon: LayoutDashboard },
    { href: '/room', label: 'Room', icon: Users },
    { href: '/profile', label: 'Profile', icon: LineChart },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border-subtle pb-safe px-4 py-2 sm:max-w-md sm:mx-auto">
            <ul className="flex items-center justify-between">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <li key={item.href} className="flex-1">
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center justify-center space-y-1 w-full p-2 rounded-lg transition-colors',
                                    isActive
                                        ? 'text-text-base bg-primary/10 ring-1 ring-primary/30 font-semibold'
                                        : 'text-text-muted hover:text-text-base'
                                )}
                            >
                                <Icon
                                    className="w-6 h-6 transition-transform"
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

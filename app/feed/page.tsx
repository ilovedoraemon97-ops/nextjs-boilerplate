'use client';
import Header from '@/components/Header';
import { Heart, MessageCircle } from 'lucide-react';

const MOCK_FEED = [
    { id: 1, user: 'Kayoung', action: '운동 1시간', streak: 4, likes: 12, timeAgo: '10분 전' },
    { id: 2, user: 'Jihoon', action: '토익 공부 2시간', streak: 12, likes: 45, timeAgo: '1시간 전' },
    { id: 3, user: 'Minseo', action: '독서 30분', streak: 2, likes: 8, timeAgo: '3시간 전' },
];

export default function FeedPage() {
    return (
        <div className="flex flex-col min-h-full pb-24">
            <Header />

            <div className="p-4 space-y-4">
                {MOCK_FEED.map(post => (
                    <div key={post.id} className="bg-bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                                    {post.user[0]}
                                </div>
                                <div>
                                    <div className="font-bold text-text-base">{post.user}</div>
                                    <div className="text-xs text-text-muted">{post.timeAgo}</div>
                                </div>
                            </div>
                            <div className="text-sm font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full flex items-center">
                                🔥 {post.streak}일 연속
                            </div>
                        </div>

                        <div className="bg-growth-bg border border-growth/20 rounded-xl p-4 mb-4 text-center">
                            <div className="text-sm font-bold text-growth mb-1">TODAY DONE</div>
                            <div className="text-xl font-black text-text-base">{post.action}</div>
                        </div>

                        <div className="flex items-center space-x-4 text-text-muted">
                            <button className="flex items-center space-x-1.5 hover:text-accent transition-colors">
                                <Heart className="w-5 h-5" />
                                <span className="text-sm font-bold">{post.likes}</span>
                            </button>
                            <button className="flex items-center space-x-1.5 hover:text-primary transition-colors">
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-sm font-bold">응원하기</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

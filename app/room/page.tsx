'use client';
import Header from '@/components/Header';
import { Users, Timer, ArrowRight } from 'lucide-react';

const ROOMS = [
    { id: 1, title: '퇴근후 갓생방', time: '21:00 ~ 23:00', people: 24, max: 30, tag: '직장인' },
    { id: 2, title: '미라클 모닝', time: '06:00 ~ 08:00', people: 15, max: 20, tag: '기상인증' },
    { id: 3, title: '프리랜서 집중방', time: '13:00 ~ 18:00', people: 8, max: 10, tag: '업무' },
];

export default function RoomPage() {
    return (
        <div className="flex flex-col min-h-full pb-24">
            <Header />

            <div className="p-4 space-y-6">
                <div className="bg-primary text-white rounded-3xl p-6 shadow-lg shadow-primary/25">
                    <h2 className="text-2xl font-black mb-2">실시간 집중방</h2>
                    <p className="text-white/80 font-medium mb-6">
                        다른 사람들과 함께 목표를 달성하세요. 혼자 할 때보다 3배 더 실행력이 올라갑니다.
                    </p>
                    <button className="bg-white text-primary px-6 py-2.5 rounded-full font-bold text-sm shadow-sm hover:scale-105 transition-transform">
                        + 방 만들기
                    </button>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold border-b border-border-subtle pb-2">진행 중인 방</h3>
                    {ROOMS.map(room => (
                        <div key={room.id} className="bg-bg-surface border border-border-subtle rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-border-strong cursor-pointer group">
                            <div>
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className="bg-bg-surface-hover text-text-muted text-[10px] px-2 py-0.5 rounded-md font-bold">
                                        {room.tag}
                                    </span>
                                    <div className="text-xs font-bold text-accent flex items-center">
                                        <Timer className="w-3 h-3 mr-1" />
                                        {room.time}
                                    </div>
                                </div>
                                <h4 className="font-bold text-lg">{room.title}</h4>
                                <div className="flex items-center text-sm text-text-muted mt-1">
                                    <Users className="w-4 h-4 mr-1.5" />
                                    {room.people} / {room.max}명 참여 중
                                </div>
                            </div>
                            <button className="w-10 h-10 rounded-full bg-bg-surface-hover group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

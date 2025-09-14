'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import {
    Plus,
    Send,
    FileText,
    Star,
    CalendarDays,
    MessageSquare,
    LucideIcon,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface InboxNavItem {
    label: string;
    icon: LucideIcon;
    content: React.ReactNode;
    count?: number;
}

const BackgroundIllustrationSVG = () => (
    <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="160" height="110" rx="15" fill="#F0F8FF" stroke="#E0EBF5" strokeWidth="1.5" />
        <circle cx="100" cy="75" r="50" fill="none" stroke="#F0F8FF" strokeWidth="1" />
        <circle cx="100" cy="75" r="70" fill="none" stroke="#F5F9FD" strokeWidth="1" />
    </svg>
);

const EmailDrop = ({ x, y, className, iconContent }: { x: string; y: string; className: string; iconContent: React.ReactNode }) => (
    <div className={cn("absolute", className)} style={{ left: x, top: y }}>
        <svg width="120" height="25" viewBox="0 0 120 25" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="120" height="25" rx="5" fill="white" stroke="#D2E9FF" />
            <circle cx="15" cy="12.5" r="8" fill="#5A8DFF" />
            <g transform="translate(15, 12.5)">
                {iconContent}
            </g>
        </svg>
    </div>
);

const PlayIcon = () => (
    <path d="M-2 -3L4 0L-2 3Z" fill="white" />
);

const DraftIcon = () => (
    <circle cx="0" cy="0" r="3.5" fill="white" stroke="white" strokeWidth="1" />
);

const StarredEmailIcon = () => (
    <path d="M0 -4.5 L 1.2 -1.4 L 4.5 -1.4 L 1.8 0.7 L 3 4 L 0 2.2 L -3 4 L -1.8 0.7 L -4.5 -1.4 L -1.2 -1.4 Z" fill="white" />
);

const ScheduledEmailIcon = () => (
    <g fill="white" stroke="white" strokeWidth="0.5">
        <rect x="-3.5" y="-3.5" width="7" height="7" rx="1" />
        <line x1="-1.5" y1="-3.5" x2="-1.5" y2="-5.5" />
        <line x1="1.5" y1="-3.5" x2="1.5" y2="-5.5" />
    </g>
);

const SentEmailsContent = () => (
    <div className="flex flex-col items-center justify-center p-6 h-full text-center">
        <div className="mb-6 relative w-[200px] h-[150px]">
            <BackgroundIllustrationSVG />

            <EmailDrop x="40px" y="30px" className="email-drop-1" iconContent={<PlayIcon />} />
            <EmailDrop x="40px" y="60px" className="email-drop-2" iconContent={<PlayIcon />} />
            <EmailDrop x="40px" y="90px" className="email-drop-3" iconContent={<PlayIcon />} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Start by sending the first email
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm">
            Click compose to start sending personalized emails
        </p>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">Compose</Button>
    </div>
);

const DraftsContent = () => (
    <div className="flex flex-col items-center justify-center p-6 h-full text-center">
        <div className="mb-6 relative w-[200px] h-[150px]">
            <BackgroundIllustrationSVG />

            <EmailDrop x="40px" y="30px" className="email-drop-1" iconContent={<DraftIcon />} />
            <EmailDrop x="40px" y="60px" className="email-drop-2" iconContent={<DraftIcon />} />
            <EmailDrop x="40px" y="90px" className="email-drop-3" iconContent={<DraftIcon />} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
            No draft emails found
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm">
            Emails you're working on are saved here.
        </p>
    </div>
);

const StarredContent = () => (
    <div className="flex flex-col items-center justify-center p-6 h-full text-center">
        <div className="mb-6 relative w-[200px] h-[150px]">
            <BackgroundIllustrationSVG />

            <EmailDrop x="40px" y="30px" className="email-drop-1" iconContent={<StarredEmailIcon />} />
            <EmailDrop x="40px" y="60px" className="email-drop-2" iconContent={<StarredEmailIcon />} />
            <EmailDrop x="40px" y="90px" className="email-drop-3" iconContent={<StarredEmailIcon />} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
            No starred emails found
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm">
            Quickly find your important emails that you've starred.
        </p>
    </div>
);

const ScheduledEmailsContent = ({ count }: { count?: number }) => (
    <div className="flex flex-col items-center justify-center p-6 h-full text-center">
        <div className="mb-6 relative w-[200px] h-[150px]">
            <BackgroundIllustrationSVG />

            <EmailDrop x="40px" y="30px" className="email-drop-1" iconContent={<ScheduledEmailIcon />} />
            <EmailDrop x="40px" y="60px" className="email-drop-2" iconContent={<ScheduledEmailIcon />} />
            <EmailDrop x="40px" y="90px" className="email-drop-3" iconContent={<ScheduledEmailIcon />} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
            No Scheduled emails found
        </h3>
        <p className="text-gray-600 mb-2 max-w-sm">
            You have {count || 0} email(s) scheduled to send later.
        </p>
    </div>
);

export default function InboxPage() {
    const initialInboxNavItems: InboxNavItem[] = [
        { label: 'Sent Emails', icon: Send, content: <SentEmailsContent /> },
        { label: 'Drafts', icon: FileText, content: <DraftsContent /> },
        { label: 'Starred', icon: Star, content: <StarredContent /> },
        { label: 'Scheduled Emails', icon: CalendarDays, count: 0, content: <ScheduledEmailsContent count={0} /> },
    ];

    const [activeNavItem, setActiveNavItem] = useState<InboxNavItem>(initialInboxNavItems[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    const handleNavItemClick = (item: InboxNavItem) => {
        setActiveNavItem(item);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex gap-4 p-6 relative">
            <Card className="w-full max-w-xs bg-white border border-gray-200 shadow-sm">
                <CardContent className="p-4 flex flex-col space-y-4">
                    <Button className="w-full bg-white text-sky-600 cursor-pointer hover:bg-white py-2.5 h-auto text-base rounded-md shadow-sm border border-blue-200">
                        <Plus className="h-4 w-4 mr-2" /> Compose
                    </Button>

                    <nav className="space-y-1">
                        {initialInboxNavItems.map((item) => {
                            const isActive = activeNavItem.label === item.label;

                            return (
                                <Button
                                    key={item.label}
                                    variant="ghost"
                                    onClick={() => handleNavItemClick(item)}
                                    className={cn(
                                        "w-full justify-start gap-2 h-10 px-3 py-2 text-base font-normal relative",
                                        isActive
                                            ? "bg-pink-100 text-[#F65170] cursor-pointer before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-pink-700 hover:!bg-pink-100"
                                            :
                                            "text-gray-700 cursor-pointer hover:bg-gray-100"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                    {item.count !== undefined && (
                                        <span
                                            className={cn(
                                                "ml-auto px-2 py-0.5 text-xs font-semibold rounded-full",
                                                isActive ? "bg-purple-700 text-white" : "bg-gray-200 text-gray-700"
                                            )}
                                        >
                                            {item.count}
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </nav>
                </CardContent>
            </Card>

            <Card className="w-full bg-white border border-gray-200 shadow-sm">
                <CardContent className="h-full">
                    {activeNavItem.content}
                </CardContent>
            </Card>

            <Button
                variant="default"
                size="icon"
                className="fixed bottom-20 right-6 h-12 w-12 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg z-50"
                aria-label="Open chat"
            >
                <MessageSquare className="h-6 w-6 text-white" />
            </Button>
        </div>
    );
}
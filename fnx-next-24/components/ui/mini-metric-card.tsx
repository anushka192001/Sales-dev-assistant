import { ReactNode } from "react";

export interface MiniMetricCardProps { 
    label: string;
    value: number;
    icon: ReactNode;
    bgColorClass: string;
}

export default function MiniMetricCard ({ label, value, icon, bgColorClass }: MiniMetricCardProps) {
    return (
        <div 
            className={`rounded-xl p-6 ${bgColorClass} h-[120px] flex items-center justify-between shadow-md transition-all hover:shadow-lg hover:shadow-lg`}
            key={`${label}-${value}`}
        >
            <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">{label}</div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
            </div>
            <div className="text-3xl text-gray-800 opacity-90">{icon}</div>
        </div>
    );
}

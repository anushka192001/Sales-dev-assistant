interface MetricCardProps {
    title: string;
    value: string | number;
    unit: string;
}

export default function MetricCard({ title, value, unit }: MetricCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6 h-[200px] flex justify-between transition-all hover:shadow-lg">
            <div className="text-base font-medium">{title}</div>
            <div className="flex flex-col items-end space-y-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
                <span className="text-sm">{unit}</span>
            </div>
        </div>
    );
}
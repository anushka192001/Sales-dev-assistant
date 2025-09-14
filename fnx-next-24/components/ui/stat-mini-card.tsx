import { FC, ReactNode, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface StatMiniCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    footerText?: string;
    chartData?: { [key: string]: number | string }[];
    chartDataKey?: string;
    chartXAxisKey?: string;
    chartBarName?: string;
}

export const StatMiniCard: FC<StatMiniCardProps> = ({
    title,
    value,
    icon,
    footerText,
    chartData,
    chartDataKey,
    chartXAxisKey,
    chartBarName = "data"
}) => {
    const [isChartHovered, setIsChartHovered] = useState(false);

    const displayChart =
        typeof value === 'number' &&
        value > 0 &&
        chartData &&
        chartData.length > 0 &&
        chartDataKey;

    const chartConfig = {
        [chartBarName]: {
            label: chartBarName,
            color: "hsl(210 40% 96%)",
        },
    } satisfies ChartConfig;

    const defaultBlue = "hsl(211 96% 80%)";
    const hoverGreen = "hsl(201 96% 90%)";

    const barFillColor = isChartHovered ? hoverGreen : defaultBlue;

    return (
        <Card className="w-full h-[230px] transition-all hover:shadow-lg">
            <div className="px-4 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between">
                    <span className="text-base font-medium">{title}</span>
                    {icon && <span className="text-lg">{icon}</span>}
                </div>
                <div className="flex-grow flex flex-col items-center justify-center">
                    <div className="text-sm font-bold text-gray-900">{value}</div>
                    {displayChart && (
                        <div
                            className="w-full mt-2 overflow-hidden h-[80px]"
                            onMouseEnter={() => setIsChartHovered(true)}
                            onMouseLeave={() => setIsChartHovered(false)}>
                            <ChartContainer
                                config={chartConfig}
                                className="w-full h-full overflow-hidden">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                                        <XAxis dataKey={chartXAxisKey || "name"} hide />
                                        <YAxis hide />
                                        <Bar
                                            dataKey={chartDataKey}
                                            fill={barFillColor}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                    )}
                </div>

                {footerText && (
                    <div className="flex py-2 justify-center text-sm text-gray-500">
                        {footerText}
                    </div>
                )}
            </div>
        </Card>
    );
};
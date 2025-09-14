import { FC, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  children?: ReactNode;
}

export const StatCard: FC<StatCardProps> = ({ title, value, icon, children }) => (
  <Card className="w-full h-[230px] transition-all hover:shadow-lg">
    <CardContent className="flex flex-col h-full justify-between">
      <div className="flex items-start justify-between">
        {icon && <span className="text-xl text-gray-500">{icon}</span>}
        <div className="flex flex-col items-end">
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          <span className="text-sm text-gray-600">{title}</span>
        </div>
      </div>
      {children}
    </CardContent>
  </Card>
);

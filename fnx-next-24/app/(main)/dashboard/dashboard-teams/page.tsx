'use client'

import { Button } from "@/components/ui/button";
import {
  Building,
  ChevronDown,
  Download,
  Eye,
  Phone,
  Users,
  ZoomIn,
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/ui/stat-card";
import { useState, useEffect } from "react";
import { StatMiniCard } from "@/components/ui/stat-mini-card";
import LoadingSpinner from "@/components/ui/loader";

const fetchTeamDashboardData = (range: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalSent: Math.floor(Math.random() * 10000),
        openRate: (Math.random() * 100).toFixed(2),
        replyRate: (Math.random() * 100).toFixed(2),
        clickRate: (Math.random() * 100).toFixed(2),
        unsubscribeRate: (Math.random() * 5).toFixed(2),
        bounceRate: (Math.random() * 3).toFixed(2),
        companiesEmailed: Math.floor(Math.random() * 200),
        contactsEmailed: Math.floor(Math.random() * 1000),
        directDials: Math.floor(Math.random() * 300),
        viewedContacts: Math.floor(Math.random() * 100),
      });
    }, 1000);
  });
};

export default function TeamDashboard() {
  const [selectedRange, setSelectedRange] = useState("This Month");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const userName = 'John Doe';

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      setLoading(true);
      const data = await fetchTeamDashboardData(selectedRange);
      setDashboardData(data);
      setLoading(false);
    };
    loadData();
  }, [selectedRange]);

  if (!mounted) {
    return null;
  }

  if (!dashboardData && loading) {
    return <LoadingSpinner />;
  }

  const viewedContactsChartData = [
    { name: 'Total', value: dashboardData?.viewedContacts || 0 }
  ];

  return (
    <div className="bg-gray-200 min-h-screen w-full p-6">
      <div className="flex justify-between items-center mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="cursor-pointer">{selectedRange} <ChevronDown className="w-4 h-4 ml-2" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {[
              "Today",
              "Yesterday",
              "Last 7 Days",
              "Last 30 Days",
              "This Month",
              "Last Month",
              "Custom Range"
            ].map(option => (
              <DropdownMenuItem key={option} onClick={() => setSelectedRange(option)}>
                {option}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center cursor-pointer gap-2 bg-transparent border-blue-500 text-blue-700">
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
          <Button variant="outline" className="flex items-center cursor-pointer gap-2 bg-transparent border-blue-500 text-blue-700">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Sent"
          value={dashboardData?.totalSent.toLocaleString() || "0"}
          icon={<ZoomIn className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Unique Open Rate"
          value={`${dashboardData?.openRate || "0.00"}%`}
          icon={<ZoomIn className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Reply Rate"
          value={`${dashboardData?.replyRate || "0.00"}%`}
          icon={<ZoomIn className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Link Click Rate"
          value={`${dashboardData?.clickRate || "0.00"}%`}
          icon={<ZoomIn className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Unsubscribe Rate"
          value={`${dashboardData?.unsubscribeRate || "0.00"}%`}
          icon={<ZoomIn className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Hard Bounce Rate"
          value={`${dashboardData?.bounceRate || "0.00"}%`}
          icon={<ZoomIn className="w-5 h-5" />}
        />
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatMiniCard
          title="Companies Emailed"
          value={dashboardData?.companiesEmailed || 0}
          icon={<Building className="w-5 h-5" />}
          footerText={userName}
        />
        <StatMiniCard
          title="Contacts Emailed"
          value={dashboardData?.contactsEmailed || 0}
          icon={<Users className="w-5 h-5" />}
          footerText={userName}
        />
        <StatMiniCard
          title="Direct Dials"
          value={dashboardData?.directDials || 0}
          icon={<Phone className="w-5 h-5" />}
          footerText={userName}
        />
        <StatMiniCard
          title="Viewed Contacts"
          value={dashboardData?.viewedContacts || 0}
          icon={<Eye className="w-5 h-5" />}
          footerText={userName}
          chartData={viewedContactsChartData}
          chartDataKey="value"
          chartXAxisKey="name"
          chartBarName="Viewed"
        />
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Eye,
  Phone,
  Users,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  Mail,
  Building,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { UserDropdown } from "@/components/ui/user-dropdown";
import MetricCard from "@/components/ui/metric-card";
import MiniMetricCard from "@/components/ui/mini-metric-card";
import LoadingSpinner from "@/components/ui/loader";

const fetchDashboardData = (range: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        emailsSent: Math.floor(Math.random() * 1000),
        openRate: (Math.random() * 100).toFixed(2),
        replyRate: (Math.random() * 100).toFixed(2),
        clickRate: (Math.random() * 100).toFixed(2),
        unsubscribeRate: (Math.random() * 5).toFixed(2),
        bounceRate: (Math.random() * 3).toFixed(2),
        companiesEmailed: Math.floor(Math.random() * 100),
        contactsEmailed: Math.floor(Math.random() * 500),
        directDials: Math.floor(Math.random() * 200),
        viewedContacts: Math.floor(Math.random() * 50),
      });
    }, 1000);
  });
};

export default function Dashboard() {
  const [selectedRange, setSelectedRange] = useState("This Month");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const leads = [
    { name: "Today", value: "0" },
    { name: "Yesterday", value: "0" },
    { name: "This Week", value: "0" },
    { name: "Last Week", value: "0" },
    { name: "This Month", value: "0" },
    { name: "Last Month", value: "0" },
    { name: "This Quarter", value: "0" },
    { name: "Last Quarter", value: "0" },
    { name: "This Year", value: "0" },
    { name: "Last Year", value: "0" },
  ];

  const blueShades = [
    "bg-[#9DCBFD]",
    "bg-[#74B3FC]",
    "bg-[#5BA6FC]",
    "bg-[#4198FC]",
  ];

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      setLoading(true);
      const data = await fetchDashboardData(selectedRange);
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

  return (
    <div className="bg-gray-200 min-h-screen w-full p-6">

      <div className="flex justify-between items-center mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="cursor-pointer">
              {selectedRange}{" "}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {[
              "Today",
              "Yesterday",
              "Last 7 Days",
              "Last 30 Days",
              "This Month",
              "Last Month",
              "Custom Range",
            ].map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => setSelectedRange(option)}
              >
                {option}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center cursor-pointer gap-2 bg-transparent border-blue-500 text-blue-700"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
          <Button
            variant="outline"
            className="flex items-center cursor-pointer gap-2 bg-transparent border-blue-500 text-blue-700"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          <UserDropdown />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="grid gap-6 col-span-1 md:col-span-2">
          {/* Top Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <MetricCard
              title="Total Emails Sent"
              value={dashboardData?.emailsSent || 0}
              unit="Sent"
            />
            <MetricCard
              title="Avg Unique Open Rate"
              value={`${dashboardData?.openRate || 0}%`}
              unit="Emails"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <MetricCard
              title="Avg Reply Rate"
              value={`${dashboardData?.replyRate || 0}%`}
              unit="Emails"
            />
            <MetricCard
              title="Avg Unique Link Click Rate"
              value={`${dashboardData?.clickRate || 0}%`}
              unit="Links"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <MetricCard
              title="Avg Unsubscribe Rate"
              value={`${dashboardData?.unsubscribeRate || 0}%`}
              unit="Emails"
            />
            <MetricCard
              title="Avg Hard Bounce Rate"
              value={`${dashboardData?.bounceRate || 0}%`}
              unit="Emails"
            />
          </div>

          {/* Bottom Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniMetricCard
              label="Companies Emailed"
              value={dashboardData?.companiesEmailed || 0}
              icon={<Building />}
              bgColorClass={blueShades[0]}
            />
            <MiniMetricCard
              label="Contacts Emailed"
              value={dashboardData?.contactsEmailed || 0}
              icon={<Users />}
              bgColorClass={blueShades[1]}
            />
            <MiniMetricCard
              label="Direct Dials"
              value={dashboardData?.directDials || 0}
              icon={<Phone />}
              bgColorClass={blueShades[2]}
            />
            <MiniMetricCard
              label="Viewed Contacts"
              value={dashboardData?.viewedContacts || 0}
              icon={<Eye />}
              bgColorClass={blueShades[3]}
            />
          </div>
        </div>

        <div className="col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-medium">Soft Leads</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-sm">
                {leads.map((lead, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors duration-100 h-15"
                  >
                    <span className="text-base">{lead.name}</span>
                    <span className="text-2xl font-bold">{lead.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="hover:shadow-lg">
          <CardContent className="p-6">
            <div className="text-sm font-semibold mb-3">Email View By Device</div>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Monitor size={16} className="text-blue-500" />
                <span>DESKTOP</span>
              </div>
              <div>0%</div>

              <div className="flex items-center gap-2">
                <Tablet size={16} className="text-blue-500" />
                <span>TABLET</span>
              </div>
              <div>0%</div>

              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-blue-500" />
                <span>MOBILE</span>
              </div>
              <div>0%</div>

              <div className="flex items-center gap-2">
                <Mail size={16} className="text-purple-500" />
                <span>OTHER</span>
              </div>
              <div>0%</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg">
          <CardContent className="p-6">
            <div className="text-sm font-semibold mb-2">Email Open Time</div>
            <div className="text-sm">No data available</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/app/providers/AuthProvider";
import { LogOut } from "lucide-react";

interface SidebarUserButtonProps {
  mounted: boolean;
  isCollapsed: boolean;
}

export function SidebarUserButton({
  isCollapsed,
}: SidebarUserButtonProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const firstInitial = user.firstName?.[0] ?? "U";
  const lastInitial = user.lastName?.[0] ?? "";
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full px-3 py-2 cursor-pointer rounded-md hover:bg-muted transition justify-${isCollapsed ? "center" : "start"
            } gap-3`}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback>
              {firstInitial}
              {lastInitial}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && <span>{fullName}</span>}
        </Button>
      </HoverCardTrigger>

      <HoverCardContent
        side={isCollapsed ? "right" : "bottom"}
        align={isCollapsed ? "center" : "start"}
        sideOffset={isCollapsed ? 10 : 4}
        className="w-64 p-4 text-sm"
      >
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {firstInitial}
              {lastInitial}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{fullName}</p>
            <p className="text-gray-500 text-xs">
              {user.email ?? "user@example.com"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full cursor-pointer text-sm gap-2 hover:bg-gray-500 hover:text-white"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Log out
        </Button>
      </HoverCardContent>
    </HoverCard>
  );
}
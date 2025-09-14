'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bot,
  Send,
  MessageSquare,
  Bell,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './new-sidebar.module.css';
import { SidebarUserButton } from './sidebar-user';


// CSS for sidebar icons
const sidebarIconStyles = {
  default: cn(styles['sidebar-icon'], "transition-all duration-200"),
  collapsed: styles['sidebar-icon-collapsed']
};

// Memoized sidebar items to prevent re-renders
const useNavItems = () =>
  useMemo(
    () => [
      {
        label: 'Outreach',
        icon: Send,
        children: [
          { href: '/outreach/automated-sequence', label: 'Automated Sequence' },
        ],
      },
      { href: '/ava', label: 'Ava - AI SDR', icon: Bot, minimizeOnClick: true }
    ],
    []
  );

export function NewSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [hoveredCollapsedDropdown, setHoveredCollapsedDropdown] = useState<string | null>(null);
  const [hoveredSingleItem, setHoveredSingleItem] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const navItems = useNavItems();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to handle navigation with optional collapse
  const handleNavigation = (href: string, shouldMinimize?: boolean) => {
    if (shouldMinimize) {
      setIsCollapsed(true);
      // Reset all dropdown states when collapsing
      setDashboardOpen(false);
      setSearchOpen(false);
      setOutreachOpen(false);
      setHoveredCollapsedDropdown(null);
      setHoveredSingleItem(null);
    }
    router.push(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Increased z-index for the entire sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: mounted && isCollapsed ? '4.5rem' : '15rem',
          transition: { duration: 0.3, ease: 'easeInOut' }
        }}
        className="fixed top-0 left-0 h-screen bg-white border-r flex flex-col z-50"
      >
        {/* Sidebar Header */}
        <div className="flex flex-col items-center p-3 border-b space-y-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 self-end"
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              setDashboardOpen(false);
              setSearchOpen(false);
              setOutreachOpen(false);
              setHoveredCollapsedDropdown(null);
              setHoveredSingleItem(null);
            }}
          >
            <ChevronLeft className={cn("transition-transform", mounted && isCollapsed ? "rotate-180 sidebar-icon-collapsed" : "sidebar-icon")} />
          </Button>
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/images/orange-logo-icon.png"
              alt="Clodura.AI Logo"
              width={mounted && isCollapsed ? 30 : 32}
              height={mounted && isCollapsed ? 30 : 32}
              className="transition-all duration-200"
            />
            <AnimatePresence>
              {(!mounted || !isCollapsed) && (
                <motion.span
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg font-semibold"
                >
                  Clodura.AI
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-auto p-3">
          <nav className="space-y-3.5">
            {navItems.map((item, idx) => {
              if (item.children) {
                const isItemOpen = (item.label === 'Dashboard' && dashboardOpen) ||
                  (item.label === 'Search' && searchOpen) ||
                  (item.label === 'Outreach' && outreachOpen);
                const isHovered = hoveredCollapsedDropdown === item.label;

                return (
                  <div
                    key={idx}
                    className="relative flex flex-col"
                    onMouseEnter={() => mounted && isCollapsed && setHoveredCollapsedDropdown(item.label)}
                    onMouseLeave={() => mounted && isCollapsed && setHoveredCollapsedDropdown(null)}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 cursor-pointer",
                        mounted && isCollapsed && "justify-center",
                        (isItemOpen || (item.children.some(child => pathname === child.href) && !isCollapsed)) && "bg-muted"
                      )}
                      onClick={() => {
                        if (!mounted) return;

                        if (isCollapsed) {
                          setHoveredCollapsedDropdown(isHovered ? null : item.label);
                        } else {
                          if (item.label === 'Dashboard') setDashboardOpen(!dashboardOpen);
                          if (item.label === 'Search') setSearchOpen(!searchOpen);
                          if (item.label === 'Outreach') setOutreachOpen(!outreachOpen);
                        }
                      }}
                    >
                      <item.icon className={cn(sidebarIconStyles.default, mounted && isCollapsed && sidebarIconStyles.collapsed)} />
                      {(!mounted || !isCollapsed) && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {isItemOpen ?
                            <ChevronUp className={sidebarIconStyles.default} /> :
                            <ChevronDown className={sidebarIconStyles.default} />
                          }
                        </>
                      )}
                    </Button>

                    {/* Collapsed Dropdown (Modal/Popover style) */}
                    <AnimatePresence>
                      {mounted && isCollapsed && isHovered && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="fixed left-[4.5rem] mt-[-2.5rem] bg-white border rounded-md shadow-lg py-2 w-48 z-[51]"
                        >
                          <div className="space-y-1">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "block py-1.5 px-3 text-sm rounded-md transition-colors",
                                  pathname === child.href
                                    ? "bg-muted text-primary"
                                    : "hover:bg-muted text-muted-foreground"
                                )}
                                onClick={() => setHoveredCollapsedDropdown(null)}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Expanded Dropdown */}
                    <AnimatePresence>
                      {((item.label === 'Dashboard' && dashboardOpen) ||
                        (item.label === 'Search' && searchOpen) ||
                        (item.label === 'Outreach' && outreachOpen)) && (!mounted || !isCollapsed) && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-9 space-y-1 pt-1">
                              {item.children.map((child) => (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    "block py-1.5 px-3 text-sm rounded-md transition-colors",
                                    pathname === child.href
                                      ? "bg-muted text-primary"
                                      : "hover:bg-muted text-muted-foreground"
                                  )}
                                >
                                  {child.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                );
              }

              // Handle single navigation items
              return (
                <div
                  key={idx}
                  className="relative"
                  onMouseEnter={() => mounted && isCollapsed && setHoveredSingleItem(item.label)}
                  onMouseLeave={() => mounted && isCollapsed && setHoveredSingleItem(null)}
                >
                  {/* Special handling for items that should minimize on click */}
                  {item.minimizeOnClick ? (
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3",
                        mounted && isCollapsed && "justify-center",
                        pathname === item.href && "bg-muted"
                      )}
                      onClick={() => handleNavigation(item.href, true)}
                    >
                      <item.icon className={cn(sidebarIconStyles.default, mounted && isCollapsed && sidebarIconStyles.collapsed)} />
                      {(!mounted || !isCollapsed) && <span>{item.label}</span>}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3",
                        mounted && isCollapsed && "justify-center",
                        pathname === item.href && "bg-muted"
                      )}
                      asChild
                    >
                      <Link href={item.href}>
                        <item.icon className={cn(sidebarIconStyles.default, mounted && isCollapsed && sidebarIconStyles.collapsed)} />
                        {(!mounted || !isCollapsed) && <span>{item.label}</span>}
                      </Link>
                    </Button>
                  )}

                  {/* Tooltip for single items when collapsed */}
                  <AnimatePresence>
                    {mounted && isCollapsed && hoveredSingleItem === item.label && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed left-[4.5rem] mt-[-2.5rem] bg-white border rounded-md shadow-lg px-3 py-1.5 text-sm z-[51] whitespace-nowrap"
                      >
                        {item.label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 border-t space-y-3.5">
          {/* Request Demo Button */}
          <div
            className="relative"
            onMouseEnter={() => mounted && isCollapsed && setHoveredSingleItem('Request Demo')}
            onMouseLeave={() => mounted && isCollapsed && setHoveredSingleItem(null)}
          >
            <Button
              variant="ghost"
              className={cn("w-full justify-start cursor-pointer gap-3", mounted && isCollapsed && "justify-center")}
            >
              <MessageSquare className={cn(sidebarIconStyles.default, mounted && isCollapsed && sidebarIconStyles.collapsed)} />
              {(!mounted || !isCollapsed) && <span>Request Demo</span>}
            </Button>
            <AnimatePresence>
              {mounted && isCollapsed && hoveredSingleItem === 'Request Demo' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="fixed left-[4.5rem] mt-[-2.5rem] bg-white border rounded-md shadow-lg px-3 py-1.5 text-sm z-[51] whitespace-nowrap"
                >
                  Request Demo
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications Button */}
          <div
            className="relative"
            onMouseEnter={() => mounted && isCollapsed && setHoveredSingleItem('Notifications')}
            onMouseLeave={() => mounted && isCollapsed && setHoveredSingleItem(null)}
          >
            <Button
              variant="ghost"
              className={cn("w-full justify-start cursor-pointer gap-3 px-3", mounted && isCollapsed && "justify-center")}
            >
              <div className="relative">
                <Bell className={cn(sidebarIconStyles.default, mounted && isCollapsed && sidebarIconStyles.collapsed)} />
                {(mounted && isCollapsed) && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-[9px] bg-purple-500 text-white font-semibold rounded-full flex items-center justify-center">
                    1
                  </span>
                )}
              </div>
              {(!mounted || !isCollapsed) && (
                <>
                  <span>Notifications</span>
                  <span className="h-5 w-5 text-[10px] bg-purple-500 text-white font-semibold rounded-full flex items-center justify-center">1</span>
                </>
              )}
            </Button>
            <AnimatePresence>
              {mounted && isCollapsed && hoveredSingleItem === 'Notifications' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="fixed left-[4.5rem] mt-[-2.5rem] bg-white border rounded-md shadow-lg px-3 py-1.5 text-sm z-[51] whitespace-nowrap"
                >
                  Notifications
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <SidebarUserButton mounted={mounted} isCollapsed={isCollapsed} />
        </div>
      </motion.div>

      {/* Sidebar Spacer - This prevents content jumping */}
      <motion.div
        initial={false}
        animate={{
          width: mounted && isCollapsed ? '4.5rem' : '15rem',
          transition: { duration: 0.3, ease: 'easeInOut' }
        }}
        className="flex-shrink-0"
      />

      {/* Main Content */}
      <main className="flex-1 min-h-screen w-full">
        {children}
      </main>
    </div>
  );
}
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "People",
    href: "/people",
  },
  {
    name: "Companies",
    href: "/companies",
  },
  {
    name: "Recent Searches",
    href: "/recent-searches",
  },
  {
    name: "Saved Searches",
    href: "/saved-searches",
  },
]

export function TopNavigation() {
  const pathname = usePathname()

  return (
    <div className="border-b bg-gray-50">
      <div className="flex h-14 items-center px-4">
        <nav className="flex items-center w-full">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 text-center py-4 text-sm font-medium transition-colors relative",
                pathname === item.href
                  ? "text-blue-600 border border-gray-200 bg-white -mb-[1px]"
                  : "text-muted-foreground hover:text-blue-600"
              )}
            >
              {item.name}
              {pathname === item.href && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-600" />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
} 
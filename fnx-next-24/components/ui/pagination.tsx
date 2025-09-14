import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Pagination({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}
Pagination.displayName = "Pagination"

interface PaginationContentProps extends React.ComponentProps<"ul"> {
  className?: string;
}

function PaginationContent({ className, ...props }: PaginationContentProps) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}
PaginationContent.displayName = "PaginationContent"

interface PaginationItemProps extends React.ComponentProps<"li"> {
  className?: string;
}

function PaginationItem({ className, ...props }: PaginationItemProps) {
  return <li className={cn("", className)} {...props} />
}
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & VariantProps<typeof buttonVariants> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size: props.size,
        }),
        className
      )}
      {...props}
    />
  )
}
PaginationLink.displayName = "PaginationLink"

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 pl-2.5", className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Previous</span>
    </PaginationLink>
  )
}
PaginationPrevious.displayName = "PaginationPrevious"

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 pr-2.5", className)}
      {...props}
    >
      <span>Next</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  )
}
PaginationNext.displayName = "PaginationNext"

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} 
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  Building,
  User,
  Check, 
  Bell,
  Tag,
  Bot,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { UserRole, getMenuAccessRules } from "@/lib/role-based-access";
import { useEffect, useState } from "react";
import { useNavigationItems } from "@/hooks/use-navigation-items";

// Define the sidebar items type
export type SidebarItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  hideForSubBranch?: boolean; // Add property to hide for sub branch users
};

// Define the sidebar items
export const allSidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "POS",
    href: "/pos",
    icon: ShoppingCart,
  },
  {
    title: "AI Assistant",
    href: "/chatbot",
    icon: LayoutDashboard,
  },
  {
    title: "Draft Orders",
    href: "/draft-orders",
    icon: ShoppingCart,
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Package,
  },
  {
    title: "Brands",
    href: "/brands",
    icon: Tag,
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
  },
  {
    title: "Approvals",
    href: "/approvals",
    icon: Check,
  },
  {
    title: "Reporting",
    href: "/reporting",
    icon: BarChart3,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: CreditCard,
  },
  {
    title: "Branches",
    href: "/branches",
    icon: Building,
    hideForSubBranch: true, // Hide for sub branch users
  },
  {
    title: "Staff",
    href: "/staff",
    icon: User,
    hideForSubBranch: true, // Hide for sub branch users
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const { pathname, filteredItems } = useNavigationItems();

  return (
    <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full">
      <div className="p-4">
        <h1 className="text-xl font-bold">POS System</h1>
      </div>
      <nav className="mt-6">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start space-x-2 px-4 py-3 rounded-lg",
                      isActive 
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
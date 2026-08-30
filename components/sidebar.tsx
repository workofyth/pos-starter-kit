"use client";

import Link from "next/link";
import Image from "next/image";
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
  Gift,
  type LucideIcon
} from "lucide-react";
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
    title: "Purchase Orders",
    href: "/inventory/purchase-orders",
    icon: ShoppingCart,
    hideForSubBranch: true,
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
  },
  {
    title: "Exchange Points",
    href: "/exchange-points",
    icon: Gift,
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
  const [logoUrl, setLogoUrl] = useState<string>("/assets/images/products/default_logo_png.png");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings?key=logo_url');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.value) {
            setLogoUrl(result.data.value);
          }
        }
      } catch (error) {
        console.error('Error fetching logo setting:', error);
      }
    };

    fetchSettings();
    const handleStorageChange = () => fetchSettings();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-full w-64 flex-col border-r md:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="bg-card ring-border flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-soft ring-1">
          <Image
            src={logoUrl}
            alt="Logo"
            width={40}
            height={40}
            unoptimized
            className="size-full object-contain p-1"
          />
        </div>
        <span className="font-display truncate text-base font-bold tracking-tight">
          POS System
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

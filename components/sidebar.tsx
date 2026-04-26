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
  Gift,
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
    <aside className="hidden md:block w-64 bg-slate-900 text-slate-50 border-r border-slate-800 h-full">
      <div className="flex flex-col items-center justify-center border-b border-gray-100 dark:border-gray-700/50">
        <img
          src={logoUrl}
          alt="Logo"
          className="w-24 h-24 rounded-xl object-contain brightness-0 invert"
        />
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
                      "w-full justify-start space-x-2 px-4 py-3 rounded-lg transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
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

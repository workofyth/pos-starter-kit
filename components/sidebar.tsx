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
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sidebarItems = [
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
    title: "Products",
    href: "/products",
    icon: Package,
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
  },
  {
    title: "Staff",
    href: "/staff",
    icon: User,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full">
      <div className="p-4">
        <h1 className="text-xl font-bold">POS System</h1>
      </div>
      <nav className="mt-6">
        <ul className="space-y-1 px-2">
          {sidebarItems.map((item) => {
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
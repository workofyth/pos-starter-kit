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
  Check // Add the missing Check icon import
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { UserRole, getMenuAccessRules } from "@/lib/role-based-access";
import { useEffect, useState } from "react";

// Define the sidebar items
const allSidebarItems = [
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
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [filteredItems, setFilteredItems] = useState<typeof allSidebarItems>(allSidebarItems);

  // Get user role from userBranches table
  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user?.id) {
        try {
          // Fetch user branch assignment to get role
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              setUserRole(result.data[0].role || 'staff');
              
              // Determine if user is a main admin based on the isMainAdmin flag
              const userBranch = result.data[0];
              setIsMainAdmin(userBranch.isMainAdmin || false);
            } else {
              setUserRole('guest');
              setIsMainAdmin(false);
            }
          } else {
            setUserRole('guest');
            setIsMainAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('guest');
          setIsMainAdmin(false);
        }
      } else {
        setUserRole('guest');
        setIsMainAdmin(false);
      }
    };
    
    fetchUserRole();
  }, [session]);

  // Filter sidebar items based on user role according to menu_role_access.md
  useEffect(() => {
    const accessRules = getMenuAccessRules(userRole, isMainAdmin);
    
    // Filter items based on role access rules
    if (accessRules.hasFullAccess) {
      // Admin/Manager has access to all items (with main admin having more)
      setFilteredItems(allSidebarItems);
    } else {
      // Filter items based on allowed main items (in this case, sidebar items)
      const allowedTitles = accessRules.allowedMainItems;
      const filtered = allSidebarItems.filter(item => 
        allowedTitles.includes(item.title)
      );
      setFilteredItems(filtered);
    }
  }, [userRole, isMainAdmin]);

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
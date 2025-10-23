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
  Check, // Add the missing Check icon import
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { UserRole, getMenuAccessRules } from "@/lib/role-based-access";
import { useEffect, useState } from "react";

// Define the sidebar items type
type SidebarItem = {
  title: string;
  href: string;
  icon: any;
  hideForSubBranch?: boolean; // Add property to hide for sub branch users
};

// Define the sidebar items
const allSidebarItems: SidebarItem[] = [
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
  const pathname = usePathname();
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [filteredItems, setFilteredItems] = useState<SidebarItem[]>([]);

  // Get user role and branch information from userBranches table and filter sidebar items
  useEffect(() => {
    if (session?.user?.id) {
      const fetchUserBranchInfo = async () => {
        try {
          // Fetch user branch assignment to get role and branch info
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              const role = result.data[0].role || 'staff';
              const branchId = result.data[0].branchId || null;
              const branchType = result.data[0].branch?.type || null;
              const isMain = result.data[0].isMainAdmin || false;
              
              // Apply filtering based on the fetched information
              const accessRules = getMenuAccessRules(role, isMain);
              
              // Filter items based on role access rules
              let filtered = allSidebarItems;
              if (accessRules.hasFullAccess) {
                // Admin/Manager has access to all items (with main admin having more)
                filtered = allSidebarItems;
              } else {
                // Filter items based on allowed main items (in this case, sidebar items)
                const allowedTitles = accessRules.allowedMainItems;
                filtered = allSidebarItems.filter(item => 
                  allowedTitles.includes(item.title)
                );
              }
              
              // Further filter to hide items marked for sub branch users if user is on a sub branch
              if (!isMain && branchType !== 'main' && branchId) {
                filtered = filtered.filter(item => !item.hideForSubBranch);
              }
              
              // Set all states
              setUserRole(role);
              setUserBranchId(branchId);
              setUserBranchType(branchType);
              setIsMainAdmin(isMain);
              setFilteredItems(filtered);
            } else {
              // Set default states for when no user branch data is found
              setUserRole('guest');
              setUserBranchId(null);
              setUserBranchType(null);
              setIsMainAdmin(false);
              
              // Apply filtering for guest user
              const accessRules = getMenuAccessRules('guest', false);
              const allowedTitles = accessRules.allowedMainItems;
              const filtered = allSidebarItems.filter(item => 
                allowedTitles.includes(item.title)
              );
              setFilteredItems(filtered);
            }
          } else {
            // Set default states for API error
            setUserRole('guest');
            setUserBranchId(null);
            setUserBranchType(null);
            setIsMainAdmin(false);
            
            // Apply filtering for guest user
            const accessRules = getMenuAccessRules('guest', false);
            const allowedTitles = accessRules.allowedMainItems;
            const filtered = allSidebarItems.filter(item => 
              allowedTitles.includes(item.title)
            );
            setFilteredItems(filtered);
          }
        } catch (error) {
          console.error('Error fetching user branch info:', error);
          // Set default states for error
          setUserRole('guest');
          setUserBranchId(null);
          setUserBranchType(null);
          setIsMainAdmin(false);
          
          // Apply filtering for guest user
          const accessRules = getMenuAccessRules('guest', false);
          const allowedTitles = accessRules.allowedMainItems;
          const filtered = allSidebarItems.filter(item => 
            allowedTitles.includes(item.title)
          );
          setFilteredItems(filtered);
        }
      };
      
      fetchUserBranchInfo();
    } else {
      // No session, set defaults
      setUserRole(null);
      setUserBranchId(null);
      setUserBranchType(null);
      setIsMainAdmin(false);
      setFilteredItems([]);
    }
  }, [session]);

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
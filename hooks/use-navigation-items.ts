"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { UserRole, getMenuAccessRules } from "@/lib/role-based-access";
import { allSidebarItems, SidebarItem } from "@/components/sidebar";

export function useNavigationItems() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [filteredItems, setFilteredItems] = useState<SidebarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      const fetchUserBranchInfo = async () => {
        try {
          setIsLoading(true);
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
        } finally {
          setIsLoading(false);
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
      setIsLoading(false);
    }
  }, [session]);

  return {
    pathname,
    userRole,
    userBranchId,
    userBranchType,
    isMainAdmin,
    filteredItems,
    isLoading
  };
}

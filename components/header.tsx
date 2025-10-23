"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { MoonIcon, SunIcon, LogOut, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRole } from "@/lib/role-based-access";
import { useEffect, useState } from "react";
import { NotificationMenu } from "@/components/notification-menu";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session, isPending } = useSession();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [branchType, setBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);

  // Fetch user role and branch information
  useEffect(() => {
    const fetchUserBranchInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              setUserRole(result.data[0].role || 'staff');
              setBranchType(result.data[0].branch?.type || null);
              setIsMainAdmin(result.data[0].isMainAdmin || false);
            } else {
              setUserRole('staff'); // Default role if none found
              setBranchType(null);
              setIsMainAdmin(false);
            }
          } else {
            setUserRole('staff'); // Default role on error
            setBranchType(null);
            setIsMainAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user branch info:', error);
          setUserRole('staff'); // Default role on error
          setBranchType(null);
          setIsMainAdmin(false);
        }
      } else {
        setUserRole(null);
        setBranchType(null);
        setIsMainAdmin(false);
      }
    };

    fetchUserBranchInfo();
  }, [session]);

  if (isPending) {
    return (
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <Button variant="outline" size="icon">
              <span className="sr-only">Open menu</span>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <SunIcon className="h-5 w-5" />
                <span className="sr-only">Light mode</span>
              </>
            ) : (
              <>
                <MoonIcon className="h-5 w-5" />
                <span className="sr-only">Dark mode</span>
              </>
            )}
          </Button>
          <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
        </div>
      </header>
    );
  }

  if (!session?.user) {
    return (
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <Button variant="outline" size="icon">
              <span className="sr-only">Open menu</span>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <SunIcon className="h-5 w-5" />
                <span className="sr-only">Light mode</span>
              </>
            ) : (
              <>
                <MoonIcon className="h-5 w-5" />
                <span className="sr-only">Dark mode</span>
              </>
            )}
          </Button>
        </div>
      </header>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 md:px-6">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <Button variant="outline" size="icon">
            <span className="sr-only">Open menu</span>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <>
              <SunIcon className="h-5 w-5" />
              <span className="sr-only">Light mode</span>
            </>
          ) : (
            <>
              <MoonIcon className="h-5 w-5" />
              <span className="sr-only">Dark mode</span>
            </>
          )}
        </Button>
        
        {/* Notification Menu */}
        <NotificationMenu />
        
        {/* Display the role and branch information */}
        {userRole && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded capitalize">
              {userRole}
            </span>
            {(branchType || isMainAdmin) && (
              <span className={`text-xs px-2 py-1 rounded ${isMainAdmin ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' : branchType === 'main' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'}`}>
                {isMainAdmin ? 'Main Admin' : branchType === 'main' ? 'Main Branch' : 'Sub Branch'}
              </span>
            )}
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user.name && (
                  <p className="font-medium">{user.name}</p>
                )}
                {user.email && (
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                )}
                {userRole && (
                  <p className="text-xs text-muted-foreground capitalize">
                    Role: {userRole}
                  </p>
                )}
                {(branchType || isMainAdmin) && (
                  <p className="text-xs text-muted-foreground">
                    Branch: {isMainAdmin ? 'Main Admin' : branchType === 'main' ? 'Main Branch' : 'Sub Branch'}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenuItem 
              onClick={() => signOut()} 
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
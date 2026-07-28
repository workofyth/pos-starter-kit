"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { MoonIcon, SunIcon, LogOut, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lib/role-based-access";
import { useEffect, useState } from "react";
import { NotificationMenu } from "@/components/notification-menu";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useNavigationItems } from "@/hooks/use-navigation-items";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session, isPending } = useSession();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [branchType, setBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string>("/assets/images/products/default_logo_png.png");
  const { pathname, filteredItems } = useNavigationItems();

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

    fetchUserBranchInfo();
    fetchSettings();
    const handleStorageChange = () => fetchSettings();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [session]);

  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground border-sidebar-border w-64 p-0">
        <SheetHeader className="border-sidebar-border flex flex-col items-center justify-center gap-2 border-b p-6">
          <img
            src={logoUrl}
            alt="Logo"
            className="bg-card ring-border size-16 rounded-xl object-contain p-1 shadow-soft ring-1"
          />
          <SheetTitle className="font-display text-lg font-bold tracking-tight">POS System</SheetTitle>
        </SheetHeader>
        <nav className="mt-4">
          <ul className="space-y-1 px-3">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <SheetClose asChild>
                    <Link href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 rounded-lg px-3.5 py-2.5 font-medium",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="size-[18px]" />
                        <span>{item.title}</span>
                      </Button>
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );

  if (isPending) {
    return (
      <header className="bg-background/80 border-border flex h-16 items-center border-b px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <SunIcon className="size-5" />
                <span className="sr-only">Light mode</span>
              </>
            ) : (
              <>
                <MoonIcon className="size-5" />
                <span className="sr-only">Dark mode</span>
              </>
            )}
          </Button>
          <div className="bg-muted size-8 animate-pulse rounded-full"></div>
        </div>
      </header>
    );
  }

  if (!session?.user) {
    return (
      <header className="bg-background/80 border-border flex h-16 items-center border-b px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <SunIcon className="size-5" />
                <span className="sr-only">Light mode</span>
              </>
            ) : (
              <>
                <MoonIcon className="size-5" />
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
    <header className="bg-background/80 border-border flex h-16 items-center border-b px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <>
              <SunIcon className="size-5" />
              <span className="sr-only">Light mode</span>
            </>
          ) : (
            <>
              <MoonIcon className="size-5" />
              <span className="sr-only">Dark mode</span>
            </>
          )}
        </Button>

        {/* Notification Menu */}
        <NotificationMenu />

        {/* Display the role and branch information */}
        {userRole && (
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="secondary" className="capitalize">
              {userRole}
            </Badge>
            {(branchType || isMainAdmin) && (
              <Badge
                variant="outline"
                className={cn(
                  isMainAdmin
                    ? "border-chart-5/30 bg-chart-5/10 text-chart-5"
                    : branchType === 'main'
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-chart-2/30 bg-chart-2/10 text-chart-2"
                )}
              >
                {isMainAdmin ? 'Main Admin' : branchType === 'main' ? 'Main Branch' : 'Sub Branch'}
              </Badge>
            )}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
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

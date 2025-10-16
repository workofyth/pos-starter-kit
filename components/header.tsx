"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { MoonIcon, SunIcon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session, isPending } = useSession();

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
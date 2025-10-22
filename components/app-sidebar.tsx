"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "@/lib/auth-client"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavClouds } from "@/components/nav-clouds"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { UserRole, getMenuAccessRules } from "@/lib/role-based-access"

const staticData = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
    },
    {
      title: "POS",
      url: "/pos",
      icon: IconDatabase,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "#",
      icon: IconUsers,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const [userRole, setUserRole] = React.useState<UserRole>('guest');
  
  const userData = session?.user ? {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || "/codeguide-logo.png",
  } : {
    name: "Guest",
    email: "guest@example.com", 
    avatar: "/codeguide-logo.png",
  }

  // Get user role from userBranches table
  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user?.id) {
        try {
          // Fetch user branch assignment to get role
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              console.log(result.data[0].role)
              setUserRole(result.data[0].role || 'staff');
            } else {
              setUserRole('guest');
            }
          } else {
            setUserRole('guest');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('guest');
        }
      } else {
        setUserRole('guest');
      }
    };
    
    fetchUserRole();
  }, [session]);

  // Filter navigation items based on user role according to menu_filter_by_userrole.md
  const getFilteredNavItems = () => {
    const accessRules = getMenuAccessRules(userRole);
    
    // Filter main navigation items based on role
    const filteredNavMain = staticData.navMain.filter(item => 
      accessRules.hasFullAccess || accessRules.allowedMainItems.includes(item.title)
    );
    
    // Filter cloud navigation items based on role
    const filteredNavClouds = staticData.navClouds.filter(item => 
      accessRules.hasFullAccess || accessRules.allowedCloudItems.includes(item.title)
    );
    
    // Filter document items based on role
    const filteredDocuments = staticData.documents.filter(item => 
      accessRules.hasFullAccess || accessRules.allowedDocumentItems.includes(item.name)
    );
    
    // Filter secondary navigation items based on role
    const filteredNavSecondary = staticData.navSecondary.filter(item => 
      accessRules.hasFullAccess || accessRules.allowedSecondaryItems.includes(item.title)
    );
    
    return {
      navMain: filteredNavMain,
      navClouds: filteredNavClouds,
      documents: filteredDocuments,
      navSecondary: filteredNavSecondary
    };
  };

  const filteredNavData = getFilteredNavItems();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image src="/codeguide-logo.png" alt="CodeGuide" width={32} height={32} className="rounded-lg" />
                <span className="text-base font-semibold font-parkinsans">CodeGuide</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavData.navMain} />
        <NavClouds items={filteredNavData.navClouds} />
        <NavDocuments items={filteredNavData.documents} />
        <NavSecondary items={filteredNavData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}

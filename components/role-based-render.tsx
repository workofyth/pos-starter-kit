// components/role-based-render.tsx
'use client';

import { useSession } from '@/lib/auth-client';
import { UserRole, hasAccessToMenuItem, isDataOperationAllowed } from '@/lib/role-based-access';
import { useEffect, useState } from 'react';

interface RoleBasedRenderProps {
  allowedRoles?: UserRole[];
  requiredRole?: UserRole;
  allowedOperations?: ('read' | 'create' | 'update' | 'delete')[];
  userBranchId?: string;
  targetBranchId?: string;
  fallback?: React.ReactNode; // What to render when access is denied
  children: React.ReactNode;
}

/**
 * A component that conditionally renders content based on user role and branch access
 */
export function RoleBasedRender({
  allowedRoles,
  requiredRole,
  allowedOperations,
  userBranchId,
  targetBranchId,
  fallback = null,
  children
}: RoleBasedRenderProps) {
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
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

  useEffect(() => {
    // Check role-based access
    let roleAccess = true;
    
    if (requiredRole) {
      roleAccess = userRole === requiredRole;
    } else if (allowedRoles && allowedRoles.length > 0) {
      roleAccess = allowedRoles.includes(userRole);
    }
    
    // Check operation-based access
    let operationAccess = true;
    if (allowedOperations && allowedOperations.length > 0) {
      operationAccess = allowedOperations.some(op => 
        isDataOperationAllowed(userRole, op, userBranchId, targetBranchId)
      );
    }
    
    setHasAccess(roleAccess && operationAccess);
  }, [userRole, allowedRoles, requiredRole, allowedOperations, userBranchId, targetBranchId]);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
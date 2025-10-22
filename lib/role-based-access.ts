// role-based-access.ts

// Define user roles
export type UserRole = 'admin' | 'manager' | 'cashier' | 'staff' | 'guest';

// Define menu item types
export interface MenuItem {
  title: string;
  url: string;
  icon?: any;
  items?: MenuItem[];
}

export interface DocumentItem {
  name: string;
  url: string;
  icon: any;
}

export interface NavCloudItem {
  title: string;
  icon: any;
  url: string;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

// Define role access rules based on menu_filter_by_userrole.md and menu_role_access.md
export const getMenuAccessRules = (role: UserRole, isMainAdmin: boolean = false) => {
  switch (role) {
    case 'admin':
    case 'manager':
      // Check if this is a main/super admin or a branch admin
      if (isMainAdmin) {
        // Main admin has access to all menu items including system-level features
        return {
          hasFullAccess: true,
          allowedMainItems: [
            'Dashboard', 'POS', 'Draft Orders', 'Products', 'Categories', 'Inventory', 
            'Members', 'Reporting', 'Transactions', 'Branches', 'Staff', 'Settings',
            'Lifecycle', 'Analytics', 'Projects', 'Team', 'Approvals' // Added Approvals
          ],
          allowedDocumentItems: ['Data Library', 'Reports', 'Word Assistant'],
          allowedSecondaryItems: ['Settings', 'Get Help', 'Search'],
          allowedCloudItems: ['Capture', 'Proposal', 'Prompts'],
        };
      } else {
        // Branch admin has access to all items for their branch but not system-wide features
        return {
          hasFullAccess: true,
          allowedMainItems: [
            'Dashboard', 'POS', 'Draft Orders', 'Products', 'Categories', 'Inventory', 
            'Members', 'Reporting', 'Transactions', 'Approvals' // Branches and Staff removed for branch admins
          ],
          allowedDocumentItems: ['Reports'],
          allowedSecondaryItems: ['Settings', 'Get Help', 'Search'],
          allowedCloudItems: [],
        };
      }
    
    case 'cashier':
      // Cashier: POS, Draft Orders, Transactions, and related functionality
      // Cashiers should be able to process transactions and see their transaction history
      return {
        hasFullAccess: false,
        allowedMainItems: ['POS', 'Draft Orders', 'Transactions', 'Members', 'Reporting', 'Approvals'], // Added Approvals
        allowedDocumentItems: ['Reports'], // Reports related to POS transactions by branch
        allowedSecondaryItems: ['Settings'], // Limited settings for POS configuration by branch
        allowedCloudItems: [], // No cloud access for cashier
      };
    
    case 'staff':
      // Staff: Dashboard, Report, Inventory, Transaction, Draft Orders, and Setting
      // Staff should be able to view and manage transactions
      return {
        hasFullAccess: false,
        allowedMainItems: [
          'Dashboard',        // Dashboard
          'POS',              // POS for transaction processing
          'Draft Orders',     // Draft orders for continuing transactions
          'Inventory',        // Inventory by branch
          'Transactions',     // Transaction by branch
          'Reporting',        // Report by branch
          'Settings',         // Setting by branch
          'Approvals'         // Approvals by branch
        ],
        allowedDocumentItems: ['Reports'], // Reports for inventory and transactions by branch
        allowedSecondaryItems: ['Settings'], // Settings by assigned branch
        allowedCloudItems: [], // No cloud access for staff
      };
    
    default:
      // Guest or unknown roles have minimal access
      return {
        hasFullAccess: false,
        allowedMainItems: ['Dashboard'],
        allowedDocumentItems: ['Reports'],
        allowedSecondaryItems: ['Settings', 'Get Help'],
        allowedCloudItems: [],
      };
  }
};

// Check if user has access to a specific menu item
export const hasAccessToMenuItem = (role: UserRole, menuItemTitle: string, section: 'main' | 'document' | 'secondary' | 'cloud', isMainAdmin: boolean = false) => {
  const rules = getMenuAccessRules(role, isMainAdmin);
  
  switch (section) {
    case 'main':
      return rules.hasFullAccess || rules.allowedMainItems.includes(menuItemTitle);
    case 'document':
      return rules.hasFullAccess || rules.allowedDocumentItems.includes(menuItemTitle);
    case 'secondary':
      return rules.hasFullAccess || rules.allowedSecondaryItems.includes(menuItemTitle);
    case 'cloud':
      return rules.hasFullAccess || rules.allowedCloudItems.includes(menuItemTitle);
    default:
      return false;
  }
};

// Check if a user has access to data by branch
// This function is crucial for implementing the "by branch" part of the requirements
export const hasAccessToBranchData = (userRole: UserRole, userBranchId: string, targetBranchId: string): boolean => {
  // Admin and Manager can access all branches
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }
  
  // For other roles, user can only access their assigned branch
  return userBranchId === targetBranchId;
};

// Check if a user has access to a specific resource based on their role and branch
export const hasResourceAccess = (userRole: UserRole, userBranchId?: string, resourceBranchId?: string): boolean => {
  // If no branch information is provided, assume general access
  if (!userBranchId || !resourceBranchId) {
    return userRole !== 'guest';
  }
  
  // Check if user can access all branches (admin/manager) or specific branch
  return hasAccessToBranchData(userRole, userBranchId, resourceBranchId);
};

// Function to determine if specific data operations are allowed based on role and branch
export const isDataOperationAllowed = (
  userRole: UserRole, 
  operation: 'read' | 'create' | 'update' | 'delete',
  userBranchId?: string, 
  targetBranchId?: string
): boolean => {
  // Admin and Manager can perform all operations on all branches
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }
  
  // For other roles, check if they're accessing their assigned branch
  if (!userBranchId || !targetBranchId) {
    return userRole !== 'guest';
  }
  
  // Non-admins can only access their assigned branch
  const canAccessBranch = userBranchId === targetBranchId;
  if (!canAccessBranch) {
    return false;
  }
  
  // Additional operation-level restrictions
  switch (userRole) {
    case 'cashier':
      // Cashiers can read POS data and create transactions in their branch
      return operation === 'read' || operation === 'create';
    case 'staff':
      // Staff can read and update data in their branch
      return operation === 'read' || operation === 'update';
    default:
      return false;
  }
};
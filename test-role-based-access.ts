// test-role-based-access.ts

import { getMenuAccessRules, hasAccessToMenuItem, UserRole } from "./lib/role-based-access";

// Test function to simulate role-based access
function testRoleBasedAccess() {
  console.log("Testing Role-Based Access Rules...\n");
  
  // Test Admin access (should have full access)
  console.log("Admin Access Test:");
  const adminRules = getMenuAccessRules('admin' as UserRole);
  console.log("Has full access:", adminRules.hasFullAccess);
  console.log("Allowed main items:", adminRules.allowedMainItems);
  console.log("Can access POS:", hasAccessToMenuItem('admin' as UserRole, 'POS', 'main'));
  console.log("Can access Dashboard:", hasAccessToMenuItem('admin' as UserRole, 'Dashboard', 'main'));
  console.log("Can access Reports:", hasAccessToMenuItem('admin' as UserRole, 'Reports', 'document'));
  console.log("Can access Settings:", hasAccessToMenuItem('admin' as UserRole, 'Settings', 'secondary'));
  console.log();
  
  // Test Cashier access (should be limited)
  console.log("Cashier Access Test:");
  const cashierRules = getMenuAccessRules('cashier' as UserRole);
  console.log("Has full access:", cashierRules.hasFullAccess);
  console.log("Allowed main items:", cashierRules.allowedMainItems);
  console.log("Can access POS:", hasAccessToMenuItem('cashier' as UserRole, 'POS', 'main'));
  console.log("Can access Dashboard:", hasAccessToMenuItem('cashier' as UserRole, 'Dashboard', 'main'));
  console.log("Can access Reports:", hasAccessToMenuItem('cashier' as UserRole, 'Reports', 'document'));
  console.log("Can access Settings:", hasAccessToMenuItem('cashier' as UserRole, 'Settings', 'secondary'));
  console.log();
  
  // Test Staff access (should be limited to specific items)
  console.log("Staff Access Test:");
  const staffRules = getMenuAccessRules('staff' as UserRole);
  console.log("Has full access:", staffRules.hasFullAccess);
  console.log("Allowed main items:", staffRules.allowedMainItems);
  console.log("Can access POS:", hasAccessToMenuItem('staff' as UserRole, 'POS', 'main'));
  console.log("Can access Dashboard:", hasAccessToMenuItem('staff' as UserRole, 'Dashboard', 'main'));
  console.log("Can access Reports:", hasAccessToMenuItem('staff' as UserRole, 'Reports', 'document'));
  console.log("Can access Settings:", hasAccessToMenuItem('staff' as UserRole, 'Settings', 'secondary'));
  console.log("Can access Get Help:", hasAccessToMenuItem('staff' as UserRole, 'Get Help', 'secondary'));
  console.log();
  
  // Test Guest access (should be very limited)
  console.log("Guest Access Test:");
  const guestRules = getMenuAccessRules('guest' as UserRole);
  console.log("Has full access:", guestRules.hasFullAccess);
  console.log("Allowed main items:", guestRules.allowedMainItems);
  console.log("Can access POS:", hasAccessToMenuItem('guest' as UserRole, 'POS', 'main'));
  console.log("Can access Dashboard:", hasAccessToMenuItem('guest' as UserRole, 'Dashboard', 'main'));
  console.log("Can access Reports:", hasAccessToMenuItem('guest' as UserRole, 'Reports', 'document'));
  console.log("Can access Settings:", hasAccessToMenuItem('guest' as UserRole, 'Settings', 'secondary'));
  console.log();
}

// Run the test
testRoleBasedAccess();
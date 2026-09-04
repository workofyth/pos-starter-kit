// Platform-level superadmin: an operator account that can provision brand new
// stores/tenants and their initial users from inside the app, instead of
// going through the public sign-up + onboarding flow. This sits above the
// per-store "main admin" concept (lib/admin-guard.ts) — a main admin only
// manages their own store, while a platform superadmin can create others.
export const PLATFORM_SUPERADMIN_EMAILS = ["yufitaufikhidayat@gmail.com"];

export function isPlatformSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return PLATFORM_SUPERADMIN_EMAILS.includes(email);
}

import { createAuthClient } from "better-auth/react";
import { useMemo } from "react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;

// Custom hook to safely handle session data and prevent read-only property issues
export const useSafeSession = () => {
  const { data: session, isPending, error } = useSession();
  
  // Create a deep clone of the session data to prevent read-only property issues
  const safeSession = useMemo(() => {
    if (!session) return null;
    
    try {
      // Deep clone the session data to ensure all properties are writable
      const clonedSession = JSON.parse(JSON.stringify(session));
      
      // Ensure nested objects are also writable
      if (clonedSession.user) {
        Object.keys(clonedSession.user).forEach(key => {
          if (typeof clonedSession.user[key] === 'object' && clonedSession.user[key] !== null) {
            clonedSession.user[key] = JSON.parse(JSON.stringify(clonedSession.user[key]));
          }
        });
      }
      
      return clonedSession;
    } catch (error) {
      console.warn('Error cloning session data:', error);
      // If cloning fails, return the original session data
      return session;
    }
  }, [session]);
  
  return {
    data: safeSession,
    isPending,
    error
  };
};
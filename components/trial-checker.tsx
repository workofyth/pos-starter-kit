"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function TrialChecker() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpired, setIsExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // If logged in but not onboarded, redirect to onboarding (unless already there)
    if (!session.user.isOnboarded && pathname !== '/onboarding') {
      router.push('/onboarding');
      return;
    }

    const now = new Date();
    const trialStartDate = session.user.trialStartDate ? new Date(session.user.trialStartDate) : null;
    const paymentDeadline = session.user.paymentDeadline ? new Date(session.user.paymentDeadline) : null;
    
    // Check for payment deadline (24 hours)
    if (session.user.subscriptionStatus === 'pending_payment' && paymentDeadline && now > paymentDeadline) {
       // If payment deadline passed, fallback to trial if never used
       if (!session.user.hasUsedTrial) {
          setIsExpired(false);
          // Normally you'd call an API to update status to trialing here
       } else {
          setIsExpired(true);
       }
       return;
    }

    if (trialStartDate) {
      const diffTime = now.getTime() - trialStartDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const remaining = 14 - diffDays;
      setDaysRemaining(remaining);

      if (diffDays >= 14 && session.user.subscriptionStatus === 'trialing') {
        setIsExpired(true);
      }
    }

    // Check for expired startup/business plans
    if (session.user.subscriptionStatus === 'expired') {
       setIsExpired(true);
    }
  }, [session, pathname]);

  // If on landing page, auth pages, or payment gateway, don't show overlay
  const isPublicPage = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname === '/payment-gateway' || pathname === '/onboarding';

  if (isPublicPage || !session?.user) return null;

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-md p-4">
        <Card className="max-w-lg w-full border-none shadow-2xl overflow-hidden ring-1 ring-red-100 dark:ring-red-900/30">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-extrabold mb-4 tracking-tight">Your Trial has Expired!</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Your 14-day free trial of Talertech POS has ended. To continue managing your business, please subscribe to one of our premium plans.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={() => router.push("/payment-gateway?plan=yearly")} 
                className="h-14 font-bold text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 rounded-2xl group"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Upgrade to Yearly Plan
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={() => router.push("/payment-gateway?plan=monthly")} 
                variant="outline" 
                className="h-14 font-bold text-lg rounded-2xl border-2"
              >
                Monthly Plan
              </Button>
              <button 
                onClick={() => router.push("/payment-gateway?plan=permanent")}
                className="text-sm font-bold text-blue-600 hover:underline mt-2"
              >
                Looking for Lifetime Access? Buy One Payment &rarr;
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Optional: Show a subtle warning when trial is close to expiring (e.g. 3 days left)
  if (daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0 && !isExpired) {
    return (
      <div className="fixed bottom-8 right-8 z-[90] animate-in slide-in-from-bottom-10 duration-500">
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl shadow-xl flex items-center gap-4 max-w-sm">
           <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
           </div>
           <div>
              <p className="font-bold text-sm">Trial expires in {daysRemaining} days</p>
              <button 
                onClick={() => router.push("/payment-gateway?plan=yearly")}
                className="text-[10px] font-bold text-amber-600 hover:underline uppercase"
              >
                Upgrade Now &rarr;
              </button>
           </div>
        </div>
      </div>
    );
  }

  return null;
}

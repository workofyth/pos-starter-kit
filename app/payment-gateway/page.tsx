"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, CheckCircle2, ShieldCheck, ArrowLeft, Loader2, QrCode, Wallet, Building2 } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function PaymentGatewayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get("plan") || "monthly";
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [selectedBank, setSelectedBank] = useState("cimb");
  const [paymentData, setPaymentData] = useState<any>(null);

  const planInfo = {
    monthly: { name: "Monthly", price: "Rp 99.999", interval: "Bulan" },
    yearly: { name: "Yearly", price: "Rp 999.999", interval: "Tahun" },
    permanent: { name: "One Payment", price: "Rp 1.999.999", interval: "Selamanya" },
  };

  const selectedPlan = planInfo[plan as keyof typeof planInfo] || planInfo.monthly;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    async function checkStatus() {
      if (!paymentData || completed) return;
      
      try {
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        if (data.success && data.status === "active") {
          setCompleted(true);
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error checking subscription status", err);
      }
    }

    if (paymentData && !completed) {
      interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentData, completed]);

  const handlePayment = async () => {
    setProcessing(true);
    setPaymentData(null); // Clear previous payment data
    
    try {
      const amount = selectedPlan.price.replace(/\D/g, "");
      const res = await fetch("/api/ipaymu/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount, 
          plan, 
          method: paymentMethod === "bank" ? "va" : paymentMethod,
          channel: paymentMethod === "bank" ? selectedBank : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentData(data.data);
      } else {
        alert(data.error || "Failed to create payment");
      }
    } catch (err) {
      console.error("Error creating payment", err);
      alert("An error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-none shadow-2xl">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-20 h-20 bg-chart-2/10 text-chart-2 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold mb-2 font-display">Payment Successful!</h1>
            <p className="text-muted-foreground mb-8">
              Thank you for subscribing to the {selectedPlan.name} plan. Your account has been upgraded.
            </p>
            <Button onClick={() => window.location.href = "/dashboard"} className="w-full h-12 font-bold text-lg bg-primary hover:bg-primary/90">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/#pricing" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Pricing
      </Link>

      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold mb-2 tracking-tight font-display">Complete Your Order</h1>
            <p className="text-muted-foreground">Secure checkout powered by iPaymu</p>
          </div>

          <Card className="border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-muted border-b">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">Talertech {selectedPlan.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPlan.interval} Subscription</p>
                </div>
                <p className="font-bold text-lg">{selectedPlan.price}</p>
              </div>
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{selectedPlan.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (0%)</span>
                  <span>Rp 0</span>
                </div>
                <div className="flex justify-between text-xl font-extrabold pt-2">
                  <span>Total</span>
                  <span className="text-primary">{selectedPlan.price}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <ShieldCheck className="w-5 h-5 text-chart-2" />
            <span>Encrypted and secure payment processing</span>
          </div>
        </div>

        {/* Payment Form */}
        <Card className="border-none shadow-2xl">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Select your preferred payment method</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => { setPaymentMethod("qris"); setPaymentData(null); }}
                className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${paymentMethod === "qris" ? "border-primary bg-primary/10" : "border-border"}`}
              >
                <QrCode className={`w-6 h-6 ${paymentMethod === "qris" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[10px] font-bold">QRIS</span>
              </div>
              <div
                onClick={() => { setPaymentMethod("bank"); setPaymentData(null); }}
                className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${paymentMethod === "bank" ? "border-primary bg-primary/10" : "border-border"}`}
              >
                <Building2 className={`w-6 h-6 ${paymentMethod === "bank" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[10px] font-bold">VIRTUAL ACC</span>
              </div>
            </div>

            {paymentMethod === "bank" && !paymentData && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold opacity-60">Pilih Bank:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "bni", name: "BNI" },
                    { id: "mandiri", name: "Mandiri" },
                    { id: "cimb", name: "CIMB" },
                    { id: "bri", name: "BRI" },
                    { id: "permata", name: "Permata" },
                    { id: "bca", name: "BCA" },
                  ].map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => setSelectedBank(bank.id)}
                      className={`py-2 px-1 border rounded-lg text-center cursor-pointer text-[10px] font-bold transition-all ${selectedBank === bank.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground/30"}`}
                    >
                      {bank.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              {!paymentData ? (
                <Button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full h-14 font-bold text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 rounded-2xl"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Bill...
                    </>
                  ) : (
                    `Generate ${paymentMethod === "bank" ? selectedBank.toUpperCase() : "QRIS"} Bill`
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  {paymentMethod === "qris" && paymentData.QrString && (
                    <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card">
                      <div className="mb-4 bg-white p-2 rounded-lg shadow-soft border w-52 h-52 flex items-center justify-center relative">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentData.QrString)}&margin=10`}
                          alt="Dynamic QRIS Code"
                          className="w-48 h-48"
                        />
                      </div>
                      <p className="text-center font-medium text-sm">Scan QRIS to pay</p>
                      <p className="text-[10px] text-muted-foreground mt-2">Trx ID: {paymentData.TransactionId}</p>
                    </div>
                  )}

                  {paymentMethod === "bank" && paymentData.Va && (
                    <div className="p-6 border rounded-xl bg-card text-center">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Virtual Account Number</p>
                      <p className="text-3xl font-extrabold text-primary tracking-wider mb-4">{paymentData.Va}</p>
                      <p className="text-sm font-medium">Bank: {paymentData.Channel || "iPaymu VA"}</p>
                      <p className="text-[10px] text-muted-foreground mt-4">Silakan transfer sesuai nominal yang tertera.</p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-xs text-chart-3 bg-chart-3/10 p-3 rounded-lg border border-chart-3/20">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Waiting for your payment...</span>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => setPaymentData(null)} className="w-full text-muted-foreground hover:text-primary text-[10px]">
                    Change Payment Method
                  </Button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              By clicking pay, you agree to our Terms of Service and Privacy Policy.
              The subscription will be activated automatically after successful payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentGatewayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentGatewayContent />
    </Suspense>
  );
}

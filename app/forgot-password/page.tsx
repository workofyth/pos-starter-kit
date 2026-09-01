"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, redirectTo: "/sign-in" }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || "Something went wrong");
            } else {
                setSubmitted(true);
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute -top-24 left-[10%] h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-0 right-[8%] h-64 w-64 rounded-full bg-chart-3/15 blur-[100px]" />
            </div>
            <Card className="relative z-10 w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="font-display text-2xl font-bold tracking-tight">Forgot password</CardTitle>
                    <CardDescription>
                        Enter your account email and we&apos;ll send you a reset link
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {submitted ? (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                                If that email is registered, a reset link is on its way. Check your inbox (and spam folder).
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send reset link"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Remembered your password?{" "}
                        <Link href="/sign-in" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

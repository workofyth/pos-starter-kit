"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, MapPin, MessageCircle, ShoppingBag, Loader2, Rocket, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        storeName: "",
        address: "",
        whatsapp: "",
        storeType: "VAPE"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Force a full refresh to update session data
                window.location.href = "/dashboard";
            } else {
                alert("Failed to save settings. Please try again.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const storeTypes = [
        { id: "VAPE", label: "Vape Store", icon: Rocket },
        { id: "WARUNG", label: "Warung / Kelontong", icon: ShoppingBag },
        { id: "MINIMARKET", label: "Minimarket", icon: Store }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/20">
                        <Rocket className="text-white w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Set Up Your POS</h1>
                    <p className="text-gray-500 mt-2">Just a few more details to get your business running</p>
                </div>

                <Card className="border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b p-8">
                        <CardTitle>Business Identity</CardTitle>
                        <CardDescription>This information will appear on your receipts and reports.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold flex items-center gap-2">
                                        <Store className="w-4 h-4 text-blue-600" />
                                        Store Name
                                    </label>
                                    <input 
                                        required
                                        value={formData.storeName}
                                        onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                                        placeholder="e.g. Talertech Vape Jakarta"
                                        className="w-full h-12 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-transparent focus:border-blue-600 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4 text-green-500" />
                                        WhatsApp Number
                                    </label>
                                    <input 
                                        required
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                                        placeholder="e.g. 08123456789"
                                        className="w-full h-12 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-transparent focus:border-blue-600 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-red-500" />
                                    Store Address
                                </label>
                                <textarea 
                                    required
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    placeholder="Full address of your main branch"
                                    className="w-full h-24 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border-transparent focus:border-blue-600 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-bold">What type of business is this?</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {storeTypes.map((t) => (
                                        <div 
                                            key={t.id}
                                            onClick={() => setFormData({...formData, storeType: t.id})}
                                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                                                formData.storeType === t.id 
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                                                : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                                            }`}
                                        >
                                            <t.icon className={`w-6 h-6 ${formData.storeType === t.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={loading}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 group"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Preparing Your Store...
                                    </>
                                ) : (
                                    <>
                                        Launch My POS
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

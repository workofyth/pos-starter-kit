"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Settings,
  Store,
  CreditCard,
  Users,
  Package,
  AlertTriangle,
  BarChart3,
  Globe,
  Loader2
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/lib/role-based-access";
import { toast } from "sonner";


export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [userBranchName, setUserBranchName] = useState<string>("");
  const [userBranchAddress, setUserBranchAddress] = useState<string>("");
  const [isUserLoading, setIsUserLoading] = useState(true);
  
  const [groqApiKey, setGroqApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("groq");
  
  const [isSaving, setIsSaving] = useState(false);

  // Get user's role and branch information
  useEffect(() => {
    const fetchUserBranchInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              const uBranch = result.data[0];
              setUserRole(uBranch.role || 'staff');
              setUserBranchId(uBranch.branchId || null);
              setIsMainAdmin(uBranch.isMainAdmin === true);
              setUserBranchType(uBranch.branch?.type || null);
              setUserBranchName(uBranch.branch?.name || "");
              setUserBranchAddress(uBranch.branch?.address || "");
            }
          }
        } catch (error) {
          console.error('Error fetching user branch info:', error);
        } finally {
          setIsUserLoading(false);
        }
      } else {
        setIsUserLoading(false);
      }
    };

    fetchUserBranchInfo();
    fetchAiSettings();
  }, [session]);

  const fetchAiSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const groq = result.data.find((s: any) => s.key === 'groq_api_key');
          const gemini = result.data.find((s: any) => s.key === 'gemini_api_key');
          const provider = result.data.find((s: any) => s.key === 'ai_provider');
          
          if (groq) setGroqApiKey(groq.value);
          if (provider) setAiProvider(provider.value);
        }
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    }
  };

  const handleSaveIntegration = async () => {
    setIsSaving(true);
    try {
      // Create/Update Settings
      const settingsToSave = [
        { key: 'ai_provider', value: 'groq', description: 'Chosen AI Intelligence provider' },
        { key: 'groq_api_key', value: groqApiKey, description: 'API Key for Groq AI assistant' }
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        });
      }

      toast.success("AI Integration settings saved successfully");
    } catch (error) {
      toast.error("Failed to save AI configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const isSubBranchUser = !isMainAdmin && userBranchType !== 'main' && userBranchId;

  const allTabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "store", label: "Store", icon: Store },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "users", label: "Users", icon: Users },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "reporting", label: "Reporting", icon: BarChart3 },
    { id: "integration", label: "Integration", icon: Globe },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.id === "users") return false;
    if (isSubBranchUser && tab.id === "general") return false;
    return true;
  });

  useEffect(() => {
    if (!isUserLoading) {
      if (isSubBranchUser && activeTab === "general") {
        setActiveTab("store");
      }
    }
  }, [isSubBranchUser, isUserLoading, activeTab]);

  if (isUserLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage POS system configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Settings Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {tabs.find(tab => tab.id === activeTab)?.label} Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">General Configuration</h3>
                    <p className="text-sm text-gray-500">Basic POS system settings</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Business Name</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md" 
                        defaultValue={userBranchName || "My POS Business"}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Business Address</label>
                      <textarea 
                        className="w-full p-2 border rounded-md" 
                        rows={3}
                        defaultValue={userBranchAddress || "Jl. Jend. Sudirman No. 1, Jakarta"}
                      ></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        defaultValue="10"
                      />
                    </div>
                  </div>
                  
                  <Button>Save General Settings</Button>
                </div>
              )}

              {activeTab === "store" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Store Configuration</h3>
                    <p className="text-sm text-gray-500">Store-specific settings</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Store ID</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md" 
                        defaultValue="STORE-001"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Default Currency</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>IDR - Indonesian Rupiah</option>
                        <option>USD - US Dollar</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button>Save Store Settings</Button>
                </div>
              )}

              {activeTab === "payment" && (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Cash Payment</span>
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Card Payment</span>
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                      </div>
                    </div>
                  </div>
                  <Button>Save Payment Settings</Button>
                </div>
              )}

              {activeTab === "integration" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">AI Intelligence Center</h3>
                    <p className="text-sm text-gray-500">Configure your business assistant powerhouse</p>
                  </div>
                  
                  <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                    <div>
                      <h4 className="text-sm font-bold mb-2">Active Provider: Groq (Llama 3.3)</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">API Groq Key</label>
                          <input 
                            type="password" 
                            className="w-full p-2 border rounded-md bg-background" 
                            placeholder="Enter Groq API key"
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">High-speed Llama 3.3 optimized provider</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleSaveIntegration}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing AI Configuration...
                      </>
                    ) : 'Finalize & Save AI Settings'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
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
  Loader2,
  Palette,
  Image as ImageIcon
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
  const [taxRate, setTaxRate] = useState("10");
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  
  const [logoUrl, setLogoUrl] = useState("/codeguide-logo.png");
  const [primaryColor, setPrimaryColor] = useState("#f59e0b"); // Default amber
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(['cash']);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [trackInventory, setTrackInventory] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [enableEmailReports, setEnableEmailReports] = useState(false);
  const [reportInterval, setReportInterval] = useState("daily");
  const [storeId, setStoreId] = useState("STORE-001");
  const [currency, setCurrency] = useState("IDR");
  const [isUploading, setIsUploading] = useState(false);
  
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
          const provider = result.data.find((s: any) => s.key === 'ai_provider');
          const tax = result.data.find((s: any) => s.key === 'tax_rate');
          
          if (groq) setGroqApiKey(groq.value);
          if (provider) setAiProvider(provider.value);
          if (tax) setTaxRate(tax.value);
          const prompt = result.data.find((s: any) => s.key === 'ai_system_prompt');
          if (prompt) setAiSystemPrompt(prompt.value);
          
          const logo = result.data.find((s: any) => s.key === 'logo_url');
          if (logo) setLogoUrl(logo.value);
          
          const color = result.data.find((s: any) => s.key === 'primary_color');
          if (color) setPrimaryColor(color.value);
          
          const name = result.data.find((s: any) => s.key === 'business_name');
          if (name) setBusinessName(name.value);
          
          const address = result.data.find((s: any) => s.key === 'business_address');
          if (address) setBusinessAddress(address.value);
          
          const payments = result.data.find((s: any) => s.key === 'enabled_payment_methods');
          if (payments) {
            try {
              setEnabledPaymentMethods(JSON.parse(payments.value));
            } catch (e) {
              setEnabledPaymentMethods(['cash']);
            }
          }

          const threshold = result.data.find((s: any) => s.key === 'low_stock_threshold');
          if (threshold) setLowStockThreshold(threshold.value);

          const emailReports = result.data.find((s: any) => s.key === 'enable_email_reports');
          if (emailReports) setEnableEmailReports(emailReports.value === 'true');

          const interval = result.data.find((s: any) => s.key === 'report_interval');
          if (interval) setReportInterval(interval.value);

          const bName = result.data.find((s: any) => s.key === 'transfer_bank_name');
          if (bName) setBankName(bName.value);

          const bAcc = result.data.find((s: any) => s.key === 'transfer_account_number');
          if (bAcc) setAccountNumber(bAcc.value);

          const track = result.data.find((s: any) => s.key === 'track_inventory');
          if (track) setTrackInventory(track.value === 'true');

          const negative = result.data.find((s: any) => s.key === 'allow_negative_stock');
          if (negative) setAllowNegativeStock(negative.value === 'true');

          const sId = result.data.find((s: any) => s.key === 'store_id');
          if (sId) setStoreId(sId.value);

          const curr = result.data.find((s: any) => s.key === 'default_currency');
          if (curr) setCurrency(curr.value);
        }
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    }
  };

  const handleSaveIntegration = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: 'ai_provider', value: 'groq', description: 'Chosen AI Intelligence provider' },
        { key: 'groq_api_key', value: groqApiKey, description: 'API Key for Groq AI assistant' },
        { key: 'ai_system_prompt', value: aiSystemPrompt, description: 'AI Chatbot System Prompt (baseContext)' }
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

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: 'tax_rate', value: taxRate, description: 'Default tax rate for POS transactions' },
        { key: 'business_name', value: businessName, description: 'Official business name' },
        { key: 'business_address', value: businessAddress, description: 'Official business address' }
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        });
      }
      toast.success("General settings saved successfully");
    } catch (error) {
      toast.error("Failed to save general settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStore = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: 'store_id', value: storeId, description: 'Internal store identifier' },
        { key: 'default_currency', value: currency, description: 'Default currency for transactions' }
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        });
      }
      toast.success("Store settings saved successfully");
    } catch (error) {
      toast.error("Failed to save store settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayment = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { 
          key: 'enabled_payment_methods', 
          value: JSON.stringify(enabledPaymentMethods), 
          description: 'List of enabled payment methods for POS' 
        },
        { 
          key: 'transfer_bank_name', 
          value: bankName, 
          description: 'Bank name for transfer payments' 
        },
        { 
          key: 'transfer_account_number', 
          value: accountNumber, 
          description: 'Account number for transfer payments' 
        }
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        });
      }
      toast.success("Payment settings saved successfully");
    } catch (error) {
      toast.error("Failed to save payment settings");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePaymentMethod = (method: string) => {
    setEnabledPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method) 
        : [...prev, method]
    );
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: 'logo_url', value: logoUrl, description: 'Application logo URL' },
        { key: 'primary_color', value: primaryColor, description: 'Application theme primary color' }
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        });
      }
      toast.success("Appearance settings saved successfully");
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast.error("Failed to save appearance settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAlerts = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: 'low_stock_threshold', value: lowStockThreshold, description: 'Threshold for low stock alerts' },
        { key: 'enable_email_reports', value: enableEmailReports.toString(), description: 'Enable daily email reports' }
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        });
      }
      toast.success("Alert settings saved successfully");
    } catch (error) {
      toast.error("Failed to save alert settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReporting = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'report_interval', value: reportInterval, description: 'Frequency of automated reports' })
      });
      toast.success("Reporting settings saved successfully");
    } catch (error) {
      toast.error("Failed to save reporting settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInventory = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: 'track_inventory', value: trackInventory.toString(), description: 'Enable global stock tracking' },
        { key: 'allow_negative_stock', value: allowNegativeStock.toString(), description: 'Allow sales when stock is zero' }
      ];

      for (const setting of settingsToSave) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setting)
        });
      }
      toast.success("Inventory settings saved successfully");
    } catch (error) {
      toast.error("Failed to save inventory settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/products/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLogoUrl(result.data.imageUrl);
          toast.success("Logo uploaded successfully. Don't forget to save changes.");
        }
      } else {
        toast.error("Failed to upload logo");
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error("Error uploading logo");
    } finally {
      setIsUploading(false);
    }
  };

  const isSubBranchUser = !isMainAdmin && userBranchType !== 'main' && userBranchId;

  const allTabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "store", label: "Store", icon: Store },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "users", label: "Users", icon: Users },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "reporting", label: "Reporting", icon: BarChart3 },
    { id: "integration", label: "Integration", icon: Globe },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.id === "users") return false;
    
    // Settings restricted to main branch only
    const mainBranchOnlyTabs = ["general", "appearance", "integration", "alerts", "reporting", "inventory"];
    if (isSubBranchUser && mainBranchOnlyTabs.includes(tab.id)) return false;
    
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
                      <label className="block text-sm font-medium mb-1 text-foreground">Business Name</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md bg-secondary/50 text-foreground" 
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. My Awesome Shop"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Business Address</label>
                      <textarea 
                        className="w-full p-2 border rounded-md bg-secondary/50 text-foreground" 
                        rows={3}
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="Jl. Raya Utama No. 123"
                      ></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Tax Rate (%)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md bg-secondary/50 text-foreground" 
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveGeneral} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save General Settings"}
                  </Button>
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
                      <label className="block text-sm font-medium mb-1 text-foreground">Store ID</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md bg-secondary/50 text-foreground" 
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value)}
                        placeholder="e.g. STORE-001"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-foreground">Default Currency</label>
                      <select 
                        className="w-full p-2 border rounded-md bg-secondary/50 text-foreground"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option value="IDR" className="bg-background text-foreground">IDR - Indonesian Rupiah</option>
                        <option value="USD" className="bg-background text-foreground">USD - US Dollar</option>
                        <option value="SGD" className="bg-background text-foreground">SGD - Singapore Dollar</option>
                        <option value="MYR" className="bg-background text-foreground">MYR - Malaysian Ringgit</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveStore} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Store Settings"}
                  </Button>
                </div>
              )}

              {activeTab === "payment" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Payment Configuration</h3>
                    <p className="text-sm text-gray-500">Configure accepted payment methods and gateways</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'cash', label: 'Cash Payment', desc: 'Accept physical currency' },
                        { id: 'card', label: 'Card / EDC', desc: 'Debit and Credit card payments' },
                        { id: 'transfer', label: 'Bank Transfer', desc: 'Direct bank transfer payments' },
                        { id: 'credit', label: 'Credit / Hutang', desc: 'Buy now pay later for trusted members' }
                      ].map((method) => (
                        <div 
                          key={method.id}
                          className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                            enabledPaymentMethods.includes(method.id) ? 'bg-primary/5 border-primary' : 'bg-background hover:bg-muted/50'
                          }`}
                          onClick={() => togglePaymentMethod(method.id)}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{method.label}</span>
                            <span className="text-[10px] text-muted-foreground">{method.desc}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            enabledPaymentMethods.includes(method.id) ? 'bg-primary border-primary' : 'bg-background'
                          }`}>
                            {enabledPaymentMethods.includes(method.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {enabledPaymentMethods.includes('transfer') && (
                      <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                        <h4 className="text-sm font-bold">Transfer Details</h4>
                        <p className="text-xs text-muted-foreground italic">Add your bank account details for customers to see during checkout.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">Bank Name</label>
                            <input 
                              type="text" 
                              className="w-full p-2 text-sm border rounded-md bg-background" 
                              placeholder="e.g. BCA, Mandiri" 
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Account Number</label>
                            <input 
                              type="text" 
                              className="w-full p-2 text-sm border rounded-md bg-background" 
                              placeholder="0000000000" 
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button onClick={handleSavePayment} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Payment Settings"}
                  </Button>
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
                            className="w-full p-2 border rounded-md bg-secondary/50 text-foreground" 
                            placeholder="Enter Groq API key"
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">High-speed Llama 3.3 optimized provider</p>
                        </div>
                      </div>
                    </div>
                  
                  <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                    <div>
                      <label className="block text-sm font-bold mb-2">AI System Prompt (baseContext)</label>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Gunakan <code className="bg-muted px-1 rounded">{'{{TAX_RATE}}'}</code> untuk menyisipkan nilai pajak secara dinamis.
                      </p>
                      <textarea
                        className="w-full p-2 border rounded-md bg-secondary/50 text-foreground font-mono text-xs"
                        rows={12}
                        placeholder="Masukkan system prompt untuk AI Chatbot..."
                        value={aiSystemPrompt}
                        onChange={(e) => setAiSystemPrompt(e.target.value)}
                      />
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

              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Appearance & Branding</h3>
                    <p className="text-sm text-gray-500">Customize the look and feel of your application</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-xl bg-muted/20">
                        <label className="block text-sm font-bold mb-4">Application Logo</label>
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative w-32 h-32 border-2 border-dashed rounded-xl flex items-center justify-center bg-background overflow-hidden group">
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-muted-foreground" />
                            )}
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium">
                              Change Logo
                              <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                            </label>
                          </div>
                          <div className="w-full">
                            <label className="block text-xs font-medium mb-1 text-muted-foreground">Logo URL</label>
                            <input 
                              type="text" 
                              className="w-full p-2 text-sm border rounded-md bg-secondary/50 text-foreground" 
                              value={logoUrl}
                              onChange={(e) => setLogoUrl(e.target.value)}
                              placeholder="/logo.png"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 border rounded-xl bg-muted/20">
                        <label className="block text-sm font-bold mb-4">Theme Color</label>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium mb-2 text-muted-foreground">Primary Brand Color</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="color" 
                                className="w-12 h-12 rounded-lg border-0 p-0 cursor-pointer overflow-hidden" 
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                              />
                              <input 
                                type="text" 
                                className="flex-1 p-2 text-sm border rounded-md bg-secondary/50 text-foreground uppercase font-mono" 
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="pt-4">
                            <label className="block text-xs font-medium mb-2 text-muted-foreground">Preset Colors</label>
                            <div className="flex flex-wrap gap-2">
                              {['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'].map((color) => (
                                <button
                                  key={color}
                                  className={`w-8 h-8 rounded-full border-2 ${primaryColor === color ? 'border-foreground' : 'border-transparent'}`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => setPrimaryColor(color)}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="mt-6 p-3 rounded-lg bg-background border text-center">
                            <div className="text-xs font-medium mb-1 opacity-70">Preview</div>
                            <Button size="sm" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                              Primary Button
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full md:w-auto px-8" 
                    onClick={handleSaveAppearance}
                    disabled={isSaving || isUploading}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : 'Save Appearance Settings'}
                  </Button>
                </div>
              )}

              {activeTab === "alerts" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Alerts & Notifications</h3>
                    <p className="text-sm text-gray-500">Configure system alerts and email notifications</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                      <h4 className="text-sm font-bold">Inventory Alerts</h4>
                      <div>
                        <label className="block text-xs font-medium mb-1">Low Stock Threshold</label>
                        <input 
                          type="number" 
                          className="w-full max-w-xs p-2 text-sm border rounded-md bg-background" 
                          value={lowStockThreshold}
                          onChange={(e) => setLowStockThreshold(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Notify when stock level drops below this value</p>
                      </div>
                    </div>

                    <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold">Email Reports</h4>
                          <p className="text-[10px] text-muted-foreground">Receive automated summary reports via email</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5" 
                          checked={enableEmailReports}
                          onChange={(e) => setEnableEmailReports(e.target.checked)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveAlerts} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Alert Settings"}
                  </Button>
                </div>
              )}

              {activeTab === "reporting" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Reporting Configuration</h3>
                    <p className="text-sm text-gray-500">Manage how data is processed and reported</p>
                  </div>
                  
                  <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                    <div>
                      <label className="block text-xs font-medium mb-1">Report Generation Frequency</label>
                      <select 
                        className="w-full max-w-xs p-2 text-sm border rounded-md bg-secondary/50 text-foreground"
                        value={reportInterval}
                        onChange={(e) => setReportInterval(e.target.value)}
                      >
                        <option value="daily" className="bg-background text-foreground">Daily</option>
                        <option value="weekly" className="bg-background text-foreground">Weekly</option>
                        <option value="monthly" className="bg-background text-foreground">Monthly</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveReporting} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Reporting Settings"}
                  </Button>
                </div>
              )}

              {activeTab === "inventory" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Inventory & SKU Settings</h3>
                    <p className="text-sm text-gray-500">Global configuration for product stock and identifiers</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold">Stock Tracking</h4>
                          <p className="text-[10px] text-muted-foreground">Monitor stock levels across all branches</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5" 
                          checked={trackInventory}
                          onChange={(e) => setTrackInventory(e.target.checked)}
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-xl bg-muted/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold">Allow Negative Stock</h4>
                          <p className="text-[10px] text-muted-foreground">Allow sales even if stock is unavailable</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5" 
                          checked={allowNegativeStock}
                          onChange={(e) => setAllowNegativeStock(e.target.checked)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveInventory} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Inventory Settings"}
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
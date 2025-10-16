"use client";

import { useState } from "react";
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
  Globe
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "store", label: "Store", icon: Store },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "users", label: "Users", icon: Users },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "reporting", label: "Reporting", icon: BarChart3 },
    { id: "integration", label: "Integration", icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage POS system configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
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

        {/* Settings Content */}
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
                        defaultValue="My POS Business"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Business Address</label>
                      <textarea 
                        className="w-full p-2 border rounded-md" 
                        rows={3}
                        defaultValue="Jl. Jend. Sudirman No. 1, Jakarta"
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
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="round-total" 
                        className="h-4 w-4"
                        defaultChecked
                      />
                      <label htmlFor="round-total" className="text-sm font-medium">
                        Round total to nearest 100
                      </label>
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
                        <option>EUR - Euro</option>
                        <option>GBP - British Pound</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Store Timezone</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Asia/Jakarta</option>
                        <option>Asia/Makassar</option>
                        <option>Asia/Jayapura</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button>Save Store Settings</Button>
                </div>
              )}

              {activeTab === "payment" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Payment Configuration</h3>
                    <p className="text-sm text-gray-500">Payment method settings</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Cash Payment</span>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          defaultChecked
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Card Payment</span>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          defaultChecked
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Transfer Payment</span>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          defaultChecked
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Payment Gateway</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>None (Manual)</option>
                        <option>Midtrans</option>
                        <option>Stripe</option>
                        <option>PayPal</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button>Save Payment Settings</Button>
                </div>
              )}

              {activeTab === "users" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">User Management</h3>
                    <p className="text-sm text-gray-500">User access and permissions</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Default Role for New Users</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Cashier</option>
                        <option>Manager</option>
                        <option>Admin</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="require-pin" 
                        className="h-4 w-4"
                        defaultChecked
                      />
                      <label htmlFor="require-pin" className="text-sm font-medium">
                        Require PIN for admin actions
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="auto-logout" 
                        className="h-4 w-4"
                        defaultChecked
                      />
                      <label htmlFor="auto-logout" className="text-sm font-medium">
                        Auto logout after 30 minutes of inactivity
                      </label>
                    </div>
                  </div>
                  
                  <Button>Save User Settings</Button>
                </div>
              )}

              {activeTab === "inventory" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Inventory Configuration</h3>
                    <p className="text-sm text-gray-500">Inventory tracking settings</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md" 
                        defaultValue="5"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="auto-alert" 
                        className="h-4 w-4"
                        defaultChecked
                      />
                      <label htmlFor="auto-alert" className="text-sm font-medium">
                        Enable low stock alerts
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="dead-stock" 
                        className="h-4 w-4"
                        defaultChecked
                      />
                      <label htmlFor="dead-stock" className="text-sm font-medium">
                        Track dead stock (items not sold in 30 days)
                      </label>
                    </div>
                  </div>
                  
                  <Button>Save Inventory Settings</Button>
                </div>
              )}

              {activeTab === "alerts" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Alert Configuration</h3>
                    <p className="text-sm text-gray-500">System notifications and alerts</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Low Stock Alerts</span>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          defaultChecked
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Dead Stock Alerts</span>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          defaultChecked
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Expired Item Alerts</span>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Payment Due Alerts</span>
                        <input 
                          type="checkbox" 
                          className="h-4 w-4" 
                          defaultChecked
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button>Save Alert Settings</Button>
                </div>
              )}

              {activeTab === "reporting" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Reporting Configuration</h3>
                    <p className="text-sm text-gray-500">Report generation settings</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Report Timezone</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Asia/Jakarta</option>
                        <option>Asia/Makassar</option>
                        <option>Asia/Jayapura</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Default Report Period</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Quarter</option>
                        <option>This Year</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="auto-export" 
                        className="h-4 w-4"
                        defaultChecked
                      />
                      <label htmlFor="auto-export" className="text-sm font-medium">
                        Auto-export daily reports
                      </label>
                    </div>
                  </div>
                  
                  <Button>Save Reporting Settings</Button>
                </div>
              )}

              {activeTab === "integration" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Integration Configuration</h3>
                    <p className="text-sm text-gray-500">Third-party service integrations</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">API Key</label>
                      <input 
                        type="password" 
                        className="w-full p-2 border rounded-md" 
                        placeholder="Enter API key"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Accounting Software</span>
                        <select className="p-1 border rounded">
                          <option>None</option>
                          <option>Accurate</option>
                          <option>Aplos</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Inventory Sync</span>
                        <select className="p-1 border rounded">
                          <option>Disabled</option>
                          <option>Enabled</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Cloud Backup</span>
                        <select className="p-1 border rounded">
                          <option>Disabled</option>
                          <option>Enabled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <Button>Save Integration Settings</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
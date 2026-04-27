"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { HeroAuthButtons } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShoppingCart,
  Package,
  Bot,
  BarChart3,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldCheck,
  Star,
  Quote,
  TrendingUp,
  DollarSign
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/assets/images/products/default_logo_png.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TALERTECH
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
            <Link href="#services" className="hover:text-blue-600 transition-colors">Services</Link>
            <Link href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden sm:block">
               <HeroAuthButtons />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6">
              <Zap className="w-3 h-3" />
              <span>THE NEXT GENERATION OF POS SYSTEMS</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
              Elevate Your Business with{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 bg-clip-text text-transparent">
                TALERTECH
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Manage inventory, split branches, and gain AI-powered insights with the world's most versatile cloud-based Point of Sale.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-8 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 rounded-2xl group">
                  Start 14-Day Free Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold rounded-2xl border-2">
                Watch Demo
              </Button>
            </div>

            {/* Dashboard Preview */}
            <div className="relative group max-w-5xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
                <div className="h-8 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="aspect-video bg-gray-50 dark:bg-gray-900/50 p-4 lg:p-6 overflow-hidden relative flex flex-col gap-4">
                  {/* Mockup Dashboard Content - Reporting Style */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Revenue", val: "Rp 128.4M", color: "blue", icon: DollarSign },
                      { label: "Net Profit", val: "Rp 25.6M", color: "green", icon: TrendingUp },
                      { label: "Transactions", val: "1,240", color: "purple", icon: ShoppingCart },
                      { label: "Inventory", val: "Rp 450.2M", color: "yellow", icon: Package }
                    ].map((s, i) => (
                      <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${s.color}-100 dark:bg-${s.color}-900/30 text-${s.color}-600 dark:text-${s.color}-400`}>
                          <s.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{s.label}</p>
                          <p className="text-sm font-bold">{s.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Sales Overview</p>
                      <div className="flex-1 flex items-end gap-2 pb-2">
                        {[40, 70, 45, 90, 65, 80, 50, 60, 85, 40, 75, 95].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-600 rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Revenue by Category</p>
                       <div className="flex-1 flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full border-[16px] border-blue-600 border-r-indigo-500 border-b-emerald-500 border-l-amber-500 animate-spin-slow" />
                       </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-3">Top Selling Products</p>
                    <div className="space-y-2">
                      {[
                        { name: "Liquid Cream 60ml", sold: 142, revenue: "Rp 12.4M" },
                        { name: "Pod System X-Pro", sold: 85, revenue: "Rp 8.2M" }
                      ].map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] border-b border-gray-50 dark:border-gray-700/50 pb-2 last:border-0 last:pb-0">
                          <span className="font-medium">{p.name}</span>
                          <div className="flex gap-4">
                            <span className="text-gray-400">{p.sold} sold</span>
                            <span className="font-bold text-blue-600">{p.revenue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="services" className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Core Business Services</h2>
            <p className="text-gray-600 dark:text-gray-400">Everything you need to scale your retail or restaurant empire from one to one hundred locations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: ShoppingCart,
                title: "Smart Checkout (POS)",
                description: "Lightning-fast transaction processing with support for split bills, multiple payment methods, and offline mode.",
                color: "blue"
              },
              {
                icon: Package,
                title: "Inventory Intelligence",
                description: "Real-time stock tracking with automated reordering, low-stock alerts, and detailed mutation history.",
                color: "indigo"
              },
              {
                icon: Bot,
                title: "AI Business Assistant",
                description: "Your own Llama 3.3 powered consultant that analyzes sales trends and identifies profit opportunities.",
                color: "purple"
              },
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description: "Deep-dive financial reports, omset details, and daily performance metrics exported in PDF or Excel.",
                color: "cyan"
              },
              {
                icon: Building2,
                title: "Multi-Branch Hub",
                description: "Centralized management for sub-branches with approval workflows for inventory splits and staff transfers.",
                color: "emerald"
              },
              {
                icon: Users,
                title: "Loyalty & Members",
                description: "Integrated point system and member tiers to drive customer retention and increase lifetime value.",
                color: "pink"
              }
            ].map((service, i) => (
              <Card key={i} className="p-8 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-2xl transition-all duration-300 group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-${service.color}-100 dark:bg-${service.color}-900/30 text-${service.color}-600 dark:text-${service.color}-400 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-4">{service.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {service.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Detail Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl blur-3xl opacity-10"></div>
              <div className="relative rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl bg-white dark:bg-gray-900">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="font-bold text-lg">Inventory Flow</h4>
                    <Badge className="bg-blue-50 text-blue-600 border-blue-100">Live Updates</Badge>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: "Liquid Cream 60ml", stock: 142, status: "Healthy" },
                      { name: "Pod System X-Pro", stock: 12, status: "Low Stock" },
                      { name: "Replacement Coil 0.8", stock: 250, status: "Surplus" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.name}</p>
                            <p className="text-[10px] text-gray-400">Updated 2m ago</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{item.stock}</p>
                          <p className={`text-[10px] ${item.status === 'Low Stock' ? 'text-red-500' : 'text-emerald-500'}`}>{item.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-8 leading-tight">
                Control Your Entire Ecosystem from a{" "}
                <span className="text-blue-600">Single Dashboard</span>
              </h2>
              <div className="space-y-6">
                {[
                  { title: "Real-time Sync", desc: "Instantly synchronize stock and sales data across all devices and locations." },
                  { title: "Role-Based Security", desc: "Granular permissions for cashiers, branch managers, and regional directors." },
                  { title: "Automated Tax & Reports", desc: "Configurable tax rates and automated daily omset summaries sent to your email." }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{feature.title}</h4>
                      <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Transparent Pricing</h2>
            <p className="text-gray-600 dark:text-gray-400">Choose the plan that fits your current scale. Upgrade or downgrade anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Startup",
                price: "Rp 299rb",
                desc: "Sangat cocok untuk satu cabang yang baru mulai.",
                features: ["1 Cabang", "Standard POS", "Inventaris Dasar", "Laporan Email Harian"],
                recommended: false
              },
              {
                name: "Business Pro",
                price: "Rp 799rb",
                desc: "Ideal untuk rantai bisnis multi-cabang yang berkembang.",
                features: ["Hingga 5 Cabang", "Inventaris Lanjutan", "Akses AI Assistant", "Manajemen Berbasis Peran", "Ekspor Excel/PDF"],
                recommended: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                desc: "Untuk kerajaan ritel besar dan waralaba.",
                features: ["Cabang Tanpa Batas", "Akses API Penuh", "Manajer Akun Khusus", "Opsi White-label", "Dukungan Prioritas 24/7"],
                recommended: false
              }
            ].map((plan, i) => (
              <Card key={i} className={`p-8 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col ${plan.recommended ? 'ring-2 ring-blue-600 shadow-2xl scale-105 z-10' : ''}`}>
                {plan.recommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                    PALING POPULER
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== 'Custom' && <span className="text-gray-500">/bln</span>}
                  </div>
                  <p className="text-sm text-gray-500">{plan.desc}</p>
                </div>
                
                <div className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button className={`w-full rounded-xl h-12 font-bold ${plan.recommended ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200'}`}>
                  Get Started
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 border-t border-gray-100 dark:border-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-6 h-6 fill-current" />)}
              </div>
              <blockquote className="text-3xl font-medium leading-tight">
                "TALERTECH transformed our boutique vape shop from a messy spreadsheet nightmare into a streamlined, multi-branch machine. The AI Assistant alone saved us hours in stock analysis."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Quote className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold">Budi Santoso</p>
                  <p className="text-sm text-gray-500">CEO, Indonesian Vape Empire</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-600 rounded-[2.5rem] p-12 text-white flex flex-col justify-center">
               <h3 className="text-4xl font-bold mb-6">Ready to scale your business?</h3>
               <p className="text-blue-100 mb-8 text-lg">Join 2,000+ businesses who switched to TALERTECH and saw a 30% increase in operational efficiency.</p>
               <div className="flex flex-wrap gap-4">
                  <Link href="/sign-up">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-bold h-14 px-8 rounded-2xl">
                       Get Started Now
                    </Button>
                  </Link>
                  <Button size="lg" variant="ghost" className="text-white hover:bg-blue-500 font-bold h-14 px-8 rounded-2xl">
                     Contact Sales
                  </Button>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 dark:border-gray-900">
        <div className="container mx-auto px-4 text-center">
           <div className="flex items-center justify-center gap-2 mb-6">
            <Image
              src="/assets/images/products/default_logo_png.png"
              alt="Logo"
              width={24}
              height={24}
              className="rounded-md"
            />
            <span className="font-bold tracking-tight">TALERTECH</span>
          </div>
          <p className="text-sm text-gray-500 mb-8">© 2026 TALERTECH Inc. All rights reserved.</p>
          <div className="flex justify-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#" className="hover:text-blue-600">Privacy Policy</Link>
            <Link href="#" className="hover:text-blue-600">Terms of Service</Link>
            <Link href="#" className="hover:text-blue-600">Documentation</Link>
            <Link href="#" className="hover:text-blue-600">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${className}`}>
      {children}
    </span>
  );
}

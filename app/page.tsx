"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { HeroAuthButtons, AuthButtons } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Package,
  Bot,
  BarChart3,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Star,
  Quote,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const accentChips = [
  "bg-primary/10 text-primary",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-chart-5/10 text-chart-5",
];

export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Navigation */}
      <header className="bg-background/85 border-border fixed top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-card ring-border flex size-9 items-center justify-center overflow-hidden rounded-lg shadow-soft ring-1">
              <Image
                src="/assets/images/products/default_logo_png.png"
                alt="Logo"
                width={36}
                height={36}
                className="size-full object-contain p-1"
              />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              TALERTECH
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Services</Link>
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:block">
              <AuthButtons />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-28">
        {/* Soft atmosphere */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="bg-primary/10 absolute -top-24 left-[8%] h-72 w-72 rounded-full blur-[100px]" />
          <div className="bg-chart-3/15 absolute top-1/3 right-[6%] h-80 w-80 rounded-full blur-[110px]" />
          <div className="bg-secondary absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-40 blur-[100px]" />
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="bg-card border-border text-primary mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide uppercase shadow-soft">
              <Sparkles className="size-3.5" />
              <span>Point of Sale, made calm</span>
            </div>

            <h1 className="font-display mb-7 text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Run every branch from{" "}
              <span className="text-primary">one quiet dashboard</span>
            </h1>

            <p className="text-muted-foreground mx-auto mb-10 max-w-xl text-lg leading-relaxed">
              Manage inventory, split branches, and gain AI-powered insights with
              a point of sale built to feel effortless, day after day.
            </p>

            <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <HeroAuthButtons />
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative mx-auto max-w-5xl">
            <div className="bg-card border-border relative overflow-hidden rounded-[1.75rem] border shadow-soft-lg">
              <div className="border-border bg-muted/60 flex h-9 items-center gap-2 border-b px-4">
                <div className="bg-destructive/60 size-2.5 rounded-full" />
                <div className="bg-chart-4/70 size-2.5 rounded-full" />
                <div className="bg-chart-2/70 size-2.5 rounded-full" />
              </div>
              <div className="bg-muted/40 relative flex aspect-video flex-col gap-4 overflow-hidden p-4 lg:p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Revenue", val: "Rp 128.4M", icon: DollarSign },
                    { label: "Net Profit", val: "Rp 25.6M", icon: TrendingUp },
                    { label: "Transactions", val: "1,240", icon: ShoppingCart },
                    { label: "Inventory", val: "Rp 450.2M", icon: Package },
                  ].map((s, i) => (
                    <div key={i} className="bg-card border-border flex items-center gap-3 rounded-xl border p-3 shadow-soft">
                      <div className={`rounded-lg p-2 ${accentChips[i % accentChips.length]}`}>
                        <s.icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-wide">{s.label}</p>
                        <p className="text-sm font-bold">{s.val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-card border-border flex flex-col rounded-xl border p-4 shadow-soft">
                    <p className="text-muted-foreground mb-4 text-[10px] font-bold uppercase tracking-wide">Sales Overview</p>
                    <div className="flex flex-1 items-end gap-2 pb-2">
                      {[40, 70, 45, 90, 65, 80, 50, 60, 85, 40, 75, 95].map((h, i) => (
                        <div key={i} className="bg-primary/80 flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>

                  <div className="bg-card border-border flex flex-col rounded-xl border p-4 shadow-soft">
                    <p className="text-muted-foreground mb-4 text-[10px] font-bold uppercase tracking-wide">Revenue by Category</p>
                    <div className="flex flex-1 items-center justify-center">
                      <div className="border-primary border-r-chart-3 border-b-chart-2 border-l-chart-4 animate-spin-slow size-24 rounded-full border-[16px]" />
                    </div>
                  </div>
                </div>

                <div className="bg-card border-border rounded-xl border p-4 shadow-soft">
                  <p className="text-muted-foreground mb-3 text-[10px] font-bold uppercase tracking-wide">Top Selling Products</p>
                  <div className="space-y-2">
                    {[
                      { name: "Liquid Cream 60ml", sold: 142, revenue: "Rp 12.4M" },
                      { name: "Pod System X-Pro", sold: 85, revenue: "Rp 8.2M" },
                    ].map((p, i) => (
                      <div key={i} className="border-border/60 flex items-center justify-between border-b pb-2 text-[10px] last:border-0 last:pb-0">
                        <span className="font-medium">{p.name}</span>
                        <div className="flex gap-4">
                          <span className="text-muted-foreground">{p.sold} sold</span>
                          <span className="text-primary font-bold">{p.revenue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="services" className="bg-muted/40 py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display mb-5 text-3xl font-bold tracking-tight lg:text-4xl">Core business services</h2>
            <p className="text-muted-foreground text-lg">Everything you need to scale your retail or restaurant business from one to one hundred locations.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ShoppingCart, title: "Smart Checkout (POS)", description: "Lightning-fast transaction processing with support for split bills, multiple payment methods, and offline mode." },
              { icon: Package, title: "Inventory Intelligence", description: "Real-time stock tracking with automated reordering, low-stock alerts, and detailed mutation history." },
              { icon: Bot, title: "AI Business Assistant", description: "Your own AI-powered consultant that analyzes sales trends and identifies profit opportunities." },
              { icon: BarChart3, title: "Advanced Analytics", description: "Deep-dive financial reports, revenue details, and daily performance metrics exported in PDF or Excel." },
              { icon: Building2, title: "Multi-Branch Hub", description: "Centralized management for sub-branches with approval workflows for inventory splits and staff transfers." },
              { icon: Users, title: "Loyalty & Members", description: "Integrated point system and member tiers to drive customer retention and increase lifetime value." },
            ].map((service, i) => (
              <Card key={i} className="hover:shadow-soft-lg group p-8 transition-shadow duration-300">
                <div className={`mb-6 flex size-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${accentChips[i % accentChips.length]}`}>
                  <service.icon className="size-7" />
                </div>
                <h3 className="font-display mb-3 text-xl font-bold tracking-tight">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Detail Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <Card className="overflow-hidden p-8">
              <div className="mb-8 flex items-center justify-between">
                <h4 className="font-display text-lg font-bold tracking-tight">Inventory Flow</h4>
                <Badge className="bg-primary/10 text-primary border-transparent">Live Updates</Badge>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Liquid Cream 60ml", stock: 142, status: "Healthy", ok: true },
                  { name: "Pod System X-Pro", stock: 12, status: "Low Stock", ok: false },
                  { name: "Replacement Coil 0.8", stock: 250, status: "Surplus", ok: true },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/50 flex items-center justify-between rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-card border-border flex size-10 items-center justify-center rounded-lg border">
                        <Package className="text-muted-foreground size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-muted-foreground text-[10px]">Updated 2m ago</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{item.stock}</p>
                      <p className={`text-[10px] ${item.ok ? "text-chart-2" : "text-destructive"}`}>{item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div>
              <h2 className="font-display mb-8 text-3xl leading-tight font-bold tracking-tight lg:text-4xl">
                Control your entire ecosystem from a{" "}
                <span className="text-primary">single dashboard</span>
              </h2>
              <div className="space-y-6">
                {[
                  { title: "Real-time Sync", desc: "Instantly synchronize stock and sales data across all devices and locations." },
                  { title: "Role-Based Security", desc: "Granular permissions for cashiers, branch managers, and regional directors." },
                  { title: "Automated Tax & Reports", desc: "Configurable tax rates and automated daily summaries sent to your email." },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-0.5">
                      <CheckCircle2 className="text-chart-2 size-6" />
                    </div>
                    <div>
                      <h4 className="font-display mb-1 text-lg font-bold tracking-tight">{feature.title}</h4>
                      <p className="text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/40 py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display mb-5 text-3xl font-bold tracking-tight lg:text-4xl">Transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Choose the plan that fits your current scale. Upgrade or downgrade anytime.</p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                name: "Monthly",
                price: "Rp 99rb",
                unit: "/bln",
                desc: "Sangat cocok untuk satu cabang yang baru mulai.",
                features: ["1 Cabang", "Standard POS", "Inventaris Dasar", "Laporan Email Harian"],
                recommended: false,
                link: "/payment-gateway?plan=monthly",
              },
              {
                name: "Yearly",
                price: "Rp 999rb",
                unit: "/thn",
                desc: "Hemat lebih banyak dengan komitmen tahunan.",
                features: ["5 Cabang", "Inventaris Lanjutan", "Akses AI Assistant", "Ekspor Excel/PDF", "Dukungan Prioritas"],
                recommended: true,
                link: "/payment-gateway?plan=yearly",
              },
              {
                name: "One Payment",
                price: "Rp 1.999rb",
                unit: null,
                desc: "Bayar sekali, gunakan selamanya. Tanpa biaya bulanan.",
                features: ["Cabang Tanpa Batas", "Akses AI Assistant", "Opsi White-label", "Update Selamanya", "Dukungan VIP"],
                recommended: false,
                link: "/payment-gateway?plan=permanent",
              },
            ].map((plan, i) => (
              <Card
                key={i}
                className={`relative flex flex-col p-8 ${
                  plan.recommended ? "ring-primary/60 shadow-soft-lg z-10 scale-105 ring-2" : ""
                }`}
              >
                {plan.recommended && (
                  <div className="bg-primary text-primary-foreground absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 text-xs font-bold tracking-wide">
                    PALING POPULER
                  </div>
                )}
                {plan.name === "One Payment" && (
                  <Badge className="bg-chart-2/10 text-chart-2 absolute top-4 right-4 border-transparent">LIFETIME</Badge>
                )}
                <div className="mb-8">
                  <h3 className="font-display mb-2 text-xl font-bold tracking-tight">{plan.name}</h3>
                  <div className="mb-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold">{plan.price}</span>
                    {plan.unit && <span className="text-muted-foreground">{plan.unit}</span>}
                  </div>
                  <p className="text-muted-foreground text-sm">{plan.desc}</p>
                </div>

                <div className="mb-8 flex-1 space-y-4">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="text-primary size-4 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button asChild size="lg" variant={plan.recommended ? "default" : "secondary"} className="w-full">
                  <Link href={plan.link}>Get Started</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-border border-t py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="space-y-8">
              <div className="text-chart-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-5 fill-current" />
                ))}
              </div>
              <blockquote className="font-display text-2xl leading-tight font-medium tracking-tight lg:text-3xl">
                &ldquo;TALERTECH transformed our boutique vape shop from a messy
                spreadsheet nightmare into a streamlined, multi-branch machine.
                The AI Assistant alone saved us hours in stock analysis.&rdquo;
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                  <Quote className="text-primary size-6" />
                </div>
                <div>
                  <p className="font-bold">Budi Santoso</p>
                  <p className="text-muted-foreground text-sm">CEO, Indonesian Vape Empire</p>
                </div>
              </div>
            </div>
            <Card className="bg-primary text-primary-foreground flex flex-col justify-center rounded-[2rem] border-none p-12 shadow-soft-lg">
              <h3 className="font-display mb-6 text-3xl font-bold tracking-tight lg:text-4xl">Ready to scale your business?</h3>
              <p className="mb-8 text-lg opacity-90">Join 2,000+ businesses who switched to TALERTECH and saw a 30% increase in operational efficiency.</p>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" variant="secondary" className="text-primary bg-white hover:bg-white/90">
                  <Link href="/sign-up">
                    Get Started Now
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                  <Link href="#">Contact Sales</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border border-t py-12">
        <div className="container mx-auto px-4 text-center sm:px-6">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Image
              src="/assets/images/products/default_logo_png.png"
              alt="Logo"
              width={24}
              height={24}
              className="rounded-md"
            />
            <span className="font-display font-bold tracking-tight">TALERTECH</span>
          </div>
          <p className="text-muted-foreground mb-8 text-sm">© 2026 TALERTECH Inc. All rights reserved.</p>
          <div className="text-muted-foreground flex flex-wrap justify-center gap-6 text-sm font-medium sm:gap-8">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

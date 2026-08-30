export type PlanKey = "free" | "monthly" | "yearly" | "permanent";

export type PlanFeatures = {
  aiAssistant: boolean;
  excelPdfExport: boolean;
  whiteLabel: boolean;
};

export type Plan = {
  key: PlanKey;
  label: string;
  price: string;
  unit: string | null;
  interval: string;
  desc: string;
  /** Sub-branches allowed in addition to the main branch. Infinity = unlimited. */
  maxSubBranches: number;
  features: PlanFeatures;
  featureList: string[];
  recommended?: boolean;
};

/**
 * Canonical plan definitions — single source of truth for pricing copy,
 * sub-branch limits, and feature gating. Keyed by the plan names actually
 * sold via iPaymu (monthly/yearly/permanent); "free" is the pre-purchase
 * default a trialing/expired account has.
 */
export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    label: "Free Trial",
    price: "Rp 0",
    unit: null,
    interval: "14 hari",
    desc: "Masa percobaan.",
    maxSubBranches: 0,
    features: { aiAssistant: false, excelPdfExport: false, whiteLabel: false },
    featureList: ["1 Cabang", "Standard POS", "Inventaris Dasar"],
  },
  monthly: {
    key: "monthly",
    label: "Monthly",
    price: "Rp 99rb",
    unit: "/bln",
    interval: "Bulan",
    desc: "Sangat cocok untuk satu cabang yang baru mulai.",
    maxSubBranches: 0,
    features: { aiAssistant: false, excelPdfExport: false, whiteLabel: false },
    featureList: ["1 Cabang", "Standard POS", "Inventaris Dasar", "Laporan Email Harian"],
  },
  yearly: {
    key: "yearly",
    label: "Yearly",
    price: "Rp 999rb",
    unit: "/thn",
    interval: "Tahun",
    desc: "Hemat lebih banyak dengan komitmen tahunan.",
    maxSubBranches: 4,
    features: { aiAssistant: true, excelPdfExport: true, whiteLabel: false },
    featureList: ["5 Cabang", "Inventaris Lanjutan", "Akses AI Assistant", "Ekspor Excel/PDF", "Dukungan Prioritas"],
    recommended: true,
  },
  permanent: {
    key: "permanent",
    label: "One Payment",
    price: "Rp 1.999rb",
    unit: null,
    interval: "Selamanya",
    desc: "Bayar sekali, gunakan selamanya. Tanpa biaya bulanan.",
    maxSubBranches: Infinity,
    features: { aiAssistant: true, excelPdfExport: true, whiteLabel: true },
    featureList: ["Cabang Tanpa Batas", "Akses AI Assistant", "Opsi White-label", "Update Selamanya", "Dukungan VIP"],
  },
};

export function getPlan(plan: string | null | undefined): Plan {
  if (plan && plan in PLANS) return PLANS[plan as PlanKey];
  return PLANS.free;
}

export function hasFeature(plan: string | null | undefined, feature: keyof PlanFeatures): boolean {
  return getPlan(plan).features[feature];
}

# Ringkasan Aplikasi Fullstack Point of Sale (POS)

## Gambaran Umum
Aplikasi ini adalah sistem POS (Point of Sale) lengkap yang dirancang untuk mengelola bisnis retail dengan fitur kasir, administrasi, inventori, dan reporting yang komprehensif.

## Arsitektur Teknologi
- **Frontend**: Next.js 14 (App Router) dengan TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Next.js API Routes (Fullstack dalam satu framework)
- **ORM**: Drizzle ORM dengan TypeScript
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Deployment**: Docker Container
- **Validation**: Zod untuk schema validation

## Fitur Utama dan Alur Aplikasi

### 1. MODUL KASIR

**Transaksi Penjualan:**
- Input penjualan dengan scanning barcode/manual entry
- Kalkulasi otomatis total, pajak, diskon
- Integrasi dengan sistem member dan point
- Cetak struk transaksi

**Manajemen Member:**
- Pendaftaran member baru
- Akumulasi dan redeem point
- Riwayat transaksi per member

**Inventori Kasir:**
- View stok real-time semua cabang
- Penerimaan barang dari gudang/cabang lain
- Validasi penerimaan barang

### 2. MODUL ADMIN

**Master Data Management:**
- **Produk**: Data produk, harga beli/jual, kategori
- **Cabang**: Management multi-cabang / multi-tenant
- **Member**: Data member beserta point
- **Distributor**: Data supplier dan terms pembayaran
- **Karyawan**: Data staff dan akses

**Inventori & Gudang:**
- Mutasi barang antar cabang
- Stock opname dan adjustment
- Tracking dead stock (barang tidak laku 1 bulan)
- Penerimaan dan pengeluaran barang

**Manajemen Diskon & Promosi:**
- Setup diskon per produk/kategori
- Aturan claim diskon dan point
- Monitoring penggunaan promo

### 3. MODUL REPORTING & ANALYTICS

**Dashboard Owner:**
- Omset harian/bulanan
- Keuntungan kotor/bersih
- Pengeluaran (pembelian, gaji, operasional)
- Claim point dan diskon
- Export data (Excel/PDF)

**Report Accounting:**
- Laporan arus kas
- Piutang dan hutang
- Reminder jatuh tempo pembayaran distributor
- Kas bon karyawan

### 4. FITUR OPERASIONAL

**Absensi Karyawan:**
- Foto-based attendance
- Tidak bisa akses gallery (prevent fraud)
- Real-time capture

**Order Management:**
- Edit order untuk koreksi
- History transaksi per brand
- Retur dan adjustment

**Alert System:**
- Reminder piutang distributor (2 hari sebelum jatuh tempo)
- Notifikasi dead stock
- Low stock alert

## Alur Kerja Utama

### Alur Penjualan:
1. Kasir login → pilih member (opsional) → scan produk → apply diskon → bayar → cetak struk → point terakumulasi

### Alur Inventori:
1. Admin input produk → set harga → distribusi ke cabang → mutasi jika perlu → stock opname → adjustment

### Alur Reporting:
1. Sistem kumpulkan data → generate report → dashboard update → export jika diperlukan

## Struktur Database Principal
- `users` (karyawan dengan role-based access)
- `branches` (multi-cabang support)
- `products` (dengan harga beli/jual)
- `transactions` & `transaction_details`
- `members` & `member_points`
- `inventory` & `stock_mutations`
- `suppliers` & `purchase_orders`
- `discounts` & `promotions`

Aplikasi ini memberikan solusi end-to-end untuk manajemen bisnis retail dengan fokus pada efisiensi operasional, akurasi data, dan reporting yang komprehensif untuk pengambilan keputusan.
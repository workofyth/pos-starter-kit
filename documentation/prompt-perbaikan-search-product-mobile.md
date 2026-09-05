# Prompt: Perbaikan Search Product di Mobile (POS)

> Salin seluruh isi file ini sebagai prompt untuk agent/developer yang mengerjakan
> layer mobile (Capacitor shell + UI POS di `app/pos/page.tsx`).
> Referensi arsitektur: `documentation/plan-mobile-apps.md`.
> API `GET /api/products/search` **sudah diperbaiki** — jangan ubah backend, sesuaikan klien.

---

## Konteks

POS mobile mencari produk lewat dua jalur:

1. **Scan** — scanner hardware (keyboard-wedge, `hooks/use-barcode-keyboard-wedge.ts`),
   kamera ZXing di web, dan `@capacitor-mlkit/barcode-scanning` di build native.
2. **Ketik manual** — kasir mengetik nama / SKU / barcode di kolom pencarian.

Klien saat ini (`app/pos/page.tsx`, fungsi `searchProducts`) memperlakukan keduanya sama:
satu `fetch` ke `/api/products/search?q=...&branchId=...`, lalu **langsung
`addToCart(data[0])`** apa pun hasilnya. Itu tidak aman untuk input ketikan dan tidak
memanfaatkan kontrak API yang baru.

## Kontrak API terbaru — `GET /api/products/search`

**Query params**

| Param | Keterangan |
|---|---|
| `barcode` | **Lookup identitas.** Cocok persis (exact) ke `barcode` ATAU `sku`. Pakai ini untuk hasil scan. |
| `q` (alias `search`) | Pencarian teks. Dipecah per kata; setiap kata harus cocok di salah satu dari `name`/`sku`/`barcode`/`brand`. Karakter `%` dan `_` di-escape (tidak lagi jadi wildcard). |
| `branchId` | Menentukan stok cabang & harga cabang. Nilai `''`/`'null'`/`'undefined'` diabaikan dengan aman. |
| `category`/`categoryId`, `brand` | Filter tambahan. |
| `minPrice`, `maxPrice` | Filter harga jual efektif. |
| `inStock` | `'true'` = stok > 0 **atau** produk jasa (`isService`); `'false'` = stok habis (jasa dikecualikan). |
| `sortBy` | `relevance` \| `name` \| `sellingPrice` \| `stock` \| `createdAt`. **Default `relevance` bila ada `q`**, selain itu `name`. |
| `sortOrder` | `asc` \| `desc`. |
| `page`, `limit` | `limit` maks 100, default 20. Input non-numerik tidak lagi menghasilkan error. |

**Response**

```jsonc
{
  "success": true,
  "data": [ { "id", "name", "sku", "barcode", "image", "imageUrl", "brand", "unit",
              "isService", "categoryId", "categoryName", "categoryCode",
              "sellingPrice", "customerPrice", "purchasePrice", "stock", "minStock" } ],
  "exactMatch": true,          // hasil teratas cocok persis di barcode/SKU
  "query": { "q", "barcode", "branchId", "sortBy", "sortOrder" },
  "pagination": { "page", "limit", "totalCount", "totalPages", "hasNext", "hasPrev" }
}
```

Urutan relevansi (paling atas dulu): barcode persis → SKU persis → nama persis →
awalan barcode → awalan SKU → awalan nama → awalan brand → sisanya.
Urutan sudah stabil (ada tiebreaker `id`), jadi paginasi tidak lagi menduplikasi baris.

---

## Tugas

### 1. Pisahkan jalur scan dan jalur ketik

- **Scan** (`code` datang dari wedge / kamera): panggil `?barcode=<code>&branchId=...`.
  - `data.length === 1` → langsung `addToCart`, toast sukses.
  - `data.length === 0` → fallback sekali ke `?q=<code>` (menangani kode yang tersimpan
    sebagian atau typo scan); tampilkan daftar pilihan, jangan auto-add.
  - `data.length > 1` → tampilkan pemilih, jangan auto-add.
- **Ketik**: panggil `?q=<term>&limit=20`. **Tidak pernah** auto-add.
  Tampilkan daftar hasil; auto-add hanya bila `exactMatch === true` **dan** kasir
  menekan Enter.

### 2. Debounce + pembatalan request

- Debounce 250–300 ms pada input ketikan; scan **tidak** di-debounce (harus instan).
- Simpan `AbortController` per request dan `abort()` request sebelumnya, supaya
  respons lama tidak menimpa hasil baru (race condition yang sangat terasa di jaringan seluler).
- Abaikan query < 2 karakter kecuali berasal dari scan.

### 3. UI hasil pencarian untuk layar sentuh

- Daftar hasil sebagai kartu setinggi minimal 56 px (target sentuh), menampilkan
  nama, SKU, harga (`sellingPrice`), dan stok.
- Badge **"Jasa"** untuk `isService === true` dan **jangan** tampilkan stok untuk item ini.
- Badge **"Stok habis"** bila `stock <= 0` dan bukan jasa; badge peringatan bila
  `stock <= minStock`.
- Tampilkan `imageUrl ?? image` sebagai thumbnail dengan placeholder bila kosong.
- Keadaan kosong yang jelas: "Produk tidak ditemukan: `<term>`" + tombol "Scan ulang".

### 4. Paginasi / infinite scroll

- Pakai `pagination.hasNext` untuk memuat halaman berikutnya (`page + 1`), bukan menebak
  dari panjang `data`.
- Muat lagi saat daftar di-scroll mendekati bawah; tampilkan skeleton saat memuat.

### 5. Ketahanan jaringan (mobile)

- Timeout request 10 detik → toast "Koneksi lambat, coba lagi" dengan tombol ulangi.
- Tangani status non-200 secara eksplisit: `401` → arahkan ke login ulang,
  `402` → tampilkan pesan langganan, `409` → arahkan ke onboarding.
  Guard backend (`lib/subscription-guard.ts`) mengembalikan status-status ini.
- Selalu kirim `branchId` kasir; tanpa itu stok dan harga cabang salah.

### 6. Auth mobile

Bila dijalankan di shell Capacitor, request harus membawa
`Authorization: Bearer <token>` (lihat Fase 1a di `documentation/plan-mobile-apps.md`),
bukan cookie. Bungkus pemanggilan search di helper fetch bersama yang menyisipkan
header ini, jangan `fetch` telanjang.

---

## Kriteria penerimaan

- [ ] Scan barcode yang valid menambahkan **produk yang benar** ke keranjang dalam satu langkah.
- [ ] Mengetik kata yang cocok dengan banyak produk **tidak** menambahkan apa pun secara otomatis.
- [ ] Mengetik "kopi susu" menemukan produk bernama "Kopi Gula Susu".
- [ ] Mengetik `%` atau `_` tidak lagi mengembalikan seluruh katalog.
- [ ] Mengetik cepat lalu menghapus tidak meninggalkan hasil dari query lama (race teruji).
- [ ] Produk jasa (`isService`) tetap bisa dijual walau tidak punya baris inventory.
- [ ] Scroll ke halaman 2 tidak menampilkan produk yang sudah muncul di halaman 1.
- [ ] Semua target sentuh ≥ 44 px; daftar hasil terbaca pada layar 360 px.
- [ ] Sesi kedaluwarsa memunculkan alur login, bukan toast "Gagal mencari produk".

## Berkas yang kemungkinan disentuh

- `app/pos/page.tsx` — `searchProducts`, state hasil pencarian, UI daftar.
- `hooks/use-barcode-keyboard-wedge.ts` — pastikan callback membawa penanda "dari scanner".
- Helper fetch baru (mis. `lib/api-client.ts`) untuk Bearer token + timeout + abort.
- **Jangan ubah** `app/api/products/search/route.ts` — sudah selesai.

# Todo List

Aplikasi todo list mobile-first yang dibuat dengan HTML, Tailwind CSS (CDN), dan JavaScript murni (tanpa framework). Data disimpan di `localStorage`, jadi tetap ada setelah halaman di-refresh.

## Fitur

- **Tambah task** dengan judul (maks. 200 karakter), prioritas (Low / Medium / High), dan deadline. Ada tombol cepat Today, Tomorrow, dan Next week.
- **Selesaikan / batalkan** task dengan tombol check. Task berpindah antara halaman Home dan Done.
- **Hapus task** satuan atau **Delete all**, dengan tombol **Undo** lewat toast.
- **Halaman Overdue** untuk task yang melewati deadline, lengkap dengan penanda titik merah di menu.
- **Halaman Profile** berisi ringkasan progres: donut chart, grafik task selesai 7 hari terakhir, dan jumlah task pending per prioritas.
- **Bottom navigation** dengan animasi pill yang bergeser. Tombol (+) berganti warna saat halaman Add aktif.
- Hero di Home dengan persentase progres dan pesan yang berubah sesuai kondisi.
- Sapaan otomatis (Morning / Afternoon / Evening) dan tanggal hari ini.
- Mendukung `prefers-reduced-motion` dan safe area di perangkat dengan notch.

## Struktur Proyek

```
todo/
├── index.html        # Markup semua halaman + bottom nav
├── style/
│   └── main.css      # Animasi, check button, nav pill, toast
└── script/
    └── app.js        # State, render, navigasi, dan aksi
```

## Cara Menjalankan

Tidak perlu build atau install apa pun.

1. Buka `index.html` langsung di browser, atau
2. Jalankan server lokal, misalnya:
   ```bash
   npx serve .
   ```
   atau pakai ekstensi **Live Server** di VS Code.

Untuk tampilan mobile, buka DevTools lalu aktifkan device toolbar, atau akses lewat HP di jaringan yang sama.

> Butuh koneksi internet karena Tailwind CSS dan font Plus Jakarta Sans dimuat dari CDN.

## Teknologi

- HTML5
- [Tailwind CSS](https://tailwindcss.com/) (Play CDN)
- CSS khusus untuk animasi
- JavaScript (vanilla)
- `localStorage` untuk penyimpanan data
- Google Fonts: Plus Jakarta Sans

## Struktur Data

Setiap task disimpan sebagai objek berikut dengan key `todoTasks`:

```js
{
  id: "uuid",
  title: "Nama task",
  priority: "low" | "medium" | "high",
  createdAt: "ISO date string",
  dueAt: "ISO date string",
  completed: false,
  completedAt: null // atau ISO date string
}
```

## Catatan

- Data demo di `loadTasks()` (`script/app.js`) hanya muncul saat `localStorage` masih kosong. Hapus bagian itu sebelum dikumpulkan atau dipublikasikan.
- Untuk mereset data, hapus key `todoTasks` lewat DevTools (Application → Local Storage), atau pakai tombol **Delete all**.
- Nama, email, dan tanggal bergabung di halaman Profile masih berupa teks statis di `index.html` dan `script/app.js`.
- Untuk memakai foto di avatar menu Profile, ganti `<span class="nav-avatar">MF</span>` di `index.html` dengan `<img src="..." class="nav-avatar" alt="">`.
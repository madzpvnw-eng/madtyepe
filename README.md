# VOCATYPE - Music Typing Practice Website

VOCATYPE adalah platform web modern untuk melatih kecepatan dan akurasi mengetik (*touch typing*) menggunakan lirik lagu yang disinkronisasikan secara *real-time* dengan video musik YouTube.

Aplikasi ini dibangun menggunakan teknologi **HTML5, CSS3, dan Vanilla JavaScript (ES Modules)** tanpa framework berat seperti React atau Next.js, sehingga dapat langsung dijalankan menggunakan **VS Code Live Server** atau dideploy secara instan ke **GitHub Pages**.

---

## 🎵 Fitur Utama

1. **YouTube Music Player (Official IFrame API)**
   - Mendukung berbagai format link YouTube (`youtube.com/watch?v=...`, `youtu.be/...`, `youtube.com/shorts/...`, YouTube Music, atau 11-karakter Video ID).
   - Kontrol Play, Pause, Scrubbing timeline bar, waktu saat ini, dan durasi total.
   - Pilihan untuk menyembunyikan atau menampilkan video musik (*Focus Mode* vs *Cinematic Mode*).

2. **Deteksi Lirik Otomatis & LRCLIB API**
   - Membersihkan judul video secara cerdas (menghapus tag seperti *[Official Music Video]*, *HD*, *Remastered*, dsb.).
   - Memisahkan nama artis dan judul lagu.
   - Mengambil lirik berwaktu (*synchronized lyrics* / format LRC) langsung dari **LRCLIB API** (`https://lrclib.net`).
   - Prioritaskan lirik ber-timestamp (`syncedLyrics`). Jika hanya tersedia teks biasa, aplikasi beralih ke *Line Mode*.
   - Fitur **Fix / Search Lyrics** untuk mencari ulang di LRCLIB jika pencocokan otomatis tidak sesuai.
   - Fitur **Paste Custom LRC** jika Anda memiliki file LRC sendiri.

3. **Sinkronisasi Lirik & Arena Mengetik**
   - Highlight karakter *real-time*:
     - **Cyan** (`#00f0ff`): Karakter yang diketik dengan benar.
     - **Merah**: Karakter yang salah ketik (dengan efek wavy underline).
     - **Abu-abu redup**: Karakter yang belum diketik.
     - **Blinking cursor**: Penanda posisi huruf aktif saat ini.
   - Dua mode latihan:
     - **Continuous Mode**: Baris lirik berpindah otomatis mengikuti posisi waktu lagu.
     - **Line Mode**: Mengetik baris demi baris secara mandiri.
   - Kalibrator **Sync Offset** (`-0.5s` / `+0.5s`) untuk menyesuaikan sinkronisasi jika video musik memiliki intro dialog.

4. **Statistik Mengetik Real-Time**
   - **WPM (Words Per Minute)** Net & Gross.
   - **Akurasi (%)**: Persentase ketepatan ketikan.
   - **Keystrokes**: Jumlah karakter benar vs salah.
   - **Progress & Streak**: Persentase lagu dan streak karakter berturut-turut tanpa salah.

5. **Kustomisasi & Desain**
   - Desain gelap modern (warna dasar `#151922`, aksen cyan `#00f0ff`, font monospace untuk lirik).
   - Dukungan tema Gelap (*Dark*) dan Terang (*Light*).
   - Pengaturan ukuran font lirik (Small, Medium, Large, Extra Large).
   - Pilihan font monospace (*JetBrains Mono*, *Fira Code*, *Roboto Mono*).
   - Efek suara ketikan keyboard sintetis menggunakan *Web Audio API*.

---

## 📐 Formula & Dasar Perhitungan WPM

Perhitungan WPM pada VOCATYPE mengikuti **Standar Tipografi & Tes Mengetik Internasional**:

1. **Definisi 1 Kata Standar**:
   Satu kata standar dihitung setara dengan **5 keystrokes** (termasuk spasi dan tanda baca).
   $$\text{Words} = \frac{\text{Total Characters Typed}}{5}$$

2. **Waktu Aktif Mengetik**:
   Waktu aktif dihitung dalam menit sejak karakter pertama diketik atau tombol play ditekan.
   $$\text{Elapsed Minutes} = \frac{\text{Elapsed Seconds}}{60}$$

3. **Gross WPM**:
   $$\text{Gross WPM} = \frac{\text{Total Characters Typed} / 5}{\text{Elapsed Minutes}}$$

4. **Net WPM (Yang Ditampilkan di HUD Utama)**:
   Net WPM mengurangi kesalahan ketik sehingga mencerminkan kecepatan pengetikan bersih yang sesungguhnya:
   $$\text{Net WPM} = \max\left(0, \frac{(\text{Correct Characters} - \text{Error Characters}) / 5}{\text{Elapsed Minutes}}\right)$$

5. **Akurasi**:
   $$\text{Accuracy (\%)} = \left(\frac{\text{Correct Characters}}{\text{Total Characters Typed}}\right) \times 100$$

---

## 🚀 Panduan Menjalankan Proyek

### Cara 1: Menggunakan VS Code Live Server (Lokal)

1. Buka folder proyek ini di **Visual Studio Code**.
2. Pastikan ekstensi **Live Server** (oleh Ritwick Dey) sudah terpasang.
3. Klik kanan pada file `index.html` dan pilih **"Open with Live Server"**.
4. Website akan terbuka di browser pada URL `http://127.0.0.1:5500/index.html`.

### Cara 2: Menjalankan dengan Node / Vite Dev Server

Proyek ini juga menyertakan konfigurasi Vite jika ingin dijalankan via Node:
```bash
npm install
npm run dev
```
Buka browser pada `http://localhost:3000`.

---

## 🌐 Panduan Deploy ke GitHub Pages

Website ini 100% *client-side* tanpa dependensi backend khusus, sehingga sangat mudah dideploy ke GitHub Pages:

### Langkah Deploy:
1. Buat repository baru di GitHub (misal: `vocatype`).
2. Push seluruh file dan folder proyek ke branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of VOCATYPE"
   git branch -M main
   git remote add origin https://github.com/<username>/vocatype.git
   git push -u origin main
   ```
3. Di halaman repository GitHub Anda:
   - Masuk ke tab **Settings** -> **Pages** (di sidebar kiri).
   - Pada bagian **Build and deployment**:
     - **Source**: Pilih `Deploy from a branch`.
     - **Branch**: Pilih `main` dan folder `/(root)`.
   - Klik **Save**.
4. Tunggu 1–2 menit, website Anda akan aktif di:
   `https://<username>.github.io/vocatype/`

---

## 📂 Struktur Direktori Proyek

```text
vocatype/
├── index.html               # Halaman utama aplikasi (HTML5 semantic)
├── metadata.json            # Metadata nama dan izin aplikasi
├── README.md                # Dokumentasi lengkap proyek
├── package.json             # Konfigurasi dependensi opsional
├── tsconfig.json            # Konfigurasi TypeScript
├── vite.config.ts           # Konfigurasi bundler Vite
└── assets/
    ├── css/
    │   └── style.css        # Seluruh styling, dark/light theme, dan animasi
    ├── images/
    │   └── logo.svg         # Logo vector VOCATYPE
    └── js/
        ├── app.js           # Controller utama & orkestrasi aplikasi
        ├── youtube.js       # Integrasi resmi YouTube IFrame Player API
        ├── lyrics.js        # LRCLIB API client & parser timestamp LRC
        ├── typing.js        # Engine input keyboard & highlight karakter
        ├── statistics.js    # Kalkulator WPM, akurasi, dan streak
        └── settings.js      # Pengaturan tema, font, dan Web Audio SFX
```

---

## ⌨️ Shortcut Keyboard

| Tombol | Fungsi |
| :--- | :--- |
| `Ctrl + Space` | Play / Pause musik |
| `Ctrl + [` | Pindah ke baris lirik sebelumnya |
| `Ctrl + ]` | Pindah ke baris lirik berikutnya |
| `Backspace` | Hapus karakter yang salah pada baris aktif |
| `Escape` | Menutup jendela modal yang terbuka |

---

## 🛡️ Catatan Penanganan Error
- **Video Embedding Disabled (Error 150/101)**: Beberapa pemilik hak cipta video di YouTube mematikan fitur embed. Jika terjadi, VOCATYPE akan menampilkan pesan yang jelas dan menyarankan untuk mencoba link audio resmi atau lagu rekomendasi pada bar demo.
- **Lirik Tidak Ditemukan**: Jika LRCLIB belum memiliki lirik lagu tersebut, pengguna dapat menekan tombol **Fix / Search Lyrics** untuk mencari judul alternatif, atau menekan **Paste LRC** untuk memasukkan lirik secara manual.

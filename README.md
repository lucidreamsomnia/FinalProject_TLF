# F
# LAPTOPFIND

**LAPTOPFIND** adalah aplikasi web rekomendasi pemilihan laptop yang menggabungkan metode **Fuzzy C-Means (FCM)** dan **K-Nearest Neighbors (KNN)**. Aplikasi menyediakan antarmuka untuk memasukkan preferensi laptop, melihat rekomendasi, menelusuri katalog, serta melihat informasi pemrosesan dan evaluasi model.

## 1. Teknologi yang Digunakan

| Bagian | Teknologi |
|---|---|
| Backend / API | Python, FastAPI, Uvicorn |
| Frontend / GUI | React, Vite, JavaScript |
| Pengolahan data | NumPy, Pandas |
| Machine learning | scikit-learn, scikit-fuzzy |
| Penyimpanan model | Joblib |

Aplikasi ini berbentuk **aplikasi web**: backend dan proses rekomendasi menggunakan Python, sedangkan GUI dibangun menggunakan React.

## 2. Struktur Direktori

```text
FinalProject_TLF/
├── backend/
│   ├── app/
│   │   ├── core/          # Konfigurasi backend
│   │   ├── models/        # Skema data API
│   │   ├── routes/        # Endpoint API
│   │   └── services/      # Logika aplikasi, preprocessing, FCM, dan KNN
│   ├── artifacts/         # Model KNN, scaler, dan manifest
│   ├── requirements.txt  # Dependensi Python
│   ├── scripts/           # Script pendukung model
│   └── tests/             # Pengujian backend
├── dataset/               # Dataset dan hasil preprocessing/clustering
├── frontend/
│   ├── src/               # Source code React
│   ├── package.json       # Dependensi dan script frontend
│   └── .env.example       # Contoh konfigurasi alamat API
├── notebook/              # Notebook eksplorasi dan pemodelan
├── requirements.txt       # Referensi dependensi Python backend
└── README.md
```

## 3. Persyaratan Sistem

Pastikan perangkat telah memiliki:

- Python yang mendukung versi dependensi pada `backend/requirements.txt`.
- Node.js dan npm.
- Git (opsional, jika proyek diperoleh melalui Git).

## 4. Instalasi dan Menjalankan Aplikasi

Jalankan backend dan frontend pada **dua terminal terpisah**. Perintah berikut ditulis untuk Windows PowerShell.

### A. Persiapan Backend

1. Buka terminal pada direktori utama proyek (`FinalProject_TLF`).
2. Buat virtual environment:

   ```powershell
   python -m venv .venv
   ```

3. Aktifkan virtual environment:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   Jika PowerShell memblokir aktivasi script, jalankan perintah berikut pada terminal tersebut, lalu aktifkan kembali virtual environment:

   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\.venv\Scripts\Activate.ps1
   ```

4. Instal dependensi Python:

   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. Jalankan server backend dari direktori utama proyek:

   ```powershell
   python -m uvicorn backend.app.main:app --reload
   ```

Backend berjalan pada `http://127.0.0.1:8000`. Dokumentasi interaktif API dapat dibuka melalui `http://127.0.0.1:8000/docs`.

### B. Persiapan Frontend

1. Buka terminal kedua pada direktori utama proyek.
2. Masuk ke direktori frontend:

   ```powershell
   cd frontend
   ```

3. Instal dependensi JavaScript:

   ```powershell
   npm install
   ```

4. (Opsional) Buat file `.env` berdasarkan `.env.example` jika konfigurasi alamat API perlu diatur. Nilai default API adalah:

   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   ```

5. Jalankan development server:

   ```powershell
   npm run dev
   ```

Buka alamat frontend yang ditampilkan oleh Vite di terminal. Secara default, alamatnya adalah `http://localhost:5173`.

### C. Urutan Menjalankan

1. Aktifkan virtual environment dan jalankan backend.
2. Jalankan frontend pada terminal kedua.
3. Buka `http://localhost:5173` melalui browser.
4. Pastikan backend tetap berjalan selama aplikasi digunakan.

## 5. Dataset dan Artefak Model

Dataset utama berada di direktori `dataset/`:

- `laptop_price.csv` — dataset laptop yang digunakan sebagai data sumber.
- `laptop_features_scaled.csv` — fitur numerik setelah preprocessing dan scaling.
- `laptop_fcm_results.csv` — hasil pengelompokan Fuzzy C-Means.
- `fcm_centers.npy` — pusat cluster FCM.

Artefak model yang digunakan backend berada di `backend/artifacts/`:

- `scaler.joblib` — scaler untuk preprocessing input.
- `knn_model.joblib` — model/struktur KNN yang digunakan aplikasi.
- `model_manifest.json` — informasi konfigurasi dan metadata artefak model.

Pastikan file dataset dan artefak tersebut tetap berada pada lokasi masing-masing. Aplikasi menggunakan artefak yang sudah disediakan; menjalankan aplikasi tidak berarti melatih ulang model.

## 6. Pengujian Backend

Dari direktori utama proyek, dengan virtual environment aktif, jalankan:

```powershell
python -m pytest backend/tests -v
```

Jika `pytest` belum terpasang pada environment, instal terlebih dahulu dengan `pip install pytest`.

## 7. Catatan

- Backend dan frontend harus dijalankan secara bersamaan agar fitur aplikasi dapat berkomunikasi dengan API.
- Jangan memindahkan atau mengganti nama direktori `dataset/` dan `backend/artifacts/` tanpa menyesuaikan konfigurasi aplikasi.
- File `.env` lokal tidak perlu dibagikan jika berisi konfigurasi khusus perangkat. Gunakan `.env.example` sebagai referensi.
inalProject_TLF
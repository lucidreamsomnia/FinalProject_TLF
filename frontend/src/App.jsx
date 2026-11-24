import { Route, Routes } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'

const pages = [
  { path: '/', label: 'Dashboard', title: 'Dashboard' },
  { path: '/input-data', label: 'Input Data', title: 'Input Data' },
  { path: '/cari-laptop', label: 'Cari Laptop', title: 'Cari Laptop' },
  { path: '/hasil-rekomendasi', label: 'Hasil Rekomendasi', title: 'Hasil Rekomendasi' },
  { path: '/katalog', label: 'Katalog Laptop', title: 'Katalog Laptop' },
  { path: '/processing', label: 'Processing & Algorithm', title: 'Processing & Algorithm' },
  { path: '/evaluasi', label: 'Evaluasi Model', title: 'Evaluasi Model' },
  { path: '/tentang', label: 'Tentang Sistem', title: 'Tentang Sistem' },
]

function PlaceholderPage({ title }) {
  return (
    <main className="page-shell">
      <p className="eyebrow">LAPTOPFIND</p>
      <h1>{title}</h1>
      <p className="page-placeholder">
        Halaman ini disiapkan untuk implementasi Phase 5.2.
      </p>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {pages.map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={<PlaceholderPage title={page.title} />}
          />
        ))}
      </Route>
    </Routes>
  )
}

export default App

import { Route, Routes } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import CariLaptop from './pages/CariLaptop'
import Dashboard from './pages/Dashboard'
import InputData from './pages/InputData'
import HasilRekomendasi from './pages/HasilRekomendasi'

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
        <Route path="/" element={<Dashboard />} />
        <Route path="/input-data" element={<InputData />} />
        <Route path="/cari-laptop" element={<CariLaptop />} />
        <Route path="/hasil-rekomendasi" element={<HasilRekomendasi />} />
        <Route path="/katalog" element={<PlaceholderPage title="Katalog Laptop" />} />
        <Route path="/processing" element={<PlaceholderPage title="Processing & Algorithm" />} />
        <Route path="/evaluasi" element={<PlaceholderPage title="Evaluasi Model" />} />
        <Route path="/tentang" element={<PlaceholderPage title="Tentang Sistem" />} />
      </Route>
    </Routes>
  )
}

export default App

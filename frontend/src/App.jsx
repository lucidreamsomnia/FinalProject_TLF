import { Route, Routes } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import CariLaptop from './pages/CariLaptop'
import Dashboard from './pages/Dashboard'
import InputData from './pages/InputData'
import HasilRekomendasi from './pages/HasilRekomendasi'
import KatalogLaptop from './pages/KatalogLaptop'
import ProcessingAlgorithm from './pages/ProcessingAlgorithm'
import EvaluasiModel from './pages/EvaluasiModel'
import TentangSistem from './pages/TentangSistem'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/input-data" element={<InputData />} />
        <Route path="/cari-laptop" element={<CariLaptop />} />
        <Route path="/hasil-rekomendasi" element={<HasilRekomendasi />} />
        <Route path="/katalog" element={<KatalogLaptop />} />
        <Route path="/processing" element={<ProcessingAlgorithm />} />
        <Route path="/evaluasi" element={<EvaluasiModel />} />
        <Route path="/tentang" element={<TentangSistem />} />
      </Route>
    </Routes>
  )
}

export default App

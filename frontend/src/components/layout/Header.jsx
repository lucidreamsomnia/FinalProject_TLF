import { Bell, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageLabels = {
  '/': 'Dashboard',
  '/input-data': 'Input Data',
  '/cari-laptop': 'Rekomendasi Laptop',
  '/hasil-rekomendasi': 'Hasil Rekomendasi',
  '/katalog': 'Katalog Laptop',
  '/processing': 'Pemrosesan & Algoritma',
  '/evaluasi': 'Evaluasi Model',
  '/tentang': 'Tentang Sistem',
}

function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const pageLabel = pageLabels[pathname] || 'Dashboard'

  return (
    <header className="topbar">
      <div className="topbar-page">
        <button
          className="menu-button"
          type="button"
          aria-label="Buka menu navigasi"
          onClick={onMenuClick}
        >
          <Menu aria-hidden="true" size={19} />
        </button>
        <div>
          <span className="topbar-eyebrow">Halaman</span>
          <strong>{pageLabel}</strong>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="icon-button" type="button" aria-label="Notifikasi">
          <Bell aria-hidden="true" size={16} />
          <span className="notification-dot" aria-hidden="true" />
        </button>
        <div className="profile">
          <span className="profile-avatar">AU</span>
          <span className="profile-copy">
            <strong>Administrator</strong>
            <small>Proyek Akademik</small>
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header

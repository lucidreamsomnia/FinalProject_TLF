import {
  BarChart3,
  Check,
  Info,
  LayoutDashboard,
  Laptop,
  Network,
  Sparkles,
  Upload,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/input-data', label: 'Input Data', icon: Upload },
  { path: '/cari-laptop', label: 'Cari Laptop', icon: Sparkles },
  { path: '/hasil-rekomendasi', label: 'Hasil Rekomendasi', icon: Check },
  { path: '/katalog', label: 'Katalog Laptop', icon: Laptop },
  { path: '/processing', label: 'Pemrosesan & Algoritma', icon: Network },
  { path: '/evaluasi', label: 'Evaluasi Model', icon: BarChart3 },
  { path: '/tentang', label: 'Tentang Sistem', icon: Info },
]

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <button
        className={`sidebar-backdrop${isOpen ? ' is-visible' : ''}`}
        type="button"
        aria-label="Tutup menu navigasi"
        onClick={onClose}
      />
      <aside className={`sidebar${isOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Laptop size={18} strokeWidth={2.25} />
          </div>
          <div>
            <span className="brand-name">LAPTOPFIND</span>
            <span className="brand-tagline">SMART RECOMMENDATION</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu utama">
          <p className="nav-heading">Menu Utama</p>
          {navigationItems.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-item${isActive ? ' is-active' : ''}`
              }
              end={end}
              key={path}
              onClick={onClose}
              to={path}
            >
              <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <strong>LAPTOPFIND v1.0.0</strong>
          <span>Prototype sistem rekomendasi untuk proyek akademik.</span>
        </div>
      </aside>
    </>
  )
}

export default Sidebar

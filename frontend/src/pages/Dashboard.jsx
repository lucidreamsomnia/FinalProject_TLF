import { useEffect, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  Laptop,
  Network,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusMessage from '../components/common/StatusMessage'
import { fetchDashboard, getApiError } from '../services/apiService'

function formatCurrency(value) {
  if (value == null) return '—'

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '—'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numericValue * 20000)
}

function formatCount(value) {
  if (value == null) return '—'

  const numericValue = Number(value)
  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString('id-ID')
    : '—'
}

function formatDecimal(value, digits = 4) {
  if (value == null) return '—'

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : '—'
}

function formatMetricCount(value, suffix) {
  const formatted = formatCount(value)
  return formatted === '—' ? '—' : `${formatted} ${suffix}`
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="dashboard-metric">
      <div className="metric-icon"><Icon aria-hidden="true" size={16} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchDashboard()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError, 'Data dashboard belum dapat dimuat.'))
      })
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <main className="page-shell">
        <StatusMessage tone="error" title="Dashboard tidak tersedia">{error}</StatusMessage>
      </main>
    )
  }

  if (!data) {
    return <main className="page-shell"><div className="loading-state">Memuat data dashboard...</div></main>
  }

  const summary = data.summary && typeof data.summary === 'object' ? data.summary : {}
  const clusters = Array.isArray(data.cluster_distribution) ? data.cluster_distribution : []
  const evaluation =
    data.evaluation && typeof data.evaluation === 'object'
      ? (data.evaluation.main && typeof data.evaluation.main === 'object'
        ? data.evaluation.main
        : data.evaluation)
      : {}
  const featured = Array.isArray(data.featured_laptops) ? data.featured_laptops : []
  const activity = Array.isArray(data.recommendation_activity) ? data.recommendation_activity : []
  const clusterCounts = clusters
    .map((cluster) => {
      if (cluster?.count == null) return null
      const count = Number(cluster.count)
      return Number.isFinite(count) ? count : null
    })
    .filter((count) => Number.isFinite(count))
  const maxClusterCount = Math.max(...clusterCounts, 1)

  return (
    <main className="page-shell dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="hero-badge">Hybrid FCM + KNN</span>
          <h1>Temukan Laptop yang Tepat<br />untuk Kebutuhanmu</h1>
          <p>LAPTOPFIND membantu menyaring {formatCount(summary.total_laptops)} laptop berdasarkan tujuh fitur utama, derajat keanggotaan cluster, dan kedekatan jarak Euclidean.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/cari-laptop">Mulai Rekomendasi <Sparkles size={14} /></Link>
            <Link className="button button-secondary" to="/evaluasi">Lihat Evaluasi</Link>
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true"><Laptop size={92} strokeWidth={1} /></div>
      </section>

      <section className="dashboard-metrics" aria-label="Ringkasan model">
        <MetricCard
          icon={Laptop}
          label="Total Laptop"
          value={formatMetricCount(summary?.total_laptops, 'data')}
        />
        <MetricCard icon={Network} label="Fitur Model" value={formatMetricCount(summary.model_features, 'fitur')} />
        <MetricCard icon={Sparkles} label="Cluster FCM" value={formatMetricCount(summary.fcm_clusters, 'cluster')} />
        <MetricCard icon={CheckCircle2} label="Rekomendasi" value={formatMetricCount(summary.default_recommendations, 'laptop')} />
        <MetricCard icon={BarChart3} label="Metode" value={typeof summary.method === 'string' && summary.method ? summary.method : '—'} />
      </section>

      <section className="dashboard-grid dashboard-grid-two">
        <div className="panel">
          <div className="panel-heading">
            <div><h2>Distribusi Cluster</h2><p>Distribusi aktual {formatCount(summary.total_laptops)} laptop pada empat cluster</p></div>
          </div>
          <div className="cluster-bars">
            {clusters.map((cluster, index) => (
              <div className="cluster-row" key={cluster?.cluster ?? cluster?.id ?? `cluster-${index}`}>
                <div>
                  <span>Cluster {cluster?.cluster == null ? '—' : cluster.cluster}</span>
                  <strong>{formatMetricCount(cluster?.count, 'laptop')}</strong>
                </div>
                <div className="bar-track">
                  <span
                    style={{
                      width: `${Math.max(
                        0,
                        (formatCount(cluster?.count) === '—'
                          ? 0
                          : (Number(cluster.count) / maxClusterCount) * 100),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading"><div><h2>Ringkasan Evaluasi FCM</h2><p>Hasil eksperimen konfigurasi c=4 dan m=2.0</p></div></div>
          <div className="evaluation-mini-grid">
            <div><span>FPC</span><strong>{formatDecimal(evaluation?.fpc)}</strong></div>
            <div><span>Silhouette</span><strong>{formatDecimal(evaluation?.silhouette)}</strong></div>
            <div><span>Davies-Bouldin</span><strong>{formatDecimal(evaluation?.davies_bouldin)}</strong></div>
          </div>
          <Link className="text-link" to="/evaluasi">Buka analisis evaluasi →</Link>
        </div>
      </section>

      <section className="panel system-flow">
        <div className="panel-heading"><div><h2>Alur Sistem</h2></div></div>
        <div className="flow-items">
          {['Input', 'Preprocessing', 'FCM', 'Membership Degree', 'KNN', 'Rekomendasi'].map((step, index) => (
            <div className="flow-item" key={step}><span>{step}</span>{index < 5 ? <b>→</b> : null}</div>
          ))}
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-featured">
        <div className="panel activity-panel">
          <div className="panel-heading"><div><h2>Aktivitas Rekomendasi</h2></div></div>
          {activity.length === 0 ? (
            <div className="empty-state">Belum ada aktivitas rekomendasi.</div>
          ) : activity.map((item, index) => (
            <div key={item?.id ?? `activity-${index}`}>{item?.label ?? 'Aktivitas tidak tersedia'}</div>
          ))}
        </div>
        <div className="featured-section">
          <div className="section-heading"><h2>Laptop Pilihan</h2><span>Konten contoh dari dataset</span></div>
          <div className="featured-grid">
            {featured.map((laptop, index) => (
              <article className="featured-card" key={laptop?.row_index ?? `laptop-${index}`}>
                <div className="featured-image" aria-hidden="true"><Laptop size={54} strokeWidth={1} /></div>
                <div className="featured-copy">
                  <span>{laptop?.company ?? '—'}</span>
                  <h3>{laptop?.product ?? '—'}</h3>
                  <strong>{formatCurrency(laptop?.price_eur)}</strong>
                  <p>{laptop?.ram ?? '—'} RAM · {laptop?.memory ?? '—'}</p>
                  <p>{laptop?.cpu ?? '—'}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Dashboard

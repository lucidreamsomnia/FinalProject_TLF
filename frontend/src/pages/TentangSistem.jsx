import { useEffect, useState } from 'react'
import { Braces, Database, Layers3, Network } from 'lucide-react'
import StatusMessage from '../components/common/StatusMessage'
import { fetchSystemInfo, getApiError } from '../services/apiService'

function formatVersion(value) {
  return value == null || value === '' ? '—' : String(value)
}

function TentangSistem() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchSystemInfo()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError, 'Informasi sistem belum dapat dimuat.'))
      })
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <main className="page-shell">
        <StatusMessage tone="error" title="Informasi sistem tidak tersedia">{error}</StatusMessage>
      </main>
    )
  }

  if (!data) {
    return <main className="page-shell"><div className="loading-state">Memuat informasi sistem...</div></main>
  }

  const dataset = data.dataset && typeof data.dataset === 'object' ? data.dataset : {}
  const features = Array.isArray(data.feature_names) ? data.feature_names : []
  const logColumns = Array.isArray(data.log1p_columns) ? data.log1p_columns : []
  const fcm = data.fcm_parameters && typeof data.fcm_parameters === 'object'
    ? data.fcm_parameters
    : {}
  const knn = data.knn_parameters && typeof data.knn_parameters === 'object'
    ? data.knn_parameters
    : {}
  const versions = data.versions && typeof data.versions === 'object'
    ? data.versions
    : {}
  const exchangeRate = data.exchange_rate && typeof data.exchange_rate === 'object'
    ? data.exchange_rate
    : {}

  return (
    <main className="page-shell about-page">
      <p className="eyebrow">Tentang Sistem</p>
      <h1>{data.name ?? 'LAPTOPFIND'}</h1>
      <p className="page-intro">
        {data.description ?? 'Sistem rekomendasi laptop berbasis FCM dan KNN.'}
      </p>

      <section className="about-grid">
        <article className="panel about-identity-card">
          <div className="parameter-heading"><Layers3 size={18} aria-hidden="true" /><h2>Identitas Sistem</h2></div>
          <p>{data.description ?? 'Sistem rekomendasi laptop.'}</p>
          <p>Sistem bertujuan membantu pengguna menemukan laptop terdekat berdasarkan preferensi numerik dan derajat keanggotaan cluster.</p>
        </article>

        <article className="panel about-dataset-card">
          <div className="parameter-heading"><Database size={18} aria-hidden="true" /><h2>Dataset</h2></div>
          <dl className="about-facts">
            <div><dt>Nama file</dt><dd>{dataset.filename ?? '—'}</dd></div>
            <div><dt>Jumlah data</dt><dd>{dataset.row_count == null ? '—' : `${dataset.row_count.toLocaleString('id-ID')} baris`}</dd></div>
          </dl>
        </article>
      </section>

      <section className="processing-section">
        <div className="section-heading"><h2>Fitur Dataset</h2></div>
        <div className="feature-list about-feature-list">
          {features.length > 0
            ? features.map((feature) => <span key={feature}>{feature}</span>)
            : <StatusMessage tone="info" title="Fitur belum tersedia">Informasi fitur belum tersedia pada response backend.</StatusMessage>}
        </div>
        {logColumns.length > 0 ? (
          <p className="about-transform-note">
            Transformasi log1p digunakan pada: {logColumns.join(', ')}.
          </p>
        ) : null}
      </section>

      <section className="panel about-method">
        <div className="section-heading"><h2>Metode FCM-KNN</h2></div>
        <div className="about-method-grid">
          <article>
            <span>1</span>
            <h3>Fuzzy C-Means</h3>
            <p>Mengelompokkan laptop dan menghasilkan derajat keanggotaan untuk empat cluster.</p>
          </article>
          <article>
            <span>2</span>
            <h3>Kombinasi 11 Fitur</h3>
            <p>Empat membership digabungkan dengan tujuh fitur preprocessing.</p>
          </article>
          <article>
            <span>3</span>
            <h3>KNN Euclidean</h3>
            <p>Melakukan pencarian jarak Euclidean untuk mendapatkan laptop terdekat.</p>
          </article>
          <article>
            <span>4</span>
            <h3>Lima Rekomendasi</h3>
            <p>Menampilkan lima laptop terdekat berdasarkan representasi model yang tersedia.</p>
          </article>
        </div>
      </section>

      <section className="about-grid">
        <div className="panel">
          <div className="parameter-heading"><Network size={16} aria-hidden="true" /><h2>Konfigurasi FCM</h2></div>
          <dl className="about-facts">
            <div><dt>Jumlah cluster</dt><dd>{fcm.c ?? '—'}</dd></div>
            <div><dt>Fuzziness</dt><dd>{fcm.m ?? '—'}</dd></div>
            <div><dt>Error tolerance</dt><dd>{fcm.error ?? '—'}</dd></div>
            <div><dt>Maximum iterations</dt><dd>{fcm.maxiter ?? '—'}</dd></div>
            <div><dt>Seed</dt><dd>{fcm.seed ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="panel">
          <div className="parameter-heading"><Network size={16} aria-hidden="true" /><h2>Konfigurasi KNN</h2></div>
          <dl className="about-facts">
            <div><dt>Neighbors</dt><dd>{knn.n_neighbors ?? '—'}</dd></div>
            <div><dt>Metric</dt><dd>{knn.metric ?? '—'}</dd></div>
            <div><dt>Algorithm</dt><dd>{knn.algorithm ?? '—'}</dd></div>
          </dl>
        </div>
      </section>

      <section className="processing-grid">
        <div className="panel">
          <div className="parameter-heading"><Braces size={16} aria-hidden="true" /><h2>Teknologi Backend</h2></div>
          <div className="technology-list">
            {['FastAPI', 'Uvicorn', 'NumPy', 'pandas', 'scikit-learn', 'scikit-fuzzy', 'joblib'].map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="parameter-heading"><Braces size={16} aria-hidden="true" /><h2>Teknologi Frontend</h2></div>
          <div className="technology-list">
            {['React', 'React Router', 'Vite', 'Axios', 'Lucide React', 'JavaScript'].map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="processing-grid">
        <div className="panel">
          <div className="section-heading"><h2>Versi Runtime</h2></div>
          <dl className="about-facts">
            <div><dt>Python</dt><dd>{formatVersion(versions.python)}</dd></div>
            <div><dt>NumPy</dt><dd>{formatVersion(versions.numpy)}</dd></div>
            <div><dt>pandas</dt><dd>{formatVersion(versions.pandas)}</dd></div>
            <div><dt>scikit-learn</dt><dd>{formatVersion(versions.scikit_learn)}</dd></div>
            <div><dt>scikit-fuzzy</dt><dd>{formatVersion(versions.scikit_fuzzy)}</dd></div>
          </dl>
        </div>
        <div className="panel">
          <div className="section-heading"><h2>Kurs Demonstrasi</h2></div>
          {exchangeRate.eur_to_idr != null ? (
            <div className="exchange-rate-card">
              <strong>1 EUR = Rp{Number(exchangeRate.eur_to_idr).toLocaleString('id-ID')}</strong>
              <p>Kurs ini merupakan kurs demonstrasi, bukan kurs pasar real-time.</p>
            </div>
          ) : (
            <div className="empty-state">Informasi kurs demonstrasi belum tersedia.</div>
          )}
        </div>
      </section>
    </main>
  )
}

export default TentangSistem

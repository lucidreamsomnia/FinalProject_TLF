import { useEffect, useState } from 'react'
import { BarChart3, Layers3, Network } from 'lucide-react'
import StatusMessage from '../components/common/StatusMessage'
import { fetchEvaluation, getApiError } from '../services/apiService'

function formatDecimal(value, digits = 6) {
  if (value == null) return '—'
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : '—'
}

function MetricCard({ icon: Icon, label, value, description }) {
  return (
    <article className="panel evaluation-metric-card">
      <div className="parameter-heading">
        <Icon size={17} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  )
}

function EvaluasiModel() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchEvaluation()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError, 'Data evaluasi belum dapat dimuat.'))
      })
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <main className="page-shell">
        <StatusMessage tone="error" title="Evaluasi model tidak tersedia">{error}</StatusMessage>
      </main>
    )
  }

  if (!data) {
    return <main className="page-shell"><div className="loading-state">Memuat evaluasi model...</div></main>
  }

  const main = data.main && typeof data.main === 'object' ? data.main : {}
  const comparisons = Array.isArray(data.recommendation_comparison)
    ? data.recommendation_comparison
    : []
  const clusterSensitivity = Array.isArray(data.cluster_sensitivity)
    ? data.cluster_sensitivity
    : []
  const fuzzinessSensitivity = Array.isArray(data.fuzziness_sensitivity)
    ? data.fuzziness_sensitivity
    : []
  const sensitivity = data.sensitivity_status && typeof data.sensitivity_status === 'object'
    ? data.sensitivity_status
    : { available: false }

  return (
    <main className="page-shell evaluation-page">
      <p className="eyebrow">Evaluasi Model</p>
      <h1>Evaluasi FCM dan FCM-KNN</h1>
      <p className="page-intro">
        Ringkasan metrik berdasarkan hasil evaluasi yang disediakan backend.
      </p>

      <section className="evaluation-metrics-grid" aria-label="Metrik evaluasi utama">
        <MetricCard
          icon={Layers3}
          label="FPC"
          value={formatDecimal(main.fpc, 6)}
          description="Menggambarkan tingkat kejelasan membership FCM."
        />
        <MetricCard
          icon={BarChart3}
          label="Silhouette Score"
          value={formatDecimal(main.silhouette, 6)}
          description="Menggambarkan kualitas pemisahan cluster."
        />
        <MetricCard
          icon={Network}
          label="Davies-Bouldin Index"
          value={formatDecimal(main.davies_bouldin, 6)}
          description="Mengukur kesamaan antarcluster; nilai lebih rendah umumnya lebih baik."
        />
      </section>

      <section className="panel evaluation-comparison">
        <div className="section-heading">
          <h2>Perbandingan KNN dan FCM-KNN</h2>
          <span>Nilai berasal dari data perbandingan yang disediakan service backend.</span>
        </div>
        {comparisons.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Profil</th>
                  <th>KNN MAE</th>
                  <th>FCM-KNN MAE</th>
                  <th>Jaccard Similarity</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((item, index) => (
                  <tr key={`${item?.profile ?? 'profile'}-${index}`}>
                    <td>{item?.profile ?? '—'}</td>
                    <td>{formatDecimal(item?.knn_mae, 5)}</td>
                    <td>{formatDecimal(item?.fcm_knn_mae, 5)}</td>
                    <td>{formatDecimal(item?.jaccard_similarity, 6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Data perbandingan belum tersedia.</div>
        )}
        <p className="evaluation-note">
          Nilai perbandingan disediakan oleh service dan bukan hasil pengukuran ulang saat halaman dibuka.
          Hasil tersebut tidak menyatakan bahwa FCM-KNN selalu lebih baik daripada KNN.
        </p>
      </section>

      <section className="evaluation-grid">
        <div className="panel">
          <div className="section-heading"><h2>Analisis Sensitivitas</h2></div>
          {sensitivity.available && (clusterSensitivity.length > 0 || fuzzinessSensitivity.length > 0) ? (
            <div className="sensitivity-content">
              {clusterSensitivity.length > 0 ? (
                <p>Tersedia {clusterSensitivity.length} hasil analisis sensitivitas jumlah cluster.</p>
              ) : null}
              {fuzzinessSensitivity.length > 0 ? (
                <p>Tersedia {fuzzinessSensitivity.length} hasil analisis sensitivitas parameter fuzziness.</p>
              ) : null}
            </div>
          ) : (
            <div className="analysis-unavailable">
              <StatusMessage tone="info" title="Analisis sensitivitas belum tersedia">
                Keluaran notebook tersimpan belum menyediakan hasil sensitivitas numerik yang terverifikasi. Backend tidak menjalankan ulang eksperimen; ketiadaan data bukan hasil negatif.
              </StatusMessage>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-heading"><h2>PCA</h2></div>
          {data.pca?.available ? (
            <div className="analysis-unavailable">
              <StatusMessage tone="info" title="Data PCA tersedia">
                Backend menyatakan data PCA tersedia, tetapi visualisasi belum ditampilkan pada halaman ini.
              </StatusMessage>
            </div>
          ) : (
            <div className="analysis-unavailable">
              <StatusMessage tone="info" title="Visualisasi PCA belum tersedia">
                Koordinat PCA tidak tersedia dari backend. Ini berarti visualisasinya belum dapat ditampilkan, bukan hasil evaluasi yang negatif.
              </StatusMessage>
            </div>
          )}
        </div>
      </section>

      <section className="panel evaluation-interpretation">
        <div className="section-heading"><h2>Interpretasi Singkat</h2></div>
        <ul>
          <li>FPC digunakan untuk menilai kejelasan membership FCM, bukan sebagai akurasi rekomendasi.</li>
          <li>Silhouette menunjukkan sejauh mana cluster terpisah pada fitur yang tersedia.</li>
          <li>Davies-Bouldin lebih rendah umumnya menunjukkan pemisahan cluster yang lebih baik.</li>
          <li>Sistem ini adalah sistem rekomendasi; metrik tidak boleh disajikan sebagai akurasi klasifikasi.</li>
        </ul>
      </section>
    </main>
  )
}

export default EvaluasiModel

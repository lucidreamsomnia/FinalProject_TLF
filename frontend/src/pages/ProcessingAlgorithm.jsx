import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, Cpu, Network, Play } from 'lucide-react'
import StatusMessage from '../components/common/StatusMessage'
import {
  fetchProcessing,
  getApiError,
  runProcessingDemonstration,
} from '../services/apiService'

function formatDecimal(value, digits = 4) {
  if (value == null) return '—'
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : '—'
}

function formatStatus(status) {
  const labels = {
    waiting: 'Menunggu',
    processing: 'Sedang diproses',
    completed: 'Selesai',
    failed: 'Gagal',
  }
  return labels[status] ?? status ?? '—'
}

function formatProcessingMessage(message) {
  const translations = {
    'Model resources are ready; no demonstration process has been requested.':
      'Model siap digunakan; demonstrasi belum dijalankan.',
    'Bounded demonstration recommendation computation completed.':
      'Perhitungan rekomendasi demonstrasi selesai.',
    'Model resources are unavailable.':
      'Sumber daya model tidak tersedia.',
  }
  return translations[message] ?? message ?? '—'
}

function formatPipelineStep(step) {
  const translations = {
    'Input Data': 'Data masukan',
    'Preprocessing and Feature Extraction': 'Prapemrosesan dan ekstraksi fitur',
    'Log1p Transformation': 'Transformasi log1p',
    'MinMaxScaler Normalization': 'Normalisasi MinMaxScaler',
    'Fuzzy C-Means': 'Fuzzy C-Means',
    'Membership Degree Calculation': 'Penghitungan derajat keanggotaan',
    'Combine 7 features + 4 memberships': 'Penggabungan 7 fitur + 4 membership',
    'KNN Euclidean Distance': 'Jarak Euclidean KNN',
    'Top-5 Recommendations': 'Lima rekomendasi teratas',
  }
  return translations[step] ?? step
}

function formatDemonstrationError(error) {
  const message = getApiError(error, 'Demonstrasi pemrosesan gagal dijalankan.')
  return message === 'Demonstration processing failed.'
    ? 'Demonstrasi pemrosesan gagal dijalankan.'
    : message
}

function ParameterCard({ label, value }) {
  return (
    <div className="parameter-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ProcessingAlgorithm() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [runError, setRunError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let active = true
    fetchProcessing()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError, 'Informasi pemrosesan belum dapat dimuat.'))
      })
    return () => {
      active = false
    }
  }, [])

  async function runDemonstration() {
    setRunning(true)
    setRunError('')
    setRefreshError('')
    setRunResult(null)
    try {
      const result = await runProcessingDemonstration()
      setRunResult(result)
      try {
        setData(await fetchProcessing())
      } catch (refreshRequestError) {
        setRefreshError(
          getApiError(
            refreshRequestError,
            'Demonstrasi berhasil, tetapi status pemrosesan belum dapat diperbarui.',
          ),
        )
      }
    } catch (requestError) {
      setRunError(formatDemonstrationError(requestError))
    } finally {
      setRunning(false)
    }
  }

  if (error) {
    return (
      <main className="page-shell">
        <StatusMessage tone="error" title="Pemrosesan & Algoritma tidak tersedia">{error}</StatusMessage>
      </main>
    )
  }

  if (!data) {
    return <main className="page-shell"><div className="loading-state">Memuat informasi pemrosesan...</div></main>
  }

  const fcm = data.fcm_parameters && typeof data.fcm_parameters === 'object'
    ? data.fcm_parameters
    : {}
  const knn = data.knn_parameters && typeof data.knn_parameters === 'object'
    ? data.knn_parameters
    : {}
  const features = Array.isArray(data.feature_names) ? data.feature_names : []
  const memberships = Array.isArray(data.membership_columns) ? data.membership_columns : []
  const hasApiPipeline = Array.isArray(data.pipeline) && data.pipeline.length > 0
  const pipeline = hasApiPipeline
    ? data.pipeline.map(formatPipelineStep)
    : [
      'Data masukan',
      'Ekstraksi fitur dan prapemrosesan',
      'Transformasi logaritmik',
      'Normalisasi MinMaxScaler',
      'Penghitungan membership FCM',
      'Penggabungan 7 fitur + 4 membership',
      'Pencarian jarak Euclidean dengan KNN',
      'Lima rekomendasi teratas',
    ]
  const clusterDistribution =
    data.cluster_distribution && typeof data.cluster_distribution === 'object'
      ? Object.entries(data.cluster_distribution)
      : []
  const clusterCounts = clusterDistribution
    .map(([, count]) => Number(count))
    .filter(Number.isFinite)
  const maxClusterCount = Math.max(...clusterCounts, 1)
  const exampleMembership =
    data.example_membership && typeof data.example_membership === 'object'
      ? data.example_membership
      : {}
  const membershipEntries = Object.entries(exampleMembership)
    .map(([column, value]) => {
      const clusterMatch = column.match(/Cluster_(\d+)/i)
      const numericValue = Number(value)
      return {
        column,
        cluster: clusterMatch ? Number(clusterMatch[1]) : null,
        label: clusterMatch ? `Cluster ${clusterMatch[1]}` : column,
        value: Number.isFinite(numericValue) ? numericValue : null,
      }
    })
    .sort((left, right) => (left.cluster ?? Infinity) - (right.cluster ?? Infinity))
  const distances = Array.isArray(runResult?.run?.distances)
    ? runResult.run.distances
    : []

  return (
    <main className="page-shell processing-page">
      <p className="eyebrow">Pemrosesan & Algoritma</p>
      <h1>Alur Pemrosesan LAPTOPFIND</h1>
      <p className="page-intro">
        Ringkasan alur FCM-KNN, parameter, dan hasil artefak model yang dimuat backend.
      </p>

      <section className="processing-status-grid" aria-label="Status pemrosesan">
        <article className="panel processing-status-card">
          <div className="parameter-heading">
            <Activity size={18} aria-hidden="true" />
            <span>Status</span>
          </div>
          <strong>{formatStatus(data.status)}</strong>
          <p>{formatProcessingMessage(data.message)}</p>
        </article>
        <article className="panel processing-status-card">
          <div className="parameter-heading">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Kesiapan Model</span>
          </div>
          <strong>{data.ready ? 'Siap' : 'Belum siap'}</strong>
          <p>KNN menggunakan model yang sudah tersedia; tidak ada pelatihan ulang.</p>
        </article>
        <article className="panel processing-status-card">
          <div className="parameter-heading">
            <Cpu size={18} aria-hidden="true" />
            <span>Mode Eksekusi</span>
          </div>
          <strong>{data.execution?.mode === 'demonstration' ? 'Demonstrasi' : data.execution?.mode ?? '—'}</strong>
          <p>Demonstrasi menjalankan inference dengan profil tetap.</p>
        </article>
      </section>

      {runError ? (
        <StatusMessage tone="error" title="Demonstrasi gagal">{runError}</StatusMessage>
      ) : null}
      {refreshError ? (
        <StatusMessage tone="info" title="Status belum diperbarui">
          {refreshError} Hasil demonstrasi tetap tersedia.
        </StatusMessage>
      ) : null}
      {runResult ? (
        <>
          <StatusMessage tone="success" title="Demonstrasi selesai">
            <span>{runResult.run?.recommendation_count ?? 0} rekomendasi dihitung.</span>
            <span>Demonstrasi memakai profil tetap dan tidak melatih ulang model.</span>
          </StatusMessage>
          {distances.length > 0 ? (
            <section className="panel knn-distance-panel" aria-labelledby="knn-distances-title">
              <h2 id="knn-distances-title">Jarak Euclidean Rekomendasi</h2>
              <ol className="knn-distance-list">
                {distances.map((distance, index) => (
                  <li key={`${index}-${distance}`}>
                    <span>Rekomendasi {index + 1}</span>
                    <strong>{formatDecimal(distance, 6)}</strong>
                  </li>
                ))}
              </ol>
              <p className="knn-distance-note">
                Urutan mengikuti hasil KNN dari yang terdekat. Endpoint demonstrasi tidak menyediakan nama laptop.
              </p>
            </section>
          ) : null}
        </>
      ) : null}

      <div className="processing-actions">
        <button className="button button-primary" type="button" onClick={runDemonstration} disabled={running}>
          <Play size={14} /> {running ? 'Menjalankan...' : 'Jalankan Demonstrasi'}
        </button>
      </div>

      <section className="processing-section">
        <div className="section-heading">
          <h2>Parameter Model</h2>
        </div>
        <div className="parameter-grid">
          <div className="panel">
            <div className="parameter-heading"><Network size={16} aria-hidden="true" /><h3>FCM</h3></div>
            <div className="parameter-card-grid">
              <ParameterCard label="Jumlah cluster" value={fcm.c ?? '—'} />
              <ParameterCard label="Parameter fuzziness" value={fcm.m ?? '—'} />
              <ParameterCard label="Toleransi error" value={fcm.error ?? '—'} />
              <ParameterCard label="Iterasi maksimum" value={fcm.maxiter ?? '—'} />
              <ParameterCard label="Seed" value={fcm.seed ?? '—'} />
            </div>
          </div>
          <div className="panel">
            <div className="parameter-heading"><Network size={16} aria-hidden="true" /><h3>KNN</h3></div>
            <div className="parameter-card-grid">
              <ParameterCard label="Jumlah tetangga" value={knn.n_neighbors ?? '—'} />
              <ParameterCard label="Metrik" value={knn.metric ?? '—'} />
              <ParameterCard label="Algoritma" value={knn.algorithm ?? '—'} />
              <ParameterCard label="Data pelatihan" value={knn.training_samples ?? '—'} />
              <ParameterCard label="Dimensi input" value={knn.input_dimensions ?? '—'} />
            </div>
          </div>
        </div>
      </section>

      <section className="processing-section">
        <div className="section-heading"><h2>Pipeline Pemrosesan</h2></div>
        {!hasApiPipeline ? (
          <p className="pipeline-fallback-note">
            Tahapan berikut adalah penjelasan alur sistem berdasarkan implementasi LAPTOPFIND,
            bukan rekaman eksekusi aktual dari backend.
          </p>
        ) : null}
        <div className="processing-pipeline">
          {pipeline.map((step, index) => (
            <div className="pipeline-step" key={`${step}-${index}`}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="processing-grid">
        <div className="panel">
          <div className="section-heading"><h2>Fitur dan Membership</h2></div>
          <div className="feature-list">
            {features.length > 0 ? features.map((feature) => (
              <span key={feature}>{feature}</span>
            )) : <StatusMessage tone="info" title="Fitur tidak tersedia">Data fitur tidak tersedia pada respons backend.</StatusMessage>}
          </div>
          {memberships.length > 0 ? (
            <div className="membership-list">
              {memberships.map((membership) => <span key={membership}>{membership}</span>)}
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="section-heading"><h2>Distribusi Cluster</h2></div>
          {clusterDistribution.length > 0 ? (
            <div className="cluster-distribution">
              {clusterDistribution.map(([cluster, count]) => {
                const numericCount = Number(count)
                const width = Number.isFinite(numericCount)
                  ? Math.max(0, (numericCount / maxClusterCount) * 100)
                  : 0
                return (
                  <div className="cluster-bar-row" key={cluster}>
                    <div><span>Cluster {cluster}</span><strong>{Number.isFinite(numericCount) ? numericCount : '—'} laptop</strong></div>
                    <div className="bar-track"><span style={{ width: `${width}%` }} /></div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">Distribusi cluster belum tersedia.</div>
          )}
        </div>
      </section>

      <section className="processing-grid">
        <div className="panel">
          <div className="section-heading"><h2>Contoh Derajat Keanggotaan</h2></div>
          {membershipEntries.length > 0 ? (
            <>
              <p className="membership-explanation">
                Fuzzy C-Means memberikan nilai keanggotaan pada setiap cluster, bukan hanya satu label tunggal.
              </p>
              <div className="membership-degree-list" role="list">
                {membershipEntries.map(({ column, label, value }) => {
                  const barValue = value == null ? 0 : Math.min(1, Math.max(0, value))
                  return (
                    <div className="membership-degree-row" key={column} role="listitem">
                      <span>{label}</span>
                      <div
                        className="membership-degree-track"
                        role="progressbar"
                        aria-label={`Membership Degree ${label}`}
                        aria-valuemin={0}
                        aria-valuemax={1}
                        aria-valuenow={barValue}
                        aria-valuetext={formatDecimal(value, 6)}
                      >
                        <span style={{ width: `${barValue * 100}%` }} />
                      </div>
                      <strong>{formatDecimal(value, 6)}</strong>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="empty-state">Nilai derajat keanggotaan contoh belum tersedia dari backend.</div>
          )}
        </div>
        <div className="panel">
          <div className="section-heading"><h2>PCA</h2></div>
          <div className="analysis-unavailable">
            {data.pca?.available ? (
              <StatusMessage tone="info" title="Data PCA tersedia">
                Backend menyatakan data PCA tersedia, tetapi visualisasi belum ditampilkan pada halaman ini.
              </StatusMessage>
            ) : (
              <StatusMessage tone="info" title="Visualisasi PCA belum tersedia">
                Koordinat PCA tidak tersedia dari backend. Ini berarti visualisasinya belum dapat ditampilkan, bukan hasil evaluasi yang negatif.
              </StatusMessage>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default ProcessingAlgorithm

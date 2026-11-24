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
      setRunError(getApiError(requestError, 'Demonstrasi pemrosesan gagal dijalankan.'))
    } finally {
      setRunning(false)
    }
  }

  if (error) {
    return (
      <main className="page-shell">
        <StatusMessage tone="error" title="Processing & Algorithm tidak tersedia">{error}</StatusMessage>
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
    ? data.pipeline
    : [
      'Input',
      'Feature extraction dan preprocessing',
      'Log transformation',
      'MinMaxScaler normalization',
      'FCM membership calculation',
      'Penggabungan 7 fitur dengan 4 membership',
      'KNN Euclidean search',
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

  return (
    <main className="page-shell processing-page">
      <p className="eyebrow">Processing & Algorithm</p>
      <h1>Alur Pemrosesan LAPTOPFIND</h1>
      <p className="page-intro">
        Ringkasan pipeline FCM-KNN berdasarkan data konfigurasi dan hasil artifact yang dimuat backend.
      </p>

      <section className="processing-status-grid" aria-label="Status pemrosesan">
        <article className="panel processing-status-card">
          <div className="parameter-heading">
            <Activity size={18} aria-hidden="true" />
            <span>Status</span>
          </div>
          <strong>{data.status ?? '—'}</strong>
          <p>{data.message ?? '—'}</p>
        </article>
        <article className="panel processing-status-card">
          <div className="parameter-heading">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Kesiapan Model</span>
          </div>
          <strong>{data.ready ? 'Siap' : 'Belum siap'}</strong>
          <p>{data.execution?.description ?? 'Informasi eksekusi tidak tersedia.'}</p>
        </article>
        <article className="panel processing-status-card">
          <div className="parameter-heading">
            <Cpu size={18} aria-hidden="true" />
            <span>Mode Eksekusi</span>
          </div>
          <strong>{data.execution?.mode ?? '—'}</strong>
          <p>Implementasi saat ini tidak melatih ulang model.</p>
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
        <StatusMessage tone="success" title="Demonstrasi selesai">
          <span>{runResult.run?.recommendation_count ?? 0} rekomendasi dihitung.</span>
          {Array.isArray(runResult.run?.distances) && runResult.run.distances.length > 0 ? (
            <span>Jarak KNN: {runResult.run.distances.map((distance) => formatDecimal(distance, 6)).join(', ')}</span>
          ) : null}
          <span>Demonstrasi menggunakan profil tetap dan tidak melatih ulang model.</span>
        </StatusMessage>
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
              <ParameterCard label="Fuzziness" value={fcm.m ?? '—'} />
              <ParameterCard label="Error tolerance" value={fcm.error ?? '—'} />
              <ParameterCard label="Maximum iterations" value={fcm.maxiter ?? '—'} />
              <ParameterCard label="Seed" value={fcm.seed ?? '—'} />
            </div>
          </div>
          <div className="panel">
            <div className="parameter-heading"><Network size={16} aria-hidden="true" /><h3>KNN</h3></div>
            <div className="parameter-card-grid">
              <ParameterCard label="Neighbors" value={knn.n_neighbors ?? '—'} />
              <ParameterCard label="Metric" value={knn.metric ?? '—'} />
              <ParameterCard label="Algorithm" value={knn.algorithm ?? '—'} />
              <ParameterCard label="Training samples" value={knn.training_samples ?? '—'} />
              <ParameterCard label="Input dimensions" value={knn.input_dimensions ?? '—'} />
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
          <div className="section-heading"><h2>Contoh Membership</h2></div>
          {Object.keys(exampleMembership).length > 0 ? (
            <div className="example-membership-grid">
              {Object.entries(exampleMembership).map(([column, value]) => (
                <div key={column}>
                  <span>{column.replace('Membership_', '').replaceAll('_', ' ')}</span>
                  <strong>{formatDecimal(value, 6)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Contoh membership belum tersedia.</div>
          )}
        </div>
        <div className="panel">
          <div className="section-heading"><h2>PCA</h2></div>
          <StatusMessage tone="info" title="PCA belum tersedia">
            {data.pca?.message ?? 'Visualisasi PCA belum tersedia.'}
          </StatusMessage>
        </div>
      </section>
    </main>
  )
}

export default ProcessingAlgorithm

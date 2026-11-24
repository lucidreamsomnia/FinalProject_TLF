import { ArrowLeft, Laptop, MapPin, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import StatusMessage from '../components/common/StatusMessage'
import { readRecommendationResponse } from '../services/recommendationStorage'

function formatDecimal(value, digits = 4) {
  if (value == null) return '—'

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : '—'
}

function formatIdr(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue)
    ? `Rp${numericValue.toLocaleString('id-ID')}`
    : '—'
}

function formatEur(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue)
    ? `€${numericValue.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
    : '—'
}

function HasilRekomendasi() {
  const location = useLocation()
  const stateResponse =
    location.state && typeof location.state.recommendationResponse === 'object'
      ? location.state.recommendationResponse
      : null
  const response = stateResponse || readRecommendationResponse()
  const recommendations = Array.isArray(response?.recommendations)
    ? response.recommendations
    : []

  if (!response || recommendations.length === 0) {
    return (
      <main className="page-shell results-page">
        <p className="eyebrow">Hasil Rekomendasi</p>
        <h1>Belum Ada Hasil Rekomendasi</h1>
        <div className="empty-state results-empty">
          <div>
            <Search size={34} strokeWidth={1.5} aria-hidden="true" />
            <p>Belum ada hasil pencarian yang tersedia. Atur preferensi terlebih dahulu untuk mendapatkan rekomendasi aktual dari backend.</p>
            <Link className="button button-primary" to="/cari-laptop">
              <ArrowLeft size={14} /> Kembali ke Cari Laptop
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page-shell results-page">
      <p className="eyebrow">Hasil Rekomendasi</p>
      <h1>Laptop Rekomendasi untuk Kamu</h1>
      <p className="page-intro">Hasil berikut dihitung oleh backend menggunakan FCM membership dan jarak Euclidean KNN.</p>

      <section className="results-budget-grid" aria-label="Ringkasan anggaran">
        <article className="panel results-budget-card">
          <span>Anggaran Rupiah</span>
          <strong>{formatIdr(response.budget_idr)}</strong>
        </article>
        <article className="panel results-budget-card">
          <span>Anggaran EUR</span>
          <strong>{formatEur(response.budget_eur)}</strong>
        </article>
        <article className="panel results-budget-card">
          <span>Jumlah Rekomendasi</span>
          <strong>{recommendations.length} laptop</strong>
        </article>
      </section>

      <StatusMessage tone="success" title="Rekomendasi berhasil dibuat">
        Input valid dan hasil pencarian telah diterima dari backend.
      </StatusMessage>

      <section className="recommendation-list" aria-label="Daftar rekomendasi laptop">
        {recommendations.map((item, index) => {
          const rank = item?.rank ?? index + 1
          const memberships = Array.isArray(item?.laptop_memberships)
            ? item.laptop_memberships
            : []
          const withinBudget = item?.within_budget === true

          return (
            <article className="panel recommendation-card" key={item?.row_index ?? `recommendation-${index}`}>
              <div className="recommendation-rank" aria-label={`Ranking ${rank}`}>
                <span>#{rank}</span>
              </div>

              <div className="recommendation-main">
                <div className="recommendation-title">
                  <div className="recommendation-laptop-icon" aria-hidden="true">
                    <Laptop size={38} strokeWidth={1.4} />
                  </div>
                  <div>
                    <span>{item?.company ?? '—'}</span>
                    <h2>{item?.product ?? '—'}</h2>
                  </div>
                </div>

                <div className="recommendation-price">
                  <strong>{formatEur(item?.price_eur)}</strong>
                  <span>{formatIdr(item?.price_idr)}</span>
                </div>
              </div>

              <div className="recommendation-details">
                <div><span>RAM</span><strong>{item?.ram ?? '—'}</strong></div>
                <div><span>Penyimpanan</span><strong>{item?.memory ?? '—'}</strong></div>
                <div><span>Berat</span><strong>{item?.weight ?? '—'}</strong></div>
                <div><span>CPU</span><strong>{item?.cpu ?? '—'}</strong></div>
                <div><span>CPU Base Frequency</span><strong>{formatDecimal(item?.cpu_base_ghz, 2)} GHz</strong></div>
                <div><span>Cluster FCM</span><strong>{item?.fcm_cluster == null ? '—' : `Cluster ${item.fcm_cluster}`}</strong></div>
                <div><span>Jarak KNN</span><strong>{formatDecimal(item?.distance, 6)}</strong></div>
                <div>
                  <span>Status Anggaran</span>
                  <strong className={withinBudget ? 'budget-status in-budget' : 'budget-status out-of-budget'}>
                    {item?.within_budget == null ? '—' : withinBudget ? 'Dalam batas' : 'Di luar batas'}
                  </strong>
                </div>
              </div>

              {memberships.length > 0 ? (
                <div className="membership-details">
                  <span>Membership FCM Laptop</span>
                  <div>
                    {memberships.map((membership, membershipIndex) => (
                      <div key={`membership-${membershipIndex}`}>
                        <b>Cluster {membershipIndex + 1}</b>
                        <span>{formatDecimal(membership, 6)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {Array.isArray(item?.query_memberships) && item.query_memberships.length > 0 ? (
                <div className="membership-details query-memberships">
                  <span>Membership FCM Input</span>
                  <div>
                    {item.query_memberships.map((membership, membershipIndex) => (
                      <div key={`query-membership-${membershipIndex}`}>
                        <b>Cluster {membershipIndex + 1}</b>
                        <span>{formatDecimal(membership, 6)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </section>

      <div className="results-actions">
        <Link className="button button-secondary" to="/cari-laptop">
          <ArrowLeft size={14} /> Ubah Preferensi
        </Link>
        <Link className="button button-primary" to="/katalog">
          <MapPin size={14} /> Lihat Katalog
        </Link>
      </div>
    </main>
  )
}

export default HasilRekomendasi

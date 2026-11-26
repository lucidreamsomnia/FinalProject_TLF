import { useState } from 'react'
import { ArrowRight, RotateCcw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatusMessage from '../components/common/StatusMessage'
import { fetchRecommendations, getApiError } from '../services/apiService'
import { saveRecommendationResponse } from '../services/recommendationStorage'
import { readPreferences, savePreferences } from '../services/preferenceStorage'

const CPU_OPTIONS = ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core M', 'Intel Celeron', 'Intel Pentium', 'Intel Atom', 'AMD Other', 'Other']
const initialForm = { budget_idr: '30000000', ram_gb: '16', ssd_gb: '512', hdd_gb: '0', weight_kg: '2', cpu_family: 'Intel Core i7', cpu_base_ghz: '2.4' }

function CariLaptop() {
  const navigate = useNavigate()

  const [form, setForm] = useState(() => {
  const savedPreferences = readPreferences()

  return savedPreferences
    ? Object.fromEntries(
        Object.entries(savedPreferences).map(([key, value]) => [
          key,
          String(value),
        ])
      )
    : initialForm
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  function resetForm() {
    setForm(initialForm)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, key === 'cpu_family' ? value : Number(value)]))
    try {
      const result = await fetchRecommendations(payload)
      savePreferences(payload)
      saveRecommendationResponse(result)
      navigate('/hasil-rekomendasi', { state: { recommendationResponse: result } })
    } catch (requestError) {
      setError(getApiError(requestError, 'Rekomendasi belum dapat dibuat.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell search-page">
      <p className="eyebrow">Cari Laptop</p>
      <h1>Atur Kebutuhan Laptopmu</h1>
      <p className="page-intro">Isi preferensi utama berikut. Sistem akan mencari laptop yang paling mendekati kebutuhanmu.</p>
      <div className="search-layout">
        <form className="panel search-form" onSubmit={handleSubmit}>
          <FormSection number="01" title="Anggaran">
            <label className="field field-wide">Anggaran Maksimal (Rupiah)<input name="budget_idr" min="0" required type="number" value={form.budget_idr} onChange={updateField} /></label>
            <p className="field-help">Anggaran dikonversi ke EUR oleh backend menggunakan kurs demonstrasi. Anggaran adalah preferensi pencarian.</p>
          </FormSection>
          <FormSection number="02" title="Memori dan Penyimpanan">
            <label className="field">RAM (GB)<input name="ram_gb" min="0" required step="any" type="number" value={form.ram_gb} onChange={updateField} /></label>
            <label className="field">Kapasitas SSD (GB)<input name="ssd_gb" min="0" required step="any" type="number" value={form.ssd_gb} onChange={updateField} /></label>
            <label className="field">Kapasitas HDD (GB)<input name="hdd_gb" min="0" required step="any" type="number" value={form.hdd_gb} onChange={updateField} /></label>
          </FormSection>
          <FormSection number="03" title="Portabilitas">
            <label className="field field-wide">Berat Laptop (kg)<input name="weight_kg" min="0" required step="any" type="number" value={form.weight_kg} onChange={updateField} /></label>
            <p className="field-help">Tentukan perkiraan berat laptop yang diinginkan.</p>
          </FormSection>
          <FormSection number="04" title="Prosesor">
            <label className="field">Keluarga CPU<select name="cpu_family" value={form.cpu_family} onChange={updateField}>{CPU_OPTIONS.map((cpu) => <option key={cpu}>{cpu}</option>)}</select></label>
            <label className="field">Kecepatan Dasar (GHz)<input name="cpu_base_ghz" min="0" required step="any" type="number" value={form.cpu_base_ghz} onChange={updateField} /></label>
          </FormSection>
          {error ? <StatusMessage tone="error" title="Pencarian gagal">{error}</StatusMessage> : null}
          <div className="form-actions"><button className="button button-primary" disabled={submitting} type="submit">{submitting ? 'Mencari...' : 'Cari Rekomendasi'} <Search size={14} /></button></div>
        </form>
        <aside className="search-summary panel">
          <h2>Ringkasan Preferensi</h2>
          <SummaryRow label="Anggaran" value={`Rp${Number(form.budget_idr || 0).toLocaleString('id-ID')}`} />
          <SummaryRow label="Setara EUR" value={`≈ €${(Number(form.budget_idr || 0) / 20000).toFixed(2)}`} />
          <SummaryRow label="RAM" value={`${form.ram_gb || 0} GB`} />
          <SummaryRow label="Penyimpanan" value={`${form.ssd_gb || 0}GB SSD`} />
          <SummaryRow label="Berat" value={`≤ ${form.weight_kg || 0} kg`} />
          <SummaryRow label="Prosesor" value={form.cpu_family} />
          <p className="budget-note">Anggaran adalah preferensi pencarian, bukan jaminan seluruh rekomendasi berada di bawah batas harga.</p>
          <button className="button button-secondary button-full" disabled={submitting} onClick={resetForm} type="button"><RotateCcw size={14} /> Reset Form</button>
          <small className="exchange-note">Kurs demonstrasi: 1 EUR = Rp20.000. Konversi dilakukan satu kali oleh backend.</small>
        </aside>
      </div>
    </main>
  )
}

function FormSection({ number, title, children }) {
  return <section className="form-section"><div className="form-section-heading"><span>{number}</span><h2>{title}</h2></div><div className="form-section-fields">{children}</div></section>
}

function SummaryRow({ label, value }) {
  return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>
}

export default CariLaptop

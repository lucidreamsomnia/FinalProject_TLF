import { useRef, useState } from 'react'
import { CheckCircle2, FileText, Upload, Users } from 'lucide-react'
import StatusMessage from '../components/common/StatusMessage'
import { getApiError, uploadDataset, validatePreferences } from '../services/apiService'

const CPU_OPTIONS = ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core M', 'Intel Celeron', 'Intel Pentium', 'Intel Atom', 'AMD Other', 'Other']
const FEATURE_COLUMNS = ['Price_euros', 'Ram_GB', 'Weight_kg', 'SSD_GB', 'HDD_GB', 'CPU_Family_Score', 'CPU_Base_GHz']
const initialForm = { budget_idr: '30000000', ram_gb: '16', ssd_gb: '512', hdd_gb: '0', weight_kg: '2', cpu_family: 'Intel Core i7', cpu_base_ghz: '2.4' }

function toPreferencePayload(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => (
    [key, key === 'cpu_family' ? value : Number(value)]
  )))
}

function InputData() {
  const [form, setForm] = useState(initialForm)
  const [validation, setValidation] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [validating, setValidating] = useState(false)
  const [file, setFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef(null)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setValidation(null)
    setValidationError('')
  }

  async function handleValidate(event) {
    event.preventDefault()
    setValidating(true)
    setValidationError('')
    setValidation(null)
    try {
      setValidation(await validatePreferences(toPreferencePayload(form)))
    } catch (error) {
      setValidationError(getApiError(error, 'Validasi preferensi gagal.'))
    } finally {
      setValidating(false)
    }
  }

  async function handleUpload(event) {
    const selected = event.target.files?.[0]
    setUploadResult(null)
    setUploadError('')
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Hanya file CSV yang dapat diunggah.')
      setFile(null)
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file melebihi batas maksimum 10 MB.')
      setFile(null)
      return
    }
    setFile(selected)
    setUploading(true)
    try {
      setUploadResult(await uploadDataset(selected))
    } catch (error) {
      setUploadError(getApiError(error, 'Validasi CSV gagal.'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="page-shell input-page">
      <p className="eyebrow">Pengelolaan Data</p>
      <h1>Input Data</h1>
      <p className="page-intro">Input satu preferensi pengguna untuk rekomendasi atau unggah dataset CSV untuk proses validasi struktur data.</p>
      <section className="input-options">
        <form className="panel preference-panel" onSubmit={handleValidate}>
          <div className="panel-heading"><div><h2><Users size={17} /> A. Input Preferensi Pengguna</h2><p>Digunakan untuk satu pencarian rekomendasi, bukan untuk melatih ulang model.</p></div></div>
          <div className="preference-grid">
            <label className="field field-wide">Anggaran Maksimal (Rupiah)<input name="budget_idr" inputMode="numeric" min="0" required type="number" value={form.budget_idr} onChange={updateField} /></label>
            <label className="field">RAM (GB)<input name="ram_gb" min="0" required step="any" type="number" value={form.ram_gb} onChange={updateField} /></label>
            <label className="field">SSD (GB)<input name="ssd_gb" min="0" required step="any" type="number" value={form.ssd_gb} onChange={updateField} /></label>
            <label className="field">HDD (GB)<input name="hdd_gb" min="0" required step="any" type="number" value={form.hdd_gb} onChange={updateField} /></label>
            <label className="field">Berat (kg)<input name="weight_kg" min="0" required step="any" type="number" value={form.weight_kg} onChange={updateField} /></label>
            <label className="field">Keluarga CPU<select name="cpu_family" value={form.cpu_family} onChange={updateField}>{CPU_OPTIONS.map((cpu) => <option key={cpu}>{cpu}</option>)}</select></label>
            <label className="field">CPU Base Frequency (GHz)<input name="cpu_base_ghz" min="0" required step="any" type="number" value={form.cpu_base_ghz} onChange={updateField} /></label>
          </div>
          <button className="button button-primary" disabled={validating} type="submit">{validating ? 'Memvalidasi...' : 'Validasi Preferensi'} <CheckCircle2 size={14} /></button>
          {validationError ? <StatusMessage tone="error" title="Validasi gagal">{validationError}</StatusMessage> : null}
          {validation ? <StatusMessage tone="success" title="Validasi input berhasil">Budget model: EUR {validation.budget_eur.toFixed(2)}. Data siap digunakan untuk proses rekomendasi.</StatusMessage> : null}
        </form>

        <section className="panel upload-panel">
          <div className="panel-heading"><div><h2><Upload size={17} /> B. Upload Dataset</h2><p>Digunakan untuk validasi struktur data, bukan untuk training ulang model.</p></div></div>
          <label className="upload-dropzone">
            <Upload size={24} />
            <strong>Tarik dan lepas file CSV di sini</strong>
            <span>atau klik untuk memilih file · maksimal 10 MB</span>
            <input ref={fileInput} accept=".csv,text/csv" type="file" onChange={handleUpload} />
          </label>
          {file ? <p className="file-summary"><FileText size={15} /> {file.name} · {(file.size / 1024).toFixed(1)} KB</p> : null}
          {uploading ? <div className="loading-state compact">Memvalidasi CSV...</div> : null}
          {uploadError ? <StatusMessage tone="error" title="Upload gagal">{uploadError}</StatusMessage> : null}
          {uploadResult ? <StatusMessage tone={uploadResult.valid ? 'success' : 'error'} title={uploadResult.valid ? 'CSV valid' : 'CSV memiliki kesalahan'}>{uploadResult.row_count} baris diperiksa. {uploadResult.errors.join(' ')}</StatusMessage> : null}
        </section>
      </section>

      {uploadResult ? <UploadPreview result={uploadResult} /> : null}
    </main>
  )
}

function UploadPreview({ result }) {
  const columns = result.columns.length ? result.columns : FEATURE_COLUMNS
  return (
    <section className="panel upload-preview">
      <div className="panel-heading"><div><h2>Preview Dataset</h2><p>{result.row_count} baris ditemukan · kolom yang diterima sesuai struktur model</p></div></div>
      {result.preview.length ? (
        <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{result.preview.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{row[column] ?? '—'}</td>)}</tr>)}</tbody></table></div>
      ) : <div className="empty-state">Tidak ada baris preview yang dapat ditampilkan.</div>}
    </section>
  )
}

export default InputData

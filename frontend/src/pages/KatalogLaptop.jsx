import { useEffect, useState } from 'react'
import { Laptop, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import StatusMessage from '../components/common/StatusMessage'
import { fetchCatalog, getApiError } from '../services/apiService'

const BRAND_OPTIONS = [
  'Acer',
  'Apple',
  'Asus',
  'Chuwi',
  'Dell',
  'Fujitsu',
  'Google',
  'HP',
  'Huawei',
  'Lenovo',
  'LG',
  'Mediacom',
  'Microsoft',
  'MSI',
  'Razer',
  'Samsung',
  'Toshiba',
  'Vero',
  'Xiaomi',
]

const RAM_OPTIONS = [2, 4, 6, 8, 12, 16, 24, 32, 64]

const STORAGE_OPTIONS = [
  { value: 'SSD', label: 'SSD' },
  { value: 'HDD', label: 'HDD' },
  { value: 'Flash Storage', label: 'Flash Storage' },
  { value: 'Hybrid', label: 'Hybrid' },
]

const CPU_OPTIONS = [
  'Intel Core i3',
  'Intel Core i5',
  'Intel Core i7',
  'Intel Core i9',
  'Intel Core M',
  'Intel Celeron',
  'Intel Pentium',
  'Intel Atom',
  'AMD Other',
  'Other',
]

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'price_asc', label: 'Harga termurah' },
  { value: 'price_desc', label: 'Harga termahal' },
  { value: 'ram_desc', label: 'RAM terbesar' },
  { value: 'weight_asc', label: 'Berat teringan' },
]

const INITIAL_FILTERS = {
  search: '',
  brand: '',
  min_price_idr: '',
  max_price_idr: '',
  ram_gb: '',
  storage: '',
  cpu_family: '',
  sort: 'default',
  page: 1,
  page_size: 8,
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

function KatalogLaptop() {
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedFilters((current) => (
        current.search === searchInput
          ? current
          : { ...current, search: searchInput, page: 1 }
      ))
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    fetchCatalog(appliedFilters)
      .then((catalogResult) => {
        if (active) setResult(catalogResult)
      })
      .catch((requestError) => {
        if (active) {
          setResult(null)
          setError(getApiError(requestError, 'Katalog laptop belum dapat dimuat.'))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [appliedFilters])

  function updateDraft(event) {
    const { name, value } = event.target
    setDraftFilters((current) => ({
      ...current,
      [name]: value,
      page: 1,
    }))
  }

  function applyFilters(event) {
    event.preventDefault()
    setAppliedFilters({
      ...draftFilters,
      search: searchInput,
      page: 1,
    })
  }

  function resetFilters() {
    setSearchInput('')
    setDraftFilters(INITIAL_FILTERS)
    setAppliedFilters(INITIAL_FILTERS)
  }

  function changePage(nextPage) {
    setDraftFilters((current) => ({ ...current, page: nextPage }))
    setAppliedFilters((current) => ({ ...current, page: nextPage }))
  }

  const items = result?.items ?? []
  const totalRecords = result?.total_records ?? 0
  const currentPage = result?.page ?? appliedFilters.page
  const totalPages = result?.total_pages ?? 0

  return (
    <main className="page-shell catalog-page">
      <p className="eyebrow">Katalog Laptop</p>
      <h1>Temukan Laptop dari Dataset</h1>
      <p className="page-intro">
        Jelajahi {loading ? 'data laptop' : `${totalRecords.toLocaleString('id-ID')} laptop`} dari dataset LAPTOPFIND.
      </p>

      <section className="catalog-toolbar panel" aria-label="Pencarian dan pengurutan katalog">
        <label className="catalog-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari merek atau nama produk"
            aria-label="Cari merek atau nama produk"
          />
        </label>

        <label className="catalog-sort">
          <span>Urutkan</span>
          <select
            name="sort"
            value={draftFilters.sort}
            onChange={(event) => {
              const value = event.target.value
              setDraftFilters((current) => ({ ...current, sort: value, page: 1 }))
              setAppliedFilters((current) => ({ ...current, sort: value, page: 1 }))
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="catalog-layout">
        <aside className="catalog-filters panel">
          <div className="catalog-filter-heading">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <h2>Filter</h2>
          </div>

          <form onSubmit={applyFilters}>
            <label className="field">
              Brand
              <select name="brand" value={draftFilters.brand} onChange={updateDraft}>
                <option value="">Semua brand</option>
                {BRAND_OPTIONS.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </label>

            <div className="catalog-price-filter">
              <label className="field">
                Harga minimum
                <input
                  name="min_price_idr"
                  type="number"
                  min="0"
                  step="100000"
                  value={draftFilters.min_price_idr}
                  onChange={updateDraft}
                  placeholder="Rp"
                />
              </label>
              <label className="field">
                Harga maksimum
                <input
                  name="max_price_idr"
                  type="number"
                  min="0"
                  step="100000"
                  value={draftFilters.max_price_idr}
                  onChange={updateDraft}
                  placeholder="Rp"
                />
              </label>
            </div>

            <label className="field">
              RAM
              <select name="ram_gb" value={draftFilters.ram_gb} onChange={updateDraft}>
                <option value="">Semua RAM</option>
                {RAM_OPTIONS.map((ram) => (
                  <option key={ram} value={ram}>{ram} GB</option>
                ))}
              </select>
            </label>

            <label className="field">
              Storage
              <select name="storage" value={draftFilters.storage} onChange={updateDraft}>
                <option value="">Semua storage</option>
                {STORAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              CPU family
              <select name="cpu_family" value={draftFilters.cpu_family} onChange={updateDraft}>
                <option value="">Semua CPU</option>
                {CPU_OPTIONS.map((cpu) => (
                  <option key={cpu} value={cpu}>{cpu}</option>
                ))}
              </select>
            </label>

            <div className="catalog-filter-actions">
              <button className="button button-primary" type="submit">
                Terapkan Filter
              </button>
              <button className="button button-secondary" type="button" onClick={resetFilters}>
                <RotateCcw size={14} /> Reset Filter
              </button>
            </div>
          </form>
        </aside>

        <section className="catalog-results" aria-live="polite">
          {loading ? (
            <div className="loading-state compact">Memuat katalog laptop...</div>
          ) : error ? (
            <StatusMessage tone="error" title="Katalog tidak tersedia">{error}</StatusMessage>
          ) : items.length === 0 ? (
            <div className="empty-state catalog-empty">
              Tidak ada laptop yang cocok dengan pencarian atau filter saat ini.
            </div>
          ) : (
            <div className="catalog-grid">
              {items.map((laptop) => (
                <article className="catalog-card panel" key={laptop.row_index}>
                  <div className="catalog-card-icon" aria-hidden="true">
                    <Laptop size={48} strokeWidth={1.3} />
                  </div>
                  <div className="catalog-card-copy">
                    <span>{laptop.company}</span>
                    <h2>{laptop.product}</h2>
                    <p>{laptop.type_name}</p>
                    <strong className="catalog-price-eur">{formatEur(laptop.price_eur)}</strong>
                    <strong className="catalog-price-idr">{formatIdr(laptop.price_idr)}</strong>
                  </div>
                  <dl className="catalog-specs">
                    <div><dt>RAM</dt><dd>{laptop.ram}</dd></div>
                    <div><dt>Storage</dt><dd>{laptop.memory}</dd></div>
                    <div><dt>Berat</dt><dd>{laptop.weight}</dd></div>
                    <div><dt>CPU</dt><dd>{laptop.cpu}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}

          {!loading && !error && items.length > 0 ? (
            <nav className="catalog-pagination" aria-label="Pagination katalog">
              <button
                className="button button-secondary"
                type="button"
                disabled={currentPage <= 1}
                onClick={() => changePage(currentPage - 1)}
              >
                Sebelumnya
              </button>
              <span>Halaman {currentPage} dari {totalPages}</span>
              <button
                className="button button-secondary"
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => changePage(currentPage + 1)}
              >
                Berikutnya
              </button>
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default KatalogLaptop

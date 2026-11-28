import { useEffect, useState } from 'react'
import { createAdminLocation, deleteAdminLocation, getAdminLocations, updateAdminLocation } from '../api/adminApi.js'
import { filterLocations } from './locationFilter.js'

const label = (kind) => kind === 'cinemas' ? 'cinema' : 'theater'
const isOpen = (item) => Boolean(item.isOpen)

function LocationForm({ kind, item, cinemas, cinemaFilter, requestConfirmation, onCancel, onSaved }) {
  const [name, setName] = useState(item?.name || '')
  const [address, setAddress] = useState(item?.address || '')
  const [phone, setPhone] = useState(item?.phone || '')
  const [cinemaId, setCinemaId] = useState(String(item?.cinemaId || cinemaFilter || ''))
  const [maxSeats, setMaxSeats] = useState(item ? String(item.maxSeats) : '')
  const [accessibleSeats, setAccessibleSeats] = useState(item ? String(item.accessibleSeats) : '0')
  const [open, setOpen] = useState(item ? isOpen(item) : true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!name.trim()) { setError('Enter a name.'); return }
    if (kind === 'theaters' && (accessibleSeats === '' || maxSeats === '' ||
        !Number.isSafeInteger(Number(maxSeats)) || Number(maxSeats) < 1 ||
        !Number.isSafeInteger(Number(accessibleSeats)) || Number(accessibleSeats) < 0 ||
        Number(accessibleSeats) > Number(maxSeats))) {
      setError('Enter valid seat counts. Accessible seats cannot exceed total seats.')
      return
    }
    const data = kind === 'cinemas'
      ? { name: name.trim(), address, phone, isOpen: open }
      : { name: name.trim(), isOpen: open, maxSeats: Number(maxSeats), accessibleSeats: Number(accessibleSeats),
        ...(!item ? { cinemaId: Number(cinemaId) } : {}) }
    requestConfirmation({
      kind: 'confirm', title: `${item ? 'Save changes to' : 'Add'} ${label(kind)} ${name.trim()}?`,
      message: item && isOpen(item) && !open
        ? 'Closing this location hides its existing screenings from the public. Customers are not automatically notified or refunded.'
        : undefined,
      onConfirm: async () => {
        setBusy(true); setError('')
        try {
          if (item) await updateAdminLocation(kind, item.id, data)
          else await createAdminLocation(kind, data)
          onSaved(`${label(kind) === 'cinema' ? 'Cinema' : 'Theater'} ${item ? 'updated' : 'added'}.`)
        } catch (saveError) { setError(saveError.message) }
        finally { setBusy(false) }
      },
    })
  }

  return <form className="admin-panel" onSubmit={submit}>
    <h1>{item ? 'Edit' : 'Add'} {label(kind)}</h1>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy} className="admin-screening-form__fields">
      <label className="admin-field">Name<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></label>
      {kind === 'cinemas' ? <>
        <label className="admin-field">Address (optional)<input maxLength={255} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        <label className="admin-field">Phone (optional)<input type="tel" maxLength={50} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      </> : <>
        <label className="admin-field">Cinema
          <select required disabled={Boolean(item)} value={cinemaId} onChange={(event) => setCinemaId(event.target.value)}>
            <option value="">Select a cinema</option>
            {cinemas.map((cinema) => <option value={cinema.id} key={cinema.id}>{cinema.name}{isOpen(cinema) ? '' : ' (closed)'}</option>)}
          </select>
        </label>
        {item && <p>The cinema cannot be changed after a theater is created.</p>}
        <label className="admin-field">Total seats<input required type="number" min="1" max="2147483647" step="1" value={maxSeats} onChange={(event) => setMaxSeats(event.target.value)} /></label>
        <label className="admin-field">Accessible seats (included in total)<input required type="number" min="0" max={maxSeats || undefined} step="1" value={accessibleSeats} onChange={(event) => setAccessibleSeats(event.target.value)} /></label>
      </>}
      <label className="admin-field">Status<select value={open ? 'open' : 'closed'} onChange={(event) => setOpen(event.target.value === 'open')}><option value="open">Open</option><option value="closed">Closed</option></select></label>
      <div className="admin-screening-form__actions">
        <button type="submit" className="admin-action admin-action--green">Confirm</button>
        <button type="button" className="admin-action admin-action--gold" onClick={onCancel}>Cancel</button>
      </div>
    </fieldset>
  </form>
}

export default function AdminLocations({ requestConfirmation }) {
  const [locations, setLocations] = useState({ cinemas: [], theaters: [] })
  const [section, setSection] = useState('list')
  const [kind, setKind] = useState('cinemas')
  const [selected, setSelected] = useState(null)
  const [cinemaFilter, setCinemaFilter] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    getAdminLocations().then((data) => {
      if (!Array.isArray(data.cinemas) || !Array.isArray(data.theaters)) throw new Error('Invalid location list.')
      if (active) { setLocations(data); setError('') }
    }).catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  function saved(message) {
    setNotice(message); setError(''); setSelected(null); setSection('list')
    setLoading(true); setRevision((value) => value + 1)
  }
  function remove(type, item) {
    requestConfirmation({
      kind: 'delete', title: `Delete ${item.name}?`,
      message: 'This permanently deletes associated screenings, bookings and reservations. Paid bookings are not refunded and customers are not notified. Locations with pending-payment bookings cannot be deleted.',
      onConfirm: async () => {
        try {
          await deleteAdminLocation(type, item.id)
          if (type === 'cinemas' && cinemaFilter === item.id) setCinemaFilter(null)
          saved(`${type === 'cinemas' ? 'Cinema' : 'Theater'} deleted.`)
        } catch (deleteError) { setError(deleteError.message) }
      },
    })
  }
  function details(type, item) { setKind(type); setSelected(item); setError(''); setNotice(''); setSection('details') }
  const { cinemas, theaters } = filterLocations(locations, query, cinemaFilter)

  return <>
    {error && <p className="admin-feedback" role="alert">{error}</p>}
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    {section === 'list' && <section className="admin-panel admin-movies">
      <h1>Locations</h1>
      <label className="admin-field"><span className="admin-visually-hidden">Search locations</span><input type="search" placeholder="Search name or address..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {loading ? <p role="status">Loading locations...</p> : error ? <button type="button" className="admin-action admin-action--gold" onClick={() => { setLoading(true); setRevision((value) => value + 1) }}>Retry</button> :
        <div className="admin-location-lists">
          <section aria-labelledby="cinemas-title">
            <div className="admin-location-heading"><h2 id="cinemas-title">Cinemas</h2><button type="button" className="admin-action admin-action--green" onClick={() => { setKind('cinemas'); setSelected(null); setSection('add'); setNotice('') }}>Add cinema</button></div>
            <button type="button" className="admin-action admin-action--neutral" aria-pressed={!cinemaFilter} onClick={() => setCinemaFilter(null)}>All cinemas</button>
            <ul className="admin-movies__list admin-location-list">{cinemas.length === 0 ? <li className="admin-movies__row">No cinemas found.</li> : cinemas.map((cinema) => <li className="admin-movies__row admin-location-row" key={cinema.id}>
              <button type="button" className="admin-location-select" aria-pressed={cinemaFilter === cinema.id} onClick={() => setCinemaFilter(cinemaFilter === cinema.id ? null : cinema.id)}><strong>{cinema.name}</strong><span>{cinema.address || 'No address'} · {isOpen(cinema) ? 'Open' : 'Closed'}</span></button>
              <div className="admin-movies__actions"><button type="button" className="admin-action admin-action--gold" onClick={() => details('cinemas', cinema)}>Details</button><button type="button" className="admin-action admin-action--gold" onClick={() => { setKind('cinemas'); setSelected(cinema); setError(''); setSection('edit') }}>Edit</button><button type="button" className="admin-action admin-action--red" onClick={() => remove('cinemas', cinema)}>Delete</button></div>
            </li>)}</ul>
          </section>
          <section aria-labelledby="theaters-title">
            <div className="admin-location-heading"><h2 id="theaters-title">Theaters</h2><button type="button" className="admin-action admin-action--green" onClick={() => { setKind('theaters'); setSelected(null); setSection('add'); setNotice('') }}>Add theater</button></div>
            <p>{cinemaFilter ? `Showing theaters at ${locations.cinemas.find((item) => item.id === cinemaFilter)?.name || 'selected cinema'}` : 'Showing all cinemas'}</p>
            <ul className="admin-movies__list admin-location-list">{theaters.length === 0 ? <li className="admin-movies__row">No theaters found.</li> : theaters.map((theater) => <li className="admin-movies__row admin-location-row" key={theater.id}>
              <div className="admin-movies__details"><strong>{theater.name}</strong><span>{theater.cinemaName} · {isOpen(theater) ? 'Open' : 'Closed'}</span></div>
              <div className="admin-movies__actions"><button type="button" className="admin-action admin-action--gold" onClick={() => details('theaters', theater)}>Details</button><button type="button" className="admin-action admin-action--gold" onClick={() => { setKind('theaters'); setSelected(theater); setError(''); setSection('edit') }}>Edit</button><button type="button" className="admin-action admin-action--red" onClick={() => remove('theaters', theater)}>Delete</button></div>
            </li>)}</ul>
          </section>
        </div>}
    </section>}
    {section === 'details' && selected && <section className="admin-panel">
      <div className="admin-detail-toolbar"><button type="button" className="admin-action admin-action--gold" onClick={() => setSection('list')}>Back to locations</button><div className="admin-detail-toolbar__actions"><button type="button" className="admin-action admin-action--gold" onClick={() => setSection('edit')}>Edit</button><button type="button" className="admin-action admin-action--red" onClick={() => remove(kind, selected)}>Delete</button></div></div>
      <h1>{selected.name}</h1><p><strong>Status:</strong> {isOpen(selected) ? 'Open' : 'Closed'}</p>
      {kind === 'cinemas' ? <><p><strong>Address:</strong> {selected.address || 'Not provided'}</p><p><strong>Phone:</strong> {selected.phone || 'Not provided'}</p></> : <><p><strong>Cinema:</strong> {selected.cinemaName}</p><p><strong>Total seats:</strong> {selected.maxSeats}</p><p><strong>Accessible seats:</strong> {selected.accessibleSeats}</p></>}
    </section>}
    {(section === 'add' || section === 'edit') && <LocationForm key={`${kind}-${selected?.id || 'new'}`} kind={kind} item={section === 'edit' ? selected : null} cinemas={locations.cinemas} cinemaFilter={cinemaFilter} requestConfirmation={requestConfirmation} onSaved={saved} onCancel={() => requestConfirmation({ kind: 'cancel', title: 'Discard your changes?', onConfirm: () => { setError(''); setSection('list') } })} />}
  </>
}

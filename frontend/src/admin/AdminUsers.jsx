import { useEffect, useState } from 'react'
import { createAdminUser, deleteAdminUser, getAdminUsers, updateAdminUser } from '../api/adminApi.js'
import { formatScreeningDate } from '../pages/screeningDates.js'
import { usernamePattern } from '../pages/usernamePattern.js'

const roleLabels = { user: 'User', employee: 'Employee', admin: 'Admin' }

function UserForm({ user, requestConfirmation, onCancel, onSaved, onDelete }) {
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [role, setRole] = useState(user?.role || 'user')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function submit(event) {
    event.preventDefault()
    const data = { username: username.trim(), email: email.trim(), phone: phone.trim() }
    requestConfirmation({
      kind: 'confirm',
      title: user ? `Save changes to ${user.username}?` : `Create ${roleLabels[role].toLowerCase()} account?`,
      message: !user && role === 'user'
        ? 'This account cannot sign in until password setup and email verification are implemented.'
        : !user ? 'A password will be generated and shown once after creation.' : undefined,
      ...(!user && role === 'admin' ? { confirmText: 'ADMIN' } : {}),
      onConfirm: async () => {
        setBusy(true); setError('')
        try {
          if (user) {
            await updateAdminUser(user.id, data)
            onSaved('User updated.')
          } else {
            const result = await createAdminUser({ ...data, role, ...(role === 'admin' ? { adminConfirmation: 'ADMIN' } : {}) })
            if (role !== 'user') {
              if (typeof result.generatedPassword !== 'string' || !result.generatedPassword) {
                throw new Error('The account was created, but the generated password was not returned. Do not create it again.')
              }
              setGeneratedPassword(result.generatedPassword)
            } else onSaved('User created. Password setup and email verification are not available yet.')
          }
        } catch (saveError) { setError(saveError.message) }
        finally { setBusy(false) }
      },
    })
  }

  if (generatedPassword) return <section className="admin-panel">
    <h1>Account created</h1>
    <p>Save this password and share it securely. It will not be shown again. Password changes are not available yet.</p>
    <label className="admin-field">Generated password
      <input type={showPassword ? 'text' : 'password'} readOnly value={generatedPassword} autoComplete="off" />
    </label>
    <div className="admin-screening-form__actions">
      <button type="button" className="admin-action admin-action--gold" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide password' : 'Show password'}</button>
      <button type="button" className="admin-action admin-action--green" onClick={() => onSaved('User created.')}>Done</button>
    </div>
  </section>

  return <form className="admin-panel admin-user-form" onSubmit={submit}>
    <h1>{user ? 'Edit user' : 'Add user'}</h1>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy} className="admin-screening-form__fields">
      <div className="admin-user-form__fields">
        <label className="admin-field">Username<input required minLength={3} maxLength={32} pattern={usernamePattern} title="Use 3–32 letters, numbers, dots, underscores or hyphens." value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="admin-field">Email<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="admin-field">Phone (optional)<input type="tel" maxLength={50} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="admin-field">Address<input disabled placeholder="Not functional yet" /></label>
      </div>
      <fieldset className="admin-user-form__roles" disabled={Boolean(user)}>
        <legend>{user ? 'Role (cannot be changed)' : 'Select a role'}</legend>
        {Object.entries(roleLabels).map(([value, label]) => <label key={value}>
          <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} /> {label}
        </label>)}
      </fieldset>
      {!user && role === 'user' && <p>Registered accounts cannot sign in until password setup and email verification are implemented.</p>}
      {!user && role !== 'user' && <p>A password will be generated after confirmation and shown once.</p>}
      <div className="admin-screening-form__actions">
        <button type="submit" className="admin-action admin-action--green">Confirm</button>
        <button type="button" className="admin-action admin-action--gold" onClick={onCancel}>Cancel</button>
        {user && <button type="button" className="admin-action admin-action--red" onClick={() => onDelete(user)}>Delete</button>}
      </div>
    </fieldset>
  </form>
}

export default function AdminUsers({ requestConfirmation }) {
  const [users, setUsers] = useState([])
  const [section, setSection] = useState('list')
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    getAdminUsers().then((items) => {
      if (!Array.isArray(items)) throw new Error('Invalid user list.')
      if (active) { setUsers(items); setError('') }
    }).catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  function saved(message) {
    setNotice(message); setError(''); setSelected(null); setSection('list')
    setLoading(true); setRevision((value) => value + 1)
  }

  function deleteUser(user) {
    requestConfirmation({
      kind: 'delete', title: `Delete ${user.username}?`,
      message: 'Deleting this account can remove its seat reservations. Paid bookings are not refunded and customers are not notified. Accounts with pending payments cannot be deleted.',
      onConfirm: async () => {
        try { await deleteAdminUser(user.id); saved('User deleted.') }
        catch (deleteError) { setError(deleteError.message) }
      },
    })
  }

  const filtered = users.filter((user) => {
    const text = query.trim().toLocaleLowerCase()
    return (!role || user.role === role) && [user.username, user.email].some((value) => String(value || '').toLocaleLowerCase().includes(text))
  })

  return <>
    {error && <p className="admin-feedback" role="alert">{error}</p>}
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    {section === 'list' && <section className="admin-panel admin-movies">
      <h1>Users</h1>
      <div className="admin-movies__toolbar">
        <label className="admin-field"><span className="admin-visually-hidden">Search by email or username</span><input type="search" placeholder="Email or username" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <button type="button" className="admin-action admin-action--neutral" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>Filters</button>
        <button type="button" className="admin-action admin-action--green" onClick={() => { setNotice(''); setError(''); setSection('add') }}>Add user</button>
      </div>
      {showFilters && <div className="admin-movies__filters"><label className="admin-field">Role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>}
      {loading ? <p role="status">Loading users...</p> : error && users.length === 0 ? <button className="admin-action admin-action--gold" onClick={() => { setLoading(true); setRevision((value) => value + 1) }}>Retry</button> : filtered.length === 0 ? <p>No users match your search.</p> :
        <ul className="admin-movies__list">{filtered.map((user) => <li className="admin-movies__row" key={user.id}>
          <div className="admin-movies__details"><strong>{user.username}</strong><span>Phone: {user.phone || 'Not provided'}</span><span>Email: {user.email || 'Not provided'}</span><span>Created: {formatScreeningDate(user.createdAt)} · Role: {roleLabels[user.role]}</span></div>
          <div className="admin-movies__actions">
            <button type="button" className="admin-action admin-action--gold" onClick={() => { setSelected(user); setNotice(''); setError(''); setSection('details') }}>Details</button>
            <button type="button" className="admin-action admin-action--gold" onClick={() => { setSelected(user); setNotice(''); setError(''); setSection('edit') }}>Edit</button>
            <button type="button" className="admin-action admin-action--red" onClick={() => deleteUser(user)}>Delete</button>
          </div>
        </li>)}</ul>}
    </section>}
    {section === 'details' && selected && <section className="admin-panel">
      <div className="admin-detail-toolbar"><button type="button" className="admin-action admin-action--gold" onClick={() => setSection('list')}>Back to users</button><div className="admin-detail-toolbar__actions"><button type="button" className="admin-action admin-action--gold" onClick={() => setSection('edit')}>Edit</button><button type="button" className="admin-action admin-action--red" onClick={() => deleteUser(selected)}>Delete</button></div></div>
      <h1>{selected.username}</h1><p><strong>Email:</strong> {selected.email || 'Not provided'}</p><p><strong>Phone:</strong> {selected.phone || 'Not provided'}</p><p><strong>Created:</strong> {formatScreeningDate(selected.createdAt)}</p><p><strong>Role:</strong> {roleLabels[selected.role]}</p>
    </section>}
    {(section === 'add' || section === 'edit') && <UserForm key={section === 'edit' ? selected.id : 'add'} user={section === 'edit' ? selected : null} requestConfirmation={requestConfirmation} onSaved={saved} onDelete={deleteUser} onCancel={() => requestConfirmation({ kind: 'cancel', title: 'Discard your changes?', onConfirm: () => { setError(''); setSection('list') } })} />}
  </>
}


import { useEffect, useState } from 'react'
import api from './api/client'
import './App.css'

const emptyForm = {
  product_name: '',
  description: '',
  price: '',
  quantity: '',
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(sessionStorage.getItem('access_token'))
  )

  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [loginLoading, setLoginLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function getError(err) {
    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'May naganap na error.'
    )
  }

  async function handleLogin(event) {
    event.preventDefault()
    setLoginLoading(true)
    setError('')

    try {
      const response = await api.post('/login', {
        username,
        password,
      })

      const result = response.data
      const token =
        result.access_token ??
        result.token ??
        result.data?.access_token ??
        result.data?.token

      if (!token) {
        setError('Walang access token sa login response.')
        return
      }

      sessionStorage.setItem('access_token', token)
      setPassword('')
      setIsLoggedIn(true)
    } catch (err) {
      setError(getError(err))
    } finally {
      setLoginLoading(false)
    }
  }

  async function fetchProducts() {
    setProductsLoading(true)
    setError('')

    try {
      const token = sessionStorage.getItem('access_token')

      const response = await api.get('/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const list = response.data?.data

      if (!Array.isArray(list)) {
        throw new Error('Hindi tama ang format ng products response.')
      }

      setProducts(list)
    } catch (err) {
      setError(`Hindi makuha ang products: ${getError(err)}`)

      if (err.response?.status === 401) {
        handleLogout()
      }
    } finally {
      setProductsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts()
    }
  }, [isLoggedIn])

  function handleLogout() {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    setIsLoggedIn(false)
    setProducts([])
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
    setError('')
    setMessage('')
  }

  function openAddForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  function openEditForm(product) {
    setForm({
      product_name: product.product_name ?? '',
      description: product.description ?? '',
      price: String(product.price ?? ''),
      quantity: String(product.quantity ?? ''),
    })

    setEditingId(product.id)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      product_name: form.product_name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    }

    if (
      !payload.product_name ||
      payload.product_name.length > 100 ||
      form.price.trim() === '' ||
      !Number.isFinite(payload.price) ||
      payload.price < 0 ||
      form.quantity.trim() === '' ||
      !Number.isInteger(payload.quantity) ||
      payload.quantity < 0
    ) {
      setError(
        'Ilagay ang valid na pangalan, presyo, at whole-number quantity. Hindi puwedeng negative.'
      )
      setSaving(false)
      return
    }

    try {
      const token = sessionStorage.getItem('access_token')
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }

      if (editingId !== null) {
        await api.put(`/products/${editingId}`, payload, config)
        setMessage('Matagumpay na na-update ang product.')
      } else {
        await api.post('/products', payload, config)
        setMessage('Matagumpay na naidagdag ang product.')
      }

      closeForm()
      await fetchProducts()
    } catch (err) {
      setError(`Hindi na-save ang product: ${getError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Sigurado ka bang gusto mong burahin ang "${product.product_name}"?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      const token = sessionStorage.getItem('access_token')

      await api.delete(`/products/${product.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setMessage('Matagumpay na na-delete ang product.')
      await fetchProducts()
    } catch (err) {
      setError(`Hindi na-delete ang product: ${getError(err)}`)
    }
  }

  const filteredProducts = products.filter((product) => {
    const term = search.toLowerCase()

    return (
      String(product.id).includes(term) ||
      (product.product_name ?? '').toLowerCase().includes(term) ||
      (product.description ?? '').toLowerCase().includes(term)
    )
  })

  const totalValue = products.reduce(
    (total, product) =>
      total + Number(product.price || 0) * Number(product.quantity || 0),
    0
  )

  const lowStock = products.filter(
    (product) => Number(product.quantity) <= 5
  ).length

  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="brand-icon">P</div>
          <h1>Product Desk</h1>
          <p className="subtitle">Sign in to manage your products</p>

          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {error && <p className="alert error">{error}</p>}

          <button className="btn primary full-width" disabled={loginLoading}>
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="login-footer">Laboratory Exercise No. 6</p>
        </form>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">P</div>
          <span>Product Desk</span>
          <span className="brand-divider" />
          <span className="topbar-subtitle">Product Management</span>
        </div>

        <button className="btn danger" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <main className="dashboard">
        <section className="page-heading">
          <div>
            <p className="eyebrow">INVENTORY MANAGEMENT</p>
            <h1>Products</h1>
            <p className="subtitle">
              Manage your products in one simple dashboard.
            </p>
          </div>

          <button className="btn primary" onClick={openAddForm}>
            <span className="button-symbol">+</span> Add Product
          </button>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon blue">▦</div>
            <div>
              <p>Total Products</p>
              <h2>{products.length}</h2>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon green">₱</div>
            <div>
              <p>Total Inventory Value</p>
              <h2>
                {totalValue.toLocaleString('en-PH', {
                  style: 'currency',
                  currency: 'PHP',
                })}
              </h2>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon purple">!</div>
            <div>
              <p>Low Stock (5 or less)</p>
              <h2>{lowStock}</h2>
            </div>
          </article>
        </section>

        {error && (
          <div className="alert error" role="alert">
            {error}
            <button
              className="alert-close"
              onClick={() => setError('')}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="alert success" role="status">
            {message}
            <button
              className="alert-close"
              onClick={() => setMessage('')}
              aria-label="Close message"
            >
              ×
            </button>
          </div>
        )}

        <section className="table-card">
          <div className="table-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
              />
            </div>

            <button
              className="btn secondary"
              onClick={fetchProducts}
              disabled={productsLoading}
            >
              ↻ {productsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {!productsLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      {search
                        ? 'Walang product na tumugma sa search.'
                        : 'Wala pang products. Pindutin ang Add Product.'}
                    </td>
                  </tr>
                )}

                {filteredProducts.map((product) => {
                  const quantity = Number(product.quantity)

                  return (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td className="product-name">
                        {product.product_name}
                      </td>
                      <td className="description-cell">
                        {product.description || '—'}
                      </td>
                      <td className="price-cell">
                        {Number(product.price).toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                      <td>{quantity}</td>
                      <td>
                        <span
                          className={`stock-badge ${
                            quantity <= 5 ? 'low-stock' : 'in-stock'
                          }`}
                        >
                          {quantity <= 5 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn small primary"
                            onClick={() => openEditForm(product)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn small danger"
                            onClick={() => handleDelete(product)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </section>

        <footer className="dashboard-footer">
          Laboratory Exercise No. 6 <span>•</span> Product Desk
        </footer>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {editingId !== null ? 'UPDATE INVENTORY' : 'NEW INVENTORY'}
                </p>
                <h2 id="product-modal-title">
                  {editingId !== null ? 'Edit Product' : 'Add Product'}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={closeForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <label htmlFor="product_name">Product Name *</label>
              <input
                id="product_name"
                name="product_name"
                value={form.product_name}
                onChange={handleFormChange}
                maxLength={100}
                placeholder="Enter product name"
                required
              />

              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Enter product description"
                rows={3}
              />

              <div className="form-row">
                <div>
                  <label htmlFor="price">Price (₱) *</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="quantity">Quantity *</label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantity}
                    onChange={handleFormChange}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Update Product'
                      : 'Save Product'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App

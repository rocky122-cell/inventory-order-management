import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const emptyProduct = {
  name: "",
  sku: "",
  description: "",
  price: "",
  stock: "",
};

const emptyCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [orderForm, setOrderForm] = useState({ customer_id: "", product_id: "", quantity: 1 });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stock <= 5),
    [products],
  );
  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [orders],
  );
  const inventoryUnits = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.stock || 0), 0),
    [products],
  );
  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);
  const topStockProducts = useMemo(
    () => [...products].sort((a, b) => Number(b.stock) - Number(a.stock)).slice(0, 6),
    [products],
  );
  const highestStock = useMemo(
    () => Math.max(1, ...topStockProducts.map((product) => Number(product.stock || 0))),
    [topStockProducts],
  );
  const maxOrderTotal = useMemo(
    () => Math.max(1, ...recentOrders.map((order) => Number(order.total_amount || 0))),
    [recentOrders],
  );
  const activityItems = useMemo(
    () => [
      ...orders.slice(0, 2).map((order) => ({
        title: `Order #${order.id} placed`,
        detail: `${order.customer.name} - Rs. ${order.total_amount}`,
      })),
      ...products.slice(0, 2).map((product) => ({
        title: `${product.name} in inventory`,
        detail: `${product.stock} units available`,
      })),
    ],
    [orders, products],
  );

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      if (Array.isArray(error.detail)) {
        const validationMessage = error.detail
          .map((item) => {
            const field = item.loc?.slice(1).join(".");
            return field ? `${field}: ${item.msg}` : item.msg;
          })
          .join("; ");
        throw new Error(validationMessage || "Validation error");
      }
      throw new Error(error.detail);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async function loadData() {
    setLoading(true);
    try {
      const [productData, customerData, orderData] = await Promise.all([
        request("/products"),
        request("/customers"),
        request("/orders"),
      ]);
      setProducts(productData);
      setCustomers(customerData);
      setOrders(orderData);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createProduct(event) {
    event.preventDefault();
    try {
      await request("/products", {
        method: "POST",
        body: JSON.stringify({
          ...productForm,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
        }),
      });
      setProductForm(emptyProduct);
      setMessage("Product created successfully.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createCustomer(event) {
    event.preventDefault();
    try {
      await request("/customers", {
        method: "POST",
        body: JSON.stringify(customerForm),
      });
      setCustomerForm(emptyCustomer);
      setMessage("Customer created successfully.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createOrder(event) {
    event.preventDefault();
    try {
      await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_id: Number(orderForm.customer_id),
          items: [
            {
              product_id: Number(orderForm.product_id),
              quantity: Number(orderForm.quantity),
            },
          ],
        }),
      });
      setOrderForm({ customer_id: "", product_id: "", quantity: 1 });
      setMessage("Order placed and stock updated.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteProduct(productId) {
    try {
      await request(`/products/${productId}`, { method: "DELETE" });
      setMessage("Product deleted.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteCustomer(customerId) {
    try {
      await request(`/customers/${customerId}`, { method: "DELETE" });
      setMessage("Customer deleted.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteOrder(orderId) {
    try {
      await request(`/orders/${orderId}`, { method: "DELETE" });
      setMessage("Order deleted.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Inventory API Client</p>
          <h1>Inventory & Order Management</h1>
        </div>
        <div className="topbar-actions">
          <span className="status-pill">Live API</span>
          <button className="icon-button" onClick={loadData} title="Refresh data" type="button">
            Refresh
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="sidebar">
          <div className="sidebar-title">
            <span>Menu</span>
            <strong>Admin Panel</strong>
          </div>
          <nav className="tabs" aria-label="Management sections">
            {["dashboard", "products", "customers", "orders"].map((tab) => (
              <button
                className={activeTab === tab ? "tab active" : "tab"}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section className="content-area">
          <section className="metric-grid">
            <Metric label="Products" value={products.length} tone="green" />
            <Metric label="Customers" value={customers.length} tone="blue" />
            <Metric label="Orders" value={orders.length} tone="gold" />
            <Metric label="Low Stock" value={lowStockProducts.length} tone="red" />
          </section>

          {message && <div className="notice">{message}</div>}
          {loading && <div className="notice muted">Loading latest data...</div>}

          {activeTab === "dashboard" && (
            <section className="dashboard-grid">
          <section className="quick-actions">
            <button onClick={() => setActiveTab("products")} type="button">Add Product</button>
            <button onClick={() => setActiveTab("customers")} type="button">Add Customer</button>
            <button onClick={() => setActiveTab("orders")} type="button">Place Order</button>
          </section>

          <DataPanel title="Business Dashboard">
            <div className="summary-grid">
              <article className="summary-card">
                <span>Total Revenue</span>
                <strong>Rs. {totalRevenue.toFixed(2)}</strong>
              </article>
              <article className="summary-card">
                <span>Inventory Units</span>
                <strong>{inventoryUnits}</strong>
              </article>
              <article className="summary-card">
                <span>Average Order</span>
                <strong>Rs. {orders.length ? (totalRevenue / orders.length).toFixed(2) : "0.00"}</strong>
              </article>
            </div>
          </DataPanel>

          <DataPanel title="Revenue by Recent Orders">
            <div className="chart-panel">
              {recentOrders.length === 0 && <p className="empty-text">Create orders to show revenue bars.</p>}
              {recentOrders.map((order) => {
                const percent = Math.max(4, (Number(order.total_amount || 0) / maxOrderTotal) * 100);
                return (
                  <article className="bar-row" key={order.id}>
                    <span>#{order.id}</span>
                    <div className="bar-track">
                      <div className="bar-fill revenue" style={{ width: `${percent}%` }} />
                    </div>
                    <strong>Rs. {order.total_amount}</strong>
                  </article>
                );
              })}
            </div>
          </DataPanel>

          <DataPanel title="Inventory Stock Levels">
            <div className="chart-panel">
              {topStockProducts.length === 0 && <p className="empty-text">Create products to show stock levels.</p>}
              {topStockProducts.map((product) => {
                const percent = Math.max(4, (Number(product.stock || 0) / highestStock) * 100);
                return (
                  <article className="bar-row" key={product.id}>
                    <span>{product.sku}</span>
                    <div className="bar-track">
                      <div className="bar-fill stock" style={{ width: `${percent}%` }} />
                    </div>
                    <strong>{product.stock}</strong>
                  </article>
                );
              })}
            </div>
          </DataPanel>

          <DataPanel title="Low Stock Products">
            <div className="compact-list">
              {lowStockProducts.length === 0 && <p className="empty-text">No low-stock products.</p>}
              {lowStockProducts.map((product) => (
                <article className="compact-row" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.sku}</span>
                  </div>
                  <b>{product.stock}</b>
                </article>
              ))}
            </div>
          </DataPanel>

          <DataPanel title="Recent Orders">
            <div className="order-list">
              {recentOrders.length === 0 && <p className="empty-text">No orders yet.</p>}
              {recentOrders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div>
                    <strong>Order #{order.id}</strong>
                    <span>{order.customer.name}</span>
                  </div>
                  <div>
                    <strong>Rs. {order.total_amount}</strong>
                    <span>{order.status}</span>
                  </div>
                </article>
              ))}
            </div>
          </DataPanel>

          <DataPanel title="Activity Feed">
            <div className="activity-list">
              {activityItems.length === 0 && <p className="empty-text">Activity will appear after you add records.</p>}
              {activityItems.map((item) => (
                <article className="activity-item" key={`${item.title}-${item.detail}`}>
                  <span />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </DataPanel>
            </section>
          )}

          {activeTab === "products" && (
            <TwoColumn>
          <FormPanel title="Add Product" onSubmit={createProduct}>
            <Input label="Name" minLength="2" value={productForm.name} onChange={(name) => setProductForm({ ...productForm, name })} />
            <Input label="SKU" minLength="2" value={productForm.sku} onChange={(sku) => setProductForm({ ...productForm, sku })} />
            <Input label="Description" value={productForm.description} onChange={(description) => setProductForm({ ...productForm, description })} />
            <Input label="Price" type="number" value={productForm.price} onChange={(price) => setProductForm({ ...productForm, price })} />
            <Input label="Stock" type="number" value={productForm.stock} onChange={(stock) => setProductForm({ ...productForm, stock })} />
            <button className="primary-button" type="submit">Create Product</button>
          </FormPanel>

          <DataPanel title="Products">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>₹{product.price}</td>
                    <td className={product.stock <= 5 ? "danger-text" : ""}>{product.stock}</td>
                    <td>
                      <button className="ghost-button" onClick={() => deleteProduct(product.id)} type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <p className="empty-text table-empty">No products yet. Add your first product to begin tracking stock.</p>}
          </DataPanel>
            </TwoColumn>
          )}

          {activeTab === "customers" && (
            <TwoColumn>
          <FormPanel title="Add Customer" onSubmit={createCustomer}>
            <Input label="Name" minLength="2" value={customerForm.name} onChange={(name) => setCustomerForm({ ...customerForm, name })} />
            <Input label="Email" type="email" value={customerForm.email} onChange={(email) => setCustomerForm({ ...customerForm, email })} />
            <Input label="Phone" value={customerForm.phone} onChange={(phone) => setCustomerForm({ ...customerForm, phone })} />
            <Input label="Address" value={customerForm.address} onChange={(address) => setCustomerForm({ ...customerForm, address })} />
            <button className="primary-button" type="submit">Create Customer</button>
          </FormPanel>

          <DataPanel title="Customers">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone || "-"}</td>
                    <td>
                      <button className="ghost-button" onClick={() => deleteCustomer(customer.id)} type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && <p className="empty-text table-empty">No customers yet. Create a customer before placing orders.</p>}
          </DataPanel>
            </TwoColumn>
          )}

          {activeTab === "orders" && (
            <TwoColumn>
          <FormPanel title="Place Order" onSubmit={createOrder}>
            <label>
              Customer
              <select
                required
                value={orderForm.customer_id}
                onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </label>
            <label>
              Product
              <select
                required
                value={orderForm.product_id}
                onChange={(event) => setOrderForm({ ...orderForm, product_id: event.target.value })}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - stock {product.stock}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Quantity"
              min="1"
              type="number"
              value={orderForm.quantity}
              onChange={(quantity) => setOrderForm({ ...orderForm, quantity })}
            />
            <button className="primary-button" type="submit">Place Order</button>
          </FormPanel>

          <DataPanel title="Orders">
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div>
                    <strong>Order #{order.id}</strong>
                    <span>{order.customer.name}</span>
                  </div>
                  <div>
                    <strong>₹{order.total_amount}</strong>
                    <span>{order.status}</span>
                  </div>
                  <ul>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.product.name} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                  <button className="ghost-button" onClick={() => deleteOrder(order.id)} type="button">
                    Delete Order
                  </button>
                </article>
              ))}
            </div>
          </DataPanel>
            </TwoColumn>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, tone }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TwoColumn({ children }) {
  return <section className="two-column">{children}</section>;
}

function FormPanel({ children, onSubmit, title }) {
  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <h2>{title}</h2>
      {children}
    </form>
  );
}

function DataPanel({ children, title }) {
  return (
    <section className="panel data-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, onChange, type = "text", value, ...props }) {
  return (
    <label>
      {label}
      <input
        required={["Name", "SKU", "Price", "Stock", "Email", "Quantity"].includes(label)}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}

export default App;

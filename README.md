# Inventory & Order Management Backend

A FastAPI backend API for managing products, customers, orders, and inventory tracking.
It also includes a React frontend for managing the system from a browser.

## Features

- Product CRUD with unique SKU validation
- Customer CRUD with unique email validation
- Order creation with automatic stock reduction
- Inventory validation to prevent orders with insufficient stock
- PostgreSQL database support
- Docker and Docker Compose setup
- Environment variable based configuration

## Tech Stack

- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic Settings
- Docker
- React
- Vite

## Project Structure

```text
inventory-order-backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    routers/
      customers.py
      orders.py
      products.py
  frontend/
    src/
      App.jsx
      main.jsx
      styles.css
  .env.example
  docker-compose.yml
  Dockerfile
  requirements.txt
```

## Run With Docker Compose

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Start the API and PostgreSQL:

```bash
docker compose up --build
```

3. Open the API docs:

```text
http://localhost:8000/docs
```

4. Open the React frontend:

```text
http://localhost:3000
```

## Run Locally

1. Create and activate a virtual environment.

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set `DATABASE_URL` in your environment or use `.env`.

4. Run the server:

```bash
uvicorn app.main:app --reload
```

## API Endpoints

### Products

- `POST /products` - Create product
- `GET /products` - List products
- `GET /products/{product_id}` - Get product
- `PUT /products/{product_id}` - Update product
- `DELETE /products/{product_id}` - Delete product

### Customers

- `POST /customers` - Create customer
- `GET /customers` - List customers
- `GET /customers/{customer_id}` - Get customer
- `PUT /customers/{customer_id}` - Update customer
- `DELETE /customers/{customer_id}` - Delete customer

### Orders

- `POST /orders` - Create order and reduce stock
- `GET /orders` - List orders
- `GET /orders/{order_id}` - Get order details

## Example Order Request

```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ]
}
```

If any product does not have enough stock, the order is rejected and no stock is reduced.

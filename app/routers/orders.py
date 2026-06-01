from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=schemas.OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)) -> models.Order:
    customer = db.get(models.Customer, order_data.customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    requested_quantities: dict[int, int] = {}
    for item in order_data.items:
        requested_quantities[item.product_id] = requested_quantities.get(item.product_id, 0) + item.quantity

    products = (
        db.query(models.Product)
        .filter(models.Product.id.in_(requested_quantities.keys()))
        .with_for_update()
        .all()
    )
    products_by_id = {product.id: product for product in products}

    missing_ids = sorted(set(requested_quantities) - set(products_by_id))
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Products not found: {missing_ids}")

    for product_id, quantity in requested_quantities.items():
        product = products_by_id[product_id]
        if product.stock < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for SKU {product.sku}. Available: {product.stock}, requested: {quantity}",
            )

    total_amount = Decimal("0.00")
    order = models.Order(customer_id=customer.id, total_amount=total_amount, status="placed")
    db.add(order)
    db.flush()

    for product_id, quantity in requested_quantities.items():
        product = products_by_id[product_id]
        line_total = product.price * quantity
        total_amount += line_total
        product.stock -= quantity
        db.add(
            models.OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
                line_total=line_total,
            )
        )

    order.total_amount = total_amount
    db.commit()

    created_order = _query_order(db, order.id)
    if created_order is None:
        raise HTTPException(status_code=500, detail="Order created but could not be loaded")
    return created_order


@router.get("", response_model=list[schemas.OrderRead])
def list_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)) -> list[models.Order]:
    return (
        db.query(models.Order)
        .options(
            joinedload(models.Order.customer),
            joinedload(models.Order.items).joinedload(models.OrderItem.product),
        )
        .order_by(models.Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{order_id}", response_model=schemas.OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)) -> models.Order:
    order = _query_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> None:
    order = db.get(models.Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()


def _query_order(db: Session, order_id: int) -> models.Order | None:
    return (
        db.query(models.Order)
        .options(
            joinedload(models.Order.customer),
            joinedload(models.Order.items).joinedload(models.OrderItem.product),
        )
        .filter(models.Order.id == order_id)
        .first()
    )

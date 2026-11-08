import logging
import secrets
from decimal import Decimal

import logging
import secrets
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F, Prefetch
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Product

from .models import Cart, CartItem, Order, OrderItem

logger = logging.getLogger(__name__)

class InvalidTransition(Exception):
    pass

S=Order.Status

ALLOWED={
    S.PENDING_PAYMENT: {S.CANCELLED},
    S.PAYMENT_SUBMITTED: {S.CONFIRMED, S.PENDING_PAYMENT, S.CANCELLED},  # PENDING_PAYMENT = payment rejected
    S.CONFIRMED: {S.SHIPPED, S.CANCELLED},
    S.SHIPPED: {S.DELIVERED},
    S.DELIVERED: set(),
    S.CANCELLED: set(),
}

def _stock_message(stock):
    return "This item is sold out." if stock == 0 else f"Only {stock} available."

def get_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    items = CartItem.objects.select_related("product__category__parent").prefetch_related("product__images")
    return Cart.objects.prefetch_related(Prefetch("items", queryset=items)).get(pk=cart.pk)

def add_to_cart(user, product, quantity):
    cart, _ = Cart.objects.get_or_create(user=user)
    current = (
        CartItem.objects.filter(cart=cart, product=product)
        .values_list("quantity", flat=True)
        .first()
        or 0
    )
    new_quantity = current + quantity
    if new_quantity > product.stock:
        raise ValidationError({"quantity": _stock_message(product.stock)})
    CartItem.objects.update_or_create(cart=cart, product=product, defaults={"quantity": new_quantity})


def set_quantity(item, quantity):
    if quantity > item.product.stock:
        raise ValidationError({"quantity": _stock_message(item.product.stock)})
    item.quantity=quantity
    item.save(update_fields=["quantity"])

def generate_order_number():
    prefix = timezone.localdate().strftime("PT%y%m%d")
    while True:
        number = f"{prefix}-{secrets.token_hex(3).upper()}"
        if not Order.objects.filter(order_number=number).exists():
            return number

@transaction.atomic
def create_order(user, shipping, cart_item_ids=None):
    cart, _ = Cart.objects.get_or_create(user=user)
    qs= CartItem.objects.filter(cart=cart)
    if cart_item_ids is not None:
        qs=qs.filter(pk__in=cart_item_ids)
    items= list(qs.select_related("product"))

    if not items:
        raise ValidationError({"cart_item_ids": "There is nothing to check out."})
    if cart_item_ids and len(items) != len(set(cart_item_ids)):
        raise ValidationError({"cart_item_ids": "Some selected items are not in your cart."})

    # Lock the product rows (in a fixed order, to avoid deadlocks) so two buyers can't take the same last item
    locked = {
        p.pk: p
        for p in Product.objects.select_for_update(of=("self",))
        .filter(pk__in=[i.product_id for i in items], is_active=True, category__is_active=True)
        .order_by("pk")
    }

    problems, lines = [], []
    for item in items:
        product = locked.get(item.product_id)
        if product is None:
            problems.append(f"{item.product.name} is no longer available.")
        elif item.quantity > product.stock:
            problems.append(f"{product.name}: {_stock_message(product.stock)}")
        else:
            lines.append((item, product))
    if problems:
        raise ValidationError({"items": problems})

    subtotal = sum((p.price * i.quantity for i, p in lines), Decimal("0"))
    delivery_fee = Decimal(settings.DELIVERY_FEE)
    order = Order.objects.create(
        user=user,
        order_number=generate_order_number(),
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=subtotal + delivery_fee,
        **shipping,
    )
    OrderItem.objects.bulk_create(
        [
            OrderItem(order=order, product=p, product_name=p.name, unit_price=p.price, quantity=i.quantity)
            for i, p in lines
        ]
    )
    for item, product in lines:
        product.stock -= item.quantity
        product.save(update_fields=["stock", "updated_at"])
    CartItem.objects.filter(pk__in=[i.pk for i, _ in lines]).delete()

    transaction.on_commit(lambda: notify_order_placed(order), robust=True)
    return order


# ---------- order lifecycle ----------

def _restore_stock(order):
    for item in order.items.all():
        if item.product_id:
            Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)


def change_status(order, new_status, note=None):
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if new_status not in ALLOWED[order.status]:
            raise InvalidTransition(
                f"Cannot change an order from '{order.get_status_display()}' to '{Order.Status(new_status).label}'."
            )
        if new_status == Order.Status.CANCELLED:
            _restore_stock(order)
        order.status = new_status
        fields = ["status", "updated_at"]
        if note is not None:
            order.payment_note = note
            fields.append("payment_note")
        order.save(update_fields=fields)
        transaction.on_commit(lambda: notify_status_change(order), robust=True)
    return order


def submit_payment_proof(order, screenshot):
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status not in (Order.Status.PENDING_PAYMENT, Order.Status.PAYMENT_SUBMITTED):
            raise InvalidTransition("Payment can no longer be submitted for this order.")
        order.payment_screenshot = screenshot
        order.payment_submitted_at = timezone.now()
        order.payment_note = ""
        order.status = Order.Status.PAYMENT_SUBMITTED
        order.save(update_fields=["payment_screenshot", "payment_submitted_at", "payment_note", "status", "updated_at"])
        transaction.on_commit(lambda: notify_payment_submitted(order), robust=True)
    return order


# ---------- emails ----------

def _send(subject, body, recipients):
    recipients = [r for r in recipients if r]
    if recipients:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients)


def _summary(order):
    lines = [f"- {i.product_name} x {i.quantity}: Rs {i.line_total}" for i in order.items.all()]
    lines += [f"Delivery: Rs {order.delivery_fee}", f"Total: Rs {order.total}"]
    return "\n".join(lines)


def _order_link(order):
    return f"{settings.FRONTEND_URL}/orders/{order.order_number}"


def notify_order_placed(order):
    _send(
        f"Order {order.order_number} received",
        f"Hi {order.full_name},\n\nThanks for your order!\n\n{_summary(order)}\n\n"
        f"To complete it, please pay and upload a screenshot of your payment here:\n{_order_link(order)}\n"
        "We will confirm it as soon as we verify the payment.",
        [order.user.email],
    )
    _send(
        f"New order {order.order_number}",
        f"{order.full_name} ({order.phone}, {order.user.email})\n"
        f"{order.address_line}, {order.city}\n{order.landmark}\n\n{_summary(order)}\n\nNotes: {order.notes or '-'}",
        [getattr(settings, "OWNER_EMAIL", "")],
    )


def notify_payment_submitted(order):
    _send(
        f"Payment screenshot received for {order.order_number}",
        f"{order.full_name} uploaded a payment screenshot.\nTotal: Rs {order.total}\nReview it in the admin.",
        [getattr(settings, "OWNER_EMAIL", "")],
    )


def notify_status_change(order):
    body = f"Hi {order.full_name},\n\nYour order {order.order_number} is now: {order.get_status_display()}."
    if order.payment_note:
        body += f"\n\nNote from the shop: {order.payment_note}"
    body += f"\n\nDetails: {_order_link(order)}"
    _send(f"Order {order.order_number}: {order.get_status_display()}", body, [order.user.email])







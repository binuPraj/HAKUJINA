import io
from decimal import Decimal

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product
from apps.orders import services
from apps.orders.models import CartItem, Order
from apps.users.models import User

pytestmark = pytest.mark.django_db

CART = "/api/v1/cart/"
CART_ITEMS = "/api/v1/cart/items/"
ORDERS = "/api/v1/orders/"
ADDRESS = {"full_name": "Binu", "phone": "+9779800000000", "city": "Kathmandu", "address_line": "Baneshwor"}


@pytest.fixture(autouse=True)
def isolated_settings(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.DELIVERY_FEE = Decimal("100")
    settings.OWNER_EMAIL = "owner@example.com"


@pytest.fixture
def category():
    return Category.objects.create(name="Pots")


@pytest.fixture
def vase(category):
    return Product.objects.create(category=category, name="Vase", price=Decimal("500"), stock=3)


@pytest.fixture
def mug(category):
    return Product.objects.create(category=category, name="Mug", price=Decimal("200"), stock=1)


def make_client(email="shopper@example.com", verified=True):
    user = User.objects.create_user(email, "StrongPass123!", name="Shopper", is_email_verified=verified)
    client = APIClient()
    client.force_authenticate(user)
    return user, client


@pytest.fixture
def shopper():
    return make_client()


def add(client, product, qty=1):
    return client.post(CART_ITEMS, {"product_id": product.pk, "quantity": qty}, format="json")


def checkout(client, **extra):
    return client.post(ORDERS, {**ADDRESS, **extra}, format="json")


def png_file(name="proof.png"):
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), "white").save(buf, "PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


def upload_proof(client, number, file=None):
    return client.post(f"{ORDERS}{number}/payment-proof/", {"screenshot": file or png_file()}, format="multipart")


# ---------- cart ----------

def test_cart_requires_login():
    assert APIClient().get(CART).status_code == 401


def test_add_to_cart_and_totals(shopper, vase):
    _, client = shopper
    r = add(client, vase, 2)
    assert r.status_code == 201
    assert r.data["item_count"] == 2
    assert Decimal(r.data["subtotal"]) == Decimal("1000")


def test_adding_same_product_increases_quantity(shopper, vase):
    _, client = shopper
    add(client, vase)
    r = add(client, vase)
    assert len(r.data["items"]) == 1
    assert r.data["items"][0]["quantity"] == 2


def test_cannot_exceed_stock(shopper, mug):
    _, client = shopper
    assert add(client, mug, 2).status_code == 400
    assert CartItem.objects.count() == 0


def test_cannot_add_inactive_product(shopper, vase):
    _, client = shopper
    Product.objects.filter(pk=vase.pk).update(is_active=False)
    assert add(client, vase).status_code == 400


def test_update_and_remove_cart_item(shopper, vase):
    _, client = shopper
    add(client, vase)
    item = CartItem.objects.get()
    r = client.patch(f"{CART_ITEMS}{item.pk}/", {"quantity": 3}, format="json")
    assert r.status_code == 200 and r.data["items"][0]["quantity"] == 3
    assert client.patch(f"{CART_ITEMS}{item.pk}/", {"quantity": 4}, format="json").status_code == 400
    r = client.delete(f"{CART_ITEMS}{item.pk}/")
    assert r.status_code == 200 and r.data["items"] == []


def test_cannot_touch_another_users_cart_item(shopper, vase):
    _, client = shopper
    add(client, vase)
    item = CartItem.objects.get()
    _, other = make_client("other@example.com")
    assert other.delete(f"{CART_ITEMS}{item.pk}/").status_code == 404


# ---------- checkout ----------

def test_checkout_all_items(shopper, vase, mug):
    _, client = shopper
    add(client, vase, 2)
    add(client, mug, 1)
    r = checkout(client)
    assert r.status_code == 201
    assert r.data["status"] == "pending_payment"
    assert r.data["order_number"].startswith("PT")
    assert Decimal(r.data["subtotal"]) == Decimal("1200")
    assert Decimal(r.data["total"]) == Decimal("1300")
    assert len(r.data["items"]) == 2
    vase.refresh_from_db()
    mug.refresh_from_db()
    assert (vase.stock, mug.stock) == (1, 0)
    assert CartItem.objects.count() == 0


def test_checkout_selected_items_only(shopper, vase, mug):
    _, client = shopper
    add(client, vase)
    add(client, mug)
    vase_item = CartItem.objects.get(product=vase)
    r = checkout(client, cart_item_ids=[vase_item.pk])
    assert r.status_code == 201
    assert [i["product_name"] for i in r.data["items"]] == ["Vase"]
    assert list(CartItem.objects.values_list("product__name", flat=True)) == ["Mug"]
    mug.refresh_from_db()
    assert mug.stock == 1


def test_cannot_checkout_someone_elses_cart_items(shopper, vase):
    _, client = shopper
    _, other = make_client("other@example.com")
    add(other, vase)
    foreign = CartItem.objects.get()
    add(client, vase)
    assert checkout(client, cart_item_ids=[foreign.pk]).status_code == 400
    assert Order.objects.count() == 0


def test_unverified_user_can_use_cart_but_not_checkout(vase):
    _, client = make_client("new@example.com", verified=False)
    assert add(client, vase).status_code == 201
    assert checkout(client).status_code == 403


def test_empty_cart_cannot_checkout(shopper):
    _, client = shopper
    assert checkout(client).status_code == 400


def test_invalid_phone_rejected(shopper, vase):
    _, client = shopper
    add(client, vase)
    assert checkout(client, phone="abc").status_code == 400


def test_checkout_fails_cleanly_when_stock_dropped(shopper, vase):
    _, client = shopper
    add(client, vase, 3)
    Product.objects.filter(pk=vase.pk).update(stock=1)
    r = checkout(client)
    assert r.status_code == 400
    assert Order.objects.count() == 0
    vase.refresh_from_db()
    assert vase.stock == 1
    assert CartItem.objects.count() == 1


def test_order_keeps_price_snapshot(shopper, vase):
    _, client = shopper
    add(client, vase)
    number = checkout(client).data["order_number"]
    Product.objects.filter(pk=vase.pk).update(price=Decimal("999"))
    r = client.get(f"{ORDERS}{number}/")
    assert Decimal(r.data["items"][0]["unit_price"]) == Decimal("500")


def test_order_placed_emails(shopper, vase, django_capture_on_commit_callbacks):
    _, client = shopper
    add(client, vase)
    with django_capture_on_commit_callbacks(execute=True):
        r = checkout(client)
    assert r.status_code == 201
    assert sorted(m.to[0] for m in mail.outbox) == ["owner@example.com", "shopper@example.com"]


# ---------- order access ----------

def test_users_only_see_their_own_orders(shopper, vase):
    _, client = shopper
    add(client, vase)
    number = checkout(client).data["order_number"]
    _, other = make_client("other@example.com")
    assert other.get(f"{ORDERS}{number}/").status_code == 404
    assert other.get(ORDERS).data["results"] == []
    assert len(client.get(ORDERS).data["results"]) == 1


# ---------- payment and lifecycle ----------

def test_payment_proof_upload(shopper, vase, django_capture_on_commit_callbacks):
    _, client = shopper
    add(client, vase)
    number = checkout(client).data["order_number"]
    with django_capture_on_commit_callbacks(execute=True):
        r = upload_proof(client, number)
    assert r.status_code == 200
    assert r.data["status"] == "payment_submitted"
    assert r.data["payment_screenshot"]
    assert any(m.to == ["owner@example.com"] for m in mail.outbox)


def test_payment_proof_must_be_an_image(shopper, vase):
    _, client = shopper
    add(client, vase)
    number = checkout(client).data["order_number"]
    bad = SimpleUploadedFile("x.txt", b"hello", content_type="text/plain")
    assert upload_proof(client, number, bad).status_code == 400


def test_customer_cancel_restores_stock(shopper, vase):
    _, client = shopper
    add(client, vase, 2)
    number = checkout(client).data["order_number"]
    vase.refresh_from_db()
    assert vase.stock == 1
    r = client.post(f"{ORDERS}{number}/cancel/")
    assert r.status_code == 200 and r.data["status"] == "cancelled"
    vase.refresh_from_db()
    assert vase.stock == 3


def test_cannot_cancel_online_after_payment_submitted(shopper, vase):
    _, client = shopper
    add(client, vase)
    number = checkout(client).data["order_number"]
    upload_proof(client, number)
    assert client.post(f"{ORDERS}{number}/cancel/").status_code == 400


def test_status_transitions(shopper, vase):
    _, client = shopper
    add(client, vase)
    order = Order.objects.get(order_number=checkout(client).data["order_number"])
    with pytest.raises(services.InvalidTransition):
        services.change_status(order, Order.Status.SHIPPED)
    upload_proof(client, order.order_number)
    order = services.change_status(order, Order.Status.CONFIRMED)
    order = services.change_status(order, Order.Status.SHIPPED)
    order = services.change_status(order, Order.Status.DELIVERED)
    with pytest.raises(services.InvalidTransition):
        services.change_status(order, Order.Status.CANCELLED)


def test_rejected_payment_returns_to_pending_with_note(shopper, vase):
    _, client = shopper
    add(client, vase)
    number = checkout(client).data["order_number"]
    upload_proof(client, number)
    order = Order.objects.get(order_number=number)
    services.change_status(order, Order.Status.PENDING_PAYMENT, note="Amount did not match.")
    r = client.get(f"{ORDERS}{number}/")
    assert r.data["status"] == "pending_payment"
    assert r.data["payment_note"] == "Amount did not match."
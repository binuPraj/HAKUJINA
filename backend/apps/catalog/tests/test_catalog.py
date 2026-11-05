import pytest
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db
PRODUCTS = "/api/v1/products/"
CATEGORIES = "/api/v1/categories/"


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def tree():
    pots = Category.objects.create(name="Pots")
    planters = Category.objects.create(name="Planters", parent=pots)
    mugs = Category.objects.create(name="Mugs")
    return pots, planters, mugs


def make(category, name, price=500, stock=1, **kw):
    return Product.objects.create(category=category, name=name, price=price, stock=stock, **kw)


def names(response):
    return {p["name"] for p in response.data["results"]}


def test_list_is_paginated_and_hides_inactive(client, tree):
    pots, _, _ = tree
    make(pots, "Visible")
    make(pots, "Hidden", is_active=False)
    r = client.get(PRODUCTS)
    assert r.status_code == 200
    assert names(r) == {"Visible"}


def test_parent_category_includes_subcategory_products(client, tree):
    pots, planters, mugs = tree
    make(pots, "Pot")
    make(planters, "Planter")
    make(mugs, "Mug")
    assert names(client.get(PRODUCTS, {"category": "pots"})) == {"Pot", "Planter"}
    assert names(client.get(PRODUCTS, {"category": "planters"})) == {"Planter"}


def test_price_range_filter(client, tree):
    pots, _, _ = tree
    make(pots, "Cheap", price=100)
    make(pots, "Mid", price=500)
    make(pots, "Pricey", price=2000)
    r = client.get(PRODUCTS, {"min_price": 200, "max_price": 1000})
    assert names(r) == {"Mid"}


def test_in_stock_filter(client, tree):
    pots, _, _ = tree
    make(pots, "Available", stock=2)
    make(pots, "Sold out", stock=0)
    assert names(client.get(PRODUCTS, {"in_stock": "true"})) == {"Available"}
    assert names(client.get(PRODUCTS, {"in_stock": "false"})) == {"Sold out"}


def test_search_by_name(client, tree):
    pots, _, _ = tree
    make(pots, "Blue vase")
    make(pots, "Red bowl")
    assert names(client.get(PRODUCTS, {"search": "blue"})) == {"Blue vase"}


def test_ordering_by_price(client, tree):
    pots, _, _ = tree
    make(pots, "B", price=900)
    make(pots, "A", price=100)
    r = client.get(PRODUCTS, {"ordering": "price"})
    assert [p["name"] for p in r.data["results"]] == ["A", "B"]


def test_detail_by_slug(client, tree):
    pots, _, _ = tree
    make(pots, "Blue vase", description="Hand glazed")
    r = client.get(f"{PRODUCTS}blue-vase/")
    assert r.status_code == 200
    assert r.data["description"] == "Hand glazed"
    assert r.data["in_stock"] is True
    assert r.data["category"]["slug"] == "pots"


def test_inactive_product_detail_is_404(client, tree):
    pots, _, _ = tree
    make(pots, "Hidden", is_active=False)
    assert client.get(f"{PRODUCTS}hidden/").status_code == 404


def test_categories_are_nested(client, tree):
    r = client.get(CATEGORIES)
    assert r.status_code == 200
    by_slug = {c["slug"]: c for c in r.data}
    assert set(by_slug) == {"pots", "mugs"}
    assert [c["slug"] for c in by_slug["pots"]["children"]] == ["planters"]


def test_duplicate_names_get_unique_slugs(tree):
    pots, _, _ = tree
    a = make(pots, "Vase")
    b = make(pots, "Vase")
    assert a.slug == "vase"
    assert b.slug == "vase-2"


def test_only_one_level_of_subcategories(tree):
    _, planters, _ = tree
    with pytest.raises(ValidationError):
        Category(name="Too deep", parent=planters).full_clean()
from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CartItemCreateView, CartItemDetailView, CartView, OrderViewSet

router = SimpleRouter()
router.register("orders", OrderViewSet, basename="order")

urlpatterns = [
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/", CartItemCreateView.as_view(), name="cart-item-add"),
    path("cart/items/<int:pk>/", CartItemDetailView.as_view(), name="cart-item"),
    *router.urls,
]
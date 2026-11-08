from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.users.permissions import IsEmailVerified

from . import services
from .models import CartItem, Order
from .serializers import (
    AddToCartSerializer, CartItemQuantitySerializer, CartSerializer,
    OrderCreateSerializer, OrderSerializer, PaymentProofSerializer,
)


def cart_response(request, http_status=status.HTTP_200_OK):
    data = CartSerializer(services.get_cart(request.user), context={"request": request}).data
    return Response(data, status=http_status)


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=CartSerializer)
    def get(self, request):
        return cart_response(request)

    @extend_schema(responses=CartSerializer)
    def delete(self, request):
        CartItem.objects.filter(cart__user=request.user).delete()
        return cart_response(request)


class CartItemCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=AddToCartSerializer, responses={201: CartSerializer})
    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_to_cart(request.user, serializer.validated_data["product"], serializer.validated_data["quantity"])
        return cart_response(request, status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_item(self, request, pk):
        return get_object_or_404(CartItem.objects.select_related("product"), pk=pk, cart__user=request.user)

    @extend_schema(request=CartItemQuantitySerializer, responses=CartSerializer)
    def patch(self, request, pk):
        item = self.get_item(request, pk)
        serializer = CartItemQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.set_quantity(item, serializer.validated_data["quantity"])
        return cart_response(request)

    @extend_schema(responses=CartSerializer)
    def delete(self, request, pk):
        self.get_item(request, pk).delete()
        return cart_response(request)


class OrderViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_field = "order_number"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()
        return Order.objects.filter(user=self.request.user).prefetch_related("items")

    def get_permissions(self):
        if self.action == "create":
            return [IsEmailVerified()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        if self.action == "payment_proof":
            return PaymentProofSerializer
        return OrderSerializer

    def _order_response(self, order, http_status=status.HTTP_200_OK):
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data, status=http_status)

    @extend_schema(request=OrderCreateSerializer, responses={201: OrderSerializer})
    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        cart_item_ids = data.pop("cart_item_ids", None)
        order = services.create_order(request.user, data, cart_item_ids)
        return self._order_response(order, status.HTTP_201_CREATED)

    @extend_schema(request={"multipart/form-data": PaymentProofSerializer}, responses=OrderSerializer)
    @action(detail=True, methods=["post"], url_path="payment-proof")
    def payment_proof(self, request, order_number=None):
        order = self.get_object()
        serializer = PaymentProofSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = services.submit_payment_proof(order, serializer.validated_data["screenshot"])
        except services.InvalidTransition as exc:
            raise ValidationError(str(exc))
        return self._order_response(order)

    @extend_schema(request=None, responses=OrderSerializer)
    @action(detail=True, methods=["post"])
    def cancel(self, request, order_number=None):
        order = self.get_object()
        if order.status != Order.Status.PENDING_PAYMENT:
            raise ValidationError("Only orders awaiting payment can be cancelled online. Please contact the shop.")
        order = services.change_status(order, Order.Status.CANCELLED)
        return self._order_response(order)
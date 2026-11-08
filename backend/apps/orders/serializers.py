from rest_framework import serializers

from apps.catalog.models import Product
from apps.catalog.serializers import ProductListSerializer
from apps.users.models import phone_validator

from .models import Cart, CartItem, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "line_total")


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = ("items", "subtotal", "item_count")


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.filter(is_active=True, category__is_active=True),
    )
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)


class CartItemQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugRelatedField(source="product", slug_field="slug", read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product_name", "product_slug", "unit_price", "quantity", "line_total")


class OrderSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "order_number", "status", "status_label",
            "full_name", "phone", "city", "address_line", "landmark", "notes",
            "subtotal", "delivery_fee", "total",
            "payment_screenshot", "payment_submitted_at", "payment_note",
            "items", "created_at",
        )
        read_only_fields = fields


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=16, validators=[phone_validator])
    city = serializers.CharField(max_length=100)
    address_line = serializers.CharField(max_length=255)
    landmark = serializers.CharField(max_length=150, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    cart_item_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=False,
        help_text="Cart item ids to buy. Omit to buy everything in the cart.",
    )


class PaymentProofSerializer(serializers.Serializer):
    screenshot = serializers.ImageField()

    def validate_screenshot(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image must be 5 MB or smaller.")
        return value
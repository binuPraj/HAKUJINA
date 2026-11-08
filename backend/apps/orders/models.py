import os
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.catalog.models import Product
from apps.users.models import phone_validator



def payment_proof_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"payment_proofs/{instance.order_number}/{uuid.uuid4().hex}{ext}"


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def subtotal(self):
        return sum((item.line_total for item in self .items.all()), Decimal("0"))

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())

    def __str__(self):
        return f"Cart of {self.user}"


class CartItem(models.Model):
    cart=models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="+")
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    added_at= models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["added_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=["cart", "product"], name="unique_product_per_cart")    
        ]

    @property
    def line_total(self):
        return self.product.price * self.quantity

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Awaiting Payment"
        PAYMENT_SUBMITTED = "payment_submitted", "Payment Submitted"
        CONFIRMED = "confirmed", "Confirmed"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    order_number= models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    status= models.CharField(max_length=20, choices= Status.choices, default=Status.PENDING_PAYMENT, db_index=True)

    full_name= models.CharField(max_length=150)
    phone= models.CharField(max_length=16, validators=[phone_validator])
    city= models.CharField(max_length=100)
    address_line= models.CharField(max_length=255)
    landmark= models.CharField(max_length=255, blank=True)
    notes= models.TextField(blank=True)

    subtotal= models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee= models.DecimalField(max_digits=10, decimal_places=2, default=settings.DELIVERY_FEE)
    total=models.DecimalField(max_digits=10, decimal_places=2)

    payment_screenshot = models.ImageField(upload_to=payment_proof_path, blank=True)
    payment_submitted_at = models.DateTimeField(null=True, blank=True)
    payment_note = models.CharField(max_length=255, blank=True)  # your note to the customer, e.g. why a screenshot was rejected

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    product_name = models.CharField(max_length=150)  # name and price are snapshots
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def line_total(self):
        return self.unit_price * self.quantity


    def __str__(self):
        return f"{self.product_name} x {self.quantity}"




import logging
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from .models import Cart, CartItem, Order, OrderItem
from .services import _restore_stock, notify_status_change

logger = logging.getLogger(__name__)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "product_name", "unit_price", "quantity", "line_total_display")
    fields = ("product", "product_name", "unit_price", "quantity", "line_total_display")

    @admin.display(description="Line Total")
    def line_total_display(self, instance):
        if instance and instance.pk:
            return f"Rs. {instance.line_total:,.2f}"
        return "-"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "created_at",
        "full_name",
        "phone",
        "city",
        "status",
        "total_display",
        "has_payment_proof",
    )
    list_editable = ("status",)
    list_filter = ("status", "city", "created_at", "payment_submitted_at")
    search_fields = (
        "order_number",
        "full_name",
        "phone",
        "city",
        "address_line",
        "user__email",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = (
        "order_number",
        "user_link",
        "created_at",
        "updated_at",
        "subtotal",
        "delivery_fee",
        "total",
        "payment_proof_preview",
    )
    inlines = [OrderItemInline]

    fieldsets = (
        (
            "Order Status & Details",
            {
                "fields": (
                    "order_number",
                    "user_link",
                    "status",
                    "created_at",
                    "updated_at",
                )
            },
        ),
        (
            "Shipping / Customer Information",
            {
                "fields": (
                    "full_name",
                    "phone",
                    "city",
                    "address_line",
                    "landmark",
                    "notes",
                )
            },
        ),
        (
            "Payment Verification",
            {
                "fields": (
                    "payment_proof_preview",
                    "payment_screenshot",
                    "payment_submitted_at",
                    "payment_note",
                )
            },
        ),
        (
            "Financial Summary",
            {
                "fields": (
                    "subtotal",
                    "delivery_fee",
                    "total",
                )
            },
        ),
    )

    actions = [
        "mark_confirmed",
        "mark_shipped",
        "mark_delivered",
        "mark_cancelled",
    ]

    @admin.display(description="Total")
    def total_display(self, obj):
        return f"Rs. {obj.total:,.2f}"

    @admin.display(boolean=True, description="Proof")
    def has_payment_proof(self, obj):
        return bool(obj.payment_screenshot)

    @admin.display(description="User")
    def user_link(self, obj):
        if obj.user:
            url = reverse("admin:users_user_change", args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "-"

    @admin.display(description="Payment Screenshot")
    def payment_proof_preview(self, obj):
        if obj.payment_screenshot:
            return format_html(
                '<a href="{0}" target="_blank" rel="noopener noreferrer">'
                '<img src="{0}" style="max-height: 250px; max-width: 380px; border-radius: 6px; border: 1px solid #d4c8b8; object-fit: contain; background: #faf9f5;" />'
                '</a><br><small style="color: #666;">Click image to view full size</small>',
                obj.payment_screenshot.url,
            )
        return "No payment proof uploaded yet."

    def save_model(self, request, obj, form, change):
        if change and "status" in form.changed_data:
            old_status = Order.objects.filter(pk=obj.pk).values_list("status", flat=True).first()
            new_status = obj.status
            if old_status != new_status:
                if new_status == Order.Status.CANCELLED and old_status != Order.Status.CANCELLED:
                    _restore_stock(obj)
                super().save_model(request, obj, form, change)
                try:
                    notify_status_change(obj)
                except Exception as exc:
                    logger.warning("Could not send status notification email: %s", exc)
                return
        super().save_model(request, obj, form, change)

    @admin.action(description="Mark selected orders as Confirmed")
    def mark_confirmed(self, request, queryset):
        count = 0
        for order in queryset:
            order.status = Order.Status.CONFIRMED
            order.save(update_fields=["status", "updated_at"])
            try:
                notify_status_change(order)
            except Exception:
                pass
            count += 1
        self.message_user(request, f"{count} order(s) updated to Confirmed.")

    @admin.action(description="Mark selected orders as Shipped")
    def mark_shipped(self, request, queryset):
        count = 0
        for order in queryset:
            order.status = Order.Status.SHIPPED
            order.save(update_fields=["status", "updated_at"])
            try:
                notify_status_change(order)
            except Exception:
                pass
            count += 1
        self.message_user(request, f"{count} order(s) updated to Shipped.")

    @admin.action(description="Mark selected orders as Delivered")
    def mark_delivered(self, request, queryset):
        count = 0
        for order in queryset:
            order.status = Order.Status.DELIVERED
            order.save(update_fields=["status", "updated_at"])
            try:
                notify_status_change(order)
            except Exception:
                pass
            count += 1
        self.message_user(request, f"{count} order(s) updated to Delivered.")

    @admin.action(description="Mark selected orders as Cancelled (restores stock)")
    def mark_cancelled(self, request, queryset):
        count = 0
        for order in queryset:
            if order.status != Order.Status.CANCELLED:
                _restore_stock(order)
                order.status = Order.Status.CANCELLED
                order.save(update_fields=["status", "updated_at"])
                try:
                    notify_status_change(order)
                except Exception:
                    pass
                count += 1
        self.message_user(request, f"{count} order(s) cancelled and stock restored.")


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ("product", "quantity", "added_at")


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("user", "item_count", "subtotal_display", "updated_at")
    search_fields = ("user__email",)
    inlines = [CartItemInline]

    @admin.display(description="Subtotal")
    def subtotal_display(self, obj):
        return f"Rs. {obj.subtotal:,.2f}"

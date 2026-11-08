from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.orders import services
from apps.orders.models import Order


class Command(BaseCommand):
    help = "Cancel orders still awaiting payment after N hours and return their stock."

    def add_arguments(self, parser):
        parser.add_argument("--hours", type=int, default=48)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=options["hours"])
        stale = Order.objects.filter(status=Order.Status.PENDING_PAYMENT, created_at__lt=cutoff)
        count = 0
        for order in stale:
            try:
                services.change_status(
                    order, Order.Status.CANCELLED,
                    note="Cancelled automatically because payment was not received in time.",
                )
                count += 1
            except services.InvalidTransition:
                pass
        self.stdout.write(f"Cancelled {count} unpaid order(s).")
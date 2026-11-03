from django.db.models import Q
from django_filters import rest_framework as filters

from .models import Product

class ProductFilter(filters.FilterSet):
    category = filters.CharFilter(field_name="category__slug", lookup_expr="iexact")
    min_price= filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price= filters.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model= Product
        fields=[]

    def filter_category(self, queryset, name, value):
        return queryset.filter(Q(category__slug=value) | Q(category__parent__slug=value))

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(stock__gt=0) if value else queryset.filter(stock=0)
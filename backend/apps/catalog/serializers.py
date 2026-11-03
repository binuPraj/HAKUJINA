from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Category, Product, ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text")


class CategoryRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class ProductCategorySerializer(CategoryRefSerializer):
    parent = CategoryRefSerializer(read_only=True)  # for breadcrumbs

    class Meta(CategoryRefSerializer.Meta):
        fields = CategoryRefSerializer.Meta.fields + ("parent",)


class CategorySerializer(CategoryRefSerializer):
    children = CategoryRefSerializer(many=True, read_only=True)

    class Meta(CategoryRefSerializer.Meta):
        fields = CategoryRefSerializer.Meta.fields + ("children",)


class ProductListSerializer(serializers.ModelSerializer):
    category = ProductCategorySerializer(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "price", "stock", "in_stock", "primary_image", "category")

    @extend_schema_field(ProductImageSerializer(allow_null=True))
    def get_primary_image(self, obj):
        images = list(obj.images.all())  # uses the prefetched images
        if not images:
            return None
        return ProductImageSerializer(images[0], context=self.context).data


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ("description", "images", "created_at")
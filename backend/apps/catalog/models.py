from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify

class SluggedModel(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.slug:
            base=slugify(self.name) or "item"
            slug, n =base,2
            while type(self).objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug=f"{base}-{n}"
                n+=1
            self.slug=slug
        super().save(*args, **kwargs)

class Category(SluggedModel):
    parent=models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    sort_order= models.PositiveIntegerField(default=0)
    is_active=models.BooleanField(default=True)

    class Meta:
        verbose_name_plural="categories"
        ordering=["sort_order", "name"]

    def clean(self):
        if self.parent_id == self.pk:
            raise ValidationError("A category cannot be its own parent.")
        if self.parent.parent_id:
            raise ValidationError("Only one level of subcategories is allowed.")
        if self.pk and self.children.exists():
            raise ValidationError("A category that has subcategories cannot become a subcategory.")

    def __str__(self):
        return f"{self.parent.name} / {self.name}" if self.parent_id else self.name

class Product(SluggedModel):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators = [MinValueValidator(0)])
    stock = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "name"]

    @property
    def in_stock(self):
        return self.stock > 0

    def __str__(self):
        return self.name

class ProductImage(models.Model):
    product =models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to = "products/%Y/%m/")
    alt_text=models.CharField(max_length=150, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"Image for {self.product.name}"




from django.contrib.auth .models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

class UserManager(BaseUserManager):
    use_in_migrations =True

    def _create(self, email, password, **extra):
        if not email:
            raise ValueError('Email required')

        user=self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault('is_staff', False)
        extra.setdefault('is_superuser', False)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault("is_email_verified", True)
        extra.setdefault('is_superuser', True)
        return self._create(email, password, **extra)

phone_validator = RegexValidator(
    r"^\+?[0-9]{7,15}$", "Enter a valid phone number (digits, optional leading +)."
)  

class User(AbstractBaseUser, PermissionsMixin):
    email=models.EmailField(unique=True)
    name=models.CharField(max_length=150)
    phone = models.CharField(max_length=16, blank=True, validators=[phone_validator])
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects=UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return self.email

    
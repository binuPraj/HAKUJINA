from django.contrib.auth.password_validation import validate_password
from django.core import signing
from rest_framework import serializers
from .models import User
from .tokens import read_verification_token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model= User
        fields=("id", "email", "name", "phone", "is_email_verified")
        read_only_fields = ("id", "email", "is_email_verified")

class RegisterSerializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model=User
        fields=("email", "name", "phone", "password")
        extra_kwargs = { "phone" : {"required": False} }

    def validate_email(self, value):
        value=value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class RegisterResponseSerializer(serializers.Serializer):
    user= UserSerializer()
    access= serializers.CharField()
    refresh= serializers.CharField()

class VerifyEmailSerializer(serializers.Serializer):
    token= serializers.CharField()

    def validate(self, attrs):
        try:
            data=read_verification_token(attrs["token"])
        except signing.SignatureExpired:
            raise serializers.ValidationError({"token":"This link has expired"}, code="token_expired")
        except signing.BadSignature:
            raise serializers.ValidationError({"token": "Invalid verification link."}, code="token_invalid")
        try:
            attrs["user"]= User.objects.get(pk=data["uid"], email=data["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError({"token" : "Invalid verification link."}, code="token_invalid")
        return attrs

class ResendVerificationSerializer(serializers.Serializer):
    email= serializers.EmailField()

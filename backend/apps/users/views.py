from django.db import transaction
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopeRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    RegisterResponseSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    VerifyEmailSerializer,
    UserSerializer,
)
from .services import send_verification_email

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={201: RegisterResponseSerializer})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data= request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        transaction.on_commit(lambda: send_verification_email(user))
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status= status.HTTP_201_CREATED,
        )

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=VerifyEmailSerializer, responses={200: OpenApiResponse(description="Email verified successfully")})
    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        return Response({"detail": "Email verified successfully"})

class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopeRateThrottle]
    throttle_scope = "resend_verification"

    @extend_schema(request=ResendVerificationSerializer, responses={200: OpenApiResponse(description="Accepted")})
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user=User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_email_verified=False
        ).first()

        if user:
            send_verification_email(user)

        return Response({"detail": "If that account exiss and is unverified, a new link has been sent."}, status=status.HTTP_200_OK_ACCEPTED)
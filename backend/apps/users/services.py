from django.conf import settings
from django.core.mail import send_mail
from .tokens import make_verification_token

def send_verification_email(user):
    link = f"{settings.FRONTEND_URL}/verify-email?token={make_verification_token(user)}"
    send_mail(
        subject="Verify your email",
        message=f"Hi {user.name},\n\nConfirm your email by opening this link:\n{link}\n\nThe link expires in 24 hours.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )

    
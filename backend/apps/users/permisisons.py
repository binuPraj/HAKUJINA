from rest_framework.permissions import BasePermission

class IsEmailVerified(BasePermission):
    message="Please verify your email first"
    def has_permission(self, request, view):
        user= request.user

        return bool(user and user.is_authenticated and user.is_email_verified)
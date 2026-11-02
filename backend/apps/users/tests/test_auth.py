import pytest
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.users.models import User
from apps.users.tokens import make_verification_token

pytestmark = pytest.mark.django_db

REGISTER = "/api/v1/auth/register/"
LOGIN = "/api/v1/auth/login/"
ME = "/api/v1/auth/me/"
VERIFY = "/api/v1/auth/verify-email/"
RESEND = "/api/v1/auth/resend-verification/"
VALID = {"email": "Binu@Example.com", "name": "Binu", "password": "StrongPass123!"}


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()  # resets throttle counters between tests


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user("a@b.com", "StrongPass123!", name="A")


def test_register_success(client, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        r = client.post(REGISTER, VALID, format="json")
    assert r.status_code == 201
    assert r.data["user"]["email"] == "binu@example.com"
    assert r.data["user"]["is_email_verified"] is False
    assert "access" in r.data and "refresh" in r.data
    assert len(mail.outbox) == 1


def test_register_with_optional_phone(client):
    r = client.post(REGISTER, {**VALID, "phone": "+9779800000000"}, format="json")
    assert r.status_code == 201
    assert r.data["user"]["phone"] == "+9779800000000"


def test_duplicate_email_is_case_insensitive(client, user):
    r = client.post(REGISTER, {**VALID, "email": "A@B.COM"}, format="json")
    assert r.status_code == 400
    assert "email" in r.data


def test_weak_password_rejected(client):
    r = client.post(REGISTER, {**VALID, "password": "123"}, format="json")
    assert r.status_code == 400
    assert "password" in r.data


def test_invalid_phone_rejected(client):
    r = client.post(REGISTER, {**VALID, "phone": "abc"}, format="json")
    assert r.status_code == 400
    assert "phone" in r.data


def test_login_with_email(client, user):
    r = client.post(LOGIN, {"email": "a@b.com", "password": "StrongPass123!"}, format="json")
    assert r.status_code == 200
    assert "access" in r.data


def test_login_wrong_password(client, user):
    r = client.post(LOGIN, {"email": "a@b.com", "password": "nope"}, format="json")
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get(ME).status_code == 401


def test_me_returns_profile(client, user):
    client.force_authenticate(user)
    r = client.get(ME)
    assert r.status_code == 200
    assert r.data["email"] == "a@b.com"


def test_me_cannot_change_email_or_verified_flag(client, user):
    client.force_authenticate(user)
    client.patch(ME, {"email": "x@y.com", "is_email_verified": True, "name": "New"}, format="json")
    user.refresh_from_db()
    assert user.email == "a@b.com"
    assert user.is_email_verified is False
    assert user.name == "New"


def test_verify_email_success(client, user):
    r = client.post(VERIFY, {"token": make_verification_token(user)}, format="json")
    assert r.status_code == 200
    user.refresh_from_db()
    assert user.is_email_verified is True


def test_verify_email_tampered_token(client, user):
    r = client.post(VERIFY, {"token": make_verification_token(user) + "x"}, format="json")
    assert r.status_code == 400


def test_verify_email_expired_token(client, user, monkeypatch):
    token = make_verification_token(user)
    monkeypatch.setattr("apps.users.tokens.MAX_AGE", -1)
    r = client.post(VERIFY, {"token": token}, format="json")
    assert r.status_code == 400
    user.refresh_from_db()
    assert user.is_email_verified is False


def test_resend_sends_for_unverified_user(client, user):
    r = client.post(RESEND, {"email": "a@b.com"}, format="json")
    assert r.status_code == 202
    assert len(mail.outbox) == 1


def test_resend_is_silent_for_unknown_email(client):
    r = client.post(RESEND, {"email": "nobody@x.com"}, format="json")
    assert r.status_code == 202
    assert len(mail.outbox) == 0
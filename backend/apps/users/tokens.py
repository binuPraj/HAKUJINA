from django.core import signing
SALT= "email_verification"
MAX_AGE= 60*60*24  # 1 day

def make_verification_token(user):
    return signing.dumps({"uid": user.pk, "email": user.email}, salt=SALT)

def read_verification_token(token):
    return signing.loads(token, salt=SALT, max_age=MAX_AGE)
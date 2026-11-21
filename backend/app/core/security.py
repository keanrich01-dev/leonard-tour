import base64
import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from cryptography.fernet import Fernet

from app.core.config import settings

# argon2-cffi's PasswordHasher uses Argon2id by default (RFC 9106 low-memory profile).
_ph = PasswordHasher()
# Verified when the account doesn't exist, so response time doesn't reveal valid emails.
DUMMY_HASH = _ph.hash("timing-equalisation-only")

_COMMON = {
    "password", "passw0rd", "123456789012", "qwertyuiop12", "administrator", "welcome12345",
    "iloveyou1234", "letmein12345", "changeme1234", "mangokili123",
}


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(stored_hash: str, password: str) -> bool:
    try:
        return _ph.verify(stored_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    return _ph.check_needs_rehash(stored_hash)


def password_problems(password: str, email: str = "") -> list[str]:
    """Length-first policy (NIST 800-63B style): long passphrases, no silly composition rules."""
    problems = []
    if len(password) < 12:
        problems.append("Password must be at least 12 characters.")
    if len(password) > 128:
        problems.append("Password must be at most 128 characters.")
    low = password.lower()
    if low in _COMMON:
        problems.append("Password is too common.")
    if len(set(password)) < 5:
        problems.append("Password has too few distinct characters.")
    local = email.split("@")[0].lower()
    if len(local) >= 4 and local in low:
        problems.append("Password must not contain your email name.")
    return problems


# ---- tokens -------------------------------------------------------------
def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def safe_equal(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


# ---- encryption of MFA secrets at rest -----------------------------------
def _fernet() -> Fernet:
    key = hashlib.sha256(("mfa-encryption:" + settings.secret_key).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


# ---- recovery codes ------------------------------------------------------
def new_recovery_codes(n: int = 8) -> list[str]:
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
    return ["".join(secrets.choice(alphabet) for _ in range(5)) + "-" +
            "".join(secrets.choice(alphabet) for _ in range(5)) for _ in range(n)]


def hash_recovery_code(code: str) -> str:
    return hashlib.sha256(code.strip().lower().encode()).hexdigest()

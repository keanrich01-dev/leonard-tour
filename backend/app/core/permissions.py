from app.models.enums import Role

ALL = {
    "packages.read", "packages.write", "bookings.read", "bookings.write",
    "inquiries.read", "inquiries.write", "testimonials.moderate", "blogs.manage",
    "payments.read", "payments.refund", "reports.read",
    "users.manage", "audit.read",
}
# Deliberately NOT in any role: only granted per user via extra_permissions, and audited.
SPECIAL = {"payments.override"}

ROLE_PERMISSIONS: dict[Role, set[str]] = {
    Role.admin: set(ALL),
    Role.manager: {"packages.read", "packages.write", "bookings.read", "bookings.write",
                   "inquiries.read", "inquiries.write", "testimonials.moderate", "blogs.manage",
                   "payments.read", "reports.read"},
    Role.booking_officer: {"packages.read", "bookings.read", "bookings.write",
                           "inquiries.read", "inquiries.write"},
    Role.finance: {"bookings.read", "payments.read", "payments.refund", "reports.read"},
    Role.customer: set(),
}

STAFF_ROLES = {Role.admin, Role.manager, Role.booking_officer, Role.finance}


def permissions_for(user) -> set[str]:
    extra = {p for p in (user.extra_permissions or []) if p in ALL | SPECIAL}
    return ROLE_PERMISSIONS.get(user.role, set()) | extra


def has_permission(user, perm: str) -> bool:
    return perm in permissions_for(user)

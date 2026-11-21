"""Import packages from the old PHP site (exported to JSON) into PostgreSQL.

Usage:  python -m scripts.import_old_data [--dry-run] [path/to/old_packages.json]

Cleaning rules (decided after auditing the old data):
  * 27 old entries -> 11 unique packages. Copies with the same (id,title) differed only by image;
    the extra images become the package gallery.
  * Old ids collide (e.g. 4 different islands shared 'zanzibar1') -> slug from title when needed.
  * "from $1,850" text -> numeric price_from_usd. TZS prices are NOT invented (left empty).
  * Old pricing_table was a placeholder (3466 everywhere) -> ignored.
  * Packages without an itinerary are imported unpublished.
Idempotent: re-running updates existing slugs instead of duplicating.
"""
import json
import re
import sys
from collections import OrderedDict
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import Package, PackageTranslation

CATEGORY_MAP = {"safari": "safari", "climbing": "climbing", "swimming": "beach"}


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def base(img: str | None) -> str | None:
    return img.split("/")[-1] if img else None


def parse_usd(price: str | None) -> Decimal | None:
    m = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", price or "")
    return Decimal(m.group(1).replace(",", "")) if m else None


def clean_text(s: str | None) -> str | None:
    return re.sub(r"\s+", " ", s).strip() if s else s


def load_groups(path: Path):
    raw = json.loads(path.read_text(encoding="utf-8"))
    groups: "OrderedDict[tuple, list]" = OrderedDict()
    for p in raw:
        groups.setdefault((p["id"], p["title"].strip()), []).append(p)
    id_counts = {}
    for (pid, _t) in groups:
        id_counts[pid] = id_counts.get(pid, 0) + 1
    return raw, groups, id_counts


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if args:
        path = Path(args[0])
    else:
        candidates = [
            Path("/data/old_packages.json"),
            Path(__file__).resolve().parents[1] / "data" / "old_packages.json",
            Path(__file__).resolve().parents[2] / "data" / "old_packages.json",
        ]
        path = next((candidate for candidate in candidates if candidate.exists()), candidates[0])
    if not path.exists():
        raise SystemExit(f"Package import file not found: {path}")
    raw, groups, id_counts = load_groups(path)
    print(f"Old entries: {len(raw)} -> unique packages: {len(groups)}")

    db = SessionLocal()
    created = updated = 0
    for order, ((pid, title), copies) in enumerate(groups.items()):
        first = copies[0]
        slug = slugify(title) if id_counts[pid] > 1 else slugify(pid)
        images = []
        for c in copies:
            b = base(c.get("image"))
            if b and b not in images:
                images.append(b)
        itinerary = [{"day": d["day"], "title": clean_text(d["title"]),
                      "description": clean_text(d["description"])} for d in first.get("itinerary", [])]
        has_itin = bool(itinerary)
        usd = parse_usd(first.get("price"))
        print(f"  {slug:34} imgs={len(images)} days={len(itinerary):2} usd={usd} "
              f"{'PUBLISHED' if has_itin else 'UNPUBLISHED (no itinerary)'}")
        if dry:
            continue
        pkg = db.scalar(select(Package).where(Package.slug == slug))
        is_new = pkg is None
        if is_new:
            pkg = Package(slug=slug)
            db.add(pkg)
        pkg.legacy_id = pid
        pkg.category = CATEGORY_MAP.get(first["category"], first["category"])
        pkg.type = first["type"]
        pkg.duration_days = first["days"]
        pkg.badge = (first.get("badge") or None)
        pkg.hero_image = images[0] if images else None
        pkg.gallery_images = images
        pkg.price_from_usd = usd
        pkg.is_published = has_itin
        pkg.sort_order = order
        tr = next((t for t in pkg.translations if t.lang == "en"), None)
        if tr is None:
            tr = PackageTranslation(lang="en")
            pkg.translations.append(tr)
        tr.title = title.title() if title.isupper() else title
        tr.route = clean_text(first.get("route"))
        tr.overview = clean_text(first.get("overview"))
        tr.destinations = [d.strip().title() for d in first.get("destinations", [])]
        tr.itinerary = itinerary
        tr.inclusions = [x.strip() for x in first.get("inclusions", [])]
        tr.exclusions = [x.strip() for x in first.get("exclusions", [])]
        tr.is_reviewed = True  # original English copy written by the business
        created += is_new
        updated += not is_new
    if not dry:
        db.commit()
        print(f"Done. created={created} updated={updated}")
    else:
        print("Dry run: nothing written.")


if __name__ == "__main__":
    main()

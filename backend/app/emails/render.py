import re
from dataclasses import dataclass, field
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

_DIR = Path(__file__).parent / "templates"
_html_env = Environment(loader=FileSystemLoader(_DIR), autoescape=True, trim_blocks=False)
_text_env = Environment(loader=FileSystemLoader(_DIR), autoescape=False)

FONT = ("-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Noto Sans CJK SC',"
        "'Microsoft YaHei','PingFang SC','Malgun Gothic','Apple SD Gothic Neo',sans-serif")


@dataclass
class Content:
    subject: str
    preheader: str
    greeting: str
    paragraphs: list[str]
    closing: str
    footer: str
    lang: str = "en"
    rows: list[tuple[str, str]] = field(default_factory=list)
    notices: list[str] = field(default_factory=list)
    cta: tuple[str, str] | None = None


@dataclass
class RenderedEmail:
    to: str
    kind: str
    lang: str
    subject: str
    html: str
    text: str

    def to_message(self) -> EmailMessage:
        m = EmailMessage()
        m["Subject"] = _one_line(self.subject)
        m["From"] = formataddr((settings.email_from_name, settings.email_from))
        m["To"] = _one_line(self.to)
        if settings.email_reply_to:
            m["Reply-To"] = settings.email_reply_to
        m["Date"] = formatdate(localtime=False)
        m["Message-ID"] = make_msgid(domain=settings.email_from.split("@")[-1] or "localhost")
        m["Auto-Submitted"] = "auto-generated"
        m["X-Mangokili-Kind"] = self.kind
        m.set_content(self.text)
        m.add_alternative(self.html, subtype="html")
        return m


def _one_line(s: str) -> str:
    """Header values must never contain line breaks (header-injection defence)."""
    return re.sub(r"[\r\n]+", " ", s).strip()


def render(content: Content, to: str, kind: str) -> RenderedEmail:
    ctx = {"c": content, "company": settings.company_name, "font": FONT}
    return RenderedEmail(to=to, kind=kind, lang=content.lang, subject=_one_line(content.subject),
                         html=_html_env.get_template("layout.html").render(**ctx),
                         text=_text_env.get_template("layout.txt").render(**ctx).strip() + "\n")

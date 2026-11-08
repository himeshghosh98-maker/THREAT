"""Equality matching over observed evidence. No network lookups occur here."""
from hashlib import sha256
import re
import secrets

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.models.orm import CorrelationSalt, IndicatorRow, ReportRow
from app.models.schemas import Cluster, Correlations, ScanReport


def insert_for(db):
    return sqlite_insert if db.get_bind().dialect.name == "sqlite" else pg_insert


def contact_hash(kind, value, salt):
    if re.fullmatch(r"sha256:[0-9a-f]{64}", value):
        return value
    normalized = value.strip().casefold()
    if kind == "phone":
        normalized = re.sub(r"\D", "", normalized)
        if normalized.startswith("00"):
            normalized = normalized[2:]
        if re.fullmatch(r"0?[6-9]\d{9}", normalized):
            normalized = "91" + normalized[-10:]
    material = bytes.fromhex(salt) + kind.encode() + b"\0" + normalized.encode()
    return "sha256:" + sha256(material).hexdigest()


def protect_contacts(db, report):
    values = set()
    analysis = report.message_analysis
    if analysis and (analysis.extracted_emails or analysis.extracted_phones):
        salt = db.get(CorrelationSalt, 1).salt
        for kind, field in (("email", "extracted_emails"), ("phone", "extracted_phones")):
            hashes = list(dict.fromkeys(contact_hash(kind, v, salt) for v in getattr(analysis, field)))
            setattr(analysis, field, hashes)
            values.update((kind, hashed) for hashed in hashes)
    return values


def redirect_targets(chain):
    targets = set()
    for prev, dest in zip(chain, chain[1:]):
        domain = dest.domain.lower().rstrip(".")
        if 300 <= prev.status < 400 and re.fullmatch(r"[a-z0-9.:-]{1,253}", domain):
            if re.search(r"(?:\d[-.]?){9,}", domain):
                domain = "sha256:" + sha256(domain.encode()).hexdigest()
            targets.add(("redirect_target", domain))
    return targets


def index_values(db, report_id, values):
    if values:
        stmt = insert_for(db)(IndicatorRow).values([
            {"report_id": str(report_id), "type": kind, "value": value} for kind, value in sorted(values)])
        db.execute(stmt.on_conflict_do_nothing())


def initialize_index(engine):
    # Winning the singleton insert makes migration and salt creation a single transaction.
    with Session(engine) as db, db.begin():
        created = db.execute(insert_for(db)(CorrelationSalt).values(id=1, salt=secrets.token_hex(32))
                             .on_conflict_do_nothing().returning(CorrelationSalt.id))
        if created.scalar_one_or_none() is not None:
            for row in db.scalars(select(ReportRow).execution_options(yield_per=200)):
                report = ScanReport.model_validate(row.report)
                contacts = protect_contacts(db, report)
                if contacts:
                    row.report = report.model_dump(mode="json")
                if report.input_type == "url":
                    contacts.update(redirect_targets(report.redirect_chain))
                index_values(db, row.id, contacts)


def correlations(db):
    i = IndicatorRow
    repeated = (select(i.type, i.value).group_by(i.type, i.value)
                .having(func.count(i.report_id) >= 2).subquery())
    rows = db.execute(select(i.type, i.value, i.report_id)
                      .join(repeated, and_(i.type == repeated.c.type, i.value == repeated.c.value))
                      .order_by(i.type, i.value, i.report_id))
    groups = {}
    for kind, value, report_id in rows:
        groups.setdefault((kind, value), []).append(report_id)
    return Correlations(clusters=[
        Cluster(id=sha256(f"{kind}:{value}".encode()).hexdigest(), shared_indicator=value,
                indicator_type=kind, report_ids=ids,
                summary=f"{len(ids)} reports share the same {kind.replace('_', ' ')}.")
        for (kind, value), ids in groups.items()])

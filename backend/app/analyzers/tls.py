import asyncio
import ipaddress
import json
import socket
import ssl
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, ed448, rsa
from cryptography.exceptions import InvalidSignature

from app.analyzers.phishing import evidence
from app.core import ssrf
from app.models.schemas import TLS

DISCLAIMER = "A valid certificate is not proof that the site is safe."
CA_FINDING = "linked to a CA reported as compromised or distrusted"
CA_LIST = json.loads((Path(__file__).parents[1] / "data/distrusted_cas.json").read_text())["entries"]


async def handshake(address, port, host, verify):
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.check_hostname = False  # SANs are evaluated separately from chain trust.
    if verify:
        context.load_default_certs()
    else:
        context.verify_mode = ssl.CERT_NONE
    family = socket.AF_INET if address.version == 4 else socket.AF_INET6
    with socket.socket(family, socket.SOCK_STREAM) as sock:
        sock.setblocking(False)
        await asyncio.get_running_loop().sock_connect(sock, (str(address), port))
        _, writer = await asyncio.open_connection(sock=sock, ssl=context, server_hostname=host)
        try:
            peer = writer.get_extra_info("ssl_object")
            leaf = x509.load_der_x509_certificate(peer.getpeercert(binary_form=True))
            certs = [leaf]
            # CPython 3.12 exposes the chain on its internal OpenSSL object.
            get_chain = getattr(peer, "get_unverified_chain", None)
            if not get_chain:
                get_chain = getattr(getattr(peer, "_sslobj", None), "get_unverified_chain", None)
            for item in (get_chain() or []) if get_chain else []:
                if isinstance(item, bytes):
                    cert = x509.load_der_x509_certificate(item)
                else:
                    cert = x509.load_pem_x509_certificate(item.public_bytes().encode())
                if cert not in certs:
                    certs.append(cert)
            return certs
        finally:
            # No application data was sent. Release the inspection socket immediately.
            writer.transport.abort()
            await writer.wait_closed()


async def peer_chain(url, resolution=None):
    url = ssrf.validate_url(url)
    host = url.host.strip("[]").rstrip(".")
    async with asyncio.timeout(8):
        addresses = await asyncio.shield(resolution) if resolution is not None else await ssrf.safe_resolve(host)
        address = ssrf.public_ip(str(addresses[0]))
        try:
            return await handshake(address, url.port, host, True), True
        except ssl.SSLCertVerificationError:
            # Inspection only. Retry the same pinned IP and send no application data.
            return await handshake(address, url.port, host, False), False


def matches_dns(host, pattern):
    labels = pattern.lower().rstrip(".").split(".")
    parts = host.lower().rstrip(".").split(".")
    if labels[0] == "*":
        return len(labels) >= 3 and len(parts) == len(labels) and parts[1:] == labels[1:]
    return labels == parts


def inspect(host, certs, trusted):
    leaf = certs[0]
    try:
        alt = leaf.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    except x509.ExtensionNotFound:
        alt = x509.SubjectAlternativeName([])
    dns = alt.get_values_for_type(x509.DNSName)
    ips = alt.get_values_for_type(x509.IPAddress)
    try:
        matched = ipaddress.ip_address(host) in ips
    except ValueError:
        matched = any(matches_dns(host, name) for name in dns)
    now = datetime.now(UTC)
    start, end = leaf.not_valid_before_utc, leaf.not_valid_after_utc
    key = leaf.public_key()
    if isinstance(key, rsa.RSAPublicKey):
        kind = "RSA"
    elif isinstance(key, ec.EllipticCurvePublicKey):
        kind = "EC"
    else:
        kind = leaf.public_key_algorithm_oid._name
    size = getattr(key, "key_size", 0)
    if isinstance(key, ed25519.Ed25519PublicKey):
        size = 256
    elif isinstance(key, ed448.Ed448PublicKey):
        size = 448
    alg = leaf.signature_hash_algorithm
    signature = alg.name if alg else leaf.signature_algorithm_oid._name
    indicators = []

    def flag(key, title, severity="high"):
        indicators.append(evidence(key, "tls", title, severity, title, "TLS peer certificate"))

    if end < now:
        flag("tls-expired", "Certificate has expired.")
    if start > now:
        flag("tls-future", "Certificate is not yet valid.")
    if not matched:
        flag("tls-hostname", "Certificate SAN does not match the requested hostname.")
    if kind == "RSA" and size < 2048:
        flag("tls-key", "RSA key is shorter than 2048 bits.")
    if signature.lower() in {"md5", "sha1"}:
        flag("tls-signature", "Certificate uses " + signature + " for its signature.")
    if leaf.issuer == leaf.subject:
        try:
            leaf.verify_directly_issued_by(leaf)
        except (InvalidSignature, ValueError, TypeError):
            pass
        else:
            flag("tls-self-signed", "Leaf certificate is self-signed.", "medium")
    if not trusted:
        flag("tls-untrusted", "The platform trust store could not validate the certificate chain.")
    names = [c.subject.rfc4514_string() for c in certs]
    identities = {c.fingerprint(hashes.SHA256()).hex() for c in certs}
    identities.update(names)
    identities.update(c.issuer.rfc4514_string() for c in certs)
    compromised = any(entry["fingerprint_or_match"] in identities for entry in CA_LIST)
    if compromised:
        flag("tls-ca", CA_FINDING, "critical")
    report = TLS(valid=trusted and matched and start <= now <= end, issuer=leaf.issuer.rfc4514_string(),
                 subject=names[0], san=dns + [str(ip) for ip in ips], not_before=start, not_after=end,
                 days_remaining=(end - now).days, hostname_match=matched, key_type=kind, key_size=size,
                 signature_algorithm=signature, chain=names, ct_records_count=0, ct_notes=[],
                 compromised_ca_flag=compromised, findings=[i.title for i in indicators], disclaimer=DISCLAIMER)
    return report, indicators


async def analyze(url, resolution=None):
    if url.scheme != "https":
        return None, [evidence("tls-http", "tls", "Unencrypted HTTP input", "medium",
                               "The submitted URL does not use HTTPS.", "URL scheme")]
    certs, trusted = await peer_chain(url, resolution)
    return inspect(url.host.strip("[]").rstrip("."), certs, trusted)


async def transparency(host):
    query = urlencode({"q": host, "output": "json"})
    result = await ssrf.safe_fetch(f"https://crt.sh/?{query}", timeout=8)
    if result.failed or not result.chain or result.chain[-1].status != 200:
        raise ValueError("Certificate transparency unavailable")
    records = json.loads(result.body)
    if not isinstance(records, list):
        raise ValueError("Unexpected CT response")
    unique = {}
    for row in records:
        issued = datetime.fromisoformat(row["not_before"])
        if issued.tzinfo is None:
            issued = issued.replace(tzinfo=UTC)
        unique[(row["issuer_name"], row["serial_number"])] = issued
    cutoff = datetime.now(UTC) - timedelta(days=30)
    recent = [issuer for (issuer, _), date in unique.items() if date >= cutoff]
    historical = {issuer for (issuer, _), date in unique.items() if date < cutoff}
    notes = []
    if len(recent) >= 5:
        notes.append(f"{len(recent)} certificates have validity periods starting in the past 30 days.")
    if historical and set(recent) - historical:
        notes.append("A recent issuer differs from the historical issuers in these records. Rotation can be routine.")
    return len(unique), notes

from app.analyzers.phishing import evidence, registered
from app.core import ssrf

SHORTENERS = {"bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "buff.ly", "is.gd"}


async def analyze(url, page=None):
    result = await page if page is not None else await ssrf.safe_fetch(url)
    items = []
    hosts = [hop.domain for hop in result.chain]
    if registered(url.host) in SHORTENERS or any(registered(host) in SHORTENERS for host in hosts):
        items.append(evidence("shortener", "redirect", "Shortened destination", "medium",
                              "The input or a response hop uses a listed URL shortener.", "Redirect inspection"))
    transitions = list(zip(hosts, hosts[1:]))
    if any(a != b for a, b in transitions):
        items.append(evidence("cross-host", "redirect", "Hostname changed", "low",
                              "Consecutive responses came from different hosts.", "HTTP redirect chain"))
    if any(registered(a) != registered(b) for a, b in transitions):
        items.append(evidence("cross-domain", "redirect", "Registered domain changed", "medium",
                              "The redirect crossed registered domains. Common ownership is unknown.", "HTTP redirect chain"))
    if len(hosts) > 4:
        items.append(evidence("long-chain", "redirect", "Long redirect chain", "medium",
                              f"Observed {len(hosts)} HTTP responses.", "HTTP redirect chain"))
    failed = result.failed or not result.chain or result.chain[-1].status >= 400
    return items, result.chain, failed

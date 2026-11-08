# Demo testing report

Run at 2026-11-08 16:38 UTC through the FastAPI scan endpoints with live analyzers and a disposable database. Inputs include three suspicious URLs, four benign reference URLs and six messages. Network and provider failures appear in the failed-checks column. A missing Google key is an unavailable source. URL previews show defanged origins and omit paths and query strings.

| Case | Input preview | Classification | Score | Confidence | Indicator IDs | Failed checks | Interpretation |
|---|---|---|---:|---:|---|---|---|
| Lookalike over HTTP | hxxp://paypa1[.]invalid | suspicious | 20 | 0.38 | tls-http | DNS, RDAP, HTTP redirects, Security headers, Google Safe Browsing | Consistent with fixture expectation. |
| Punycode lookalike | hxxps://xn--pple-43d[.]invalid | suspicious | 43 | 0.33 | idn-label, confusable-label | DNS, RDAP, HTTP redirects, TLS, Security headers, Google Safe Browsing | Consistent with fixture expectation. |
| KYC link with redirect parameter | hxxps://sbi-secure-login[.]invalid | suspicious | 20 | 0.33 | embedded-url | DNS, RDAP, HTTP redirects, TLS, Security headers, Google Safe Browsing | Consistent with fixture expectation. |
| GitHub | hxxps://github[.]com | suspicious | 8 | 0.56 | low-ttl | HTTP redirects, TLS, Security headers, Google Safe Browsing | Potential false positive on this benign reference. |
| Google | hxxps://www[.]google[.]com | suspicious | 22 | 0.89 | low-ttl, strict-transport-security, content-security-policy, x-content-type-options, referrer-policy, cookie-httponly, cookie-samesite, cookie-secure | Google Safe Browsing | Potential false positive on this benign reference. |
| Bank of America | hxxps://www[.]bankofamerica[.]com | suspicious | 18 | 0.89 | low-ttl, x-content-type-options, referrer-policy, cookie-httponly, cookie-samesite, cookie-secure | Google Safe Browsing | Potential false positive on this benign reference. |
| MIT | hxxps://www[.]mit[.]edu | suspicious | 12 | 0.67 | low-ttl, x-content-type-options, referrer-policy | RDAP, Certificate transparency, Google Safe Browsing | Potential false positive on this benign reference. |
| KYC SMS | SBI KYC update required immediately or your account will be blocked. Verify at hxxps://sbi-secure-login[.]invalid | suspicious | 60 | 0.3 | urgent-language, kyc-request, claimed-identity | Link 1: DNS, Link 1: RDAP, Link 1: HTTP redirects, Link 1: TLS, Link 1: Security headers, Link 1: Certificate transparency, Link 1: Google Safe Browsing | Consistent with fixture expectation. |
| Job offer | Your job offer is ready. Pay the refundable processing fee to receive your appointment letter. | suspicious | 20 | 1.0 | job-fee | None | Consistent with fixture expectation. |
| Parcel fee | Your parcel is awaiting redelivery. Pay the delivery fee at hxxps://parcel-pay[.]example | suspicious | 20 | 0.3 | delivery-fee | Link 1: DNS, Link 1: RDAP, Link 1: HTTP redirects, Link 1: TLS, Link 1: Security headers, Link 1: Certificate transparency, Link 1: Google Safe Browsing | Consistent with fixture expectation. |
| Bank notification | Your monthly bank statement is available in the mobile app. | low_risk | 0 | 1.0 | None | None | Consistent with fixture expectation. |
| Newsletter | This week's library newsletter includes the schedule for our reading group. | low_risk | 0 | 1.0 | None | None | Consistent with fixture expectation. |
| Friend | Are you free for lunch on Saturday? | low_risk | 0 | 1.0 | None | None | Consistent with fixture expectation. |

## Known limitations

The suspicious URL fixtures use reserved names and deliberately have no real malicious site behind them. Their DNS, redirect, registration and TLS results cannot demonstrate live attack detection. The benign sites are references, not independently labelled ground truth. Shared infrastructure, header omissions and short DNS lifetimes can flag benign sites. A missing source reduces coverage; confidence is the fraction of checks completed, not a probability of maliciousness. These cases do not estimate a production false-positive or false-negative rate.

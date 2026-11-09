# Accuracy evaluation

Tune only on the tune split. Freeze weights, thresholds, keyword lists and brands before opening test results. Never move cases between splits.

Offline replay uses a sanitized GitHub DNS, TLS, HTTP and RDAP profile shared across reachable hosts, synthetic no-answer and feed controls, and empty CT records. Labels describe intended URL style or message content. These are controlled cases, not a prevalence sample or proof that a live domain hosts phishing.

Baseline revision: 23b63cd. The old detector was scored on both splits before edits. Only tune metrics were inspected during development. The gate generated this report after the rules were frozen.

Positive means suspicious or higher. Rejection is protective on phishing inputs. Inconclusive counts as a miss on positive inputs. Attack rejection requires HTTP 422 and zero outbound HTTP attempts in replay. Intervals are Wilson score intervals.

## tune (71 cases)

| Metric | Baseline | Final |
|---|---|---|
| FPR | 2/31 (6.5%, 95% CI 1.8–20.7%) | 0/31 (0.0%, 95% CI 0.0–11.0%) |
| FNR | 17/31 (54.8%, 95% CI 37.8–70.8%) | 3/31 (9.7%, 95% CI 3.3–24.9%) |
| attack rejection | 7/7 (100.0%, 95% CI 64.6–100.0%) | 7/7 (100.0%, 95% CI 64.6–100.0%) |
| inconclusive | 2/71 (2.8%, 95% CI 0.8–9.7%) | 2/71 (2.8%, 95% CI 0.8–9.7%) |

| Category | Cases | Errors | FPR | FNR | Attack rejection | Inconclusive |
|---|---:|---:|---|---|---|---|
| attack | 7 | 0 | n/a | n/a | 7/7 (100.0%, 95% CI 64.6–100.0%) | 0/7 (0.0%, 95% CI 0.0–35.4%) |
| benign_message | 13 | 0 | 0/13 (0.0%, 95% CI 0.0–22.8%) | n/a | n/a | 0/13 (0.0%, 95% CI 0.0–22.8%) |
| benign_url | 18 | 0 | 0/18 (0.0%, 95% CI 0.0–17.6%) | n/a | n/a | 0/18 (0.0%, 95% CI 0.0–17.6%) |
| phishing_url | 18 | 3 | n/a | 3/18 (16.7%, 95% CI 5.8–39.2%) | n/a | 0/18 (0.0%, 95% CI 0.0–17.6%) |
| scam | 13 | 0 | n/a | 0/13 (0.0%, 95% CI 0.0–22.8%) | n/a | 0/13 (0.0%, 95% CI 0.0–22.8%) |
| unreachable | 2 | 0 | n/a | n/a | n/a | 2/2 (100.0%, 95% CI 34.2–100.0%) |

| Expected / observed | low_risk | suspicious | high_risk | confirmed_malicious | inconclusive | rejected |
|---|---:|---:|---:|---:|---:|---:|
| inconclusive | 0 | 0 | 0 | 0 | 2 | 0 |
| low_risk | 31 | 0 | 0 | 0 | 0 | 0 |
| positive | 3 | 14 | 13 | 1 | 0 | 0 |
| rejected | 0 | 0 | 0 | 0 | 0 | 7 |

Deterministic 71/71. In band or rejected 71/71.

| Error | Input | Expected | Observed | Indicator IDs |
|---|---|---|---|---|
| phishing_url-22 | `https://random-reward.top` | positive | low_risk | listed-tld, low-ttl, content-security-policy |
| phishing_url-23 | `https://kbc-winner.net/prize` | positive | low_risk | low-ttl, content-security-policy |
| phishing_url-30 | `https://bnk-customer-service.info` | positive | low_risk | low-ttl, content-security-policy |
## test (49 cases)

| Metric | Baseline | Final |
|---|---|---|
| FPR | 0/21 (0.0%, 95% CI 0.0–15.5%) | 0/21 (0.0%, 95% CI 0.0–15.5%) |
| FNR | 11/21 (52.4%, 95% CI 32.4–71.7%) | 1/21 (4.8%, 95% CI 0.8–22.7%) |
| attack rejection | 5/5 (100.0%, 95% CI 56.6–100.0%) | 5/5 (100.0%, 95% CI 56.6–100.0%) |
| inconclusive | 2/49 (4.1%, 95% CI 1.1–13.7%) | 2/49 (4.1%, 95% CI 1.1–13.7%) |

| Category | Cases | Errors | FPR | FNR | Attack rejection | Inconclusive |
|---|---:|---:|---|---|---|---|
| attack | 5 | 0 | n/a | n/a | 5/5 (100.0%, 95% CI 56.6–100.0%) | 0/5 (0.0%, 95% CI 0.0–43.4%) |
| benign_message | 9 | 0 | 0/9 (0.0%, 95% CI 0.0–29.9%) | n/a | n/a | 0/9 (0.0%, 95% CI 0.0–29.9%) |
| benign_url | 12 | 0 | 0/12 (0.0%, 95% CI 0.0–24.2%) | n/a | n/a | 0/12 (0.0%, 95% CI 0.0–24.2%) |
| phishing_url | 12 | 1 | n/a | 1/12 (8.3%, 95% CI 1.5–35.4%) | n/a | 0/12 (0.0%, 95% CI 0.0–24.2%) |
| scam | 9 | 0 | n/a | 0/9 (0.0%, 95% CI 0.0–29.9%) | n/a | 0/9 (0.0%, 95% CI 0.0–29.9%) |
| unreachable | 2 | 0 | n/a | n/a | n/a | 2/2 (100.0%, 95% CI 34.2–100.0%) |

| Expected / observed | low_risk | suspicious | high_risk | confirmed_malicious | inconclusive | rejected |
|---|---:|---:|---:|---:|---:|---:|
| inconclusive | 0 | 0 | 0 | 0 | 2 | 0 |
| low_risk | 21 | 0 | 0 | 0 | 0 | 0 |
| positive | 1 | 10 | 9 | 0 | 0 | 1 |
| rejected | 0 | 0 | 0 | 0 | 0 | 5 |

Deterministic 49/49. In band or rejected 49/49.

| Error | Input | Expected | Observed | Indicator IDs |
|---|---|---|---|---|
| phishing_url-21 | `https://account---secure---verify.xyz` | positive | low_risk | listed-tld, many-hyphens, low-ttl, content-security-policy |

# Security Rulebook

**Last updated:** 2026-08-20

Portable reference. One line per principle, control, or named risk. No project posture — what
*this* system does belongs in the project's own `SECURITY.md`.

| | Section | Answers |
| --- | --- | --- |
| **§1** | Design principles | How do you shape a system so the insecure path is the harder one? |
| **§2** | Secure coding controls | What must this code do, line by line? |
| **§3** | OWASP Top 10:2025 | Which named web risk does this change open? |
| **§4** | OWASP Top 10 for LLM apps | What breaks when prompts, tools, and model output cross a trust boundary? |
| **§5** | Supply chain & secure SDLC | How does the build stop bad code and bad dependencies? |
| **§6** | Run, detect, respond | Will you see an attack, and can you recover? |
| **§7** | Conflicts | Which rule wins? |

**Goals.** ISO/IEC 25010:2023 splits security into confidentiality, integrity, non-repudiation,
accountability, authenticity, and resistance. Availability sits under reliability in the
standard, but an attacker who takes the service down has still won.

---

## §1 Design principles

### §1a Saltzer and Schroeder (1975)

Eight principles from *The Protection of Information in Computer Systems*. Every later
framework traces back here. Rows 9 and 10 are the two the same paper calls partly applicable.

| # | Principle | Demands |
| --- | --- | --- |
| 1 | **Economy of mechanism** | Keep the security design as small and simple as it can be. Complexity is where a flaw hides. |
| 2 | **Fail-safe defaults** | Base decisions on permission, not exclusion. The default answer is no. |
| 3 | **Complete mediation** | Check authority on every access to every object. Never cache a decision as permanent. |
| 4 | **Open design** | The design may be public. Only the key stays secret. Obscurity is not a control. |
| 5 | **Separation of privilege** | Require two conditions where you can. One stolen key is then not enough. |
| 6 | **Least privilege** | The smallest set of rights the task needs, for the shortest time. |
| 7 | **Least common mechanism** | Share as little as possible between privilege levels. A shared path is an escalation path. |
| 8 | **Psychological acceptability** | Make the secure path easy. A control that gets in the way gets routed around. |
| 9 | **Work factor** | Compare the cost of breaking a control against the attacker you expect. |
| 10 | **Compromise recording** | A reliable record of a break-in can replace expensive prevention. Sometimes detection is the better buy. |

### §1b Modern additions

| # | Principle | Demands |
| --- | --- | --- |
| 1 | **Security by design** | Gather security requirements with the others. A control added after release costs more and covers less. |
| 2 | **Secure by default** | The shipped configuration is the safest one. Opting out takes a deliberate act. |
| 3 | **Security as code** | Policy in version control, tested, enforced in the pipeline. A manual checklist rots. |
| 4 | **Defense in depth** | Layer independent controls. One failure must not equal full compromise. |
| 5 | **Minimize the attack surface** | Every endpoint, port, and permission is a liability. Remove what nobody uses. |
| 6 | **Assume breach** | Design for the day the attacker is already inside. Segment, scope credentials, watch internal traffic. |
| 7 | **Verify explicitly** | Authenticate and authorize every request on its own evidence. Network location proves nothing. |
| 8 | **Compartmentalize** | Split access on need-to-know, but not so finely that nobody can run the system. |
| 9 | **Secure the weakest link** | Find the weakest part first, because the attacker will. |
| 10 | **Reuse vetted components** | Prefer a maintained, widely reviewed library over your own, above all for cryptography. |
| 11 | **No security guarantee** | No system is fully secure. Raise the attacker's cost and cut the reward. |
| 12 | **Own the outcome** | The producer carries the security burden, not the customer. Publish what you fix, and let leadership own the result. |

Row 12 restates CISA's three secure-by-design principles: own customer security outcomes,
embrace radical transparency and accountability, lead from the top.

---

## §2 Secure coding controls

The line-level list. **OWASP ASVS 5.0** is the full testable standard — 17 chapters, about 350
requirements, three levels. L1 baseline, L2 for most apps holding a login or a payment, L3 for
catastrophic-failure systems. Go to the named ASVS chapter for the complete list.

Mark a domain **not applicable** when there is no such surface. Never mark it *passed* by default.

### §2a Input validation and injection (ASVS V1, V2)

| # | Control |
| --- | --- |
| 1 | Validate on the server. Client-side validation is for user experience, never security. |
| 2 | Validate against an allowlist. A denylist always misses a case. |
| 3 | Check type, length, range, and format on every field, header, cookie, and file name. |
| 4 | Decode input once, to one canonical form, before validating. |
| 5 | Reject invalid input. Do not repair it, because a repair can rebuild the attack. |
| 6 | Parameterized queries for every database call. Never build a query by concatenation. |
| 7 | Never pass user input to a shell, evaluator, template engine, or deserializer. |
| 8 | Treat every response from another service as untrusted input. |

### §2b Output encoding (ASVS V1, V3)

| # | Control |
| --- | --- |
| 1 | Encode for the receiving context: HTML body, HTML attribute, JavaScript, URL, CSS, SQL, or shell. |
| 2 | Encode on output, at the moment of use. Do not store pre-encoded data. |
| 3 | Use the framework's encoder. A hand-written escape function misses a case. |
| 4 | Send a Content Security Policy free of `unsafe-inline` and `unsafe-eval`. |
| 5 | Set `X-Content-Type-Options: nosniff` and a correct `Content-Type` on every response. |

### §2c Authentication and passwords (ASVS V6, NIST SP 800-63B)

| # | Control |
| --- | --- |
| 1 | At least 8 characters with another factor. At least 15 when the password is the only factor. |
| 2 | Accept at least 64 characters, all printable ASCII, space, and Unicode. Allow paste. |
| 3 | No composition rules. No periodic change. Force a change only on evidence of compromise. |
| 4 | Screen new passwords against a breached and common-password list. |
| 5 | Hash with Argon2id: 19 MiB memory, 2 iterations, 1 degree of parallelism, or stronger. |
| 6 | Otherwise scrypt (N=2^17, r=8, p=1) or PBKDF2-HMAC-SHA-256 at 600,000 iterations. |
| 7 | For bcrypt, work factor 10 or more. Bcrypt truncates input at 72 bytes. |
| 8 | Salt every hash, per user, from a cryptographic random source. Consider a pepper stored separately. |
| 9 | Offer multi-factor authentication. Require it for administrative access. |
| 10 | Same answer for a wrong password and an unknown account. Do not leak which failed. |
| 11 | Rate-limit and lock out on repeated failures, including reset and one-time-code entry. |
| 12 | Reset links are single-use, short-lived, and tied to one account. Notify the owner on every credential change. |
| 13 | Never ship a default credential. Force a change at first use if one exists. |

### §2d Session management (ASVS V7, V9, V10)

| # | Control |
| --- | --- |
| 1 | Use the framework session manager. Do not invent a session identifier. |
| 2 | Generate identifiers from a cryptographic random source, at least 128 bits of entropy. |
| 3 | Set `Secure`, `HttpOnly`, and `SameSite` on every session cookie. Scope path and domain narrowly. |
| 4 | Rotate the identifier at login and at any privilege change. |
| 5 | Expire by absolute lifetime and idle time. Log out invalidates on the server, not only the browser. |
| 6 | Bind a sensitive action to fresh authentication, not only to a live session. |
| 7 | Validate signature, issuer, audience, and expiry on a self-contained token. Reject the `none` algorithm. |
| 8 | Keep tokens out of URLs. A URL lands in logs, history, and the referrer header. |

### §2e Authorization (ASVS V8)

| # | Control |
| --- | --- |
| 1 | Deny by default. A route with no rule is a closed route. |
| 2 | Check on the server for every request, including API calls and static assets holding data. |
| 3 | Check the object, not only the endpoint. Read access to record 1 is not access to record 2. |
| 4 | Never trust an identifier, role, or price that arrives from the client. |
| 5 | Keep the decision in one place, so a reviewer can read every rule in one file. |
| 6 | Re-check on each step of a multi-step flow. A user can jump to the last step. |
| 7 | Separate duties for high-value actions. One account must not request and approve the same payment. |

### §2f Cryptography (ASVS V11, V14)

| # | Control |
| --- | --- |
| 1 | Use a vetted library. Never write your own algorithm or mode. |
| 2 | Encrypt sensitive data at rest and in transit by default, not per feature. |
| 3 | Use authenticated encryption: AES-GCM or ChaCha20-Poly1305. Encryption without integrity is not enough. |
| 4 | Draw every key, salt, nonce, and token from a cryptographic random source. Never `rand()` or a timestamp. |
| 5 | Never reuse a nonce or initialization vector with the same key. |
| 6 | Store keys in a key manager or hardware module, apart from the data they protect. |
| 7 | Rotate keys on a schedule. Keep the design able to change algorithm later. |
| 8 | Compare secrets with a constant-time function, so timing does not leak them. |
| 9 | Hash passwords with a password hash, per §2c. SHA-256 is the wrong tool. |

### §2g Secrets (ASVS V13)

| # | Control |
| --- | --- |
| 1 | Keep credentials, keys, and tokens out of source control, container images, and logs. |
| 2 | Load secrets from a secrets manager or the environment at run time. |
| 3 | Scan every commit for a secret. Block the push when one appears. |
| 4 | Treat a leaked secret as used. Rotate it and check what it touched. |
| 5 | Scope each credential to one service and one job. Prefer short-lived tokens. |

### §2h Error handling and logging (ASVS V16)

| # | Control |
| --- | --- |
| 1 | Handle every error path on purpose. An unhandled exception is now A10:2025. |
| 2 | Fail closed. When a check cannot complete, deny the action. |
| 3 | Plain message to the user. Stack trace, query, and internal path stay in the server log. |
| 4 | Log identity, action, target, source, result, and time. |
| 5 | Never log a password, token, key, full card number, or personal data the incident does not need. |
| 6 | Log every authentication event, authorization failure, administrative action, and permission change. |
| 7 | Protect the log. A log an attacker can edit is not evidence. |
| 8 | Encode data entering a log, so nobody can forge a line or inject into the log viewer. |

### §2i Data protection, retention, and privacy (ASVS V14)

| # | Control |
| --- | --- |
| 1 | Classify the data first. The class decides every control below it. |
| 2 | Collect only the fields the feature needs. Record why you hold each one. |
| 3 | Use data only for the purpose you collected it for. A new purpose needs a new decision. |
| 4 | Set a retention period per class. Delete on that schedule, not only on request. |
| 5 | Delete across every copy: database, backup, log, cache, search index, analytics, vendor. |
| 6 | Mask or truncate sensitive data on display, in exports, and in support tools. |
| 7 | Keep sensitive data out of URLs, hidden form fields, and client-side stores. |
| 8 | Send `Cache-Control: no-store` on responses carrying sensitive data. |
| 9 | Wipe temporary files, cache entries, and backups under the same rules as the original. |
| 10 | Sanitize storage media before reuse, return, or disposal. |

Rows 2 to 5 come from GDPR Article 5(1): purpose limitation, data minimization, storage
limitation. The law covers personal data. The practice is correct for every class.
**Data you deleted cannot leak** — retention is the cheapest breach-impact reduction available.

### §2j Communication (ASVS V12)

| # | Control |
| --- | --- |
| 1 | TLS on every connection, including inside the network. Redirect plain HTTP to HTTPS. |
| 2 | TLS 1.2 or later with modern cipher suites. Turn off old protocol versions. |
| 3 | Validate the certificate chain and host name. Never disable that check to make a test pass. |
| 4 | Send `Strict-Transport-Security` with a long lifetime. |
| 5 | Restrict cross-origin access with an explicit allowlist. Never reflect the request origin. |

### §2k Configuration and hardening (ASVS V13)

| # | Control |
| --- | --- |
| 1 | Remove sample code, test accounts, debug endpoints, and unused features before release. |
| 2 | Turn off directory listing and detailed error output in production. |
| 3 | Run each service with the lowest operating-system rights it needs. |
| 4 | Keep the platform, runtime, and container base image patched. |
| 5 | Separate environments. A production secret never appears in development or a test fixture. |
| 6 | Keep configuration in version control. Review a change to it like a change to code. |

### §2l Files and resources (ASVS V5)

| # | Control |
| --- | --- |
| 1 | Validate file type by content, not extension. Store uploads outside the web root. |
| 2 | Generate a new file name on the server. Never build a path from user input. |
| 3 | Cap file size, request size, and upload count. |
| 4 | Scan an uploaded file before any other system reads it. |
| 5 | Serve downloads with an explicit content type and a `Content-Disposition` header. |
| 6 | Close every file, socket, and connection on every path, including the error path. |
| 7 | In an unmanaged language, check every buffer boundary and allocation. Prefer safe functions and types. |

### §2m Requests to other systems

| # | Control |
| --- | --- |
| 1 | Never fetch a user-supplied URL without a host and scheme allowlist. This is SSRF, now inside A01:2025. |
| 2 | Block internal address ranges, loopback, and the cloud metadata endpoint. |
| 3 | Do not follow a redirect into a host the allowlist does not name. |
| 4 | Set a timeout, size cap, and retry limit on every outbound call. |
| 5 | Authenticate service to service. A request from inside the network proves nothing. |

---

## §3 OWASP Top 10:2025

Ranked from about 2.8 million applications and about 589 weakness types. Eight categories come
from data, two from a community survey. Announced November 2025, finalized 2026. Use these
names in review comments and issue titles — a shared name makes a bug class searchable.

| # | Risk | What it is | Fix lives in |
| --- | --- | --- | --- |
| A01 | **Broken access control** | A user reaches data or an action outside their permission. SSRF now sits here. | §2e, §2m, §1a.3, §1a.6 |
| A02 | **Security misconfiguration** | A default account, open bucket, debug endpoint, verbose error, or unpatched feature stays enabled. | §2k, §1b.2, §1b.5 |
| A03 | **Software supply chain failures** | A dependency, build tool, plugin, or pipeline step brings in unvetted code. New in 2025, wider than the old "vulnerable components". | §5 |
| A04 | **Cryptographic failures** | Sensitive data leaks unencrypted, weakly encrypted, or in the clear. | §2f, §2i, §2j |
| A05 | **Injection** | Untrusted input runs as code or query. SQL, NoSQL, command, LDAP, and XSS. | §2a, §2b |
| A06 | **Insecure design** | The flaw is in the design. Correct code cannot repair a missing control. | §1, threat modeling in §5c.1 |
| A07 | **Authentication failures** | Credential stuffing, weak or default passwords, broken sessions, missing MFA. | §2c, §2d |
| A08 | **Software or data integrity failures** | Code or data trusted with no check of origin. Unsafe deserialization, unsigned updates. | §5, §2a.7 |
| A09 | **Security logging and alerting failures** | An attack succeeds unseen. The 2025 rename puts the weight on the alert. | §2h, §6 |
| A10 | **Mishandling of exceptional conditions** | The error path swallows the failure, fails open, or leaks internal detail. New in 2025. | §2h, §1a.2 |

**Companion list:** the 2025 CWE Top 25 ranks the individual weaknesses behind these
categories, from 39,080 CVE records. XSS (CWE-79) first, SQL injection (CWE-89) second, CSRF
(CWE-352) third. OWASP steers design. CWE steers testing.

---

## §4 OWASP Top 10 for LLM applications (2025)

A separate threat model, not a subset of §3. A model reads instructions and data on the same
channel, so the old boundary between code and input does not exist. Read this for any feature
that sends a prompt, gives a model a tool, or puts model output into another system.

| # | Risk | What it is | What prevents it |
| --- | --- | --- | --- |
| LLM01 | **Prompt injection** | Text in a document, page, email, or tool result instructs the model, and it obeys. Direct comes from the user, indirect from content the model reads. | Treat every tool result and retrieved document as data, never instruction. Ask a human before any side effect. |
| LLM02 | **Sensitive information disclosure** | The model reveals a secret, personal data, or proprietary content from context, training, or the index. | Keep secrets out of context. Give a scoped credential, not a raw key. Filter output as well as input. |
| LLM03 | **Supply chain** | A poisoned model file, adapter, plugin, or tool server enters the stack. Some model formats run code on load. | §5 applies to models and tools, not only packages. Pin the source. Prefer a safe serialization format. |
| LLM04 | **Data and model poisoning** | Crafted data planted in training, fine-tuning, or a retrieval corpus changes behavior later. | Control who can write to a corpus. Track lineage. Test against a held-out behavior set after every update. |
| LLM05 | **Improper output handling** | Model output reaches a shell, query, browser, or file path unvalidated. The model becomes the injection vector. | Validate model output at the consumer like untrusted user input. Encode for the destination, per §2b. |
| LLM06 | **Excessive agency** | The model holds more tools, permission, or autonomy than the task needs. | Least privilege for tools. Narrowest tool, narrowest scope. Human approval for anything irreversible. |
| LLM07 | **System prompt leakage** | Somebody extracts the system prompt, and it held a credential or a rule the design depended on. | Never put a secret or authorization rule in a prompt. Enforce in code — open design (§1a.4) applies to prompts. |
| LLM08 | **Vector and embedding weaknesses** | Retrieval leaks across tenants, or embeds hostile content that steers the model later. | Partition the index per tenant. Same access control on retrieval as on the source. Sanitize on ingest. |
| LLM09 | **Misinformation** | The model states something false with confidence, and a person or system acts on it. | Cite the source. Verify a factual claim before it triggers an action. Show what the model is unsure about. |
| LLM10 | **Unbounded consumption** | Uncontrolled inference cost, token use, or a recursive agent loop drains budget and service. | Cap tokens, tool calls, loop depth, and spend per session. Alert on the cost curve. |

NIST SP 800-218A extends §5 to generative AI and dual-use foundation models. Same four practice
groups, plus tasks for training data, model artifacts, lineage, and post-release monitoring.

---

## §5 Supply chain & secure SDLC

Supply chain failures entered the OWASP Top 10 at A03 in 2025. This section is the answer.

### §5a Framework — NIST SP 800-218 (SSDF)

| Group | Name | Covers |
| --- | --- | --- |
| **PO** | Prepare the organization | People, roles, tooling, and security requirements for every product. |
| **PS** | Protect the software | Protect code, build, and release from tampering. Keep reproducible artifacts. |
| **PW** | Produce well-secured software | Design review, threat modeling, secure coding, code review, testing. |
| **RV** | Respond to vulnerabilities | Find, fix, disclose. Then fix the root cause so the class does not return. |

### §5b Dependencies and provenance

| # | Practice | Demands |
| --- | --- | --- |
| 1 | **Know what you ship** | Inventory every direct and transitive dependency. Generate an SBOM per release, so "are we affected" takes minutes. |
| 2 | **Pin what you build** | Commit the lockfile. Pin by digest where the registry supports it. Never resolve a floating version at deploy time. |
| 3 | **Check the name** | Read the package name character by character. A typosquat, a scope swap, and an AI-invented package name all install without complaint. |
| 4 | **Judge the source** | Prefer a public repository, a recent release, a named maintainer, and a reproducible build. |
| 5 | **Limit install-time code** | A package install runs code. Turn off post-install scripts by default. Install from the lockfile in the pipeline. |
| 6 | **Scan continuously** | Composition analysis on every build, and again on a schedule. A new advisory can land against unchanged code. |
| 7 | **Sign and verify** | Sign what you publish. Verify the signature of what you consume. |
| 8 | **Track provenance** | SLSA build levels: L1 produces provenance, L2 has the platform sign it, L3 hardens against tampering between builds. Aim for L2 or higher. |

### §5c Checks in the pipeline

| # | Practice | Demands |
| --- | --- | --- |
| 1 | **Threat model the change** | Before a feature touching authentication, money, or personal data, write down who attacks it and how. |
| 2 | **Static analysis** | SAST on every commit. Fail the build on a high-severity finding. |
| 3 | **Secret scanning** | Block a commit carrying a credential. Scan history too. |
| 4 | **Dynamic testing** | DAST against a running staging build before release. |
| 5 | **Security unit tests** | A test per fixed vulnerability, so the bug cannot return in silence. |
| 6 | **Review with a security eye** | A change to authentication, authorization, cryptography, or a dependency needs a second reader who knows §2. |
| 7 | **Reproducible builds** | Build from a clean, versioned environment. A build that works on one machine cannot be audited. |
| 8 | **Separate build and deploy rights** | The account that builds must not be the account that approves the release. |

---

## §6 Run, detect, and respond

| # | Practice | Demands |
| --- | --- | --- |
| 1 | **Alert, not only log** | Alert on an authentication spike, an authorization failure burst, a new admin account, an unexpected outbound connection. |
| 2 | **Audit trail** | Who did what and when, for every administrative action and every access to sensitive data. |
| 3 | **Rate limiting and quotas** | Bound abuse and cost at the boundary. Degrade on purpose instead of falling over. |
| 4 | **Patch on a clock** | Fix deadlines by severity, exceptions tracked. A known-exploited weakness is an incident, not a ticket. |
| 5 | **Rotate credentials** | On a schedule, and immediately after a person leaves or a secret leaks. |
| 6 | **Test the backup** | A restore nobody has run is not a backup. Keep one copy offline. |
| 7 | **Phased rollout** | Flag or canary with monitoring, so a bad change is caught at 1% of traffic. |
| 8 | **Tested rollback** | Exercise it before you need it. An untested rollback is not a mitigation. |
| 9 | **Incident response plan** | Who declares, who talks to customers, how evidence is kept. Rehearse it. |
| 10 | **Blameless review** | Ask what made the mistake possible, fix that, publish what changed. |
| 11 | **Vulnerability disclosure** | Publish a way for an outsider to report a flaw, and answer it. A researcher with no channel goes public. |

---

## §7 When principles conflict

| Conflict | Ruling |
| --- | --- |
| Least privilege (§1a.6) wants a narrow grant. Psychological acceptability (§1a.8) wants low friction. | **Narrow the grant, not the friction.** Make correct access easy to obtain. Never widen access to remove a prompt. |
| Defense in depth (§1b.4) wants more layers. Economy of mechanism (§1a.1) wants the simplest design. | **Layer at the boundary, simplify behind it.** Check where trust changes, not inside every internal call. |
| Complete mediation (§1a.3) wants a check per request. Performance wants a cache. | **Cache the data, not the decision.** Never cache the answer past the request that asked. |
| Fail-safe defaults (§1a.2) want denial on error. Availability wants the service up. | **Deny the request, not the service.** A failed check rejects one action. |
| A minimal attack surface (§1b.5) wants fewer features. A real user need wants the feature. | **Ship it on purpose, delete what it replaces.** Attack surface grows from what people forget. |
| An LLM feature needs broad tool access (§4 LLM06). Least privilege wants a narrow grant. | **Narrow the tool, widen the prompt.** One specific tool with a bounded scope, not a general tool and a warning. |
| A prompt guardrail is quick to write. Open design (§1a.4) says secrecy is not a control. | **Enforce in code, remind in the prompt.** A rule living only in a prompt is bypassed by LLM01 and leaked by LLM07. |
| A fix needs a major version bump. Stability wants the pinned version. | **Take the fix now, stage the churn.** Ship a branch carrying only the security fix. |
| Detection (§3 A09) wants detail in the log. Privacy (§2h.5) wants less. | **Log the actor and the action, never the payload.** An identifier and a timestamp rebuild an incident. |
| Transparency (§1b.12) wants the advisory published. Caution says it helps an attacker. | **Publish after the fix is available, and publish anyway.** Silence protects nobody but the vendor. |
| A short deadline wants the merge. Security review (§5c.6) wants a second reader. | **The review is the feature.** A change to authentication, authorization, or cryptography waits for a reader. |

**Tiebreaker:** take the reading that still holds while somebody attacks the system, not only
while everybody uses it correctly. A control that works only when nobody tries to break it is
not a control.

---

## How to use

1. Check every section. A least-privilege API with no dependency scanning still fails §5.
2. §1 is judgment. **§2 is the line-level checklist.** §3 and §4 are the failure vocabulary.
3. If a model reads untrusted content or holds a tool, §4 is not optional. §2 and §3 do not cover it.
4. §7 rules a recurring conflict. Extend it when a new one returns.
5. Passing every row does not make a system secure. **No security guarantee** (§1b.11) applies
   to this document too.

**Other lenses.** Engineering asks whether it can be changed safely. UI/UX asks whether a person
can use it. A control nobody can operate fails in production — read §1a.8 beside the UI/UX Rulebook, section 1.5 and section 7d.

---

## Sources

| § | Source |
| --- | --- |
| Goals | ISO/IEC 25010:2023, security characteristic |
| §1a | Saltzer and Schroeder, *The Protection of Information in Computer Systems*, 1975 |
| §1b | [CISA secure by design](https://www.cisa.gov/resources-tools/resources/secure-by-design) (2023, updated 2024), NIST SP 800-207 (zero trust) |
| §2 | [OWASP ASVS 5.0](https://github.com/OWASP/ASVS) (May 2025), [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/), [Proactive Controls v4](https://top10proactive.owasp.org/) |
| §2c | [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html), [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) |
| §2i | [GDPR Article 5](https://gdpr-info.eu/art-5-gdpr/), [NIST SP 800-88 Rev. 1](https://csrc.nist.gov/pubs/sp/800/88/r1/final) |
| §3 | [OWASP Top 10:2025](https://owasp.org/Top10/2025/), [2025 CWE Top 25](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html) |
| §4 | [OWASP Top 10 for LLM Applications 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/), NIST SP 800-218A |
| §5 | [NIST SP 800-218 SSDF](https://csrc.nist.gov/projects/ssdf), [SLSA](https://slsa.dev/) |
| §6 | CISA Known Exploited Vulnerabilities catalog, ISO/IEC 29147 (vulnerability disclosure) |

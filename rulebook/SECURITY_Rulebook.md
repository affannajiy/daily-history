# Security Rulebook

A pure reference: security-design principles, reduced to *what the principle is* and a
one-line description. No app-specific inventory, no record of what any one project already
does about them — that belongs in that project's own posture doc (e.g. `SECURITY.md`) and
changelog. Drop this file into any project; it costs no tokens beyond what it takes to read
the tables.

Three layers, answering different questions:

| | Section | Question it answers |
| --- | --- | --- |
| **§1** | 7 principles of secure design | *At design time* — how do you shape a system so insecurity is the harder path? |
| **§2** | OWASP foundational security principles | *Underneath §1* — the older, broader vocabulary §1 is built from, plus terms §1 doesn't cover. |
| **§2a** | OWASP Secure Coding Practices checklist | *At the keyboard* — the 200-odd concrete coding controls the principles cash out into. |
| **§3** | Secure SDLC & production practices | *In the pipeline* — how the principles get enforced mechanically, before and at deploy. |

---

## §1 The 7 principles of secure design

| # | Principle | What it demands |
| --- | --- | --- |
| 1 | **Security as code** | Security policy is version-controlled, tested, and enforced in CI/CD — not a manual checklist run once. |
| 2 | **Secure defaults** | The out-of-the-box configuration is the most secure one the system can ship with; opting *out* of safety takes a deliberate act. |
| 3 | **Least privilege** | Grant only the access a task needs, for only as long as it needs it. |
| 4 | **Separation of duties** | No single actor or credential can complete a sensitive action alone — critical steps need independent approval. |
| 5 | **Minimize attack surface area** | Every endpoint, feature, and open port is a liability. Remove what isn't used; don't build what isn't needed. |
| 6 | **Complete mediation** | Re-check authorization on *every* request for a resource — never cache a permission decision as evergreen. |
| 7 | **Fail securely** | On error, default to the safe state (deny, not permit) — a broken check must not become an open door. |

---

## §2 OWASP foundational security principles

The wider vocabulary §1 draws from. Where a term restates §1, it's marked **†** and kept
short — §1 has the fuller treatment.

| # | Principle | What it means |
| --- | --- | --- |
| 1 | **Security by Design** | Security requirements are gathered and designed for up front, not patched on after the fact. |
| 2 | **Security by Default†** | Same as §1.2 — the default configuration is the safest one. |
| 3 | **No Security Guarantee** | No system is 100% secure. The goal is to raise attacker cost and lower reward, not reach an unreachable "done". |
| 4 | **Defense in Depth** | Layer independent controls so one failure doesn't equal total compromise — each layer is a fallback for the last. |
| 5 | **Fail Safe†** | Same as §1.7 — an error state defaults to denying access, not granting it. |
| 6 | **Least Privilege†** | Same as §1.3. |
| 7 | **Compartmentalize** | Split access on a need-to-know basis rather than all-or-nothing — but not so finely the system becomes unmanageable. |
| 8 | **Separation of Duties†** | Same as §1.4. |
| 9 | **Economy of Mechanism** | Prefer the simplest correct implementation — complexity is where vulnerabilities hide and reviews fail. |
| 10 | **Complete Mediation†** | Same as §1.6. |
| 11 | **Open Design** | Security must not depend on the design being secret — only on keys/credentials staying secret. Security through obscurity is not a control. |
| 12 | **Least Common Mechanism** | Don't share a resource or code path across users/processes at different privilege levels — shared mechanisms are escalation paths. |
| 13 | **Psychological Acceptability** | A control that's too much friction gets worked around. Security must be usable enough that people don't defeat it to get their job done. |
| 14 | **Usability and Manageability** | Configuration and administration of a control should be simple and standard — obscure setup is itself a source of misconfiguration. |
| 15 | **Secure the Weakest Link** | System resilience is bounded by its weakest component. Find it and fix it first — it's where an attacker will start too. |
| 16 | **Leveraging Existing Components** | Reuse vetted, patched, widely-reviewed components over rolling your own — "many eyes" and existing patches beat a novel implementation. |

---

## §2a OWASP Secure Coding Practices checklist

Technology-agnostic coding controls. Source: *OWASP Secure Coding Practices Quick
Reference Guide*, v2.0, November 2010, © The OWASP Foundation, released under
[CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) — the wording below is
condensed, so this section is a derivative and carries the same licence. Item numbers are the source's
own — cite them as `SCP-n`. Two quirks kept as found: `[202]` appears twice (Memory
Management and General Coding), and Memory/General assume an unmanaged language.

**Not every row applies to every project.** A static site has no session, no DB and
no file upload; those categories are then *not applicable*, which is a different
claim from *satisfied*. Say which one in the project's own posture doc.

Recurring theme across all 14: **validation, encoding, authn, authz and crypto all
happen on a trusted system — the server. Client-side controls are UX, not security**;
a proxy or packet tool bypasses the interface entirely, and Flash/Java/compiled
client objects decompile.

### Input Validation

| # | Practice |
| --- | --- |
| 1 | Validate on a trusted system (the server). |
| 2 | Classify every data source trusted/untrusted; validate all untrusted (DBs, file streams included). |
| 3 | One centralized validation routine. |
| 4 | Specify a character set (e.g. UTF-8) for every input source. |
| 5 | Canonicalize to a common character set *before* validating. |
| 6 | Any validation failure rejects the input. |
| 7 | If UTF-8 extended sets are supported, validate *after* decoding. |
| 8 | Validate all client-supplied data — parameters, URLs, header and cookie names/values, and automated postbacks from JS/Flash/embedded code. |
| 9 | Header values in requests *and* responses: ASCII only. |
| 10 | Validate data arriving from redirects — an attacker can post straight to the redirect target and skip the pre-redirect checks. |
| 11 | Validate expected type. |
| 12 | Validate range. |
| 13 | Validate length. |
| 14 | Whitelist allowed characters wherever possible. |
| 15 | If a hazardous character must be allowed, add output encoding, task-specific APIs, and account for every downstream use of that data. Common ones: `< > " ' % ( ) & + \ \' \"` |
| 16 | Check discretely if the standard routine can't: null bytes (`%00`); newlines (`%0d %0a \r \n`); dot-dot-slash (`../ ..\`) including alternate encodings like `%c0%ae%c0%ae/` — canonicalize to defeat double encoding. |

### Output Encoding

| # | Practice |
| --- | --- |
| 17 | Encode on a trusted system. |
| 18 | One standard, tested routine per outbound encoding type. |
| 19 | Contextually encode all data returned to the client that came from outside the trust boundary. HTML entity encoding is one case, not all cases. |
| 20 | Encode every character not known safe for the target interpreter. |
| 21 | Contextually sanitize untrusted data going into SQL, XML and LDAP. |
| 22 | Sanitize untrusted data going into OS commands. |

### Authentication and Password Management

| # | Practice |
| --- | --- |
| 23 | Authenticate every page and resource except those deliberately public. |
| 24 | Enforce authentication on a trusted system. |
| 25 | Use standard, tested authentication services. |
| 26 | One centralized implementation, including libraries calling external services. |
| 27 | Keep authentication logic separate from the requested resource; redirect to and from the central control. |
| 28 | Authentication fails securely. |
| 29 | Admin and account-management functions at least as secure as primary auth. |
| 30 | Store only cryptographically strong one-way *salted* hashes; the password/key store is writable only by the application. Avoid MD5. |
| 31 | Hash on a trusted system. |
| 32 | Validate credentials only after *all* input is collected — especially in sequential authentication. |
| 33 | Failure responses never say which field was wrong ("Invalid username and/or password"), and must be identical in display *and* source. |
| 34 | Authenticate connections to external systems handling sensitive data or functions. |
| 35 | Credentials for external services: encrypted, stored on a trusted system. **Source code is not a secure location.** |
| 36 | Transmit credentials by HTTP POST only. |
| 37 | Send non-temporary passwords only over an encrypted connection or as encrypted data. |
| 38 | Enforce complexity per policy or regulation, sufficient for the deployed threat environment. |
| 39 | Enforce length per policy. Eight is common, 16 better; pass phrases better still. |
| 40 | Obscure entry on screen (`input type="password"`). |
| 41 | Disable the account after N invalid attempts (≈5), long enough to deter brute force but not long enough to be a DoS. |
| 42 | Reset and change operations need the same controls as creation and authentication. |
| 43 | Reset questions must permit sufficiently random answers ("favorite book" fails — the common answer dominates). |
| 44 | Email-based reset goes only to a pre-registered address, carrying a temporary link/password. |
| 45 | Temporary passwords and links expire quickly. |
| 46 | Force a change on first use of a temporary password. |
| 47 | Notify the user when a reset occurs. |
| 48 | Prevent re-use. |
| 49 | A password is unchangeable for its first day — blocks cycling around the re-use rule. |
| 50 | Enforce changes per policy; the interval is administratively controlled. |
| 51 | No "remember me" on password fields. |
| 52 | Report last use, successful or not, at the next successful login. |
| 53 | Monitor for one password tried across many accounts — the pattern that walks around per-account lockout. |
| 54 | Change or disable every vendor default account and password. |
| 55 | Re-authenticate before critical operations. |
| 56 | Multi-factor for high-value or highly sensitive accounts. |
| 57 | Third-party authentication code gets read carefully before it is trusted. |

### Session Management

| # | Practice |
| --- | --- |
| 58 | Use the server/framework session controls; accept only their identifiers as valid. |
| 59 | Create session identifiers on a trusted system. |
| 60 | Well-vetted algorithms, sufficiently random identifiers. |
| 61 | Scope authenticated-session cookies to the narrowest correct domain and path. |
| 62 | Logout fully terminates the session or connection. |
| 63 | Logout reachable from every authorization-protected page. |
| 64 | Inactivity timeout as short as the business allows — hours at most. |
| 65 | No persistent logins; terminate periodically even while active, with enough notice to the user. |
| 66 | A session that existed before login is closed; a new one is issued after. |
| 67 | New identifier on any re-authentication. |
| 68 | No concurrent logins on one user ID. |
| 69 | Never expose identifiers in URLs, errors or logs — HTTP cookie header only, never a GET parameter. |
| 70 | Access-control server-side session data against other users of the server. |
| 71 | Rotate the identifier periodically and deactivate the old one. |
| 72 | New identifier when connection security changes HTTP→HTTPS. Better: be HTTPS throughout. |
| 73 | Supplement sessions with per-session strong random tokens for sensitive server-side operations — this is the CSRF defence. |
| 74 | For critical operations, make those tokens **per-request**, not per-session. |
| 75 | `secure` attribute on cookies sent over TLS. |
| 76 | `HttpOnly` unless a client script genuinely must read the value. |

### Access Control

| # | Practice |
| --- | --- |
| 77 | Base authorization decisions only on trusted system objects (server-side session objects). |
| 78 | One site-wide authorization component, including libraries calling external services. |
| 79 | Access control fails securely. |
| 80 | Deny everything if the security configuration cannot be read. |
| 81 | Authorize *every* request — server-side scripts, includes, AJAX and rich-client calls included. |
| 82 | Keep privileged logic separate from the rest of the code. |
| 83 | Restrict files and resources — including those outside direct application control — to authorized users. |
| 84 | Restrict protected URLs. |
| 85 | Restrict protected functions. |
| 86 | Restrict direct object references. |
| 87 | Restrict services. |
| 88 | Restrict application data. |
| 89 | Restrict the user/data attributes and policy information the access controls themselves consume. |
| 90 | Restrict security-relevant configuration. |
| 91 | Server-side rules and their presentation-layer representation must match. |
| 92 | Client-stored state gets encryption *and* server-side integrity checking, to catch tampering. |
| 93 | Enforce application flow against the business rules. |
| 94 | Cap transactions per user or device per period — above real business need, below automated-abuse rates. |
| 95 | `Referer` is a supplemental check only; it spoofs. |
| 96 | On long sessions, re-validate authorization periodically; on change, log the user out and force re-auth. |
| 97 | Audit accounts and disable unused ones (e.g. 30 days past password expiry). |
| 98 | Support disabling accounts and killing sessions when authorization ceases — role change, employment change, process change. |
| 99 | Service and system-to-system accounts get least privilege. |
| 100 | Write an Access Control Policy: business rules, data types, authorization criteria, and the access requirements of both data and system resources. |

### Cryptographic Practices

| # | Practice |
| --- | --- |
| 101 | Any crypto protecting secrets *from the user* runs on a trusted system. |
| 102 | Protect master secrets from unauthorized access. |
| 103 | Cryptographic modules fail securely. |
| 104 | Every value meant to be unguessable — numbers, file names, GUIDs, strings — comes from the module's approved RNG. |
| 105 | Modules compliant with FIPS 140-2 or equivalent. |
| 106 | Have a written policy and process for key management. |

### Error Handling and Logging

| # | Practice |
| --- | --- |
| 107 | No sensitive information in error responses — no system detail, session identifiers or account data. |
| 108 | No debug output or stack traces in handlers. |
| 109 | Generic messages, custom error pages. |
| 110 | The application handles its own errors; don't lean on server configuration. |
| 111 | Free allocated memory on the error path. |
| 112 | Security-control error handling denies by default. |
| 113 | Logging controls on a trusted system. |
| 114 | Log both success and failure of the specified security events. |
| 115 | Include the log event data: trusted timestamp, severity, security-event tag, account identity, source IP, outcome, description. |
| 116 | Untrusted data in a log entry must not execute in whatever reads the log. |
| 117 | Restrict log access to authorized individuals. |
| 118 | One master logging routine. |
| 119 | No sensitive data in logs — no session identifiers, no passwords, no needless system detail. |
| 120 | A mechanism exists to actually analyze the logs. |
| 121 | Log input validation failures. |
| 122 | Log authentication attempts, especially failures. |
| 123 | Log access-control failures. |
| 124 | Log apparent tampering, including unexpected state-data changes. |
| 125 | Log attempts using invalid or expired session tokens. |
| 126 | Log system exceptions. |
| 127 | Log administrative functions, including security-configuration changes. |
| 128 | Log backend TLS connection failures. |
| 129 | Log cryptographic module failures. |
| 130 | Hash log entries to validate their integrity. |

### Data Protection

| # | Practice |
| --- | --- |
| 131 | Least privilege: only the functionality, data and system information the task requires. |
| 132 | Protect cached and temporary copies of sensitive data on the server; purge them as soon as they're not needed. |
| 133 | Encrypt highly sensitive stored data — authentication verification data included — even server-side. |
| 134 | Prevent server-side source code from being downloaded. |
| 135 | Never store passwords, connection strings or other secrets client-side in clear text or any non-cryptographic form. Viewstate, Flash and compiled code are not hiding places. |
| 136 | Strip comments from user-accessible production code — they leak backend detail. |
| 137 | Remove unnecessary application and system documentation from what ships. |
| 138 | No sensitive information in GET parameters. |
| 139 | Disable autocomplete on forms carrying sensitive data, authentication included. |
| 140 | Disable client caching on sensitive pages: `Cache-Control: no-store`, optionally with `Pragma: no-cache` for HTTP/1.0. |
| 141 | Support removal of sensitive data once it's no longer required. |
| 142 | Access-control sensitive server-side data — cached data and temporary files included. |

### Communication Security

| # | Practice |
| --- | --- |
| 143 | Encrypt transmission of all sensitive information — TLS for the connection, optionally discrete encryption on top. |
| 144 | Certificates valid, correct domain, unexpired, intermediates installed. |
| 145 | A failed TLS connection never falls back to plaintext. |
| 146 | TLS for all authenticated content and all other sensitive information. |
| 147 | TLS to external systems handling sensitive data or functions. |
| 148 | One standard TLS implementation, configured once, configured right. |
| 149 | Specify character encoding on every connection. |
| 150 | Strip sensitive parameters from the `Referer` when linking off-site. |

### System Configuration

| # | Practice |
| --- | --- |
| 151 | Servers, frameworks and components on the latest approved version. |
| 152 | All patches applied for the version in use. |
| 153 | Directory listings off. |
| 154 | Web server, process and service accounts at least privilege. |
| 155 | Fail securely on exception. |
| 156 | Remove unnecessary functionality and files. |
| 157 | Remove test code and anything not intended for production before deploy. |
| 158 | Don't leak the directory structure through `robots.txt` — put non-public directories under one isolated parent and `Disallow` the parent, not each child. |
| 159 | Define which HTTP methods the application supports, and whether handling differs per page. |
| 160 | Disable unnecessary methods (WebDAV extensions and similar). If a file-handling method is required, put a well-vetted authentication mechanism in front of it. |
| 161 | If the server handles both HTTP 1.0 and 1.1, configure them alike or understand every difference (extended-method handling especially). |
| 162 | Strip OS, server-version and framework detail from response headers. |
| 163 | The security-configuration store can be output human-readable, for auditing. |
| 164 | Register system components and software in an asset management system. |
| 165 | Isolate development environments from the production network; access for authorized dev/test groups only. Dev is configured less securely and is used as the way in. |
| 166 | A change-control system records code changes in both development and production. |

### Database Security

| # | Practice |
| --- | --- |
| 167 | Strongly typed parameterized queries. |
| 168 | Input validation and output encoding, meta characters included; on failure, do not run the command. |
| 169 | Variables strongly typed. |
| 170 | Lowest possible privilege for database access. |
| 171 | Secure credentials for database access. |
| 172 | Connection strings never hard-coded — separate config file, on a trusted system, encrypted. |
| 173 | Stored procedures abstract data access, so permissions on base tables can be removed. |
| 174 | Close the connection as early as possible. |
| 175 | Change or remove every default DBA password; strong passphrases or multi-factor. |
| 176 | Turn off unnecessary database functionality — surface-area reduction; install only the required features. |
| 177 | Remove default vendor content (sample schemas). |
| 178 | Disable default accounts not needed by the business. |
| 179 | Different credentials per trust distinction — user, read-only user, guest, administrator. |

### File Management

| # | Practice |
| --- | --- |
| 180 | Never pass user data straight into a dynamic include. |
| 181 | Require authentication before upload. |
| 182 | Limit uploadable types to those with a business purpose. |
| 183 | Verify type by **file header**, not extension. |
| 184 | Don't store uploads in the application's web context — content server or database instead. |
| 185 | Prevent or restrict upload of anything the web server might interpret. |
| 186 | Execution privileges off on upload directories. |
| 187 | On UNIX, mount the upload target as a logical drive or use a chrooted environment. |
| 188 | Reference existing files through a whitelist of names and types; a non-matching parameter is rejected or falls back to a hard-coded default. |
| 189 | Never pass user data into a dynamic redirect. If unavoidable, accept only validated relative paths. |
| 190 | Never pass directory or file paths — use index values mapped to a predefined list. |
| 191 | Never send an absolute file path to the client. |
| 192 | Application files and resources are read-only. |
| 193 | Scan uploads for viruses and malware. |

### Memory Management

Unmanaged-language territory. In a managed runtime most of this is the runtime's job —
206, 199 and 194 still apply.

| # | Practice |
| --- | --- |
| 194 | Input and output control on untrusted data. |
| 195 | Double-check the buffer really is the size claimed. |
| 196 | With byte-count copies like `strncpy()`: if destination size equals source size, the result may not be NULL-terminated. |
| 197 | Check buffer boundaries when the call is in a loop — no writing past the allocation. |
| 198 | Truncate input strings to a sane length before any copy or concatenate. |
| 199 | Close resources explicitly — connections, file handles. Don't wait for the collector. |
| 200 | Non-executable stacks where available. |
| 201 | Avoid known-vulnerable functions (`printf`, `strcat`, `strcpy`, …). |
| 202 | Free allocated memory on function completion **and at every exit point**. |

### General Coding Practices

| # | Practice |
| --- | --- |
| 202 | Prefer tested, approved managed code over new unmanaged code for common tasks. *(Source reuses 202 here.)* |
| 203 | Use task-specific built-in APIs for OS tasks. The application never issues commands to the OS directly, least of all through a shell. |
| 204 | Checksums or hashes to verify integrity of interpreted code, libraries, executables and config files. |
| 205 | Locking or a synchronization mechanism against simultaneous requests and race conditions. |
| 206 | Protect shared variables and resources from concurrent access. |
| 207 | Initialize every variable and data store explicitly — at declaration or immediately before first use. |
| 208 | When elevated privileges are required, raise as late as possible and drop as soon as possible. |
| 209 | Know the language's numeric representation: byte-size mismatches, precision, signed/unsigned, truncation, casting, NaN, and over/underflow. |
| 210 | Never pass user data to a dynamic execution function. |
| 211 | Users cannot generate new code or alter existing code. |
| 212 | Review secondary applications, third-party code and libraries for business necessity and safe behaviour — each one is new attack surface. |
| 213 | Safe updating: sign code cryptographically, have the client verify the signature, and transfer over an encrypted channel. |

---

## §3 Secure SDLC & production practices

How §1 and §2 get enforced mechanically — the pipeline and runtime habits that turn a
principle into something that actually happens on every change.

| # | Practice | What it demands |
| --- | --- | --- |
| 1 | **Shift-left scanning** | Run SAST (static analysis) in CI on every commit; run DAST (dynamic/runtime attack simulation) against staging before release. Catch what code review misses. |
| 2 | **Dependency hygiene** | Vet and pin third-party packages; scan for known CVEs in the pipeline, not after an incident. |
| 3 | **Secrets management** | Credentials and keys live in a secrets manager, are rotated regularly, and are never in source control or logs. |
| 4 | **Encryption everywhere** | Encrypt sensitive data at rest and in transit by default — not opt-in per feature. |
| 5 | **Rate limiting & throttling** | Bound abuse and cost at the API boundary; degrade gracefully rather than falling over under load or attack. |
| 6 | **Input validation at the boundary** | Fail fast on malformed, oversized, or malicious input before it reaches business logic. |
| 7 | **Structured, PII-safe logging** | Log enough to reconstruct an incident (correlation IDs, timestamps, actor) without ever logging secrets or personal data. |
| 8 | **Audit trails** | Record who did what, when, for every administrative action and every access to sensitive data. |
| 9 | **Phased rollout** | Ship behind canaries or feature flags with real monitoring, so a bad change is caught at 1% of traffic, not 100%. |
| 10 | **Tested rollback** | A rollback path must be exercised before it's needed — an untested rollback is not a real mitigation. |

---

## §4 When principles conflict

| Conflict | Ruling |
| --- | --- |
| Least privilege (§1.3) wants narrow access; usability (§2.13) wants low friction | **Narrow the grant, not the friction.** Make the *right* access effortless; never widen access to avoid a prompt. |
| Defense in depth (§2.4) wants more layers; economy of mechanism (§2.9) wants the simplest design | **Layer at the boundary, simplify behind it.** Add checks where trust changes (edge, auth), not inside every internal call. |
| Complete mediation (§1.6) wants a check on every request; performance wants caching | **Cache the data, not the decision.** Cache what a permission check reads; never cache the yes/no result past the request that asked it. |
| Fail securely (§1.7) wants to deny on error; availability wants the system to stay up | **Deny the request, not the service.** A failed auth check rejects that one action — it must not take the whole system down. |
| Secure defaults (§1.2) want the safest config; open design (§2.11) says don't rely on secrecy | **Not a real conflict — secure defaults are about behavior, not hidden implementation.** Ship the safe default *and* publish how it works. |
| Minimize attack surface (§1.5) wants fewer features; a real user need wants the feature | **Ship it deliberately, not by omission.** Build it, and delete what it replaces — attack surface grows from what's forgotten, not from what's used. |

**Tiebreaker in every case:** favour whichever reading still holds when the system is under
active attack, not just under normal use. A control that only works when nobody is trying to
break it isn't a control.

---

## How to use this document

1. Find the principles a change touches. Check **every section** — a change can satisfy
   §1's design-time principles and still violate an SDLC practice in §3 (e.g. a least-privilege
   API with no dependency scanning behind it). §1/§2 are judgment; **§2a is the line-level
   checklist** — go there when reviewing actual code, and mark a category *not applicable*
   rather than *passed* when the project has no such surface.
2. This file is pure reference — *what the principles are*, nothing about how any one project
   already satisfies them. Concrete, enforceable rules and current posture for a specific
   codebase belong in that project's own security doc (e.g. `SECURITY.md`); history of what
   changed and why belongs in its changelog. Keep those two out of this file, or every future
   read pays for content the review doesn't need.
3. When a principle conflicts with velocity, convenience, or cost, favour the principle — §4
   gives the ruling for the recurring conflicts; extend the table when a new one repeats.
4. This file is a checklist for *judgment*, not a compliance certificate. Passing every row
   does not mean a system is secure — §2.3 (No Security Guarantee) applies to this document too.

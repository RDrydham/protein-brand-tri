# PHP Code Review Report
**Project:** TRI Performance Website — PHP Backend Migration  
**Reviewed:** `config.php`, `submit-lead.php`, `.htaccess`  
**Reviewer:** Senior PHP Code Reviewer / QA Engineer  
**Date:** 2026-06-11  
**PHP Target:** PHP 8.x, Apache, Hostinger Premium Shared Hosting

---

## CRITICAL Issues (must fix before deploying)

- **[CRITICAL-1] `.htaccess` — Two separate `Options` directives silently re-enable directory listing**
  - **File:** `.htaccess`, Lines 38–44 (original)
  - **Problem:** `Options -Indexes` on one line, then `Options +FollowSymLinks` on a separate line. In Apache, each bare `Options` directive **replaces** the previously set options for that context. The second `Options +FollowSymLinks` does NOT carry forward `-Indexes` — it resets options and only applies `FollowSymLinks`, effectively **re-enabling directory listing**. This is a security vulnerability: attackers could browse `/` and see all files.
  - **Fix Applied:** Merged into a single directive: `Options -Indexes +FollowSymLinks`

---

## WARNING Issues (should fix)

- **[WARN-1] `submit-lead.php` Line 98 — `FILTER_SANITIZE_EMAIL` is deprecated in PHP 8.1+**
  - **File:** `submit-lead.php`, Line 98 (original)
  - **Problem:** `filter_var($email, FILTER_SANITIZE_EMAIL)` was deprecated in PHP 8.1 and emits deprecation notices on PHP 8.2+. On Hostinger's PHP 8.x, this will log warnings and may break in future PHP versions.
  - **Fix Applied:** Replaced with `preg_replace('/[^a-zA-Z0-9!#$%&\'*+\/=?^_`{|}~.@\-]/', '', $email)` — a manual RFC 5321-compliant email character whitelist.

- **[WARN-2] `submit-lead.php` Line 696 — Weak `rand()` used for MIME boundary token**
  - **File:** `submit-lead.php`, Line 696 (original)
  - **Problem:** `md5(uniqid((string)rand(), true))` uses `rand()`, which is a non-cryptographically secure PRNG. While the MIME boundary token doesn't need to be secret, best practice on PHP 8.x is to use `random_bytes()` which uses the OS CSPRNG.
  - **Fix Applied:** Replaced with `bin2hex(random_bytes(16))` — produces a 32-character hex string with 128 bits of entropy from the OS CSPRNG.

- **[WARN-3] `submit-lead.php` Line 801 — Raw `$email` variable echoed in JSON success message**
  - **File:** `submit-lead.php`, Line 801 (original)
  - **Problem:** `'Your personalised plan has been created and emailed to ' . $email . '!'` — If a front-end JavaScript renders this message as `innerHTML` (common pattern), and the email contains characters like `<`, `>`, `&` (which are technically valid in quoted RFC 5321 local parts), an XSS vector exists. Defence in depth requires all user-sourced data to be escaped before output.
  - **Fix Applied:** Wrapped with `htmlspecialchars($email, ENT_QUOTES, 'UTF-8')`.

---

## INFO (minor suggestions)

- **[INFO-1] `.htaccess` Lines 17–35 — `Order Allow,Deny` is Apache 2.2 syntax**
  - Modern Apache 2.4 (which Hostinger uses) prefers `Require all denied`. The old syntax still works via the `mod_access_compat` compatibility module which Hostinger enables. **Not fixed** — leaving it as-is since Hostinger's Apache 2.4 bundles `mod_access_compat` by default, and the old syntax is safer to use on shared hosting where you cannot guarantee the module set.
  - Recommendation for future: Change `<Files>` blocks to use `Require all denied` if you confirm Apache 2.4 `mod_authz_host` is available.

- **[INFO-2] `submit-lead.php` — `FILTER_SANITIZE_EMAIL` was correctly placed after `FILTER_VALIDATE_EMAIL`**
  - Ordering was logically correct (validate first, then sanitize). The deprecation was the only issue.

- **[INFO-3] `config.php` — Placeholder credentials**
  - `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `WHATSAPP_NUMBER`, and `SITE_URL` all contain placeholder values. These **must** be filled in before deployment. The file is well-documented with instructions. No code changes needed — this is a deployment task.

- **[INFO-4] `submit-lead.php` — `explode(' ', $toName)[0]` for first name extraction**
  - If the sanitized name begins with a space (edge case), `explode()[0]` would return an empty string. The upstream validation `if ($name === '')` already guards against a completely empty name, and `sanitiseText()` trims whitespace. Risk is negligible but worth noting.

- **[INFO-5] `.htaccess` — HTTPS redirect is commented out**
  - Lines 193–195: HTTPS redirect is commented. Remember to **uncomment** this after the SSL certificate is active on Hostinger.

---

## Detailed Findings

### Finding 1 — CRITICAL — `.htaccess` Directory Listing Re-enabled by Split Options

**Location:** `.htaccess`, Lines 38–44 (pre-fix)

```apache
# BEFORE (BUG):
Options -Indexes          # ← disables listing
...
Options +FollowSymLinks   # ← REPLACES the above; listing is RE-ENABLED!
RewriteEngine On
```

**Root Cause:** Apache processes `Options` directives cumulatively only when the directive uses both `+` and `-` consistently. When a bare `Options +FollowSymLinks` appears without `-Indexes`, it sets the options list to ONLY `FollowSymLinks`, discarding the previously set `-Indexes`.

**Fix Applied:**
```apache
# AFTER (FIXED):
Options -Indexes +FollowSymLinks
RewriteEngine On
```

---

### Finding 2 — WARNING — Deprecated `FILTER_SANITIZE_EMAIL`

**Location:** `submit-lead.php`, Line 98 (pre-fix)

```php
// BEFORE (deprecated in PHP 8.1+):
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
```

**Fix Applied:**
```php
// AFTER (RFC 5321 whitelist, PHP 8.x compatible):
$email = preg_replace('/[^a-zA-Z0-9!#$%&\'*+\/=?^_`{|}~.@\-]/', '', $email);
```

---

### Finding 3 — WARNING — Weak PRNG for MIME Boundary

**Location:** `submit-lead.php`, Line 696 (pre-fix)

```php
// BEFORE (weak rand()):
$boundary = '----_TRI_' . md5(uniqid((string)rand(), true));
```

**Fix Applied:**
```php
// AFTER (OS CSPRNG):
$boundary = '----_TRI_' . bin2hex(random_bytes(16));
```

---

### Finding 4 — WARNING — Unsanitized Email in JSON Response Message

**Location:** `submit-lead.php`, Line 801 (pre-fix)

```php
// BEFORE:
'message' => 'Your personalised plan has been created and emailed to ' . $email . '!',
```

**Fix Applied:**
```php
// AFTER:
'message' => 'Your personalised plan has been created and emailed to ' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '!',
```

---

## Checklist Results

### FUNCTIONALITY ✅

| Check | Result |
|---|---|
| Accepts POST fields: name, email, weight, intensity, protein, hydration, bcaa, recovery | ✅ PASS — Lines 74–81 |
| Validates name (required) | ✅ PASS — Line 84 |
| Validates email with `filter_var(FILTER_VALIDATE_EMAIL)` | ✅ PASS — Line 90 |
| Validates weight (numeric, > 0) | ✅ PASS — Lines 76, 93 |
| Elite: protein×2.2, carbs×4.0 | ✅ PASS — Lines 118–121 |
| Medium: protein×1.8, carbs×3.0 | ✅ PASS — Lines 122–125 |
| Regular: protein×1.5, carbs×2.0 | ✅ PASS — Lines 126–129 |
| Fats: weight×0.8 for all intensities | ✅ PASS — Line 135 |
| Calories: (P×4)+(C×4)+(F×9) | ✅ PASS — Lines 136–139 |
| All 6 meals present (Morning Ritual, Breakfast, Lunch, Pre-Workout, Post-Workout, Dinner) | ✅ PASS — Lines 151–252 |
| CSV auto-creates headers on first run | ✅ PASS — Lines 288–312 |
| CSV appends on subsequent runs | ✅ PASS — Lines 315–326 |
| JSON reads existing data and appends | ✅ PASS — Lines 356–399 |
| JSON response: `{success, message, emailSent, diet}` | ✅ PASS — Lines 799–811 |
| CORS: `Access-Control-Allow-Origin: *` | ✅ PASS — Line 27 |
| Content-Type: application/json | ✅ PASS — Line 30 |

### SECURITY ✅ (after fixes)

| Check | Result |
|---|---|
| All user inputs sanitised with `htmlspecialchars()` | ✅ PASS — `sanitiseText()` function Line 53–56 |
| Email validated with `filter_var(FILTER_VALIDATE_EMAIL)` | ✅ PASS — Line 90 |
| `config.php` blocked from web access | ✅ PASS — `.htaccess` Lines 17–20 |
| `leads_backup.json` blocked from web access | ✅ PASS — `.htaccess` Lines 22–25 |
| `TRI_Leads.csv` blocked from web access | ✅ PASS — `.htaccess` Lines 27–30 |
| Directory listing disabled | ✅ FIXED — Single `Options -Indexes +FollowSymLinks` |
| No XSS in email template | ✅ PASS — All `$meal` fields go through `htmlspecialchars()` |
| Error handler does NOT expose server paths to client | ✅ PASS — Lines 823–832 use generic message; paths only go to `error_log()` |
| `FILTER_SANITIZE_EMAIL` deprecated | ✅ FIXED — Replaced with regex whitelist |
| Email in success message escaped | ✅ FIXED — `htmlspecialchars()` applied |

### HOSTINGER COMPATIBILITY ✅

| Check | Result |
|---|---|
| PHP 8.x native functions only (no Composer) | ✅ PASS |
| `mail()` with proper HTML headers | ✅ PASS — Lines 699–734 (multipart/alternative, base64 HTML) |
| Standard Apache mod_rewrite syntax | ✅ PASS |
| Routes: `/about`, `/inside`, `/lab-reports`, `/shop`, `/contact` | ✅ PASS — Lines 67–71 |
| Route: `/` (homepage) | ✅ PASS — Lines 73–76 |
| Route: `POST /api/save-lead` | ✅ PASS — Lines 56–57 |

### EMAIL TEMPLATE ✅

| Check | Result |
|---|---|
| Background colour `#0b0b0c` | ✅ PASS — Line 478 body style, Line 481 table |
| TRI logo present (△ TRI, "The Real Inside") | ✅ PASS — Lines 492–495 |
| 4 stat columns (Protein, Hydration, BCAA, Recovery) | ✅ PASS — Lines 511–543 |
| Meal cards with `#1c1c1e` bg and `#e6a2a4` headings | ✅ PASS — Lines 447–458 |
| Core Habits section present | ✅ PASS — Lines 579–620 |
| WhatsApp CTA button present | ✅ PASS — Lines 629–635 |

### CSV FILE ✅

| Check | Result |
|---|---|
| UTF-8 BOM added on first write | ✅ PASS — Line 299 `"\xEF\xBB\xBF"` |
| Headers: Date & Time, Name, Email, Body Weight (kg), Training Intensity, Protein (g/day), Hydration (L/day), BCAA (g/day), Recovery (hours), Status | ✅ PASS — Lines 300–311 |

---

## Verdict

> **APPROVED** ✅
>
> All 4 issues (1 CRITICAL, 3 WARNING) have been identified and **directly fixed** in the source files.  
> The code is now functionally complete, secure, and compatible with Hostinger PHP 8.x shared hosting.  
>
> **Before deploying, remember to:**
> 1. Fill in real credentials in `config.php` (SMTP, WhatsApp number, site URL)
> 2. Uncomment the HTTPS redirect in `.htaccess` once your SSL certificate is active
> 3. Set `DEBUG_MODE` to `false` in `config.php` (it already is — just confirm)
> 4. Set file permissions on `TRI_Leads.csv` and `leads_backup.json` to `664` once created

<?php
/**
 * ============================================================
 *  TRI Performance — PHP Backend Configuration
 *  UPDATED: 2026-06-11
 * ============================================================
 *
 *  SETUP INSTRUCTIONS (Hostinger):
 *
 *  Step 1 — Create email in hPanel:
 *    Login → Emails → Email Accounts → Create Account
 *    Create: noreply@therealinside.com
 *    Set a strong password, note it down.
 *
 *  Step 2 — Fill in YOUR credentials below (lines marked FILL IN)
 *
 *  Step 3 — Get your server path:
 *    hPanel → Files → File Manager
 *    Look at the path bar at top. It will show something like:
 *    /home/u123456789/public_html
 *    Copy that path and update LEADS_FILE below.
 *
 * ============================================================
 */

// ── Email / SMTP Settings ─────────────────────────────────────
// FILL IN: The email you created on Hostinger
define('SMTP_USER', 'noreply@therealinside.com');  // ← FILL IN YOUR EMAIL

// FILL IN: The password for that email account
define('SMTP_PASS', 'VEDANSH_2004');    // ← FILL IN YOUR PASSWORD

// Hostinger's outgoing SMTP server (do not change)
define('SMTP_HOST', 'smtp.hostinger.com');

// Hostinger uses port 587 (STARTTLS) — do not change
define('SMTP_PORT', 587);

// The "From" address that appears in the customer's inbox
define('FROM_EMAIL', 'noreply@therealinside.com');

// The display name next to the From email
define('FROM_NAME', 'TRI Performance');

// ── Data Storage Paths ────────────────────────────────────────
// FILL IN: Replace with your actual Hostinger server path.
// Find it in hPanel → File Manager → look at the path bar.
// Example: /home/u123456789/public_html
define('LEADS_FILE', '/home/u937080884/domains/therealinside.com/public_html/TRI_Leads.csv');  // ← FILL IN
define('BACKUP_FILE', '/home/u937080884/domains/therealinside.com/public_html/leads_backup.json');  // ← FILL IN

// ── WhatsApp CTA Number ───────────────────────────────────────
// Your WhatsApp number with country code (no + sign)
// India (+91) example: 919876543210
define('WHATSAPP_NUMBER', '919636964462');  // ← FILL IN YOUR NUMBER

// ── Site URL ──────────────────────────────────────────────────
define('SITE_URL', 'https://therealinside.com');

// ── Application Settings ──────────────────────────────────────
// Keep false in production (never show errors to visitors)
define('DEBUG_MODE', false);

// Timezone for timestamps saved in the CSV
define('APP_TIMEZONE', 'Asia/Kolkata');

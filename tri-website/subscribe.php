<?php
// ============================================================
//  TRI Performance — Newsletter Subscribe Handler
//  Endpoint: POST /api/subscribe
//  Hostinger Premium Compatible (PHP 8.x, no Composer needed)
// ============================================================

require_once __DIR__ . '/config.php';

// CORS + JSON headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

try {
    // Parse body (JSON or form-encoded)
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    if (!$data) {
        parse_str($body, $data);
    }
    if (!$data) {
        $data = $_POST;
    }

    // Get and validate email
    $email = trim($data['email'] ?? '');
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email address is required.']);
        exit;
    }

    // Sanitize email using RFC 5321 whitelist
    $email = preg_replace('/[^a-zA-Z0-9!#$%&\'*+\/=?^_`{|}~.\-@]/', '', $email);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
        exit;
    }

    $safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');

    // Save to subscribers CSV
    $subscribersFile = defined('SUBSCRIBERS_FILE') ? SUBSCRIBERS_FILE : __DIR__ . '/subscribers.csv';
    $isNew = !file_exists($subscribersFile);
    $fh = fopen($subscribersFile, 'a');
    if ($fh === false) {
        throw new RuntimeException('Could not open subscribers file for writing.');
    }
    if ($isNew) {
        // Write BOM for Excel UTF-8 compatibility
        fwrite($fh, "\xEF\xBB\xBF");
        fputcsv($fh, ['Date & Time', 'Email', 'Source']);
    }
    fputcsv($fh, [
        date('d/m/Y H:i:s'),
        $email,
        'Newsletter Form'
    ]);
    fclose($fh);

    // Send a welcome email (optional — uses config.php SMTP settings)
    $emailSent = false;
    $fromName  = defined('FROM_NAME')  ? FROM_NAME  : 'TRI Performance';
    $fromEmail = defined('FROM_EMAIL') ? FROM_EMAIL : 'noreply@example.com';

    $subject = 'Welcome to TRI — You Are In! △';
    $htmlBody = '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to TRI</title></head>
<body style="background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#f5f5f7;margin:0;padding:0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0c;padding:30px 15px;">
    <tr><td align="center">
      <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:#121214;border:1px solid #1c1c1e;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.6);">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#ffffff;">△ TRI</span>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.45);margin-top:4px;">The Real Inside</div>
        </td></tr>
        <tr><td style="border-top:1px solid #2c2c2e;padding-top:24px;padding-bottom:24px;text-align:center;">
          <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">You\'re In.</h1>
          <p style="font-size:15px;color:#a1a1a6;line-height:1.6;margin:0 0 20px 0;">
            Welcome to the TRI inner circle. You\'ll be the first to know about new batches, lab results, and exclusive performance content.
          </p>
          <a href="https://wa.me/' . (defined('WHATSAPP_NUMBER') ? WHATSAPP_NUMBER : '919999999999') . '" target="_blank"
             style="background-color:#e6a2a4;color:#0b0b0c;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;display:inline-block;">
            Chat With Us on WhatsApp
          </a>
        </td></tr>
        <tr><td align="center" style="padding-top:20px;">
          <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0;">
            © 2026 THE REAL INSIDE. ISO/IEC 17025 Eurofins Certified.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>';

    $plainText = "Welcome to TRI — The Real Inside.\n\nYou're in! You'll be the first to know about new batches, lab results, and exclusive performance content.\n\n© 2026 THE REAL INSIDE";

    $boundary = bin2hex(random_bytes(16));
    $headers  = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'Reply-To: ' . $fromEmail,
        'X-Mailer: TRI-PHP-Mailer/2.0',
    ]);

    $body = "--{$boundary}\r\n"
          . "Content-Type: text/plain; charset=UTF-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($plainText)) . "\r\n"
          . "--{$boundary}\r\n"
          . "Content-Type: text/html; charset=UTF-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($htmlBody)) . "\r\n"
          . "--{$boundary}--";

    $emailSent = @mail($email, $subject, $body, $headers);

    echo json_encode([
        'success'    => true,
        'message'    => 'You have been subscribed successfully.',
        'emailSent'  => $emailSent,
    ]);

} catch (Throwable $e) {
    error_log('[TRI Subscribe Error] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An internal error occurred. Please try again.',
    ]);
}

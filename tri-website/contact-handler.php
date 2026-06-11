<?php
// ============================================================
//  TRI Performance — Contact Form Handler
//  Endpoint: POST /api/contact
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

    // Extract and sanitize fields
    $name    = htmlspecialchars(trim($data['name']    ?? ''), ENT_QUOTES, 'UTF-8');
    $rawEmail = trim($data['email'] ?? '');
    $message = htmlspecialchars(trim($data['message'] ?? ''), ENT_QUOTES, 'UTF-8');
    $subject_in = htmlspecialchars(trim($data['subject'] ?? 'General Enquiry'), ENT_QUOTES, 'UTF-8');

    // Validate required fields
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name is required.']);
        exit;
    }

    // Sanitize email
    $rawEmail = preg_replace('/[^a-zA-Z0-9!#$%&\'*+\/=?^_`{|}~.\-@]/', '', $rawEmail);
    if (!filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
        exit;
    }
    $safeEmail = htmlspecialchars($rawEmail, ENT_QUOTES, 'UTF-8');

    if (empty($message)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Message is required.']);
        exit;
    }

    // Save contact enquiry to CSV log
    $contactLogFile = __DIR__ . '/contact_enquiries.csv';
    $isNew = !file_exists($contactLogFile);
    $fh = fopen($contactLogFile, 'a');
    if ($fh !== false) {
        if ($isNew) {
            fwrite($fh, "\xEF\xBB\xBF"); // UTF-8 BOM
            fputcsv($fh, ['Date & Time', 'Name', 'Email', 'Subject', 'Message']);
        }
        fputcsv($fh, [
            date('d/m/Y H:i:s'),
            $name,
            $rawEmail,
            $subject_in,
            strip_tags($message),
        ]);
        fclose($fh);
    }

    // Send notification email to admin
    $fromName  = defined('FROM_NAME')  ? FROM_NAME  : 'TRI Performance';
    $fromEmail = defined('FROM_EMAIL') ? FROM_EMAIL : 'noreply@example.com';
    $adminEmail = defined('SMTP_USER') ? SMTP_USER  : $fromEmail;

    $emailSent = false;
    $emailSubject = '[TRI Contact] ' . $subject_in . ' — from ' . $name;

    $htmlBody = '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#f5f5f7;margin:0;padding:20px;">
  <table width="560" border="0" cellspacing="0" cellpadding="0" style="background:#121214;border:1px solid #2c2c2e;border-radius:12px;padding:28px;margin:0 auto;">
    <tr><td>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.4);margin-bottom:20px;">New Contact Enquiry</div>
      <h2 style="color:#ffffff;margin:0 0 20px 0;font-size:20px;">△ TRI — Contact Form Submission</h2>
      <table width="100%" style="border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #2c2c2e;color:#a1a1a6;font-size:13px;width:30%;">Name</td>
            <td style="padding:10px 0;border-bottom:1px solid #2c2c2e;color:#ffffff;font-size:13px;">' . $name . '</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #2c2c2e;color:#a1a1a6;font-size:13px;">Email</td>
            <td style="padding:10px 0;border-bottom:1px solid #2c2c2e;color:#e6a2a4;font-size:13px;">' . $safeEmail . '</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #2c2c2e;color:#a1a1a6;font-size:13px;">Subject</td>
            <td style="padding:10px 0;border-bottom:1px solid #2c2c2e;color:#ffffff;font-size:13px;">' . $subject_in . '</td></tr>
        <tr><td style="padding:10px 0;color:#a1a1a6;font-size:13px;vertical-align:top;">Message</td>
            <td style="padding:10px 0;color:#ffffff;font-size:13px;line-height:1.6;">' . nl2br($message) . '</td></tr>
      </table>
      <div style="margin-top:24px;padding:14px 20px;background:#1c1c1e;border-radius:8px;font-size:12px;color:#a1a1a6;">
        Received: ' . date('d M Y, H:i:s T') . '
      </div>
    </td></tr>
  </table>
</body>
</html>';

    $plainText = "New Contact Form Submission — TRI Performance\n\n"
               . "Name: {$name}\n"
               . "Email: {$rawEmail}\n"
               . "Subject: {$subject_in}\n"
               . "Message:\n{$message}\n\n"
               . "Received: " . date('d M Y, H:i:s T');

    $boundary = bin2hex(random_bytes(16));
    $headers  = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'From: ' . $name . ' via TRI <' . $fromEmail . '>',
        'Reply-To: ' . $rawEmail,
        'X-Mailer: TRI-PHP-Mailer/2.0',
    ]);

    $mailBody = "--{$boundary}\r\n"
              . "Content-Type: text/plain; charset=UTF-8\r\n"
              . "Content-Transfer-Encoding: base64\r\n\r\n"
              . chunk_split(base64_encode($plainText)) . "\r\n"
              . "--{$boundary}\r\n"
              . "Content-Type: text/html; charset=UTF-8\r\n"
              . "Content-Transfer-Encoding: base64\r\n\r\n"
              . chunk_split(base64_encode($htmlBody)) . "\r\n"
              . "--{$boundary}--";

    // Send to admin
    $emailSent = @mail($adminEmail, $emailSubject, $mailBody, $headers);

    // Send confirmation to the customer
    $confirmSubject = 'We received your message — TRI Performance △';
    $confirmHtml = '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#f5f5f7;margin:0;padding:30px 15px;">
  <table width="560" border="0" cellspacing="0" cellpadding="0" style="background:#121214;border:1px solid #1c1c1e;border-radius:16px;padding:32px;margin:0 auto;">
    <tr><td align="center" style="padding-bottom:24px;">
      <span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#ffffff;">△ TRI</span>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.45);margin-top:4px;">The Real Inside</div>
    </td></tr>
    <tr><td style="border-top:1px solid #2c2c2e;padding-top:24px;">
      <h1 style="font-size:20px;font-weight:700;color:#ffffff;margin:0 0 12px 0;">Got it, ' . $name . '.</h1>
      <p style="font-size:15px;color:#a1a1a6;line-height:1.6;margin:0 0 20px 0;">
        We\'ve received your message and will get back to you within 24 hours on business days.
      </p>
      <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:24px 0 0 0;">
        © 2026 THE REAL INSIDE. ISO/IEC 17025 Eurofins Certified.
      </p>
    </td></tr>
  </table>
</body>
</html>';

    $confirmPlain = "Hi {$name},\n\nWe've received your message and will get back to you within 24 hours on business days.\n\n© 2026 THE REAL INSIDE";
    $cb2 = bin2hex(random_bytes(16));
    $confirmHeaders = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $cb2 . '"',
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'Reply-To: ' . $fromEmail,
        'X-Mailer: TRI-PHP-Mailer/2.0',
    ]);
    $confirmBody = "--{$cb2}\r\n"
                 . "Content-Type: text/plain; charset=UTF-8\r\n"
                 . "Content-Transfer-Encoding: base64\r\n\r\n"
                 . chunk_split(base64_encode($confirmPlain)) . "\r\n"
                 . "--{$cb2}\r\n"
                 . "Content-Type: text/html; charset=UTF-8\r\n"
                 . "Content-Transfer-Encoding: base64\r\n\r\n"
                 . chunk_split(base64_encode($confirmHtml)) . "\r\n"
                 . "--{$cb2}--";

    @mail($rawEmail, $confirmSubject, $confirmBody, $confirmHeaders);

    echo json_encode([
        'success'   => true,
        'message'   => 'Your message has been received. We\'ll reply within 24 hours.',
        'emailSent' => $emailSent,
    ]);

} catch (Throwable $e) {
    error_log('[TRI Contact Error] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An internal error occurred. Please try again.',
    ]);
}

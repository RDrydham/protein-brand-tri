<?php
/**
 * ============================================================
 *  TRI Performance — Lead Submission Handler
 *  submit-lead.php
 * ============================================================
 *  Handles POST /api/save-lead
 *  - Validates & sanitises inputs
 *  - Saves lead to TRI_Leads.csv (Excel-compatible)
 *  - Backs up to leads_backup.json
 *  - Generates a personalised 6-meal diet plan
 *  - Sends a premium dark-themed HTML email to the customer
 *  - Returns a JSON response
 * ============================================================
 */

// ── Bootstrap ────────────────────────────────────────────────
declare(strict_types=1);

// Load config — contains file paths, SMTP creds, WhatsApp number, etc.
require_once __DIR__ . '/config.php';

// Set timezone for accurate timestamps
date_default_timezone_set(APP_TIMEZONE);

// ── CORS Headers ─────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Content-Type: application/json; charset=UTF-8');

// Handle pre-flight OPTIONS request (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Only allow POST ──────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

// ── Parse JSON or form-encoded body ─────────────────────────
$rawBody  = file_get_contents('php://input');
$jsonData = json_decode($rawBody, true);

// Support both JSON body and traditional form POST
$input = is_array($jsonData) ? $jsonData : $_POST;

// ── Helper: sanitise a plain text string ────────────────────
function sanitiseText(mixed $value): string
{
    return htmlspecialchars(trim((string)($value ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// ── Helper: safe float conversion ───────────────────────────
function safeFloat(mixed $value, float $default = 0.0): float
{
    $v = filter_var($value, FILTER_VALIDATE_FLOAT);
    return ($v !== false) ? $v : $default;
}

// ── Helper: send a JSON error response and exit ──────────────
function sendError(string $message, int $code = 400): never
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

// ── 1. COLLECT & VALIDATE INPUTS ────────────────────────────
$name      = sanitiseText($input['name']      ?? '');
$email     = trim((string)($input['email']    ?? ''));
$weight    = safeFloat($input['weight']       ?? 0);
$intensity = sanitiseText($input['intensity'] ?? 'Regular');
$protein   = safeFloat($input['protein']      ?? 0);
$hydration = safeFloat($input['hydration']    ?? 0);
$bcaa      = safeFloat($input['bcaa']         ?? 0);
$recovery  = safeFloat($input['recovery']     ?? 0);

// Required fields
if ($name === '') {
    sendError('Name is required.');
}
if ($email === '') {
    sendError('Email address is required.');
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    sendError('Please provide a valid email address.');
}
if ($weight <= 0) {
    sendError('Body weight is required and must be greater than zero.');
}

// Sanitise email after validation — remove any characters not valid in an
// RFC 5321 address. FILTER_SANITIZE_EMAIL is deprecated in PHP 8.1+ so we
// use a manual approach: keep only the characters allowed in email addresses.
$email = preg_replace('/[^a-zA-Z0-9!#$%&\'*+\/=?^_`{|}~.@\-]/', '', $email);

// Normalise intensity
$validIntensities = ['Elite', 'Medium', 'Regular'];
if (!in_array($intensity, $validIntensities, true)) {
    $intensity = 'Regular';
}

// ── 2. GENERATE DIET PLAN ────────────────────────────────────

/**
 * generateDietPlan()
 *
 * Replicates the Node.js generateDietPlanText() logic exactly.
 * Returns an associative array with macros and a 6-meal schedule.
 */
function generateDietPlan(float $weight, string $intensity): array
{
    // Macro multipliers by intensity
    switch ($intensity) {
        case 'Elite':
            $proteinMultiplier = 2.2;
            $carbMultiplier    = 4.0;
            break;
        case 'Medium':
            $proteinMultiplier = 1.8;
            $carbMultiplier    = 3.0;
            break;
        default: // Regular
            $proteinMultiplier = 1.5;
            $carbMultiplier    = 2.0;
            break;
    }

    // Calculate daily macros (rounded to 1 decimal place)
    $dailyProtein = round($weight * $proteinMultiplier, 1);
    $dailyCarbs   = round($weight * $carbMultiplier,    1);
    $dailyFats    = round($weight * 0.8,                1);
    $dailyCalories = round(
        ($dailyProtein * 4) + ($dailyCarbs * 4) + ($dailyFats * 9),
        0
    );

    // ── 6-Meal Schedule ──────────────────────────────────────
    // All gram amounts are proportioned to the individual's weight
    // and split across 6 meals.

    $mealProtein     = round($dailyProtein / 6, 1);
    $breakfastCarbs  = round($dailyCarbs * 0.20, 1);
    $lunchCarbs      = round($dailyCarbs * 0.25, 1);
    $preWorkoutCarbs = round($dailyCarbs * 0.25, 1);
    $dinnerCarbs     = round($dailyCarbs * 0.15, 1);

    $meals = [
        [
            'title'       => '🌅 Morning Ritual',
            'time'        => '6:30 – 7:00 AM',
            'description' => 'Start your day with an activation stack to prime digestion and cellular hydration.',
            'items'       => [
                '350 ml warm water with a squeeze of lemon',
                '5 g TRI BCAA (mix in 200 ml water) — initiates muscle protein synthesis',
                '1 tsp apple cider vinegar (optional) — supports gut acid balance',
                '10 min light movement or breathwork',
            ],
            'macros' => [
                'Protein' => '5 g (from BCAA)',
                'Carbs'   => '0 g',
                'Fats'    => '0 g',
            ],
        ],
        [
            'title'       => '🍳 Breakfast',
            'time'        => '7:30 – 8:00 AM',
            'description' => 'Anabolic window — fuel your first performance block with quality protein and slow carbs.',
            'items'       => [
                round($weight * 0.035, 0) . ' g rolled oats (approx. ' . $breakfastCarbs . ' g carbs)',
                round($weight * 0.032, 0) . ' g whole eggs or egg whites (~' . $mealProtein . ' g protein)',
                '1 medium banana or seasonal fruit',
                '15 g mixed nuts (healthy fats)',
                '500 ml TRI Hydration drink — electrolytes & cell volumisation',
            ],
            'macros' => [
                'Protein' => $mealProtein . ' g',
                'Carbs'   => $breakfastCarbs . ' g',
                'Fats'    => round($dailyFats * 0.20, 1) . ' g',
            ],
        ],
        [
            'title'       => '🥗 Lunch',
            'time'        => '12:30 – 1:00 PM',
            'description' => 'Your biggest meal. Prioritise whole foods, complex carbohydrates, and lean protein.',
            'items'       => [
                round($weight * 0.030, 0) . ' g cooked rice or chapati (~' . $lunchCarbs . ' g carbs)',
                round($weight * 0.035, 0) . ' g grilled chicken breast, tofu, or paneer (~' . $mealProtein . ' g protein)',
                '200 g mixed vegetables (broccoli, capsicum, spinach)',
                '1 tbsp olive oil or ghee for cooking',
                '1 glass TRI Hydration (intra-meal electrolytes)',
            ],
            'macros' => [
                'Protein' => $mealProtein . ' g',
                'Carbs'   => $lunchCarbs . ' g',
                'Fats'    => round($dailyFats * 0.25, 1) . ' g',
            ],
        ],
        [
            'title'       => '⚡ Pre-Workout',
            'time'        => '4:00 – 4:30 PM',
            'description' => 'Performance primer — fast carbs + BCAA = peak muscle readiness and sustained power output.',
            'items'       => [
                '1 medium banana or 40 g dates (~' . $preWorkoutCarbs . ' g fast carbs)',
                '5 g TRI BCAA in 300 ml water — pre-load amino acids',
                '1 cup black coffee or green tea (natural stimulant, optional)',
                'Consume 30–45 minutes before your session',
            ],
            'macros' => [
                'Protein' => '5 g (from BCAA)',
                'Carbs'   => $preWorkoutCarbs . ' g',
                'Fats'    => '0 g',
            ],
        ],
        [
            'title'       => '🏋️ Post-Workout',
            'time'        => 'Within 30 min post-session',
            'description' => 'Critical anabolic window — repair, replenish, and initiate recovery immediately.',
            'items'       => [
                round($weight * 0.035, 0) . ' g TRI Whey / plant protein (~' . $mealProtein . ' g protein)',
                '30 g fast-digesting carbs (white rice, banana, or dextrose)',
                '5 g TRI BCAA for accelerated muscle repair',
                '500 ml TRI Hydration — replaces sweat losses & minerals',
                '5 g creatine monohydrate (optional, if part of your stack)',
            ],
            'macros' => [
                'Protein' => $mealProtein . ' g',
                'Carbs'   => round($dailyCarbs * 0.10, 1) . ' g',
                'Fats'    => '2 g',
            ],
        ],
        [
            'title'       => '🌙 Dinner',
            'time'        => '7:30 – 8:00 PM',
            'description' => 'Recovery meal — slow-digesting protein + minimal carbs to fuel overnight muscle repair.',
            'items'       => [
                round($weight * 0.030, 0) . ' g grilled fish, chicken, or cottage cheese (~' . $mealProtein . ' g protein)',
                round($weight * 0.020, 0) . ' g sweet potato or brown rice (~' . $dinnerCarbs . ' g carbs)',
                '200 g steamed vegetables or salad',
                '1 tsp TRI Recovery blend (magnesium + ashwagandha) — cortisol control',
                '250 ml warm milk or chamomile tea before bed',
            ],
            'macros' => [
                'Protein' => $mealProtein . ' g',
                'Carbs'   => $dinnerCarbs . ' g',
                'Fats'    => round($dailyFats * 0.20, 1) . ' g',
            ],
        ],
    ];

    return [
        'dailyProtein'  => $dailyProtein,
        'dailyCarbs'    => $dailyCarbs,
        'dailyFats'     => $dailyFats,
        'dailyCalories' => $dailyCalories,
        'meals'         => $meals,
    ];
}

// Generate the plan for this lead
$diet = generateDietPlan($weight, $intensity);

// ── 3. SAVE LEAD TO CSV ──────────────────────────────────────

/**
 * saveLeadToCSV()
 *
 * Appends the lead to TRI_Leads.csv.
 * Creates the file with a header row on the very first run.
 *
 * @return bool  true on success, false on failure
 */
function saveLeadToCSV(
    string $name,
    string $email,
    float  $weight,
    string $intensity,
    float  $protein,
    float  $hydration,
    float  $bcaa,
    float  $recovery
): bool {
    $filePath = LEADS_FILE;

    // Check whether file already exists (to know if we need headers)
    $fileExists = file_exists($filePath);

    // Open in append mode, create if not exists
    $handle = fopen($filePath, 'a');
    if ($handle === false) {
        return false;
    }

    // Write UTF-8 BOM on very first write so Excel auto-detects encoding
    if (!$fileExists) {
        fwrite($handle, "\xEF\xBB\xBF"); // UTF-8 BOM
        fputcsv($handle, [
            'Date & Time',
            'Name',
            'Email',
            'Body Weight (kg)',
            'Training Intensity',
            'Protein (g/day)',
            'Hydration (L/day)',
            'BCAA (g/day)',
            'Recovery (hours)',
            'Status',
        ]);
    }

    // Append lead row
    $result = fputcsv($handle, [
        date('Y-m-d H:i:s'),
        $name,
        $email,
        $weight,
        $intensity,
        $protein,
        $hydration,
        $bcaa,
        $recovery,
        'New',
    ]);

    fclose($handle);
    return $result !== false;
}

// ── 4. SAVE BACKUP TO JSON ───────────────────────────────────

/**
 * saveLeadToJSON()
 *
 * Reads the existing JSON array from leads_backup.json,
 * appends the new lead object, and writes back atomically.
 *
 * @return bool
 */
function saveLeadToJSON(
    string $name,
    string $email,
    float  $weight,
    string $intensity,
    float  $protein,
    float  $hydration,
    float  $bcaa,
    float  $recovery,
    array  $diet
): bool {
    $filePath = BACKUP_FILE;

    // Load existing leads (empty array if file missing or corrupt)
    $leads = [];
    if (file_exists($filePath)) {
        $raw = file_get_contents($filePath);
        if ($raw !== false) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $leads = $decoded;
            }
        }
    }

    // Append new lead
    $leads[] = [
        'timestamp' => date('c'),                   // ISO-8601
        'name'      => $name,
        'email'     => $email,
        'weight'    => $weight,
        'intensity' => $intensity,
        'protein'   => $protein,
        'hydration' => $hydration,
        'bcaa'      => $bcaa,
        'recovery'  => $recovery,
        'diet'      => [
            'dailyProtein'  => $diet['dailyProtein'],
            'dailyCarbs'    => $diet['dailyCarbs'],
            'dailyFats'     => $diet['dailyFats'],
            'dailyCalories' => $diet['dailyCalories'],
        ],
        'status' => 'new',
    ];

    // Write back atomically via temp file
    $json = json_encode($leads, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return false;
    }

    $tmpFile = $filePath . '.tmp';
    if (file_put_contents($tmpFile, $json, LOCK_EX) === false) {
        return false;
    }

    return rename($tmpFile, $filePath);
}

// ── 5. BUILD PREMIUM HTML EMAIL ──────────────────────────────

/**
 * buildEmailHTML()
 *
 * Generates the full dark-themed HTML email body.
 * Identical in design to the original Node.js version.
 *
 * @param string $name        Customer first name (or full name)
 * @param float  $protein     Recommended protein dose (g/day)
 * @param float  $hydration   Recommended hydration (L/day)
 * @param float  $bcaa        Recommended BCAA (g/day)
 * @param float  $recovery    Recommended recovery (hours)
 * @param array  $diet        Diet plan array from generateDietPlan()
 * @return string             Complete HTML string
 */
function buildEmailHTML(
    string $name,
    float  $protein,
    float  $hydration,
    float  $bcaa,
    float  $recovery,
    array  $diet
): string {
    $firstName = explode(' ', $name)[0];
    $waLink    = 'https://wa.me/' . WHATSAPP_NUMBER;

    // ── Meal cards HTML ──────────────────────────────────────
    $mealsHtml = '';
    foreach ($diet['meals'] as $meal) {
        // Build items list
        $itemsHtml = '';
        foreach ($meal['items'] as $item) {
            $itemsHtml .= '<li style="margin-bottom:6px;color:#c8c8cc;">' . htmlspecialchars($item, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '</li>';
        }

        // Build macros row
        $macrosHtml = '';
        foreach ($meal['macros'] as $key => $val) {
            $macrosHtml .= '
              <div style="text-align:center;padding:8px 14px;background:#2a2a2e;border-radius:8px;margin:0 4px;">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">' . htmlspecialchars($key, ENT_QUOTES, 'UTF-8') . '</div>
                <div style="font-size:15px;font-weight:700;color:#e6a2a4;margin-top:4px;">' . htmlspecialchars($val, ENT_QUOTES, 'UTF-8') . '</div>
              </div>';
        }

        $mealsHtml .= '
        <!-- Meal Card -->
        <div style="background:#1c1c1e;border-radius:14px;padding:24px 28px;margin-bottom:20px;border:1px solid #2a2a2e;">
          <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
            <h3 style="margin:0;font-size:18px;color:#e6a2a4;font-weight:700;">' . htmlspecialchars($meal['title'], ENT_QUOTES, 'UTF-8') . '</h3>
            <span style="font-size:12px;color:#888;background:#2a2a2e;padding:3px 10px;border-radius:20px;">' . htmlspecialchars($meal['time'], ENT_QUOTES, 'UTF-8') . '</span>
          </div>
          <p style="margin:0 0 14px;font-size:13px;color:#888;line-height:1.5;">' . htmlspecialchars($meal['description'], ENT_QUOTES, 'UTF-8') . '</p>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;">' . $itemsHtml . '</ul>
          <div style="display:flex;justify-content:flex-start;flex-wrap:wrap;gap:8px;margin-top:4px;">' . $macrosHtml . '</div>
        </div>';
    }

    // ── Full email HTML ──────────────────────────────────────
    $html = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>Your TRI Performance Plan</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#f0f0f0;-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b0b0c;">
    <tr>
      <td align="center" style="padding:40px 16px 60px;">

        <!-- Email container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#111113;border-radius:20px;overflow:hidden;border:1px solid #1e1e22;">

          <!-- ══ HEADER ════════════════════════════════════════ -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1e 0%,#0f0f12 100%);padding:44px 40px 36px;text-align:center;border-bottom:1px solid #1e1e22;">
              <!-- Logo mark -->
              <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#e6a2a4,#c97a7e);border-radius:16px;line-height:64px;font-size:28px;font-weight:900;color:#0b0b0c;margin-bottom:16px;">△</div>
              <!-- Brand name -->
              <div style="font-size:30px;font-weight:900;letter-spacing:6px;color:#ffffff;text-transform:uppercase;margin-bottom:4px;">TRI</div>
              <div style="font-size:11px;color:#888;letter-spacing:3px;text-transform:uppercase;margin-bottom:28px;">The Real Inside</div>
              <!-- Headline -->
              <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">Your Personalised<br><span style="color:#e6a2a4;">Performance Blueprint</span></h1>
              <p style="margin:0;font-size:14px;color:#888;line-height:1.6;">Hey ' . htmlspecialchars($firstName, ENT_QUOTES, 'UTF-8') . ', your plan has been engineered for your body.<br>Precision nutrition. Zero guesswork.</p>
            </td>
          </tr>

          <!-- ══ BODY ══════════════════════════════════════════ -->
          <tr>
            <td style="padding:36px 36px 0;">

              <!-- ── Daily Dose Grid ──────────────────────────── -->
              <h2 style="margin:0 0 18px;font-size:13px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">Your Daily TRI Protocol</h2>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <!-- Protein -->
                  <td width="25%" style="padding:4px;">
                    <div style="background:#1c1c1e;border:1px solid #2a2a2e;border-radius:14px;padding:20px 12px;text-align:center;">
                      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Protein</div>
                      <div style="font-size:28px;font-weight:900;color:#e6a2a4;line-height:1;">' . number_format($protein, 0) . '</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">g / day</div>
                    </div>
                  </td>
                  <!-- Hydration -->
                  <td width="25%" style="padding:4px;">
                    <div style="background:#1c1c1e;border:1px solid #2a2a2e;border-radius:14px;padding:20px 12px;text-align:center;">
                      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Hydration</div>
                      <div style="font-size:28px;font-weight:900;color:#e6a2a4;line-height:1;">' . number_format($hydration, 1) . '</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">L / day</div>
                    </div>
                  </td>
                  <!-- BCAA -->
                  <td width="25%" style="padding:4px;">
                    <div style="background:#1c1c1e;border:1px solid #2a2a2e;border-radius:14px;padding:20px 12px;text-align:center;">
                      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">BCAA</div>
                      <div style="font-size:28px;font-weight:900;color:#e6a2a4;line-height:1;">' . number_format($bcaa, 0) . '</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">g / day</div>
                    </div>
                  </td>
                  <!-- Recovery -->
                  <td width="25%" style="padding:4px;">
                    <div style="background:#1c1c1e;border:1px solid #2a2a2e;border-radius:14px;padding:20px 12px;text-align:center;">
                      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Recovery</div>
                      <div style="font-size:28px;font-weight:900;color:#e6a2a4;line-height:1;">' . number_format($recovery, 0) . '</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">hrs / night</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ── Macro Summary Bar ─────────────────────────── -->
              <div style="background:linear-gradient(135deg,#1c1c1e,#141416);border:1px solid #2a2a2e;border-radius:14px;padding:22px 24px;margin-bottom:36px;text-align:center;">
                <div style="font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Daily Macro Targets</div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="text-align:center;padding:0 8px;">
                      <div style="font-size:22px;font-weight:800;color:#e6a2a4;">' . $diet['dailyProtein'] . 'g</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">Protein</div>
                    </td>
                    <td style="text-align:center;color:#333;font-size:20px;">·</td>
                    <td style="text-align:center;padding:0 8px;">
                      <div style="font-size:22px;font-weight:800;color:#e6a2a4;">' . $diet['dailyCarbs'] . 'g</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">Carbs</div>
                    </td>
                    <td style="text-align:center;color:#333;font-size:20px;">·</td>
                    <td style="text-align:center;padding:0 8px;">
                      <div style="font-size:22px;font-weight:800;color:#e6a2a4;">' . $diet['dailyFats'] . 'g</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">Fats</div>
                    </td>
                    <td style="text-align:center;color:#333;font-size:20px;">·</td>
                    <td style="text-align:center;padding:0 8px;">
                      <div style="font-size:22px;font-weight:800;color:#ffffff;">' . number_format((int)$diet['dailyCalories']) . '</div>
                      <div style="font-size:11px;color:#666;margin-top:4px;">Calories</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- ── Meal Plan Section ─────────────────────────── -->
              <h2 style="margin:0 0 20px;font-size:13px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">Your 6-Meal Performance Schedule</h2>

              ' . $mealsHtml . '

              <!-- ── Core Habits Section ──────────────────────── -->
              <h2 style="margin:32px 0 18px;font-size:13px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;">Core Lifestyle Protocols</h2>

              <div style="background:#1c1c1e;border:1px solid #2a2a2e;border-radius:14px;padding:24px 28px;margin-bottom:36px;">

                <!-- Sleep Hygiene -->
                <div style="display:flex;align-items:flex-start;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #2a2a2e;">
                  <div style="width:40px;height:40px;min-width:40px;background:linear-gradient(135deg,#e6a2a4,#c97a7e);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-right:16px;line-height:40px;text-align:center;">😴</div>
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">Sleep Hygiene</div>
                    <div style="font-size:13px;color:#888;line-height:1.6;">Target ' . number_format($recovery, 0) . ' hours of uninterrupted sleep. Keep a consistent bed-time. Eliminate screens 60 min before sleep. Use blackout curtains and keep room at 18–20°C for optimal melatonin secretion and GH release.</div>
                  </div>
                </div>

                <!-- Hydration -->
                <div style="display:flex;align-items:flex-start;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #2a2a2e;">
                  <div style="width:40px;height:40px;min-width:40px;background:linear-gradient(135deg,#e6a2a4,#c97a7e);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-right:16px;line-height:40px;text-align:center;">💧</div>
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">Hydration Architecture</div>
                    <div style="font-size:13px;color:#888;line-height:1.6;">Drink ' . number_format($hydration, 1) . ' L daily. Begin with 500 ml within 15 min of waking. Use TRI Hydration mix during training and post-workout. Avoid large volumes during meals — sip, don\'t flood. Monitor urine colour (pale yellow = optimal).</div>
                  </div>
                </div>

                <!-- NEAT Movement -->
                <div style="display:flex;align-items:flex-start;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #2a2a2e;">
                  <div style="width:40px;height:40px;min-width:40px;background:linear-gradient(135deg,#e6a2a4,#c97a7e);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-right:16px;line-height:40px;text-align:center;">🚶</div>
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">NEAT Movement</div>
                    <div style="font-size:13px;color:#888;line-height:1.6;">Non-Exercise Activity Thermogenesis accounts for up to 30% of daily calorie burn. Walk 7,000–10,000 steps daily. Take the stairs. Stand and work when possible. Light 10-min walks after meals dramatically improve insulin sensitivity and nutrient partitioning.</div>
                  </div>
                </div>

                <!-- Gut Integrity -->
                <div style="display:flex;align-items:flex-start;">
                  <div style="width:40px;height:40px;min-width:40px;background:linear-gradient(135deg,#e6a2a4,#c97a7e);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-right:16px;line-height:40px;text-align:center;">🦠</div>
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">Gut Integrity</div>
                    <div style="font-size:13px;color:#888;line-height:1.6;">A healthy gut microbiome directly affects protein absorption, immune function, and mood. Include curd/yoghurt, fermented foods, or a probiotic daily. Minimise ultra-processed foods, refined sugar, and alcohol — they disrupt your gut lining and reduce nutrient uptake from even the best supplements.</div>
                  </div>
                </div>

              </div>

              <!-- ── Important Note ────────────────────────────── -->
              <div style="background:linear-gradient(135deg,#1a1a1e,#151518);border:1px solid #e6a2a430;border-radius:14px;padding:20px 24px;margin-bottom:36px;">
                <div style="font-size:13px;font-weight:700;color:#e6a2a4;margin-bottom:8px;">⚠️ Important Note</div>
                <div style="font-size:13px;color:#888;line-height:1.7;">This plan is calculated based on the data you provided. Individual response to nutrition varies. Consult a registered dietitian or sports nutritionist before making significant dietary changes, especially if you have a medical condition. Adjust your plan every 4–6 weeks based on progress and body composition changes.</div>
              </div>

              <!-- ── CTA Button ─────────────────────────────────── -->
              <div style="text-align:center;margin-bottom:40px;">
                <p style="font-size:14px;color:#888;margin:0 0 20px;">Have questions about your plan? Our coaches are ready.</p>
                <a href="' . htmlspecialchars($waLink, ENT_QUOTES, 'UTF-8') . '"
                   style="display:inline-block;background:linear-gradient(135deg,#25D366,#128C7E);color:#ffffff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">
                  💬 Chat With a TRI Coach on WhatsApp
                </a>
              </div>

            </td>
          </tr>

          <!-- ══ FOOTER ════════════════════════════════════════ -->
          <tr>
            <td style="background:#0d0d0f;padding:28px 36px;border-top:1px solid #1e1e22;text-align:center;">
              <div style="font-size:16px;font-weight:900;letter-spacing:5px;color:#e6a2a4;margin-bottom:4px;">△ TRI</div>
              <div style="font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">The Real Inside</div>
              <p style="margin:0 0 8px;font-size:12px;color:#555;line-height:1.6;">
                You are receiving this email because you requested a personalised plan from TRI Performance.<br>
                This is a transactional email — you will not receive unsolicited marketing.
              </p>
              <p style="margin:0;font-size:11px;color:#444;">
                &copy; ' . date('Y') . ' TRI Performance. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email container -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>';

    return $html;
}

// ── 6. SEND EMAIL via PHP mail() ─────────────────────────────

/**
 * sendLeadEmail()
 *
 * Sends the premium HTML email using PHP's built-in mail() function.
 * On Hostinger, mail() works out-of-the-box for the hosting domain.
 *
 * NOTE: If you need proper SMTP relay (e.g., for off-domain sending),
 * replace this function body with a PHPMailer SMTP implementation
 * (see comments inside the function below).
 *
 * @return bool
 */
function sendLeadEmail(
    string $toEmail,
    string $toName,
    float  $protein,
    float  $hydration,
    float  $bcaa,
    float  $recovery,
    array  $diet
): bool {
    $subject  = '🔬 Your TRI Performance Blueprint Is Ready, ' . explode(' ', $toName)[0] . '!';
    $htmlBody = buildEmailHTML($toName, $protein, $hydration, $bcaa, $recovery, $diet);

    // Generate a unique boundary for multipart email (cryptographically secure)
    $boundary = '----_TRI_' . bin2hex(random_bytes(16));

    // ── Email Headers ────────────────────────────────────────
    $headers  = 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-Type: multipart/alternative; boundary="' . $boundary . '"' . "\r\n";
    $headers .= 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>' . "\r\n";
    $headers .= 'Reply-To: ' . FROM_EMAIL . "\r\n";
    $headers .= 'X-Mailer: TRI-PHP-Mailer/1.0' . "\r\n";
    $headers .= 'X-Priority: 1' . "\r\n";

    // ── Plain-text fallback body ─────────────────────────────
    $plainText  = "Hi " . explode(' ', $toName)[0] . ",\n\n";
    $plainText .= "Your personalised TRI Performance Blueprint is ready!\n\n";
    $plainText .= "DAILY PROTOCOL:\n";
    $plainText .= "  Protein   : " . number_format($protein, 0) . " g/day\n";
    $plainText .= "  Hydration : " . number_format($hydration, 1) . " L/day\n";
    $plainText .= "  BCAA      : " . number_format($bcaa, 0) . " g/day\n";
    $plainText .= "  Recovery  : " . number_format($recovery, 0) . " hrs/night\n\n";
    $plainText .= "DAILY MACROS:\n";
    $plainText .= "  Protein   : " . $diet['dailyProtein'] . " g\n";
    $plainText .= "  Carbs     : " . $diet['dailyCarbs'] . " g\n";
    $plainText .= "  Fats      : " . $diet['dailyFats'] . " g\n";
    $plainText .= "  Calories  : " . number_format((int)$diet['dailyCalories']) . " kcal\n\n";
    $plainText .= "View the full plan in the HTML version of this email.\n\n";
    $plainText .= "Chat with a TRI coach: https://wa.me/" . WHATSAPP_NUMBER . "\n\n";
    $plainText .= "— TRI Performance | The Real Inside\n";

    // ── Multipart body ───────────────────────────────────────
    $body  = '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $body .= $plainText . "\r\n";

    $body .= '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($htmlBody)) . "\r\n";

    $body .= '--' . $boundary . '--';

    // ── Encode recipient name safely ─────────────────────────
    $encodedName = '=?UTF-8?B?' . base64_encode($toName) . '?=';
    $recipient   = $encodedName . ' <' . $toEmail . '>';

    // ── Attempt to send ──────────────────────────────────────
    return mail($recipient, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

    /*
     * ── ALTERNATIVE: PHPMailer SMTP ─────────────────────────
     * If mail() doesn't work on your host, upload PHPMailer files
     * from https://github.com/PHPMailer/PHPMailer (just 3 .php files,
     * no Composer needed) and uncomment the block below:
     *
     * require_once __DIR__ . '/PHPMailer/PHPMailer.php';
     * require_once __DIR__ . '/PHPMailer/SMTP.php';
     * require_once __DIR__ . '/PHPMailer/Exception.php';
     *
     * $mailer = new \PHPMailer\PHPMailer\PHPMailer(true);
     * try {
     *     $mailer->isSMTP();
     *     $mailer->Host       = SMTP_HOST;
     *     $mailer->SMTPAuth   = true;
     *     $mailer->Username   = SMTP_USER;
     *     $mailer->Password   = SMTP_PASS;
     *     $mailer->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
     *     $mailer->Port       = SMTP_PORT;
     *
     *     $mailer->setFrom(FROM_EMAIL, FROM_NAME);
     *     $mailer->addAddress($toEmail, $toName);
     *     $mailer->CharSet    = 'UTF-8';
     *     $mailer->Encoding   = 'base64';
     *     $mailer->isHTML(true);
     *     $mailer->Subject    = $subject;
     *     $mailer->Body       = $htmlBody;
     *     $mailer->AltBody    = $plainText;
     *
     *     return $mailer->send();
     * } catch (\Exception $e) {
     *     error_log('[TRI Email Error] ' . $e->getMessage());
     *     return false;
     * }
     */
}

// ── 7. EXECUTE PIPELINE ──────────────────────────────────────
try {
    // --- Save to CSV ---
    $csvSaved = saveLeadToCSV($name, $email, $weight, $intensity, $protein, $hydration, $bcaa, $recovery);
    if (!$csvSaved) {
        // Log but don't kill the request — email still goes out
        error_log('[TRI CSV Error] Could not write to ' . LEADS_FILE . ' — check file permissions (chmod 664).');
    }

    // --- Save JSON backup ---
    $jsonSaved = saveLeadToJSON($name, $email, $weight, $intensity, $protein, $hydration, $bcaa, $recovery, $diet);
    if (!$jsonSaved) {
        error_log('[TRI JSON Error] Could not write to ' . BACKUP_FILE . ' — check file permissions (chmod 664).');
    }

    // --- Send email ---
    $emailSent = sendLeadEmail($email, $name, $protein, $hydration, $bcaa, $recovery, $diet);

    // --- Build success response ---
    $response = [
        'success'   => true,
        'message'   => 'Your personalised plan has been created and emailed to ' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '!',
        'emailSent' => $emailSent,
        'diet'      => [
            'intensity'     => $intensity,
            'dailyProtein'  => $diet['dailyProtein'],
            'dailyCarbs'    => $diet['dailyCarbs'],
            'dailyFats'     => $diet['dailyFats'],
            'dailyCalories' => $diet['dailyCalories'],
            'meals'         => $diet['meals'],
        ],
    ];

    if (DEBUG_MODE) {
        $response['debug'] = [
            'csvSaved'  => $csvSaved,
            'jsonSaved' => $jsonSaved,
        ];
    }

    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    error_log('[TRI Fatal Error] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    $errorResponse = ['success' => false, 'message' => 'An internal server error occurred. Please try again later.'];
    if (DEBUG_MODE) {
        $errorResponse['debug'] = $e->getMessage();
    }

    http_response_code(500);
    echo json_encode($errorResponse);
}

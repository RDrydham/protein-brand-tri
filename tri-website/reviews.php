<?php
/**
 * ============================================================
 *  TRI Performance — Reviews API Handler
 *  Compatible with Hostinger Shared Hosting (Apache + PHP)
 *
 *  Routes handled (via .htaccess):
 *    GET  /api/reviews/{productName}  → fetch reviews for a product
 *    POST /api/reviews/add            → submit a review (JWT required)
 *
 *  Storage: JSON flat-file in a protected directory above public_html
 *  (or inside public_html with .htaccess deny rule).
 * ============================================================
 */

// ── Error handling ──────────────────────────────────────────────
error_reporting(0);
ini_set('display_errors', 0);

// ── CORS & Content-Type ─────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://therealinside.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Configuration ────────────────────────────────────────────────
// JWT secret must match the one in your Node .env / server
define('JWT_SECRET', 'tri_perf_auth_secret_key_2026_dev_only_change_me');

// Reviews data file — stored OUTSIDE public_html for security.
// Hostinger path: /home/u937080884/domains/therealinside.com/
// Adjust this path to match your actual account if needed.
define('REVIEWS_FILE', __DIR__ . '/data/reviews.json');

// Ensure data directory exists
if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0700, true);
}

// ── Parse request path ───────────────────────────────────────────
// .htaccess passes the subpath via QUERY_STRING: ?path=...
$path = isset($_GET['path']) ? trim($_GET['path'], '/') : '';
$method = $_SERVER['REQUEST_METHOD'];

// ── Route dispatcher ─────────────────────────────────────────────
if ($method === 'POST' && $path === 'add') {
    handleAddReview();
} elseif ($method === 'GET' && !empty($path)) {
    handleGetReviews($path);
} else {
    jsonResponse(400, ['success' => false, 'message' => 'Invalid request.']);
}

// ════════════════════════════════════════════════════════════════
//  GET /api/reviews/{productName}
// ════════════════════════════════════════════════════════════════
function handleGetReviews($productName) {
    $productName = sanitize($productName);
    $allReviews  = loadReviews();
    $reviews     = isset($allReviews[$productName]) ? array_values($allReviews[$productName]) : [];

    // Sort newest first
    usort($reviews, function($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });

    $count  = count($reviews);
    $avgRating = $count > 0
        ? round(array_sum(array_column($reviews, 'rating')) / $count, 1)
        : 0;

    // Shape reviews to match the Node.js API response expected by shop.html
    $shaped = array_map(function($r) {
        return [
            'id'          => $r['id'],
            'rating'      => (int)$r['rating'],
            'comment'     => $r['comment'],
            'createdAt'   => $r['createdAt'],
            'user'        => ['name' => $r['userName']]
        ];
    }, $reviews);

    jsonResponse(200, [
        'success'       => true,
        'productName'   => $productName,
        'averageRating' => $avgRating,
        'reviewCount'   => $count,
        'reviews'       => $shaped
    ]);
}

// ════════════════════════════════════════════════════════════════
//  POST /api/reviews/add
// ════════════════════════════════════════════════════════════════
function handleAddReview() {
    // ── Verify JWT ──────────────────────────────────────────────
    $token = null;
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        $token = $m[1];
    }

    if (!$token) {
        jsonResponse(401, ['success' => false, 'message' => 'Access denied. Please log in to continue.']);
    }

    $payload = verifyJwt($token);
    if (!$payload) {
        jsonResponse(401, ['success' => false, 'message' => 'Authentication failed. Invalid or expired token.']);
    }

    // ── Parse body ──────────────────────────────────────────────
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        jsonResponse(400, ['success' => false, 'message' => 'Invalid request body.']);
    }

    $productName = isset($body['productName']) ? sanitize($body['productName']) : '';
    $rating      = isset($body['rating'])      ? (int)$body['rating']           : 0;
    $comment     = isset($body['comment'])     ? trim($body['comment'])         : '';
    $userName    = isset($body['userName'])    ? sanitize($body['userName'])    : 'Verified Customer';

    if (!$productName || !$rating || $comment === '') {
        jsonResponse(400, ['success' => false, 'message' => 'Product name, rating, and comment are required.']);
    }

    if ($rating < 1 || $rating > 5) {
        jsonResponse(400, ['success' => false, 'message' => 'Rating must be between 1 and 5.']);
    }

    // ── Upsert review ───────────────────────────────────────────
    $userId   = (int)$payload['userId'];

    $allReviews = loadReviews();

    if (!isset($allReviews[$productName])) {
        $allReviews[$productName] = [];
    }

    // Check for existing review by this user
    $existingIndex = null;
    foreach ($allReviews[$productName] as $i => $r) {
        if ((int)$r['userId'] === $userId) {
            $existingIndex = $i;
            break;
        }
    }

    $now    = gmdate('Y-m-d\TH:i:s\Z');
    $review = [
        'id'          => $existingIndex !== null
                            ? $allReviews[$productName][$existingIndex]['id']
                            : uniqid('rev_', true),
        'userId'      => $userId,
        'userName'    => $userName,
        'productName' => $productName,
        'rating'      => $rating,
        'comment'     => $comment,
        'createdAt'   => $existingIndex !== null
                            ? $allReviews[$productName][$existingIndex]['createdAt']
                            : $now,
        'updatedAt'   => $now
    ];

    if ($existingIndex !== null) {
        $allReviews[$productName][$existingIndex] = $review;
    } else {
        $allReviews[$productName][] = $review;
    }

    saveReviews($allReviews);

    jsonResponse(200, [
        'success' => true,
        'message' => 'Review saved successfully.',
        'review'  => $review
    ]);
}

// ════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════

function loadReviews(): array {
    $file = REVIEWS_FILE;
    if (!file_exists($file)) {
        return [];
    }
    $data = file_get_contents($file);
    $decoded = json_decode($data, true);
    return is_array($decoded) ? $decoded : [];
}

function saveReviews(array $data): void {
    file_put_contents(REVIEWS_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function sanitize(string $str): string {
    return htmlspecialchars(strip_tags(trim($str)), ENT_QUOTES, 'UTF-8');
}

function jsonResponse(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Minimal JWT verification (HS256) — no external library needed.
 * Verifies signature and expiry only. Returns payload array or null.
 */
function verifyJwt(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$headerB64, $payloadB64, $sigB64] = $parts;

    // Verify signature
    $data     = "$headerB64.$payloadB64";
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $data, JWT_SECRET, true)), '+/', '-_'), '=');
    if (!hash_equals($expected, $sigB64)) {
        return null;
    }

    // Decode payload
    $payload = json_decode(base64_decode(strtr($payloadB64, '-_', '+/')), true);
    if (!$payload) {
        return null;
    }

    // Check expiry
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null;
    }

    return $payload;
}

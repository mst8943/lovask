<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$baseDir = dirname(__DIR__, 2);
require_once $baseDir . '/includes/db.php';
require_once $baseDir . '/includes/functions.php';
require_once $baseDir . '/includes/avatar_helper.php';
require_once $baseDir . '/includes/system_settings_helper.php';

// Session check
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// --- HELPER FUNCTIONS (Same as Aura Theme) ---
function zenith_asset($path) {
    return 'themes/zenith/' . ltrim($path, '/');
}

function zenith_user_card($user, $type = 'default') {
    // Helper to render a user card
    $name = htmlspecialchars($user['username'] ?? 'User');
    $img = htmlspecialchars(get_avatar_url($user['profile_picture_url'] ?? '', $user['gender'] ?? null));
    $city = htmlspecialchars($user['city'] ?? $user['city_text'] ?? '');
    $age = isset($user['birth_date']) ? (new DateTime())->diff(new DateTime($user['birth_date']))->y : (isset($user['age']) ? $user['age'] : '?');
    $id = $user['user_id'] ?? $user['id'] ?? 0;
    
    $link = "profile.php?id=$id";
    
    // Status dot
    $status_class = (isset($user['last_seen']) && (time() - strtotime($user['last_seen']) < 300)) ? 'zenithV4_status_online' : 'zenithV4_status_offline';
    
    return "
    <a href='$link' class='zenithV4_user_card'>
        <div class='zenithV4_card_img'>
            <img src='$img' alt='$name' loading='lazy'>
            <div class='zenithV4_card_badges'>
                <span class='zenithV4_badge_pill'>$age</span>
            </div>
        </div>
        <div class='zenithV4_card_content'>
            <div class='zenithV4_card_header'>
                <h3>$name <span class='$status_class'></span></h3>
                " . ($city ? "<span class='zenithV4_location'>📍 $city</span>" : "") . "
            </div>
        </div>
    </a>
    ";
}

// --- AUTHENTICATION & GUEST HANDLING ---
$zenith_active_page = $GLOBALS['zenith_active_page'] ?? 'page-dashboard';

// Handle Auth Pages (Login/Register) - Render & Exit
if ($zenith_active_page === 'page-login') {
    ?>
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Giriş Yap - <?= htmlspecialchars(get_system_setting($pdo, 'site_name', 'Zenith')) ?></title>
        <link rel="stylesheet" href="themes/zenith/zenithV4_editorialStyle.css">
        <style>body{background:#000;color:#fff;font-family:'Times New Roman', serif;overflow:hidden;}</style>
    </head>
    <body style="display:flex; align-items:center; justify-content:center; height:100vh; background:url('assets/images/zenith_atelier_bg_1769619803003.png') no-repeat center center/cover;">
        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(5px);"></div>
        
        <div class="zenithV4_modal_pane" style="position:relative; width:100%; max-width:400px; padding:3rem; border:1px solid rgba(255,255,255,0.2); background:rgba(20,20,20,0.8); border-radius:0; transform:none; opacity:1;">
            <h1 class="zenithV4_title" style="text-align:center; font-size:3rem; margin-bottom:0.5rem; font-family:var(--zenithV4_font_head);"><?= strtoupper(get_system_setting($pdo, 'site_name', 'ZENITH')) ?></h1>
            <p style="text-align:center; margin-bottom:2rem; font-style:italic; opacity:0.7;">Atelier of Connection</p>
            
            <?php if(isset($_SESSION['error'])): ?>
                <div style="color:#ef4444; text-align:center; margin-bottom:1rem; font-family:sans-serif; font-size:0.8rem;"><?= $_SESSION['error']; unset($_SESSION['error']); ?></div>
            <?php endif; ?>

            <form action="actions/login_action.php" method="POST">
                <div class="zenithV4_form_group">
                    <label class="zenithV4_label">E-POSTA</label>
                    <input type="email" name="email" class="zenithV4_input" required style="border-radius:0;">
                </div>
                <div class="zenithV4_form_group">
                    <label class="zenithV4_label">ŞİFRE</label>
                    <input type="password" name="password" class="zenithV4_input" required style="border-radius:0;">
                </div>
                <button class="zenithV4_btn primary" style="width:100%; border-radius:0; padding:15px; margin-top:1rem;">GİRİŞ YAP</button>
            </form>
            
            <div style="text-align:center; margin-top:2rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                <a href="register.php" style="color:var(--zenithV4_accent); text-decoration:none; font-size:0.8rem; letter-spacing:0.1em; text-transform:uppercase;">Üyelik Oluştur</a>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

if ($zenith_active_page === 'page-register') {
    $error = $_SESSION['error'] ?? ''; unset($_SESSION['error']); // Capture error locally
    ?>
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kayıt Ol - <?= htmlspecialchars(get_system_setting($pdo, 'site_name', 'Zenith')) ?></title>
        <link rel="stylesheet" href="themes/zenith/zenithV4_editorialStyle.css">
        <style>body{background:#000;color:#fff;font-family:'Times New Roman', serif;}</style>
    </head>
    <body style="min-height:100vh; background:url('assets/images/zenith_atelier_bg_1769619803003.png') no-repeat center center/cover; padding:2rem 0;">
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); z-index:0;"></div>
        
        <div class="zenithV4_modal_pane" style="position:relative; width:100%; max-width:500px; margin:0 auto; padding:3rem; border:1px solid rgba(255,255,255,0.2); background:rgba(20,20,20,0.9); border-radius:0; transform:none; opacity:1; z-index:1;">
            <h1 class="zenithV4_title" style="text-align:center; font-size:2.5rem; margin-bottom:2rem; font-family:var(--zenithV4_font_head);">ÜYELİK</h1>
            
            <?php if($error): ?>
                <div style="color:#ef4444; text-align:center; margin-bottom:1rem; font-family:sans-serif; font-size:0.8rem;">
                    <?= $error; ?>
                </div>
            <?php endif; ?>

            <form action="actions/register_action.php" method="POST">
                <div class="zenithV4_form_group">
                    <label class="zenithV4_label">AD SOYAD / KULLANICI ADI</label>
                    <input type="text" name="username" class="zenithV4_input" required style="border-radius:0;">
                </div>
                <div class="zenithV4_form_group">
                    <label class="zenithV4_label">E-POSTA</label>
                    <input type="email" name="email" class="zenithV4_input" required style="border-radius:0;">
                </div>
                <div class="zenithV4_form_group">
                    <label class="zenithV4_label">ŞİFRE</label>
                    <input type="password" name="password" class="zenithV4_input" required style="border-radius:0;">
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div class="zenithV4_form_group">
                        <label class="zenithV4_label">DOĞUM TARİHİ</label>
                        <input type="date" name="birth_date" class="zenithV4_input" required style="border-radius:0;">
                    </div>
                    <div class="zenithV4_form_group">
                        <label class="zenithV4_label">CİNSİYET</label>
                        <select name="gender" class="zenithV4_input" style="border-radius:0; background:#111;">
                            <option value="male">Erkek</option>
                            <option value="female">Kadın</option>
                        </select>
                    </div>
                </div>

                <div class="zenithV4_form_group">
                    <label class="zenithV4_label">Şehir</label>
                    <input type="text" name="city" class="zenithV4_input" required style="border-radius:0;">
                </div>

                <button class="zenithV4_btn primary" style="width:100%; border-radius:0; padding:15px; margin-top:1rem;">KAYIDI TAMAMLA</button>
            </form>
             <div style="text-align:center; margin-top:2rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                <a href="login.php" style="color:var(--zenithV4_accent); text-decoration:none; font-size:0.8rem; letter-spacing:0.1em; text-transform:uppercase;">Zaten üye misin? Giriş Yap</a>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}


if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$current_user_id = $_SESSION['user_id'];

// Fetch User Data & Profile
$stmt = $pdo->prepare("
    SELECT u.id, p.username, u.email, u.coin_balance, u.created_at, u.premium_until, u.status,
           p.profile_picture_url, p.cover_photo_url, p.gallery_photo_1, p.gallery_photo_2,
           p.bio, p.gender, p.birth_date, p.city, p.relationship_intent, p.city_id,
           c.lat as user_lat, c.lng as user_lng, u.gps_lat, u.gps_lng
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    LEFT JOIN cities c ON p.city_id = c.id
    WHERE u.id = ?
");
$stmt->execute([$current_user_id]);
$currentUser = $stmt->fetch(PDO::FETCH_ASSOC);


if (!$currentUser || $currentUser['status'] !== 'active') {
    session_destroy();
    header("Location: index.php?error=suspended");
    exit;
}

// --- DATA FALLBACKS (Same as Aura Theme) ---
// 1. Unread Messages Count
$stmt_unread = $pdo->prepare("SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND is_read = 0");
$stmt_unread->execute([$current_user_id]);
$unread_messages_count = $stmt_unread->fetchColumn();

// 2. Coin Balance
$user_coin_balance = (int)($currentUser['coin_balance'] ?? 0);

// 3. Set GLOBALS for theme compatibility
$GLOBALS['me'] = $currentUser;
$GLOBALS['is_premium'] = false;
$GLOBALS['user_coin_balance'] = $user_coin_balance;
$GLOBALS['unread_messages_count'] = $unread_messages_count;

// Fetch Dynamic Profile Fields
$stmt_fields = $pdo->query("SELECT * FROM profile_fields WHERE is_active = 1 ORDER BY display_order ASC");
$profileFields = $stmt_fields->fetchAll(PDO::FETCH_ASSOC);

// Fetch User's Field Values
$stmt_values = $pdo->prepare("SELECT field_id, value FROM profile_field_values WHERE user_id = ?");
$stmt_values->execute([$current_user_id]);
$userFieldValues = $stmt_values->fetchAll(PDO::FETCH_KEY_PAIR);

// Check Premium Status
$is_user_premium = false;
if (!empty($currentUser['premium_until'])) {
    try {
        $premium_date = new DateTime($currentUser['premium_until']);
        $now = new DateTime();
        $is_user_premium = ($premium_date > $now);
    } catch (Exception $e) {
        $is_user_premium = false;
    }
}

// Set premium status to GLOBALS
$GLOBALS['is_premium'] = $is_user_premium;

// Time Helper
if (!function_exists('time_elapsed_string')) {
    function time_elapsed_string($datetime, $full = false) {
        $now = new DateTime;
        $ago = new DateTime($datetime);
        $diff = $now->diff($ago);

        $w = floor($diff->d / 7);
        $d = $diff->d - ($w * 7);

        $string = array(
            'y' => 'yıl',
            'm' => 'ay',
            'w' => 'hafta',
            'd' => 'gün',
            'h' => 'saat',
            'i' => 'dakika',
            's' => 'saniye',
        );
        
        $string_vals = [
            'y' => $diff->y,
            'm' => $diff->m,
            'w' => $w,
            'd' => $d,
            'h' => $diff->h,
            'i' => $diff->i,
            's' => $diff->s,
        ];
        
        foreach ($string as $k => &$v) {
            if ($string_vals[$k]) {
                $v = $string_vals[$k] . ' ' . $v;
            } else {
                unset($string[$k]);
            }
        }

        if (!$full) $string = array_slice($string, 0, 1);
        return $string ? implode(', ', $string) . ' önce' : 'şimdi';
    }
}

// Age Calculation Helper
if (!function_exists('calculate_zenith_age')) {
    function calculate_zenith_age($dob) {
        if (empty($dob)) return '??';
        try {
            $date = new DateTime($dob);
            $now = new DateTime();
            $interval = $now->diff($date);
            return $interval->y;
        } catch (Exception $e) {
            return '??';
        }
    }
}

$currentUser['age'] = calculate_zenith_age($currentUser['birth_date'] ?? null);

// Helper for Avatar
function get_zenith_avatar($url, $gender) {
    if (!empty($url)) return $url;
    return get_avatar_url($url, $gender ?? 'male');
}

$currentUser['avatar'] = get_zenith_avatar($currentUser['profile_picture_url'], $currentUser['gender']);

// --- FETCH DATA FOR ALL SECTIONS ---

// Map conversations from chat.php (if available)
$conversations = $GLOBALS['conversations'] ?? [];
$sidebar_conversations = $GLOBALS['sidebar_conversations'] ?? [];
$other_user = $GLOBALS['other_user'] ?? null;
$conversation_id = $GLOBALS['conversation_id'] ?? 0;
$match_id = $GLOBALS['match_id'] ?? 0;

// 1. MATCHES
$stmt_matches = $pdo->prepare("
    SELECT m.id, m.created_at,
           CASE 
               WHEN m.user1_id = ? THEN m.user2_id 
               ELSE m.user1_id 
           END as matched_user_id,
           p.username, p.profile_picture_url, p.birth_date, p.gender, p.city, p.bio, p.relationship_intent
    FROM matches m
    LEFT JOIN profiles p ON (
        CASE 
            WHEN m.user1_id = ? THEN m.user2_id 
            ELSE m.user1_id 
        END = p.user_id
    )
    WHERE (m.user1_id = ? OR m.user2_id = ?)
    AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = m.user1_id AND b.blocked_id = m.user2_id)
           OR (b.blocker_id = m.user2_id AND b.blocked_id = m.user1_id)
    )
    ORDER BY m.created_at DESC
    LIMIT 50
");
$stmt_matches->execute([$current_user_id, $current_user_id, $current_user_id, $current_user_id]);
$matches = $stmt_matches->fetchAll(PDO::FETCH_ASSOC);

// 2. MESSAGES (Conversations)
$stmt_conversations = $pdo->prepare("
    SELECT c.id as conversation_id,
           CASE 
               WHEN c.user1_id = ? THEN c.user2_id 
               ELSE c.user1_id 
           END as other_user_id,
           p.username, p.profile_picture_url, p.gender,
           (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
           (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as sender_id,
           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND receiver_id = ? AND is_read = 0) as unread_count
    FROM conversations c
    LEFT JOIN profiles p ON (
        CASE 
            WHEN c.user1_id = ? THEN c.user2_id 
            ELSE c.user1_id 
        END = p.user_id
    )
    WHERE (c.user1_id = ? OR c.user2_id = ?)
      AND c.user1_status = 'active' AND c.user2_status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = c.user1_id AND b.blocked_id = c.user2_id)
             OR (b.blocker_id = c.user2_id AND b.blocked_id = c.user1_id)
      )
    ORDER BY last_message_time DESC
    LIMIT 50
");
$stmt_conversations->execute([$current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id]);
$conversations = $stmt_conversations->fetchAll(PDO::FETCH_ASSOC);

// 3. VISITORS
$stmt_visitors = $pdo->prepare("
    SELECT v.id, v.visitor_id, v.created_at as visited_at,
           p.username, p.profile_picture_url, p.birth_date, p.gender, p.city
    FROM profile_visits v
    LEFT JOIN profiles p ON v.visitor_id = p.user_id
    WHERE v.visited_id = ?
    ORDER BY v.created_at DESC
    LIMIT 50
");
$stmt_visitors->execute([$current_user_id]);
$visitors = $stmt_visitors->fetchAll(PDO::FETCH_ASSOC);

// 4. NOTIFICATIONS
$stmt_notifications = $pdo->prepare("
    SELECT id, type, data_json, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
");
$stmt_notifications->execute([$current_user_id]);
$notifications = $stmt_notifications->fetchAll(PDO::FETCH_ASSOC);
$unread_notifications = 0;
foreach ($notifications as $notif) {
    if (!$notif['is_read']) $unread_notifications++;
}

// 5. SWIPE USERS (Discover)
$stmt_swipe = $pdo->prepare("
    SELECT u.id, p.username, p.profile_picture_url, p.bio, p.birth_date, p.gender, p.city
    FROM users u
    INNER JOIN profiles p ON u.id = p.user_id
    WHERE u.id != ?
      AND u.id NOT IN (
          SELECT liked_id FROM likes WHERE liker_id = ?
      )
      AND u.id NOT IN (
          SELECT user2_id FROM matches WHERE user1_id = ?
          UNION
          SELECT user2_id FROM matches WHERE user1_id = ?
          UNION
          SELECT user1_id FROM matches WHERE user2_id = ?
      )
      AND u.status = 'active'
      AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
      AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
    ORDER BY RAND()
    LIMIT 20
");
$stmt_swipe->execute([$current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id]);
$swipeUsers = $stmt_swipe->fetchAll(PDO::FETCH_ASSOC);

// 5.5 BOOST DATA
$my_boost = $GLOBALS['my_boost'] ?? null;
if (!$my_boost) {
    try {
        $stmt_mb = $pdo->prepare("SELECT u.boost_until, p.profile_picture_url, p.gender, p.username FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.id = ? AND u.boost_until > NOW()");
        $stmt_mb->execute([$current_user_id]);
        $my_boost = $stmt_mb->fetch(PDO::FETCH_ASSOC);
        $GLOBALS['my_boost'] = $my_boost;
    } catch (Exception $e) {}
}

$boosted_users = $GLOBALS['boosted_users'] ?? [];
if (empty($boosted_users)) {
    try {
        $stmt_bu = $pdo->prepare("SELECT p.user_id, p.username, p.profile_picture_url, p.gender, u.boost_until FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.boost_until > NOW() AND u.status = 'active' AND u.id != ? ORDER BY u.boost_until DESC LIMIT 20");
        $stmt_bu->execute([$current_user_id]);
        $boosted_users = $stmt_bu->fetchAll(PDO::FETCH_ASSOC);
        $GLOBALS['boosted_users'] = $boosted_users;
    } catch (Exception $e) {}
}

// 6. DISCOVERY (Search/Explore)
$f_gender = $_GET['gender'] ?? '';
$f_city = $_GET['city'] ?? '';
$f_min_age = (int)($_GET['min_age'] ?? 18);
$f_max_age = (int)($_GET['max_age'] ?? 99);
$f_intent = $_GET['intent'] ?? '';

// Load Dynamic Settings
$stmt_sets = $pdo->query("SELECT * FROM suggestion_settings WHERE id = 1");
$sSets = $stmt_sets->fetch(PDO::FETCH_ASSOC);

$maxPerRing = max(1, (int)($sSets['galaxy_max_users_per_ring'] ?? 20));
$distNear = max(1, (int)($sSets['galaxy_dist_near'] ?? 20));
$distMid = max($distNear + 1, (int)($sSets['galaxy_dist_mid'] ?? 100));
$distFar = max($distMid + 1, (int)($sSets['galaxy_dist_far'] ?? 400));

$user_lat = isset($currentUser['user_lat']) ? (float)$currentUser['user_lat'] : null;
$user_lng = isset($currentUser['user_lng']) ? (float)$currentUser['user_lng'] : null;
if ($user_lat === null || $user_lng === null) {
    $user_lat = isset($currentUser['gps_lat']) ? (float)$currentUser['gps_lat'] : null;
    $user_lng = isset($currentUser['gps_lng']) ? (float)$currentUser['gps_lng'] : null;
}

$hasUserCoords = ($user_lat !== null && $user_lng !== null);
$distance_sql = $hasUserCoords
    ? "(6371 * acos(LEAST(1, COS(RADIANS($user_lat)) * COS(RADIANS(COALESCE(c.lat, u.gps_lat))) * COS(RADIANS(COALESCE(c.lng, u.gps_lng)) - RADIANS($user_lng)) + SIN(RADIANS($user_lat)) * SIN(RADIANS(COALESCE(c.lat, u.gps_lat))))))"
    : "NULL";

$disc_sql = "
    SELECT u.id, p.username, p.profile_picture_url, p.birth_date, p.gender, p.city, p.bio, p.relationship_intent,
           c.lat, c.lng, {$distance_sql} AS distance_km
    FROM users u
    INNER JOIN profiles p ON u.id = p.user_id
    LEFT JOIN cities c ON p.city_id = c.id
    WHERE u.id != ? AND u.status = 'active'
";
$disc_params = [$current_user_id];

if ($f_gender) {
    if ($f_gender === 'other') {
         $disc_sql .= " AND (p.gender != 'male' AND p.gender != 'female')";
    } else {
         $disc_sql .= " AND p.gender = ?";
         $disc_params[] = $f_gender;
    }
}
if ($f_city) {
    $disc_sql .= " AND (p.city LIKE ? OR c.name LIKE ?)";
    $disc_params[] = "%$f_city%";
    $disc_params[] = "%$f_city%";
}
if ($f_intent) {
    $disc_sql .= " AND p.relationship_intent = ?";
    $disc_params[] = $f_intent;
}

$disc_sql .= " AND TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) BETWEEN ? AND ?";
$disc_params[] = $f_min_age;
$disc_params[] = $f_max_age;
$disc_sql .= $hasUserCoords
    ? " ORDER BY distance_km ASC LIMIT 300"
    : " ORDER BY u.last_seen DESC LIMIT 300";

$stmt_disc = $pdo->prepare($disc_sql);
$stmt_disc->execute($disc_params);
$allFetchedUsers = $stmt_disc->fetchAll(PDO::FETCH_ASSOC);

// Group users into distance buckets
$maxPerRingUI = max(1, $maxPerRing);
$bucketNear = []; 
$bucketMid = [];  
$bucketFar = [];  
$bucketExtreme = []; 

foreach ($allFetchedUsers as $dUser) {
    $dist = (float)($dUser['distance_km'] ?? 0);
    if ($dist <= $distNear) {
        if (count($bucketNear) < $maxPerRingUI) {
            $dUser['ring_idx'] = count($bucketNear);
            $bucketNear[] = $dUser;
        }
    } elseif ($dist <= $distMid) {
        if (count($bucketMid) < $maxPerRingUI) {
            $dUser['ring_idx'] = count($bucketMid);
            $bucketMid[] = $dUser;
        }
    } elseif ($dist <= $distFar) {
        if (count($bucketFar) < $maxPerRingUI) {
            $dUser['ring_idx'] = count($bucketFar);
            $bucketFar[] = $dUser;
        }
    } else {
        if (count($bucketExtreme) < $maxPerRingUI) {
            $dUser['ring_idx'] = count($bucketExtreme);
            $bucketExtreme[] = $dUser;
        }
    }
}

// Combine all balanced buckets
$discoveryUsers = array_merge($bucketNear, $bucketMid, $bucketFar, $bucketExtreme);


$myAvatar = get_zenith_avatar($currentUser['profile_picture_url'], $currentUser['gender']);

// Use already fetched data from top
$unreadCount = 0;
foreach ($conversations as $conv) {
    $unreadCount += (int)($conv['unread_count'] ?? 0);
}
$matchCount = count($matches);

// Enrich matches array with avatar
$matchesData = [];
foreach ($matches as $match) {
    $matchesData[] = [
        'match_id' => $match['id'],
        'partner_id' => $match['matched_user_id'],
        'match_date' => $match['created_at'],
        'username' => $match['username'],
        'avatar' => get_zenith_avatar($match['profile_picture_url'], $match['gender']),
    ];
}

// Enrich visitors with avatar (already fetched at top)
$visitorsData = [];
foreach ($visitors as $visitor) {
    $visitorsData[] = [
        'visitor_id' => $visitor['visitor_id'],
        'visited_at' => $visitor['visited_at'],
        'username' => $visitor['username'],
        'avatar' => get_zenith_avatar($visitor['profile_picture_url'], $visitor['gender']),
        'age' => calculate_zenith_age($visitor['birth_date']),
    ];
}

// Conversations already fetched and enriched at top - just add avatar
foreach ($conversations as &$conv) {
    if (!isset($conv['avatar'])) {
        $conv['avatar'] = get_zenith_avatar($conv['profile_picture_url'] ?? '', $conv['gender'] ?? '');
    }
}
unset($conv);

// Swipe users already fetched - just enrich
foreach ($swipeUsers as &$su) {
    if (!isset($su['age'])) {
        $su['age'] = calculate_zenith_age($su['birth_date']);
    }
    if (!isset($su['avatar'])) {
        $su['avatar'] = get_zenith_avatar($su['profile_picture_url'], $su['gender']);
    }
}
unset($su);


?>
<!DOCTYPE html>
<html lang="tr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zenith V4 | Member Portal</title>
    <link rel="stylesheet" href="<?= SITE_URL ?>/themes/zenith/zenithV4_editorialStyle.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Italiana&family=Tenor+Sans&display=swap" rel="stylesheet">

    <style>
        /* GALAXY DISCOVERY STYLES */
        .zenithV4_galaxy_container {
            position: relative;
            width: 100%;
            height: 100vh;
            background: var(--zenithV4_bg); /* Integrated background */
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
        }

        /* Viewport that handles the zoom */
        .zenithV4_galaxy_viewport {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
            transform-origin: center center;
        }

        .zenithV4_galaxy_stars {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background-image: 
                radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 40px),
                radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 30px),
                radial-gradient(white, rgba(255,255,255,.1) 2px, transparent 40px);
            background-size: 550px 550px, 350px 350px, 250px 250px;
            background-position: 0 0, 40px 60px, 130px 270px;
            animation: galaxyRotate 200s linear infinite;
            opacity: 0.3;
            pointer-events: none;
        }

        @keyframes galaxyRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .zenithV4_galaxy_orbit {
            position: absolute;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 50%;
            pointer-events: none;
        }

        .zenithV4_orbit_label {
            position: absolute;
            color: rgba(255, 255, 255, 0.4);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            pointer-events: none;
            background: rgba(0,0,0,0.5);
            padding: 2px 8px;
            border-radius: 10px;
        }

        .zenithV4_galaxy_center {
            position: relative;
            width: 120px;
            height: 120px;
            z-index: 10;
        }

        .zenithV4_galaxy_center_avatar {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 4px solid var(--zenithV4_accent);
            box-shadow: 0 0 40px rgba(212, 175, 55, 0.4);
            object-fit: cover;
        }

        .zenithV4_galaxy_user {
            position: absolute;
            width: 60px;
            height: 60px;
            cursor: pointer;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 5;
            opacity: 0;
        }

        .zenithV4_galaxy_user:hover {
            transform: scale(1.4);
            z-index: 20;
        }

        .zenithV4_galaxy_user_img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #fff;
            box-shadow: 0 0 20px rgba(255,255,255,0.4);
            object-fit: cover;
        }

        .zenithV4_galaxy_user_label {
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            font-size: 0.7rem;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 4px 10px;
            border-radius: 15px;
            opacity: 0;
            transition: opacity 0.3s;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .zenithV4_galaxy_user:hover .zenithV4_galaxy_user_label {
            opacity: 1;
        }

        .zenithV4_galaxy_line {
            position: absolute;
            background: linear-gradient(90deg, var(--zenithV4_accent) 0%, transparent 100%);
            height: 1px;
            transform-origin: left center;
            opacity: 0.15;
            pointer-events: none;
        }

        /* Zoom Controls */
        .zenithV4_zoom_controls {
            position: absolute;
            right: 30px;
            bottom: 30px;
            z-index: 110;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .zenithV4_zoom_btn {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.5rem;
            transition: all 0.2s;
        }

        .zenithV4_zoom_btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
            border-color: var(--zenithV4_accent);
        }

        .zenithV4_filter_overlay {
            position: absolute;
            top: 25px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 120;
            background: rgba(10, 10, 11, 0.7);
            backdrop-filter: blur(15px);
            padding: 12px 25px;
            border-radius: 50px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            max-width: 95%;
        }

        .zenithV4_filter_form {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: center;
        }
        /* --- MOBILE LAYOUT (PREMIUM HEADER/FOOTER) --- */
        .zenithV4_mobile_header, .zenithV4_bottom_tab_bar { display: none; }

        @media screen and (max-width: 768px) {
            /* Hide Sidebar */
            .zenithV4_sidebar {
                display: none !important;
            }

            /* Scroll Fixes */
            html, body, .zenithV4_app_body {
                overflow-y: auto !important;
                height: auto !important;
                min-height: 100%;
                -webkit-overflow-scrolling: touch;
            }

            /* Adjust Layout Grid */
            .zenithV4_app_wrapper {
                display: block !important; /* Switch from grid to block flow */
                width: 100% !important;
                height: auto !important;
                min-height: 100vh !important;
                overflow: visible !important;
                padding-top: 60px;    /* Space for header */
                padding-bottom: 90px; /* Space for footer */
            }

            /* Main padding adjustment */
            .zenithV4_main {
                padding: 15px !important;
                height: auto !important;
                overflow: visible !important;
                display: block !important;
            }

            /* --- MOBILE HEADER --- */
            .zenithV4_header { display: none !important; }

            .zenithV4_mobile_header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: fixed;
                top: 0; left: 0; right: 0;
                height: 60px;
                background: rgba(18, 18, 18, 0.95);
                backdrop-filter: blur(12px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                z-index: 9999;
                padding: 0 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            }
            .zenithV4_m_logo {
                font-family: 'Italiana', serif;
                font-size: 1.4rem;
                color: #fff;
                letter-spacing: 2px;
                text-transform: uppercase;
                background: linear-gradient(90deg, #fff, #bbb);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .zenithV4_m_actions {
                display: flex; align-items: center; gap: 15px;
            }
            .zenithV4_m_coin {
                font-family: 'Tenor Sans', sans-serif;
                font-size: 0.85rem; color: #D4AF37;
                display: flex; align-items: center; gap: 4px;
                background: rgba(212,175,55,0.1);
                padding: 4px 10px; border-radius: 20px;
                border: 1px solid rgba(212,175,55,0.2);
                text-decoration: none;
            }

            /* --- BOTTOM TAB BAR --- */
            .zenithV4_bottom_tab_bar {
                display: flex;
                align-items: center;
                justify-content: space-around;
                position: fixed;
                bottom: 0; left: 0; right: 0;
                height: 70px;
                background: rgba(15, 15, 15, 0.98);
                backdrop-filter: blur(15px);
                border-top: 1px solid rgba(255, 255, 255, 0.08); /* Subtle border */
                z-index: 9999;
                padding-bottom: 15px; /* Safe area */
                box-shadow: 0 -5px 25px rgba(0,0,0,0.5);
            }
            
            .zenithV4_tab_item {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: rgba(255, 255, 255, 0.4);
                text-decoration: none;
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                position: relative;
                padding-top: 5px;
            }
            
            .zenithV4_tab_icon {
                font-size: 1.3rem;
                margin-bottom: 4px;
                transition: transform 0.2s;
            }
            
            .zenithV4_tab_label {
                font-size: 0.6rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-family: 'Tenor Sans', sans-serif;
            }

            .zenithV4_tab_item.active {
                color: #D4AF37;
            }
            
            .zenithV4_tab_item.active .zenithV4_tab_icon {
                transform: translateY(-2px);
                text-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
            }

            /* Dashboard Grid Adjustments */
            .zenith_dash_grid {
                grid-template-columns: 1fr !important;
                gap: 1.5rem !important;
            }
            .z_stat_grid {
                grid-template-columns: 1fr 1fr !important;
            }
            .z_card { padding: 1.5rem !important; }
        }
    </style>

<body class="zenithV4_app_body">

    <div class="zenithV4_app_wrapper">
        
        <!-- MOBILE HEADER -->
        <header class="zenithV4_mobile_header">
            <div class="zenithV4_m_logo" onclick="window.history.length > 1 ? window.history.back() : window.location.href='dashboard.php'" style="cursor:pointer; display:flex; align-items:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </div>
            <div class="zenithV4_m_actions">
                <a href="notifications.php" style="margin-right:12px; position:relative; text-decoration:none; display:flex; align-items:center;">
                    <span style="font-size:1.4rem;">🔔</span>
                    <?php if(($GLOBALS['unread_notifications'] ?? 0) > 0): ?>
                    <span style="position:absolute; top:0; right:0; width:9px; height:9px; background:#ef4444; border-radius:50%; border:1px solid #000;"></span>
                    <?php endif; ?>
                </a>
                <a href="wallet.php" class="zenithV4_m_coin">
                    <span>◈</span> <span id="zenithCoinBalanceMobile"><?= number_format($currentUser['coin_balance'] ?? 0) ?></span>
                </a>
                <a href="#menu" onclick="toggleZenithMobileMenu(); return false;" style="display:block; width:34px; height:34px; border-radius:50%; overflow:hidden; border:1px solid rgba(255,255,255,0.3); position:relative;">
                    <img src="<?= htmlspecialchars($myAvatar ?? 'assets/images/default-avatar.png') ?>" style="width:100%; height:100%; object-fit:cover;">
                </a>
            </div>
        </header>

        <!-- MOBILE MENU OVERLAY (Hidden by default) -->
        <?php $is_vip = $GLOBALS['is_premium'] ?? false; ?>
        <div id="zenithMobileMenu" style="display:none; position:fixed; top:60px; left:0; right:0; bottom:0; background:rgba(10,10,10,0.95); backdrop-filter:blur(15px); z-index:9998; flex-direction:column; padding:2rem; overflow-y:auto;">
            <div style="text-align:center; margin-bottom:2rem;">
                <img src="<?= htmlspecialchars($myAvatar ?? '') ?>" style="width:80px; height:80px; border-radius:50%; border:2px solid #D4AF37; margin-bottom:1rem;">
                <h3 style="font-family:var(--zenithV4_font_head); font-size:1.5rem; margin-bottom:0.5rem;"><?= htmlspecialchars($currentUser['username']) ?></h3>
                <span style="font-size:0.8rem; color:var(--zenithV4_text_dim); text-transform:uppercase; letter-spacing:1px;"><?= $is_vip ? 'Premium Üye' : 'Standart Üye' ?></span>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                <a href="profile.php" class="zenithV4_menu_btn" style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:15px; text-align:center; text-decoration:none; color:#fff;">
                    <span style="display:block; font-size:1.5rem; margin-bottom:0.5rem;">👤</span>
                    <span style="font-size:0.8rem;">Profilim</span>
                </a>
                <a href="swipe.php" class="zenithV4_menu_btn" style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:15px; text-align:center; text-decoration:none; color:#fff;">
                    <span style="display:block; font-size:1.5rem; margin-bottom:0.5rem;">⚡</span>
                    <span style="font-size:0.8rem;">Swipe</span>
                </a>
                <a href="notifications.php" class="zenithV4_menu_btn" style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:15px; text-align:center; text-decoration:none; color:#fff; position:relative;">
                    <span style="display:block; font-size:1.5rem; margin-bottom:0.5rem;">🔔</span>
                    <span style="font-size:0.8rem;">Bildirimler</span>
                    <?php if(($GLOBALS['unread_notifications'] ?? 0) > 0): ?>
                        <span style="position:absolute; top:10px; right:10px; width:8px; height:8px; background:#ef4444; border-radius:50%;"></span>
                    <?php endif; ?>
                </a>
                <a href="gifts.php" class="zenithV4_menu_btn" style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:15px; text-align:center; text-decoration:none; color:#fff;">
                    <span style="display:block; font-size:1.5rem; margin-bottom:0.5rem;">🎁</span>
                    <span style="font-size:0.8rem;">Hediyeler</span>
                </a>
                <a href="visitors.php" class="zenithV4_menu_btn" style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:15px; text-align:center; text-decoration:none; color:#fff;">
                    <span style="display:block; font-size:1.5rem; margin-bottom:0.5rem;">👁</span>
                    <span style="font-size:0.8rem;">Ziyaretçiler</span>
                </a>
                <a href="premium.php" class="zenithV4_menu_btn" style="background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3); padding:1rem; border-radius:15px; text-align:center; text-decoration:none; color:#D4AF37;">
                    <span style="display:block; font-size:1.5rem; margin-bottom:0.5rem;">💎</span>
                    <span style="font-size:0.8rem;">Premium</span>
                </a>
            </div>

            <a href="logout.php" style="margin-top:2rem; padding:1rem; text-align:center; color:#ef4444; text-decoration:none; border:1px solid rgba(239,68,68,0.3); border-radius:10px; font-size:0.9rem;">Çıkış Yap</a>
        </div>

        <script>
            function toggleZenithMobileMenu() {
                const menu = document.getElementById('zenithMobileMenu');
                if(menu.style.display === 'none' || menu.style.display === '') {
                    menu.style.display = 'flex';
                    // Disable scroll on body
                    document.body.style.overflow = 'hidden';
                } else {
                    menu.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            }
        </script>

        <!-- MOBILE BOTTOM NAV -->
        <nav class="zenithV4_bottom_tab_bar">
            <?php 
              $z_page = $GLOBALS['zenith_active_page'] ?? ''; 
              $tab_dash = ($z_page === 'page-dashboard') ? 'active' : '';
              $tab_disc = ($z_page === 'page-discover') ? 'active' : '';
              $tab_swipe = ($z_page === 'page-swipe') ? 'active' : '';
              $tab_chat = ($z_page === 'page-messages') ? 'active' : '';
              $tab_prof = ($z_page === 'page-profile-edit' || $z_page === 'page-settings') ? 'active' : '';
            ?>
            
            <a href="dashboard.php" class="zenithV4_tab_item <?= $tab_dash ?>">
                <span class="zenithV4_tab_icon">❖</span>
                <span class="zenithV4_tab_label">Home</span>
            </a>
            
            <a href="discover.php" class="zenithV4_tab_item <?= $tab_disc ?>">
                <span class="zenithV4_tab_icon">◈</span>
                <span class="zenithV4_tab_label">Keşfet</span>
            </a>
            
            <a href="swipe.php" class="zenithV4_tab_item <?= $tab_swipe ?>">
                <span class="zenithV4_tab_icon">⚡</span>
                <span class="zenithV4_tab_label">Swipe</span>
            </a>
            
            <a href="chat.php" class="zenithV4_tab_item <?= $tab_chat ?>" style="position:relative;">
                <span class="zenithV4_tab_icon">✉</span>
                <span class="zenithV4_tab_label">Mesaj</span>
                <?php if(($GLOBALS['unread_messages_count'] ?? 0) > 0): ?>
                    <span style="position:absolute; top:8px; right:25%; width:6px; height:6px; background:#ef4444; border-radius:50%; box-shadow:0 0 5px #ef4444;"></span>
                <?php endif; ?>
            </a>
            
            <a href="profile_edit.php" class="zenithV4_tab_item <?= $tab_prof ?>">
                <span class="zenithV4_tab_icon">⚙</span>
                <span class="zenithV4_tab_label">Ayarlar</span>
            </a>
        </nav>

        <!-- SIDEBAR NAVIGATION -->
        <aside class="zenithV4_sidebar">
            <a href="index.php" class="zenithV4_brand_mark">Z</a>

            <nav class="zenithV4_nav_menu">
                <a href="dashboard.php" class="zenithV4_nav_item <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-dashboard') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">❖</span>
                    <span class="zenithV4_nav_label">Dashboard</span>
                </a>

                <a href="discover.php" class="zenithV4_nav_item <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-discover') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">◈</span>
                    <span class="zenithV4_nav_label">Keşfet</span>
                </a>

                <a href="swipe.php" class="zenithV4_nav_item <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-swipe') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">⚡</span>
                    <span class="zenithV4_nav_label">Swipe</span>
                </a>

                <a href="chat.php" class="zenithV4_nav_item nav_messages <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-messages') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">✉</span>
                    <span class="zenithV4_nav_label">Mesajlar</span>
                    <?php if ($unreadCount > 0): ?>
                    <span class="zenithV4_badge" style="background:var(--zenithV4_accent_sec);"><?= $unreadCount ?></span>
                    <?php endif; ?>
                </a>

                <a href="visitors.php" class="zenithV4_nav_item <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-visitors') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">👁</span>
                    <span class="zenithV4_nav_label">Ziyaretler</span>
                </a>

                <a href="notifications.php" class="zenithV4_nav_item nav_notifications <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-notifications') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">🔔</span>
                    <span class="zenithV4_nav_label">Bildirimler</span>
                    <?php if ($unread_notifications > 0): ?>
                    <span class="zenithV4_badge" style="background:#ff4444;"><?= $unread_notifications ?></span>
                    <?php endif; ?>
                </a>

                <a href="gifts.php" class="zenithV4_nav_item <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-gifts') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">🎁</span>
                    <span class="zenithV4_nav_label">Hediyeler</span>
                </a>

                <a href="premium.php" class="zenithV4_nav_item <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-premium') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">💎</span>
                    <span class="zenithV4_nav_label">Premium</span>
                </a>

                <a href="profile.php" class="zenithV4_nav_item <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-profile') ? 'active' : '' ?>">
                    <span class="zenithV4_nav_icon">✎</span>
                    <span class="zenithV4_nav_label">Profil</span>
                </a>

                <div style="margin-top:auto;"></div>

                <a href="#settings" class="zenithV4_nav_item" onclick="document.querySelector('#page-settings').scrollIntoView({behavior:'smooth'}); return false;">
                    <span class="zenithV4_nav_icon">⚙</span>
                    <span class="zenithV4_nav_label">Ayarlar</span>
                </a>
            </nav>
        </aside>

        <!-- MAIN CONTENT -->
        <main class="zenithV4_main">
            
            <!-- ZENITH TOPBAR (Desktop) -->
            <header class="zenithV4_topbar">
                <div class="zenithV4_topbar_left">
                    <span style="opacity:0.4; font-size:0.75rem; letter-spacing:2px; text-transform:uppercase; font-family:var(--zenithV4_font_head);">Atelier <?= htmlspecialchars(get_system_setting($pdo, 'site_name', 'Zenith')) ?></span>
                </div>
                <div class="zenithV4_topbar_right">
                    <!-- Coins -->
                    <div class="zenithV4_top_item" onclick="showZenithPage('page-wallet')" title="Cüzdan">
                        <span class="z_top_icon" style="color:#D4AF37;">◎</span>
                        <span class="z_top_val" id="zenithCoinBalanceDesktopTopbar"><?= $user_coin_balance ?></span>
                    </div>
                    <!-- Notifications -->
                    <div class="zenithV4_top_item" onclick="showZenithPage('page-notifications')" title="Bildirimler">
                        <span class="z_top_icon">🔔</span>
                        <span id="zenithUnreadNotifTopbar" class="z_top_badge" style="<?= ($unread_notifications > 0) ? '' : 'display:none;' ?>"><?= $unread_notifications ?></span>
                    </div>
                    <!-- Messages -->
                    <div class="zenithV4_top_item" onclick="showZenithPage('page-messages')" title="Mesajlar">
                        <span class="z_top_icon">✉</span>
                        <span id="zenithUnreadMsgTopbar" class="z_top_badge" style="<?= ($unread_messages_count > 0) ? '' : 'display:none;' ?>"><?= $unread_messages_count ?></span>
                    </div>
                    <!-- Profile Mini -->
                    <div class="zenithV4_top_profile" onclick="showZenithPage('page-profile-edit')" title="Profil">
                         <img src="<?= htmlspecialchars(get_avatar_url($currentUser['profile_picture_url'] ?? '', $currentUser['gender'] ?? '')) ?>">
                    </div>
                </div>
            </header>
            
            <!-- NOTIFICATIONS SECTION (Hidden by default unless active) -->
            <section id="page-notifications" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-notifications') ? 'active' : '' ?>">
                 <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Bildirimler</h1>
                </header>
                <div class="zenithV4_dashboard_grid" style="display:block;">
                    <?php if (empty($notifications)): ?>
                        <div style="text-align:center; padding:3rem; color:var(--zenithV4_text_dim);">Henüz bildirim yok.</div>
                    <?php else: ?>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                        <?php foreach($notifications as $notif): 
                              $data = json_decode($notif['data_json'] ?? '{}', true);
                              $msg = $data['message'] ?? 'Yeni bildirim';
                              $img = $data['image'] ?? 'assets/images/logo-icon.png';
                        ?>
                            <div class="zenithV4_chat_item" style="cursor:default; opacity: <?= $notif['is_read'] ? '0.6' : '1' ?>;">
                                <div style="display:flex; align-items:center; gap:1rem; width:100%;">
                                    <div style="width:10px; height:10px; background:<?= $notif['is_read'] ? 'transparent' : 'var(--zenithV4_accent)' ?>; border-radius:50%;"></div>
                                    <div>
                                        <div style="font-weight:bold; font-size:0.9rem;"><?= htmlspecialchars($msg) ?></div>
                                        <div style="font-size:0.7rem; color:var(--zenithV4_text_dim);"><?= time_elapsed_string($notif['created_at']) ?></div>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </section>


            <!-- 1. DASHBOARD (Redesigned) -->
            <section id="page-dashboard" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-dashboard') ? 'active' : '' ?>">
                <?php
                    // Data Calculation
                    // 1. Stats from dashboard.php or fallback from local arrays
                    $d_stats = $GLOBALS['dashboard_stats'] ?? [
                        'matches_count' => count($matchesData ?? []),
                        'visits_count' => count($visitorsData ?? []),
                        'new_likes_count' => 0, 
                        'today_visits_count' => 0
                    ];
                    
                    // 2. Profile Completion Calc (Simple estimation based on available fields)
                    $p_comp = 20; // Base
                    if(!empty($currentUser['profile_picture_url'])) $p_comp += 20;
                    if(!empty($currentUser['bio'])) $p_comp += 15;
                    if(!empty($currentUser['city']) || !empty($currentUser['city_id'])) $p_comp += 15;
                    if(!empty($currentUser['relationship_intent'])) $p_comp += 15;
                    if(!empty($userFieldValues) && count($userFieldValues) > 0) $p_comp += 15;
                    $p_comp = min(100, $p_comp);
                    
                    // 3. User Data
                    $u_name = htmlspecialchars($currentUser['username'] ?? 'Üye');
                    $u_avatar = htmlspecialchars($myAvatar);
                    $u_coins = number_format($currentUser['coin_balance'] ?? 0);
                    $is_vip = ($GLOBALS['is_premium'] ?? false);
                ?>

                <style>
                    /* Zenith Dashboard Styles (Scoped by Section ID/Class not strictly possible in CSS but effectively scoped by usage) */
                    .zenith_dash_grid {
                        display: grid; grid-template-columns: 2.5fr 1fr; gap: 2rem;
                        max-width: 1400px; margin: 0 auto;
                    }
                    @media(max-width: 1000px) { .zenith_dash_grid { grid-template-columns: 1fr; } }

                    .z_card {
                        background: linear-gradient(145deg, #121212, #0A0A0A);
                        border: 1px solid rgba(255,255,255,0.05);
                        border-radius: 20px;
                        padding: 2rem;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                        position: relative; overflow: hidden;
                        transition: transform 0.3s ease;
                    }
                    .z_card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.08); }

                    .z_overview { display: flex; align-items: center; gap: 2rem; }
                    @media(max-width: 600px) { .z_overview { flex-direction: column; text-align: center; } }

                    .z_avatar_framed { 
                        position: relative; width: 110px; height: 110px; flex-shrink: 0;
                        border-radius: 50%; padding: 5px; 
                        border: 1px solid rgba(255,255,255,0.1);
                        background: rgba(20,20,20,0.5);
                    }
                    .z_avatar_img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
                    
                    .z_completion_badge {
                        background: rgba(212,175,55,0.08); color: #D4AF37;
                        font-size: 0.75rem; padding: 6px 14px; border-radius: 20px;
                        border: 1px solid rgba(212,175,55,0.15); display: inline-block; margin-bottom: 0.8rem;
                        letter-spacing: 0.5px;
                    }

                    .z_stat_grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2rem; }
                    .z_mini_stat { 
                        background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 16px; 
                        text-align: left; border: 1px solid rgba(255,255,255,0.03); transition: 0.3s;
                        position: relative;
                    }
                    .z_mini_stat:hover { background: rgba(255,255,255,0.04); }
                    .z_ms_val { font-size: 2rem; font-family: var(--zenithV4_font_head); display: block; margin-bottom: 0.2rem; line-height: 1; }
                    .z_ms_lbl { font-size: 0.7rem; color: var(--zenithV4_text_dim); letter-spacing: 1px; text-transform: uppercase; }
                    .z_spark { height: 3px; width: 40px; border-radius: 2px; margin-top: 1rem; opacity: 0.6; }

                    .z_insight { 
                        margin-top: 2rem; padding: 1.2rem; border-left: 3px solid #D4AF37; margin-left:1px;
                        background: linear-gradient(90deg, rgba(212,175,55,0.04), transparent);
                        display: flex; align-items: center; justify-content: space-between;
                        border-radius: 0 12px 12px 0;
                    }

                    /* Right Col */
                    .z_wallet_row {
                        display: flex; justify-content: space-between; align-items: center;
                        margin-bottom: 1.2rem; padding-bottom: 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.05);
                    }
                    .z_coin_display { font-size: 1.4rem; display: flex; align-items: center; gap: 0.6rem; font-family: var(--zenithV4_font_head); color: #fff; }

                    .z_quick_actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                    .z_qa_btn {
                        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.02); color: #bbb;
                        padding: 1.2rem; border-radius: 16px; cursor: pointer; text-align: center;
                        transition: 0.3s; display: flex; flex-direction: column; align-items: center; gap: 0.8rem;
                        text-decoration: none; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;
                    }
                    .z_qa_btn:hover { background: rgba(255,255,255,0.07); color: #fff; border-color: rgba(255,255,255,0.1); transform: translateY(-2px); }
                    .z_qa_icon { font-size: 1.4rem;  }

                    .z_list_item {
                         display: flex; align-items: center; gap: 1rem; padding: 0.8rem 0;
                         border-bottom: 1px solid rgba(255,255,255,0.03); color: inherit; text-decoration: none;
                         transition: 0.2s;
                    }
                    .z_list_item:hover { background: rgba(255,255,255,0.02); padding-left: 0.5rem; padding-right: 0.5rem; border-radius: 8px; border-color: transparent;}
                    .z_list_item:last-child { border: none; }
                    .z_li_img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
                    .z_li_info h4 { font-size: 0.95rem; margin: 0; font-weight: normal; color: #eee; }
                    .z_li_time { font-size: 0.7rem; color: var(--zenithV4_text_dim); margin-top: 2px; display: block; }

                    /* Edit btn */
                     .z_edit_btn {
                         background: transparent; border: 1px solid rgba(255,255,255,0.2); 
                         color: #fff; padding: 10px 24px; border-radius: 30px; font-size: 0.8rem;
                         cursor: pointer; transition: 0.2s; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;
                     }
                     .z_edit_btn:hover { border-color: #fff; background: rgba(255,255,255,0.08); }
                </style>

                <div style="padding: 2rem max(2rem, 5vw);">
                    <header style="margin-bottom: 3rem;">
                         <div style="font-size: 0.8rem; letter-spacing: 3px; text-transform: uppercase; color: #D4AF37; margin-bottom: 0.8rem; opacity: 0.8;">Üye Paneli</div>
                         <h1 style="font-size: clamp(2rem, 4vw, 3.5rem); font-family: var(--zenithV4_font_head); font-weight: normal; margin: 0; background: linear-gradient(90deg, #fff, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                             <?= $u_name ?>
                         </h1>
                    </header>

                    <div class="zenith_dash_grid">
                        <!-- Main Column -->
                        <div style="display: flex; flex-direction: column; gap: 2rem;">
                            
                            <!-- Overview Card -->
                            <div class="z_card">
                                <div class="z_overview">
                                    <div class="z_avatar_framed">
                                        <img src="<?= $u_avatar ?>" class="z_avatar_img">
                                        <?php if($is_vip): ?>
                                            <div style="position:absolute; bottom:-5px; left:50%; transform:translateX(-50%); background:#D4AF37; color:#000; font-size:0.6rem; padding:3px 8px; border-radius:10px; font-weight:bold; border:2px solid #141414; white-space:nowrap;">PREMIUM</div>
                                        <?php endif; ?>
                                    </div>
                                    <div style="flex:1;">
                                        <div class="z_completion_badge">
                                            <span style="margin-right:5px;">◆</span> %<?= $p_comp ?> Tamamlandı
                                        </div>
                                        <h2 style="font-size: 1.6rem; font-family: var(--zenithV4_font_head); margin: 0 0 0.5rem 0; font-weight: normal;">
                                            <?= $is_vip ? 'Premium Üyelik' : 'Standart Üyelik' ?>
                                        </h2>
                                        <p style="margin: 0; color: var(--zenithV4_text_dim); font-size: 0.95rem; line-height: 1.5;">
                                            Hesabınız aktif ve görünür durumda. 
                                            <?php if(!$is_vip) echo 'Daha fazla ayrıcalık için yükseltin.'; ?>
                                        </p>
                                    </div>
                                    <a href="profile_edit.php" class="z_edit_btn">Profili Düzenle</a>
                                </div>

                                <!-- Insight -->
                                <?php if($p_comp < 100): ?>
                                <div class="z_insight">
                                    <div style="display:flex; align-items:center; gap:1rem;">
                                        <div style="font-size:1.5rem;">💡</div>
                                        <div>
                                            <div style="font-size:0.95rem; font-weight:bold; color: #eee; margin-bottom:0.2rem;">Profilini Güçlendir</div>
                                            <div style="font-size:0.85rem; opacity:0.6;">Bio ve ilgi alanlarını ekleyerek eşleşme şansını artır.</div>
                                        </div>
                                    </div>
                                    <a href="profile_edit.php" style="color:#D4AF37; text-decoration:none; font-size:1.5rem; padding:0 10px;">⇢</a>
                                </div>
                                <?php endif; ?>
                            </div>

                            <!-- Mini Analytics -->
                            <div class="z_stat_grid">
                                <div class="z_mini_stat">
                                    <span class="z_ms_val"><?= $d_stats['visits_count'] ?></span>
                                    <span class="z_ms_lbl">Haftalık Ziyaret</span>
                                    <div class="z_spark" style="background:#3b82f6;"></div>
                                </div>
                                <div class="z_mini_stat">
                                    <span class="z_ms_val"><?= $d_stats['new_likes_count'] ?></span>
                                    <span class="z_ms_lbl">Yeni Beğeni</span>
                                    <div class="z_spark" style="background:#ef4444;"></div>
                                </div>
                                <div class="z_mini_stat">
                                    <span class="z_ms_val"><?= $d_stats['matches_count'] ?></span>
                                    <span class="z_ms_lbl">Toplam Eşleşme</span>
                                    <div class="z_spark" style="background:#10b981;"></div>
                                </div>
                            </div>
                            
                            <!-- Recent Activity (Calculated) -->
                            <?php if(!empty($dashboard_recent_visitors ?? [])): ?>
                                <!-- Optional additional charts could go here -->
                            <?php endif; ?>

                        </div>

                        <!-- Side Column -->
                        <div style="display: flex; flex-direction: column; gap: 2rem;">
                             <!-- Wallet / Membership Minimal -->
                            <div class="z_card" style="padding: 1.5rem;">
                                <div class="z_wallet_row">
                                    <div>
                                        <span style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; opacity:0.6; margin-bottom: 5px;">Cüzdan</span>
                                        <div class="z_coin_display">
                                            <span style="color:#D4AF37;">◎</span> <span id="zenithCoinBalanceDesktop"><?= $u_coins ?></span>
                                        </div>
                                    </div>
                                    <a href="wallet.php" style="padding: 8px 12px; border:1px solid rgba(255,255,255,0.1); border-radius:50%; color:#fff; text-decoration:none; transition:0.2s;" title="Yükle">＋</a>
                                </div>
                                <a href="wallet.php" style="display:block; font-size:0.8rem; color:#D4AF37; text-decoration:none; opacity:0.8; letter-spacing:0.5px;">→ Jeton Yükle</a>
                            </div>



                            <!-- Recent Visitors List (Actual Data) -->
                            <div class="z_card" style="padding: 1.5rem;">
                                <h3 style="font-size: 0.9rem; margin: 0 0 1.2rem 0; font-family: var(--zenithV4_font_head); opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Son Aktiviteler</h3>
                                <?php if(empty($visitorsData)): ?>
                                    <div style="opacity:0.4; font-size:0.85rem; padding: 1rem 0; font-style: italic;">Henüz yeni ziyaretçi yok.</div>
                                <?php else: ?>
                                    <div style="display:flex; flex-direction:column;">
                                        <?php foreach(array_slice($visitorsData, 0, 4) as $v): ?>
                                            <a href="profile.php?id=<?= $v['visitor_id'] ?>" class="z_list_item">
                                                <img src="<?= htmlspecialchars($v['avatar']) ?>" class="z_li_img">
                                                <div class="z_li_info">
                                                    <h4><?= htmlspecialchars($v['username']) ?></h4>
                                                    <span class="z_li_time">Profilini ziyaret etti • <?= time_elapsed_string($v['visited_at']) ?></span>
                                                </div>
                                            </a>
                                        <?php endforeach; ?>
                                        <a href="visitors.php" style="display:block; margin-top:1rem; font-size:0.75rem; text-align:center; color:var(--zenithV4_text_dim); text-decoration:none;">Tümünü Gör</a>
                                    </div>
                                <?php endif; ?>
                            </div>

                        </div>
                    </div>
                </div>

            </section>

            <!-- DISCOVERY (GALAXY STYLE) -->
            <section id="page-discover" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-discover') ? 'active' : '' ?>" style="padding:0; overflow:hidden; position:relative;">
                
                <!-- 0. Boost Strip (Zenith Edition) -->
                <div class="zenith_boost_strip" style="position: absolute; top: 20px; left: 20px; z-index: 100; display: flex; align-items: center; gap: 15px; max-width: 60%; overflow-x: auto; padding: 5px; scrollbar-width: none; -ms-overflow-style: none;">
                    <?php if(!empty($GLOBALS['my_boost'])): ?>
                        <?php 
                            $boost_end = new DateTime($GLOBALS['my_boost']['boost_until']);
                            $now = new DateTime();
                            $diff = $now->diff($boost_end);
                            $remaining = ($diff->h > 0) ? $diff->h.'s '.$diff->i.'dk' : $diff->i.' dk';
                        ?>
                        <div class="zb_item" style="display:flex; flex-direction:column; align-items:center; cursor:default;">
                            <div class="zb_avatar" style="width:50px; height:50px; border-radius:50%; border:2px solid #10B981; padding:2px; position:relative; animation: pulse 2s infinite;">
                                <img src="<?= htmlspecialchars(get_zenith_avatar($GLOBALS['my_boost']['profile_picture_url'], $GLOBALS['my_boost']['gender'])) ?>" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                            </div>
                            <span style="font-size:0.7rem; color:#10B981; font-weight:bold; margin-top:4px; text-shadow:0 1px 2px #000;"><?= $remaining ?></span>
                        </div>
                    <?php else: ?>
                        <a href="#" onclick="event.preventDefault(); openZenithBoostModal();" class="zb_item" style="display:flex; flex-direction:column; align-items:center; text-decoration:none;">
                            <div style="width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg, #D4AF37, #FDB931); display:flex; align-items:center; justify-content:center; color:#000; font-size:1.5rem; box-shadow:0 0 15px rgba(212,175,55,0.4); border:2px solid #fff;">⚡</div>
                            <span style="font-size:0.7rem; color:#D4AF37; font-weight:bold; margin-top:4px; text-shadow:0 1px 2px #000;">Yükselt</span>
                        </a>
                    <?php endif; ?>

                    <?php if(!empty($GLOBALS['boosted_users'])): ?>
                        <?php foreach($GLOBALS['boosted_users'] as $b_user): ?>
                            <?php if ($b_user['user_id'] == $_SESSION['user_id']) continue; ?>
                            <a href="profile.php?id=<?= $b_user['user_id'] ?>" class="zb_item" style="display:flex; flex-direction:column; align-items:center; text-decoration:none; transition:transform 0.2s;">
                                <div class="zb_avatar" style="width:50px; height:50px; border-radius:50%; border:2px solid #D4AF37; padding:2px;">
                                    <img src="<?= htmlspecialchars(get_zenith_avatar($b_user['profile_picture_url'], $b_user['gender'])) ?>" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                                </div>
                                <span style="font-size:0.7rem; color:#fff; margin-top:4px; width:60px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 2px #000;"><?= htmlspecialchars($b_user['username']) ?></span>
                            </a>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>

                <!-- Filter Trigger Button -->
                <div class="zenithV4_filter_trigger" onclick="toggleFilterModal()" style="position:absolute; top:20px; right:20px; z-index:150; width:48px; height:48px; border-radius:50%; background:rgba(20,20,20,0.7); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow:0 5px 20px rgba(0,0,0,0.3);">
                    <span id="f_icon" style="font-size:1.4rem; color:#fff; line-height:1;">☷</span>
                </div>

                <!-- Filter Modal (Scale Effect) -->
                <div id="zenithFilterModal" style="position:absolute; top:75px; right:20px; width:280px; max-width:calc(100% - 40px); background:rgba(18,18,18,0.95); backdrop-filter:blur(25px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:1.5rem; z-index:149; transform-origin: top right; transform: scale(0); opacity:0; pointer-events:none; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
                    <form method="GET" action="discover.php" style="display:flex; flex-direction:column; gap:15px;">
                        
                        <!-- Gender -->
                        <div style="position:relative;">
                             <select name="gender" class="zenithV4_input" style="width:100%; padding:12px 15px; border-radius:16px; font-size:0.9rem; background:rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05); appearance:none; outline:none; text-align:center;">
                                <option value="" style="background:#222;">Cinsiyet Seçin</option>
                                <option value="male" <?= ($f_gender == 'male') ? 'selected' : '' ?> style="background:#222;">Erkek</option>
                                <option value="female" <?= ($f_gender == 'female') ? 'selected' : '' ?> style="background:#222;">Kadın</option>
                                <option value="other" <?= ($f_gender == 'other') ? 'selected' : '' ?> style="background:#222;">Diğer</option>
                            </select>
                            <span style="position:absolute; right:15px; top:50%; transform:translateY(-50%); pointer-events:none; font-size:0.8rem; color:rgba(255,255,255,0.3);">▼</span>
                        </div>

                        <!-- Intent -->
                        <div style="position:relative;">
                            <select name="intent" class="zenithV4_input" style="width:100%; padding:12px 15px; border-radius:16px; font-size:0.9rem; background:rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05); appearance:none; outline:none; text-align:center;">
                                <option value="" style="background:#222;">İlişki Niyeti</option>
                                <option value="serious" <?= ($f_intent == 'serious') ? 'selected' : '' ?> style="background:#222;">Ciddi İlişki</option>
                                <option value="casual" <?= ($f_intent == 'casual') ? 'selected' : '' ?> style="background:#222;">Flört</option>
                                <option value="friendship" <?= ($f_intent == 'friendship') ? 'selected' : '' ?> style="background:#222;">Arkadaşlık</option>
                            </select>
                            <span style="position:absolute; right:15px; top:50%; transform:translateY(-50%); pointer-events:none; font-size:0.8rem; color:rgba(255,255,255,0.3);">▼</span>
                        </div>

                        <!-- City -->
                        <input type="text" name="city" placeholder="Şehir Ara..." value="<?= htmlspecialchars($f_city) ?>" style="width:100%; padding:12px 15px; border-radius:16px; font-size:0.9rem; background:rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05); outline:none; text-align:center;">
                        
                        <!-- Age Range -->
                        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.06); padding:8px 15px; border-radius:16px; border:1px solid rgba(255,255,255,0.05);">
                            <span style="font-size:0.85rem; color:rgba(255,255,255,0.5);">Yaş:</span>
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="number" name="min_age" placeholder="18" value="<?= $f_min_age ?>" style="width:35px; background:transparent; border:none; color:#fff; font-size:0.9rem; outline:none; text-align:center;">
                                <span style="color:rgba(255,255,255,0.3);">-</span>
                                <input type="number" name="max_age" placeholder="99" value="<?= $f_max_age ?>" style="width:35px; background:transparent; border:none; color:#fff; font-size:0.9rem; outline:none; text-align:center;">
                            </div>
                        </div>

                        <button type="submit" style="width:100%; padding:14px; border-radius:16px; background:#D4AF37; color:#000; font-family:var(--zenithV4_font_head); font-weight:bold; font-size:1rem; border:none; box-shadow:0 10px 20px rgba(212,175,55,0.2); cursor:pointer; margin-top:5px; transition:0.2s;">KEŞFET</button>
                    </form>
                </div>

                <script>
                function toggleFilterModal() {
                    const modal = document.getElementById('zenithFilterModal');
                    const trigger = document.querySelector('.zenithV4_filter_trigger');
                    const icon = document.getElementById('f_icon');
                    
                    if (modal.style.transform === 'scale(0)' || modal.style.transform === '') {
                        modal.style.transform = 'scale(1)';
                        modal.style.opacity = '1';
                        modal.style.pointerEvents = 'auto';
                        trigger.style.background = '#eee';
                        trigger.style.transform = 'rotate(90deg)';
                        icon.style.color = '#000';
                        icon.innerHTML = '✕';
                    } else {
                        modal.style.transform = 'scale(0)';
                        modal.style.opacity = '0';
                        modal.style.pointerEvents = 'none';
                        trigger.style.background = 'rgba(20,20,20,0.7)';
                        trigger.style.transform = 'rotate(0deg)';
                        icon.style.color = '#fff';
                        icon.innerHTML = '☷';
                    }
                }
                </script>

                <!-- Zoom Controls -->
                <div class="zenithV4_zoom_controls">
                    <button class="zenithV4_zoom_btn" onclick="adjustGalaxyZoom(0.1)" title="Yakınlaştır">+</button>
                    <button class="zenithV4_zoom_btn" onclick="adjustGalaxyZoom(-0.1)" title="Uzaklaştır">-</button>
                    <button class="zenithV4_zoom_btn" onclick="resetGalaxyZoom()" style="font-size:0.9rem;" title="Sıfırla">⟲</button>
                </div>

                <div class="zenithV4_galaxy_container">
                    <div class="zenithV4_galaxy_stars"></div>
                    
                    <div class="zenithV4_galaxy_viewport" id="galaxy-viewport">
                        <!-- Dynamic Orbit Rings -->
                        <div class="zenithV4_galaxy_orbit" style="width:300px; height:300px;"></div>
                        <div class="zenithV4_orbit_label" style="transform: translateY(-150px) translateX(20px);">0-<?= $distNear ?>km</div>
                        
                        <div class="zenithV4_galaxy_orbit" style="width:500px; height:500px;"></div>
                        <div class="zenithV4_orbit_label" style="transform: translateY(-250px) translateX(20px);"><?= $distMid ?>km</div>
                        
                        <div class="zenithV4_galaxy_orbit" style="width:700px; height:700px;"></div>
                        <div class="zenithV4_orbit_label" style="transform: translateY(-350px) translateX(20px);"><?= $distFar ?>km</div>
                        
                        <div class="zenithV4_galaxy_orbit" style="width:900px; height:900px;"></div>
                        <div class="zenithV4_orbit_label" style="transform: translateY(-450px) translateX(20px);"><?= $distFar ?>km+</div>

                        <!-- Center -->
                        <div class="zenithV4_galaxy_center">
                            <img src="<?= htmlspecialchars($myAvatar) ?>" class="zenithV4_galaxy_center_avatar">
                        </div>

                        <!-- Discovery Users -->
                        <?php if (!empty($discoveryUsers)): ?>
                            <?php foreach ($discoveryUsers as $idx => $dUser): 
                                $dAvatar = get_zenith_avatar($dUser['profile_picture_url'], $dUser['gender']);
                                $realDist = (float)($dUser['distance_km'] ?? 0);
                                if ($realDist < 1) {
                                    $distStr = round($realDist * 1000) . "m";
                                } else {
                                    $distStr = round($realDist, 1) . "km";
                                }
                            ?>
                            <div class="zenithV4_galaxy_user" 
                                 data-real-dist="<?= $realDist ?>"
                                 data-ring-idx="<?= $dUser['ring_idx'] ?? 0 ?>"
                                 data-user='<?= json_encode([
                                    "id" => $dUser["id"],
                                    "username" => htmlspecialchars($dUser["username"]),
                                    "age" => calculate_zenith_age($dUser["birth_date"]),
                                    "avatar" => htmlspecialchars($dAvatar),
                                    "bio" => htmlspecialchars($dUser["bio"] ?? ""),
                                    "city" => htmlspecialchars($dUser["city"] ?? "Bilinmiyor"),
                                    "intent" => htmlspecialchars($dUser["relationship_intent"] ?? "")
                                 ], JSON_HEX_APOS | JSON_HEX_QUOT) ?>'
                                 onclick="openZenithProfile(this)">
                                <img src="<?= htmlspecialchars($dAvatar) ?>" class="zenithV4_galaxy_user_img">
                                <div class="zenithV4_galaxy_user_label"><?= htmlspecialchars($dUser['username'] ?? 'Üye') ?> • <?= $distStr ?></div>
                            </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <script>
                    let galaxyZoom = 1.0;
                    const dNear = <?= $distNear ?>;
                    const dMid = <?= $distMid ?>;
                    const dFar = <?= $distFar ?>;
                    const maxPerRing = <?= $maxPerRing ?>;

                    function adjustGalaxyZoom(delta) {
                        galaxyZoom = Math.min(Math.max(0.4, galaxyZoom + delta), 2.5);
                        applyGalaxyZoom();
                    }
                    
                    function resetGalaxyZoom() {
                        galaxyZoom = 1.0;
                        applyGalaxyZoom();
                    }
                    
                    function applyGalaxyZoom() {
                        const viewport = document.getElementById('galaxy-viewport');
                        if(!viewport) return;
                        
                        viewport.style.transform = `scale(${galaxyZoom})`;
                        
                        // Semantic Zoom Logic: Show/Hide users based on zoom
                        const users = viewport.querySelectorAll('.zenithV4_galaxy_user');
                        const orbits = viewport.querySelectorAll('.zenithV4_galaxy_orbit');
                        const orbitLabels = viewport.querySelectorAll('.zenithV4_orbit_label');
                        const lines = viewport.querySelectorAll('.zenithV4_galaxy_line');

                        users.forEach((user, idx) => {
                            const dist = parseFloat(user.getAttribute('data-real-dist'));
                            const line = lines[idx];
                            
                            // Calculate semantic visibility
                            let visible = true;
                            let opacity = 1;

                            // 1. Zoom in effect: Close users become more detailed/visible
                            // 2. Zoom out effect: Distant users stay, but maybe hide minor ones if zoomed too far? 
                            // Actually, let's use the 'maxPerRing' from admin to filter 'extra' users
                            // We fetched up to 50, but maybe show only 'maxPerRing' (e.g. 20) at zoom 1.0
                            // And reveal the rest as we zoom in.
                            
                            const ringIndexInBucket = parseInt(user.getAttribute('data-ring-idx'));
                            if (ringIndexInBucket >= maxPerRing) {
                                // This is an 'extra' user (detail user)
                                // Only show if zoom is high
                                if (galaxyZoom < 1.5) {
                                    opacity = 0;
                                    visible = false;
                                } else {
                                    opacity = (galaxyZoom - 1.5) * 2; // Fade in from 1.5 to 2.0
                                }
                            }

                            // Optional: Hide very distant users if zoomed in too much (Focus effect)
                            if (galaxyZoom > 2.0 && dist > dFar) {
                                opacity = Math.max(0, 1 - (galaxyZoom - 2.0) * 2);
                            }
                            
                            user.style.opacity = Math.min(1, opacity);
                            user.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
                            if(line) line.style.opacity = (opacity * 0.15);
                        });

                        // Fade orbits based on zoom
                        orbits.forEach((orbit, i) => {
                            const label = orbitLabels[i];
                            // Orbits fade out if we are zoomed in past them
                            let orbOpacity = 1;
                            if (i === 0 && galaxyZoom > 2.0) orbOpacity = 0.3;
                            if (i === 3 && galaxyZoom < 0.6) orbOpacity = 0.5;
                            
                            orbit.style.opacity = orbOpacity;
                            if(label) label.style.opacity = orbOpacity;
                        });
                    }

                    function initGalaxyDiscovery() {
                        const viewport = document.getElementById('galaxy-viewport');
                        if (!viewport) return;
                        
                        const users = viewport.querySelectorAll('.zenithV4_galaxy_user');
                        const centerX = viewport.offsetWidth / 2;
                        const centerY = viewport.offsetHeight / 2;

                        viewport.querySelectorAll('.zenithV4_galaxy_line').forEach(l => l.remove());

                        users.forEach((user, i) => {
                            const dist = parseFloat(user.getAttribute('data-real-dist'));
                            let radius;
                            
                            if (dist <= dNear) {
                                radius = 150 + (Math.random() * 30 - 15);
                            } else if (dist <= dMid) {
                                radius = 250 + (Math.random() * 40 - 20);
                            } else if (dist <= dFar) {
                                radius = 350 + (Math.random() * 50 - 25);
                            } else {
                                radius = 450 + (Math.random() * 60 - 30);
                            }

                            const angle = (Math.random() * 360) * (Math.PI / 180);
                            const x = centerX + radius * Math.cos(angle) - 30; 
                            const y = centerY + radius * Math.sin(angle) - 30;

                            user.style.left = x + 'px';
                            user.style.top = y + 'px';
                            user.style.transition = 'opacity 0.5s ease-out';

                            const line = document.createElement('div');
                            line.className = 'zenithV4_galaxy_line';
                            line.style.width = radius + 'px';
                            line.style.left = centerX + 'px';
                            line.style.top = centerY + 'px';
                            line.style.transform = `rotate(${angle}rad)`;
                            line.style.transition = 'opacity 0.5s ease-out';
                            viewport.appendChild(line);
                        });
                        
                        applyGalaxyZoom(); // Initial visibility
                    }
                    
                    window.addEventListener('load', initGalaxyDiscovery);
                    window.addEventListener('resize', initGalaxyDiscovery);
                    
                    // Mouse Wheel Zoom
                    document.querySelector('.zenithV4_galaxy_container').addEventListener('wheel', (e) => {
                        e.preventDefault();
                        const delta = e.deltaY > 0 ? -0.1 : 0.1;
                        adjustGalaxyZoom(delta);
                    }, { passive: false });
                </script>
            </section>


            <!-- 2. MATCHES -->
            <section id="page-matches" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-matches') ? 'active' : '' ?>">
                <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Eşleşmeler</h1>
                </header>
                <div class="zenithV4_match_grid">
                    <?php if (empty($matches)): ?>
                        <p style="padding:2rem; color:var(--zenithV4_text_dim); text-align:center; width:100%;">Henüz eşleşmen yok.</p>
                    <?php else: ?>
                        <?php foreach ($matches as $match): 
                             $matchAvatar = get_zenith_avatar($match['profile_picture_url'], $match['gender']);
                             $matchAge = calculate_zenith_age($match['birth_date']);
                        ?>
                        <div class="zenithV4_match_card" 
                             onclick="openZenithProfile(this)"
                             data-user='<?= json_encode([
                                "id" => $match["matched_user_id"],
                                "username" => htmlspecialchars($match["username"]),
                                "age" => $matchAge,
                                "avatar" => htmlspecialchars($matchAvatar),
                                "bio" => htmlspecialchars($match["bio"] ?? "Eşleşme"),
                                "city" => htmlspecialchars($match["city"] ?? "Bilinmiyor"),
                                "intent" => htmlspecialchars($match["relationship_intent"] ?? "")
                             ], JSON_HEX_APOS | JSON_HEX_QUOT) ?>'>
                            <img src="<?= htmlspecialchars($matchAvatar) ?>" class="zenithV4_match_img">
                            <div class="zenithV4_match_overlay" style="color:#fff;">
                                <div style="font-family:var(--zenithV4_font_head); font-size:1.2rem;"><?= htmlspecialchars($match['username']) ?></div>
                                <div style="font-size:0.8rem; opacity:0.7;"><?= time_elapsed_string($match['created_at']) ?></div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </section>

            <!-- 3. SWIPE -->
            <section id="page-swipe" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-swipe') ? 'active' : '' ?>">
                <header class="zenithV4_header" style="justify-content:center; border:none;">
                    <h1 class="zenithV4_title">Keşfet</h1>
                </header>

                <!-- Swipe Container (Premium Card Style) -->
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; max-width:450px; margin:0 auto; padding-top:20px;">
                    
                    <div class="zenithV4_swipe_container" style="position:relative; width:90%; height:60vh; max-height:550px; border-radius:30px; perspective:1000px;">
                        <?php if (empty($swipeUsers)): ?>
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--zenithV4_text_dim); background:rgba(255,255,255,0.03); border-radius:30px; border:1px solid rgba(255,255,255,0.05);">
                                <span style="font-size:3rem; margin-bottom:1rem; opacity:0.5;">☹</span>
                                <h3 style="font-family:var(--zenithV4_font_head); font-size:1.5rem; margin-bottom:0.5rem;">Kimse kalmadı</h3>
                                <p style="font-size:0.9rem; opacity:0.6;">Daha sonra tekrar kontrol et.</p>
                            </div>
                        <?php else: ?>
                            <?php foreach (array_reverse($swipeUsers) as $index => $user): 
                                 $sAvatar = $user['avatar'] ?? get_zenith_avatar($user['profile_picture_url'], $user['gender']);
                                 $sAge = calculate_zenith_age($user['birth_date'] ?? '');
                            ?>
                            <div class="zenithV4_swipe_card" id="swipe-card-<?= $index ?>" data-uid="<?= $user['id'] ?>"
                                onclick="openZenithProfile(this)"
                                 data-user='<?= json_encode([
                                    "id" => $user["id"],
                                    "username" => htmlspecialchars($user["username"]),
                                    "age" => $sAge,
                                    "avatar" => htmlspecialchars($sAvatar),
                                    "bio" => htmlspecialchars($user["bio"] ?? ""),
                                    "city" => htmlspecialchars($user["city"] ?? ""),
                                    "intent" => htmlspecialchars($user["relationship_intent"] ?? "")
                                 ], JSON_HEX_APOS | JSON_HEX_QUOT) ?>'
                                 style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:<?= $index + 10 ?>; border-radius:30px; box-shadow:0 20px 50px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); overflow:hidden; background:#181818; transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease;">
                                
                                <img src="<?= htmlspecialchars($sAvatar) ?>" class="zenithV4_swipe_img" style="width:100%; height:100%; object-fit:cover;">
                                
                                <div class="zenithV4_cover_text" style="position:absolute; bottom:0; left:0; width:100%; padding:4rem 1.5rem 2rem; background:linear-gradient(to top, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.6) 50%, transparent); text-align:left; pointer-events:none;">
                                    <h2 style="font-family:var(--zenithV4_font_head); font-size:2.8rem; line-height:1; margin-bottom:0.2rem; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
                                        <?= htmlspecialchars($user['username']) ?> <span style="font-size:1.8rem; opacity:0.8; font-weight:normal;"><?= $sAge ?></span>
                                    </h2>
                                    <p style="font-size:0.9rem; margin-top:0.4rem; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.7); display:flex; align-items:center; gap:5px;">
                                        <span style="display:inline-block; width:6px; height:6px; background:#D4AF37; border-radius:50%;"></span>
                                        <?= htmlspecialchars($user['city'] ?? 'Bilinmiyor') ?>
                                    </p>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>

                    <div class="zenithV4_swipe_controls" style="margin-top:30px; display:flex; gap:15px; align-items:center; position:relative; z-index:200;">
                        
                        <button class="zenithV4_control_btn btn-rewind" onclick="undoLastSwipe()" style="width:50px; height:50px; border-radius:50%; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.02); color:#f59e0b; font-size:1.2rem; transition:0.2s; cursor:pointer; display:flex; align-items:center; justify-content:center;">↺</button>

                        <button class="zenithV4_control_btn btn-nope" style="width:60px; height:60px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.05); color:#ef4444; font-size:1.4rem; transition:0.2s; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                        
                        <button class="zenithV4_control_btn btn-super" onclick="sendSuperLike()" style="width:50px; height:50px; border-radius:50%; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.02); color:#3b82f6; font-size:1.2rem; transition:0.2s; cursor:pointer; display:flex; align-items:center; justify-content:center;">★</button>

                        <button class="zenithV4_control_btn btn-like" style="width:70px; height:70px; border-radius:50%; border:1px solid rgba(239, 68, 68, 0.3); background:rgba(239, 68, 68, 0.1); color:#ef4444; font-size:2rem; transition:0.2s; cursor:pointer; box-shadow:0 0 25px rgba(239,68,68,0.15); display:flex; align-items:center; justify-content:center;">❤</button>
                    </div>
                </div>
            </section>

            <!-- 4. MESSAGES -->
            <section id="page-messages" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-messages') ? 'active' : '' ?>">
                <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Özel Sohbetler</h1>
                </header>

                <div class="zenithV4_chat_layout">
                    <div class="zenithV4_chat_list">
                        <!-- MOBILE ONLY SEARCH & MATCHES -->
                        <div class="zenithV4_mobile_chat_search">
                            <div class="zenithV4_search_box">
                                 <span style="font-size: 1.2rem; opacity: 0.5;">🔍</span>
                                 <input type="text" placeholder="Search Matches">
                                 <span style="font-size: 1.2rem; opacity: 0.5;">🎤</span>
                            </div>
                        </div>

                        <div class="zenithV4_mobile_matches_horizontal">
                            <div class="match_item me">
                                <div class="avatar_ring">
                                    <img src="<?= htmlspecialchars($myAvatar) ?>" alt="Me">
                                    <div class="plus_icon">+</div>
                                </div>
                                <span>Me</span>
                            </div>
                            <?php foreach ($matchesData as $m): ?>
                            <div class="match_item" onclick="openChatWithUser(<?= $m['partner_id'] ?>, '<?= addslashes($m['username']) ?>', '<?= addslashes($m['avatar']) ?>')">
                                <div class="avatar_ring">
                                    <img src="<?= htmlspecialchars($m['avatar']) ?>" alt="<?= htmlspecialchars($m['username']) ?>">
                                    <div class="status_dot online"></div>
                                </div>
                                <span><?= htmlspecialchars($m['username']) ?></span>
                            </div>
                            <?php endforeach; ?>
                        </div>


                        <?php if (empty($conversations)): ?>
                            <p style="padding:1rem; color:var(--zenithV4_text_dim);">Henüz mesaj yok.</p>
                        <?php else: ?>
                            <?php foreach ($conversations as $conv): 
                                $convAvatar = $conv['avatar'] ?? get_zenith_avatar($conv['profile_picture_url'] ?? '', $conv['gender'] ?? '');
                                $lastMsgTime = isset($conv['last_message_time']) ? date('H:i', strtotime($conv['last_message_time'])) : '';
                                if (isset($conv['last_message_time']) && date('Y-m-d') != date('Y-m-d', strtotime($conv['last_message_time']))) {
                                    $lastMsgTime = date('d/m', strtotime($conv['last_message_time']));
                                }
                            ?>
                            <div class="zenithV4_chat_item" onclick="openChatWithUser(<?= $conv['other_user_id'] ?>, '<?= addslashes($conv['username']) ?>', '<?= addslashes($convAvatar) ?>', <?= $conv['conversation_id'] ?? 0 ?>)">
                                <div style="position:relative;">
                                    <img src="<?= htmlspecialchars($convAvatar) ?>"
                                        style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
                                    <div class="status_dot_tiny online"></div>
                                    <?php if (isset($conv['unread_count']) && $conv['unread_count'] > 0): ?>
                                        <div class="unread_badge"><?= $conv['unread_count'] ?></div>
                                    <?php endif; ?>
                                </div>
                                <div class="chat_info">
                                    <div style="font-weight:bold; font-size: 1.1rem;"><?= htmlspecialchars($conv['username']) ?></div>
                                    <div style="font-size:0.85rem; color:var(--zenithV4_text_dim); margin-top: 2px;">
                                        <?php if (isset($conv['sender_id']) && $conv['sender_id'] == $current_user_id): ?>
                                            <span style="opacity:0.7;">Sen: </span>
                                        <?php endif; ?>
                                        <?= htmlspecialchars(mb_strimwidth($conv['last_message'] ?? '', 0, 35, "...")) ?>
                                    </div>
                                </div>
                                <div class="chat_meta">
                                    <div class="chat_time"><?= $lastMsgTime ?></div>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>

                    <div class="zenithV4_chat_area" id="chat-area-container" style="display:none; flex-direction:column;">
                        <!-- MOBILE REDESIGNED HEADER (Hidden on Desktop) -->
                        <div class="zenithV4_chat_header_mobile">
                            <div class="header_left">
                                <button class="chat_back_btn" onclick="backToChatList()">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                <img id="chat-header-img" src="" alt="User">
                                <div class="chat_header_user_info">
                                    <div id="chat-header-name" style="font-weight: bold; font-family:var(--zenithV4_font_head);"></div>
                                    <div class="chat_header_status">Online</div>
                                </div>
                            </div>
                            <div class="header_right">
                                <button class="header_icon_btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.11-2.11a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
                                <button class="header_icon_btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg></button>
                            </div>
                        </div>

                        <!-- DESKTOP HEADER (Hidden on Mobile) -->
                        <div class="desktop_chat_header" style="padding:1rem; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; gap:1rem;">
                            <img id="chat-header-img-desktop" src="" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                            <div style="font-weight:bold; font-family:var(--zenithV4_font_head);" id="chat-header-name-desktop"></div>
                            <button class="zenithV4_btn hide_on_desktop" style="padding:0.3rem 0.8rem; font-size:0.7rem; margin-left:auto;" onclick="backToChatList()">Listeye Dön</button>
                        </div>

                        <!-- Date Separator (Only for Mobile Design) -->
                        <div class="chat_date_separator"><span>Today</span></div>

                        <div class="zenithV4_msg_thread" id="chat-messages-box">
                            <!-- Messages will be injected here via JS -->
                        </div>

                        <!-- MOBILE REDESIGNED INPUT (Hidden on Desktop) -->
                        <div class="zenithV4_chat_input_mobile_container">
                            <div class="input_action_group">
                                <button class="action_btn_circle" onclick="openZenithGiftModal()" title="Hediye Gönder">🎁</button>
                                <button class="action_btn_circle">🎤</button>
                            </div>
                            <div class="chat_input_pill">
                                <input type="text" id="chat-input-text-mobile" placeholder="Mesaj yaz...">
                                <button class="emoji_btn">😊</button>
                            </div>
                            <button class="send_btn_mobile" onclick="sendChatMessage()">
                                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                            </button>
                        </div>

                        <!-- DESKTOP INPUT (Hidden on Mobile) -->
                        <div class="zenithV4_chat_input_areas desktop_chat_input">
                            <input type="hidden" id="chat-active-user-id" value="">
                            <button class="zenithV4_btn" style="padding:0.75rem 0.9rem; border-radius:12px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.05);" onclick="openZenithGiftModal()" title="Hediye Gönder">🎁</button>
                            <input type="text" class="zenithV4_input" id="chat-input-text" placeholder="Bir mesaj yaz...">
                            <button class="zenithV4_btn primary zenithV4_send_btn" onclick="sendChatMessage()">Gönder</button>
                        </div>
                    </div>
                    
                    <!-- Empty State for Desktop -->
                    <div id="chat-empty-state" style="display:flex; align-items:center; justify-content:center; color:var(--zenithV4_text_dim); flex: 1;">
                        <p>Bir sohbet seçin.</p>
                    </div>
                </div>
            </section>

            <!-- 5. VISITORS -->
            <section id="page-visitors" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-visitors') ? 'active' : '' ?>">
                <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Ziyaretçiler</h1>
                    <span class="zenithV4_subtitle">Son hareketler</span>
                </header>
                <div class="zenithV4_match_grid">
                    <?php if (empty($visitorsData)): ?>
                        <p style="color:var(--zenithV4_text_dim);">Henüz ziyaretçin yok.</p>
                    <?php else: ?>
                        <?php foreach ($visitorsData as $visitor): 
                            $vAvatar = $visitor['avatar'] ?? get_zenith_avatar($visitor['profile_picture_url'], $visitor['gender']);
                            // Assuming all visitors are visible for this theme demo, otherwise add logic
                        ?>
                        <div class="zenithV4_match_card" onclick="openProfileModal(<?= $visitor['visitor_id'] ?>)"> <!-- Future Modal -->
                            <img src="<?= htmlspecialchars($vAvatar) ?>" class="zenithV4_match_img">
                            <div class="zenithV4_match_overlay" style="display:flex; flex-direction:column; justify-content:end;">
                                <div style="font-family:var(--zenithV4_font_head);"><?= htmlspecialchars($visitor['username']) ?></div>
                                <div style="font-size:0.7rem; opacity:0.7;"><?= time_elapsed_string($visitor['visited_at']) ?></div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </section>

            <!-- 6. GIFTS -->
            <section id="page-gifts" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-gifts') ? 'active' : '' ?>">
                <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Sanal Vitrin</h1>
                </header>
                <div class="zenithV4_gift_grid">
                    <?php
                    // Default tema katalogu: aktif coin feature options (gifts önce, fiyat artan)
                    $stmt_gifts = $pdo->query("
                        SELECT o.*, f.feature_key, f.name AS feature_name
                        FROM coin_feature_options o
                        JOIN coin_features f ON o.feature_id = f.id
                        WHERE o.is_active = 1 AND f.is_active = 1
                        ORDER BY (f.feature_key = 'gift') DESC, o.price ASC
                    ");
                    $gifts = $stmt_gifts->fetchAll(PDO::FETCH_ASSOC);

                    // Ikon fallback (modal ile aynı)
                    function zenith_gift_icon($gift) {
                        $label = strtolower($gift['label'] ?? $gift['option_label'] ?? $gift['title'] ?? '');
                        if (!empty($gift['details'])) return $gift['details'];
                        if (strpos($label, 'gül') !== false) return '🌹';
                        if (strpos($label, 'kahve') !== false) return '☕';
                        if (strpos($label, 'kalp') !== false) return '❤️';
                        if (strpos($label, 'uçak') !== false || strpos($label, 'uça') !== false) return '✈️';
                        if (strpos($label, 'elmas') !== false) return '💎';
                        if (strpos($label, 'şampanya') !== false) return '🥂';
                        if (strpos($label, 'çikolata') !== false) return '🍫';
                        switch ($gift['feature_key'] ?? '') {
                            case 'boost': return '🚀';
                            case 'super_like': return '⭐';
                            case 'gold_like': return '🧡';
                            case 'rewind':
                            case 'undo': return '↺';
                            case 'message_send': return '✉️';
                            case 'gift': return '🎁';
                            default: return '⚡';
                        }
                    }

                    if(empty($gifts)): 
                    ?>
                        <p style="text-align:center; width:100%; color:var(--zenithV4_text_dim);">Hediye bulunamadı.</p>
                    <?php else: ?>
                        <?php foreach($gifts as $gift): 
                            // Use 'label' not 'name'. Check for existing columns just in case.
                            $gName = $gift['label'] ?? $gift['option_label'] ?? $gift['name'] ?? 'Hediye';
                            
                            // Determine icon based on name
                            $icon = '🎁';
                            if(stripos($gName, 'gül') !== false) $icon = '🌹';
                            elseif(stripos($gName, 'kahve') !== false) $icon = '☕';
                            elseif(stripos($gName, 'kalp') !== false) $icon = '❤️';
                            elseif(stripos($gName, 'uçak') !== false) $icon = '✈️';
                            elseif(stripos($gName, 'elmas') !== false) $icon = '💎';
                            elseif(stripos($gName, 'şampanya') !== false) $icon = '🥂';
                            elseif(stripos($gName, 'çikolata') !== false) $icon = '🍫';
                        ?>
                        <div class="zenithV4_gift_item">
                            <span style="font-size:3rem;"><?= $icon ?></span>
                            <p style="margin-top:1rem; font-size:0.9rem;"><?= htmlspecialchars($gName) ?></p>
                            <p style="font-size:0.7rem; color:var(--zenithV4_text_dim);"><?= (int)$gift['price'] ?> Coin</p>
                        </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </section>

            <!-- 7. PROFILE (View) -->
            <section id="page-profile" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-profile') ? 'active' : '' ?>">
                <header class="zenithV4_page_header">
                     <h1 class="zenithV4_title">Profilim</h1>
                </header>
                <!-- Reuse Dashboard Widget style for consistency or redirect to Dashboard -->
                <div style="text-align:center; margin-top:50px;">
                    <button class="zenithV4_btn" onclick="window.location.href='index.php'">Ana Sayfaya Dön</button>
                    <button class="zenithV4_btn primary" onclick="window.location.href='profile_edit.php'">Düzenle</button>
                </div>
            </section>

             <!-- 8. PROFILE EDIT -->
             <section id="page-profile-edit" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-profile-edit') ? 'active' : '' ?>">
                <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Profili Düzenle</h1>
                </header>
                
                <div style="max-width:800px; margin:0 auto; padding-bottom:100px;">
                    <form action="actions/profile_update_action.php" method="POST" enctype="multipart/form-data">
                        <input type="hidden" name="action" value="update_profile">
                        
                        <h3 class="zenithV4_subtitle" style="margin-bottom:1rem; opacity:0.6; font-size:0.8rem; letter-spacing:0.2em; text-transform:uppercase;">Görseller</h3>
                        
                        <!-- Image Grid -->
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; margin-bottom:3rem;">
                            <!-- Profile Picture -->
                            <div style="text-align:center;">
                                <div style="position:relative; aspect-ratio:1/1; border-radius:15px; overflow:hidden; border:1px solid var(--zenithV4_border); background:var(--zenithV4_card_bg);">
                                    <img src="<?= htmlspecialchars($myAvatar) ?>" style="width:100%; height:100%; object-fit:cover;" id="preview-profile">
                                    <label for="upload-profile" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.3s; cursor:pointer;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                                        <span style="font-size:0.8rem; font-weight:bold;">DEGISTIR</span>
                                    </label>
                                    <input type="file" name="profile_picture" id="upload-profile" style="display:none;" onchange="document.getElementById('preview-profile').src = window.URL.createObjectURL(this.files[0])">
                                </div>
                                <p style="font-size:0.7rem; margin-top:0.5rem; opacity:0.5;">Profil Fotoğrafı</p>
                            </div>

                            <!-- Cover Photo -->
                            <div style="text-align:center;">
                                <div style="position:relative; aspect-ratio:1/1; border-radius:15px; overflow:hidden; border:1px solid var(--zenithV4_border); background:var(--zenithV4_card_bg);">
                                    <?php $coverImg = $currentUser['cover_photo_url'] ?: 'assets/images/default_cover.jpg'; ?>
                                    <img src="<?= htmlspecialchars($coverImg) ?>" style="width:100%; height:100%; object-fit:cover;" id="preview-cover">
                                    <label for="upload-cover" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.3s; cursor:pointer;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                                        <span style="font-size:0.8rem; font-weight:bold;">KAPAK EKLE</span>
                                    </label>
                                    <input type="file" name="cover_photo" id="upload-cover" style="display:none;" onchange="document.getElementById('preview-cover').src = window.URL.createObjectURL(this.files[0])">
                                </div>
                                <p style="font-size:0.7rem; margin-top:0.5rem; opacity:0.5;">Kapak Fotoğrafı</p>
                            </div>

                            <!-- Gallery 1 -->
                            <div style="text-align:center;">
                                <div style="position:relative; aspect-ratio:1/1; border-radius:15px; overflow:hidden; border:1px solid var(--zenithV4_border); background:var(--zenithV4_card_bg);">
                                    <?php $g1Img = $currentUser['gallery_photo_1'] ?: 'assets/images/default_cover.jpg'; ?>
                                    <img src="<?= htmlspecialchars($g1Img) ?>" style="width:100%; height:100%; object-fit:cover;" id="preview-g1">
                                    <label for="upload-g1" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.3s; cursor:pointer;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                                        <span style="font-size:0.8rem; font-weight:bold;">FOTOGRAF 1</span>
                                    </label>
                                    <input type="file" name="gallery_photo_1" id="upload-g1" style="display:none;" onchange="document.getElementById('preview-g1').src = window.URL.createObjectURL(this.files[0])">
                                </div>
                                <p style="font-size:0.7rem; margin-top:0.5rem; opacity:0.5;">Galeri Resim 1</p>
                            </div>

                            <!-- Gallery 2 -->
                            <div style="text-align:center;">
                                <div style="position:relative; aspect-ratio:1/1; border-radius:15px; overflow:hidden; border:1px solid var(--zenithV4_border); background:var(--zenithV4_card_bg);">
                                    <?php $g2Img = $currentUser['gallery_photo_2'] ?: 'assets/images/default_cover.jpg'; ?>
                                    <img src="<?= htmlspecialchars($g2Img) ?>" style="width:100%; height:100%; object-fit:cover;" id="preview-g2">
                                    <label for="upload-g2" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.3s; cursor:pointer;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                                        <span style="font-size:0.8rem; font-weight:bold;">FOTOGRAF 2</span>
                                    </label>
                                    <input type="file" name="gallery_photo_2" id="upload-g2" style="display:none;" onchange="document.getElementById('preview-g2').src = window.URL.createObjectURL(this.files[0])">
                                </div>
                                <p style="font-size:0.7rem; margin-top:0.5rem; opacity:0.5;">Galeri Resim 2</p>
                            </div>
                        </div>

                        <h3 class="zenithV4_subtitle" style="margin-bottom:1.5rem; opacity:0.6; font-size:0.8rem; letter-spacing:0.2em; text-transform:uppercase;">Temel Bilgiler</h3>

                        <div class="zenithV4_form_group">
                            <label class="zenithV4_label">Kullanıcı Adı</label>
                            <input type="text" name="username" class="zenithV4_input" value="<?= htmlspecialchars($currentUser['username']) ?>" required>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
                            <div class="zenithV4_form_group">
                                <label class="zenithV4_label">Şehir</label>
                                <input type="text" name="city" class="zenithV4_input" value="<?= htmlspecialchars($currentUser['city'] ?? '') ?>">
                            </div>
                            <div class="zenithV4_form_group">
                                <label class="zenithV4_label">İlişki Niyeti</label>
                                <select name="relationship_intent" class="zenithV4_input" style="background:var(--zenithV4_card_bg); color:#fff; border:1px solid var(--zenithV4_border);">
                                    <option value="">Seçiniz...</option>
                                    <option value="serious" <?= ($currentUser['relationship_intent'] ?? '') === 'serious' ? 'selected' : '' ?>>Ciddi İlişki</option>
                                    <option value="casual" <?= ($currentUser['relationship_intent'] ?? '') === 'casual' ? 'selected' : '' ?>>Flört</option>
                                    <option value="friendship" <?= ($currentUser['relationship_intent'] ?? '') === 'friendship' ? 'selected' : '' ?>>Arkadaşlık</option>
                                </select>
                            </div>
                        </div>

                        <div class="zenithV4_form_group">
                            <label class="zenithV4_label">Hakkımda</label>
                            <textarea name="bio" class="zenithV4_input" rows="4"><?= htmlspecialchars($currentUser['bio'] ?? '') ?></textarea>
                        </div>

                        <h3 class="zenithV4_subtitle" style="margin:3rem 0 1.5rem; opacity:0.6; font-size:0.8rem; letter-spacing:0.2em; text-transform:uppercase;">Detaylı Bilgiler</h3>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
                            <?php foreach ($profileFields as $field): 
                                $fieldId = $field['id'];
                                $currentVal = $userFieldValues[$fieldId] ?? '';
                                ?>
                                <div class="zenithV4_form_group">
                                    <label class="zenithV4_label"><?= htmlspecialchars($field['label']) ?></label>
                                    <?php if ($field['field_type'] === 'select'): ?>
                                        <select name="extra_fields[<?= $fieldId ?>]" class="zenithV4_input" style="background:var(--zenithV4_card_bg); color:#fff; border:1px solid var(--zenithV4_border);">
                                            <option value="">Seçiniz...</option>
                                            <?php 
                                            $options = array_filter(array_map('trim', explode(',', $field['options'])));
                                            foreach ($options as $opt): ?>
                                                <option value="<?= htmlspecialchars($opt) ?>" <?= $currentVal === $opt ? 'selected' : '' ?>><?= htmlspecialchars($opt) ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    <?php else: ?>
                                        <input type="text" name="extra_fields[<?= $fieldId ?>]" class="zenithV4_input" value="<?= htmlspecialchars($currentVal) ?>" placeholder="<?= htmlspecialchars($field['label']) ?> giriniz...">
                                    <?php endif; ?>
                                </div>
                            <?php endforeach; ?>
                        </div>

                        <button type="submit" class="zenithV4_btn primary" style="width:100%; margin-top:3rem; padding:1.2rem; font-size:1rem; letter-spacing:0.1em;">DEĞİŞİKLİKLERİ KAYDET</button>
                    </form>
                </div>
            </section>

            <!-- 8. PREMIUM -->
            <section id="page-premium" class="zenithV4_page <?= (isset($GLOBALS['zenith_active_page']) && $GLOBALS['zenith_active_page'] === 'page-premium') ? 'active' : '' ?>">
                <!-- Theme Name / Site Logo -->
                <div class="zenithV4_nav_header" style="justify-content:center; padding:2rem 1rem;">
                    <div style="text-align:center;">
                        <h1 class="zenithV4_title" style="font-size:1.8rem; margin:0; letter-spacing:4px; font-weight:900;"><?= strtoupper(get_system_setting($pdo, 'site_name', 'ZENITH')) ?></h1>
                        <div style="font-size:0.6rem; letter-spacing:0.3em; opacity:0.6; margin-top:0.2rem;"><?= strtoupper(get_system_setting($pdo, 'site_title', 'ATELIER')) ?></div>
                    </div>
                </div>
                
                <h2 class="zenithV4_subtitle" style="margin: 2rem 0 1rem; opacity: 0.7; letter-spacing: 2px;">PREMIUM PAKETLER</h2>
                <div class="zenithV4_dashboard_grid" style="margin-bottom: 4rem;">
                    <?php
                    // Fetch real plans
                    global $pdo;
                    $stmt_plans = $pdo->query("SELECT * FROM premium_plans ORDER BY price ASC LIMIT 3");
                    $plans = $stmt_plans->fetchAll(PDO::FETCH_ASSOC);
                    
                    if (empty($plans)) {
                        echo '<p style="color:#fff;">Şu anda paket bulunmuyor.</p>';
                    } else {
                        foreach($plans as $plan) {
                            $isGold = stripos($plan['name'], 'gold') !== false;
                            $accent = $isGold ? 'var(--zenithV4_accent)' : 'var(--zenithV4_accent_sec)';
                            ?>
                            <div class="zenithV4_action_card" style="text-align:center; padding:3rem; border-color:<?= $accent ?>">
                                <h2 class="zenithV4_title" style="font-size:2rem; color:<?= $accent ?>"><?= htmlspecialchars($plan['name']) ?></h2>
                                <p style="margin:1rem 0 2rem; color:var(--zenithV4_text_dim);"><?= $plan['duration_days'] ?> Günlük Erişim</p>
                                <h3 style="font-size:2.5rem; margin-bottom:2rem;"><?= (int)$plan['price'] ?>₺</h3>
                                <a href="premium.php?plan_id=<?= $plan['id'] ?>" class="zenithV4_btn <?= $isGold ? 'primary' : '' ?>">Satın Al</a>
                            </div>
                            <?php
                        }
                    }
                    ?>
                </div>

                <h2 class="zenithV4_subtitle" style="margin: 2rem 0 1rem; opacity: 0.7; letter-spacing: 2px;">JETON PAKETLERİ</h2>
                <div class="zenithV4_dashboard_grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
                    <?php
                    $stmt_coin_plans = $pdo->query("SELECT * FROM coin_plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
                    $c_plans = $stmt_coin_plans->fetchAll(PDO::FETCH_ASSOC);
                    
                    if (empty($c_plans)) {
                        echo '<p style="color:#fff;">Şu anda jeton paketi bulunmuyor.</p>';
                    } else {
                        foreach($c_plans as $cplan) {
                            ?>
                            <div class="zenithV4_action_card" style="text-align:center; padding:2rem; background: rgba(255,255,255,0.02);">
                                <div style="font-size: 2.5rem; margin-bottom: 1rem;">🪙</div>
                                <h2 class="zenithV4_title" style="font-size:1.4rem; margin-bottom: 0.5rem;"><?= htmlspecialchars($cplan['name']) ?></h2>
                                <p style="margin-bottom: 1.5rem; color:var(--zenithV4_accent); font-weight: bold; font-size: 1.2rem;"><?= (int)$cplan['coin_amount'] ?> Jeton</p>
                                <div style="font-size:1.5rem; margin-bottom:1.5rem; opacity: 0.9;"><?= number_format($cplan['price'], 2) ?>₺</div>
                                <a href="premium.php?coin_plan_id=<?= $cplan['id'] ?>" class="zenithV4_btn" style="width: 100%;">HEMEN AL</a>
                            </div>
                            <?php
                        }
                    }
                    ?>
                </div>
            </section>

            <!-- 9. SETTINGS (New) -->
            <section id="page-settings" class="zenithV4_page">
                <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Ayarlar</h1>
                </header>
                
                <div style="max-width:600px;">
                    <h3 class="zenithV4_subtitle" style="margin-bottom:1.5rem">Hesap Güvenliği</h3>
                    <form action="actions/settings_action.php" method="POST">
                        <input type="hidden" name="action" value="update_password">
                        <input type="hidden" name="redirect_url" value="../index.php#settings">
                        <div class="zenithV4_form_group">
                            <label class="zenithV4_label">Mevcut Şifre</label>
                            <input type="password" name="current_password" class="zenithV4_input" required>
                        </div>
                        <div class="zenithV4_form_group">
                            <label class="zenithV4_label">Yeni Şifre</label>
                            <input type="password" name="new_password" class="zenithV4_input" required>
                        </div>
                         <div class="zenithV4_form_group">
                            <label class="zenithV4_label">Yeni Şifre (Tekrar)</label>
                            <input type="password" name="confirm_password" class="zenithV4_input" required>
                        </div>
                        <button class="zenithV4_btn">Şifreyi Güncelle</button>
                    </form>

                    <div style="margin-top:3rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:2rem;">
                        <h3 class="zenithV4_subtitle" style="color:#ff4444;">Hesap İşlemleri</h3>
                        <p style="color:var(--zenithV4_text_dim); font-size:0.8rem; margin-bottom:1rem;">Oturumu kapatmak için aşağıdaki butonu kullanın.</p>
                        <a href="logout.php" class="zenithV4_btn" style="border-color:#ff4444; color:#ff4444;">Güvenli Çıkış</a>
                    </div>
                </div>
            </section>

             <!-- 14. WHO LIKED ME (New) -->
             <?php
             // Safe fallback if variables aren't passed (though theme_helper should handle globals)
             $has_access_likes = $GLOBALS['has_access'] ?? false;
             $likers_data = $GLOBALS['likers'] ?? [];
             $likes_count = $GLOBALS['real_likes_count'] ?? 0;
             ?>
             <section id="page-who-liked-me" class="zenithV4_page">
                <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Beni Beğenenler</h1>
                    <span class="zenithV4_subtitle"><?= $likes_count ?> Kişi</span>
                </header>
                
                <?php if (!$has_access_likes): ?>
                    <!-- Blurred State -->
                     <div style="position:relative; min-height:50vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:2rem;">
                         <div style="position:absolute; inset:0; filter:blur(10px); opacity:0.3; pointer-events:none; display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
                             <!-- Fake Grid -->
                             <?php for($i=0;$i<9;$i++): ?><div style="background:var(--zenithV4_card_bg); border-radius:10px; height:200px;"></div><?php endfor; ?>
                         </div>
                         
                         <div style="z-index:2; background:rgba(0,0,0,0.8); padding:2rem; border-radius:20px; border:1px solid var(--zenithV4_accent);">
                             <h2 style="font-size:1.5rem; margin-bottom:1rem; color:var(--zenithV4_accent);">Gizli Hayranlarını Gör</h2>
                             <p>Premium üye olarak seni kimlerin beğendiğini anında görebilirsin.</p>
                             <a href="premium.php" class="zenithV4_btn primary" style="margin-top:2rem;">Premium'a Geç</a>
                         </div>
                     </div>
                <?php elseif(empty($likers_data)): ?>
                     <div style="text-align:center; padding:4rem; color:var(--zenithV4_text_dim);">
                         <p>Henüz seni beğenen kimse yok.</p>
                     </div>
                <?php else: ?>
                    <div class="zenithV4_match_grid">
                        <?php foreach($likers_data as $lUser): ?>
                        <div class="zenithV4_match_card" 
                             onclick="openZenithProfile(this)"
                             data-user='<?= json_encode([
                                 'id' => $lUser['user_id'],
                                 'username' => $lUser['username'],
                                 'age' => get_zenith_age($lUser['birth_date']),
                                 'avatar' => get_zenith_avatar($lUser['profile_picture_url'], $lUser['gender']),
                                 'city' => $lUser['city'] ?? '',
                                 'bio' => $lUser['bio'] ?? '',
                                 'intent' => $lUser['relationship_intent'] ?? ''
                             ], JSON_HEX_APOS | JSON_HEX_QUOT) ?>'>
                            <img src="<?= htmlspecialchars(get_zenith_avatar($lUser['profile_picture_url'], $lUser['gender'])) ?>" class="zenithV4_match_img">
                            <div class="zenithV4_match_overlay" style="display:flex; flex-direction:column; justify-content:end;">
                                <div style="font-family:var(--zenithV4_font_head); font-size:1.1rem;"><?= htmlspecialchars($lUser['username']) ?></div>
                                <div style="font-size:0.7rem; opacity:0.7;">
                                    <?= time_elapsed_string($lUser['liked_at']) ?> önce
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
             </section>

             <!-- 15. BLOCKS (New) -->
             <?php $blocked_list = $GLOBALS['blocked_users'] ?? []; ?>
             <section id="page-blocks" class="zenithV4_page">
                 <header class="zenithV4_header">
                    <h1 class="zenithV4_title">Engellenenler</h1>
                </header>
                <div style="max-width:600px; margin:0 auto;">
                    <?php if(empty($blocked_list)): ?>
                        <p style="text-align:center; padding:2rem; color:var(--zenithV4_text_dim);">Engellenen kullanıcı yok.</p>
                    <?php else: ?>
                        <?php foreach($blocked_list as $bUser): ?>
                        <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:15px; margin-bottom:10px; display:flex; gap:1rem; align-items:center;">
                            <img src="<?= htmlspecialchars($bUser['profile_picture_url'] ?? 'assets/images/default_avatar.png') ?>" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                            <div>
                                <div style="font-weight:bold;"><?= htmlspecialchars($bUser['username']) ?></div>
                                <div style="font-size:0.7rem; opacity:0.6;"><?= date('d.m.Y', strtotime($bUser['created_at'])) ?></div>
                            </div>
                            <form action="actions/block_action.php" method="POST" style="margin-left:auto;">
                                <input type="hidden" name="user_id" value="<?= $bUser['blocked_id'] ?>">
                                <input type="hidden" name="action" value="unblock">
                                <button class="zenithV4_btn" style="padding:5px 10px; font-size:0.7rem;">Kaldır</button>
                            </form>
                        </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
             </section>


             <?php 
             // Global variables from verify.php might be available
             $is_verified = $GLOBALS['is_verified'] ?? false;
             $latest_verification = $GLOBALS['latest_verification'] ?? null;
             $verify_history = $GLOBALS['history'] ?? [];
             ?>
             <section id="page-verify" class="zenithV4_page">
                 <header class="zenithV4_header"><h1 class="zenithV4_title">Hesap Doğrulama</h1></header>
                 <div style="max-width:600px; margin:0 auto; padding:2rem;">
                     
                     <?php if (isset($_SESSION['success'])): ?>
                         <div style="padding:1rem; background:rgba(0,255,0,0.1); color:#4ade80; border:1px solid #4ade80; margin-bottom:1rem; border-radius:10px;">
                             <?= $_SESSION['success']; unset($_SESSION['success']); ?>
                         </div>
                     <?php endif; ?>
                     <?php if (isset($_SESSION['error'])): ?>
                         <div style="padding:1rem; background:rgba(255,0,0,0.1); color:#ef4444; border:1px solid #ef4444; margin-bottom:1rem; border-radius:10px;">
                             <?= $_SESSION['error']; unset($_SESSION['error']); ?>
                         </div>
                     <?php endif; ?>

                     <?php if ($is_verified): ?>
                         <div style="text-align:center; padding:3rem; border:1px solid var(--zenithV4_accent); border-radius:20px; background:var(--zenithV4_card_bg);">
                             <div style="font-size:3rem; margin-bottom:1rem;">✅</div>
                             <h2 style="color:var(--zenithV4_accent);">Hesabınız Doğrulandı!</h2>
                             <p style="opacity:0.7; margin-top:1rem;">Topluluğumuzun güvenilir bir üyesi olduğunuz için teşekkürler.</p>
                         </div>
                     <?php elseif ($latest_verification && $latest_verification['status'] === 'pending'): ?>
                         <div style="text-align:center; padding:3rem; border:1px solid rgba(255,255,255,0.1); border-radius:20px; background:var(--zenithV4_card_bg);">
                             <div style="font-size:3rem; margin-bottom:1rem;">⏳</div>
                             <h2>Başvurunuz İnceleniyor</h2>
                             <p style="opacity:0.7; margin-top:1rem;">En kısa sürede size dönüş yapacağız.</p>
                             <?php if(!empty($latest_verification['notes'])): ?>
                                 <div style="margin-top:1rem; font-style:italic; opacity:0.5;">"<?= htmlspecialchars($latest_verification['notes']) ?>"</div>
                             <?php endif; ?>
                         </div>
                     <?php else: ?>
                         <div style="text-align:center; margin-bottom:2rem;">
                             <h2>Mavi Tik Al</h2>
                             <p style="margin:1rem 0; opacity:0.7;">Hesabınızı doğrulayarak güvenilirliğinizi artırın. Profil fotoğrafınızın ve kimliğinizin eşleştiğinden emin olun.</p>
                         </div>
                         <form action="actions/verification_request_action.php" method="POST" style="background:var(--zenithV4_card_bg); padding:2rem; border-radius:20px;">
                             <div class="zenithV4_form_group">
                                 <label class="zenithV4_label">Başvuru Notu (Opsiyonel)</label>
                                 <textarea name="notes" class="zenithV4_input" rows="4" placeholder="Neden doğrulanmak istiyorsunuz?"></textarea>
                             </div>
                             <button class="zenithV4_btn primary" style="width:100%; margin-top:1rem;">DOĞRULAMA İSTEĞİ GÖNDER</button>
                         </form>
                     <?php endif; ?>

                     <?php if (!empty($verify_history)): ?>
                         <div style="margin-top:3rem;">
                             <h3 style="margin-bottom:1rem; opacity:0.8; font-size:1.1rem;">Geçmiş Talepler</h3>
                             <?php foreach($verify_history as $item): ?>
                                 <div style="display:flex; justify-content:space-between; padding:1rem; border-bottom:1px solid rgba(255,255,255,0.1); opacity:0.7;">
                                     <span><?= date('d.m.Y', strtotime($item['submitted_at'])) ?></span>
                                     <span style="text-transform:capitalize; color:<?= $item['status']=='approved'?'#4ade80':($item['status']=='rejected'?'#ef4444':'#fbbf24') ?>">
                                         <?= $item['status'] ?>
                                     </span>
                                 </div>
                             <?php endforeach; ?>
                         </div>
                     <?php endif; ?>
                 </div>
             </section>

             <?php 
             $rep_user_id = $GLOBALS['reported_user_id'] ?? 0;
             $rep_user_data = $GLOBALS['reported_user'] ?? ['username' => 'Kullanıcı'];
             ?>
             <section id="page-report-user" class="zenithV4_page">
                 <header class="zenithV4_header"><h1 class="zenithV4_title">Kullanıcı Bildir</h1></header>
                 <div style="max-width:500px; margin:0 auto; padding:2rem;">
                     <div style="text-align:center; margin-bottom:2rem;">
                         <div style="font-size:2rem; margin-bottom:1rem;">⚠️</div>
                         <h2 style="font-family:var(--zenithV4_font_head);">"<?= htmlspecialchars($rep_user_data['username']) ?>" adlı kullanıcıyı bildiriyorsunuz</h2>
                         <p style="opacity:0.6; font-size:0.9rem; margin-top:0.5rem;">Bildiriminiz gizli tutulacak ve incelenecektir.</p>
                     </div>

                     <form action="actions/report_action.php" method="POST" style="background:var(--zenithV4_card_bg); padding:2rem; border-radius:20px;">
                         <input type="hidden" name="reported_id" value="<?= $rep_user_id ?>">
                         
                         <div class="zenithV4_form_group">
                             <label class="zenithV4_label">Şikayet Nedeni</label>
                             <textarea name="reason" class="zenithV4_input" rows="5" required placeholder="Lütfen durumu detaylıca açıklayın..."></textarea>
                         </div>
                         
                         <div style="display:flex; gap:1rem; margin-top:1.5rem;">
                             <a href="javascript:history.back()" class="zenithV4_btn" style="flex:1; text-align:center; background:rgba(255,255,255,0.05);">İptal</a>
                             <button type="submit" class="zenithV4_btn primary" style="flex:2;">BİLDİRİ GÖNDER</button>
                         </div>
                     </form>
                 </div>
             </section>

        </main>
    </div>

    <script>
        /* INJECTED INTERACTIVE LOGIC FOR ZENITH THEME */
        let currentChatUserId = null;

        function showZenithPage(pageId) {
            const navItems = document.querySelectorAll('.zenithV4_nav_item');
            const pages = document.querySelectorAll('.zenithV4_page');
            
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
                const main = document.querySelector('.zenithV4_main');
                if (main) main.scrollTop = 0;
                
                // Update URL hash or handle history if desired, but for now just show
                if (pageId === 'page-discover' && typeof window.initGalaxyDiscovery === 'function') {
                    setTimeout(window.initGalaxyDiscovery, 100);
                }
            } else {
                // Fallback to direct navigation if page not in DOM (e.g. settings or external)
                if (pageId === 'page-messages') window.location.href = 'chat.php';
                else if (pageId === 'page-notifications') window.location.href = 'notifications.php';
                else if (pageId === 'page-wallet') window.location.href = 'wallet.php';
                else if (pageId === 'page-profile-edit') window.location.href = 'profile_edit.php';
            }
        }
        let chatPollInterval = null;
        let lastMessageId = 0;
        let currentConversationId = 0;
        let currentMatchId = 0;
        let isPolling = false;
        const myUserId = <?= $current_user_id ?>;

        function openChatWithUser(userId, username, avatar, conversationId = 0, matchId = 0) {
            currentChatUserId = userId;
            lastMessageId = 0;
            currentConversationId = conversationId;
            currentMatchId = matchId;
            isPolling = false;

            const chatSection = document.getElementById('page-messages');
            if (chatSection && !chatSection.classList.contains('active')) {
               window.location.href = 'chat.php?user_id=' + userId;
               return; 
            }

            // Setup Headers
            document.getElementById('chat-active-user-id').value = userId;
            
            // Mobile Header
            document.getElementById('chat-header-name').innerText = username;
            document.getElementById('chat-header-img').src = avatar;
            
            // Desktop Header
            const dName = document.getElementById('chat-header-name-desktop');
            const dImg = document.getElementById('chat-header-img-desktop');
            if(dName) dName.innerText = username;
            if(dImg) dImg.src = avatar;

            // Toggle Views
            const isDesktop = window.innerWidth >= 768;
            if (isDesktop) {
                document.getElementById('chat-empty-state').style.display = 'none';
                document.getElementById('chat-area-container').style.display = 'flex';
                document.querySelector('.zenithV4_chat_list').style.display = 'block';
            } else {
                document.getElementById('chat-empty-state').style.display = 'none';
                document.getElementById('chat-area-container').style.display = 'flex';
                document.querySelector('.zenithV4_chat_list').style.display = 'none';
            }
            
            const msgBox = document.getElementById('chat-messages-box');
            msgBox.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.5);">Yükleniyor...</div>';
            
            loadMessages(userId);
        }

        function backToChatList() {
            currentChatUserId = null;
            document.getElementById('chat-area-container').style.display = 'none';
            document.getElementById('chat-empty-state').style.display = 'flex';
            document.querySelector('.zenithV4_chat_list').style.display = 'block';
        }

        async function loadMessages(activeUserId) {
            if (currentChatUserId !== activeUserId) return;
            if (isPolling) return;

            isPolling = true;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                let url = `actions/get_messages.php?receiver_id=${activeUserId}&after_id=${lastMessageId}&wait=10&t=${Date.now()}`;
                if (currentConversationId > 0) url += `&conversation_id=${currentConversationId}`;
                else if (currentMatchId > 0) url += `&match_id=${currentMatchId}`;

                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                const box = document.getElementById('chat-messages-box');
                const data = await response.json();
                
                if (currentChatUserId !== activeUserId) return;
                if (data.conversation_id && data.conversation_id > 0) currentConversationId = parseInt(data.conversation_id);
                if (box.innerHTML.includes('Yükleniyor')) box.innerHTML = '';

                if (lastMessageId === 0 && (!data.messages || data.messages.length === 0)) {
                     if (box.innerHTML.trim() === '') {
                         box.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; opacity:0.5;">' +
                                         '<span style="font-size:2rem;">👋</span>' +
                                         '<p style="margin-top:10px;">İlk mesajı sen gönder!</p>' +
                                         '</div>';
                     }
                }

                if (data.messages && data.messages.length > 0) {
                    if (box.innerHTML.includes('İlk mesajı sen gönder')) box.innerHTML = '';

                    const otherUserAvatar = document.getElementById('chat-header-img').src;

                    data.messages.forEach(msg => {
                        const msgId = parseInt(msg.id);
                        if (msgId <= lastMessageId) return;
                        // Skip if already rendered (prevents duplicate when optimistic + poll overlap)
                        if (document.querySelector(`[data-msg-id="${msgId}"]`)) {
                            lastMessageId = Math.max(lastMessageId, msgId);
                            return;
                        }

                        const isMe = parseInt(msg.sender_id) === myUserId;
                        const msgDate = new Date(msg.created_at);
                        const timeStr = msgDate.getHours().toString().padStart(2, '0') + ':' + msgDate.getMinutes().toString().padStart(2, '0');

                        const msgWrapper = document.createElement('div');
                        msgWrapper.className = 'zenithV4_msg_wrapper ' + (isMe ? 'sent' : 'received');
                        msgWrapper.dataset.msgId = msgId;

                        const isGiftMsg = (msg.body || '').trim().startsWith('🎁');
                        if (!isMe) {
                            msgWrapper.innerHTML = `<img src="${otherUserAvatar}" class="msg_avatar">`;
                        }

                        if (isGiftMsg) {
                            const giftBubble = document.createElement('div');
                            giftBubble.className = 'msg_content_group gift';
                            giftBubble.innerHTML = `
                                <div class="zenithV4_gift_bubble">
                                    <div class="gift_badge">🎁 Hediye</div>
                                    <div class="gift_body">${msg.body}</div>
                                </div>
                                <div class="msg_time">${timeStr}</div>
                            `;
                            msgWrapper.appendChild(giftBubble);
                        } else {
                            let html = `
                                <div class="msg_content_group">
                                    <div class="zenithV4_msg">${msg.body}</div>
                                    <div class="msg_time">${timeStr}</div>
                                </div>
                            `;
                            msgWrapper.innerHTML += html;
                        }

                        box.appendChild(msgWrapper);
                        lastMessageId = Math.max(lastMessageId, msgId);
                    });
                    box.scrollTop = box.scrollHeight;
                }
            } catch (e) { console.error("Poll error", e); } 
            finally {
                isPolling = false;
                if (currentChatUserId === activeUserId) setTimeout(() => loadMessages(activeUserId), 1000); 
            }
        }

        async function sendChatMessage() {
            const inputD = document.getElementById('chat-input-text');
            const inputM = document.getElementById('chat-input-text-mobile');
            
            let input = (inputM && inputM.offsetParent !== null) ? inputM : inputD;
            const txt = input.value.trim();
            if (!txt || !currentChatUserId) return;
            
            input.value = '';
            const box = document.getElementById('chat-messages-box');
            if (box.innerHTML.includes('İlk mesajı sen gönder')) box.innerHTML = '';

            const timeStr = new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0');
            const msgWrapper = document.createElement('div');
            msgWrapper.className = 'zenithV4_msg_wrapper sent';
            msgWrapper.style.opacity = '0.5';
            msgWrapper.dataset.temp = '1'; // optimistic marker
            msgWrapper.innerHTML = `
                <div class="msg_content_group">
                    <div class="zenithV4_msg">${txt}</div>
                    <div class="msg_time">${timeStr}</div>
                </div>
            `;
            box.appendChild(msgWrapper);
            box.scrollTop = box.scrollHeight;

            try {
                const formData = new FormData();
                formData.append('receiver_id', currentChatUserId);
                formData.append('body', txt);
                if (currentConversationId > 0) formData.append('conversation_id', currentConversationId);
                
                const response = await fetch('actions/message_action.php', { 
                    method: 'POST', 
                    body: formData,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const data = await response.json();
                if (data.success) {
                    msgWrapper.style.opacity = '1';
                    if (data.message_id) {
                        msgWrapper.dataset.msgId = data.message_id;
                        delete msgWrapper.dataset.temp;
                        lastMessageId = Math.max(lastMessageId, parseInt(data.message_id));
                    }
                    if (currentConversationId === 0 && data.conversation_id) currentConversationId = data.conversation_id;
                } else {
                    msgWrapper.style.color = '#ff4444';
                }
            } catch (e) { msgWrapper.style.color = '#ff4444'; }
        }

        // SWIPE LOGIC
        let currentSwipeIndex = <?= count($swipeUsers) - 1 ?>;
        
        function handleSwipe(action) {
            if (currentSwipeIndex < 0) return;
            const card = document.getElementById('swipe-card-' + currentSwipeIndex);
            if (!card) return;
            
            const uid = card.getAttribute('data-uid');
            const xVal = action === 'like' ? '150%' : '-150%';
            const rotVal = action === 'like' ? '20deg' : '-20deg';
            
            card.style.transform = `translateX(${xVal}) rotate(${rotVal})`;
            card.style.opacity = '0';
            
            currentSwipeIndex--;
            
            // Send to Server
            const formData = new FormData();
            formData.append('liked_user_id', uid);
            formData.append('action', action === 'like' ? 'like' : 'pass');
            if (action === 'like') formData.append('like_type', 'regular');
            
            fetch('actions/like_action.php', { method: 'POST', body: formData });
            
            // If last card
            if (currentSwipeIndex < 0) {
                setTimeout(() => {
                    document.querySelector('.zenithV4_swipe_container').innerHTML = 
                        '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--zenithV4_text_dim);"><h3 style="font-size:2rem;">Bitti!</h3><p>Daha sonra gel.</p></div>';
                }, 300);
            }
        }

        // Attach listeners if buttons exist
        const btnLike = document.querySelector('.btn-like');
        const btnNope = document.querySelector('.btn-nope');
        if(btnLike) btnLike.onclick = () => handleSwipe('like');
        if(btnNope) btnNope.onclick = () => handleSwipe('pass');

        // Chat Input Enter Key
        const chatInput = document.getElementById('chat-input-text');
        if(chatInput) {
            chatInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') sendChatMessage();
            });
        }
    </script>
    <div id="zenith-profile-modal" class="zenithV4_modal_overlay" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.85); backdrop-filter:blur(15px); align-items:flex-end; opacity:0; transition:opacity 0.4s ease;">
        <div class="zenithV4_modal_pane" style="width:100%; background:var(--zenithV4_surface); border-radius:30px 30px 0 0; border-top:1px solid rgba(255,255,255,0.1); overflow:hidden; transform:translateY(100%); transition:transform 0.4s cubic-bezier(0.19, 1, 0.22, 1); max-height:90vh; display:flex; flex-direction:column;">
             
             <!-- Close Handle -->
             <div style="width:100%; padding:15px; display:flex; justify-content:center; cursor:pointer;" onclick="closeZenithProfile()">
                 <div style="width:40px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px;"></div>
             </div>

             <div style="flex:1; overflow-y:auto; position:relative;">
                 <!-- Banner -->
                 <div style="height:300px; position:relative;">
                     <img id="z-modal-avatar-bg" src="" style="width:100%; height:100%; object-fit:cover; opacity:0.6;">
                     <div style="position:absolute; inset:0; background:linear-gradient(to top, var(--zenithV4_surface), transparent);"></div>
                     
                     <div style="position:absolute; bottom:0; padding:2rem; width:100%;">
                         <div style="display:flex; align-items:flex-end; gap:1.5rem;">
                             <img id="z-modal-avatar" src="" style="width:100px; height:100px; border-radius:50%; border:2px solid var(--zenithV4_accent); object-fit:cover; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                             <div>
                                 <h1 id="z-modal-name" style="font-family:var(--zenithV4_font_head); font-size:2.5rem; line-height:1; margin-bottom:0.5rem; color:#fff;"></h1>
                                 <div style="display:flex; gap:1rem; font-size:0.9rem; color:var(--zenithV4_text_dim);">
                                     <span id="z-modal-age"></span>
                                     <span>•</span>
                                     <span id="z-modal-city"></span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>

                 <!-- Body -->
                 <div style="padding:0 2rem 6rem 2rem;">
                     
                     <div style="margin-bottom:2rem;">
                         <label style="display:block; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--zenithV4_accent); margin-bottom:0.5rem;">Hakkında</label>
                         <p id="z-modal-bio" style="font-size:1.1rem; line-height:1.6; color:var(--zenithV4_text_main); font-family:var(--zenithV4_font_body); opacity:0.9;"></p>
                     </div>

                     <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">
                         <div style="background:rgba(255,255,255,0.05); padding:10px 20px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
                             <span style="opacity:0.5; font-size:0.8rem; display:block;">İlişki Niyeti</span>
                             <span id="z-modal-intent" style="font-weight:500;"></span>
                         </div>
                     </div>
                     
                     <div style="margin-bottom:2rem;">
                         <label style="display:block; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--zenithV4_accent); margin-bottom:0.5rem;">Galeri</label>
                         <div id="z-modal-gallery"></div>
                     </div>

                 </div>
             </div>

             <!-- Floating Action Bar -->
             <div style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:90%; display:flex; flex-direction:column; gap:10px; z-index:100;">
                 
                 <!-- Reaction Row -->
                 <div style="background:rgba(20,20,20,0.95); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:30px; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                     <button onclick="handleZenithAction('pass')" style="width:45px; height:45px; border-radius:50%; background:transparent; border:1px solid #ef4444; color:#ef4444; font-size:1.2rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">✕</button>
                     
                     <button onclick="handleZenithAction('superlike')" style="width:45px; height:45px; border-radius:50%; background:transparent; border:1px solid #3b82f6; color:#3b82f6; font-size:1.2rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">★</button>
                     
                     <button onclick="handleZenithAction('like')" style="width:45px; height:45px; border-radius:50%; background:transparent; border:1px solid #10b981; color:#10b981; font-size:1.2rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">❤</button>
                     
                     <button onclick="handleZenithAction('gift')" style="width:45px; height:45px; border-radius:50%; background:transparent; border:1px solid #a855f7; color:#a855f7; font-size:1.2rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🎁</button>
                 </div>

                 <!-- Chat Logic -->
                 <div style="background:rgba(20,20,20,0.95); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:30px; padding:5px; display:flex; justify-content:center; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                     <button onclick="closeZenithProfile()" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); padding:10px; border-radius:50%; background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:1rem; cursor:pointer;">Kapat</button>
                     
                     <button id="z-modal-msg-btn" class="zenithV4_btn primary" style="width:60%; padding:15px 0; border-radius:30px; font-size:1rem; box-shadow:0 0 20px rgba(212,175,55,0.3); border:none; background:var(--zenithV4_accent); color:black; font-weight:bold;">
                         Sohbet Başlat
                     </button>
                 </div>
             </div>
        </div>
    </div>

    <script>
        /* PROFILE MODAL LOGIC */
        let currentModalZenithId = null;
        let currentModalZenithName = null;
        let currentModalZenithAvatar = null;

        function openZenithProfile(el) {
            let data;
            try {
                data = JSON.parse(el.getAttribute('data-user'));
            } catch(e) {
                console.error("User data parse error", e);
                return;
            }
            
            currentModalZenithId = data.id;
            currentModalZenithName = data.username || null;
            currentModalZenithAvatar = data.avatar || null;

             // Populate Basic Info
            document.getElementById('z-modal-avatar').src = data.avatar;
            document.getElementById('z-modal-avatar-bg').src = data.avatar;
            document.getElementById('z-modal-name').innerText = data.username;
            document.getElementById('z-modal-age').innerText = data.age + ' Yaş';
            document.getElementById('z-modal-city').innerText = data.city || 'Konum Yok';
            document.getElementById('z-modal-bio').innerText = data.bio || 'Hakkında bir şey yazılmamış.';
            document.getElementById('z-modal-intent').innerText = data.intent || 'Belirtilmemiş';

            // Reset Gallery
            const galleryContainer = document.getElementById('z-modal-gallery');
            if (galleryContainer) {
                galleryContainer.innerHTML = '<p style="opacity:0.5; font-size:0.8rem;">Yükleniyor...</p>';
                
                // Fetch Gallery
                fetch('actions/get_profile_details.php?user_id=' + data.id)
                    .then(r => r.json())
                    .then(res => {
                        if (res.success && res.gallery && res.gallery.length > 0) {
                            let html = '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">';
                            res.gallery.forEach(img => {
                                html += `<img src="${img}" style="width:100%; aspect-ratio:1; object-fit:cover; border-radius:10px; border:1px solid rgba(255,255,255,0.1);">`;
                            });
                            html += '</div>';
                            galleryContainer.innerHTML = html;
                        } else {
                            galleryContainer.innerHTML = '<p style="opacity:0.5; font-size:0.8rem;">Galeri fotoğrafı yok.</p>';
                        }
                    })
                    .catch(e => {
                        galleryContainer.innerHTML = '<p style="opacity:0.5; font-size:0.8rem;">Galeri yüklenemedi.</p>';
                    });
            }

            // Action
            const btn = document.getElementById('z-modal-msg-btn');
            btn.onclick = function(e) {
                e.preventDefault();
                closeZenithProfile();
                setTimeout(() => openChatWithUser(data.id, data.username, data.avatar), 300);
            };

            // Show
            const modal = document.getElementById('zenith-profile-modal');
            const pane = modal.querySelector('.zenithV4_modal_pane');
            modal.style.display = 'flex';
            // Force redraw
            modal.offsetHeight; 
            modal.style.opacity = '1';
            pane.style.transform = 'translateY(0)';
        }

        function closeZenithProfile() {
            const modal = document.getElementById('zenith-profile-modal');
            const pane = modal.querySelector('.zenithV4_modal_pane');
            
            modal.style.opacity = '0';
            pane.style.transform = 'translateY(100%)';
            
            setTimeout(() => {
                modal.style.display = 'none';
                currentModalZenithId = null;
                currentModalZenithName = null;
                currentModalZenithAvatar = null;
            }, 400);
        }

        function handleZenithAction(type) {
            if (!currentModalZenithId) {
                zenithNotify('warn', 'Önce bir profil açın.', '⚠');
                return;
            }

            if (type === 'gift') {
                openZenithGiftModal();
                return;
            }

            const formData = new FormData();
            formData.append('liked_user_id', currentModalZenithId);
            
            if (type === 'pass') {
                formData.append('action', 'pass');
            } else if (type === 'superlike') {
                formData.append('action', 'like');
                formData.append('like_type', 'super');
            } else {
                formData.append('action', 'like');
                formData.append('like_type', 'regular');
            }

            fetch('actions/like_action.php', {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    closeZenithProfile();
                    alert(data.message);
                    // Refresh current page logic? Using location.reload for simplicitly
                    setTimeout(() => location.reload(), 500);
                } else {
                    alert('Hata: ' + data.message);
                }
            })
            .catch(e => {
                console.error(e);
                alert('İşlem başarısız.');
            });
        }
        
        // Close on overlay click
        document.getElementById('zenith-profile-modal').addEventListener('click', function(e) {
            if(e.target === this) closeZenithProfile();
        });

        /* ----------------- GIFT FLOW (ZENITH) ----------------- */
        let zenithGifts = [];
        let zenithGiftInventory = {};
        let selectedZenithGift = null;
        let selectedZenithGiftHasInventory = false;
        let useInventoryForGift = false;

        function zenithNotify(type, text, icon='✨') {
            const notif = document.getElementById('zenithNotification');
            const iconEl = document.getElementById('zenithNotifIcon');
            const titleEl = document.getElementById('zenithNotifTitle');
            const textEl = document.getElementById('zenithNotifText');
            if(!notif) return;
            iconEl.textContent = icon;
            titleEl.textContent = type === 'error' ? 'Hata' : (type === 'warn' ? 'Uyarı' : 'Bildirim');
            textEl.textContent = text;
            notif.style.transform = 'translateX(-50%) translateY(0)';
            notif.style.opacity = '1';
            setTimeout(() => {
                notif.style.transform = 'translateX(-50%) translateY(-150px)';
                notif.style.opacity = '0';
            }, 2500);
        }

        function openZenithGiftModal() {
            const modal = document.getElementById('zenithGiftModal');
            if (!modal) return;
            
            const targetId = currentModalZenithId || currentChatUserId;
            if (!targetId) {
                zenithNotify('warn','Önce bir profil veya sohbet seçin.','⚠');
                return;
            }
            
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.querySelector('.zenithGiftPane').style.transform = 'translateY(0)';
            });
            loadZenithGifts();
        }

        function closeZenithGiftModal() {
            const modal = document.getElementById('zenithGiftModal');
            if (!modal) return;
            modal.style.opacity = '0';
            modal.querySelector('.zenithGiftPane').style.transform = 'translateY(30px)';
            setTimeout(() => { modal.style.display = 'none'; }, 300);
        }

	// Close gift modal when clicking on overlay
	document.getElementById('zenithGiftModal')?.addEventListener('click', function(e){
    			if (e.target && e.target.id === 'zenithGiftModal') closeZenithGiftModal();
	});

        async function loadZenithGifts() {
            const grid = document.getElementById('zenithGiftGrid');
            const sendBtn = document.getElementById('zenithGiftSendBtn');
            const invToggle = document.getElementById('zenithGiftInventoryToggle');
            if (grid) grid.innerHTML = '<div style="padding:12px; opacity:0.7;">Yükleniyor...</div>';
            selectedZenithGift = null;
            selectedZenithGiftHasInventory = false;
            useInventoryForGift = false;
            if (sendBtn) sendBtn.disabled = true;
            if (invToggle) {
                invToggle.style.display = 'none';
                invToggle.querySelector('input').checked = false;
            }
            // Reset state to avoid dirty modal between opens
            if (grid) grid.innerHTML = '<div style="padding:12px; opacity:0.7;">Yükleniyor...</div>';
            selectedZenithGift = null;
            selectedZenithGiftHasInventory = false;
            useInventoryForGift = false;
            if (sendBtn) sendBtn.disabled = true;
            if (invToggle) {
                invToggle.style.display = 'none';
                invToggle.querySelector('input').checked = false;
            }

            try {
                const resp = await fetch('get_gifts.php', { cache:'no-store' });
                const data = await resp.json();
                if (!data.success) throw new Error(data.message || 'Hediye listesi alınamadı');
                // Varsayılan tema: tüm aktif coin_feature_options
                zenithGifts = data.gifts || [];
                zenithGiftInventory = data.inventory || {};
                renderZenithGifts();
            } catch (e) {
                if (grid) grid.innerHTML = '<div style="padding:12px; color:#f87171;">Hediye listesi alınamadı.</div>';
                zenithNotify('error', e.message || 'Hediye listesi alınamadı', '⚠');
            }
        }

        function giftIconFor(featureKey, imageUrl) {
            const map = {
                'boost': '🚀',
                'super_like': '⭐',
                'gold_like': '🧡',
                'rewind': '↺',
                'undo': '↺',
                'message_send': '✉️',
                'gift': '🎁'
            };
            if (imageUrl) return imageUrl;
            return map[featureKey] || '⚡';
        }

        function renderZenithGifts() {
            const grid = document.getElementById('zenithGiftGrid');
            if (!grid) return;
            if (!zenithGifts.length) {
                grid.innerHTML = '<div style="padding:12px; opacity:0.7;">Gösterilecek hediye yok.</div>';
                return;
            }
            grid.innerHTML = '';
            zenithGifts.forEach(g => {
                const qty = parseInt(zenithGiftInventory[g.id] || 0, 10);
                const icon = giftIconFor(g.feature_key, g.image_url);
                const isUrl = /^https?:/i.test(icon);
                const price = g.price ?? g.coin_price ?? 0;
                const badge = g.feature_name || g.feature_key || '';
                const priceHtml = qty > 0 
                    ? `<span style="text-decoration:line-through; opacity:0.6;">◎ ${price}</span> <span style="color:#D4AF37;">Stoktan</span>`
                    : `◎ ${price}`;
                const invHtml = qty > 0 ? `<div class="giftInv">Stok: ${qty}</div>` : '';
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'zenithGiftCard';
                card.dataset.id = g.id;
                card.innerHTML = `
                    <div class="giftIcon">${isUrl ? `<img src="${icon}" style="width:40px;height:40px;object-fit:contain;">` : icon}</div>
                    <div class="giftTitle">${g.label || g.option_label || g.title || 'Öğe'}</div>
                    <div class="giftFeature">${badge}</div>
                    <div class="giftPrice ${qty>0 ? 'hasInv' : ''}">${priceHtml}</div>
                    ${invHtml}
                `;
                card.onclick = () => selectZenithGift(g.id, qty);
                grid.appendChild(card);
            });
        }

        function selectZenithGift(optionId, qty=0) {
            selectedZenithGift = optionId;
            selectedZenithGiftHasInventory = qty > 0;
            useInventoryForGift = qty > 0;
            document.querySelectorAll('.zenithGiftCard').forEach(c => {
                c.classList.toggle('active', c.dataset.id == optionId);
            });
            const sendBtn = document.getElementById('zenithGiftSendBtn');
            if (sendBtn) sendBtn.disabled = false;
            const invToggle = document.getElementById('zenithGiftInventoryToggle');
            if (invToggle) {
                if (qty > 0) {
                    invToggle.style.display = 'flex';
                    invToggle.querySelector('input').checked = true;
                    invToggle.querySelector('label').textContent = `Envanterden gönder (${qty} adet)`;
                } else {
                    invToggle.style.display = 'none';
                    invToggle.querySelector('input').checked = false;
                }
            }
        }

        function toggleZenithInventory(el) {
            useInventoryForGift = !!el.checked;
        }

        async function sendZenithGift() {
            const targetId = currentModalZenithId || currentChatUserId;
            const targetName = currentModalZenithName || (document.getElementById('chat-header-name') ? document.getElementById('chat-header-name').innerText : 'Kullanıcı');
            const targetAvatar = currentModalZenithAvatar || (document.getElementById('chat-header-img') ? document.getElementById('chat-header-img').src : 'assets/images/default_avatar.png');

            if (!targetId) { zenithNotify('warn','Önce bir profil veya sohbet seçin.','⚠'); return; }
            if (!selectedZenithGift) { zenithNotify('warn','Lütfen bir hediye seçin.','⚠'); return; }
            const sendBtn = document.getElementById('zenithGiftSendBtn');
            if (sendBtn) sendBtn.disabled = true;
            try {
                const payload = {
                    receiver_id: targetId,
                    gift_option_id: selectedZenithGift,
                    use_inventory: !!useInventoryForGift
                };
                const resp = await fetch('actions/gift_action.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();
                if (!data.success) throw new Error(data.message || 'Gönderilemedi');
                if (typeof data.new_balance !== 'undefined') updateZenithCoins(data.new_balance);
                zenithNotify('success','Hediye gönderildi!','🎁');
                closeZenithGiftModal();
                if (typeof openChatWithUser === 'function' && targetId) {
                    setTimeout(() => openChatWithUser(targetId, targetName, targetAvatar), 300);
                }
            } catch (e) {
                zenithNotify('error', e.message || 'Gönderilemedi','⚠');
            } finally {
                if (sendBtn) sendBtn.disabled = false;
            }
        }

        function updateZenithCoins(newBalance) {
            const val = Number(newBalance) || 0;
            const mobile = document.getElementById('zenithCoinBalanceMobile');
            const desk = document.getElementById('zenithCoinBalanceDesktop');
            const topbar = document.getElementById('zenithCoinBalanceDesktopTopbar');
            if (mobile) mobile.textContent = val.toLocaleString('tr-TR');
            if (desk) desk.textContent = val.toLocaleString('tr-TR');
            if (topbar) topbar.textContent = val.toLocaleString('tr-TR');
        }
    </script>

    <!-- GIFT MODAL (Zenith) -->
    <div id="zenithGiftModal" style="display:none; opacity:0; position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); z-index:9999; align-items:center; justify-content:center; transition:opacity 0.25s ease;">
        <div class="zenithGiftPane" style="width: min(720px, 96vw); max-height: 90vh; background: var(--zenithV4_surface, #0f0f0f); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:20px; box-shadow:0 25px 60px rgba(0,0,0,0.5); transform: translateY(30px); transition: transform 0.25s ease;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
                <div>
                    <div style="font-family:var(--zenithV4_font_head); font-size:1.3rem;">Hediye Gönder</div>
                    <div style="opacity:0.6; font-size:0.9rem;">Seçtiğin kişiye sanal hediye gönder.</div>
                </div>
                <button onclick="closeZenithGiftModal()" style="width:34px; height:34px; border-radius:50%; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#fff; cursor:pointer;">✕</button>
            </div>
            <div id="zenithGiftGrid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:12px; margin-bottom:12px;"></div>
            <div id="zenithGiftInventoryToggle" style="display:none; align-items:center; gap:8px; margin-bottom:12px;">
                <input type="checkbox" id="zenithGiftUseInv" onclick="toggleZenithInventory(this)" style="width:16px; height:16px; accent-color:#D4AF37;">
                <label for="zenithGiftUseInv" style="font-size:0.9rem; opacity:0.8; cursor:pointer;">Envanterden gönder</label>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button onclick="closeZenithGiftModal()" style="padding:10px 14px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#fff; border-radius:10px;">Vazgeç</button>
                <button id="zenithGiftSendBtn" onclick="sendZenithGift()" disabled style="padding:10px 18px; border:none; background:linear-gradient(135deg,#D4AF37,#b6892f); color:#000; font-weight:700; border-radius:10px; cursor:pointer; min-width:110px;">Gönder</button>
            </div>
        </div>
    </div>

    <style>
        .zenithGiftCard{
            border:1px solid rgba(255,255,255,0.1);
            background:rgba(255,255,255,0.02);
            color:#fff;
            border-radius:14px;
            padding:14px;
            text-align:left;
            cursor:pointer;
            transition:all 0.2s;
        }
        .zenithGiftCard:hover{ border-color: rgba(212,175,55,0.6); box-shadow:0 10px 30px rgba(0,0,0,0.3); }
        .zenithGiftCard.active{ border-color:#D4AF37; background:rgba(212,175,55,0.08); }
        .zenithGiftCard .giftIcon{ font-size:2rem; margin-bottom:6px; }
        .zenithGiftCard .giftTitle{ font-weight:700; margin-bottom:4px; }
        .zenithGiftCard .giftPrice{ font-size:0.9rem; opacity:0.8; }
        .zenithGiftCard .giftInv{ margin-top:6px; font-size:0.8rem; color:#D4AF37; }
    </style>

    <!-- CUSTOM NOTIFICATION COMPONENT -->
    <div id="zenithNotification" style="position:fixed; top:20px; left:50%; transform:translateX(-50%) translateY(-150px); background:rgba(18,18,18,0.95); backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px); color:#fff; padding:12px 20px; border-radius:50px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 15px 40px rgba(0,0,0,0.6); display:flex; align-items:center; gap:12px; z-index:99999; opacity:0; transition:all 0.5s cubic-bezier(0.19, 1, 0.22, 1); min-width:300px; max-width:90%; pointer-events:none;">
        <div id="zenithNotifIcon" style="font-size:1.6rem; display:flex; align-items:center; justify-content:center; width:36px; height:36px; background:rgba(255,255,255,0.05); border-radius:50%;">✨</div>
        <div style="flex:1;">
            <div id="zenithNotifTitle" style="font-family:var(--zenithV4_font_head); font-size:0.9rem; opacity:0.8; margin-bottom:2px; text-transform:uppercase; letter-spacing:1px;">Bildirim</div>
            <div id="zenithNotifText" style="font-size:0.95rem; font-weight:500;">İşlem başarılı.</div>
        </div>
    </div>

    <script defer src="themes/zenith/zenithV4_editorialEngine.js"></script>
    <style>
        /* CHAT STYLES INJECTED */
        .zenithV4_msg {
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 12px;
            max-width: 70%;
            font-size: 0.95rem;
            line-height: 1.4;
            position: relative;
            word-wrap: break-word;
        }
        .zenithV4_msg.sent {
            background: var(--zenithV4_accent, #D4AF37);
            color: #000;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
            margin-left: auto;
        }
        .zenithV4_msg.received {
            background: rgba(255,255,255,0.1);
            color: #fff;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
            margin-right: auto;
        }
        /* Mobile fixes for chat area */
        @media (max-width: 768px) {
            /* .zenithV4_chat_area { position: fixed; inset: 0; z-index: 9999; background: #000; } */
             /* Already handled by JS toggle */
        }
    </style>
    <?php
        $injector_user_id = (int)($_GET['user_id'] ?? 0);
        $injector_user = $GLOBALS['other_user'] ?? null; // chat.php defines this
        $injector_conv_id = (int)($GLOBALS['conversation_id'] ?? 0);
        $injector_match_id = (int)($GLOBALS['match_id'] ?? 0);
        
        if ($injector_user_id > 0 && $injector_user) {
            $injector_username = $injector_user['username'];
            $injector_avatar = get_zenith_avatar($injector_user['profile_picture_url'], $injector_user['gender']);
    ?>
    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                if (typeof openChatWithUser === 'function') {
                    // Force switch to messages tab if function supports it or we do it manually
                    // openChatWithUser handles view toggling
                    openChatWithUser(
                        <?= $injector_user_id ?>, 
                        <?= json_encode($injector_username) ?>, 
                        <?= json_encode($injector_avatar) ?>,
                        <?= $injector_conv_id ?>,
                        <?= $injector_match_id ?>
                    );
                }
            }, 300);
        });
    </script>
    <?php } ?>

    <!-- Bot worker trigger (keeps LM Studio/bot replies flowing like Aura/default themes) -->
    <script>
        (function() {
            const BOT_WORKER_INTERVAL = 15000; // ms; falls back to 15s if setting not injected
            async function runBotWorker() {
                try {
                    await fetch('run_bot_worker.php?ajax=1', { cache: 'no-store' });
                } catch (e) {
                    console.warn('bot worker ping failed', e);
                } finally {
                    setTimeout(runBotWorker, BOT_WORKER_INTERVAL);
                }
            }
            setTimeout(runBotWorker, 2000);
        })();
    </script>

    <!-- ZENITH PAYMENT MODAL -->
    <?php
    // These are coming from premium.php where this file is required
    $sel_p = $GLOBALS['selected_plan'] ?? $selected_plan ?? null;
    $sel_c = $GLOBALS['selected_coin_plan'] ?? $selected_coin_plan ?? null;
    $m_type = $GLOBALS['modal_type'] ?? $modal_type ?? null;
    $o_num = $GLOBALS['order_number'] ?? $order_number ?? '';

    if ($sel_p || $sel_c): 
        $active_item = $sel_p ?? $sel_c;
        $is_coin = ($m_type === 'coin');
        $action_url = $is_coin ? 'actions/coin_payment_report_action.php' : 'actions/payment_report_action.php';
        $item_name = $is_coin ? $active_item['name'] . ' (' . (int)$active_item['coin_amount'] . ' Jeton)' : $active_item['name'];
        $item_price = $active_item['price'];
    ?>
    <div id="zenithPaymentModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="width:100%; max-width:500px; background:var(--zenithV4_surface, #0d0d0d); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:30px; box-shadow:0 30px 80px rgba(0,0,0,0.8); position:relative;">
            <a href="premium.php" style="position:absolute; top:20px; right:20px; color:rgba(255,255,255,0.5); font-size:1.5rem; text-decoration:none;">✕</a>
            
            <div style="text-align:center; margin-bottom:25px;">
                <h2 style="font-family:var(--zenithV4_font_head); font-size:1.8rem; color:var(--zenithV4_accent); margin-bottom:5px;">Ödeme Bildirimi</h2>
                <p style="font-size:0.8rem; opacity:0.6; letter-spacing:1px; text-transform:uppercase;">Havale / EFT İşlemi</p>
            </div>

            <form action="<?= $action_url ?>" method="POST" enctype="multipart/form-data" style="display:flex; flex-direction:column; gap:15px;">
                <?= csrf_input() ?>
                <?php if ($is_coin): ?>
                    <input type="hidden" name="coin_plan_id" value="<?= (int)$active_item['id'] ?>">
                    <input type="hidden" name="redirect" value="premium.php">
                <?php else: ?>
                    <input type="hidden" name="plan_id" value="<?= (int)$active_item['id'] ?>">
                <?php endif; ?>
                
                <input type="hidden" name="order_number" value="<?= htmlspecialchars($o_num) ?>">
                <input type="hidden" name="payment_method" value="bank_transfer">

                <div style="background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.2); border-radius:15px; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.7rem; color:var(--zenithV4_accent); font-weight:bold; text-transform:uppercase;">Seçilen</div>
                        <div style="color:#fff; font-weight:bold;"><?= htmlspecialchars($item_name) ?></div>
                    </div>
                    <div style="font-size:1.4rem; font-weight:bold; color:#fff;"><?= number_format($item_price, 2) ?> TL</div>
                </div>

                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:15px; padding:15px; font-size:0.85rem; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between;"><span style="opacity:0.5;">Banka:</span><span style="font-weight:bold;"><?= htmlspecialchars(defined('BANK_NAME') ? BANK_NAME : 'Banka Adı') ?></span></div>
                    <div style="display:flex; justify-content:space-between;"><span style="opacity:0.5;">IBAN:</span><span style="font-family:monospace; font-size:0.75rem; color:var(--zenithV4_accent);"><?= htmlspecialchars(defined('BANK_IBAN') ? BANK_IBAN : 'TR...') ?></span></div>
                    <div style="display:flex; justify-content:space-between;"><span style="opacity:0.5;">Alıcı:</span><span style="font-weight:bold;"><?= htmlspecialchars(defined('BANK_ACCOUNT_NAME') ? BANK_ACCOUNT_NAME : 'Sogason') ?></span></div>
                </div>

                <div style="display:grid; grid-template-columns:1fr; gap:12px;">
                    <div>
                        <label style="display:block; font-size:0.7rem; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:5px; font-weight:bold;">Ad Soyad</label>
                        <input type="text" name="payer_name" required style="width:100%; background:#000; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; color:#fff; font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:5px; font-weight:bold;">Ödeme Tarihi</label>
                        <input type="datetime-local" name="payment_date" required style="width:100%; background:#000; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px; color:#fff; font-size:0.9rem; color-scheme:dark;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:5px; font-weight:bold;">Dekont (Resim veya PDF)</label>
                        <input type="file" name="receipt" accept=".jpg,.jpeg,.png,.webp,.pdf" style="width:100%; font-size:0.75rem; opacity:0.8;">
                    </div>
                </div>

                <button type="submit" style="width:100%; padding:15px; background:var(--zenithV4_accent); border:none; border-radius:12px; color:#000; font-weight:bold; text-transform:uppercase; letter-spacing:1px; cursor:pointer; margin-top:10px;">Ödemeyi Bildir</button>
            </form>
        </div>
    </div>
    <?php endif; ?>

<!-- BOOST MODAL (Zenith) -->
<div class="zenith_boost_modal_overlay" id="zenithBoostModalOverlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(15px); z-index:3000; display:none; align-items:center; justify-content:center; opacity:0; transition:0.3s;">
    <div class="zenith_boost_box" style="background:#111; border:1px solid rgba(212,175,55,0.3); padding:40px; max-width:450px; width:90%; position:relative; box-shadow:0 0 50px rgba(212,175,55,0.15);">
        <div onclick="closeZenithBoostModal()" style="position:absolute; top:20px; right:20px; color:#666; cursor:pointer; font-size:1.5rem;">✕</div>
        
        <div style="text-align:center; margin-bottom:30px;">
            <h2 style="font-family:var(--zenithV4_font_head); color:#D4AF37; font-size:2rem; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:1px;">Profile Boost</h2>
            <p style="color:#888; font-size:0.9rem; font-style:italic;">Galakside öne çıkın ve görünürlüğü artırın.</p>
        </div>

        <div style="display:flex; gap:15px; margin-bottom:30px;">
            <div class="zb_option" data-duration="30" data-cost="50" onclick="selectZenithBoost(this)" style="flex:1; border:1px solid rgba(255,255,255,0.1); padding:20px; text-align:center; cursor:pointer; transition:0.3s; background:rgba(255,255,255,0.02);">
                <div style="font-size:1.5rem; font-weight:bold; color:#fff; margin-bottom:5px;">30dk</div>
                <div style="color:#D4AF37; font-size:0.9rem;">50 Jeton</div>
            </div>
            <div class="zb_option" data-duration="60" data-cost="100" onclick="selectZenithBoost(this)" style="flex:1; border:1px solid rgba(255,255,255,0.1); padding:20px; text-align:center; cursor:pointer; transition:0.3s; background:rgba(255,255,255,0.02);">
                <div style="font-size:1.5rem; font-weight:bold; color:#fff; margin-bottom:5px;">1 Saat</div>
                <div style="color:#D4AF37; font-size:0.9rem;">100 Jeton</div>
            </div>
        </div>

        <button id="zenithBoostBtn" disabled onclick="confirmZenithBoost()" style="width:100%; padding:15px; background:#333; color:#666; border:none; font-family:var(--zenithV4_font_head); font-size:1.1rem; text-transform:uppercase; letter-spacing:1px; cursor:not-allowed; transition:0.3s;">Seçim Yapın</button>
    </div>
</div>

<style>
@keyframes pulse { 0% { transform: scale(1); opacity:1; } 50% { transform: scale(1.05); opacity:0.8; } 100% { transform: scale(1); opacity:1; } }
.zb_option:hover { border-color: #D4AF37 !important; background: rgba(212,175,55,0.05) !important; }
.zb_option.selected { border-color: #D4AF37 !important; background: rgba(212,175,55,0.1) !important; box-shadow: 0 0 20px rgba(212,175,55,0.2); }
</style>

<script>
    const CSRF_TOKEN = '<?= htmlspecialchars(csrf_token(), ENT_QUOTES, "UTF-8") ?>';

    function injectCsrfTokens(scope) {
        const root = scope || document;
        root.querySelectorAll('form').forEach((form) => {
            const method = (form.getAttribute('method') || 'GET').toUpperCase();
            if (method !== 'POST') return;
            if (!form.querySelector('input[name="csrf_token"]')) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'csrf_token';
                input.value = CSRF_TOKEN;
                form.appendChild(input);
            }
        });
    }

    (function patchNetworkCsrf() {
        const originalFetch = window.fetch;
        if (typeof originalFetch === 'function') {
            window.fetch = function(input, init) {
                init = init || {};
                init.headers = new Headers(init.headers || {});
                if (!init.headers.has('X-CSRF-Token')) {
                    init.headers.set('X-CSRF-Token', CSRF_TOKEN);
                }
                return originalFetch(input, init);
            };
        }

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
            this._csrfMethod = (method || 'GET').toUpperCase();
            return originalOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function(body) {
            if (this._csrfMethod === 'POST') {
                this.setRequestHeader('X-CSRF-Token', CSRF_TOKEN);
            }
            return originalSend.call(this, body);
        };
    })();

    document.addEventListener('DOMContentLoaded', () => {
        injectCsrfTokens(document);
    });

    let zBoostDuration = null;
    let zBoostCost = null;

    function openZenithBoostModal() {
        const m = document.getElementById('zenithBoostModalOverlay');
        m.style.display = 'flex';
        setTimeout(() => { m.style.opacity = '1'; }, 10);
    }
    
    function closeZenithBoostModal() {
        const m = document.getElementById('zenithBoostModalOverlay');
        m.style.opacity = '0';
        setTimeout(() => { m.style.display = 'none'; }, 300);
        
        document.querySelectorAll('.zb_option').forEach(o => o.classList.remove('selected'));
        const btn = document.getElementById('zenithBoostBtn');
        btn.disabled = true;
        btn.style.background = '#333';
        btn.style.color = '#666';
        btn.style.cursor = 'not-allowed';
        btn.innerText = 'Seçim Yapın';
        zBoostDuration = null;
    }

    function selectZenithBoost(el) {
        document.querySelectorAll('.zb_option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        zBoostDuration = el.dataset.duration;
        zBoostCost = el.dataset.cost;
        
        const btn = document.getElementById('zenithBoostBtn');
        btn.disabled = false;
        btn.style.background = '#D4AF37';
        btn.style.color = '#000';
        btn.style.cursor = 'pointer';
        btn.innerText = `${zBoostCost} Jeton ile Yükselt`;
    }

    function confirmZenithBoost() {
        if(!zBoostDuration) return;
        const btn = document.getElementById('zenithBoostBtn');
        btn.disabled = true;
        btn.innerText = 'İşleniyor...';
        
        fetch('actions/boost_action.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `duration=${zBoostDuration}&cost=${zBoostCost}`
        })
        .then(r => r.json())
        .then(d => {
            if(d.success) {
                btn.innerText = 'BAŞARILI';
                setTimeout(() => {
                    location.reload();
                }, 500);
            } else {
                alert(d.message || 'Hata oluştu');
                btn.disabled = false;
                btn.innerText = `${zBoostCost} Jeton ile Yükselt`;
            }
        })
        .catch(e => {
            alert('Bağlantı hatası');
            btn.disabled = false;
            btn.innerText = `${zBoostCost} Jeton ile Yükselt`;
        });
    }
</script>
</body>
</html>


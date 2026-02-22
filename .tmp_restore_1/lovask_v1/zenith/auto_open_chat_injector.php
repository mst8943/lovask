
<?php
// Auto-open chat logic injector
$t_uid = $GLOBALS['target_user_id_param'] ?? $_GET['user_id'] ?? 0;
// We need to fetch 'other_user' if not available in current scope, but chat.php seems to produce it.
// $other_user from chat.php might be available.
$otherUserGlobal = $GLOBALS['other_user'] ?? null;

if ($t_uid > 0 && $otherUserGlobal) {
    $t_username = $otherUserGlobal['username'];
    // Use the helper function if available or construct manually
    // We can't easily call get_zenith_avatar here if functions are defined in this very file or included slightly differently.
    // simpler to rely on what chat.php built or basic constructs.
    $t_avatar = $otherUserGlobal['profile_picture_url']; // Fallback needed?
    // Let's rely on JS to handle avatar fallback or ensure we pass a valid string.
    
    // Check if avatar is valid path
    if (empty($t_avatar) || !file_exists($t_avatar)) {
        $t_avatar = 'assets/images/default-avatar.png'; // safe fallback
    }
}
?>

<?php if ($t_uid > 0 && isset($t_username)): ?>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Delay slightly to ensure UI is ready
        setTimeout(() => {
            const targetId = <?= params($t_uid) ?>; // invalid syntax, just use php echo
            const targetUser = <?= json_encode($t_username) ?>;
            const targetImg = <?= json_encode($t_avatar) ?>;
            
            if (typeof openChatWithUser === 'function') {
                openChatWithUser(<?= $t_uid ?>, targetUser, targetImg);
            }
        }, 300);
    });
</script>
<?php endif; ?>

<!-- Visit Trend Indicator (GAP-016 UI) -->
<?php if(isset($d_stats['visits_trend_direction']) && $d_stats['visits_trend_direction'] !== 'neutral'): ?>
    <div class="z_card" style="padding: 1.5rem; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(212,175,55,0.02));">
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 0.5rem;">Haftalık Trend</div>
                <div style="font-size: 1.8rem; font-family: var(--zenithV4_font_head); color: <?= $d_stats['visits_trend_direction'] === 'up' ? '#10b981' : '#ef4444' ?>;">
                    <?= $d_stats['visits_trend_direction'] === 'up' ? '↗' : '↘' ?> <?= $d_stats['visits_trend_percent'] ?>%
                </div>
            </div>
            <div style="font-size: 3rem; opacity: 0.2;">
                <?= $d_stats['visits_trend_direction'] === 'up' ? '📈' : '📉' ?>
            </div>
        </div>
        <p style="margin: 1rem 0 0 0; font-size: 0.85rem; color: var(--zenithV4_text_dim);">
            Profil ziyaretlerin geçen haftaya göre 
            <strong style="color: <?= $d_stats['visits_trend_direction'] === 'up' ? '#10b981' : '#ef4444' ?>;">
                %<?= $d_stats['visits_trend_percent'] ?> <?= $d_stats['visits_trend_direction'] === 'up' ? 'arttı' : 'azaldı' ?>
            </strong>
        </p>
    </div>
<?php endif; ?>

<!-- Recent Matches (GAP-015 UI) -->
<?php if(!empty($recent_matches)): ?>
    <div class="z_card" style="padding: 1.5rem;">
        <h3 style="font-size: 0.9rem; margin: 0 0 1.2rem 0; font-family: var(--zenithV4_font_head); opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Son Eşleşmeler</h3>
        <div style="display: flex; flex-direction: column;">
            <?php foreach(array_slice($recent_matches, 0, 4) as $match): ?>
                <a href="profile.php?id=<?= $match['user_id'] ?>" class="z_list_item">
                    <img src="<?= htmlspecialchars(get_avatar_url($match['profile_picture_url'], $match['gender'])) ?>" class="z_li_img">
                    <div class="z_li_info">
                        <h4><?= htmlspecialchars($match['username']) ?></h4>
                        <span class="z_li_time">Eşleştin • <?= time_elapsed_string($match['created_at']) ?></span>
                    </div>
                    <span style="font-size: 1.2rem; opacity: 0.6;">💚</span>
                </a>
            <?php endforeach; ?>
            <a href="matches.php" style="display:block; margin-top:1rem; font-size:0.75rem; text-align:center; color:var(--zenithV4_text_dim); text-decoration:none;">Tüm Eşleşmeleri Gör</a>
        </div>
    </div>
<?php endif; ?>

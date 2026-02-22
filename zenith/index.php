<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Ensure helper is available for site_name
require_once __DIR__ . '/../../includes/system_settings_helper.php';

$site_name = get_system_setting($pdo, 'site_name', 'Zenith');
$site_desc = get_system_setting($pdo, 'site_description', 'Sıradışı bir tanışma deneyimi.');
?>


<!DOCTYPE html>
<html lang="tr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $site_name ?> | Aşkın Zirvesi</title>
    <meta name="description" content="Sıradışı bir tanışma deneyimi. Modern, editöryel ve seçkin.">
    <link rel="stylesheet" href="<?= SITE_URL ?>/themes/zenith/zenithV4_editorialStyle.css">

    <!-- Fonts: Italiana (Display) + Tenor Sans (Body) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Italiana&family=Tenor+Sans&display=swap&subset=latin,latin-ext" rel="stylesheet">
    <style>
        /* Hide mobile-only cards on desktop */
        .zenithV4_membership_cards { display: none; }

        /* Panel Backgrounds */
        .zenithV4_panel_bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.45;
            z-index: 0;
            filter: brightness(0.7);
            transition: all 0.8s ease;
        }
        .zenithV4_feature_panel > *:not(.zenithV4_panel_bg),
        .zenithV4_bento_item > *:not(.zenithV4_panel_bg) {
            position: relative;
            z-index: 2;
        }

        .zenithV4_bento_item {
            position: relative;
            overflow: hidden;
        }

        .zenithV4_bento_item .zenithV4_panel_bg {
            opacity: 0.35;
        }

        /* Testimonials Slider - Minimal & Same Format */
        .zenithV4_testimonials {
            padding: 8rem 0;
            overflow: hidden;
            width: 100%;
            border-top: 1px solid var(--zenithV4_border);
        }
        .zenithV4_testimonial_track {
            display: flex;
            width: 100%;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
        }
        .zenithV4_testimonial_track::-webkit-scrollbar { display: none; }
        .zenithV4_testimonial_item {
            flex: 0 0 100%;
            width: 100%;
            scroll-snap-align: center;
            text-align: center;
            padding: 0 1.5rem;
            box-sizing: border-box;
        }
        .zenithV4_big_quote {
            font-family: var(--zenithV4_font_head);
            font-size: 2.5rem;
            line-height: 1.4;
            color: var(--zenithV4_text);
            max-width: 900px;
            margin: 0 auto 2rem;
            word-wrap: break-word;
        }
        @media (max-width: 1023px) {
            .zenithV4_big_quote {
                font-size: 1.5rem !important;
                line-height: 1.35 !important;
                max-width: 100%;
            }
            .zenithV4_testimonials {
                padding: 4rem 0 !important;
            }
        }

        /* Mobile Optimization Overrides */
        @media (max-width: 1024px) {
            /* Top Sticky Nav */
            .zenithV4_sidebar {
                width: 100% !important;
                height: 70px !important;
                flex-direction: row !important;
                padding: 0 1.5rem !important;
                justify-content: space-between !important;
                align-items: center !important;
                border-right: none !important;
                border-bottom: 1px solid var(--zenithV4_border) !important;
                background: var(--zenithV4_bg) !important;
                position: fixed !important;
                top: 0 !important;
                z-index: 1000 !important;
            }
            .zenithV4_brand {
                writing-mode: horizontal-tb !important;
                transform: none !important;
                font-size: 1.2rem !important;
            }
            .zenithV4_hero {
                grid-template-columns: 1fr !important;
                height: auto !important;
                padding-left: 0 !important;
                padding-top: 70px !important;
            }
            .zenithV4_hero_text {
                padding: 4rem 2rem !important;
                text-align: center !important;
                align-items: center !important;
            }
            .zenithV4_display_title {
                font-size: 3.5rem !important;
            }
            .zenithV4_hero_visual {
                display: flex !important;
                height: 50vh !important;
                overflow: hidden !important;
                position: relative !important;
            }
            .zenithV4_portal {
                width: 80% !important;
                height: 90% !important;
            }
            .zenithV4_fc_1 { top: 10% !important; left: 5% !important; width: 140px !important; font-size: 0.7rem !important; }
            .zenithV4_fc_2 { bottom: 10% !important; right: 5% !important; width: 140px !important; font-size: 0.7rem !important; }

            /* Feature Panels: Native Horizontal Swipe Optimized */
            .zenithV4_scroll_section {
                height: auto !important;
                padding: 4rem 0 !important;
            }
            .zenithV4_sticky_wrapper {
                position: relative !important;
                height: auto !important;
                display: block !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                -webkit-overflow-scrolling: touch !important;
                scroll-snap-type: x mandatory;
                scrollbar-width: none;
            }
            .zenithV4_sticky_wrapper::-webkit-scrollbar { display: none; }
            .zenithV4_track {
                display: flex !important;
                flex-direction: row !important;
                gap: 4vw !important;
                padding: 0 5vw !important; /* Start padding for first card */
                width: max-content !important;
                transform: none !important;
            }
            .zenithV4_feature_panel {
                width: 280px !important;
                min-width: 280px !important;
                max-width: 280px !important;
                height: 55vh !important;
                scroll-snap-align: center;
                padding: 1.5rem !important;
                overflow-x: hidden !important; /* Prevent text stretch */
                margin-right: 2rem !important;
            }
            .zenithV4_feature_panel p {
                word-wrap: break-word !important;
                white-space: normal !important;
                font-size: 0.85rem !important;
            }
            .zenithV4_track {
                padding: 0 10vw !important;
                gap: 0 !important; /* Gaps handled by card margin */
            }

            /* Bento Grid: Premium Desktop-Like Proportions for Mobile */
            .zenithV4_eco { padding: 5rem 1rem !important; }
            .zenithV4_section_head { margin-bottom: 3rem !important; }
            .zenithV4_head_title { font-size: 2.22rem !important; }
            .zenithV4_bento_grid {
                grid-template-columns: 1fr 1fr !important;
                grid-template-rows: auto !important;
                gap: 0.75rem !important;
            }
            .zenithV4_bento_item {
                height: 200px !important;
                padding: 1.25rem !important;
            }
            .zenithV4_span_2 { grid-column: span 2 !important; }
            .zenithV4_span_row_2 { 
                grid-column: span 1 !important; 
                grid-row: span 2 !important; 
                height: 407.5px !important; /* Precise height to match 2 small cards + gap */
            }
            .zenithV4_bento_item h3 { font-size: 1.1rem !important; }
            .zenithV4_bento_item p { font-size: 0.75rem !important; }

            /* Desktop View for Table, Hide Mobile Cards */
            .zenithV4_membership_cards { display: none !important; }

            /* Nuclear Fix: Membership Mobile - TWO CARDS UX */
            .zenithV4_premium { 
                padding: 4rem 0 !important;
                width: 100vw !important;
                max-width: 100vw !important;
                overflow: hidden !important;
                display: block !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }
            .zenithV4_head_title { 
                font-size: 1.8rem !important; 
                text-align: center !important; 
                margin-bottom: 3rem !important;
                padding: 0 1rem !important;
                width: 100% !important;
            }
            
            /* Hide the table completely on mobile */
            .zenithV4_table { display: none !important; }

            /* Show and style the mobile cards */
            .zenithV4_membership_cards {
                display: flex !important;
                flex-direction: column !important;
                gap: 2.5rem !important;
                width: 100% !important;
                align-items: center !important;
            }
            .zenithV4_m_card {
                width: 88vw !important;
                background: rgba(255,255,255,0.03) !important;
                border: 1px solid var(--zenithV4_border) !important;
                border-radius: 8px !important;
                padding: 2rem 1.5rem !important;
                box-sizing: border-box !important;
            }
            .zenithV4_m_card_title {
                font-family: var(--zenithV4_font_head) !important;
                font-size: 1.8rem !important;
                color: var(--zenithV4_accent) !important;
                margin-bottom: 1.5rem !important;
                text-align: center !important;
                border-bottom: 1px solid var(--zenithV4_border) !important;
                padding-bottom: 1rem !important;
            }
            .zenithV4_m_card_features {
                list-style: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .zenithV4_m_card_features li {
                display: flex !important;
                justify-content: space-between !important;
                padding: 1rem 0 !important;
                border-bottom: 1px solid rgba(255,255,255,0.05) !important;
                font-size: 0.85rem !important;
                color: var(--zenithV4_text) !important;
            }
            .zenithV4_m_card_features li:last-child { border-bottom: none !important; }
            .zenithV4_m_feature_val {
                color: var(--zenithV4_accent) !important;
            }
            .zenithV4_check { color: var(--zenithV4_accent) !important; font-size: 1rem !important; }
            
            /* Metrics Strip Mobile Fix: Side by Side with Smaller Fonts */
            /* Metrics Strip Mobile Fix: Side by Side with Smaller Fonts */
            .zenithV4_metrics {
                flex-direction: row !important;
                justify-content: space-around !important;
                padding: 3rem 1rem !important;
                gap: 0.5rem !important;
            }
            .zenithV4_m_val {
                font-size: 1.8rem !important;
                line-height: 1 !important;
            }
            .zenithV4_m_lbl {
                font-size: 0.6rem !important;
                margin-top: 0.3rem !important;
                white-space: nowrap !important;
            }

            /* FAQ Mobile Optimization */
            .zenithV4_faq {
                padding: 4rem 1.5rem !important;
                text-align: center !important;
            }
            .zenithV4_faq_item {
                margin-bottom: 2.5rem !important;
            }
            .zenithV4_faq_q {
                font-size: 1.6rem !important;
                line-height: 1.3 !important;
                margin-bottom: 0.5rem !important;
            }
            .zenithV4_faq_a {
                font-size: 0.9rem !important;
                padding: 0 1rem !important;
            }

            /* Testimonials Mobile Fix */
            .zenithV4_testimonials {
                padding: 4rem 1.5rem !important;
            }
            .zenithV4_big_quote {
                font-size: 1.6rem !important;
                line-height: 1.3 !important;
                margin-bottom: 2rem !important;
            }

            /* Footer Mobile Optimization */
            .zenithV4_footer {
                flex-direction: column !important;
                align-items: center !important;
                text-align: center !important;
                gap: 2.5rem !important;
                padding: 4rem 1rem !important;
            }
            .zenithV4_footer_brand { 
                font-size: 4.5rem !important; 
                line-height: 1 !important;
                margin-bottom: 0 !important;
            }
            .zenithV4_footer div {
                text-align: center !important; /* Force center for mobile links */
            }
            .zenithV4_footer p {
                font-size: 0.75rem !important;
                line-height: 1.6 !important;
                opacity: 0.7 !important;
            }
        }

        .zenithV4_pulse_btn {
            animation: zenithV4_pulse_anim 2s infinite;
            box-shadow: 0 0 0 0 rgba(214, 164, 120, 0.7);
        }

        @keyframes zenithV4_pulse_anim {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(214, 164, 120, 0.7);
            }
            70% {
                transform: scale(1.05);
                box-shadow: 0 0 0 10px rgba(214, 164, 120, 0);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(214, 164, 120, 0);
            }
        }
    </style>
</head>

<body>

    <!-- Vertical Sidebar Navigation -->
    <nav class="zenithV4_sidebar">
        <div class="zenithV4_menu_icon">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <a href="#" class="zenithV4_brand"><?= strtoupper($site_name) ?></a>
        <div style="font-size: 0.7rem; writing-mode: vertical-rl; transform: rotate(180deg); opacity: 0.5;">
            2026 EDITION
        </div>
    </nav>
    
    <!-- Zenith Menu Overlay -->
    <div class="zenithV4_menu_overlay" id="zenithV4_menu">
        <div class="zenithV4_close_menu" id="zenithV4_close">KAPAT</div>
        <ul class="zenithV4_menu_links">
            <?php if (isset($_SESSION['user_id'])): ?>
                <li>
                    <a href="<?= SITE_URL ?>/dashboard.php">
                        <span>ÜYE PANELİ</span>
                        PROFİLİM
                    </a>
                </li>
                <li>
                    <a href="<?= SITE_URL ?>/premium.php">
                        <span>AYRICALIKLAR</span>
                        PREMIUM
                    </a>
                </li>
                <li>
                    <a href="<?= SITE_URL ?>/actions/logout.php">
                        <span>GÜVENLİ ÇIKIŞ</span>
                        ÇIKIŞ YAP
                    </a>
                </li>
            <?php else: ?>
                <li>
                    <a href="<?= SITE_URL ?>/login.php">
                        <span>HOŞ GELDİNİZ</span>
                        GİRİŞ YAP
                    </a>
                </li>
                <li>
                    <a href="<?= SITE_URL ?>/register.php">
                        <span>BİZE KATILIN</span>
                        KAYIT OL
                    </a>
                </li>
            <?php endif; ?>
        </ul>
    </div>

    <!-- Hero Section: Split Asymmetrical -->
    <header class="zenithV4_hero">
        <div class="zenithV4_hero_text">
            <span class="zenithV4_eyebrow">The Collection No. 4</span>
            <h1 class="zenithV4_display_title">
                Bağlar<br><span>Ötesinde.</span>
            </h1>
            <p style="max-width: 300px; color: var(--zenithV4_text_dim); margin-bottom: 2rem;">
                Sıradanlığın bittiği yerde, <?= $site_name ?> başlar. Sadece en uyumlu ruhlar için küratörlü bir tanışma deneyimi.
            </p>
            <div>
                <a href="<?= SITE_URL ?>/register.php" class="zenithV4_btn zenithV4_pulse_btn">Başvuru Yap</a>
            </div>
        </div>
        <div class="zenithV4_hero_visual">
            <div class="zenithV4_portal">
                <div style="width:100%; height:100%; background: linear-gradient(180deg, #334, #111);">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
                        alt="Model" style="opacity: 0.6;">
                </div>
            </div>

            <!-- Floating Elements -->
            <div class="zenithV4_float_card zenithV4_fc_1">
                <span
                    style="font-family: var(--zenithV4_font_head); font-size:1.2rem; display:block; margin-bottom:0.5rem;">Kürasyon</span>
                "Her profil bir sanat eseri gibi incelenir."
            </div>

            <div class="zenithV4_float_card zenithV4_fc_2">
                <span
                    style="font-family: var(--zenithV4_font_head); font-size:1.2rem; display:block; margin-bottom:0.5rem;">Uyumluluk</span>
                %98.5 Başarı Oranı
            </div>
        </div>
    </header>

    <!-- Horizontal Scroll Section (Features) -->
    <section class="zenithV4_scroll_section">
        <div class="zenithV4_sticky_wrapper">
            <div class="zenithV4_track">

                <!-- Feature 1 -->
                <article class="zenithV4_feature_panel" style="overflow: hidden;">
                    <img src="themes/zenith/zenith_dating_couple_mood_1769624205001.png" class="zenithV4_panel_bg" alt="Görsel Hafıza">
                    <span class="zenithV4_num">01</span>
                    <div style="margin-bottom: auto;">
                        <span style="border-bottom: 1px solid var(--zenithV4_accent); padding-bottom: 5px; font-weight: bold; letter-spacing: 2px;">KONSEPT</span>
                    </div>
                    <div>
                        <h2 class="zenithV4_panel_title" style="text-shadow: 0 2px 10px rgba(0,0,0,0.8);">Estetik Aura</h2>
                        <p style="color: #fff; margin-top: 1rem; font-weight: 400; text-shadow: 0 1px 5px rgba(0,0,0,0.5);">
                            Kelime kalıplarının ötesine geçin. 'Visual Moodboard' sistemimizle ruhunuzun estetik yansımasını keşfedin, vizyonu sizinkiyle örtüşenlerle bağ kurun.
                        </p>
                        <a href="register.php" class="zenithV4_btn" style="margin-top:2rem; border-color:var(--zenithV4_accent); color:var(--zenithV4_accent);">
                            <span style="margin-right:0.5rem">♥</span> Görsel Eşleşme
                        </a>
                    </div>
                </article>

                <!-- Feature 2 -->
                <article class="zenithV4_feature_panel" style="overflow: hidden;">
                    <img src="themes/zenith/zenith_dating_connection_art_1769624220517.png" class="zenithV4_panel_bg" alt="Rezonans">
                    <span class="zenithV4_num">02</span>
                    <div style="margin-bottom: auto;">
                        <span style="border-bottom: 1px solid var(--zenithV4_accent); padding-bottom: 5px; font-weight: bold; letter-spacing: 2px;">SEÇKİ</span>
                    </div>
                    <div>
                        <h2 class="zenithV4_panel_title" style="text-shadow: 0 2px 10px rgba(0,0,0,0.8);">Hassas Frekans</h2>
                        <p style="color: #fff; margin-top: 1rem; font-weight: 400; text-shadow: 0 1px 5px rgba(0,0,0,0.5);">
                            Sadece benzer profilleri değil, zihinsel ve entelektüel derinliği analiz eden algoritmamızla, gerçek 'paralel' ruhları saniyeler içinde saptıyoruz.
                        </p>
                        <a href="register.php" class="zenithV4_btn" style="margin-top:2rem; border-color:var(--zenithV4_accent_sec); color:var(--zenithV4_accent_sec);">
                            <span style="margin-right:0.5rem">⚡</span> Frekansını Ölç
                        </a>
                    </div>
                </article>

                <!-- Feature 3 -->
                <article class="zenithV4_feature_panel" style="overflow: hidden;">
                    <img src="themes/zenith/zenith_dating_secret_lounge_1769624237581.png" class="zenithV4_panel_bg" alt="Güven">
                    <span class="zenithV4_num">03</span>
                    <div style="margin-bottom: auto;">
                        <span style="border-bottom: 1px solid var(--zenithV4_accent); padding-bottom: 5px; font-weight: bold; letter-spacing: 2px;">MAHREMİYET</span>
                    </div>
                    <div>
                        <h2 class="zenithV4_panel_title" style="text-shadow: 0 2px 10px rgba(0,0,0,0.8);">Gizli Cemiyet</h2>
                        <p style="color: #fff; margin-top: 1rem; font-weight: 400; text-shadow: 0 1px 5px rgba(0,0,0,0.5);">
                            Dış dünyaya kapalı, şifreli bir dijital malikane. Güvenlik bir seçenek değil; sizin için oluşturduğumuz bu izole evrenin temel taşıdır.
                        </p>
                        <a href="register.php" class="zenithV4_btn" style="margin-top:2rem; border-color:#fff; color:#fff;">
                            <span style="margin-right:0.5rem">🔒</span> Anahtar İste
                        </a>
                    </div>
                </article>

                <!-- End Card -->
                <article class="zenithV4_feature_panel"
                    style="background: var(--zenithV4_text); color: var(--zenithV4_bg);">
                    <span class="zenithV4_num" style="color: rgba(0,0,0,0.1);">04</span>
                    <h2 class="zenithV4_panel_title" style="color: var(--zenithV4_bg); font-size: 3.5rem;">Keşfetmeye<br>Hazır mısın?</h2>
                    <a href="<?= SITE_URL ?>/register.php" class="zenithV4_btn" style="border-color: #000; color: #000; margin-top: 2rem; width: 100%; text-align: center;">ÜYELİĞİ BAŞLAT</a>
                </article>

            </div>
        </div>
    </section>

    <!-- Ecosystem (Bento Grid) -->
    <section class="zenithV4_eco">
        <div class="zenithV4_section_head">
            <h2 class="zenithV4_head_title"><?= $site_name ?> Ekosistemi</h2>
            <p style="color: var(--zenithV4_text_dim);">Sıradan bir uygulamanın ötesinde, tam teşekküllü bir yaşam tarzı
                kulübü.</p>
        </div>

        <div class="zenithV4_bento_grid">
            <div class="zenithV4_bento_item zenithV4_span_2">
                <img src="themes/zenith/zenith_gala_evening_1769625040846.png" class="zenithV4_panel_bg" alt="Events">
                <h3 style="font-family: var(--zenithV4_font_head); font-size: 1.8rem; color:var(--zenithV4_accent); text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Gala Akşamları</h3>
                <p style="font-size: 0.95rem; margin-top: 0.5rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                    Ekranın ötesine geçin. Sadece seçkin üyelerimize özel, sanat ve diplomasi kokan kapalı davetlerde gerçek karşılaşmalar yaşayın.
                </p>
            </div>

            <div class="zenithV4_bento_item zenithV4_span_row_2">
                <img src="themes/zenith/zenith_escape_retreat_1769625056011.png" class="zenithV4_panel_bg" alt="Retreats" style="opacity: 0.6;">
                <div style="width:100%; height:100%; display:flex; flex-direction: column; justify-content: flex-end; padding:1.5rem;">
                    <h3 style="color:#fff; font-family:var(--zenithV4_font_head); font-size: 2rem; text-shadow: 0 2px 10px rgba(0,0,0,1);">Kaçış Rotaları</h3>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                        Kalabalıktan izole, sadece en özellerin bir araya geldiği lüks destinasyonlarda unutulmaz anlar.
                    </p>
                </div>
            </div>

            <div class="zenithV4_bento_item">
                <img src="themes/zenith/zenith_curator_concierge_1769625071628.png" class="zenithV4_panel_bg" alt="Concierge">
                <h3 style="font-family: var(--zenithV4_font_head); font-size: 1.5rem; color: #fff; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Kişisel Küratör</h3>
                <p style="font-size: 0.85rem; margin-top: 0.5rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                    Size en uygun eşleşmeleri manuel olarak filtreleyen 7/24 asistan hizmeti.
                </p>
            </div>

            <div class="zenithV4_bento_item">
                <img src="themes/zenith/zenith_style_atelier_1769625087209.png" class="zenithV4_panel_bg" alt="Atelier">
                <h3 style="font-family: var(--zenithV4_font_head); font-size: 1.5rem; color: #fff; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Stil Atölyesi</h3>
                <p style="font-size: 0.85rem; margin-top: 0.5rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                    Profilinizin estetik gücünü artıracak profesyonel imaj ve fotoğraf danışmanlığı.
                </p>
            </div>

            <div class="zenithV4_bento_item zenithV4_span_2">
                <img src="themes/zenith/zenith_etiquette_class_1769625104961.png" class="zenithV4_panel_bg" alt="Academy">
                <h3 style="font-family: var(--zenithV4_font_head); font-size: 1.8rem; color:var(--zenithV4_accent); text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Modern Adab-ı Muaşeret</h3>
                <p style="font-size: 0.95rem; margin-top: 0.5rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                    İlişkilerde yüksek standart. Uzman küratörlerimizden flört sanatının incelikleri ve modern nezaket kuralları üzerine rehberlik alın.
                </p>
            </div>
        </div>
    </section>

    <!-- Metrics Strip -->
    <div class="zenithV4_metrics">
        <div>
            <span class="zenithV4_m_val">5K</span>
            <span class="zenithV4_m_lbl">Global Üye</span>
        </div>
        <div>
            <span class="zenithV4_m_val">12</span>
            <span class="zenithV4_m_lbl">Şehir</span>
        </div>
        <div>
            <span class="zenithV4_m_val">100%</span>
            <span class="zenithV4_m_lbl">Gizlilik</span>
        </div>
    </div>

    <!-- Testimonials Section -->
    <section class="zenithV4_testimonials">
        <p class="zenithV4_eyebrow" style="text-align: center; margin-bottom: 3rem;">SESLER</p>
        <div class="zenithV4_testimonial_track">
            <!-- Testimonial 1 -->
            <div class="zenithV4_testimonial_item">
                <blockquote class="zenithV4_big_quote">
                    "<?= $site_name ?>, swipe kültüründen yorulanlar için bir kaçış noktası. Burada nicelik değil, nitelik konuşuyor. Kendimi sonunda evimde hissediyorum."
                </blockquote>
                <cite style="font-style:normal; color:var(--zenithV4_accent);">— Leyla S., Kreatif Direktör</cite>
            </div>
            <!-- Testimonial 2 -->
            <div class="zenithV4_testimonial_item">
                <blockquote class="zenithV4_big_quote">
                    "Gerçek bağlar özen ve derinlik ister. <?= $site_name ?>, dijital dünyada aradığım o samimi ve seçkin atmosferi bana sunan tek yer oldu."
                </blockquote>
                <cite style="font-style:normal; color:var(--zenithV4_accent);">— Caner T., Mimar</cite>
            </div>
            <!-- Testimonial 3 -->
            <div class="zenithV4_testimonial_item">
                <blockquote class="zenithV4_big_quote">
                    "Sadece bir uygulama değil, bir yaşam tarzı kulübü. Burada vizyonu benimle örtüşen, ilham verici insanlarla tanıştım."
                </blockquote>
                <cite style="font-style:normal; color:var(--zenithV4_accent);">— Selin K., Galeri Yöneticisi</cite>
            </div>
        </div>
    </section>

    <!-- Premium Table -->
    <section class="zenithV4_premium">
        <div class="zenithV4_section_head">
            <h2 class="zenithV4_head_title">Üyelik Modelleri</h2>
        </div>

        <!-- Mobile-Only Membership Cards -->
        <div class="zenithV4_membership_cards">
            <!-- Normal Card -->
            <div class="zenithV4_m_card">
                <h3 class="zenithV4_m_card_title">NORMAL</h3>
                <ul class="zenithV4_m_card_features">
                    <li><span>Günlük Eşleşme Hakkı</span> <span class="zenithV4_m_feature_val">5</span></li>
                    <li><span>Concierge Erişimi</span> <span class="zenithV4_m_feature_val">-</span></li>
                    <li><span>Etkinlik Davetiyesi</span> <span class="zenithV4_m_feature_val">Bekleme Listesi</span></li>
                    <li><span>Profil Görünürlüğü</span> <span class="zenithV4_m_feature_val">Standart</span></li>
                </ul>
            </div>
            <!-- Premium Card -->
            <div class="zenithV4_m_card" style="border-color: var(--zenithV4_accent);">
                <h3 class="zenithV4_m_card_title">PREMIUM</h3>
                <ul class="zenithV4_m_card_features">
                    <li><span>Günlük Eşleşme Hakkı</span> <span class="zenithV4_m_feature_val">Sınırsız</span></li>
                    <li><span>Concierge Erişimi</span> <span class="zenithV4_m_feature_val zenithV4_check">●</span></li>
                    <li><span>Etkinlik Davetiyesi</span> <span class="zenithV4_m_feature_val">Öncelikli</span></li>
                    <li><span>Profil Görünürlüğü</span> <span class="zenithV4_m_feature_val">Vitrin</span></li>
                </ul>
            </div>
        </div>

        <table class="zenithV4_table">
            <thead>
                <tr>
                    <th>Özellik</th>
                    <th>Normal</th>
                    <th>Premium</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Günlük Eşleşme Hakkı</td>
                    <td>5</td>
                    <td>Sınırsız</td>
                </tr>
                <tr>
                    <td>Concierge Erişimi</td>
                    <td>-</td>
                    <td class="zenithV4_check">●</td>
                </tr>
                <tr>
                    <td>Etkinlik Davetiyesi</td>
                    <td>Bekleme Listesi</td>
                    <td class="zenithV4_check">Öncelikli</td>
                </tr>
                <tr>
                    <td>Profil Görünürlüğü</td>
                    <td>Standart</td>
                    <td class="zenithV4_check">Vitrin</td>
                </tr>
            </tbody>
        </table>

        <div style="text-align: center; margin-top: 4rem;">
            <a href="#" class="zenithV4_btn">Detaylı İncele</a>
        </div>
    </section>

    <!-- Simple Accordion -->
    <section class="zenithV4_faq">
        <div class="zenithV4_faq_item">
            <div class="zenithV4_faq_q"><?= $site_name ?>'e herkes üye olabilir mi?</div>
            <div class="zenithV4_faq_a">Hayır. <?= $site_name ?>, davetiye usulü veya detaylı başvuru incelemesi ile üye kabul
                eder. Denge ve uyum bizim için en önemli kriterdir.</div>
        </div>
        <div class="zenithV4_faq_item">
            <div class="zenithV4_faq_q">Üyelik ücretleri nedir?</div>
            <div class="zenithV4_faq_a">Yıllık üyelik aidatı ile çalışmaktayız. Güncel ücretler başvuru onayından sonra
                paylaşılır.</div>
        </div>
        <div class="zenithV4_faq_item">
            <div class="zenithV4_faq_q">Hangi şehirlerde aktif?</div>
            <div class="zenithV4_faq_a">Şu anda İstanbul, Londra, New York ve Paris'te aktif topluluklarımız
                bulunmaktadır. Yakında Milano ve Berlin eklenecektir.</div>
        </div>
    </section>

    <!-- Minimal Footer -->
    <footer class="zenithV4_footer">
        <div class="zenithV4_footer_brand"><?= strtoupper($site_name) ?></div>
        <div style="text-align: right; color: var(--zenithV4_text_dim);">
            <p>EST. 2026</p>
            <p>Gizlilik Politikası / Üyelik Sözleşmesi</p>
        </div>
    </footer>

    <script defer src="<?= SITE_URL ?>/themes/zenith/zenithV4_editorialEngine.js"></script>
</body>

</html>
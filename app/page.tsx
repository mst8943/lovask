'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'
import LoadingSplash from '@/components/ui/LoadingSplash'

export default function ZenithLanding() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Auto-redirect if logged in
  useEffect(() => {
    if (!isLoading && user) {
      const checkProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (data) {
          router.replace('/feed')
        } else {
          router.replace('/onboarding')
        }
      }
      checkProfile()
    }
  }, [user, isLoading, router, supabase])

  // While auth is loading OR user is logged in (redirecting) — show splash
  if (isLoading || user) {
    return <LoadingSplash />
  }

  // Custom Hook to replicate the horizontal scroll behavior
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"]
  })
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"])

  return (
    <div className="zenithV4_landing_wrapper">

      {/* 
        INJECTING EXACT ZENITH CSS 
        Source: zenith/zenithV4_editorialStyle.css
      */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
        /* --- FONT MAPPING --- */
        :root {
            --zenithV4_bg: #0C1210;
            --zenithV4_surface: #141C19;
            --zenithV4_surface_light: #1E2A25;
            --zenithV4_accent: #D6A478;
            --zenithV4_accent_sec: #B56B6B;
            --zenithV4_text: #E8E6D9;
            --zenithV4_text_dim: #8F9692;
            --zenithV4_border: rgba(255, 255, 255, 0.08);
            --zenithV4_glow: rgba(214, 164, 120, 0.25);
            --zenithV4_shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
            
            /* Map Next.js Fonts to Zenith Variables */
            --zenithV4_font_head: "Montserrat", sans-serif;
            --zenithV4_font_body: "Montserrat", sans-serif;
            
            --zenithV4_gutter: 4vw;
            --zenithV4_sidebar_w: 80px;
        }

        /* --- RESET & GLOBAL --- */
        .zenithV4_landing_wrapper {
            background-color: var(--zenithV4_bg);
            color: var(--zenithV4_text);
            font-family: "Montserrat", sans-serif !important;
            /* overflow-x: hidden;  <-- REMOVED to fix Sticky Scroll */
            width: 100%;
            min-height: 100vh;
        }
        .zenithV4_landing_wrapper h1,
        .zenithV4_landing_wrapper h2,
        .zenithV4_landing_wrapper h3,
        .zenithV4_landing_wrapper h4,
        .zenithV4_landing_wrapper h5,
        .zenithV4_landing_wrapper h6,
        .zenithV4_landing_wrapper p,
        .zenithV4_landing_wrapper span,
        .zenithV4_landing_wrapper a,
        .zenithV4_landing_wrapper button,
        .zenithV4_landing_wrapper li,
        .zenithV4_landing_wrapper small,
        .zenithV4_landing_wrapper strong,
        .zenithV4_landing_wrapper em {
            font-family: "Montserrat", sans-serif !important;
        }
        .zenithV4_landing_wrapper::before {
            content: '';
            position: fixed;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(1200px 800px at 75% 10%, rgba(214, 164, 120, 0.08), transparent 60%),
              radial-gradient(900px 600px at 10% 30%, rgba(181, 107, 107, 0.06), transparent 55%),
              repeating-linear-gradient(125deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 6px);
            opacity: 0.9;
            z-index: 0;
        }
        
        .zenithV4_landing_wrapper * { box-sizing: border-box; }

        /* ... (rest of CSS) ... */

        /* --- UTILITIES --- */
        .zenithV4_btn {
            display: inline-block;
            padding: 1rem 2.5rem;
            border: 1px solid var(--zenithV4_text);
            color: var(--zenithV4_text);
            text-transform: uppercase;
            text-decoration: none;
            font-family: var(--zenithV4_font_body);
            letter-spacing: 0.1em;
            font-size: 0.8rem;
            position: relative;
            overflow: hidden;
            transition: all 0.4s;
            background: transparent;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            white-space: nowrap;
        }
        .zenithV4_btn::before {
            content: ''; position: absolute; top: 0; left: 0; width: 0%; height: 100%;
            background: var(--zenithV4_text); transition: width 0.4s cubic-bezier(0.77, 0, 0.175, 1); z-index: -1;
        }
        .zenithV4_btn:hover { color: var(--zenithV4_bg); }
        .zenithV4_btn:hover::before { width: 100%; }
        
        .zenithV4_btn.primary {
            background: var(--zenithV4_accent); border-color: var(--zenithV4_accent); color: #000;
            box-shadow: 0 20px 40px rgba(214, 164, 120, 0.25);
        }
        .zenithV4_btn.primary:hover { background: #fff; color: #000; }
        .zenithV4_btn:hover { transform: translateY(-2px); }

        /* --- SIDEBAR --- */
        .zenithV4_sidebar_landing {
            position: fixed; top: 0; left: 0; height: 100vh; width: 80px;
            border-right: 1px solid var(--zenithV4_border);
            display: flex; flex-direction: column; justify-content: space-between; align-items: center;
            padding: 2rem 0; z-index: 1000; background: var(--zenithV4_bg);
        }
        .zenithV4_brand {
            writing-mode: vertical-rl; transform: rotate(180deg);
            font-family: var(--zenithV4_font_head); font-size: 1.5rem; letter-spacing: 0.1em;
            color: var(--zenithV4_accent); text-decoration: none;
        }
        .zenithV4_menu_icon {
            width: 30px; height: 20px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer;
        }
        .zenithV4_menu_icon span {
            width: 100%; height: 1px; background: var(--zenithV4_text); transition: all 0.3s;
        }
        .zenithV4_menu_icon:hover span:nth-child(1) { width: 50%; align-self: flex-end; }
        .zenithV4_menu_icon:hover span:nth-child(3) { width: 75%; align-self: flex-end; }

        /* --- HERO --- */
        .zenithV4_hero {
            height: 100vh; width: 100%; display: grid; grid-template-columns: 1fr 1.5fr;
            padding-left: 80px; position: relative; overflow: hidden;
        }
        .zenithV4_mobile_hero_bg {
            display: none;
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
        }
        .zenithV4_mobile_hero_overlay {
            display: none;
            position: absolute;
            inset: 0;
            z-index: 1;
            background:
              radial-gradient(240px 240px at 80% 15%, rgba(0,0,0,0.6), transparent 60%),
              linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.45));
            pointer-events: none;
        }
        .zenithV4_hero_text {
            position: relative;
            z-index: 2;
        }
        .zenithV4_hero_text {
            display: flex; flex-direction: column; justify-content: center; padding: 0 4rem; z-index: 10;
        }
        .zenithV4_eyebrow {
            font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.3em;
            color: var(--zenithV4_accent_sec); margin-bottom: 2rem; display: block;
        }
        .zenithV4_display_title {
            font-family: var(--zenithV4_font_body), sans-serif !important;
            font-size: 6vw; line-height: 0.95; margin-bottom: 2rem;
            font-weight: 700; letter-spacing: 0.01em;
        }
        .zenithV4_display_title span {
            display: block; margin-left: 2rem; color: var(--zenithV4_accent); font-style: normal;
            font-family: "Poppins", var(--zenithV4_font_body), sans-serif !important;
        }
        .zenithV4_hero_visual {
            position: relative; height: 100%; background: radial-gradient(circle at 70% 50%, #1f2e2a, var(--zenithV4_bg));
            display: flex; align-items: center; justify-content: center;
        }
        .zenithV4_hero_visual::after {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(60% 60% at 60% 40%, transparent, rgba(0,0,0,0.6));
            pointer-events: none;
        }
        .zenithV4_portal {
            width: 60%; height: 70%; background: #000; border-radius: 200px 200px 0 0;
            position: relative; overflow: hidden; box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255,255,255,0.08);
        }
        .zenithV4_portal_media {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
        }
        .zenithV4_portal::before {
            content: '';
            position: absolute;
            inset: 10px;
            border-radius: 180px 180px 0 0;
            border: 1px solid rgba(214, 164, 120, 0.25);
            box-shadow: inset 0 0 60px var(--zenithV4_glow);
            pointer-events: none;
            z-index: 2;
        }
        .zenithV4_float_card {
            position: absolute; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1); padding: 1rem; width: 200px; z-index: 20; color: #fff; font-size: 0.8rem;
            box-shadow: var(--zenithV4_shadow);
        }
        .zenithV4_fc_1 { top: 20%; left: -50px; }
        .zenithV4_fc_2 { bottom: 25%; right: 50px; text-align: right; }

        /* --- HORIZONTAL SCROLL --- */
        .zenithV4_scroll_section {
            position: relative; height: 300vh; padding-left: 80px; z-index: 10;
        }
        .zenithV4_sticky_wrapper {
            position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; align-items: center; width: 100%;
        }
        .zenithV4_track {
            display: flex; gap: 5vw; padding-left: 10vw; padding-right: 10vw;
        }
        .zenithV4_feature_panel {
            min-width: 60vw; height: 60vh; background: var(--zenithV4_surface);
            border: 1px solid var(--zenithV4_border); padding: 3rem;
            position: relative; display: flex; flex-direction: column; justify-content: space-between;
            box-shadow: var(--zenithV4_shadow);
            background-image: linear-gradient(135deg, rgba(255,255,255,0.03), transparent 60%);
            overflow: hidden;
        }
        .zenithV4_panel_media {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }
        .zenithV4_panel_media::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.65));
            z-index: 2;
        }
        .zenithV4_panel_media img {
            object-fit: cover;
        }
        .zenithV4_panel_content {
            position: relative;
            z-index: 3;
        }
        @media (min-width: 1025px) {
            .zenithV4_panel_content {
                margin-top: auto;
                margin-bottom: auto;
            }
        }
        .zenithV4_num {
            font-family: var(--zenithV4_font_head); font-size: 6rem; color: rgba(255, 255, 255, 0.05);
            position: absolute; top: 1rem; right: 2rem;
        }
        .zenithV4_panel_title {
            font-family: var(--zenithV4_font_head); font-size: 3rem; color: var(--zenithV4_accent); margin-bottom: 0.75rem; line-height: 1.05;
        }
        .zenithV4_panel_desc {
            font-size: 1.2rem; color: var(--zenithV4_text_dim); max-width: 500px;
        }

        /* --- GRID --- */
        .zenithV4_eco {
            padding: 10rem 4rem 10rem calc(80px + 4rem); background: var(--zenithV4_surface);
        }
        .zenithV4_head_title {
            font-family: var(--zenithV4_font_head); font-size: 4rem; text-align: center; margin-bottom: 4rem;
        }
        .zenithV4_bento_grid {
            display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: 300px; gap: 1.5rem;
        }
        .zenithV4_bento_item {
            background: var(--zenithV4_bg); border: 1px solid var(--zenithV4_border); padding: 2rem;
            display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden;
            transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease;
            box-shadow: 0 15px 40px rgba(0,0,0,0.25);
        }
        .zenithV4_bento_item:hover {
            transform: translateY(-6px);
            box-shadow: 0 30px 60px rgba(0,0,0,0.35);
            border-color: rgba(214, 164, 120, 0.35);
        }
        .zenithV4_hero_meta {
            display: flex;
            gap: 2rem;
            margin-top: 2.5rem;
            font-size: 0.85rem;
            color: var(--zenithV4_text_dim);
            text-transform: uppercase;
            letter-spacing: 0.18em;
        }
        .zenithV4_hero_meta span {
            position: relative;
            padding-left: 1.2rem;
        }
        .zenithV4_hero_meta span::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0.4rem;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--zenithV4_accent);
            box-shadow: 0 0 10px var(--zenithV4_glow);
        }
        
        /* Mobile overrides */
        @media (max-width: 1024px) {
            .zenithV4_sidebar_landing { display: none; }
            .zenithV4_hero { grid-template-columns: 1fr; padding-left: 0; }
            .zenithV4_hero_text { padding: 2rem; align-items: center; text-align: center; }
            .zenithV4_display_title { font-size: 15vw; }
            .zenithV4_display_title span { margin-left: 0; }
            .zenithV4_portal { width: 90%; height: 50vh; }
            .zenithV4_scroll_section { display: block; height: 220vh; padding-left: 0; } /* Enable horizontal scroll on mobile */
            .zenithV4_sticky_wrapper { padding: 0 1rem; }
            .zenithV4_track { gap: 6vw; padding-left: 4vw; padding-right: 4vw; }
            .zenithV4_feature_panel { min-width: 80vw; height: 50vh; padding: 2rem; }
            .zenithV4_bento_grid { grid-template-columns: 1fr; }
            .zenithV4_eco { padding: 4rem 2rem; }
            .zenithV4_hero_meta { flex-direction: column; gap: 0.6rem; align-items: center; }
            .zenithV4_section_head { text-align: center; }
            .zenithV4_head_title { font-size: 2.5rem; }
            .zenithV4_eco .zenithV4_bento_item { grid-column: span 12 !important; }
            .zenithV4_eco .zenithV4_bento_grid { grid-auto-rows: auto; }
            .zenithV4_mobile_cta { flex-direction: column; align-items: flex-start; gap: 1rem; }
            .zenithV4_mobile_cta .zenithV4_btn { width: 100%; text-align: center; }
            footer { padding: 4rem 2rem; flex-direction: column; gap: 2rem; align-items: flex-start; }
            footer nav { width: 100%; justify-content: center; flex-wrap: wrap; }
            footer nav a { text-align: center; }
            footer > div { width: 100%; }
            footer > div p { text-align: center; width: 100%; }
            .zenithV4_mobile_hero_bg { display: block; }
            .zenithV4_mobile_hero_overlay { display: block; }
            .zenithV4_hero_visual { display: none; }
            .zenithV4_btn { font-size: 0.75rem; padding: 0.9rem 1.4rem; }
        }
        
        /* Show fallback for mobile scroll */
        .zenithV4_mobile_features { display: none; padding: 4rem 2rem; }
        @media (max-width: 1024px) { .zenithV4_mobile_features { display: none; } }
      `}</style>

      {/* --- STRUCTURE --- */}

      {/* 1. Sidebar */}
      <aside className="zenithV4_sidebar_landing">
        <Link href="/" className="zenithV4_brand" style={{ writingMode: 'unset', transform: 'none', padding: '0 10px' }}>
          <Image
            src="/lovask_wordmark_logo_svg.svg"
            alt="Lovask"
            width={71}
            height={21}
            className="w-full h-auto object-contain"
            style={{ transform: 'rotate(90deg)' }}
            priority
          />
        </Link>
        <div className="zenithV4_menu_icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </aside>

      {/* 2. Hero Section */}
      <section className="zenithV4_hero">
        <video
          src="/zenith/hero-dark-mobile.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="zenithV4_mobile_hero_bg"
        />
        <div className="zenithV4_mobile_hero_overlay" />
        <div className="zenithV4_hero_text">
          <span className="zenithV4_eyebrow">Yeni Nesil Premium</span>
          <h1 className="zenithV4_display_title" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 600 }}>
            Dijital <span>Zarafet</span>
          </h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            {user ? (
              <>
                <Link href="/store/premium" className="zenithV4_btn primary">PREMIUM AYRICALIKLAR</Link>
                <Link href="/profile" className="zenithV4_btn">PROFİLİME GİT</Link>
              </>
            ) : (
              <>
                <Link href="/register" className="zenithV4_btn primary">ÖZEL DAVETİ AL</Link>
                <Link href="/login" className="zenithV4_btn">ÜYE GİRİŞİ</Link>
              </>
            )}
          </div>
          <div className="zenithV4_hero_meta">
            <span>Seçkin Üyeler</span>
            <span>Doğrulanmış Profiller</span>
            <span>Özel Davetler</span>
          </div>
        </div>

        <div className="zenithV4_hero_visual">
          <div className="zenithV4_portal">
            <video
              src="/zenith/hero-dark-mobile.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="zenithV4_portal_media"
              style={{ opacity: 0.85 }}
            />
          </div>

          <motion.div
            className="zenithV4_float_card zenithV4_fc_1"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div style={{ fontSize: '1.6rem', color: 'var(--zenithV4_accent)', lineHeight: 1, marginBottom: '0.4rem' }}>01</div>
            <div style={{ letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>Yeni Eşleşme</div>
            <div style={{ fontSize: '0.95rem', lineHeight: 1.4, marginTop: '0.4rem' }}>Elara profilini beğendi.</div>
          </motion.div>

          <motion.div
            className="zenithV4_float_card zenithV4_fc_2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <span style={{ color: 'var(--zenithV4_accent)', fontSize: '1.5rem', display: 'block' }}>%98</span>
            Uyum
          </motion.div>
        </div>
      </section>

      {/* 3. Horizontal Scroll Section (Desktop) */}
      <section ref={scrollRef} className="zenithV4_scroll_section">
        <div className="zenithV4_sticky_wrapper">
          <motion.div style={{ x }} className="zenithV4_track">

            {/* Panel 1 */}
            <div className="zenithV4_feature_panel">
              <span className="zenithV4_num">01</span>
              <div className="zenithV4_panel_media">
                <Image src="https://images.pexels.com/photos/30794941/pexels-photo-30794941.jpeg?cs=srgb&dl=pexels-photo-30794941.jpg&fm=jpg" alt="One" fill />
              </div>
              <div className="zenithV4_panel_content">
                <h3 className="zenithV4_panel_title">Özenle Seçilmiş Bağlar</h3>
                <p className="zenithV4_panel_desc">Algoritmamız sadece eşleştirme yapmaz, anlamlı hikâyeler kurar.</p>
              </div>
            </div>

            {/* Panel 2 */}
            <div className="zenithV4_feature_panel">
              <span className="zenithV4_num">02</span>
              <div className="zenithV4_panel_media">
                <Image src="https://images.pexels.com/photos/2064058/pexels-photo-2064058.jpeg?cs=srgb&dl=pexels-photo-2064058.jpg&fm=jpg" alt="Two" fill />
              </div>
              <div className="zenithV4_panel_content">
                <h3 className="zenithV4_panel_title">Anlık Etkileşim</h3>
                <p className="zenithV4_panel_desc">Gecikmesiz akış, net ve doğal iletişim.</p>
              </div>
            </div>

            {/* Panel 3 */}
            <div className="zenithV4_feature_panel">
              <span className="zenithV4_num">03</span>
              <div className="zenithV4_panel_media">
                <Image src="https://images.pexels.com/photos/5717044/pexels-photo-5717044.jpeg?cs=srgb&dl=pexels-photo-5717044.jpg&fm=jpg" alt="Three" fill />
              </div>
              <div className="zenithV4_panel_content">
                <h3 className="zenithV4_panel_title">Seçkin Ekosistem</h3>
                <p className="zenithV4_panel_desc">Doğrulanmış rozetler, öncelikli görünürlük ve özel etkinlikler.</p>
              </div>
            </div>

            {/* Panel 4 - CTA */}
            <div className="zenithV4_feature_panel" style={{ background: 'var(--zenithV4_accent)', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <h3 className="zenithV4_panel_title" style={{ color: '#000', fontSize: '4rem' }}>{user ? 'Aramıza Dön' : 'Şimdi Katıl'}</h3>
              <Link href={user ? "/swipe" : "/register"} style={{ marginTop: '2rem', border: '1px solid #000', padding: '1rem 2rem', color: '#000', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user ? 'Keşfetmeye Başla' : 'Yolculuğa Başla'}</Link>
            </div>

          </motion.div>
        </div>
      </section>

      {/* 3b. Mobile Features (Simplified) */}
      <div className="zenithV4_mobile_features">
        {['Özenle Seçilmiş Bağlar', 'Anlık Etkileşim', 'Seçkin Ekosistem'].map((t, i) => (
          <div key={i} style={{ marginBottom: '3rem' }}>
            <span style={{ fontFamily: 'var(--zenithV4_font_head)', fontSize: '2rem', color: 'var(--zenithV4_accent)' }}>0{i + 1}</span>
            <h3 style={{ fontFamily: 'var(--zenithV4_font_head)', fontSize: '1.8rem', margin: '0.5rem 0' }}>{t}</h3>
            <p style={{ color: 'var(--zenithV4_text_dim)' }}>Niyetli ve özenli bağlantılar için tasarlandı.</p>
          </div>
        ))}
      </div>

      {/* 4. Ecosystem Grid */}
      <section className="zenithV4_eco">
        <div className="zenithV4_section_head">
          <span className="zenithV4_eyebrow">Felsefe</span>
          <h2 className="zenithV4_head_title">Sadece <span style={{ color: 'var(--zenithV4_accent)', fontStyle: 'italic' }}>Seçkin</span></h2>
        </div>

        <div className="zenithV4_bento_grid">
          {/* 1 */}
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 6', gridRow: 'span 2' }}>
            <div style={{ zIndex: 10, position: 'relative' }}>
              <h3 className="zenithV4_panel_title" style={{ fontSize: '2rem' }}>Görsel Öncelik</h3>
              <p style={{ color: 'var(--zenithV4_text_dim)' }}>Yüksek kalite görseller ve estetik bütünlük.</p>
            </div>
            <Image src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?q=80&w=2938&auto=format&fit=crop" alt="Visual" fill style={{ objectFit: 'cover', opacity: 0.4 }} />
          </div>

          {/* 2 */}
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 3' }}>
            <div style={{ zIndex: 10, position: 'relative' }}>
              <h3 className="zenithV4_panel_title" style={{ fontSize: '1.5rem' }}>Doğrulanmış</h3>
              <p style={{ color: 'var(--zenithV4_text_dim)' }}>Sıkı kimlik doğrulama.</p>
            </div>
            <Image
              src="https://images.pexels.com/photos/2064058/pexels-photo-2064058.jpeg?cs=srgb&dl=pexels-photo-2064058.jpg&fm=jpg"
              alt="Doğrulama"
              fill
              style={{ objectFit: 'cover', opacity: 0.25 }}
            />
          </div>

          {/* 3 */}
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 3', background: 'var(--zenithV4_surface_light)', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ zIndex: 10, position: 'relative' }}>
              <span style={{ fontSize: '3rem', fontFamily: 'var(--zenithV4_font_head)', color: 'var(--zenithV4_accent)' }}>4.9</span>
              <span className="zenithV4_eyebrow" style={{ marginBottom: 0 }}>Uygulama Puanı</span>
            </div>
            <Image
              src="https://images.pexels.com/photos/5717044/pexels-photo-5717044.jpeg?cs=srgb&dl=pexels-photo-5717044.jpg&fm=jpg"
              alt="Uygulama puanı"
              fill
              style={{ objectFit: 'cover', opacity: 0.18 }}
            />
          </div>

          {/* 4 */}
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ zIndex: 10, position: 'relative' }}>
                <h3 className="zenithV4_panel_title" style={{ fontSize: '1.5rem', marginBottom: '0' }}>Global Topluluk</h3>
                <p style={{ color: 'var(--zenithV4_text_dim)' }}>40+ Ülke</p>
              </div>
              <ArrowRight color="var(--zenithV4_accent)" />
            </div>
            <Image
              src="https://images.pexels.com/photos/30794941/pexels-photo-30794941.jpeg?cs=srgb&dl=pexels-photo-30794941.jpg&fm=jpg"
              alt="Global topluluk"
              fill
              style={{ objectFit: 'cover', opacity: 0.22 }}
            />
          </div>
        </div>
      </section>

      {/* 4b. Additional Features */}
      <section className="zenithV4_eco" style={{ paddingTop: '0' }}>
        <div className="zenithV4_section_head">
          <span className="zenithV4_eyebrow">Özellikler</span>
          <h2 className="zenithV4_head_title">Daha Derin <span style={{ color: 'var(--zenithV4_accent)', fontStyle: 'italic' }}>Deneyim</span></h2>
        </div>

        <div className="zenithV4_bento_grid" style={{ gridAutoRows: '220px' }}>
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 4' }}>
            <h3 className="zenithV4_panel_title" style={{ fontSize: '1.4rem' }}>Gizli Mod</h3>
            <p style={{ color: 'var(--zenithV4_text_dim)' }}>Görünürlüğünü kontrol et, istediğin anda görünür ol.</p>
          </div>
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 4' }}>
            <h3 className="zenithV4_panel_title" style={{ fontSize: '1.4rem' }}>Öncelikli Keşif</h3>
            <p style={{ color: 'var(--zenithV4_text_dim)' }}>Profilin seçkin havuzda daha üst sıralarda.</p>
          </div>
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 4' }}>
            <h3 className="zenithV4_panel_title" style={{ fontSize: '1.4rem' }}>Akıllı Filtreler</h3>
            <p style={{ color: 'var(--zenithV4_text_dim)' }}>Uygun eşleşmeleri net tercihlerle bul.</p>
          </div>
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 6' }}>
            <h3 className="zenithV4_panel_title" style={{ fontSize: '1.4rem' }}>Özel Etkinlikler</h3>
            <p style={{ color: 'var(--zenithV4_text_dim)' }}>Seçkin buluşmalar, kapalı davetler ve premium etkinlikler.</p>
          </div>
          <div className="zenithV4_bento_item" style={{ gridColumn: 'span 6' }}>
            <h3 className="zenithV4_panel_title" style={{ fontSize: '1.4rem' }}>Doğrulama Rozetleri</h3>
            <p style={{ color: 'var(--zenithV4_text_dim)' }}>Güvenli ve şeffaf bir topluluk için doğrulanmış üyeler.</p>
          </div>
        </div>
      </section>

      {/* 4c. Mobile App Download */}
      <section className="zenithV4_eco" style={{ paddingTop: '2rem' }}>
        <div className="zenithV4_section_head" style={{ textAlign: 'left', maxWidth: '900px', margin: '0 auto 3rem auto' }}>
          <span className="zenithV4_eyebrow">Mobil Uygulama</span>
          <h2 className="zenithV4_head_title" style={{ textAlign: 'left' }}>
            Her An <span style={{ color: 'var(--zenithV4_accent)', fontStyle: 'italic' }}>Yanında</span>
          </h2>
          <p style={{ color: 'var(--zenithV4_text_dim)', fontSize: '1.1rem', marginTop: '1rem' }}>
            Android uygulamamızı indir, seçkin bağlantılara her an eriş.
          </p>
        </div>
        <div className="zenithV4_mobile_cta" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', maxWidth: '900px', margin: '0 auto' }}>
          <Link href="#" className="zenithV4_btn primary">Google Play’den İndir</Link>
          <span style={{ color: 'var(--zenithV4_text_dim)', fontSize: '0.9rem' }}>iOS yakında</span>
        </div>
      </section>

      {/* 5. Footer */}
      <footer style={{ padding: '6rem calc(80px + 4rem)', background: '#050807', borderTop: '1px solid var(--zenithV4_border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <nav style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
            {['Hakkında', 'İletişim', 'Gizlilik', 'Şartlar'].map(t => (
              <Link key={t} href="#" style={{ color: 'var(--zenithV4_text)', textDecoration: 'none', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>{t}</Link>
            ))}
          </nav>
          <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>� {new Date().getFullYear()} Lovask Inc.</p>
        </div>
        <div style={{ width: '40%', maxWidth: '300px' }}>
          <Image
            src="/lovask_wordmark_logo_svg.svg"
            alt="Lovask"
            width={133}
            height={45}
            className="w-full h-auto opacity-20 grayscale brightness-200"
          />
        </div>
      </footer>

    </div>
  )
}

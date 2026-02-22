/**
 * Zenith V4 - Universal Engine
 * Handles logic for both Landing Page (visuals) and Web App (functionality).
 * Namespace: window.zenithV4_Engine
 */

(function () {
    'use strict';

    window.zenithV4_Engine = {
        init: function () {
            // Detect mode based on body class or element presence
            if (document.querySelector('.zenithV4_scroll_section')) {
                this.initLanding();
            }
            if (document.querySelector('.zenithV4_app_wrapper')) {
                this.initApp();
            }
            console.log('Zenith V4 Universal Engine: Online');
        },

        /* --- LANDING LOGIC --- */
        initLanding: function () {
            this.handleHorizontalScroll();
            this.handleHeroParallax();
            this.handleAccordions();
            this.handleMenu();
        },

        handleHorizontalScroll: function () {
            if (window.innerWidth < 1024) return;
            const section = document.querySelector('.zenithV4_scroll_section');
            const track = document.querySelector('.zenithV4_track');
            if (!section || !track) return;

            window.addEventListener('scroll', () => {
                const rect = section.getBoundingClientRect();
                const sectionTop = rect.top;
                const sectionHeight = rect.height;
                const windowHeight = window.innerHeight;

                if (sectionTop <= 0 && sectionTop > -(sectionHeight - windowHeight)) {
                    const distance = -sectionTop;
                    const maxDistance = sectionHeight - windowHeight;
                    const progress = distance / maxDistance;
                    const moveAmount = progress * (track.scrollWidth - window.innerWidth + 100);
                    track.style.transform = `translateX(-${moveAmount}px)`;
                }
            });
        },

        handleHeroParallax: function () {
            const portal = document.querySelector('.zenithV4_portal img');
            if (!portal) return;
            window.addEventListener('scroll', () => {
                const scrolled = window.scrollY;
                if (scrolled < window.innerHeight) {
                    portal.style.transform = `translateY(${scrolled * 0.2}px)`;
                }
            });
        },

        handleAccordions: function () {
            const questions = document.querySelectorAll('.zenithV4_faq_q');
            questions.forEach(q => {
                q.addEventListener('click', () => {
                    const answer = q.nextElementSibling;
                    if (answer.style.maxHeight) {
                        answer.style.maxHeight = null;
                    } else {
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                    }
                });
            });
        },

        handleMenu: function () {
            const icon = document.querySelector('.zenithV4_menu_icon');
            const menu = document.querySelector('.zenithV4_menu_overlay');
            const close = document.querySelector('.zenithV4_close_menu');

            if (!icon || !menu) return;

            icon.addEventListener('click', () => {
                menu.classList.add('active');
                document.body.style.overflow = 'hidden';
            });

            if (close) {
                close.addEventListener('click', () => {
                    menu.classList.remove('active');
                    document.body.style.overflow = 'auto';
                });
            }
        },

        /* --- APP LOGIC --- */
        initApp: function () {
            this.setupNavigation();
            this.setupSwipeLogic();
            this.setupChat();
        },

        setupNavigation: function () {
            const navItems = document.querySelectorAll('.zenithV4_nav_item');
            const pages = document.querySelectorAll('.zenithV4_page');

            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const targetId = item.getAttribute('data-target');
                    if (!targetId) return; // logout button might not have target page

                    navItems.forEach(n => n.classList.remove('active'));
                    item.classList.add('active');

                    pages.forEach(p => {
                        p.classList.remove('active');
                        if (p.id === targetId) {
                            p.classList.add('active');
                            if (p.id === 'page-discover' && typeof window.initGalaxyDiscovery === 'function') {
                                setTimeout(window.initGalaxyDiscovery, 100);
                            }
                        }
                    });

                    const main = document.querySelector('.zenithV4_main');
                    if (main) main.scrollTop = 0;
                });
            });
        },

        setupSwipeLogic: function () {
            const btnNope = document.querySelector('.btn-nope');
            const btnLike = document.querySelector('.btn-like');

            // Central Handler for Swipe Actions
            this.handleSwipeAction = (action) => {
                const cards = document.querySelectorAll('.zenithV4_swipe_card');
                if (cards.length === 0) return;
                const card = cards[cards.length - 1]; // Top card
                const uid = card.getAttribute('data-uid');

                // Visual Animation
                let moveX = (action === 'pass') ? -window.innerWidth : window.innerWidth;
                let rot = (action === 'pass') ? -20 : 20;

                if (action === 'super_like') {
                    // Fly Up
                    card.style.transition = 'transform 0.5s ease, opacity 0.5s';
                    card.style.transform = 'translateY(-150%) scale(0.8) rotate(5deg)';
                    card.style.opacity = '0';
                } else {
                    // Side Swipe
                    card.style.transition = 'transform 0.4s ease, opacity 0.4s';
                    card.style.transform = `translateX(${moveX}px) rotate(${rot}deg)`;
                    card.style.opacity = '0';
                }

                // Backend Request
                const fd = new FormData();
                fd.append('action', action);
                fd.append('target_id', uid);

                fetch('ajax/swipe_action.php', { method: 'POST', body: fd })
                    .then(r => r.json())
                    .then(res => {
                        let isError = false;
                        if (res.status === 'error') {
                            isError = true;
                            // Revert Card Visuals
                            card.style.transition = 'none';
                            card.style.transform = 'none';
                            card.style.opacity = '1';

                            if (res.code === 'limit_reached') {
                                window.showZenithNotification("Günlük beğeni limitiniz doldu! Premium'a geçin.", 'premium');
                            } else if (res.code === 'premium_required') {
                                window.showZenithNotification("Bu özellik sadece Premium üyeler içindir.", 'premium');
                            } else {
                                window.showZenithNotification(res.message || "Bir hata oluştu.", 'error');
                            }
                        }

                        if (!isError) {
                            // Helper to remove card from DOM after visual exit
                            setTimeout(() => {
                                if (card.parentNode) card.remove();
                                // Check if no cards left
                                if (document.querySelectorAll('.zenithV4_swipe_card').length === 0) {
                                    location.reload();
                                }
                            }, 400);

                            if (res.match) {
                                window.showZenithNotification("✨ TEBRİKLER! BİR EŞLEŞME YAKALADIN! ✨", 'success');
                            }
                        }
                    })
                    .catch(err => {
                        console.error('Swipe Error:', err);
                        card.style.transition = 'none';
                        card.style.transform = 'none';
                        card.style.opacity = '1';
                    });
            };

            if (btnNope) btnNope.onclick = () => this.handleSwipeAction('pass');
            if (btnLike) btnLike.onclick = () => this.handleSwipeAction('like');
        },

        setupChat: function () {
            const input = document.querySelector('.zenithV4_input');
            const thread = document.querySelector('.zenithV4_msg_thread');
            const sendBtn = document.querySelector('.zenithV4_send_btn');

            const sendMsg = () => {
                if (!input || !input.value.trim()) return;

                const msgDiv = document.createElement('div');
                msgDiv.className = 'zenithV4_msg sent';
                msgDiv.innerText = input.value;
                thread.appendChild(msgDiv);
                thread.scrollTop = thread.scrollHeight;
                input.value = '';

                setTimeout(() => {
                    const replyDiv = document.createElement('div');
                    replyDiv.className = 'zenithV4_msg received';
                    replyDiv.innerText = "Kesinlikle katılıyorum.";
                    thread.appendChild(replyDiv);
                    thread.scrollTop = thread.scrollHeight;
                }, 1500);
            };

            if (sendBtn) sendBtn.addEventListener('click', sendMsg);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') sendMsg();
                });
            }
        }
    };

    // Global Notification System
    window.showZenithNotification = function (message, type = 'info') {
        const notif = document.getElementById('zenithNotification');
        const icon = document.getElementById('zenithNotifIcon');
        const title = document.getElementById('zenithNotifTitle');
        const text = document.getElementById('zenithNotifText');

        if (!notif) return console.log('Notification:', message); // Fallback

        text.textContent = message;

        // Reset styles
        icon.style.color = '#fff';
        notif.style.border = '1px solid rgba(255,255,255,0.08)';

        if (type === 'error') {
            title.textContent = 'HATA';
            title.style.color = '#ef4444';
            icon.textContent = '⚠️';
            icon.style.color = '#ef4444';
            notif.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        } else if (type === 'success') {
            title.textContent = 'BAŞARILI';
            title.style.color = '#10b981';
            icon.textContent = '✨';
            icon.style.color = '#D4AF37';
            notif.style.border = '1px solid rgba(212, 175, 55, 0.3)';
        } else if (type === 'premium') {
            title.textContent = 'PREMIUM';
            title.style.color = '#3b82f6';
            icon.textContent = '💎';
            icon.style.color = '#3b82f6';
            notif.style.border = '1px solid rgba(59, 130, 246, 0.3)';
        } else {
            title.textContent = 'BİLGİ';
            title.style.color = '#fff';
            icon.textContent = 'ℹ️';
        }

        notif.style.opacity = '1';
        notif.style.transform = 'translateX(-50%) translateY(0)';

        if (window.zenithNotifTimeout) clearTimeout(window.zenithNotifTimeout);
        window.zenithNotifTimeout = setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(-50%) translateY(-150px)';
        }, 3500);
    };

    // Global Actions for Swipe UI (Integrated)
    window.undoLastSwipe = function () {
        const btn = document.querySelector('.btn-rewind');
        if (btn) {
            btn.style.transition = 'transform 0.5s ease';
            btn.style.transform = 'rotate(-360deg)';
            setTimeout(() => { btn.style.transform = 'none'; btn.style.transition = ''; }, 500);
        }

        const fd = new FormData();
        fd.append('action', 'rewind');

        fetch('ajax/swipe_action.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(res => {
                if (res.status === 'success') {
                    window.showZenithNotification("Son işlem geri alındı.", 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    if (res.code === 'premium_required') {
                        window.showZenithNotification("Geri alma özelliği Premium üyeler içindir.", 'premium');
                    } else {
                        window.showZenithNotification(res.message || "Geri alınacak işlem yok.", 'error');
                    }
                }
            })
            .catch(console.error);
    };

    window.sendSuperLike = function () {
        if (window.zenithV4_Engine && window.zenithV4_Engine.handleSwipeAction) {
            window.zenithV4_Engine.handleSwipeAction('super_like');
        } else {
            console.warn("Zenith Engine not fully ready.");
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.zenithV4_Engine.init());
    } else {
        window.zenithV4_Engine.init();
    }
})();

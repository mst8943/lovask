'use client';

import React from 'react';

interface LoadingSplashProps {
    fullScreen?: boolean;
    text?: string;
}

/**
 * Full-screen loading splash — pixel-identical to /logo/loading_splash.html.
 * All CSS is self-contained (inline <style> tag) so it works on web, mobile,
 * and PWA regardless of Tailwind JIT or CSS cascade issues.
 */
export default function LoadingSplash({
    fullScreen = true,
    text = 'LOVASK',
}: LoadingSplashProps) {
    const css = `
        .ls-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background-color: #121214;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            font-family: 'Inter', -apple-system, sans-serif;
        }
        .ls-container {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .ls-glow {
            position: absolute;
            width: 250px;
            height: 250px;
            background: radial-gradient(circle, rgba(217,28,92,0.15) 0%, rgba(18,18,20,0) 70%);
            border-radius: 50%;
            z-index: 0;
            animation: ls-pulse-glow 3s ease-in-out infinite alternate;
        }
        .ls-ring {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            position: relative;
            z-index: 1;
            border: 2px solid rgba(255,255,255,0.05);
            background: conic-gradient(from 0deg, transparent 60%, #D4AF37 90%, #D91C5C 100%);
            -webkit-mask: radial-gradient(transparent 58px, #000 59px);
            mask: radial-gradient(transparent 58px, #000 59px);
            animation: ls-spin 1.5s linear infinite;
        }
        .ls-icon {
            position: absolute;
            z-index: 2;
            width: 50px;
            height: 50px;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: ls-heartbeat 2s infinite cubic-bezier(0.215, 0.610, 0.355, 1.000);
        }
        .ls-heart {
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #D91C5C, #75225E);
            position: relative;
            transform: rotate(-45deg);
            box-shadow: 0 4px 20px rgba(217,28,92,0.4);
            border-radius: 4px 4px 4px 8px;
        }
        .ls-heart::before,
        .ls-heart::after {
            content: "";
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #D91C5C, #75225E);
            border-radius: 50%;
            position: absolute;
        }
        .ls-heart::before {
            top: -15px;
            left: 0;
        }
        .ls-heart::after {
            left: 15px;
            top: 0;
            background: linear-gradient(135deg, #75225E, #D91C5C);
        }
        .ls-text {
            margin-top: 40px;
            color: white;
            font-size: 24px;
            font-weight: 200;
            letter-spacing: 6px;
            z-index: 1;
            opacity: 0;
            animation: ls-fade-in 2s ease-out forwards;
            animation-delay: 0.5s;
            background: linear-gradient(90deg, #fff, #D4AF37);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        @keyframes ls-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        @keyframes ls-pulse-glow {
            0%   { transform: scale(0.9); opacity: 0.5; }
            100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes ls-heartbeat {
            0%   { transform: scale(0.95); }
            5%   { transform: scale(1.05); }
            10%  { transform: scale(0.95); }
            15%  { transform: scale(1.05); }
            50%  { transform: scale(0.95); }
            100% { transform: scale(0.95); }
        }
        @keyframes ls-fade-in {
            0%   { opacity: 0; transform: translateY(10px); }
            100% { opacity: 0.9; transform: translateY(0); }
        }
    `;

    const inner = (
        <>
            <style dangerouslySetInnerHTML={{ __html: css }} />
            <div className="ls-container">
                <div className="ls-glow" />
                <div className="ls-ring" />
                <div className="ls-icon">
                    <div className="ls-heart" />
                </div>
            </div>
            {text && <div className="ls-text">{text}</div>}
        </>
    );

    if (fullScreen) {
        return <div className="ls-overlay">{inner}</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {inner}
        </div>
    );
}

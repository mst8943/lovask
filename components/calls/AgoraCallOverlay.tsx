'use client'
import React, { useEffect, useRef, useState } from 'react'
import IAgoraRTC, {
    IAgoraRTCClient,
    IMicrophoneAudioTrack,
    ICameraVideoTrack,
    IRemoteAudioTrack,
    IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng'
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'
import { getProfileAvatar } from '@/utils/avatar'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

// Dynamically import Agora to avoid SSR issues
let AgoraRTC: typeof IAgoraRTC
if (typeof window !== 'undefined') {
    AgoraRTC = require('agora-rtc-sdk-ng').default
}

type AgoraCallOverlayProps = {
    callSession: {
        id: string
        call_type: 'voice' | 'video'
    }
    otherUser: {
        id: string
        display_name?: string | null
        photos?: string[] | string | null
    }
    onEnd: () => void
}

export default function AgoraCallOverlay({ callSession, otherUser, onEnd }: AgoraCallOverlayProps) {
    const [joined, setJoined] = useState(false)
    const [localTracks, setLocalTracks] = useState<{ audio?: IMicrophoneAudioTrack; video?: ICameraVideoTrack }>({})
    const [remoteUsers, setRemoteUsers] = useState<any[]>([])
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(callSession.call_type === 'voice')
    const [isFullScreen, setIsFullScreen] = useState(true)

    const clientRef = useRef<IAgoraRTCClient | null>(null)
    const localVideoRef = useRef<HTMLDivElement>(null)
    const remoteVideoRef = useRef<HTMLDivElement>(null)

    // Alert states
    const [alertConfig, setAlertConfig] = useState<{ open: boolean; title: string; message: string; variant: 'default' | 'danger' }>({
        open: false,
        title: '',
        message: '',
        variant: 'default'
    })

    const showAlert = (title: string, message: string, variant: 'default' | 'danger' = 'default') => {
        setAlertConfig({ open: true, title, message, variant })
    }

    useEffect(() => {
        if (!AgoraRTC) return

        const init = async () => {
            clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

            // Handle remote users
            clientRef.current.on('user-published', async (user, mediaType) => {
                await clientRef.current?.subscribe(user, mediaType)
                if (mediaType === 'video') {
                    setRemoteUsers((prev) => [...prev.filter(u => u.uid !== user.uid), user])
                }
                if (mediaType === 'audio') {
                    user.audioTrack?.play()
                }
            })

            clientRef.current.on('user-unpublished', (user) => {
                setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
            })

            try {
                // 1. Fetch token
                const res = await fetch('/api/calls/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callId: callSession.id }),
                })

                if (!res.ok) throw new Error('Failed to get call token')
                const { token, appId, channelName, uid } = await res.json()

                // 2. Join channel
                await clientRef.current.join(appId, channelName, token, uid)

                // 3. Create and publish local tracks
                let audioTrack: IMicrophoneAudioTrack | undefined
                let videoTrack: ICameraVideoTrack | undefined

                try {
                    audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
                    if (callSession.call_type === 'video') {
                        videoTrack = await AgoraRTC.createCameraVideoTrack()
                        videoTrack.play(localVideoRef.current!)
                    }
                } catch (deviceError: any) {
                    console.error('Device access error:', deviceError)
                    if (deviceError.name === 'NotFoundError') {
                        showAlert('Cihaz Bulunamadı', 'Mikrofon veya kamera bulunamadı. Lütfen cihazınızı kontrol edin.', 'danger')
                    } else if (deviceError.name === 'NotAllowedError') {
                        showAlert('İzin Gerekli', 'Kamera/Mikrofon izini reddedildi. Lütfen tarayıcı ayarlarından izin verin.')
                    } else {
                        showAlert('Bağlantı Hatası', 'Görüşme başlatılamadı: ' + (deviceError.message || 'Cihaz hatası'))
                    }
                    // We don't call onEnd immediately because the user needs to see the alert
                    return
                }

                setLocalTracks({ audio: audioTrack, video: videoTrack })

                if (videoTrack && audioTrack) {
                    await clientRef.current.publish([audioTrack, videoTrack])
                } else if (audioTrack) {
                    await clientRef.current.publish([audioTrack])
                }

                setJoined(true)
            } catch (err: any) {
                console.error('Agora init error:', err)
                if (err.message?.includes('token')) {
                    showAlert('Güvenlik Hatası', 'Arama anahtarı (token) oluşturulamadı. Lütfen tekrar deneyin.')
                } else {
                    onEnd()
                }
            }
        }

        init()

        return () => {
            localTracks.audio?.close()
            localTracks.video?.close()
            clientRef.current?.leave()
        }
    }, [callSession.id, callSession.call_type])

    // Effect to play remote video when user is added
    useEffect(() => {
        if (remoteUsers.length > 0 && remoteUsers[0].videoTrack) {
            remoteUsers[0].videoTrack.play(remoteVideoRef.current!)
        }
    }, [remoteUsers])

    const toggleMute = async () => {
        if (localTracks.audio) {
            await localTracks.audio.setEnabled(isMuted)
            setIsMuted(!isMuted)
        }
    }

    const toggleVideo = async () => {
        if (localTracks.video) {
            await localTracks.video.setEnabled(isVideoOff)
            setIsVideoOff(!isVideoOff)
        }
    }

    const avatarUrl = getProfileAvatar(otherUser)

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col bg-black transition-all duration-300 ${isFullScreen ? 'm-0' : 'm-4 rounded-3xl overflow-hidden shadow-2xl border border-white/10'}`}>
            {/* Background / Main View */}
            <div className="relative flex-1 bg-neutral-900 group">
                {/* Remote Video */}
                {callSession.call_type === 'video' && remoteUsers.length > 0 && (
                    <div ref={remoteVideoRef} className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Voice Call / No Remote Video Placeholder */}
                {(callSession.call_type === 'voice' || remoteUsers.length === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        <div className="relative w-32 h-32 mb-6 rounded-full overflow-hidden border-4 border-pink-500/30 animate-pulse">
                            <Image src={avatarUrl} alt={otherUser.display_name || ''} fill className="object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{otherUser.display_name}</h2>
                        <p className="text-white/60 animate-bounce">
                            {joined ? 'Bağlanıldı, konuşuluyor...' : 'Bağlanıyor...'}
                        </p>
                    </div>
                )}

                {/* Local Video (Picture-in-Picture) */}
                {callSession.call_type === 'video' && (
                    <div
                        ref={localVideoRef}
                        className={`absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 bg-black shadow-xl transition-all duration-500 z-10 ${isVideoOff ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                    />
                )}

                {/* Top Controls */}
                <div className="absolute top-6 left-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40"
                    >
                        {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </Button>
                </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="h-24 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-6 px-6 pb-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className={`h-14 w-14 rounded-full backdrop-blur-xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </Button>

                {callSession.call_type === 'video' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleVideo}
                        className={`h-14 w-14 rounded-full backdrop-blur-xl transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEnd}
                    className="h-16 w-16 rounded-full bg-red-600 text-white hover:bg-red-700 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-red-600/20"
                >
                    <PhoneOff size={28} />
                </Button>
            </div>

            {/* Minimalist Watermark */}
            <div className="absolute bottom-6 right-8 text-[10px] text-white/20 tracking-widest uppercase pointer-events-none">
                Lovask Secure Call
            </div>

            <ConfirmDialog
                open={alertConfig.open}
                title={alertConfig.title}
                description={alertConfig.message}
                variant={alertConfig.variant}
                confirmText="Anladım"
                cancelText="" // Hide cancel button
                onConfirm={() => {
                    setAlertConfig(prev => ({ ...prev, open: false }))
                    onEnd()
                }}
                onClose={() => {
                    setAlertConfig(prev => ({ ...prev, open: false }))
                    onEnd()
                }}
            />
        </div>
    )
}

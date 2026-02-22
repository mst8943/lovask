'use client'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ArrowRight, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { processImage } from '@/utils/imageUtils'
import Spinner from '@/components/ui/Spinner'

export default function StepPhotos() {
    const { data, updateData, setStep } = useOnboardingStore()
    const [uploading, setUploading] = useState(false)
    const supabase = createClient()

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        setUploading(true)
        const originalFile = e.target.files[0]
        try {
            // Process image: Resize/Crop to 3:4 and convert to WebP
            const processedFile = await processImage(originalFile)
            // Generate filename with .webp extension
            const fileName = `${Math.random().toString(36).substring(7)}.webp`
            const filePath = `${fileName}`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, processedFile, {
                    contentType: 'image/webp',
                    upsert: true
                })
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)
            updateData({ photos: [...data.photos, publicUrl] })
        } catch (error) {
            console.error('Error uploading image: ', error)
            alert('Fotoğraf yüklenirken bir hata oluştu.')
        } finally {
            setUploading(false)
        }
    }

    const removePhoto = (index: number) => {
        const newPhotos = [...data.photos]
        newPhotos.splice(index, 1)
        updateData({ photos: newPhotos })
    }

    const handleNext = () => {
        if (data.photos.length > 0) {
            setStep(3)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
        >
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                    En İyi Halini Göster<span className="text-pink-500">.</span>
                </h2>
                <p className="text-white/50 font-medium">Devam etmek için en az 1 fotoğraf yükle.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {data.photos.map((url, index) => (
                    <div key={url} className="relative aspect-[3/4] rounded-2xl overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10">
                        <Image
                            src={url}
                            alt="Profil"
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-3 right-3 h-8 w-8 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-red-500 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}

                {data.photos.length < 4 && (
                    <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {uploading ? (
                            <Spinner className="w-8 h-8 text-pink-500 animate-spin" />
                        ) : (
                            <div className="flex flex-col items-center space-y-3 z-10 transition-transform duration-300 group-hover:scale-110">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-pink-500/10 group-hover:text-pink-400 text-white/50 transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider group-hover:text-pink-400">
                                    Fotoğraf Ekle
                                </span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                )}
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-6 rounded-xl font-bold text-base transition-all duration-300 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Geri
                </button>
                <button
                    onClick={handleNext}
                    disabled={data.photos.length === 0}
                    className="flex-[2] py-6 rounded-xl font-bold text-base transition-all duration-300 bg-white text-black hover:bg-gray-100 hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                    Devam Et
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    )
}
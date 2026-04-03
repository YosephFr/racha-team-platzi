'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Camera, Image, X, Upload } from 'lucide-react'

export default function PhotoCapture({ onCapture, loading, label }) {
  const fileRef = useRef(null)
  const galleryRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function handleSubmit() {
    if (selectedFile && onCapture) onCapture(selectedFile)
  }

  function handleClear() {
    setPreview(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-3"
          >
            <label className="flex-1 flex flex-col items-center gap-2 py-6 rounded-2xl bg-surface border border-border border-dashed cursor-pointer hover:border-accent/30 transition-colors active:scale-[0.97]">
              <Camera size={24} className="text-accent" />
              <span className="text-xs font-medium text-muted">Camara</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <label className="flex-1 flex flex-col items-center gap-2 py-6 rounded-2xl bg-surface border border-border border-dashed cursor-pointer hover:border-accent/30 transition-colors active:scale-[0.97]">
              <Image size={24} className="text-violet" />
              <span className="text-xs font-medium text-muted">Galeria</span>
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="relative rounded-2xl overflow-hidden border border-border mb-3">
              <img
                src={preview}
                alt="Vista previa"
                className="w-full h-auto max-h-[280px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={handleClear}
                disabled={loading}
                className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted hover:text-danger transition-colors disabled:opacity-50 active:scale-90 shrink-0"
              >
                <X size={20} />
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl bg-accent text-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform"
              >
                {loading ? (
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/80 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/80 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/80 typing-dot" />
                  </div>
                ) : (
                  <>
                    <Upload size={16} />
                    {label || 'Enviar foto'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

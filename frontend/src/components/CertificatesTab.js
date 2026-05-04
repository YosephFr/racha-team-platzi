'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Award,
  Plus,
  Camera,
  Image,
  Upload,
  XCircle,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Calendar,
  BookOpen,
  Clock,
  GraduationCap,
  Trophy,
  Sparkles,
} from 'lucide-react'
import { api, getApiUrl } from '@/lib/api'
import { compressImage } from '@/lib/utils'
import UpdateBell from './UpdateBell'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

function ScannerOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl">
      <div
        className="absolute left-0 right-0 h-0.5 bg-violet shadow-[0_0_8px_rgba(135,48,245,0.6)]"
        style={{ animation: 'scanner-line 2s ease-in-out infinite' }}
      />
      <div className="absolute inset-0 bg-violet/5" />
    </div>
  )
}

function CertificateCard({ cert, onClick }) {
  const imageUrl = `${getApiUrl()}/uploads/${cert.image_path}`

  return (
    <motion.button
      {...fadeUp}
      onClick={onClick}
      className="card-base overflow-hidden text-left w-full active:scale-[0.97] transition-transform"
    >
      <div className="aspect-[4/3] bg-surface relative overflow-hidden">
        <img
          src={imageUrl}
          alt={cert.course_name || 'Certificado'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white text-xs font-semibold truncate drop-shadow-sm">
            {cert.course_name || 'Certificado'}
          </p>
        </div>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-muted truncate">
          {cert.completion_date || cert.created_at?.split('T')[0] || ''}
        </p>
      </div>
    </motion.button>
  )
}

function CertificateDetail({ cert, onBack, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const imageUrl = `${getApiUrl()}/uploads/${cert.image_path}`

  const fields = [
    { label: 'Curso', value: cert.course_name, icon: BookOpen },
    { label: 'Estudiante', value: cert.student_name, icon: GraduationCap },
    { label: 'Fecha', value: cert.completion_date, icon: Calendar },
    { label: 'Horas', value: cert.total_hours, icon: Clock },
    { label: 'Clases', value: cert.total_classes, icon: BookOpen },
    { label: 'Escuela', value: cert.school_name, icon: Award },
    { label: 'Instructor', value: cert.instructor_name, icon: GraduationCap },
    { label: 'ID', value: cert.certificate_id, icon: Award },
  ].filter((f) => f.value)

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    try {
      await api.deleteCertificate(cert.id)
      onDelete()
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted mb-4 active:opacity-60"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="card-base overflow-hidden mb-4">
        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img src={imageUrl} alt={cert.course_name || 'Certificado'} className="w-full h-auto" />
        </a>
      </div>

      <h2 className="font-heading text-lg mb-4">{cert.course_name || 'Certificado'}</h2>

      <div className="space-y-2 mb-4">
        {fields.map((f) => (
          <div key={f.label} className="card-base p-3 flex items-center gap-3">
            <f.icon size={16} className="text-violet shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted uppercase tracking-wide">{f.label}</p>
              <p className="text-sm text-foreground truncate">{f.value}</p>
            </div>
          </div>
        ))}
      </div>

      {cert.certificate_url && (
        <a
          href={cert.certificate_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-violet text-white font-semibold text-sm mb-3 active:scale-[0.97] transition-transform"
        >
          <ExternalLink size={16} /> Ver en Platzi
        </a>
      )}

      <button
        onClick={handleDelete}
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-medium transition-colors ${confirmDelete ? 'bg-danger text-white' : 'bg-surface text-muted hover:text-danger'}`}
      >
        <Trash2 size={14} />
        {confirmDelete ? 'Confirmar eliminar' : 'Eliminar certificado'}
      </button>
    </motion.div>
  )
}

export default function CertificatesTab() {
  const [view, setView] = useState('grid')
  const [certificates, setCertificates] = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCert, setSelectedCert] = useState(null)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const galleryRef = useRef(null)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api.getCertificates(), api.getCertificateRanking()])
      .then(([certs, rank]) => {
        setCertificates(certs.certificates || [])
        setRanking(rank.ranking || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  function clearUpload() {
    setPreview(null)
    setSelectedFile(null)
    setError('')
    setUploadResult(null)
    if (fileRef.current) fileRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  async function handleSubmit() {
    if (!selectedFile || processing) return
    setProcessing(true)
    setError('')

    try {
      const compressed = await compressImage(selectedFile)
      const data = await api.uploadCertificate(compressed)
      setUploadResult(data)
      loadData()
    } catch (err) {
      setError(err.message || 'Error al procesar el certificado')
    } finally {
      setProcessing(false)
    }
  }

  function handleOpenDetail(cert) {
    setSelectedCert(cert)
    setView('detail')
  }

  function handleBack() {
    setView('grid')
    setSelectedCert(null)
  }

  function handleDeleted() {
    setView('grid')
    setSelectedCert(null)
    loadData()
  }

  function startUpload() {
    setView('upload')
    clearUpload()
  }

  return (
    <div className="px-5 pt-6 pb-4 max-w-md lg:max-w-5xl mx-auto">
      <div className="bg-mesh" />

      <AnimatePresence mode="wait">
        {view === 'grid' && (
          <motion.div key="grid" {...fadeUp}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="font-heading text-xl">Certificados</h1>
                {certificates.length > 0 && (
                  <p className="text-xs text-muted mt-0.5">{certificates.length} obtenidos</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="lg:hidden">
                  <UpdateBell variant="floating" />
                </div>
                <button
                  onClick={startUpload}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-violet text-white text-sm font-semibold active:scale-[0.97] transition-transform"
                >
                  <Plus size={16} /> Subir
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card-base overflow-hidden">
                    <div className="aspect-[4/3] skeleton" />
                    <div className="p-3">
                      <div className="h-3 w-2/3 skeleton rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : certificates.length === 0 ? (
              <motion.div {...fadeUp} className="text-center pt-12">
                <div className="w-16 h-16 rounded-3xl bg-violet/10 flex items-center justify-center mx-auto mb-4">
                  <Award size={32} className="text-violet" />
                </div>
                <h2 className="font-heading text-lg mb-2">Sin certificados</h2>
                <p className="text-sm text-muted mb-6">
                  Subi tu primer certificado de Platzi para empezar tu coleccion
                </p>
                <button
                  onClick={startUpload}
                  className="px-8 py-3 rounded-2xl bg-violet text-white font-semibold text-sm active:scale-[0.97] transition-transform"
                >
                  Subir certificado
                </button>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {certificates.map((cert) => (
                    <CertificateCard
                      key={cert.id}
                      cert={cert}
                      onClick={() => handleOpenDetail(cert)}
                    />
                  ))}
                </div>
              </>
            )}

            {ranking.length > 1 && (
              <motion.section
                {...fadeUp}
                transition={{ delay: 0.1 }}
                className="card-base p-4 mt-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={16} className="text-violet" />
                  <h3 className="font-heading text-sm text-muted">
                    Ranking de certificados {new Date().getFullYear()}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {ranking.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-medium text-muted">
                        {i + 1}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-xs font-semibold text-muted overflow-hidden border border-border">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          u.name?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="flex-1 text-sm text-foreground truncate">{u.name}</span>
                      <span className="font-semibold text-sm text-violet">{u.count}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </motion.div>
        )}

        {view === 'upload' && (
          <motion.div key="upload" {...fadeUp}>
            <button
              onClick={() => {
                setView('grid')
                clearUpload()
              }}
              className="flex items-center gap-1.5 text-sm text-muted mb-4 active:opacity-60"
            >
              <ArrowLeft size={16} /> Volver
            </button>

            <h1 className="font-heading text-xl mb-5">Subir certificado</h1>

            {!uploadResult ? (
              <>
                <div className="card-base p-5 text-center mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet/10 flex items-center justify-center mx-auto mb-3">
                    <Award size={24} className="text-violet" />
                  </div>
                  <h2 className="font-heading text-lg mb-1.5">Certificado de Platzi</h2>
                  <p className="text-sm text-muted leading-relaxed">
                    Subi una captura o foto de tu certificado de Platzi
                  </p>
                </div>

                {!preview && !processing ? (
                  <div className="flex gap-3">
                    <label className="flex-1 flex flex-col items-center gap-2.5 py-7 rounded-2xl bg-card border border-border border-dashed cursor-pointer hover:border-violet/40 transition-colors active:scale-[0.97]">
                      <Camera size={24} className="text-violet" />
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
                    <label className="flex-1 flex flex-col items-center gap-2.5 py-7 rounded-2xl bg-card border border-border border-dashed cursor-pointer hover:border-violet/40 transition-colors active:scale-[0.97]">
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
                  </div>
                ) : processing ? (
                  <div>
                    {preview && (
                      <div className="relative rounded-2xl overflow-hidden border border-border mb-4">
                        <img
                          src={preview}
                          alt="Analizando"
                          className="w-full h-auto max-h-[300px] object-cover"
                        />
                        <ScannerOverlay />
                      </div>
                    )}
                    <div className="card-base p-6 text-center">
                      <p className="text-sm font-semibold text-violet">Analizando certificado</p>
                      <p className="text-xs text-muted mt-1">Extrayendo datos con IA...</p>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-border mb-3">
                      <img
                        src={preview}
                        alt="Vista previa"
                        className="w-full h-auto max-h-[300px] object-cover"
                      />
                    </div>
                    {error && (
                      <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl mb-3">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-2.5">
                      <button
                        onClick={clearUpload}
                        className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-muted hover:text-danger transition-colors active:scale-90 shrink-0"
                      >
                        <XCircle size={20} />
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="flex-1 h-12 rounded-2xl bg-violet text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                      >
                        <Upload size={16} /> Analizar certificado
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="card-base p-6 text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-violet/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={28} className="text-violet" />
                  </div>
                  <h2 className="font-heading text-lg">Certificado registrado!</h2>
                  <p className="text-sm text-muted mt-1">
                    {uploadResult.certificate?.course_name || 'Certificado agregado a tu coleccion'}
                  </p>
                </div>

                {uploadResult.certificate && (
                  <div className="space-y-2 mb-4">
                    {[
                      { l: 'Curso', v: uploadResult.certificate.course_name },
                      { l: 'Fecha', v: uploadResult.certificate.completion_date },
                      { l: 'Horas', v: uploadResult.certificate.total_hours },
                      { l: 'Escuela', v: uploadResult.certificate.school_name },
                    ]
                      .filter((f) => f.v)
                      .map((f) => (
                        <div key={f.l} className="card-base p-3 flex items-center gap-3">
                          <Award size={14} className="text-violet shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted uppercase">{f.l}</p>
                            <p className="text-sm text-foreground">{f.v}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setView('grid')
                    clearUpload()
                  }}
                  className="w-full py-4 rounded-2xl bg-violet text-white font-semibold active:scale-[0.97] transition-transform"
                >
                  Ver mis certificados
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {view === 'detail' && selectedCert && (
          <CertificateDetail
            key={`detail-${selectedCert.id}`}
            cert={selectedCert}
            onBack={handleBack}
            onDelete={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

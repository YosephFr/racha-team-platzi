import { Router } from 'express'
import { unlinkSync } from 'fs'
import { analyzeCertificate } from '../ai/provider.js'
import { processImage } from '../services/image.js'
import { queries } from '../db/index.js'

export const certificatesRouter = Router()

certificatesRouter.post('/', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  if (!req.file) return res.status(400).json({ error: 'Imagen requerida' })

  try {
    const rawPath = req.file.path
    console.log(`[certificates] Received: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)}KB)`)

    const processedPath = await processImage(rawPath)
    try { unlinkSync(rawPath) } catch {}

    console.log('[certificates] Analyzing certificate with vision...')
    const analysis = await analyzeCertificate(processedPath)
    console.log('[certificates] Vision result:', JSON.stringify(analysis).slice(0, 300))

    if (!analysis.isPlatziCertificate) {
      return res.status(400).json({
        error: 'La imagen no parece ser un certificado de Platzi',
        analysis,
      })
    }

    if (analysis.certificateId) {
      const existing = queries.getCertificateByExternalId(req.user.userId, analysis.certificateId)
      if (existing) {
        return res.status(409).json({
          error: 'Ya tienes este certificado registrado',
          existing,
        })
      }
    }

    const imageName = processedPath.split('/').pop()
    const certificate = queries.createCertificate(req.user.userId, imageName, analysis)

    console.log(`[certificates] Created certificate ${certificate.id} for user ${req.user.userId}`)
    res.json({ certificate, analysis })
  } catch (err) {
    console.error('[certificates] Error:', err)
    res.status(500).json({ error: 'Error al procesar el certificado' })
  }
})

certificatesRouter.get('/ranking', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const ranking = queries.getCertificateRanking()
  res.json({
    ranking: ranking.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
      count: r.count,
    })),
  })
})

certificatesRouter.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const certificates = queries.getUserCertificates(req.user.userId)
  res.json({ certificates })
})

certificatesRouter.get('/:id', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const certificate = queries.getCertificateById(Number(req.params.id), req.user.userId)
  if (!certificate) return res.status(404).json({ error: 'Certificado no encontrado' })
  res.json({ certificate })
})

certificatesRouter.delete('/:id', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const result = queries.deleteCertificate(Number(req.params.id), req.user.userId)
  if (result.changes === 0) return res.status(404).json({ error: 'Certificado no encontrado' })
  res.json({ ok: true })
})

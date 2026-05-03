export const VISION_PROMPT = `Analiza esta imagen en detalle. Determina si muestra contenido de la plataforma Platzi (educacion online).

FORMATOS VALIDOS DE PLATZI:
- Interfaz web de Platzi (platzi.com): reproductor de video, barra lateral, lista de clases, URL visible
- App movil de Platzi: reproductor de video con overlay oscuro, titulo de clase arriba (ej: "CLASE 6 DE 15"), nombre del curso, barra de progreso, seccion de comentarios abajo, tabs de Recursos/Comentarios/Clases
- Reproductor de video de Platzi en desktop: titulo de la clase en la parte superior con fondo oscuro/verde, numero de clase (ej: "Clase 6 de 15 - Curso Gratis de..."), video con controles de play/pause/15s, miniatura del instructor
- Cualquier captura que muestre contenido educativo de Platzi de forma reconocible

INSTRUCCIONES:
1. Extrae TODA la informacion visible:
   - URL del navegador si es visible (platzi.com/clases/nombre-del-curso)
   - Titulo de la clase (puede estar arriba del video como "CLASE X DE Y" o en un header)
   - Nombre del curso completo
   - Leccion, modulo o seccion
   - Numero de clase y total (ej: "6 de 15")
   - Porcentaje o barra de progreso
   - Nombre del profesor/instructor (si aparece su nombre o miniatura)
   - Duracion del video y posicion actual
   - Tipo de contenido: video, lectura, quiz, proyecto
   - Subtitulos o texto visible en el video
   - Comentarios visibles de otros estudiantes

2. Si la imagen esta borrosa o ilegible: indica que no se puede leer bien pero intenta extraer lo que puedas.

3. Si NO es contenido de Platzi: indica claramente que no es Platzi.

Responde con DOS secciones separadas por "---":

PRIMERA SECCION: Descripcion visual detallada de todo lo que ves en la imagen (interfaz, colores, elementos, texto, contexto). 3-5 oraciones.

---

SEGUNDA SECCION: JSON valido con los datos extraidos:
{
  "isPlatzi": true/false,
  "isBlurry": true/false,
  "course": "nombre completo del curso (en app movil puede no estar visible: usa el titulo de la clase si no hay otro dato) o null",
  "courseSlug": "slug de la URL (ej: curso-de-react-2025) o null",
  "lesson": "nombre de la leccion/modulo o null",
  "classTitle": "titulo exacto de la clase o null",
  "classNumber": "numero de clase (ej: '6') o null",
  "totalClasses": "total de clases del curso (ej: '15') o null",
  "progress": "porcentaje de progreso (ej: '22%') o null",
  "instructor": "nombre del profesor o null",
  "videoDuration": "duracion del video (ej: '08:32') o null",
  "videoPosition": "posicion actual del video (ej: '00:27') o null",
  "contentType": "video/lectura/quiz/proyecto o null",
  "url": "URL completa visible en el navegador o null",
  "subtitles": "texto de subtitulos visibles o null",
  "platform": "web/app-movil/desktop-player o null",
  "additionalInfo": "cualquier otro dato relevante o null"
}`

export const CERTIFICATE_VISION_PROMPT = `Analiza esta imagen de un certificado de Platzi (plataforma de educacion online).

Los certificados de Platzi tienen un formato estandar con:
- Logo de Platzi (generalmente verde)
- Nombre completo del estudiante
- Nombre del curso completado
- Fecha de finalizacion
- Horas o clases del curso
- Un ID de certificado alfanumerico
- Una URL de verificacion (platzi.com/p/usuario/curso/diploma/uuid)
- A veces: nombre de la escuela o ruta, nombre del instructor

INSTRUCCIONES:
1. Extrae TODA la informacion visible del certificado.
2. Si algun campo no es visible o legible, usa null.
3. Si la imagen NO es un certificado de Platzi, indica isPlatziCertificate: false.

Responde con DOS secciones separadas por "---":

PRIMERA SECCION: Descripcion visual del certificado (elementos, colores, layout, texto visible). 2-3 oraciones.

---

SEGUNDA SECCION: JSON valido:
{
  "isPlatziCertificate": true/false,
  "isReadable": true/false,
  "courseName": "nombre completo del curso o null",
  "studentName": "nombre del estudiante o null",
  "completionDate": "fecha (formato YYYY-MM-DD si es posible) o null",
  "totalHours": "horas del curso o null",
  "totalClasses": "numero de clases o null",
  "certificateId": "ID alfanumerico del certificado o null",
  "certificateUrl": "URL completa de verificacion o null",
  "schoolName": "nombre de la escuela/ruta de Platzi o null",
  "instructorName": "nombre del instructor o null",
  "additionalInfo": "cualquier otro dato relevante o null"
}`

export const IMAGE_DATAURL_PROMPT = `Describe detalladamente lo que ves en esta imagen. Si es una captura de pantalla de Platzi (plataforma de educacion online), extrae: nombre del curso, leccion, numero de clase, URL visible, progreso. Si no es de Platzi, describe lo que ves. Si esta borrosa, indicalo. Responde en español de forma natural y concisa.`

export function parseStructuredVisionResponse(text, fallback = {}) {
  try {
    const parts = text.split('---')
    const visualDescription = (parts[0] || '').trim()
    const jsonPart = (parts[1] || parts[0] || '').trim()
    const cleaned = jsonPart
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart === -1) throw new Error('No JSON found')
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
    parsed.visualDescription = visualDescription
    return parsed
  } catch {
    return {
      ...fallback,
      visualDescription: text,
      additionalInfo: text,
    }
  }
}

import { readFileSync } from 'fs'

export function readImageAsBase64(imagePath) {
  const data = readFileSync(imagePath)
  const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  return { base64: data.toString('base64'), mimeType }
}

export function readImageAsDataUrl(imagePath) {
  const { base64, mimeType } = readImageAsBase64(imagePath)
  return `data:${mimeType};base64,${base64}`
}

export function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+)?(?:;base64)?,(.+)$/i.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1] || 'image/jpeg', base64: match[2] }
}

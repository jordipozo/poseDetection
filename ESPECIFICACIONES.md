# Especificaciones Técnicas — poseDetection

> **Versión**: actual (index.html)
> **Fecha**: 2026-04-10
> **Contexto**: Aplicación web para captura de poses corporales en el marco de investigación doctoral (biomecánica deportiva / baloncesto)

---

## 1. Descripción general

**poseDetection** es una aplicación web de página única (SPA) que permite grabar vídeo desde la cámara del dispositivo con detección de pose corporal en tiempo real. Genera dos artefactos por grabación:

- Un fichero de vídeo con el esqueleto superpuesto.
- Un fichero JSON con los metadatos de pose (33 landmarks por fotograma).

**Caso de uso principal**: captura de movimientos de baloncesto (tiro libre, triple, salto, rebote, defensa, cambio, bandeja) identificados por dorsal de jugador, para su análisis biomecánico posterior.

---

## 2. Arquitectura

La aplicación es **100 % client-side**. No existe servidor ni backend.

```
poseDetection/
├── index.html          # SPA completa (HTML + CSS + JS en un único fichero)
├── index_v1.html       # Versión anterior (copia de seguridad)
├── sw.js               # Service Worker (caché offline)
├── manifest.json       # Manifiesto PWA
└── descargas/          # Directorio local de grabaciones
    ├── *.mp4 / *.webm
    └── *_metadata.json
```

Todo el código de producción reside en `index.html`. No hay bundler, npm ni proceso de compilación.

---

## 3. Tecnologías y dependencias

### Stack base

| Capa | Tecnología |
|------|-----------|
| Lenguaje | HTML5 · CSS3 · JavaScript ES2020+ (strict mode) |
| Build | Ninguno — despliegue de fichero único |
| Frameworks | Ninguno — vanilla JS + APIs nativas |

### Librerías externas (CDN jsDelivr)

| Librería | Versión/Canal | Uso |
|----------|---------------|-----|
| `@mediapipe/pose` | latest | Detección de pose (33 landmarks, WASM + WebGL) |
| `@mediapipe/camera_utils` | latest | Utilidades de cámara (cargada, no usada activamente) |
| `@mediapipe/drawing_utils` | latest | Utilidades de dibujo (cargada, no usada activamente) |

### APIs de navegador utilizadas

| API | Propósito |
|-----|-----------|
| `MediaDevices.getUserMedia()` | Acceso a cámara |
| `HTMLCanvasElement` + `CanvasRenderingContext2D` | Renderizado de fotogramas y esqueleto |
| `HTMLCanvasElement.captureStream()` | Conversión de canvas a stream de vídeo |
| `MediaRecorder` | Codificación y grabación de vídeo |
| `requestAnimationFrame` | Bucle de procesamiento de fotogramas |
| `Blob` + `URL.createObjectURL()` | Descarga de ficheros |
| `performance.now()` | Marcas de tiempo de alta precisión |
| `window.showDirectoryPicker()` | Selección de carpeta local (File System Access API) |
| `FileSystemDirectoryHandle` | Escritura directa a disco |
| `navigator.serviceWorker` | Caché offline |

### Requisitos de entorno

- **HTTPS** (o `localhost`) — obligatorio para `getUserMedia()` en móvil.
- **Navegador moderno**: Chrome 90+, Firefox 90+, Safari 15+, Edge 90+.
- **Cámara** — obligatoria.
- **`showDirectoryPicker()`** — solo Chromium; Firefox/Safari degradan con descarga manual.

---

## 4. Interfaz de usuario

### Componentes principales

| Componente | ID DOM | Descripción |
|------------|--------|-------------|
| Canvas | `#canvas` | Pantalla completa con vídeo + landmarks superpuestos |
| Video oculto | `#videoEl` | Stream de cámara (fuente para MediaPipe) |
| Barra de estado | `#statusBar` | Mensajes informativos superiores |
| Indicador de grabación | `#recDot` | Punto pulsante durante grabación |
| Barra de progreso | `#progressBar` | Progreso temporal de la grabación |
| Temporizador | `#timer` | Tiempo actual / máximo |
| Selector de dorsal | `#dorsalSelect` | Desplegable: número de jugador (00–99) |
| Selector de postura | `#postureSelect` | Desplegable: 7 movimientos de baloncesto |
| Botón de directorio | `#dirBtn` | Seleccionar carpeta local de guardado |
| Toggle de auto-guardado | `#autoSaveToggle` | Activar/desactivar guardado automático |
| Botón de grabación | `#recordBtn` | Círculo (reposo) → Cuadrado (grabando) |
| Botón de giro de cámara | `#flipBtn` | Cambiar entre cámara frontal/trasera |
| Panel de descarga | `#downloadPanel` | Estadísticas y botones tras finalizar grabación |
| Overlay de carga | `#loadingOverlay` | Spinner e indicadores de inicialización |
| Pantalla de error de permisos | `#permError` | Gestión de permiso de cámara denegado |
| Notificación toast | `#toast` | Mensajes de estado temporales |

### Diseño visual

- **Tema**: oscuro.
- **Variables CSS principales**:

```css
--bg:           #0d0d0d   /* Fondo principal */
--surface:      #1a1a1a   /* Superficie de tarjeta */
--accent:       #e53935   /* Rojo — acción primaria / grabación */
--green:        #43a047   /* Verde — toggle activo */
--blue:         #1e88e5   /* Azul — selección */
--radius:       12px      /* Radio de borde estándar */
--bar-h:        90px      /* Altura de la barra inferior */
```

---

## 5. Configuración y constantes

Definidas en `index.html` (líneas ~760–794):

| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `MAX_DURATION_MS` | 30 000 | Duración máxima de grabación (ms) |
| `TARGET_FPS` | 30 | FPS objetivo del canvas y la captura |
| `CANVAS_W` | 640 | Anchura interna del canvas (px) |
| `CANVAS_H` | 480 | Altura interna del canvas (px) |
| `LANDMARK_NAMES` | Array[33] | Nombres semánticos de los 33 landmarks |
| `POSTURE_NAMES` | Object{1–7} | Etiquetas de movimiento de baloncesto |
| `POSE_CONNECTIONS` | Array[35] | Lista de aristas del esqueleto |

### Configuración de MediaPipe Pose

```javascript
pose.setOptions({
  modelComplexity: 1,           // Equilibrio velocidad ↔ precisión
  smoothLandmarks: true,        // Filtrado temporal
  enableSegmentation: false,
  smoothSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
})
```

### Posturas de baloncesto (códigos 1–7)

| Código | Nombre interno | Descripción |
|--------|---------------|-------------|
| 1 | `tiro_libre` | Tiro libre |
| 2 | `triple` | Tiro de tres puntos |
| 3 | `salto` | Salto |
| 4 | `rebote` | Rebote |
| 5 | `defensa` | Defensa |
| 6 | `cambio` | Cambio de dirección |
| 7 | `bandeja` | Bandeja |

---

## 6. Pipeline de detección y grabación

```
Cámara del dispositivo
       │
       ▼
  <video> oculto (stream en bruto)
       │
       ▼ (requestAnimationFrame)
  pose.send({ image: videoEl })
       │
       ▼
  MediaPipe Pose (WASM/WebGL)
  ─→ 33 landmarks {x, y, z, visibility}
       │
       ├──────────────────────────────────────┐
       ▼                                      ▼
  drawFrame()                          captureFrameMeta()
  ├── drawImage() [espejado si frontal]  └── push a frameData[]
  ├── drawSkeleton() [35 líneas blancas]
  └── drawLandmarks() [círculos coloreados]
       │
       ▼
  canvas.captureStream(30 fps)
       │
       ▼
  MediaRecorder (chunks cada 200 ms)
       │
       ▼ (stop() por usuario o a los 30 s)
  onRecordingStop()
  ├── Blob de vídeo
  ├── JSON de metadatos
  └── Guardado (auto o manual)
```

### Renderizado de landmarks

- **Umbral de visibilidad**: solo se dibuja si `visibility ≥ 0.3`.
- **Cara** (índices 0–10): cian (`#00e5ff`), radio 4 px (nariz: 5 px).
- **Cuerpo** (índices 11–32): rojo/naranja (`#ff5252`), radio 4 px.
- **Anillo exterior**: negro semitransparente (`rgba(0,0,0,0.5)`), radio +1,5 px.
- **Líneas de esqueleto**: blanco semitransparente (`rgba(255,255,255,0.75)`), grosor 2,5 px.

### Conexiones del esqueleto (35 aristas)

| Zona | Pares de índices |
|------|-----------------|
| Cara | [0,1] [1,2] [2,3] [3,7] [0,4] [4,5] [5,6] [6,8] [9,10] |
| Torso | [11,12] [11,23] [12,24] [23,24] |
| Brazo izq. | [11,13] [13,15] [15,17] [15,19] [15,21] [17,19] |
| Brazo der. | [12,14] [14,16] [16,18] [16,20] [16,22] [18,20] |
| Pierna izq. | [23,25] [25,27] [27,29] [29,31] [27,31] |
| Pierna der. | [24,26] [26,28] [28,30] [30,32] [28,32] |

### Espejado de cámara

- **Cámara frontal** (`facingMode: 'user'`): el canvas se espeja en X durante el renderizado.
- **Cámara trasera** (`facingMode: 'environment'`): sin espejado.
- **JSON exportado**: coordenadas brutas de MediaPipe (sin espejar), siempre.

---

## 7. Formatos de entrada y salida

### Entrada

| Fuente | Detalles |
|--------|---------|
| Stream de cámara | Fotogramas en bruto; resolución ideal 640×480; objetivo 30 fps |
| Dorsal | Número 00–99 (opcional) |
| Postura | Código 1–7 (opcional) |
| Directorio | Carpeta local seleccionada por el usuario (File System Access API, opcional) |

### Salida — Vídeo

| Propiedad | Valor |
|-----------|-------|
| Formato preferente | MP4 (H.264) |
| Formato alternativo | WebM (VP9 → VP8 → sin codec especificado) |
| Resolución | 640×480 px |
| FPS | ~30 (varía según dispositivo) |
| Audio | Ninguno |
| Nombre de fichero | `{dorsal}_{timestamp}_{postura}.{ext}` o `rec_{timestamp}_{aleatorio}.{ext}` |

### Salida — Metadatos JSON

**Nombre de fichero**: `{nombre_base}_metadata.json`

**Estructura**:

```json
{
  "recording": {
    "id": "rec_20260312_131405_56jtz",
    "dorsal": "07",
    "posture_code": 1,
    "posture_name": "tiro_libre",
    "date": "2026-03-20T12:52:45.613Z",
    "duration_seconds": 7.0,
    "fps": 21.0,
    "resolution": { "width": 640, "height": 480 },
    "device": "Mozilla/5.0...",
    "platform": "mobile",
    "video_mime": "video/mp4;codecs=avc1"
  },
  "frames": [
    {
      "frame_index": 0,
      "timestamp_ms": 45.2,
      "landmarks": [
        {
          "index": 0,
          "name": "nose",
          "x": 0.459495,
          "y": 0.484919,
          "z": -1.393010,
          "visibility": 0.9999
        }
        // ... 32 landmarks más
      ]
    }
    // ... N fotogramas
  ]
}
```

**Coordenadas**: normalizadas [0,0–1,0] relativas al canvas; Z es profundidad relativa (negativo = más cerca); visibility es confianza [0,0–1,0].

---

## 8. Modos de guardado

| Modo | Condición | Comportamiento |
|------|-----------|----------------|
| Auto-guardado en carpeta | `autoSave = true` + carpeta seleccionada | Escribe directamente en disco (File System Access API) |
| Auto-descarga | `autoSave = true` + sin carpeta + escritorio | Descarga programática vía `URL.createObjectURL()` |
| Descarga manual | Panel `#downloadPanel` | El usuario pulsa botones de descarga individuales |

---

## 9. Estado global de la aplicación

Variables de estado definidas en `index.html` (~líneas 832–850):

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `isRecording` | boolean | Grabación activa |
| `frameData` | Array | Fotogramas de metadatos acumulados |
| `recordedChunks` | Array | Blobs de MediaRecorder |
| `currentFacingMode` | string | `'user'` \| `'environment'` |
| `dirHandle` | FileSystemDirectoryHandle | Handle del directorio seleccionado |
| `autoSave` | boolean | Modo auto-guardado activo |
| `mimeType` | string | MIME type detectado para la grabación |
| `poseModel` | Pose | Instancia de MediaPipe Pose |

---

## 10. Secuencia de inicialización

1. Deshabilitar `#dirBtn` si el navegador no soporta `showDirectoryPicker()`.
2. Generar opciones de dorsal (00–99).
3. Registrar Service Worker.
4. `initApp()` (async):
   a. Mostrar overlay de carga.
   b. `startCamera()` — solicitar permiso y obtener stream.
   c. `initPose()` — cargar modelo MediaPipe.
   d. `startCameraLoop(poseModel)` — iniciar bucle RAF.
   e. Ocultar overlay.

---

## 11. Soporte offline (PWA)

**Fichero**: `sw.js` — estrategia cache-first.

| Aspecto | Detalle |
|---------|---------|
| Nombre de caché | `pose-v1` |
| Pre-caché (install) | `index.html` + 3 librerías MediaPipe |
| Estrategia runtime | Cache-first; red como fallback |
| Activación | Limpia cachés obsoletas automáticamente |

**Manifiesto PWA** (`manifest.json`):

```json
{
  "name": "Detección de Pose",
  "short_name": "PoseDetect",
  "display": "fullscreen",
  "orientation": "portrait-primary",
  "background_color": "#0d0d0d",
  "theme_color": "#0d0d0d"
}
```

---

## 12. Compatibilidad de navegadores

| Navegador | Soporte base | Auto-guardado en carpeta |
|-----------|-------------|--------------------------|
| Chrome / Edge 90+ | Completo | Sí (File System Access API) |
| Firefox 90+ | Completo | No (descarga manual) |
| Safari 15+ | Completo | No (descarga manual) |
| Navegadores antiguos | No garantizado | — |

---

## 13. Limitaciones conocidas

- Resolución fija de canvas (640×480 px) independientemente del dispositivo.
- Duración máxima de grabación: 30 segundos.
- Sin audio en las grabaciones.
- `showDirectoryPicker()` solo disponible en Chromium.
- En iOS, la interrupción del stream (bloqueo de pantalla, cambio de app) requiere reinicio de cámara automático.
- Las librerías MediaPipe se cargan desde CDN; la primera carga requiere conexión a Internet.

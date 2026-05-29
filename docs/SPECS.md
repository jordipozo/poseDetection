# Especificaciones Técnicas — poseDetection

> **Versión:** 2.0 (tras Fase 8 de la hoja de ruta)
> **Fecha:** 2026-05-29
> **Contexto:** PWA de investigación doctoral — biomecánica deportiva / baloncesto

---

## 1. Descripción general y caso de uso

**poseDetection** es una aplicación web de página única (SPA / PWA) que graba vídeo desde la cámara del dispositivo con detección de pose corporal en tiempo real mediante MediaPipe Pose. Por cada grabación genera tres artefactos:

- Un fichero de **vídeo** con el esqueleto superpuesto.
- Un fichero **JSON** con los metadatos de pose (33 landmarks por fotograma).
- Un fichero **CSV** con los mismos landmarks en formato tabular (para R, pandas, Excel).

**Caso de uso principal:** captura de movimientos de baloncesto (tiro libre, triple, salto, rebote, defensa, cambio de dirección, bandeja) identificados por dorsal de jugador, para su análisis biomecánico posterior.

La aplicación está diseñada para funcionar en campo, sin conexión a internet una vez cargada, instalada como PWA en la pantalla de inicio del móvil.

---

## 2. Arquitectura y estructura de carpetas

La aplicación es **100 % client-side**. No existe servidor ni backend.

```
poseDetection/
├── index.html              # Punto de entrada — HTML + CSS + bootstrap JS
├── sw.js                   # Service Worker (caché offline, estrategia cache-first)
├── manifest.json           # Manifiesto PWA
├── icons/
│   ├── icon-192.png        # Icono PWA 192×192 px
│   └── icon-512.png        # Icono PWA 512×512 px
├── src/
│   ├── app/                # Arranque, inicialización, event listeners globales
│   ├── features/
│   │   ├── camera/         # initCamera, switchCamera, stopCamera
│   │   ├── pose/           # initPose, drawFrame, drawSkeleton, drawLandmarks
│   │   ├── recording/      # startRecording, stopRecording, onRecordingStop
│   │   └── storage/        # pickDirectory, save, downloadBlob
│   ├── shared/             # Helpers puros: formatTime, generateId, isMobile…
│   └── data/               # Constantes de dominio: LANDMARK_NAMES, POSTURE_NAMES…
├── tests/
│   └── shared/
│       ├── utils.test.js
│       └── validateMeta.test.js
├── docs/
│   ├── SPECS.md            # Este documento
│   └── tasks.md            # Hoja de ruta de desarrollo
├── package.json            # Dependencias de desarrollo (ESLint, Vitest)
└── AGENTS.md               # Instrucciones para agentes de IA
```

---

## 3. Stack tecnológico y dependencias

### Lenguajes y frameworks

| Capa | Tecnología |
|------|-----------|
| Lenguaje | HTML5 · CSS3 · JavaScript ES2020+ (`'use strict'`) |
| Build | Ninguno — despliegue de fichero único + módulos ES |
| Framework frontend | Ninguno — Vanilla JS + Web APIs nativas |

### Dependencias de producción (CDN jsDelivr — versiones fijas)

| Librería | Versión | Uso |
|----------|---------|-----|
| `@mediapipe/pose` | `0.5.1675469404` | Detección de pose — 33 landmarks, motor WASM + WebGL |

**URL exacta:**
```
https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js
```

Los archivos del modelo WASM se resuelven dinámicamente desde la misma versión:
```javascript
locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
```

> Las librerías `camera_utils` y `drawing_utils` de MediaPipe se eliminaron en la Fase 1 — no se usaban activamente y añadían peso de carga innecesario.

### Dependencias de desarrollo

| Paquete | Versión | Uso |
|---------|---------|-----|
| `eslint` | ^8.57 | Linting estático |
| `vitest` | ^4.1 | Tests unitarios |
| `@vitest/coverage-v8` | ^4.1 | Cobertura de tests |

### APIs de navegador utilizadas

| API | Propósito |
|-----|-----------|
| `MediaDevices.getUserMedia()` | Acceso a cámara |
| `HTMLCanvasElement` + `CanvasRenderingContext2D` | Renderizado de fotogramas y esqueleto |
| `HTMLCanvasElement.captureStream()` | Stream de vídeo desde el canvas |
| `MediaRecorder` | Codificación y grabación de vídeo |
| `requestAnimationFrame` | Bucle de procesamiento de fotogramas |
| `Blob` + `URL.createObjectURL()` | Descarga de ficheros |
| `performance.now()` | Marcas de tiempo de alta precisión |
| `window.showDirectoryPicker()` | Selección de carpeta local (solo Chromium) |
| `FileSystemDirectoryHandle` | Escritura directa a disco |
| `navigator.serviceWorker` | Caché offline |
| `localStorage` | Persistencia de preferencias (duración seleccionada) |

### Requisitos de entorno

- **HTTPS** (o `localhost`) — obligatorio para `getUserMedia()` en móvil.
- **Navegador moderno:** Chrome 90+, Firefox 90+, Safari 15+, Edge 90+.
- **Cámara** — obligatoria.
- `showDirectoryPicker()` — solo Chromium; Firefox/Safari degradan a descarga manual.

---

## 4. Configuración y constantes

| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `TARGET_FPS` | 30 | FPS objetivo del canvas y la captura |
| `CANVAS_W` | 640 | Anchura interna del canvas (px) |
| `CANVAS_H` | 480 | Altura interna del canvas (px) |
| `LANDMARK_NAMES` | Array[33] | Nombres semánticos de los 33 landmarks de MediaPipe |
| `POSTURE_NAMES` | Object{1–7} | Etiquetas de movimiento de baloncesto |
| `POSE_CONNECTIONS` | Array[35] | Lista de aristas del esqueleto |

La **duración máxima de grabación** es configurable por el usuario mediante el selector `#durationSelect` (15 s / 30 s / 60 s / Sin límite). La selección se persiste en `localStorage` bajo la clave `pose_max_duration`.

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

### Posturas de baloncesto

| Código | Nombre interno | Etiqueta UI |
|--------|---------------|-------------|
| 1 | `tiro_libre` | Tiro libre |
| 2 | `triple` | Tiro triple |
| 3 | `salto` | Salto |
| 4 | `rebote` | Rebote |
| 5 | `defensa` | Defensa |
| 6 | `cambio` | Cambio de dirección |
| 7 | `bandeja` | Bandeja |

Las opciones del `<select>` se generan dinámicamente desde `POSTURE_NAMES` en el arranque. `POSTURE_NAMES` es la única fuente de verdad.

---

## 5. Pipeline de detección y grabación

```
Cámara del dispositivo
       │
       ▼
  <video> oculto (stream en bruto, playsinline, muted)
       │
       ▼ (requestAnimationFrame)
  pose.send({ image: videoEl })
       │
       ▼
  MediaPipe Pose (WASM/WebGL)
  → 33 landmarks {x, y, z, visibility}
       │
       ├──────────────────────────────────────────┐
       ▼                                          ▼
  drawFrame()                              captureFrameMeta()
  ├── drawImage() [espejado si cámara frontal]  └── acumula en frameData[]
  ├── drawSkeleton() [35 aristas blancas]
  └── drawLandmarks() [círculos coloreados]
       │
       ▼
  canvas.captureStream(30 fps)
       │
       ▼
  MediaRecorder (chunks cada 200 ms)
       │
       ▼ (stop() por usuario o al alcanzar la duración configurada)
  handleRecordingStop()
  ├── Blob de vídeo
  ├── JSON de metadatos
  ├── CSV de landmarks
  └── Guardado (auto-carpeta / auto-descarga / panel manual)
```

### Renderizado de landmarks

- **Umbral de visibilidad:** solo se dibuja si `visibility ≥ 0.3`.
- **Cara** (índices 0–10): cian (`#00e5ff`), radio 4 px (nariz: 5 px).
- **Cuerpo** (índices 11–32): rojo/naranja (`#ff5252`), radio 4 px.
- **Anillo exterior:** negro semitransparente (`rgba(0,0,0,0.5)`), radio +1,5 px.
- **Líneas de esqueleto:** blanco semitransparente (`rgba(255,255,255,0.75)`), grosor 2,5 px.

### Espejado de cámara

- **Cámara frontal** (`facingMode: 'user'`): el canvas se espeja en X durante el renderizado.
- **Cámara trasera** (`facingMode: 'environment'`): sin espejado.
- **JSON/CSV exportados:** coordenadas brutas de MediaPipe (sin espejar), siempre.

### Conexiones del esqueleto (35 aristas)

| Zona | Pares de índices |
|------|-----------------|
| Cara | [0,1] [1,2] [2,3] [3,7] [0,4] [4,5] [5,6] [6,8] [9,10] |
| Torso | [11,12] [11,23] [12,24] [23,24] |
| Brazo izq. | [11,13] [13,15] [15,17] [15,19] [15,21] [17,19] |
| Brazo der. | [12,14] [14,16] [16,18] [16,20] [16,22] [18,20] |
| Pierna izq. | [23,25] [25,27] [27,29] [29,31] [27,31] |
| Pierna der. | [24,26] [26,28] [28,30] [30,32] [28,32] |

---

## 6. Formatos de salida

### Vídeo

| Propiedad | Valor |
|-----------|-------|
| Formato preferente | MP4 (H.264) |
| Formato alternativo | WebM (VP9 → VP8 → sin codec) |
| Resolución | 640×480 px |
| FPS | ~30 (varía según dispositivo) |
| Audio | Ninguno |
| Nombre de fichero | `{dorsal}_{timestamp}_{postura}.{ext}` o `rec_{timestamp}_{id}.{ext}` |

**Selección dinámica del formato:**

| Prioridad | MIME type | Extensión | Navegadores |
|-----------|-----------|-----------|-------------|
| 1 | `video/mp4;codecs=avc1` | `.mp4` | Chrome, Edge, iOS Safari 15+ |
| 2 | `video/mp4` | `.mp4` | Fallback MP4 |
| 3 | `video/webm;codecs=vp9` | `.webm` | Firefox, Chrome |
| 4 | `video/webm;codecs=vp8` | `.webm` | Fallback WebM |
| 5 | `video/webm` | `.webm` | Fallback genérico |

### Metadatos JSON

**Nombre de fichero:** `{nombre_base}_metadata.json`

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
      ]
    }
  ]
}
```

**Descripción de campos:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `recording.id` | string | Identificador único basado en fecha/hora + sufijo aleatorio |
| `recording.dorsal` | string | Dorsal del jugador (opcional) |
| `recording.posture_code` | number | Código de postura 1–7 (opcional) |
| `recording.posture_name` | string | Nombre interno de la postura |
| `recording.date` | string | Fecha y hora de fin en ISO 8601 |
| `recording.duration_seconds` | number | Duración real en segundos (2 decimales) |
| `recording.fps` | number | FPS medio real = `total_frames / duration_seconds` |
| `recording.resolution` | object | `{width: 640, height: 480}` |
| `recording.device` | string | `navigator.userAgent` del dispositivo |
| `recording.platform` | string | `"mobile"` o `"desktop"` |
| `recording.video_mime` | string | MIME type efectivo de MediaRecorder |
| `frames[].frame_index` | integer | Índice secuencial desde 0 |
| `frames[].timestamp_ms` | number | Tiempo relativo al inicio de grabación (ms) |
| `frames[].landmarks[]` | array | 33 objetos landmark |
| `landmark.x` | number | Coordenada X normalizada [0.0, 1.0] |
| `landmark.y` | number | Coordenada Y normalizada [0.0, 1.0] |
| `landmark.z` | number | Profundidad relativa a la cadera (negativo = más cerca) |
| `landmark.visibility` | number | Confianza de visibilidad [0.0, 1.0] |

### CSV de landmarks

**Nombre de fichero:** `{nombre_base}_landmarks.csv`

**Formato:** una fila por landmark por fotograma.

```
frame_index,timestamp_ms,landmark_index,name,x,y,z,visibility
0,45.2,0,nose,0.459,0.484,-1.393,0.9999
0,45.2,1,left_eye_inner,0.471,0.463,-1.381,0.9998
...
```

**Dimensiones:** `N_frames × 33` filas de datos (más cabecera).

> Un ejemplo: 30 s × 30 fps × 33 landmarks = 29 700 filas. Aceptable para el uso de investigación.

---

## 7. Modos de guardado

| Modo | Condición | Comportamiento |
|------|-----------|----------------|
| Auto-guardado en carpeta | `autoSave = true` + carpeta seleccionada | Escribe vídeo, JSON y CSV directamente en disco (File System Access API); muestra toast "✓ Guardado" |
| Auto-descarga | `autoSave = true` + sin carpeta + escritorio | Descarga programática vía `URL.createObjectURL()` |
| Descarga manual | Panel `#downloadPanel` | El usuario pulsa botones individuales para vídeo, JSON y CSV |

---

## 8. Interfaz de usuario

### Componentes principales

| Componente | ID DOM | Descripción |
|------------|--------|-------------|
| Canvas | `#canvas` | Pantalla completa con vídeo + landmarks superpuestos |
| Video oculto | `#videoEl` | Stream de cámara (fuente para MediaPipe) |
| Barra de estado | `#statusBar` | Mensajes informativos superiores |
| Indicador de grabación | `#recDot` | Punto pulsante durante grabación |
| Barra de progreso | `#progressBar` | Progreso temporal de la grabación |
| Temporizador | `#timer` | Tiempo actual / máximo configurado |
| Selector de duración | `#durationSelect` | 15 s / 30 s / 60 s / Sin límite |
| Selector de dorsal | `#dorsalSelect` | Desplegable: número de jugador 00–99 |
| Selector de postura | `#postureSelect` | Desplegable: 7 movimientos de baloncesto |
| Botón de directorio | `#dirBtn` | Seleccionar carpeta local de guardado |
| Toggle de auto-guardado | `#autoSaveToggle` | Activar/desactivar guardado automático |
| Botón de grabación | `#recordBtn` | Círculo (reposo) → Cuadrado (grabando) |
| Botón de giro de cámara | `#flipBtn` | Cambiar entre cámara frontal/trasera |
| Botón de revisión | `#reviewBtn` | Ver grabaciones anteriores (visible si hay carpeta) |
| Panel de descarga | `#downloadPanel` | Estadísticas y botones (vídeo / JSON / CSV) tras finalizar |
| Panel de revisión | `#reviewPanel` | Lista de grabaciones anteriores con opción de eliminar |
| Overlay de carga | `#loadingOverlay` | Spinner durante inicialización |
| Pantalla de error | `#permError` | Error de permiso de cámara o sin conexión |
| Toast | `#toast` | Notificaciones de estado temporales |

### Paleta de colores (variables CSS)

| Variable | Valor | Uso |
|----------|-------|-----|
| `--bg` | `#0d0d0d` | Fondo principal |
| `--surface` | `#1a1a1a` | Superficie de tarjeta |
| `--surface2` | `#242424` | Superficies secundarias |
| `--border` | `#333333` | Bordes y separadores |
| `--text` | `#f0f0f0` | Texto principal |
| `--text-dim` | `#888888` | Texto secundario |
| `--accent` | `#e53935` | Acción primaria / grabación |
| `--accent-dark` | `#b71c1c` | Estado activo del acento |
| `--green` | `#43a047` | Toggle activo / estado OK |
| `--blue` | `#1e88e5` | Carpeta seleccionada |
| `--radius` | `12px` | Radio de borde estándar |
| `--bar-h` | `90px` | Altura de la barra inferior |

### Medidas de compatibilidad iOS

| Medida | Justificación |
|--------|---------------|
| `playsinline` en `<video>` | Evita pantalla completa automática en iOS Safari |
| `muted` en `<video>` | Requerido por políticas de autoplay de iOS |
| `user-scalable=no` en viewport | Evita zoom accidental |
| `touch-action: manipulation` | Elimina el retardo de 300 ms en tap |
| `env(safe-area-inset-bottom)` | Adapta la barra al notch/home-bar de iPhone |

---

## 9. Secuencia de inicialización

1. Comprobar soporte de `showDirectoryPicker()`; deshabilitar `#dirBtn` si no está disponible.
2. Restaurar la duración guardada en `localStorage`.
3. Generar opciones de dorsal (00–99) dinámicamente.
4. Generar opciones de postura dinámicamente desde `POSTURE_NAMES`.
5. Registrar el Service Worker.
6. `initApp()` (async):
   a. Mostrar overlay de carga.
   b. `Camera.initCamera()` — solicitar permiso y obtener stream.
   c. `Pose.initPose()` — cargar modelo MediaPipe.
   d. `Camera.startCameraLoop()` — iniciar bucle RAF.
   e. Ocultar overlay.

---

## 10. Soporte offline (PWA)

**Fichero:** `sw.js` — estrategia cache-first.

| Aspecto | Detalle |
|---------|---------|
| Nombre de caché | `pose-v3` |
| Pre-caché (install) | `index.html` + `pose.js` (versión fija) + iconos |
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
  "theme_color": "#0d0d0d",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## 11. Compatibilidad de navegadores

| Navegador | Plataforma | Soporte base | Auto-guardado en carpeta |
|-----------|-----------|-------------|--------------------------|
| Chrome 90+ | Android / Desktop | Completo | Sí (File System Access API) |
| Edge 90+ | Desktop | Completo | Sí |
| Firefox 90+ | Android / Desktop | Completo (WebM) | No — descarga manual |
| Safari 15+ | iOS / macOS | Completo (MP4 H.264) | No — descarga manual |

---

## 12. Guía de desarrollo local

```bash
# Servidor HTTP básico (válido para localhost en escritorio)
npx serve .
# o
python -m http.server 8080

# Para pruebas en dispositivo móvil real (requiere HTTPS)
npx local-ssl-proxy --source 8443 --target 8080
# o usar ngrok, Vercel, GitHub Pages, etc.
```

**Scripts disponibles:**

```bash
npm run lint       # ESLint sobre src/
npm test           # Vitest — tests unitarios
npm run coverage   # Vitest con informe de cobertura
```

---

## 13. Limitaciones conocidas

- Resolución del canvas fija en 640×480 px.
- Sin audio en las grabaciones.
- `showDirectoryPicker()` solo disponible en Chromium; Firefox e iOS degradan a descarga.
- En iOS, la interrupción del stream (bloqueo de pantalla, cambio de app) puede requerir reinicio de cámara.
- La primera carga requiere conexión a internet para descargar el modelo MediaPipe; las visitas posteriores usan la caché del SW.
- El CSV puede ser grande para grabaciones largas (30 s × 30 fps × 33 = 29 700 filas).

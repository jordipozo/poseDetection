# Especificaciones Técnicas — Aplicación de Detección de Pose

**Versión:** 1.1
**Fecha:** 2026-03-13
**Archivo principal:** `index.html`

---

## 1. Descripción general

Aplicación web de página única (*Single Page Application*) que permite grabar video de la cámara con detección de pose humana en tiempo real. Los landmarks corporales se superponen visualmente sobre el video durante la grabación. Al finalizar, el usuario puede descargar dos archivos independientes: el video con los landmarks dibujados y un fichero de metadatos estructurado en JSON. Opcionalmente puede seleccionar una carpeta local y activar el guardado automático al terminar cada grabación.

---

## 2. Arquitectura

### 2.1 Tipo de aplicación

| Atributo | Valor |
|---|---|
| Arquitectura | Cliente puro (*client-side only*) |
| Número de archivos | 1 (`index.html`) |
| Servidor backend | No requerido |
| Base de datos | No requerida |
| Framework frontend | Ninguno (Vanilla JS) |

> Toda la lógica, estilos y estructura están contenidos en el único fichero `index.html`. No existe proceso de compilación ni dependencias instaladas localmente.

---

## 3. Lenguajes y tecnologías

### 3.1 Lenguajes

| Lenguaje | Versión / Estándar | Uso |
|---|---|---|
| **HTML** | HTML5 | Estructura del DOM |
| **CSS** | CSS3 | Estilos, animaciones, layout responsivo |
| **JavaScript** | ES2020+ (`'use strict'`) | Lógica de la aplicación completa |

### 3.2 APIs nativas del navegador (Web APIs)

| API | Uso |
|---|---|
| `MediaDevices.getUserMedia()` | Acceso a la cámara del dispositivo |
| `HTMLVideoElement` | Elemento fuente del stream de cámara (oculto) |
| `HTMLCanvasElement` + `CanvasRenderingContext2D` | Renderizado de video + landmarks frame a frame |
| `HTMLCanvasElement.captureStream()` | Genera el stream de video desde el canvas |
| `MediaRecorder` | Grabación del stream del canvas como video |
| `requestAnimationFrame` | Bucle de captura de frames (RAF-based, sin Camera Utils) |
| `Blob` + `URL.createObjectURL()` | Construcción y descarga de archivos |
| `performance.now()` | Timestamps de alta precisión para metadatos |
| `window.showDirectoryPicker()` | Selector de carpeta local (File System Access API) |
| `FileSystemDirectoryHandle` | Escritura de archivos directamente en el sistema de archivos |
| `setTimeout` / `setInterval` | Control del temporizador y auto-parada |

> **Nota:** La API `showDirectoryPicker` requiere gestor de archivos del sistema operativo y solo está disponible en Chromium (Chrome, Edge). En Firefox e iOS Safari no está soportada; la aplicación degrada graciosamente a descarga estándar.

---

## 4. Librerías externas (CDN)

Todas las dependencias se cargan desde **jsDelivr CDN** (`cdn.jsdelivr.net`) sin instalación local.

| Librería | Paquete npm | Versión | Uso |
|---|---|---|---|
| **MediaPipe Pose** | `@mediapipe/pose` | latest | Modelo de detección de pose (33 landmarks) |
| **MediaPipe Camera Utils** | `@mediapipe/camera_utils` | latest | Cargada pero no usada activamente; el bucle de frames es RAF propio |
| **MediaPipe Drawing Utils** | `@mediapipe/drawing_utils` | latest | Cargada pero no usada; el renderizado de landmarks es manual |

### 4.1 CDN endpoints utilizados

```
https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js
https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js
https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js
```

Los archivos del modelo WASM de MediaPipe también se resuelven dinámicamente desde jsDelivr:

```javascript
locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
```

---

## 5. Modelo de detección de pose

### 5.1 Características del modelo

| Parámetro | Valor |
|---|---|
| Motor | MediaPipe Pose (Google) |
| Ejecución | En el navegador (WebAssembly + WebGL) |
| `modelComplexity` | `1` (equilibrio entre velocidad y precisión) |
| `smoothLandmarks` | `true` |
| `enableSegmentation` | `false` |
| `smoothSegmentation` | `false` |
| `minDetectionConfidence` | `0.5` |
| `minTrackingConfidence` | `0.5` |

### 5.2 Landmarks detectados

El modelo produce **33 landmarks** con coordenadas normalizadas (x, y, z) y puntuación de visibilidad.

| Índice | Nombre | Región |
|---|---|---|
| 0 | `nose` | Cara |
| 1 | `left_eye_inner` | Cara |
| 2 | `left_eye` | Cara |
| 3 | `left_eye_outer` | Cara |
| 4 | `right_eye_inner` | Cara |
| 5 | `right_eye` | Cara |
| 6 | `right_eye_outer` | Cara |
| 7 | `left_ear` | Cara |
| 8 | `right_ear` | Cara |
| 9 | `mouth_left` | Cara |
| 10 | `mouth_right` | Cara |
| 11 | `left_shoulder` | Tronco superior |
| 12 | `right_shoulder` | Tronco superior |
| 13 | `left_elbow` | Brazo |
| 14 | `right_elbow` | Brazo |
| 15 | `left_wrist` | Brazo |
| 16 | `right_wrist` | Brazo |
| 17 | `left_pinky` | Mano |
| 18 | `right_pinky` | Mano |
| 19 | `left_index` | Mano |
| 20 | `right_index` | Mano |
| 21 | `left_thumb` | Mano |
| 22 | `right_thumb` | Mano |
| 23 | `left_hip` | Tronco inferior |
| 24 | `right_hip` | Tronco inferior |
| 25 | `left_knee` | Pierna |
| 26 | `right_knee` | Pierna |
| 27 | `left_ankle` | Pierna |
| 28 | `right_ankle` | Pierna |
| 29 | `left_heel` | Pie |
| 30 | `right_heel` | Pie |
| 31 | `left_foot_index` | Pie |
| 32 | `right_foot_index` | Pie |

### 5.3 Conexiones del esqueleto (POSE_CONNECTIONS)

Se dibujan **35 conexiones** entre landmarks para representar el esqueleto:

```
Cara:     [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10]
Tronco:   [11,12],[11,23],[12,24],[23,24]
Brazo I:  [11,13],[13,15],[15,17],[15,19],[15,21],[17,19]
Brazo D:  [12,14],[14,16],[16,18],[16,20],[16,22],[18,20]
Pierna I: [23,25],[25,27],[27,29],[29,31],[27,31]
Pierna D: [24,26],[26,28],[28,30],[30,32],[28,32]
```

### 5.4 Renderizado visual de landmarks

| Elemento | Estilo |
|---|---|
| Líneas de esqueleto | Blanco semitransparente (`rgba(255,255,255,0.75)`), grosor 2.5px |
| Umbral de visibilidad | Solo se dibujan landmarks con `visibility ≥ 0.3` |
| Puntos de cara (índices 0–10) | Color cian (`#00e5ff`) |
| Puntos de cuerpo (índices 11–32) | Color rojo/naranja (`#ff5252`) |
| Anillo exterior del punto | Negro semitransparente (`rgba(0,0,0,0.5)`), radio +1.5px |
| Nariz (índice 0) | Radio 5px (resto: 4px) |

---

## 6. Pipeline de grabación

```
Cámara física (frontal o trasera)
    │
    ▼
<video> (oculto, playsinline, muted, autoplay)
    │
    ▼ (requestAnimationFrame — bucle propio)
pose.send({ image: videoEl })
    │
    ▼ (onResults callback)
CanvasRenderingContext2D
    ├── drawImage()        ← frame de video (espejado si facingMode='user')
    ├── drawSkeleton()     ← líneas blancas entre conexiones
    └── drawLandmarks()    ← puntos por landmark (visibilidad ≥ 0.3)
    │
    ├── captureFrameMeta() ← metadatos por frame (solo si isRecording === true)
    │
    ▼
canvas.captureStream(30 fps)
    │
    ▼
MediaRecorder (chunks cada 200 ms)
    │
    ▼
Blob[] → Blob final
    │
    ├── [autoSave=true + dirHandle] → File System Access API → archivo en disco
    │                                  → toast "✓ Guardado"
    └── [autoSave=false]            → URL.createObjectURL() → panel de descarga
```

---

## 7. Parámetros de grabación

| Parámetro | Valor |
|---|---|
| Duración máxima | 30 segundos |
| FPS objetivo | 30 fps |
| Resolución interna del canvas | 640 × 480 px |
| Frecuencia de chunks | 200 ms |
| Cámara por defecto | Trasera (`facingMode: 'environment'`) |
| Cámara alternativa | Frontal (`facingMode: 'user'`) — seleccionable con botón flip |
| Audio | Desactivado |
| Espejado | Solo cuando `facingMode === 'user'` (cámara frontal) |

### 7.1 Formato de video (selección dinámica)

El formato se selecciona en tiempo de ejecución según soporte del navegador:

| Prioridad | MIME type | Extensión | Navegadores |
|---|---|---|---|
| 1 | `video/mp4;codecs=avc1` | `.mp4` | Chrome, Edge, iOS Safari 15+ |
| 2 | `video/mp4` | `.mp4` | Fallback MP4 |
| 3 | `video/webm;codecs=vp9` | `.webm` | Firefox, Chrome |
| 4 | `video/webm;codecs=vp8` | `.webm` | Fallback WebM |
| 5 | `video/webm` | `.webm` | Fallback genérico |

---

## 8. Guardado de archivos

### 8.1 Modo manual (por defecto)

Al finalizar la grabación se muestra el panel de descarga con botones individuales para video y metadatos. Los archivos se descargan mediante `URL.createObjectURL()` + `<a download>`.

### 8.2 Modo auto-guardado (File System Access API)

El usuario puede seleccionar una carpeta local mediante `window.showDirectoryPicker()` y activar el toggle "Auto". Cuando está activo:

1. Al finalizar la grabación se solicita permiso de escritura (`readwrite`) sobre el `FileSystemDirectoryHandle`.
2. Se escriben ambos archivos directamente en la carpeta sin diálogo de descarga.
3. Se muestra un toast de confirmación ("✓ Guardado") durante 1,2 segundos.
4. Si el permiso ha sido revocado, se degrada automáticamente a descarga estándar.

| Elemento | Descripción |
|---|---|
| `dirBtn` | Botón para seleccionar carpeta; muestra el nombre una vez seleccionada |
| `autoSaveToggle` | Toggle checkbox; activa el auto-guardado (requiere carpeta seleccionada) |
| Fallback | Si el navegador no soporta `showDirectoryPicker`, muestra error en barra de estado |

---

## 9. Estructura del fichero de metadatos (JSON)

**Nombre del archivo:** `pose_<id>_metadata.json`

```json
{
  "recording": {
    "id": "rec_20260312_143022_ab3x7",
    "date": "2026-03-12T14:30:22.000Z",
    "duration_seconds": 12.34,
    "fps": 28.5,
    "resolution": {
      "width": 640,
      "height": 480
    },
    "device": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
    "platform": "mobile",
    "video_mime": "video/mp4;codecs=avc1"
  },
  "frames": [
    {
      "frame_index": 0,
      "timestamp_ms": 0.00,
      "landmarks": [
        {
          "index": 0,
          "name": "nose",
          "x": 0.512,
          "y": 0.318,
          "z": -0.087,
          "visibility": 0.998
        }
        // ... 33 landmarks por frame
      ]
    }
    // ... N frames
  ]
}
```

### 9.1 Descripción de campos

#### Bloque `recording`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificador único basado en fecha/hora + sufijo aleatorio |
| `date` | `string` | Fecha y hora de fin de grabación en formato ISO 8601 |
| `duration_seconds` | `number` | Duración real de la grabación en segundos (2 decimales) |
| `fps` | `number` | FPS medio real = `total_frames / duration_seconds` |
| `resolution.width` | `number` | Anchura del canvas en píxeles |
| `resolution.height` | `number` | Altura del canvas en píxeles |
| `device` | `string` | `navigator.userAgent` del dispositivo |
| `platform` | `string` | `"mobile"` o `"desktop"` |
| `video_mime` | `string` | MIME type efectivo utilizado por MediaRecorder |

#### Bloque `frames[]`

| Campo | Tipo | Descripción |
|---|---|---|
| `frame_index` | `integer` | Índice secuencial del frame (desde 0) |
| `timestamp_ms` | `number` | Tiempo relativo desde el inicio de grabación en ms (2 decimales) |
| `landmarks[]` | `array` | Array de 33 objetos landmark |

#### Objeto `landmark`

| Campo | Tipo | Descripción |
|---|---|---|
| `index` | `integer` | Índice del landmark (0–32) |
| `name` | `string` | Nombre semántico del landmark |
| `x` | `number` | Coordenada X normalizada [0.0, 1.0] (origen: borde izquierdo) |
| `y` | `number` | Coordenada Y normalizada [0.0, 1.0] (origen: borde superior) |
| `z` | `number` | Profundidad estimada relativa a la cadera (negativo = más cerca) |
| `visibility` | `number` | Confianza de visibilidad [0.0, 1.0] |

> Las coordenadas en el JSON son siempre las **crudas de MediaPipe** (no espejadas), independientemente del modo de cámara activo.

---

## 10. Compatibilidad con plataformas móviles

### 10.1 Medidas específicas implementadas

| Medida | Justificación |
|---|---|
| `playsinline` en `<video>` | Evita pantalla completa automática en iOS Safari |
| `muted` en `<video>` | Requerido por las políticas de autoplay de iOS |
| `autoplay` en `<video>` | Inicia el stream sin interacción del usuario |
| `user-scalable=no` en viewport | Evita zoom accidental al interactuar con la UI |
| `-webkit-tap-highlight-color: transparent` | Elimina el resaltado al pulsar en iOS |
| `touch-action: manipulation` | Elimina el retardo de 300ms en tap en móvil |
| `env(safe-area-inset-bottom)` | Adapta la barra inferior al notch/home-bar de iPhone |
| `max-scale=1.0` en viewport | Previene zoom involuntario |

### 10.2 Compatibilidad de navegadores

| Navegador | Plataforma | Estado | Auto-guardado |
|---|---|---|---|
| Chrome 90+ | Android | Soportado | Sí (File System Access API) |
| Safari 15+ | iOS | Soportado (MP4 con H.264) | No |
| Firefox 90+ | Android | Soportado (WebM) | No |
| Chrome 90+ | Desktop | Soportado | Sí |
| Safari 15+ | macOS | Soportado | No |
| Edge 90+ | Desktop | Soportado | Sí |

> **Requisito:** La aplicación debe servirse bajo **HTTPS** (o `localhost`) para que `getUserMedia()` funcione en dispositivos móviles.

---

## 11. Diseño de interfaz (UI)

### 11.1 Principios de diseño

- Minimalista e intuitiva
- Mobile-first
- Idioma: **español**

### 11.2 Paleta de colores

| Variable CSS | Valor | Uso |
|---|---|---|
| `--bg` | `#0d0d0d` | Fondo principal |
| `--surface` | `#1a1a1a` | Superficies de componentes |
| `--surface2` | `#242424` | Superficies secundarias |
| `--border` | `#333333` | Bordes y separadores |
| `--text` | `#f0f0f0` | Texto principal |
| `--text-dim` | `#888888` | Texto secundario |
| `--accent` | `#e53935` | Acción principal (grabación) |
| `--accent-dark` | `#b71c1c` | Estado activo del acento |
| `--accent-glow` | `rgba(229,57,53,0.4)` | Halo del botón durante grabación |
| `--green` | `#43a047` | Estado OK / listo / toggle activo |
| `--blue` | `#1e88e5` | Carpeta seleccionada |

### 11.3 Tipografía

Sistema de fuentes nativo:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### 11.4 Componentes de la UI

| Componente | Descripción |
|---|---|
| Canvas a pantalla completa | Vista previa de cámara con landmarks superpuestos |
| Barra de estado (top) | Mensajes de estado de la aplicación |
| Punto parpadeante (REC) | Indicador visual de grabación activa (esquina superior derecha) |
| Barra de progreso | Relleno porcentual según tiempo transcurrido |
| Fila de configuración | Selector de carpeta (`dirBtn`) + toggle auto-guardado (`autoSaveToggle`) |
| Botón de grabación (bottom) | Círculo rojo; se transforma a cuadrado al grabar |
| Indicador de tiempo | Formato `M:SS / 0:30` |
| Botón de volteo de cámara | Icono SVG de flechas circulares; alterna entre cámara trasera y frontal |
| Toast de confirmación | Notificación temporal al guardar automáticamente |
| Panel de descarga | Aparece al finalizar; muestra estadísticas y botones de descarga |
| Overlay de carga | Pantalla de inicialización con spinner y mensaje de estado |
| Pantalla de error | Mostrada si la cámara no está disponible, con opción de reintento |

---

## 12. Estructura de archivos del proyecto

```
poseDetection/
├── index.html              ← Aplicación completa (único archivo)
└── TECHNICAL_SPECS.md      ← Este documento
```

---

## 13. Ejecución en desarrollo

Para ejecutar la aplicación localmente con soporte de cámara en dispositivos móviles se requiere un servidor HTTPS. Opciones rápidas:

```bash
# Opción 1: npx serve (HTTP, válido para localhost en desktop)
npx serve .

# Opción 2: Python con HTTP (solo desktop/localhost)
python -m http.server 8080

# Opción 3: Con HTTPS para móvil (usando mkcert o similar)
npx local-ssl-proxy --source 8443 --target 8080
```

> Para pruebas en dispositivo móvil real se recomienda usar **ngrok** u otra solución de túnel HTTPS, o desplegar en cualquier hosting estático con HTTPS (GitHub Pages, Netlify, Vercel, etc.).

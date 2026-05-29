# Diagnóstico del proyecto — poseDetection

> Fecha de análisis: 2026-05-29
> Archivo analizado: `index.html` (1 617 líneas), `sw.js`, `manifest.json`

---

## 1. Tecnología

| Capa | Qué se usa |
|------|-----------|
| Lenguaje | HTML5 · CSS3 · JavaScript ES2020+ (`'use strict'`) |
| UI | Vanilla JS — sin framework |
| Detección de pose | MediaPipe Pose vía CDN jsDelivr (`@mediapipe/pose@latest`) |
| Grabación | `MediaRecorder` + `canvas.captureStream()` |
| Almacenamiento | File System Access API (`showDirectoryPicker`) / descarga manual |
| Offline | Service Worker (cache-first) + `manifest.json` (PWA) |
| Build | Ninguno. Fichero único desplegable directamente. |

La elección tecnológica es coherente con el objetivo: una herramienta de campo,
sin infraestructura de servidor, instalable como PWA en móvil.

---

## 2. Estructura de carpetas

```
poseDetection/
├── index.html          ← Toda la aplicación (HTML + CSS + JS, 1 617 líneas)
├── index_v1.html       ← Copia de seguridad manual de una versión anterior
├── sw.js               ← Service Worker (caché offline, 61 líneas, limpio)
├── manifest.json       ← Manifiesto PWA (correcto)
├── ESPECIFICACIONES.md ← Especificación funcional
├── TECHNICAL_SPECS.md  ← Especificación técnica (duplica parte del anterior)
├── diagnosis.md        ← Este documento
├── AGENTS.md           ← Instrucciones para el agente
└── descargas/          ← Grabaciones locales (datos, no fuente)
```

**Observaciones:**
- `index_v1.html` es control de versiones manual. Debería estar en git y eliminarse.
- `ESPECIFICACIONES.md` y `TECHNICAL_SPECS.md` se solapan en varios apartados;
  conviene unificarlos o establecer responsabilidades distintas.

---

## 3. Pantallas principales

La aplicación no tiene routing. Es una sola vista con cuatro **estados visuales**
gestionados mediante clases CSS (`visible` / `hidden`):

| Estado | Elemento DOM | Cuándo aparece |
|--------|-------------|---------------|
| Carga inicial | `#loadingOverlay` | Durante init de cámara y modelo |
| Error de permisos | `#permError` | Cámara denegada o sin conexión |
| Grabación activa | canvas + `#bottomBar` | Estado normal de uso |
| Panel de descarga | `#downloadPanel` | Tras finalizar la grabación |

No existe una máquina de estados explícita: las transiciones se controlan con
`classList.add/remove` dispersos en múltiples funciones.

---

## 4. Componentes

No hay componentes en el sentido técnico. El comportamiento está organizado en
**funciones agrupadas por sección** dentro del `<script>`:

| Sección | Funciones clave |
|---------|----------------|
| Constantes | `LANDMARK_NAMES`, `POSTURE_NAMES`, `POSE_CONNECTIONS` |
| Refs DOM | 25 constantes globales de elementos del DOM |
| Estado global | 18 variables `let` sueltas |
| Helpers | `formatTime`, `generateId`, `generateFileName`, `isMobile`, `getSupportedMimeType` |
| Canvas / dibujo | `drawFrame`, `drawSkeleton`, `drawLandmarks`, `mx` |
| Captura de metadatos | `captureFrameMeta` |
| Cámara | `startCamera`, `startCameraLoop`, `stopCameraLoop`, `restartCameraIfNeeded`, `switchCamera` |
| Grabación | `startRecording`, `stopRecording`, `updateTimer`, `onRecordingStop` |
| Guardado | `saveFilesToDirectory`, `downloadBlob`, `pickDirectory`, `showToast` |
| UI / transiciones | `showDownloadPanel`, `hideDownloadPanel`, `showPermError`, `resetForNextRecording` |
| Arranque | `initApp`, IIFEs de boot |

La organización es comprensible para el tamaño actual, pero todas las funciones
comparten el mismo scope global y acceden libremente al estado compartido.

---

## 5. Datos mezclados con la UI

Hay **dos fuentes de verdad para las posturas**:

- `POSTURE_NAMES` (JS, línea 777): objeto `{1: 'tiro_libre', ..., 7: 'bandeja'}`.
- `<select id="postureSelect">` (HTML, líneas 651–660): opciones hard-codeadas
  con los mismos valores textuales.

Si se añade una postura nueva hay que editar ambos lugares. Si se desincronizán,
el JSON exportado tendrá `posture_name: null` para la postura nueva, silenciosamente.

Adicionalmente, `generateFileName` lee directamente del DOM (`dorsalSelect.value`,
`postureSelect.value`), acoplando la lógica de nombrado de ficheros a los elementos
de la interfaz.

---

## 6. Lógica difícil de reutilizar

### `onRecordingStop` hace demasiado (líneas 1228–1299)
Una sola función construye el JSON de metadatos, decide la ruta de guardado
(auto-save en carpeta / auto-descarga / panel manual), actualiza la UI y dispara
las descargas. Cualquier cambio en el formato de salida o en las opciones de guardado
toca esta función.

### Estado global plano (18 variables `let`, líneas 832–849)
Variables como `isRecording`, `cameraReady`, `frameData`, `recordedChunks`,
`videoBlob`, `metaJson`, etc. son accesibles y mutables desde cualquier función.
Las condiciones de carrera entre operaciones asíncronas (cambio de cámara,
reinicio, parada de grabación) se mitigan con flags booleanos, pero son frágiles
y difíciles de razonar.

### `captureFrameMeta` acoplada al estado global
Lee `isRecording`, `recordingStart` y escribe en `frameData` y `frameIndex`
directamente. No puede probarse ni reutilizarse sin el contexto global completo.

### Detección de plataforma dispersa
`isMobile()` se llama en cuatro puntos distintos del código. La lógica de qué
hacer en iOS vs. Android vs. escritorio está repartida entre `onRecordingStop`,
`showDownloadPanel` y `saveFilesToDirectory`.

---

## 7. Riesgos para seguir evolucionando

### R1 — Dependencias sin versión fija (alto)
Las tres librerías MediaPipe y el SW las cargan como `@latest`. Una actualización
de MediaPipe podría romper la API silenciosamente. El SW cachearía la versión rota
y el usuario no podría recuperarse sin borrar la caché manualmente.

### R2 — Fichero único de 1 617 líneas (medio)
Añadir nuevas funcionalidades (análisis de grabaciones, exportación a CSV, gestión
de sesiones) hará que el fichero sea difícil de navegar y de revisar en PR. Ya está
cerca del límite recomendado en `AGENTS.md`.

### R3 — Doble fuente de verdad para posturas (medio)
Descrito en §5. Silencioso y fácil de olvidar al añadir nuevos movimientos.

### R4 — Sin tests automatizables (medio)
Toda la lógica depende del DOM y del estado global. No es posible escribir tests
unitarios sin refactorizar primero para separar lógica pura de efectos de UI.

### R5 — `index_v1.html` como control de versiones (bajo)
Indica que el proyecto no tiene historial git. Sin git, cualquier cambio
destructivo es irrecuperable.

### R6 — Ausencia de manejo de errores en medio de grabación (bajo-medio)
Si MediaPipe falla durante una grabación activa (timeout de WASM, pérdida de
contexto WebGL), la grabación continúa pero `frameData` queda incompleto sin
ninguna alerta al usuario.

---

## Propuesta de siguientes pasos

Los pasos están ordenados por impacto/coste. Los tres primeros son de bajo riesgo
y alta ganancia; los siguientes preparan el terreno para crecer.

### Paso 1 — Inicializar git y eliminar `index_v1.html`
Fundación antes de cualquier cambio. Hacer `git init`, primer commit con el estado
actual, y borrar `index_v1.html` (su contenido queda en el historial).

### Paso 2 — Fijar versiones de las librerías MediaPipe en el CDN
Reemplazar `@mediapipe/pose@latest` por la versión exacta actual (p. ej.
`@mediapipe/pose@0.5.1675469404`) en `index.html` y en el `PRE_CACHE` de `sw.js`.
Evita roturas silenciosas ante actualizaciones del paquete.

### Paso 3 — Unificar la fuente de verdad de las posturas
Eliminar las opciones hard-codeadas del `<select>` en el HTML y generarlas
dinámicamente desde `POSTURE_NAMES` en el arranque, igual que ya se hace con
los dorsales. Una sola edición para añadir/modificar una postura.

### Paso 4 — Agrupar el estado en un objeto
Reemplazar las 18 variables `let` sueltas por un único objeto `state = { … }`.
Facilita razonar sobre qué función lo modifica y abre la puerta a implementar
transiciones explícitas.

### Paso 5 — Extraer `onRecordingStop` en tres funciones con responsabilidad única
Separar: (a) construcción del objeto `metaJson`, (b) decisión de ruta de guardado,
(c) actualización de la UI. Hace que cada parte sea comprobable y modificable de
forma independiente.

### Paso 6 — Unificar los documentos de especificación
Fusionar `ESPECIFICACIONES.md` y `TECHNICAL_SPECS.md` en un único documento
de referencia, eliminando la duplicación que puede generar inconsistencias.

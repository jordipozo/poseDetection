# Hoja de ruta — poseDetection

> Basada en el diagnóstico del 2026-05-29.
> Las tareas están ordenadas para que cada fase deje el proyecto en un estado
> funcional y desplegable antes de comenzar la siguiente.
> No implementar varias fases en paralelo.

---

## Fase 1 — Estabilización del proyecto

### T1.1 · Limpiar el repositorio git

**Objetivo:** Que el repositorio contenga solo código fuente, no artefactos ni
versiones manuales, y que el historial refleje el estado real del proyecto.

**Pasos:**
1. Eliminar `index_v1.html` (su contenido ya está en el commit inicial de git).
2. Añadir al `.gitignore`:
   - `descargas/` — grabaciones generadas en ejecución.
   - `*.mp4`, `*.webm`, `*.pptx` — binarios grandes.
   - `*.pyc`, `__pycache__/` — si se añaden scripts Python en el futuro.
3. Hacer `git rm --cached` sobre los ficheros ya rastreados que deben ignorarse.
4. Commit: `chore: limpieza inicial del repositorio`.

**Criterio de terminado:**
- `git status` en rama limpia no muestra `index_v1.html` ni ficheros de `descargas/`.
- `.gitignore` cubre los patrones anteriores.

**Riesgo principal:** Ninguno relevante. `index_v1.html` ya tiene copia en git.

---

### T1.2 · Fijar versiones de las dependencias CDN

**Objetivo:** Garantizar que la aplicación no se rompe ante una actualización
de MediaPipe publicada en npm/jsDelivr.

**Pasos:**
1. Consultar la versión exacta de `@mediapipe/pose` actualmente servida por
   jsDelivr (p. ej. `0.5.1675469404`).
2. Sustituir `@latest` por la versión exacta en las tres etiquetas `<script>`
   de `index.html`:
   ```html
   <!-- antes -->
   <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js">
   <!-- después -->
   <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js">
   ```
3. Hacer lo mismo con la URL usada en `initPose()` (`locateFile`).
4. Actualizar el array `PRE_CACHE` de `sw.js` con las mismas URLs versionadas.
5. Incrementar el nombre de la caché del SW (`pose-v1` → `pose-v2`) para forzar
   que los usuarios reciban las URLs nuevas.

**Criterio de terminado:**
- Ninguna URL en `index.html` ni en `sw.js` contiene `@latest`.
- La app arranca y detecta pose correctamente en Chrome y Safari móvil.

**Riesgo principal:** La versión fijada puede quedar desactualizada si MediaPipe
lanza mejoras de precisión o rendimiento. Revisión semestral recomendada.

---

### T1.3 · Eliminar dependencias CDN no utilizadas

**Objetivo:** Reducir el tiempo de carga inicial y el tamaño de la caché del SW
eliminando librerías que se cargan pero no se invocan.

**Pasos:**
1. Eliminar las etiquetas `<script>` de `camera_utils.js` y `drawing_utils.js`
   en `index.html`.
2. Eliminar esas mismas URLs del array `PRE_CACHE` en `sw.js`.
3. Verificar que no hay ninguna llamada a `drawConnectors`, `drawLandmarks`
   (de la librería), `Camera` ni similar en el código JS (el renderizado es manual).

**Criterio de terminado:**
- Solo se carga `pose.js` desde CDN.
- La app arranca, la cámara funciona y el esqueleto se dibuja correctamente.
- Las herramientas de red del navegador no muestran peticiones a
  `camera_utils.js` ni `drawing_utils.js`.

**Riesgo principal:** Bajo. El código no usa esas librerías; eliminarlas no
puede romper funcionalidad existente.

---

### T1.4 · Completar el manifiesto PWA con iconos

**Objetivo:** Que la aplicación sea instalable correctamente como PWA en la
pantalla de inicio del móvil, cumpliendo el caso de uso de herramienta de campo.

**Pasos:**
1. Crear o exportar al menos dos iconos PNG:
   - `docs/icons/icon-192.png` (192×192 px)
   - `docs/icons/icon-512.png` (512×512 px)
2. Moverlos a una ruta accesible desde la raíz del servidor (p. ej. `icons/`).
3. Declarar los iconos en `manifest.json`:
   ```json
   "icons": [
     { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
     { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
   ]
   ```
4. Añadir las URLs de los iconos al `PRE_CACHE` del SW.

**Criterio de terminado:**
- Chrome DevTools → Application → Manifest no muestra advertencias de iconos.
- En Android, "Añadir a pantalla de inicio" muestra el icono correcto.

**Riesgo principal:** El diseño del icono debe ser reconocible en tamaño pequeño
y compatible con el fondo oscuro de la app.

---

## Fase 2 — Arquitectura y estructura de carpetas

### T2.1 · Definir y crear la estructura de carpetas objetivo

**Objetivo:** Establecer la organización de ficheros que permita separar la
aplicación en partes independientes en fases posteriores, sin romper nada aún.

**Pasos:**
1. Crear la siguiente estructura de directorios (vacíos inicialmente):
   ```
   poseDetection/
   ├── src/
   │   ├── app/          ← arranque, inicialización, event listeners globales
   │   ├── features/
   │   │   ├── camera/   ← startCamera, switchCamera, restartCamera
   │   │   ├── pose/     ← initPose, drawFrame, drawSkeleton, drawLandmarks
   │   │   ├── recording/← startRecording, stopRecording, onRecordingStop
   │   │   └── storage/  ← pickDirectory, saveFilesToDirectory, downloadBlob
   │   ├── shared/       ← helpers puros: formatTime, generateId, isMobile…
   │   └── data/         ← LANDMARK_NAMES, POSTURE_NAMES, POSE_CONNECTIONS
   ├── tests/            ← tests unitarios (Fase 6)
   ├── icons/            ← iconos PWA
   ├── docs/             ← documentación (este fichero, diagnosis.md…)
   ├── index.html        ← punto de entrada (permanece en raíz)
   ├── sw.js
   └── manifest.json
   ```
2. Añadir un `README.md` mínimo en la raíz que describa la estructura.
3. No mover código aún — solo crear los directorios con un `.gitkeep` cada uno.

**Criterio de terminado:**
- La estructura existe en el repositorio.
- `index.html` sigue funcionando exactamente igual que antes.
- El equipo (o el agente) puede referenciar rutas destino al planificar
  las fases siguientes.

**Riesgo principal:** Ninguno. Solo se crean directorios vacíos.

---

### T2.2 · Separar los datos de dominio en `src/data/`

**Objetivo:** Que las constantes de dominio (`LANDMARK_NAMES`, `POSTURE_NAMES`,
`POSE_CONNECTIONS`) tengan un único lugar canónico, independiente de la UI.

**Pasos:**
1. Crear `src/data/landmarks.js` con `LANDMARK_NAMES` y `POSE_CONNECTIONS`.
2. Crear `src/data/postures.js` con `POSTURE_NAMES`.
3. Exportarlos con módulos ES (`export const …`).
4. En `index.html`, reemplazar las declaraciones inline por:
   ```html
   <script type="module" src="src/data/landmarks.js"></script>
   <script type="module" src="src/data/postures.js"></script>
   ```
   o importarlos desde el script principal cuando se adopte `type="module"`.
5. Verificar que la app sigue funcionando y que el JSON exportado mantiene
   exactamente los mismos nombres de campos.

**Criterio de terminado:**
- `LANDMARK_NAMES`, `POSTURE_NAMES` y `POSE_CONNECTIONS` no aparecen definidas
  en `index.html`.
- El JSON de metadatos generado es idéntico al anterior.

**Riesgo principal:** Cambiar a `type="module"` puede romper el Service Worker
si las rutas no están correctamente cacheadas. Actualizar `PRE_CACHE` en `sw.js`.

---

## Fase 3 — Separación de componentes

### T3.1 · Extraer los helpers puros a `src/shared/`

**Objetivo:** Aislar las funciones que no dependen del DOM ni del estado global
para que sean testables de forma unitaria.

**Funciones a mover:** `formatTime`, `generateId`, `generateFileName`,
`isMobile`, `getSupportedMimeType`, `fileExtFromMime`.

**Pasos:**
1. Crear `src/shared/utils.js`.
2. Mover las funciones anteriores a ese fichero y exportarlas.
3. Adaptar `generateFileName` para que reciba `dorsalValue` y `postureValue`
   como parámetros en lugar de leer del DOM directamente.
4. Importar y usar desde `index.html` (o desde el módulo principal).
5. Verificar que la generación de nombres de fichero sigue siendo correcta
   en todos los modos (con dorsal+postura, sin ellos).

**Criterio de terminado:**
- Ninguna de las funciones listadas está definida en `index.html`.
- `generateFileName` no referencia `document.getElementById`.
- Los nombres de fichero generados son idénticos a los anteriores.

**Riesgo principal:** Bajo. Son funciones puras sin efectos secundarios.

---

### T3.2 · Extraer el módulo de cámara a `src/features/camera/`

**Objetivo:** Encapsular todo el ciclo de vida de la cámara en un módulo con
interfaz clara, separado de la lógica de grabación y de la UI.

**Funciones a mover:** `startCamera`, `startCameraLoop`, `stopCameraLoop`,
`restartCameraIfNeeded`, `switchCamera`.

**Pasos:**
1. Crear `src/features/camera/camera.js`.
2. Mover las funciones anteriores; hacerlas recibir por parámetro las
   dependencias que necesitan (`videoEl`, `poseModel`, callbacks de estado)
   en lugar de leer variables globales.
3. Exponer una API mínima: `initCamera()`, `switchCamera()`, `stopCamera()`.
4. Actualizar `index.html` (o `app.js`) para usar la nueva API.
5. Probar cambio de cámara, reinicio tras visibilidad y reinicio tras error.

**Criterio de terminado:**
- `index.html` no contiene ninguna de las funciones listadas.
- El módulo no referencia variables globales (`poseModel`, `isRecording`,
  `cameraReady`) directamente; las recibe o devuelve por interfaz.
- Cambio de cámara y reinicio automático funcionan en Chrome móvil.

**Riesgo principal:** El módulo de cámara y el de grabación comparten
`canvas` y `videoEl`. Definir claramente qué módulo es propietario de cada
elemento antes de empezar.

---

### T3.3 · Extraer el módulo de pose a `src/features/pose/`

**Objetivo:** Aislar la inicialización de MediaPipe y todo el renderizado del
esqueleto en un módulo independiente.

**Funciones a mover:** `initPose`, `drawFrame`, `drawSkeleton`, `drawLandmarks`,
`mx` (helper de espejado), `captureFrameMeta`.

**Pasos:**
1. Crear `src/features/pose/pose.js`.
2. `captureFrameMeta` debe recibir `recordingStart` y devolver el objeto de frame
   en lugar de escribir en `frameData` global.
3. `drawFrame` y sus auxiliares deben recibir `ctx`, `canvas`, `facingMode`
   como parámetros.
4. Exponer: `initPose()`, `sendFrame(image)`, `getLastFrame()`.
5. Verificar que el JSON exportado mantiene la misma estructura de landmarks.

**Criterio de terminado:**
- Ninguna función de dibujo ni de captura de metadatos está definida en `index.html`.
- El JSON generado es byte-a-byte equivalente al anterior para la misma grabación.

**Riesgo principal:** `captureFrameMeta` actualmente escribe en `frameData` global.
Cambiar a modelo de retorno de valor puede requerir ajustar el bucle RAF.

---

### T3.4 · Extraer el módulo de grabación a `src/features/recording/`

**Objetivo:** Desacoplar la lógica de grabación (MediaRecorder, timer, chunks)
de la UI y del guardado.

**Funciones a mover:** `startRecording`, `stopRecording`, `updateTimer`,
`onRecordingStop` (solo la parte de construcción del blob y del JSON).

**Pasos:**
1. Crear `src/features/recording/recorder.js`.
2. El módulo expone: `startRecording(canvas, options)`, `stopRecording()`,
   un callback `onStop(videoBlob, metaJson)`.
3. La decisión de qué hacer tras la grabación (guardar, descargar, mostrar panel)
   queda fuera de este módulo; la maneja `app.js` mediante el callback.
4. El timer y la barra de progreso se actualizan mediante eventos o callbacks,
   no accediendo al DOM directamente desde el módulo.

**Criterio de terminado:**
- `startRecording` y `stopRecording` no referencian `document.getElementById`.
- El módulo no importa nada de `src/features/camera/` ni de `src/features/storage/`.
- Una grabación completa genera el mismo vídeo y JSON que antes.

**Riesgo principal:** Alto acoplamiento actual con el estado global. Esta es
la extracción más delicada; conviene hacerla después de T3.2 y T3.3.

---

### T3.5 · Extraer el módulo de guardado a `src/features/storage/`

**Objetivo:** Centralizar todas las rutas de persistencia en un módulo con
interfaz uniforme.

**Funciones a mover:** `pickDirectory`, `saveFilesToDirectory`, `downloadBlob`,
`supportsDirectoryPicker`.

**Pasos:**
1. Crear `src/features/storage/storage.js`.
2. Exponer: `pickDirectory()`, `save(videoBlob, metaJson, baseName, ext)`.
3. `save` encapsula internamente la decisión entre File System Access API
   y descarga por `<a>`, según `dirHandle` y `isMobile()`.
4. Actualizar `app.js` para llamar a `save` en el callback de fin de grabación.

**Criterio de terminado:**
- Ninguna función de guardado está definida en `index.html`.
- Los tres modos de guardado (carpeta, auto-descarga, panel manual) funcionan
  igual que antes en Chrome y Safari.

**Riesgo principal:** La lógica de qué modo de guardado usar en iOS vs. escritorio
debe trasladarse íntegra; no perder ninguna rama del condicional.

---

## Fase 4 — Separación de datos y lógica

### T4.1 · Unificar la fuente de verdad de las posturas

**Objetivo:** Eliminar la duplicación entre `POSTURE_NAMES` (JS) y las opciones
hard-codeadas del `<select>` en el HTML.

**Pasos:**
1. Eliminar las `<option>` de `#postureSelect` en el HTML (dejar solo la opción
   vacía por defecto).
2. En el IIFE de arranque (junto al de dorsales), generar las opciones
   dinámicamente iterando sobre `POSTURE_NAMES`:
   ```js
   Object.entries(POSTURE_NAMES).forEach(([code, name]) => {
     const opt = document.createElement('option');
     opt.value = code;
     opt.textContent = `${code} · ${name.replace('_', ' ')}`;
     postureSelect.appendChild(opt);
   });
   ```
3. Verificar que el selector muestra exactamente las mismas opciones que antes
   y que el JSON exportado contiene `posture_code` y `posture_name` correctos.

**Criterio de terminado:**
- `POSTURE_NAMES` es la única fuente de verdad para los valores de postura.
- Añadir una nueva postura a `POSTURE_NAMES` la hace aparecer automáticamente
  en el selector sin tocar el HTML.
- El JSON exportado contiene los valores correctos para todas las posturas.

**Riesgo principal:** El texto visible de la opción (`"1 · Tiro libre"`) debe
mantenerse igual para no confundir a los usuarios actuales.

---

### T4.2 · Agrupar el estado global en un objeto `state`

**Objetivo:** Reemplazar las 18 variables `let` sueltas por un único objeto
que centralice el estado mutable de la aplicación.

**Pasos:**
1. Definir un objeto con todas las variables de estado actuales:
   ```js
   const state = {
     poseModel      : null,
     animFrameId    : null,
     mediaRecorder  : null,
     recordedChunks : [],
     isRecording    : false,
     recordingStart : 0,
     frameIndex     : 0,
     frameData      : [],
     timerInterval  : null,
     autoStopTimeout: null,
     videoBlob      : null,
     metaJson       : null,
     canvasStream   : null,
     mimeType       : '',
     cameraReady    : false,
     currentFacingMode: 'environment',
     dirHandle      : null,
     autoSave       : false,
   };
   ```
2. Reemplazar todas las referencias a las variables sueltas por `state.X`
   en todo el script.
3. Verificar que los flujos de grabación, cambio de cámara y guardado
   funcionan correctamente.

**Criterio de terminado:**
- No existe ninguna variable `let` de estado suelta fuera del objeto `state`.
- La aplicación funciona igual que antes en todos sus modos.

**Riesgo principal:** Tedioso pero mecánico. El riesgo es dejarse alguna
referencia sin actualizar; un `grep` sobre las variables antiguas lo detecta.

---

## Fase 5 — Configuración de calidad

### T5.1 · Añadir ESLint con reglas mínimas

**Objetivo:** Detectar errores comunes (variables no declaradas, referencias a
variables eliminadas, código inalcanzable) sin imponer un estilo prescriptivo.

**Pasos:**
1. Crear `package.json` mínimo (`npm init -y`).
2. Instalar: `npm install --save-dev eslint`.
3. Crear `.eslintrc.json`:
   ```json
   {
     "env": { "browser": true, "es2020": true },
     "parserOptions": { "ecmaVersion": 2020, "sourceType": "module" },
     "rules": {
       "no-undef": "error",
       "no-unused-vars": "warn",
       "no-unreachable": "error"
     }
   }
   ```
4. Añadir al `package.json`:
   ```json
   "scripts": { "lint": "eslint src/" }
   ```
5. Ejecutar `npm run lint` y corregir todos los errores (no los warnings).

**Criterio de terminado:**
- `npm run lint` no reporta ningún error (solo warnings opcionales).
- `package.json` y `node_modules/` están en `.gitignore`.

**Riesgo principal:** ESLint puede reportar falsos positivos sobre variables
globales de MediaPipe (`Pose`). Añadirlas como `globals` en la configuración.

---

### T5.2 · Añadir un script de comprobación de integridad del JSON exportado

**Objetivo:** Disponer de una validación rápida que confirme que el JSON
generado cumple el contrato de datos (campos obligatorios, tipos, rango de
valores), sin necesidad de abrir el fichero manualmente.

**Pasos:**
1. Crear `src/shared/validateMeta.js` con una función `validateMeta(json)`
   que compruebe:
   - `recording.id` es string no vacío.
   - `recording.duration_seconds` es número positivo.
   - `recording.fps` es número positivo.
   - `frames` es array no vacío.
   - Cada frame tiene `frame_index`, `timestamp_ms` y `landmarks` con 33 entradas.
   - Cada landmark tiene `x`, `y`, `z` en [0, 1] y `visibility` en [0, 1].
2. La función devuelve `{ valid: boolean, errors: string[] }`.
3. Llamar a `validateMeta` en `onRecordingStop` en modo desarrollo (cuando
   `location.hostname === 'localhost'`) y loguear warnings si hay errores.

**Criterio de terminado:**
- `validateMeta` detecta correctamente un JSON truncado o con campos ausentes.
- No añade overhead en producción (solo se ejecuta en localhost).

**Riesgo principal:** Los límites de visibilidad de MediaPipe pueden
ocasionalmente superar [0, 1]. Usar rangos con holgura o solo comprobar tipos.

---

## Fase 6 — Primer test real

### T6.1 · Tests unitarios de `src/shared/utils.js`

**Objetivo:** Verificar con tests automatizados las funciones más críticas para
la integridad de los datos exportados: generación de IDs, nombres de fichero
y formato de tiempo.

**Herramienta propuesta:** Vitest (zero-config, sin bundler complejo) o Jest.

**Pasos:**
1. Instalar: `npm install --save-dev vitest`.
2. Añadir al `package.json`: `"test": "vitest run"`.
3. Crear `tests/shared/utils.test.js` con los siguientes casos:
   - `formatTime(0)` → `'0:00'`
   - `formatTime(30000)` → `'0:30'`
   - `formatTime(90000)` → `'1:30'`
   - `generateId()` empieza por `'rec_'` y tiene longitud > 10.
   - `generateFileName('07', '3')` produce el patrón `07_YYYYMMDDHHMMSS_3`.
   - `generateFileName('', '')` produce un ID genérico que empieza por `'rec_'`.
   - `fileExtFromMime('video/mp4;codecs=avc1')` → `'mp4'`.
   - `fileExtFromMime('video/webm')` → `'webm'`.
4. Crear `tests/shared/validateMeta.test.js` con:
   - JSON válido completo → `{ valid: true, errors: [] }`.
   - JSON sin campo `frames` → `valid: false`.
   - Frame con 32 landmarks en vez de 33 → `valid: false`.

**Criterio de terminado:**
- `npm test` pasa todos los tests en verde.
- La cobertura de `src/shared/utils.js` es del 100 % de líneas.

**Riesgo principal:** `generateFileName` usa `new Date()` internamente; hay
que inyectar la fecha como parámetro (o mockearla) para que el test sea
determinista.

---

## Fase 7 — Mejoras funcionales

### T7.1 · Ampliar la duración máxima de grabación (configurable)

**Objetivo:** Permitir al investigador grabar secuencias más largas que 30 s
sin tener que encadenar grabaciones manualmente.

**Pasos:**
1. Añadir a la UI un selector de duración (p. ej. 15 s / 30 s / 60 s / sin límite)
   junto a los controles existentes.
2. Reemplazar la constante `MAX_DURATION_MS` por una variable que refleje
   la selección del usuario.
3. Actualizar el label del timer (`0:30` → valor dinámico).
4. Persistir la selección en `localStorage` para que se recuerde entre sesiones.

**Criterio de terminado:**
- El usuario puede seleccionar la duración antes de grabar.
- El timer y la barra de progreso reflejan la duración elegida.
- La selección persiste al recargar la página.

**Riesgo principal:** Grabaciones largas producen blobs de vídeo y JSONs grandes.
Advertir al usuario si la duración supera 60 s.

---

### T7.2 · Pantalla de revisión de grabaciones anteriores

**Objetivo:** Permitir al investigador ver en la propia app la lista de
grabaciones guardadas en la carpeta seleccionada, con sus metadatos básicos.

**Pasos:**
1. Añadir un botón "Ver grabaciones" en la UI principal.
2. Al pulsarlo, listar los ficheros `*_metadata.json` de `dirHandle`.
3. Mostrar una tarjeta por grabación con: dorsal, postura, duración, fecha y FPS.
4. Permitir eliminar una grabación (vídeo + JSON) desde la propia app.

**Criterio de terminado:**
- La lista se carga correctamente con los ficheros presentes en la carpeta.
- Eliminar una grabación borra ambos ficheros (vídeo y JSON).
- Solo disponible cuando hay una carpeta seleccionada y el navegador soporta
  File System Access API.

**Riesgo principal:** Requiere permisos de lectura y escritura sobre `dirHandle`.
Los permisos pueden haber expirado entre sesiones; manejar el caso con diálogo.

---

### T7.3 · Exportación de landmarks a CSV

**Objetivo:** Facilitar el análisis posterior en herramientas estadísticas
(R, Python/pandas, Excel) sin necesidad de parsear JSON.

**Pasos:**
1. Añadir al panel de descarga un tercer botón: "Descargar CSV".
2. Construir el CSV con una fila por landmark por fotograma:
   ```
   frame_index,timestamp_ms,landmark_index,name,x,y,z,visibility
   0,45.2,0,nose,0.459,0.484,-1.393,0.9999
   …
   ```
3. Generar el blob CSV en `onRecordingStop` junto al JSON.
4. Incluir el CSV en el auto-guardado en carpeta si está activo.

**Criterio de terminado:**
- El CSV descargado puede importarse correctamente en pandas y Excel.
- El número de filas es exactamente `N_frames × 33`.
- Los valores numéricos son idénticos a los del JSON.

**Riesgo principal:** El CSV puede ser muy grande para grabaciones largas
(30 s × 30 fps × 33 landmarks = 29 700 filas). Aceptable para el uso de
investigación; documentarlo.

---

## Fase 8 — Documentación final

### T8.1 · Unificar la documentación técnica en `docs/SPECS.md`

**Objetivo:** Que exista un único documento de referencia técnica, sin
duplicaciones, que refleje el estado real del código tras todas las fases.

**Pasos:**
1. Crear `docs/SPECS.md` fusionando `ESPECIFICACIONES.md` y `TECHNICAL_SPECS.md`.
2. Estructura propuesta:
   - Descripción general y caso de uso.
   - Arquitectura y estructura de carpetas (actualizada con la de Fase 2).
   - Stack tecnológico y dependencias (con versiones fijas).
   - Pipeline de detección y grabación.
   - Formatos de salida (vídeo, JSON, CSV).
   - Modos de guardado.
   - Compatibilidad de navegadores.
   - Guía de desarrollo local.
3. Eliminar `ESPECIFICACIONES.md` y `TECHNICAL_SPECS.md` de la raíz.
4. Actualizar `AGENTS.md` para referenciar `docs/SPECS.md`.

**Criterio de terminado:**
- Solo existe `docs/SPECS.md` como fuente de verdad técnica.
- `AGENTS.md` apunta a `docs/SPECS.md`.
- No hay información contradictoria entre documentos.

**Riesgo principal:** Al fusionar puede perderse información de uno de los dos
documentos. Revisar sección a sección antes de eliminar los originales.

---

### T8.2 · Escribir el `README.md` de la raíz

**Objetivo:** Que cualquier persona nueva (o el propio investigador meses después)
pueda entender qué hace el proyecto, cómo arrancarlo y cómo contribuir en menos
de 5 minutos.

**Pasos:**
1. Crear `README.md` en la raíz con:
   - Descripción en dos frases.
   - Captura de pantalla o GIF de la app en uso.
   - Requisitos (HTTPS, cámara, navegador).
   - Cómo ejecutar en local (comando mínimo).
   - Estructura de carpetas (resumen).
   - Enlace a `docs/SPECS.md` para profundizar.
   - Licencia.

**Criterio de terminado:**
- Un colaborador externo puede arrancar la app siguiendo solo el README.
- La captura de pantalla refleja la UI real.

**Riesgo principal:** Ninguno técnico. Riesgo de quedarse desactualizado; por
eso se hace al final, cuando la arquitectura ya es estable.

---

## Resumen de fases

| Fase | Nombre | Tareas | Impacto |
|------|--------|--------|---------|
| 1 | Estabilización | T1.1 – T1.4 | Elimina deuda inmediata y riesgos de rotura |
| 2 | Arquitectura | T2.1 – T2.2 | Prepara el terreno para separar sin romper |
| 3 | Componentes | T3.1 – T3.5 | Código modular y navegable |
| 4 | Datos y lógica | T4.1 – T4.2 | Una sola fuente de verdad, estado predecible |
| 5 | Calidad | T5.1 – T5.2 | Red de seguridad antes de añadir funcionalidad |
| 6 | Tests | T6.1 | Primera cobertura automatizada real |
| 7 | Funcionalidad | T7.1 – T7.3 | Mejoras de valor para la investigación |
| 8 | Documentación | T8.1 – T8.2 | Proyecto mantenible a largo plazo |

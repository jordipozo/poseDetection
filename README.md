# poseDetection

PWA de investigación para captura y análisis de pose corporal en movimientos de baloncesto. Graba vídeo con el esqueleto superpuesto y exporta los 33 landmarks por fotograma en JSON y CSV, sin instalación, sin servidor, con soporte offline.

---

## Captura de pantalla

> _Añadir aquí una captura o GIF de la app en uso (canvas con esqueleto, barra de controles inferior)._

---

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| **HTTPS** (o `localhost`) | Obligatorio para acceder a la cámara en móvil |
| **Navegador** | Chrome 90+, Safari 15+, Firefox 90+, Edge 90+ |
| **Cámara** | Obligatoria (frontal o trasera) |
| **Auto-guardado en carpeta** | Solo Chromium (File System Access API) |

---

## Arrancar en local

```bash
# Opción 1 — servidor HTTP simple (suficiente para escritorio / localhost)
npx serve .

# Opción 2 — Python
python -m http.server 8080

# Opción 3 — HTTPS para pruebas en dispositivo móvil real
npx local-ssl-proxy --source 8443 --target 8080
# o desplegar en GitHub Pages / Netlify / Vercel (HTTPS gratuito)
```

Abre `http://localhost:3000` (o el puerto que use el servidor) en Chrome.

---

## Scripts de desarrollo

```bash
npm run lint      # ESLint sobre src/
npm test          # Tests unitarios con Vitest
npm run coverage  # Informe de cobertura
```

---

## Estructura del proyecto

```
poseDetection/
├── index.html              # Punto de entrada de la app
├── sw.js                   # Service Worker (caché offline)
├── manifest.json           # Manifiesto PWA
├── icons/                  # Iconos de la PWA (192 y 512 px)
├── src/
│   ├── app/                # Arranque, inicialización, event listeners
│   ├── features/
│   │   ├── camera/         # Ciclo de vida de la cámara
│   │   ├── pose/           # Detección MediaPipe y renderizado
│   │   ├── recording/      # MediaRecorder, timer, exportación
│   │   └── storage/        # Guardado en carpeta y descarga
│   ├── shared/             # Helpers puros (formatTime, generateId…)
│   └── data/               # Constantes de dominio (LANDMARK_NAMES…)
├── tests/                  # Tests unitarios
└── docs/
    ├── SPECS.md            # Especificaciones técnicas completas
    └── tasks.md            # Hoja de ruta de desarrollo
```

---

## Formatos de salida

Por cada grabación se generan tres ficheros:

| Fichero | Contenido |
|---------|-----------|
| `{dorsal}_{timestamp}_{postura}.mp4` | Vídeo con esqueleto superpuesto |
| `{nombre_base}_metadata.json` | 33 landmarks × fotograma + metadatos de grabación |
| `{nombre_base}_landmarks.csv` | Mismos datos en formato tabular (R, pandas, Excel) |

---

## Documentación técnica

Consulta [`docs/SPECS.md`](docs/SPECS.md) para:
- Arquitectura detallada y módulos
- Pipeline de detección y grabación
- Especificación completa del JSON y CSV
- Modos de guardado
- Compatibilidad de navegadores
- Guía de desarrollo

---

## Licencia

ISC

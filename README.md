# poseDetection

PWA para captura y análisis de poses deportivas con MediaPipe Pose. Funciona en el navegador (Chrome/Safari), sin instalación, con soporte offline.

## Requisitos

- Servidor HTTPS (o `localhost`) — obligatorio para acceder a la cámara.
- Navegador con soporte de cámara y WebAssembly (Chrome 90+, Safari 15+).

## Arrancar en local

```bash
npx serve .
# o cualquier servidor estático sobre HTTPS/localhost
```

## Estructura

```
poseDetection/
├── index.html              # Punto de entrada de la app
├── sw.js                   # Service Worker (caché offline)
├── manifest.json           # Manifiesto PWA
├── icons/                  # Iconos de la PWA
├── src/
│   ├── app/                # Arranque, inicialización, event listeners globales
│   ├── features/
│   │   ├── camera/         # startCamera, switchCamera, restartCamera
│   │   ├── pose/           # initPose, drawFrame, drawSkeleton, drawLandmarks
│   │   ├── recording/      # startRecording, stopRecording, onRecordingStop
│   │   └── storage/        # pickDirectory, saveFilesToDirectory, downloadBlob
│   ├── shared/             # Helpers puros: formatTime, generateId, isMobile…
│   └── data/               # Constantes de dominio: LANDMARK_NAMES, POSTURE_NAMES…
├── tests/                  # Tests unitarios (Fase 6)
└── docs/                   # Documentación técnica
```

Consulta [`docs/tasks.md`](docs/tasks.md) para la hoja de ruta de desarrollo.

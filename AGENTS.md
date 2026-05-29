# AGENTS.md — poseDetection

## Objetivo del proyecto

**poseDetection** es una PWA de investigación doctoral (biomecánica deportiva / baloncesto)
que graba vídeo con detección de pose en tiempo real mediante MediaPipe Pose y exporta los
landmarks como JSON estructurado para su análisis posterior.

El objetivo es mantener una aplicación funcional, fiable en dispositivos móviles y fácil de
evolucionar sin introducir complejidad innecesaria.

---

## Arquitectura: restricciones no negociables

- La aplicación es **100 % client-side**. No se añadirá ningún servidor, backend ni base
  de datos.
- Todo el código de producción reside en **`index.html`** (un único fichero). No hay bundler,
  npm ni proceso de compilación. Esta decisión es intencional y no debe revertirse.
- Las dependencias externas se cargan exclusivamente desde **jsDelivr CDN**. No se instalan
  paquetes localmente.
- `sw.js` y `manifest.json` son archivos auxiliares de la PWA; no contienen lógica de negocio.

---

## Reglas de trabajo

- **Antes de cambiar código**, lee `index.html` y los documentos de especificaciones
  (`ESPECIFICACIONES.md`, `TECHNICAL_SPECS.md`) para entender el estado actual.
- Haz cambios pequeños y fáciles de revisar. Un cambio = una responsabilidad.
- No elimines funcionalidad existente sin explicarlo explícitamente en la respuesta.
- Mantén el fichero `index.html` por debajo de ~1 000 líneas cuando sea razonable.
  Si crece más, propón una refactorización antes de continuar.
- Respeta la separación interna ya establecida dentro de `index.html`:
  `<style>` → estilos, `<body>` → estructura DOM, `<script>` → lógica.
- El idioma de la UI es **español**. Etiquetas, mensajes de estado, toasts y textos
  visibles al usuario deben estar en español.
- Los identificadores JS, nombres de variables y constantes pueden estar en inglés o
  español; sé consistente con la convención que ya usa el código circundante.
- Actualiza `ESPECIFICACIONES.md` si cambian comandos, parámetros, estructura de datos
  o comportamiento observable.

---

## Convenciones técnicas

### JavaScript

- Modo estricto activo (`'use strict'`). No lo elimines.
- ES2020+ (arrow functions, async/await, optional chaining). Sin transpilación.
- Las constantes de configuración (`MAX_DURATION_MS`, `TARGET_FPS`, `CANVAS_W`,
  `CANVAS_H`, etc.) están agrupadas al inicio del bloque `<script>`. Añade nuevas
  constantes en esa misma sección.
- El estado global de la aplicación (`isRecording`, `frameData`, `dirHandle`, etc.)
  está declarado de forma explícita y agrupada. Evita crear estado disperso.

### CSS

- Usa las variables CSS definidas (`--bg`, `--surface`, `--accent`, `--green`, `--blue`,
  `--radius`, `--bar-h`, etc.) en lugar de valores en crudo.
- Tema oscuro obligatorio. No introduzcas estilos de tema claro.
- Diseño mobile-first. Cualquier cambio de UI debe funcionar en pantalla vertical de móvil.
- Respeta las medidas de compatibilidad iOS ya presentes (`playsinline`, `muted`,
  `touch-action`, `safe-area-inset-bottom`, etc.).

### Formato de salida (JSON de metadatos)

- La estructura del JSON exportado (`recording` + `frames[]` + `landmarks[]`) es un
  contrato con el análisis posterior. **No cambies nombres de campos ni tipos** sin
  coordinar explícitamente con el usuario.
- Las coordenadas en el JSON son siempre las crudas de MediaPipe (sin espejar),
  independientemente del modo de cámara activo.

---

## Compatibilidad de navegadores

- Chrome 90+ / Edge 90+ → soporte completo (incluyendo auto-guardado en carpeta).
- Firefox 90+ / Safari 15+ → soporte base sin `showDirectoryPicker`.
- Cualquier cambio debe degradar de forma grácil en navegadores sin File System Access API.
- La aplicación requiere HTTPS (o `localhost`) para `getUserMedia()` en móvil.

---

## Definition of Done

Una tarea está terminada cuando:

- la aplicación sigue funcionando en Chrome móvil y desktop,
- el cambio resuelve exactamente la tarea definida (sin scope creep),
- el código resultante queda igual de claro o más claro que antes,
- el fichero JSON exportado mantiene su estructura y tipos,
- la UI sigue siendo coherente con el tema visual oscuro y en español,
- y queda explicado qué se ha cambiado y por qué.

---

## Lo que NO hacer

- No añadir un servidor, base de datos ni proceso de build.
- No incorporar frameworks (React, Vue, Svelte…). Vanilla JS es la elección deliberada.
- No usar `npm install` ni crear `package.json`.
- No alterar la estructura del JSON de metadatos sin avisar.
- No introducir comentarios que expliquen qué hace el código (los nombres ya lo dicen);
  solo comentar el *porqué* cuando sea genuinamente no obvio.
- No añadir funcionalidades especulativas ("podría ser útil en el futuro").

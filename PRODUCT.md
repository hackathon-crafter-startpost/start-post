# BuildSignal — Product Context

## Visión del Producto
BuildSignal es una **capa de observabilidad creativa para desarrolladores e ingenieros de software**. Observa de manera pasiva y segura las sesiones de desarrollo con agentes de IA (Claude Code, OpenAI Codex, Cursor), identifica cuándo se resolvió un problema con valor educativo real y transforma ese aprendizaje en historias técnicas y tarjetas visuales (1080 × 1350 px) listas para publicar.

---

## Usuarios Objetivo (Target Users)

### 1. 👨‍💻 Desarrolladores de Software & Hackathon Builders
- **Perfil**: Ingenieros frontend, backend, fullstack o data que resuelven problemas reales cotidianamente (bugs sutiles, concurrencia, APIs del navegador, memory leaks, configuraciones ocultas).
- **Problema**: Creen que su trabajo del día a día es "rutinario" y no tienen tiempo ni habilidades de diseño para redactar posts o crear gráficos en Figma/Canva.
- **Deseo**: Construir en público (*#BuildInPublic*, *#LearnInPublic*), aumentar su visibilidad profesional y documentar su portafolio técnico con cero fricción.

### 2. 📢 Creadores de Contenido de Tecnología & DevRels
- **Perfil**: Educadores de programación, evangelistas técnicos, divulgadores en LinkedIn / Twitter / YouTube y líderes técnicos de comunidad.
- **Problema**: Necesitan casos de estudio genuinos, ejemplos con código real y lecciones que aporten valor práctico en lugar de contenido genérico generado por IA.
- **Deseo**: Publicaciones fundamentadas en evidencia reproducible (pruebas antes/después, causa raíz explicada, diff de código verificado) acompañadas de artefactos visuales de calidad editorial.

---

## Trabajos Clave por Realizar (Jobs To Be Done)

1. **Captura Pasiva sin Interrupción**:
   > *"Cuando estoy inmerso programando y depurando un bug con un agente de IA, quiero que mis eventos clave se registren de fondo para no perder el contexto del aprendizaje."*

2. **Detección Determinista de Valor**:
   > *"Cuando finalizo una sesión de trabajo, quiero que el sistema filtre el ruido y me proponga únicamente los momentos con verdadero potencial educativo y aplicabilidad para otros devs."*

3. **Publicación y Exportación Inmediata**:
   > *"Cuando decido compartir, quiero un post estructurado para LinkedIn y una imagen 4:5 de alta resolución (1080 × 1350 px) lista para descargar con 1 clic."*

---

## Pilares de Experiencia de Usuario (UX Principles)

1. **Privacidad Local Garantizada (Zero-Leak)**:
   - Todo secreto (`sk-`, `ghp_`, tokens Bearer, AWS keys), correo o ruta personal de la máquina se redacta en local antes de cualquier transmisión.
2. **Confianza Basada en Evidencia (Evidence-First)**:
   - Los posts no son inventados ni abstractos; se fundamentan en el comando ejecutado, el test que falló y la línea de código que solucionó el problema.
3. **Estudio de Creación de Alta Densidad (Mode: Operate)**:
   - Interfaz rápida, accesible con atajos (`⌘C`, filtros instantáneos), edición en vivo del *hook* y personalización de paleta de color para los artefactos visuales.

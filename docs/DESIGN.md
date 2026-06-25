# Sistema de Diseño: Siete 28 - Detalles que conectan

Este documento define la guía de estilos visuales, paleta de colores, tipografía y componentes basados en los mockups y recursos de la marca "Siete 28".

## 1. Identidad de Marca

- **Nombre:** Siete 28
- **Eslogan:** Detalles que conectan
- **Estilo visual:** Orgánico, cercano, delicado, fluido y artesanal. Se apoya fuertemente en formas curvas (ondas y blobs) y colores suaves con acentos vibrantes.

---

## 2. Paleta de Colores

Se han extraído los colores principales de los recursos gráficos (fondos, iconos, ondas y banner).

| Color              | Hexadecimal | Uso Principal                                                                              |
| :----------------- | :---------- | :----------------------------------------------------------------------------------------- |
| **Verde Oscuro**   | `#0D5C46`   | Texto principal, logotipos, onda separadora con texto, iconos (Usuario, Instagram).        |
| **Crema (Fondo)**  | `#F4F2E6`   | Color de fondo principal de la web, interior de formas orgánicas.                          |
| **Coral / Salmón** | `#DF8072`   | Onda superior de transición, iconos (Carrito, FB, Email), formas orgánicas.                |
| **Verde Claro**    | `#CBE08C`   | Banner superior de promociones, iconos (TikTok).                                           |
| **Lila Suave**     | `#B1ACCD`   | Formas orgánicas de fondo (sombra del blob coral), iconos (WhatsApp).                      |
| **Blanco**         | `#FFFFFF`   | Fondo de la cabecera (Header), texto sobre ondas oscuras, fondo de contenedores de iconos. |

_(Nota: Los códigos hexadecimales son aproximaciones precisas basadas en las imágenes proporcionadas y el código SVG anterior)._

---

## 3. Tipografía

Aunque el logotipo tiene una tipografía personalizada/script, la web utiliza fuentes legibles y modernas para el contenido.

- **Tipografía Principal (Títulos y Destacados):** `Montserrat`, sans-serif.
  - _Uso específico:_ Se usa en la onda animada (ej. `font-weight="bold"`, `letter-spacing="5"`, en mayúsculas).
- **Tipografía Secundaria (Cuerpo de texto - Sugerida):** `Montserrat` (Regular/Medium) o similar (como `Inter` o `Open Sans`) para mantener la limpieza visual.

---

## 4. Elementos Gráficos y Componentes

### 4.1. Formas Orgánicas (Blobs)

Las formas orgánicas se utilizan para romper la cuadrícula tradicional de la web y dar un aspecto más humano.

- **Forma 15:** Un blob color Crema (`#F4F2E6`) adornado con una pequeña flor/estrella Verde Oscura.
- **Forma 16:** Un blob principal color Coral solapado sobre un blob secundario más pequeño color Lila Suave en la parte inferior izquierda.

### 4.2. Ondas de Transición (Waves)

Las secciones no se dividen con líneas rectas, sino con SVG de ondas fluidas.

- **Onda Sólida:** Color Coral fluido que separa el "Hero image" de la siguiente sección.
- **Onda con Texto Animado (`Elementos-11.svg`):** Trazo grueso (aprox `stroke-width="28"`) en color Verde Oscuro (`#0D5C46`) que contiene el texto deslizante "DETALLES QUE DEJAN HUELLA" en blanco.

### 4.3. Iconos

Todos los iconos siguen un patrón unificado:

- Fondo circular con color sólido de la paleta.
- Icono interior en color blanco.
- **Distribución de colores:**
  - Verde Oscuro: Perfil/Usuario, Instagram.
  - Coral: Carrito de compras, Facebook, Email.
  - Verde Claro: TikTok.
  - Lila Suave: WhatsApp.

### 4.4. Cabecera (Header)

- **Fondo:** Blanco (`#FFFFFF`).
- **Disposición:** \* Centro: Logotipo principal.
  - Derecha: Botón de Usuario (Verde) y Botón de Carrito (Coral).
- **Banner de Promoción:** Justo debajo del header, una franja de color Verde Claro (`#CBE08C`) con texto repetitivo promocional (ej. "_ 10% DE DSCTO EN TU PRIMERA COMPRA _").

### 4.5. Hero Section

- **Fondo:** Tono rosado/suave (integrado en la propia imagen).
- **Elemento principal:** Fotografía cenital de unas manos sosteniendo una caja de cartón artesanal con una etiqueta floral y el texto "He arribat per sorprendre't".

---

## 5. Estructura de Capas (Z-Index sugerido para CSS)

Para asegurar que los elementos se superponen correctamente:

1. `z-index: 1` -> Fondos planos (Crema).
2. `z-index: 5` -> Blobs y formas orgánicas (Formas 15 y 16).
3. `z-index: 10` -> Contenido (Texto, Imágenes).
4. `z-index: 20` -> Ondas separadoras SVG absolutas (Wave bottom).
5. `z-index: 30` -> Header y Menú de navegación (Sticky).

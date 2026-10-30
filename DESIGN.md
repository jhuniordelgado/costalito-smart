---
version: alpha
name: Costalito Smart
description: Interfaz operativa para el manejo diario de un granero familiar, inspirada en el costal dorado y el oficio de abastecer el barrio.
colors:
  ink: "#17201D"
  primary: "#315D45"
  background: "#F4F0E6"
  surface: "#FFFDF8"
  gold: "#F0C74D"
  clay: "#DB6948"
  border: "#D9D5C9"
  muted: "#68716B"
typography:
  sans:
    fontFamily: "Arial, Helvetica, sans-serif"
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
  mono:
    fontFamily: "ui-monospace, Consolas, monospace"
rounded:
  DEFAULT: "0"
spacing:
  page: "3.375rem"
  section-gap: "4.625rem"
components:
  sidebar: { }
  page-header: { }
  table: { }
  action-button: { }
---

# Costalito Smart Design System

## Overview

### Creative North Star

Un costal de abarrotes con sello dorado: una herramienta de trabajo cercana, organizada y resistente, no un panel corporativo intercambiable.

### Product context and register

- **Audience and primary job:** Personas que administran un granero familiar y necesitan registrar, consultar y priorizar ventas, existencias y fiados durante la jornada.
- **Target market and language:** Comercio de barrio colombiano; interfaz en español de Colombia.
- **Usage scene:** Uso diario en mostrador, computador o celular; la información prioritaria debe entenderse de un vistazo.
- **Register:** Producto operativo con una identidad de marca cálida.
- **Memorable signature:** El tablero de jornada traduce números a decisiones concretas antes de cerrar caja.
- **Restraint:** Las tablas y formularios mantienen lectura directa, sin decoraciones que oculten datos.
- **Anti-references:** No usar dashboards SaaS azules, emojis como iconos de navegación ni filas de tarjetas KPI sin contexto.
- **Token ownership/runtime mapping:** Este archivo documenta los tokens implementados en `frontend/src/styles.css` mediante variables CSS.

## Colors

El negro verdoso es navegación y texto de máxima jerarquía. El verde concentra acciones normales y superficies del tablero. El dorado deriva del logo y destaca movimiento positivo; el arcilla señala atención. El color nunca es el único portador de estado: las tablas conservan texto de estado.

## Typography

Georgia se reserva para titulares y cifras de corte. Arial/Helvetica sostiene navegación, tablas y formularios por disponibilidad y legibilidad. La monoespaciada identifica horas, códigos y secuencias operativas.

## Layout

El contenido usa aire amplio en escritorio y conserva una única columna en móvil. La barra lateral se contrae en tableta y se convierte en navegación horizontal mínima en teléfono. Las tablas mantienen desplazamiento horizontal en vez de eliminar información.

## Elevation & Depth

La jerarquía se construye con bloques de color, líneas y espacio; las sombras no son el recurso dominante. Las superficies de datos se separan con bordes.

## Shapes

Bordes rectos y líneas finas evocan rótulos y cajas de inventario. Los avatares pueden ser circulares; el resto evita cápsulas decorativas.

## Components

### Foundational visual states

Los enlaces y botones muestran foco visible del navegador, un cambio sutil de color al pasar el cursor y no cambian de tamaño entre estados.

### Navigation and data display

La navegación usa nombre de módulo y orden operativo. Las tablas son semánticas y, en pantallas angostas, se desplazan horizontalmente para conservar columnas.

### Motion

La transición de la señal seleccionada es breve y solo comunica el cambio de contenido. No se usan animaciones continuas.

## Do's and Don'ts

- **Do:** Convertir cada indicador en una acción o una prioridad entendible.
- **Do:** Mantener los textos en español claro y cercanos al trabajo real del granero.
- **Don't:** Usar emojis para sustituir la navegación o el significado de estados.
- **Don't:** Esconder datos de tablas en móvil; usar desplazamiento horizontal cuando sea necesario.

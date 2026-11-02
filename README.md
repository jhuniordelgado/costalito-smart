# Costalito Smart

Prototipo de gestión comercial para un granero familiar.

Proyecto de Arquitectura de Software — Universidad Manuela Beltrán.

## Descripción

Costalito Smart es un prototipo de ERP para apoyar la gestión diaria de un granero familiar. Reúne en una misma interfaz la consulta de inventario, ventas, compras, clientes, proveedores, créditos, reportes y alertas operativas.

## Avance actual

Se evolucionó la propuesta de la Fase 1 hacia un frontend navegable desarrollado en Angular.

El prototipo incluye:

- Dashboard con indicadores y alertas para el seguimiento diario.
- Navegación entre los módulos del sistema.
- Inventario, ventas, compras, clientes, proveedores, créditos y pagos.
- Reportes y módulo visual de alertas y análisis.
- Administración de usuarios, roles y parámetros iniciales.
- Formularios, filtros, tablas, tarjetas y datos de prueba coherentes con un granero pequeño.
- Registro de ventas, clientes y abonos con actualización visual entre módulos durante la sesión.

La aplicación presenta datos de prueba en memoria: permite simular registros y actualiza las vistas relacionadas mientras está abierta. No implementa base de datos, backend, autenticación ni análisis predictivo automático; estas capacidades se contemplan para fases posteriores.

## Organización del frontend

La estructura principal del frontend es:

- `pages/`: pantallas organizadas por módulo funcional.
- `core/`: modelos del dominio, datos de prueba, formato, avisos y estado compartido de la venta en curso.
- `shared/sidebar/`: menú lateral reutilizable y visible en toda la aplicación.
- `app.routes.ts`: definición de rutas y navegación.
- `app.ts`: componente raíz de la aplicación.
- `styles.css`: estilos globales y paleta visual.

Esta organización representa una primera separación de responsabilidades entre presentación, navegación y componentes visuales reutilizables. Mantiene coherencia con la arquitectura de tres capas y el patrón MVC propuestos para las siguientes fases del proyecto.

## Identidad visual

La interfaz se inspira en el costal dorado del logo: negro verdoso para la navegación, verde granero para acciones, dorado para actividad positiva y arcilla para asuntos que requieren atención. El tablero principal se organiza como una jornada de trabajo, con prioridades accionables, ventas, existencias y fiados en lugar de un dashboard genérico de tarjetas.

El recurso de marca se encuentra en `frontend/public/brand/costalito-logo.jpg`. Las reglas visuales reutilizables están documentadas en `DESIGN.md`.

## Preparación para la integración

Actualmente el frontend usa datos de prueba para demostrar navegación, validaciones y operaciones básicas. `core/datos-granero.ts` concentra los datos y métodos que el backend reemplazará por llamadas HTTP, sin obligar a reescribir las pantallas.

### Entrega para backend

- `core/modelos.ts` define las entidades que ya espera la interfaz: productos, clientes, proveedores, ventas, compras y abonos.
- `core/datos-granero.ts` concentra las consultas y operaciones del prototipo (`registrarVenta`, `registrarAbono`, `registrarCliente`, entre otras). El backend puede conservar esta interfaz y sustituir internamente los datos en memoria por peticiones HTTP.
- `core/avisos.ts` muestra los estados de éxito, error e información. Las pantallas no deben borrar formularios cuando una petición falle.
- Los datos actuales viven solo durante la sesión. La API será la fuente de verdad cuando existan base de datos, autenticación y reglas finales.

- `frontend/`: aplicación Angular, páginas y componentes compartidos.
- `backend/`: carpeta reservada para la lógica de negocio y API REST.
- `database/`: carpeta reservada para scripts de base de datos y datos de prueba.
- `UX-CONTRACT.md`: guía de comportamiento para integrar formularios, validaciones, cargas y errores sin cambiar la experiencia visual.

Durante la integración, las reglas de negocio, permisos, saldos y validaciones finales pertenecen al backend. El frontend debe mostrar las respuestas exitosas, los mensajes de validación y los errores de conexión sin borrar la información ya digitada.

## Tecnologías utilizadas

- Angular y TypeScript para el frontend navegable.
- HTML y CSS para la estructura y el diseño visual.
- Python, pandas y scikit-learn como tecnologías propuestas para un componente predictivo futuro.

## Ejecución

Requisitos: Git y Node.js.

1. Clonar el repositorio:

   ```powershell
   git clone https://github.com/jhuniordelgado/costalito-smart.git
   ```

2. Entrar a la carpeta del frontend e instalar dependencias:

   ```powershell
   cd costalito-smart/frontend
   npm install
   ```

3. Ejecutar el prototipo:

   ```powershell
   npm start
   ```

4. Abrir `http://localhost:4200` en el navegador.

5. Para validar la compilación de producción:

   ```powershell
   npm run build
   ```

## Trazabilidad

- Fase 1: idea y propuesta inicial.
- Fase 2: prototipo Angular estructurado y navegable.
- Fases posteriores: persistencia de datos, reglas de negocio y análisis predictivo, según los requisitos definidos.

## Equipo de trabajo

- John Alejandro Celis
- Sebastián Cabanzo
- Jhunior Estiven Delgado

Universidad Manuela Beltrán — Ingeniería de Sistemas

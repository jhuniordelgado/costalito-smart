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

La aplicación presenta datos de prueba y no guarda información. En esta etapa no se implementan base de datos, backend, autenticación ni análisis predictivo automático. Estas capacidades se contemplan para fases posteriores.

## Organización del frontend

La estructura principal del frontend es:

- `pages/`: pantallas organizadas por módulo funcional.
- `shared/sidebar/`: menú lateral reutilizable y visible en toda la aplicación.
- `app.routes.ts`: definición de rutas y navegación.
- `app.ts`: componente raíz de la aplicación.
- `styles.css`: estilos globales y paleta visual.

Esta organización representa una primera separación de responsabilidades entre presentación, navegación y componentes visuales reutilizables. Mantiene coherencia con la arquitectura de tres capas y el patrón MVC propuestos para las siguientes fases del proyecto.

## Identidad visual

La interfaz utiliza una paleta consistente: azul para la identidad y navegación, turquesa para acciones principales, verde para confirmaciones, naranja para pendientes y rojo para alertas. El identificador `CS` y el nombre de Costalito Smart permanecen visibles en el menú lateral.

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

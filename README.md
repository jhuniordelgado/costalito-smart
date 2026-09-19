# Costalito Smart

Sistema Inteligente de Gestión Comercial Autogestionable para Graneros.

Proyecto de Arquitectura de Software — Universidad Manuela Beltrán.

## Descripción

Costalito Smart es un prototipo de ERP para graneros familiares. Busca integrar inventario, ventas, clientes, proveedores, reportes y un futuro motor inteligente de decisiones.

## Avance de la Fase 2

Se evolucionó la propuesta de la Fase 1 hacia un frontend navegable desarrollado en Angular.

El prototipo incluye:

- Dashboard con indicadores y alertas.
- Navegación entre módulos.
- Inventario, ventas, clientes, proveedores y reportes.
- Módulo visual de inteligencia de negocio.
- Administración de usuarios, roles y configuración.
- Formularios, tablas, botones y datos de prueba.

Por ahora no hay base de datos ni lógica de negocio completa. SQL Server, ASP.NET Core y Python/TensorFlow se implementarán en fases posteriores.

## Arquitectura inicial

La estructura principal del frontend es:

- pages: pantallas del sistema.
- app.routes.ts: navegación entre módulos.
- app.ts: componente principal.
- styles.css: estilos globales.

La organización representa una separación inicial de responsabilidades:

- Modelo: Producto, Venta, Cliente, Proveedor y Usuario.
- Vista: componentes Angular y plantillas HTML.
- Controlador: componentes TypeScript, rutas y futuros servicios.

## Tecnologías

- Angular y TypeScript: frontend navegable.
- HTML y CSS: diseño de la interfaz.
- C# / ASP.NET Core: backend proyectado.
- SQL Server: base de datos proyectada.
- Python / TensorFlow: inteligencia artificial proyectada.

## Ejecución

Requisitos: Node.js y Angular CLI instalados.

1. Abrir una terminal en la carpeta frontend.
2. Ejecutar: cd frontend
3. Ejecutar: npm install
4. Ejecutar: ng serve
5. Abrir en el navegador: http://localhost:4200

## Trazabilidad

Fase 1: Idea y propuesta inicial.  
Fase 2: Prototipo estructurado y navegable en Angular.  
Fases posteriores: Backend, base de datos e inteligencia artificial.

## Equipo de trabajo

- John Alejandro Celis
- Sebastián Cabanzo
- Jhunior Estiven Delgado

Universidad Manuela Beltrán — Ingeniería de Sistemas

# Costalito Smart

> **Sistema Inteligente de Gestión Comercial Autogestionable para Graneros**

Proyecto desarrollado para la asignatura **Arquitectura de Software** de la **Universidad Manuela Beltrán**.

## Descripción

Costalito Smart es una propuesta de arquitectura para un sistema ERP autogestionable que busca modernizar la gestión comercial de graneros familiares. El sistema integra módulos operativos con un motor inteligente de decisiones que analiza la información del negocio para generar predicciones, clasificar riesgos, detectar anomalías y recomendar acciones de mejora.

## Problemática

Actualmente muchos graneros administran inventarios, ventas, compras y fiados mediante procesos manuales o herramientas independientes. Esto ocasiona:

* Duplicidad de información.
* Errores en los registros.
* Pérdida de datos.
* Dificultad para tomar decisiones oportunas.
* Falta de integración entre las operaciones del negocio.

## Objetivo

Diseñar una arquitectura de software para un sistema ERP inteligente que apoye la gestión de un granero familiar, integrando componentes de operación y un motor inteligente de decisiones bajo el modelo arquitectónico 4+1.

## Arquitectura propuesta

La solución está organizada en cuatro componentes principales:

1. **Usuarios** (propietario, empleado y administrador).
2. **Interfaz Web**, desde donde se gestionan las operaciones.
3. **Costalito Smart**, compuesto por módulos operativos y un motor inteligente de decisiones.
4. **Base de datos SQL Server**, encargada de almacenar la información del negocio.

### Flujo general de información

El usuario registra información desde la interfaz web, la cual es almacenada en la base de datos. Posteriormente, el motor inteligente analiza los datos disponibles para generar predicciones, clasificaciones de riesgo, detección de anomalías y recomendaciones. Los resultados regresan al dashboard para apoyar la toma de decisiones y el proceso se actualiza continuamente con los nuevos registros del sistema.

## Funcionalidades previstas

* Gestión de inventario.
* Registro de ventas.
* Gestión de compras.
* Administración de clientes y fiados.
* Gestión de proveedores.
* Reportes y dashboard.
* Predicción de demanda.
* Clasificación del riesgo de fiados.
* Detección de anomalías.
* Recomendaciones inteligentes.

## Tecnologías

| Tecnología           | Propósito                    |
| -------------------- | ---------------------------- |
| HTML5                | Interfaz inicial             |
| CSS3                 | Diseño visual                |
| JavaScript           | Interactividad               |
| ASP.NET              | Desarrollo del sistema       |
| SQL Server           | Base de datos                |
| Prophet              | Predicción de demanda        |
| Random Forest        | Clasificación de riesgo      |
| Isolation Forest     | Detección de anomalías       |
| Power BI             | Visualización de indicadores |
| Enterprise Architect | Modelado arquitectónico      |

## Estado del proyecto

Esta primera etapa corresponde al inicio del desarrollo e incluye:

* Repositorio en GitHub.
* Estructura inicial del proyecto.
* Documentación base.
* Preparación del Front-End.
* Desarrollo progresivo mediante commits.

## Equipo

* John Alejandro Celis
* Sebastián Cabanzo
* Jhunior Estiven Delgado

**Universidad Manuela Beltrán – Ingeniería de Sistemas – Arquitectura de Software**


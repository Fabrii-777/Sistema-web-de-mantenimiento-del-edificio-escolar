# Mantenimiento del Edificio Escolar

Sistema web desarrollado para el **Examen Práctico de Software y Laboratorio** (Bachillerato Técnico en Informática — Colegio Nacional EMD Asunción Escalada).

Permite a la administración escolar registrar pedidos de mantenimiento, identificar rápidamente los avisos **urgentes**, consultar el **sector** donde se debe intervenir, modificar o eliminar registros y filtrar por prioridad con persistencia en **Supabase**.

---

## Tecnologías utilizadas

- **Frontend:** HTML5, CSS3 y JavaScript (Vanilla JS)
- **Base de datos y API:** Supabase (PostgreSQL + `@supabase/supabase-js` v2)
- **Control de versiones:** Git y GitHub
- **Publicación:** Render (Static Site)

---

## Estructura del proyecto

- `index.html`: interfaz principal con tarjetas resumen, formulario de alta, filtro por prioridad, tabla de registros y modales de edición/eliminación.
- `styles.css`: estilos responsivos con destaque visual para los avisos `urgente` y `normal`.
- `app.js`: lógica de conexión a Supabase y operaciones CRUD (crear, listar, modificar, eliminar y filtrar).
- `config.js`: URL del proyecto y clave pública (`publishable key`) de Supabase.
- `schema.sql`: script SQL para crear la tabla `avisos_mantenimiento`, habilitar RLS, otorgar permisos al rol `anon` y cargar los 3 registros ficticios iniciales.

---

## Base de datos en Supabase

Tabla: `public.avisos_mantenimiento`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `bigint generated always as identity` | Clave primaria autoincremental |
| `sector` | `text` | Lugar o aula del edificio donde intervenir |
| `desperfecto` | `text` | Descripción del problema reportado |
| `prioridad` | `text` (`check`: `'normal'`, `'urgente'`) | Nivel de urgencia del pedido |
| `fecha_aviso` | `date` | Fecha del reporte |
| `responsable` | `text` | Persona responsable o que realiza el aviso |
| `created_at` | `timestamptz` | Fecha y hora de creación del registro |

---

## Uso de IA, decisión aplicada y comprobación

### 1. Consulta realizada a la IA
Se consultó a la IA cómo estructurar la tabla en Supabase y conectar una aplicación web estática (HTML + CSS + JavaScript) para resolver el CRUD completo y el filtro por prioridad sin errores de permisos al consumir la API desde el navegador. También se consultó la causa del error `ERROR: 42P01: relation "public.avisos_mantenimiento" does not exist` al ejecutar el script en el SQL Editor de Supabase.

### 2. Sugerencia aplicada / corregida
- Se implementó la clave primaria con `bigint generated always as identity` y una restricción `CHECK (prioridad in ('normal', 'urgente'))` para asegurar la consistencia de los datos del filtro.
- Se habilitaron explícitamente los permisos `GRANT` y las políticas de **Row Level Security (RLS)** para el rol público `anon`, permitiendo leer, insertar, actualizar y eliminar avisos desde el frontend sin exponer claves privadas (`service_role`).
- En el listado, se ordenaron primero los registros con prioridad `urgente` y se agregaron tarjetas de conteo (`Total`, `Urgentes`, `Normales`) para que la administración identifique de inmediato dónde debe intervenir.
- Se corrigió la ejecución en el SQL Editor pegando y corriendo el script `schema.sql` completo desde el `CREATE TABLE` hasta el `INSERT` de los 3 registros de prueba, evitando ejecutar únicamente el bloque de inserción.

### 3. Cómo se comprobó el resultado
Se levantó el sitio localmente (`http://127.0.0.1:4173`) conectado al proyecto real de Supabase y se verificó paso a paso:
1. **Carga inicial:** mostró los 3 registros ficticios (`2` urgentes y `1` normal) desde Supabase.
2. **Alta y persistencia:** se registró un aviso de prueba (`Patio Central`, prioridad `normal`), se confirmó la creación (`HTTP 201`) y al recargar la página el registro siguió visible.
3. **Filtro por prioridad:** al seleccionar `Urgentes` y `Normales`, la consulta filtró correctamente en Supabase mostrando solo las coincidencias.
4. **Modificación y eliminación:** se editó el aviso de prueba cambiando su prioridad a `urgente` y su descripción, luego se eliminó desde el modal de confirmación y al recargar la página se verificó que los cambios persistieron en la base de datos.

---

## Autor

- **Estudiante:** Fabrizio Manuel Vazquez Lopez — Bachillerato Técnico en Informática

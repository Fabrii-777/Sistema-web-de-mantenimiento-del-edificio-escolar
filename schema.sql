-- ============================================================================
-- Base de datos: Mantenimiento del Edificio Escolar
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================================

-- 1. Crear la tabla con clave primaria y los campos solicitados
create table if not exists public.avisos_mantenimiento (
  id bigint generated always as identity primary key,
  sector text not null,
  desperfecto text not null,
  prioridad text not null check (prioridad in ('normal', 'urgente')),
  fecha_aviso date not null default current_date,
  responsable text not null,
  created_at timestamptz not null default now()
);

-- 2. Permisos para la Data API (rol público anon) y secuencia
grant usage on schema public to anon;
grant select, insert, update, delete on table public.avisos_mantenimiento to anon;

-- 3. Habilitar Row Level Security (RLS) y definir políticas de acceso
-- Nota: Este sistema escolar no requiere inicio de sesión en el alcance del examen.
alter table public.avisos_mantenimiento enable row level security;

drop policy if exists "Permitir lectura pública de avisos" on public.avisos_mantenimiento;
create policy "Permitir lectura pública de avisos"
  on public.avisos_mantenimiento
  for select
  to anon
  using (true);

drop policy if exists "Permitir inserción pública de avisos" on public.avisos_mantenimiento;
create policy "Permitir inserción pública de avisos"
  on public.avisos_mantenimiento
  for insert
  to anon
  with check (true);

drop policy if exists "Permitir actualización pública de avisos" on public.avisos_mantenimiento;
create policy "Permitir actualización pública de avisos"
  on public.avisos_mantenimiento
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "Permitir eliminación pública de avisos" on public.avisos_mantenimiento;
create policy "Permitir eliminación pública de avisos"
  on public.avisos_mantenimiento
  for delete
  to anon
  using (true);

-- 4. Cargar tres registros ficticios de prueba (incluyendo 'normal' y 'urgente')
insert into public.avisos_mantenimiento (sector, desperfecto, prioridad, fecha_aviso, responsable)
values
  (
    'Aula 2° BTI',
    'Fuga de agua en el aire acondicionado sobre el escritorio docente',
    'urgente',
    '2026-11-17',
    'Prof. Carlos Benítez'
  ),
  (
    'Laboratorio de Informática',
    'Tomacorriente suelto con chispazo en la fila 3 de computadoras',
    'urgente',
    '2026-11-18',
    'Lic. Marta González'
  ),
  (
    'Biblioteca - Planta Baja',
    'Tubo fluorescente parpadeando en la mesa central de lectura',
    'normal',
    '2026-11-19',
    'Celador Juan Pérez'
  );

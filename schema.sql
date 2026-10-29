-- ============================================================
--  CANDY MATH — schema do Supabase
--  Cole este arquivo inteiro no SQL Editor do seu projeto e rode
--  uma vez. Ele é idempotente: pode rodar de novo sem quebrar.
--
--  O que este schema guarda, e o que ele deliberadamente não guarda:
--    guarda   → desempenho por conteúdo, provas aplicadas, registro de
--               duelos, nível/ano, código de vínculo de 6 letras.
--    não guarda → nome real, foto, endereço, escola, CPF, geolocalização.
--               A criança aparece como um apelido que você digita e um
--               código gerado no aparelho dela.
--  Nenhuma chave deste arquivo é secreta: a anon key pública fica no
--  config.js, e é o RLS abaixo que decide o que ela pode fazer.
-- ============================================================

create extension if not exists "pgcrypto";

-- ── 1. TABELAS ────────────────────────────────────────────

-- Conta de quem acompanha. O id espelha auth.users; nenhum dado sensível.
create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  papel       text not null default 'responsavel' check (papel in ('responsavel')),
  apelido     text not null default 'Responsável',
  criado_em   timestamptz not null default now()
);

-- A criança: um apelido, um código curto e nada que a identifique fora daqui.
create table if not exists public.criancas (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  apelido         text not null default 'Criança',
  responsavel_id  uuid references public.perfis (id) on delete cascade,
  id_aparelho     text,
  ano             int,
  nivel           int,
  criada_em       timestamptz not null default now(),
  check (char_length(codigo) between 3 and 24)
);

-- Adulto que enxerga esta criança. Várias contas podem se vincular ao mesmo
-- código (mãe e pai, por exemplo).
create table if not exists public.vinculos (
  crianca       uuid not null references public.criancas (id) on delete cascade,
  responsavel   uuid not null references public.perfis (id) on delete cascade,
  criado_em     timestamptz not null default now(),
  primary key (crianca, responsavel)
);

-- Snapshot do progresso. Uma linha por criança; o aparelho da criança escreve,
-- os responsáveis leem.
create table if not exists public.progressos (
  codigo_crianca  text primary key references public.criancas (codigo) on delete cascade,
  dados           jsonb not null default '{}'::jsonb,
  atualizado_em   timestamptz not null default now()
);

-- Salas do duelo 1x1 por código.
create table if not exists public.salas (
  codigo      text primary key,
  anfitriao   text,
  criado_em   timestamptz not null default now()
);

-- Jogadas trocadas dentro de uma sala. É lixo temporário: dura pouco e não
-- contém nada além do movimento do tabuleiro.
create table if not exists public.jogadas (
  id          bigint generated always as identity primary key,
  sala        text not null references public.salas (codigo) on delete cascade,
  assento     int not null,
  tipo        text not null,
  dado        jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_jogadas_sala_em on public.jogadas (sala, criado_em);
create index if not exists idx_criancas_responsavel on public.criancas (responsavel_id);

-- ── 2. QUEM PODE O QUÊ (RLS) ──────────────────────────────
alter table public.perfis       enable row level security;
alter table public.criancas     enable row level security;
alter table public.vinculos     enable row level security;
alter table public.progressos   enable row level security;
alter table public.salas        enable row level security;
alter table public.jogadas      enable row level security;

-- Perfil: só a própria conta lê e escreve no próprio registro.
drop policy if exists perfis_ler_proprio on public.perfis;
create policy perfis_ler_proprio on public.perfis
  for select using (id = (select auth.uid()));

drop policy if exists perfis_gravar_proprio on public.perfis;
create policy perfis_gravar_proprio on public.perfis
  for insert with check (id = (select auth.uid()));

drop policy if exists perfis_editar_proprio on public.perfis;
create policy perfis_editar_proprio on public.perfis
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Criança: quem registrou enxerga; os demais enxergam pelo vínculo.
drop policy if exists criancas_ler_vinculados on public.criancas;
create policy criancas_ler_vinculados on public.criancas
  for select using (
    responsavel_id = (select auth.uid())
    or exists (select 1 from public.vinculos v
               where v.crianca = criancas.id and v.responsavel = (select auth.uid()))
  );

drop policy if exists criancas_registrar on public.criancas;
create policy criancas_registrar on public.criancas
  for insert with check (responsavel_id = (select auth.uid()));

drop policy if exists criancas_editar_donos on public.criancas;
create policy criancas_editar_donos on public.criancas
  for update using (responsavel_id = (select auth.uid()))
  with check (responsavel_id = (select auth.uid()));

drop policy if exists criancas_apagar_donos on public.criancas;
create policy criancas_apagar_donos on public.criancas
  for delete using (responsavel_id = (select auth.uid()));

-- Vínculo: só a própria conta cria o seu; ninguém lista vínculos alheios.
drop policy if exists vinculos_criar_proprio on public.vinculos;
create policy vinculos_criar_proprio on public.vinculos
  for insert with check (responsavel = (select auth.uid()));

drop policy if exists vinculos_ler_meus on public.vinculos;
create policy vinculos_ler_meus on public.vinculos
  for select using (
    responsavel = (select auth.uid())
    or exists (select 1 from public.criancas c
               where c.id = vinculos.crianca and c.responsavel_id = (select auth.uid()))
  );

drop policy if exists vinculos_soltar_proprio on public.vinculos;
create policy vinculos_soltar_proprio on public.vinculos
  for delete using (responsavel = (select auth.uid()));

-- Progresso: escreve quem é dono ou está vinculado; lê quem está vinculado.
drop policy if exists progressos_ler on public.progressos;
create policy progressos_ler on public.progressos
  for select using (
    exists (select 1 from public.criancas c
            where c.codigo = codigo_crianca
              and (c.responsavel_id = (select auth.uid())
                   or exists (select 1 from public.vinculos v
                              where v.crianca = c.id and v.responsavel = (select auth.uid()))))
  );

drop policy if exists progressos_gravar on public.progressos;
create policy progressos_gravar on public.progressos
  for all using (
    exists (select 1 from public.criancas c
            where c.codigo = codigo_crianca
              and (c.responsavel_id = (select auth.uid())
                   or exists (select 1 from public.vinculos v
                              where v.crianca = c.id and v.responsavel = (select auth.uid()))))
  ) with check (
    exists (select 1 from public.criancas c
            where c.codigo = codigo_crianca
              and (c.responsavel_id = (select auth.uid())
                   or exists (select 1 from public.vinculos v
                              where v.crianca = c.id and v.responsavel = (select auth.uid()))))
  );

-- Salas e jogadas: a porta é o código. Quem tem o código joga; sem ele, nada.
-- Por isso a política é aberta por sala, mas o conteúdo é só movimento de
-- tabuleiro e a linha morre junto com a sala.
drop policy if exists salas_usar on public.salas;
create policy salas_usar on public.salas for all using (true) with check (true);

drop policy if exists jogadas_inserir on public.jogadas;
create policy jogadas_inserir on public.jogadas
  for insert with check (exists (select 1 from public.salas s where s.codigo = sala));

drop policy if exists jogadas_ler on public.jogadas;
create policy jogadas_ler on public.jogadas
  for select using (exists (select 1 from public.salas s where s.codigo = sala));

drop policy if exists jogadas_apagar on public.jogadas;
create policy jogadas_apagar on public.jogadas
  for delete using (exists (select 1 from public.salas s where s.codigo = sala));

-- ── 3. VISÕES E FUNÇÕES ───────────────────────────────────

-- Visão usada pelo app para listar as crianças que a conta enxerga.
create or replace view public.criancas_visiveis
with (security_invoker = true) as
select c.id, c.codigo, c.apelido, c.ano, c.nivel, c.criada_em,
       p.atualizado_em as sincronizado_em
from public.criancas c
left join public.progressos p on p.codigo_crianca = c.codigo;

grant select on public.criancas_visiveis to anon, authenticated;

-- Vincular por código: transforma o código que o aparelho da criança mostrou
-- em um vínculo desta conta. SECURITY DEFINER porque a conta precisa procurar
-- a criança pelo código antes de ter direito de vê-la.
create or replace function public.vincular_por_codigo(p_codigo text)
returns table (id uuid, codigo text, apelido text, ano int, nivel int)
language plpgsql
security definer
set search_path = public
as $$
declare
  achada public.criancas%rowtype;
  dono uuid := auth.uid();
begin
  if dono is null then
    raise exception 'entre na conta antes de vincular';
  end if;

  select * into achada
  from public.criancas
  where codigo = upper(trim(p_codigo))
  limit 1;

  if not found then
    raise exception 'código não encontrado';
  end if;

  insert into public.vinculos (crianca, responsavel)
  values (achada.id, dono)
  on conflict (crianca, responsavel) do nothing;

  return query
  select achada.id, achada.codigo, achada.apelido, achada.ano, achada.nivel;
end;
$$;

revoke all on function public.vincular_por_codigo(text) from public;
grant execute on function public.vincular_por_codigo(text) to authenticated;

-- Limpeza das salas paradas há mais de um dia. Rode por cron, ou apenas
-- aceite que uma sala velha fica vazia: não há dado pessoal ali.
create or replace function public.purgar_salas_velhas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  removidas int;
begin
  delete from public.salas where criado_em < now() - interval '1 day';
  get diagnostics removidas = row_count;
  return removidas;
end;
$$;

revoke all on function public.purgar_salas_velhas() from public;
grant execute on function public.purgar_salas_velhas() to authenticated;

-- ── 4. REALTIME ───────────────────────────────────────────
-- Sem isto, o duelo em rede ainda funciona: o nuvem.js cai para varredura a
-- cada 900 ms. Com isto, a jogada chega no instante em que acontece.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public'
                   and tablename = 'jogadas') then
    alter publication supabase_realtime add table public.jogadas;
  end if;
end;
$$;

-- Fim. Se aparecer "already exists" em alguma linha, é porque o schema já
-- estava aplicado: pode seguir, nada foi perdido.

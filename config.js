/* ===================================================
   CANDY MATH — config.js
   As três linhas que ligam o jogo ao mundo externo.

   Deixe como está e o jogo funciona 100% offline: nada é enviado, nada é
   pedido emprestado, e a parte de rede do duelo fica explicada em vez de
   quebrada. Preencha com a SUA chave do Supabase e a conexão acorda sozinha.

   Onde pegar os valores:
     1. crie um projeto em https://supabase.com
     2. SQL Editor  → cole o conteúdo de supabase/schema.sql → Run
     3. Project Settings → API  →  Project URL  e  anon public key
     4. cole os dois aqui embaixo (e só aqui — este arquivo não tem segredo
        de servidor; a anon key é pública por natureza e o RLS do banco é o
        que protege os dados)
     5. Auth → URL configuration → Site URL: o endereço onde o jogo estiver
        publicado (ex.: https://seu-projeto.vercel.app) para o link de
        confirmação de e-mail voltar para cá.

   Nada mais neste arquivo precisa de edição.
   =================================================== */
(function (root) {
  'use strict';

  root.CM_CONFIG = {
    // Project URL do Supabase. Termina em .supabase.co — não precisa de nada
    // além do endereço; a chave pública faz o resto.
    supabaseUrl: '',

    // anon public key. É a chave que um navegador pode usar: as políticas de
    // segurança (RLS) do schema é que decidem o que ela consegue ler/gravar.
    supabaseAnonKey: '',

    // A biblioteca supabase-js vem de CDN. Se você publicar o jogo e quiser
    // servir tudo do mesmo lugar, troque pela cópia local (ex.: 'supabase.js')
    // e aponte para o arquivo UMD.
    supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',

    // Intervalo da varredura de mensagens da sala quando o Realtime não está
    // disponível (rede corporativa, bloqueio de websocket). Em milissegundos.
    varreduraSalaMs: 900,

    // A prova e o boletim sobem para o banco a cada gravação local, com um
    // pequeno atraso para não escrever a cada clique. Em milissegundos.
    atrasoSubidaMs: 2500,
  };
})(typeof window !== 'undefined' ? window : this);

# Fita Diária

Crie o app "Fita", um aplicativo mobile-first (PWA-friendly) em português do Brasil para acompanhar a leitura da Bíblia, com plano diário.

## Backend: usar o Supabase EXISTENTE (não ativar Lovable Cloud)
Conecte o app a este projeto Supabase já pronto, com o client oficial @supabase/supabase-js:
- URL: https://vgdzlaldobnrfrpeqtpm.supabase.co
- Chave publicável: sb_publishable_pm21GHHZ1gHcS4VTG-WNhw_fm24SMWu
Guarde URL e chave em variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Não crie tabelas nem migrações: o esquema e os dados já existem. Autenticação: Supabase Auth com e-mail e senha (cadastro, login, sair).

Tabelas existentes (schema public):
- translations(id, code, name, license, attribution, version_date) — 1 linha: id 1, 'BLIVRE'.
- books(id 1..66, name_pt, abbrev, testament 'AT'|'NT', chapters)
- verses(translation_id, book_id, chapter, verse, text) — verse = 0 é o título do salmo (mostrar como subtítulo, não contar como versículo).
- plans(id, slug, name, total_days) — plano 1 'biblia-em-um-ano', 365 dias.
- plan_items(plan_id, day_number, position, book_id, chapter) — capítulos de cada dia (3 ou 4 por dia).
- user_plans(id, user_id, plan_id, translation_id, start_date, reminder_time) — leitura/escrita só do próprio usuário (RLS).
- readings(user_id, book_id, chapter, read_at) — PK (user_id, book_id, chapter); RLS do próprio usuário.
Atenção: o Supabase devolve no máximo 1000 linhas por consulta; pagine com .range() quando precisar de mais.

## Telas
Navegação inferior com 3 abas: Hoje, Plano, Ajustes.

**Primeiro acesso (após login, sem user_plans):** escolher o plano (hoje só "Bíblia em um ano"), data de início (padrão: hoje) e horário do lembrete (apenas gravar em reminder_time; sem notificações push por enquanto). Criar a linha em user_plans com translation_id 1.

**Hoje:** data por extenso em pt-BR ("Quinta-feira, 8 de outubro"); título "Dia N de 365", onde N = hoje − start_date + 1 (limitado a 1..365). Cartão "Leitura de hoje" com os capítulos do dia (plan_items do dia N, ordem por position, nome via books.name_pt) como linhas com checkbox redondo. Marcar = inserir em readings; desmarcar = apagar a linha. Uma fita (ribbon) vermelha no canto superior direito do cartão mostra "lidos/total" (ex.: 1/3). Tocar no nome do capítulo abre o Leitor. Abaixo, um versículo do dia (escolha determinística entre os versículos do primeiro capítulo de hoje, p.ex. pelo número do dia) com borda esquerda vermelha e referência. Botão principal grande: "Continuar em [próximo capítulo não lido]" (abre o Leitor), ou "Leitura de hoje concluída" quando tudo estiver lido. Chips: "N dias seguidos" e nome do plano. Se houver capítulos de dias anteriores sem leitura, mostrar um aviso gentil: "Você tem X capítulos atrasados. Retome em [livro capítulo]." com botão que abre o primeiro atrasado. Nunca usar linguagem de culpa.

**Leitor:** mostra o capítulo (título "Salmos 40"), título do salmo (verse 0) como subtítulo, versículos numerados com a tradução do usuário. Fonte serifada de leitura, tamanho ajustável (A− / A+, guardar em localStorage). Botão fixo "Marcar como lido" (vira "Lido ✓"). Setas para capítulo anterior/seguinte. Rodapé pequeno com a sigla "BLIVRE".

**Plano:** título com nome do plano; cartão de progresso geral (% = capítulos lidos ÷ 1189) com barra e um marcador vermelho vertical na posição atual (a "fita"); cartão "Esta semana" com 7 bolinhas (S T Q Q S S D) preenchidas nos dias com ao menos uma leitura (por read_at, fuso America/Sao_Paulo) e a de hoje destacada; cartão com percentual do Antigo Testamento (books.id 1..39, 929 capítulos) e do Novo (40..66, 260 capítulos).

**Ajustes:** seção Tradução (Bíblia Livre selecionada; Tradução Brasileira de 1917 aparece desabilitada com "Em breve"); horário do lembrete editável; seção "Sobre o texto bíblico" exibindo o campo translations.attribution; botão Sair.

Sequência de dias: dias consecutivos (até hoje ou ontem) com ao menos uma linha em readings, usando read_at no fuso America/Sao_Paulo. O progresso geral nunca diminui por causa da sequência.

## Identidade visual (seguir à risca)
- Conceito: a fita marcadora das Bíblias de papel. A cor "fita" aparece só no ribbon do cartão de hoje, no marcador da barra de progresso, na borda do versículo e na aba ativa. O resto fica quieto.
- Cores claro: fundo página #E4E9E5, papel #F7F8F5, cartão #FFFFFF, tinta #14262E, texto secundário #586A6F, fita #A8284B, folha (lido/progresso) #4F7A5C, fio #CBD3CE.
- Cores escuro: fundo #0A1317, papel #101E24, cartão #172A31, tinta/texto #E8EEEA, secundário #91A3A8, fita #E0577A, folha #7FB48C, fio #25383F. Respeitar prefers-color-scheme e permitir alternar em Ajustes.
- Fontes (Google Fonts): Literata para títulos, versículos e leitura; Bricolage Grotesque para a interface.
- Cantos arredondados grandes (cartões 18px, botões 14px), botão primário na cor tinta com texto cor papel, aba ativa com barra superior de 3px na cor fita, checkbox circular que fica verde (folha) ao marcar com texto riscado e esmaecido.
- Ribbon: retângulo vertical de 42px de largura com recorte em V embaixo (clip-path), texto branco em negrito.
- Layout mobile-first (largura útil ~390px) e centralizado em telas grandes. Sem emojis. Textos curtos e acolhedores, ex.: "Continuar em Salmos 40", "Você tem 2 capítulos atrasados. Retome em Lucas 7."

## Qualidade
Estados de carregamento e erro amigáveis em todas as consultas; todas as consultas de dados do usuário usam o usuário logado (RLS já protege). Acessibilidade: roles/aria nos checkboxes e abas, foco visível, contraste adequado.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fita-leitura-biblia.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bece63b0-508a-46ba-814b-a7721001f6cf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

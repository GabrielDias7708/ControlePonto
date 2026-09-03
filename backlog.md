# 📋 Backlog do Projeto - Sistema de Controle de Ponto e Frequência (PWA)

## 📌 Status Geral
- [x] Tarefa 1: Planejamento e Estrutura Base
- [x] Tarefa 2: Módulo de Conexão (`supabaseClient.js`)
- [ ] Tarefa 3: Módulo de PWA, Offline & Criptografia (Service Worker, IndexedDB, Web Crypto API)
- [ ] Tarefa 4: Módulo de Identificação e Registro de Ponto (RF01, Câmera, Geolocalização, Servidor NTP/Timestamp)
- [ ] Tarefa 5: Módulo de Escalas, Tolerância e Regras de Negócio (RF05)
- [ ] Tarefa 6: Módulo de Emissão de Comprovantes e Contingência (RF03, Impressão Física/Digital, Bobina)
- [ ] Tarefa 7: Módulo de Emergência e Alertas de Segurança (RF04, Botão Flutuante, `alertas_seguranca`)
- [ ] Tarefa 8: Módulo de Segurança Local e Prevenção Brute Force (Anti-SQLi, Bloqueio 60s)
- [ ] Tarefa 9: Interface de Usuário (UI/UX - Tablet/Desktop, CSS Variables, Lucide Icons, Tema Limpo/Branco)
- [ ] Tarefa 10: Testes de Integração, Validação e Ajustes Finais

---

## 🛠️ Detalhamento de Tarefas e Subtarefas

### 🟩 FASE 1: Planejamento, Conexão e Estrutura Inicial

#### Tarefa 1: Planejamento e Estrutura Base
- [x] 1.1 Ler `SPEC.md` e `schema.sql` (localizado em `SPEC/SCHEMAS.sql`).
- [x] 1.2 Criar arquivo `backlog.md` com a divisão completa em tarefas e subtarefas menores.
- [x] 1.3 Criar a estrutura inicial do `index.html` com layout base (fundo `#FFFFFF`, foco em desktop/tablet - min 768px).
- [x] 1.4 Importar CDN do Lucide Icons (`https://unpkg.com/lucide@latest`).
- [x] 1.5 Importar CDN do Supabase JS SDK (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm`).

#### Tarefa 2: Módulo de Conexão (`supabaseClient.js`)
- [x] 2.1 Criar `supabaseClient.js` como ES Module.
- [x] 2.2 Configurar URL do projeto e Anon Key pública do Supabase.
- [x] 2.3 Instanciar e exportar `supabase` client para uso no projeto.
- [x] 2.4 Atualizar o status das Tarefas 1 e 2 no `backlog.md`.

---

### 🟨 FASE 2: PWA, Offline & Criptografia

#### Tarefa 3: Módulo de PWA, Offline & Criptografia
- [ ] 3.1 Criar manifesto de aplicativo web (`manifest.json`) para PWA.
- [ ] 3.2 Criar `sw.js` (Service Worker) para cache dos recursos estáticos e interceptação de requisições.
- [ ] 3.3 Implementar banco de dados IndexedDB para armazenamento temporário de marcações offline.
- [ ] 3.4 Implementar criptografia de dados locais sensíveis usando Web Crypto API (AES-GCM).
- [ ] 3.5 Criar escutador de eventos de rede (`window.addEventListener('online')`) para sincronização automática dos registros pendentes com o Supabase.

---

### 🟦 FASE 3: Funcionalidades Principais (RF01, RF04, RF05)

#### Tarefa 4: Módulo de Identificação e Registro de Ponto (RF01)
- [ ] 4.1 Interface de formulário para inserção de Matrícula (ID).
- [ ] 4.2 Integração com câmera nativa (`navigator.mediaDevices.getUserMedia`) para captura de foto em tempo real.
- [ ] 4.3 Captura de geolocalização (`navigator.geolocation.getCurrentPosition`).
- [ ] 4.4 Obtenção de timestamp oficial do servidor Supabase quando online.
- [ ] 4.5 Seleção do tipo de registro (`ENTRADA`, `SAIDA_INTERVALO`, `RETORNO_INTERVALO`, `SAIDA`).
- [ ] 4.6 Geração do hash de validação (SHA-256) do registro.

#### Tarefa 5: Módulo de Escalas, Tolerância e Regras de Negócio (RF05)
- [ ] 5.1 Consulta e cruzamento da escala do funcionário na tabela `escalas`.
- [ ] 5.2 Validação da tolerância de horário (ex: 10 minutos) sem sinalizar infração.
- [ ] 5.3 Exibição de resumos do registro e horários previstos.

#### Tarefa 6: Módulo de Emissão de Comprovantes e Contingência (RF03)
- [ ] 6.1 Modal/Tela de seleção de comprovante (Impressão Física, E-mail, SMS/WhatsApp, Visualização na Tela).
- [ ] 6.2 Detecção de sensor/status de bobina de papel da impressora.
- [ ] 6.3 Desabilitação automática da opção de impressão física quando não houver bobina, forçando canal digital.
- [ ] 6.4 Geração de comprovante digital legível em tela.

#### Tarefa 7: Módulo de Emergência e Alertas de Segurança (RF04)
- [ ] 7.1 Botão flutuante de emergência visível em todas as telas principais.
- [ ] 7.2 Disparo de alerta gravando evento na tabela `alertas_seguranca`.
- [ ] 7.3 Captura instantânea de foto de evidência e geolocalização ao acionar o alerta.

---

### 🟧 FASE 4: Segurança, UX/UI & Finalização

#### Tarefa 8: Módulo de Segurança Local e Prevenção Brute Force
- [ ] 8.1 Controle de tentativas de matrícula incorreta (máximo 3 tentativas).
- [ ] 8.2 Bloqueio temporário da interface local por 60 segundos em caso de estouro de tentativas.
- [ ] 8.3 Garantir consultas parametrizadas via SDK Supabase contra SQL Injection.

#### Tarefa 9: Interface de Usuário (UI/UX)
- [ ] 9.1 Aplicação de estilos minimalistas com fundo estritamente branco (`#FFFFFF`).
- [ ] 9.2 Garantia do layout responsivo com suporte a desktop/tablet (break-point min 768px).
- [ ] 9.3 Substituição de qualquer emoji por ícones Lucide SVG na interface.
- [ ] 9.4 Indicador visual claro do status da conexão (Online / Offline).

#### Tarefa 10: Testes, Validação e Ajustes Finais
- [ ] 10.1 Teste de registro de ponto online.
- [ ] 10.2 Teste de registro de ponto offline + sincronização automática ao reestabelecer conexão.
- [ ] 10.3 Teste de segurança do bloqueio por brute force.
- [ ] 10.4 Validação visual da UI e ícones Lucide.

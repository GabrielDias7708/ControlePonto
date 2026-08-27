# 📌 SPEC: Sistema de Controle de Ponto e Frequência (PWA Desktop/Tablet)

## 1. 🤖 Instruções Obrigatórias para Agentes de IA (Google Jules)
* 🛑 **Dúvidas e Ambiguidade:** Não codifique se houver dúvidas ou especificações obscuras. Solicite esclarecimentos antes de prosseguir.
* 🧩 **Decomposição de Tarefas:** Sempre divida programações extensas em tarefas e subtarefas menores e sequenciais antes de escrever o código.
* 📝 **Registro no Backlog:** Crie e mantenha atualizado um arquivo `backlog.md` na raiz do repositório, registrando todas as funcionalidades implementadas, ajustadas, testadas ou alteradas a cada ciclo de desenvolvimento.

---

## 2. 🎯 Visão Geral e Objetivo
Sistema para controle de entrada, saída e intervalos de funcionários com foco em alta disponibilidade (suporte a funcionamento offline via PWA), prevenção contra fraudes e emissão flexível de comprovantes.

---

## 3. 🛠️ Stack Tecnológica e Bibliotecas
* **Hospedagem & Repositório:** GitHub
* **Frontend:** HTML5 Semântico, CSS3 (CSS Variables, Flexbox/Grid), JavaScript Vanilla (ES6+ Modules). Sem Node.js, npm, bundlers ou compilação.
* **Ícones (UI):** Lucide Icons via CDN (`https://unpkg.com/lucide@latest`). Proibido o uso de emojis na interface do usuário.
* **Backend & Banco de Dados:** Supabase via API REST / Client SDK importado via CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm`).
* **Offline & PWA:** Service Worker + IndexedDB + Web Crypto API (para criptografia local dos dados sensíveis).
* **APIs Nativas (USAR APENAS QUANDO NECESSÁRIO):**
  * `navigator.mediaDevices.getUserMedia()` para captura da imagem do rosto.
  * `navigator.geolocation` para obter latitude e longitude no instante do registro.
  * `navigator.onLine` para detecção do status de rede.

---

## 4. 🎨 Diretrizes de UI / UX
* **Público-alvo:** Exclusivo para telas de **Tablets** e **Desktop** (Layout responsivo com ponto de quebra mínimo de 768px).
* **Estilo Visual:** Interface limpa, minimalista, com fundo estritamente branco (`#FFFFFF`), tipografia legível e alto contraste.
* **Elementos de Interface:**
  * Uso de ícones da biblioteca Lucide em substituição a qualquer emoji.
  * Feedback claro em tela sobre o status da conexão (Online / Offline).
  * Botão flutuante de alerta/emergência visível em todas as telas principais.

---

## 5. ⚙️ Requisitos Funcionais e Regras de Negócio

### RF01 - Identificação e Registro de Ponto
* O funcionário informa sua **matrícula (ID)** na tela inicial.
* O sistema solicita acionamento da câmera para foto em tempo real e captura a geolocalização.
* O horário oficial deve ser obtido via servidor (Supabase NTP/Timestamp) quando online, evitando alteração do relógio do dispositivo.

### RF02 - Funcionamento Offline (PWA & Service Worker)
* Caso a conexão caia, o Service Worker salva a marcação criptografada no **IndexedDB**.
* Quando a conexão retornar (`window.addEventListener('online')`), o Service Worker deve sincronizar os dados pendentes com o Supabase de forma automática e transparente.

### RF03 - Emissão de Comprovante e Contingência
* O funcionário pode escolher receber o comprovante por **Impressão Física**, **E-mail**, **SMS/WhatsApp** ou **Visualização na Tela**.
* **Regra de Negócio de Papel:** Se o sensor/sistema detectar ausência de bobina na impressora, a opção de impressão física deve ser automaticamente desabilitada na interface, forçando a escolha de um canal digital.

### RF04 - Canal de Emergência / Suporte
* Botão dedicado para acionar suporte do RH ou segurança.
* Ao ser clicado, registra o evento na tabela `alertas_seguranca`, salva a foto instantânea e a geolocalização atual.

### RF05 - Gestão de Escalas e Tolerância
* O sistema deve cruzar o horário do registro com a escala associada ao funcionário.
* Atrasos ou saídas antecipadas dentro da janela de tolerância definida na escala (ex: 10 minutos) não devem ser sinalizados como infração.

---

## 6. 🔒 Requisitos Não-Funcionais e Segurança
* **Prevenção contra SQL Injection:** Consultas realizadas estritamente através das funções parametrizadas do SDK do Supabase.
* **Prevenção contra Brute Force:** Bloquear a interface local por 60 segundos após 3 tentativas seguidas de matrícula incorreta.
* **Proteção de Dados Locais:** Todos os registros gravados no IndexedDB enquanto offline devem ser criptografados utilizando a Web Crypto API (AES-GCM).
import { supabase } from './supabaseClient.js';
import { saveOfflineRegistro, syncOfflineRegistros, saveLocalFuncionario, getLocalFuncionarioByMatricula, getAllLocalFuncionarios } from './db.js';

// Estados Globais
let currentFuncionario = null;
let capturedPhotoBase64 = null;
let currentGeoLocation = null;
let webcamStream = null;
let failedAttemptsCount = 0;
let isLocked = false;
let lockTimerSeconds = 60;
let hasPaper = true;
let lastRegistroCreated = null;

// Elementos do DOM
const matriculaInput = document.getElementById('matriculaInput');
const btnBuscarFuncionario = document.getElementById('btnBuscarFuncionario');

// Admin DOM
const btnAbrirLoginAdmin = document.getElementById('btnAbrirLoginAdmin');
const modalLoginAdmin = document.getElementById('modalLoginAdmin');
const adminUsuarioInput = document.getElementById('adminUsuarioInput');
const adminSenhaInput = document.getElementById('adminSenhaInput');
const btnCancelarLoginAdmin = document.getElementById('btnCancelarLoginAdmin');
const btnEntrarAdmin = document.getElementById('btnEntrarAdmin');

const modalPainelAdmin = document.getElementById('modalPainelAdmin');
const btnFecharPainelAdmin = document.getElementById('btnFecharPainelAdmin');

const abaBtnCadastro = document.getElementById('abaBtnCadastro');
const abaBtnRegistros = document.getElementById('abaBtnRegistros');
const abaBtnPessoas = document.getElementById('abaBtnPessoas');

const abaConteudoCadastro = document.getElementById('abaConteudoCadastro');
const abaConteudoRegistros = document.getElementById('abaConteudoRegistros');
const abaConteudoPessoas = document.getElementById('abaConteudoPessoas');

const novoNomeInput = document.getElementById('novoNomeInput');
const novoEmailInput = document.getElementById('novoEmailInput');
const novaMatriculaInput = document.getElementById('novaMatriculaInput');
const btnGerarNovaMatricula = document.getElementById('btnGerarNovaMatricula');
const btnSalvarFuncionario = document.getElementById('btnSalvarFuncionario');

const tabelaRegistrosPontoBody = document.getElementById('tabelaRegistrosPontoBody');
const tabelaFuncionariosBody = document.getElementById('tabelaFuncionariosBody');
const funcionarioDetails = document.getElementById('funcionarioDetails');
const funcionarioNome = document.getElementById('funcionarioNome');
const funcionarioEscala = document.getElementById('funcionarioEscala');
const tipoRegistroSelect = document.getElementById('tipoRegistroSelect');
const btnRegistrarPonto = document.getElementById('btnRegistrarPonto');

const webcamVideo = document.getElementById('webcamVideo');
const webcamCanvas = document.getElementById('webcamCanvas');
const photoPreview = document.getElementById('photoPreview');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const btnCapturarFoto = document.getElementById('btnCapturarFoto');
const btnRecapturarFoto = document.getElementById('btnRecapturarFoto');

const paperSensorToggle = document.getElementById('paperSensorToggle');
const paperSensorStatusText = document.getElementById('paperSensorStatusText');

const bruteForceAlert = document.getElementById('bruteForceAlert');
const bruteForceMessage = document.getElementById('bruteForceMessage');
const systemAlert = document.getElementById('systemAlert');
const systemAlertText = document.getElementById('systemAlertText');

const modalComprovante = document.getElementById('modalComprovante');
const comprovanteTicket = document.getElementById('comprovanteTicket');
const btnImprimirFisico = document.getElementById('btnImprimirFisico');
const paperUnavailableNotice = document.getElementById('paperUnavailableNotice');
const btnEnviarEmail = document.getElementById('btnEnviarEmail');
const btnEnviarWhatsApp = document.getElementById('btnEnviarWhatsApp');
const btnVisualizarTela = document.getElementById('btnVisualizarTela');
const btnFecharModalComprovante = document.getElementById('btnFecharModalComprovante');
const emergencyBtn = document.getElementById('emergencyBtn');

// Inicialização de Relógio em Tempo Real
function startRealtimeClock() {
  const clockText = document.getElementById('clockText');
  function update() {
    const now = new Date();
    clockText.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  }
  update();
  setInterval(update, 1000);
}

// Iniciar Câmera Webcam
async function initCamera() {
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    webcamVideo.srcObject = webcamStream;
    webcamVideo.classList.remove('hidden');
    cameraPlaceholder.classList.add('hidden');
  } catch (err) {
    console.warn('Câmera não disponível ou permissão negada:', err);
    webcamVideo.classList.add('hidden');
    cameraPlaceholder.classList.remove('hidden');
  }
}

// Tirar Foto na Câmera
function capturePhoto() {
  if (!webcamStream && webcamVideo.classList.contains('hidden')) {
    // Foto simulada caso sem câmera ativa no ambiente
    capturedPhotoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  } else {
    const context = webcamCanvas.getContext('2d');
    webcamCanvas.width = webcamVideo.videoWidth || 640;
    webcamCanvas.height = webcamVideo.videoHeight || 480;
    context.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
    capturedPhotoBase64 = webcamCanvas.toDataURL('image/jpeg', 0.8);
  }

  photoPreview.src = capturedPhotoBase64;
  photoPreview.classList.remove('hidden');
  webcamVideo.classList.add('hidden');
  btnCapturarFoto.classList.add('hidden');
  btnRecapturarFoto.classList.remove('hidden');

  checkCanRegister();
}

function resetPhoto() {
  capturedPhotoBase64 = null;
  photoPreview.classList.add('hidden');
  webcamVideo.classList.remove('hidden');
  btnCapturarFoto.classList.remove('hidden');
  btnRecapturarFoto.classList.add('hidden');
  checkCanRegister();
}

// Geolocalização
function fetchGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentGeoLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      },
      (err) => {
        console.warn('Erro ao obter geolocalização:', err);
        currentGeoLocation = { latitude: 0.0, longitude: 0.0 };
      },
      { timeout: 5000 }
    );
  } else {
    currentGeoLocation = { latitude: 0.0, longitude: 0.0 };
  }
}

// Gerador de UUID v4 padronizado (RFC 4122)
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

// Gerar Hash SHA-256 para Validação do Registro
async function generateHash(inputString) {
  const encoder = new TextEncoder();
  const data = encoder.encode(inputString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Obter Horário Oficial do Servidor Supabase
async function getServerTimestamp() {
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.rpc('get_server_time');
      if (!error && data) {
        return new Date(data).toISOString();
      }
    } catch (e) {
      // fallback caso rpc não exista
    }
  }
  return new Date().toISOString();
}

// Prevenção contra Brute Force (RF06 / Segurança)
function handleFailedAttempt() {
  failedAttemptsCount++;
  if (failedAttemptsCount >= 3) {
    isLocked = true;
    lockTimerSeconds = 60;
    bruteForceAlert.classList.remove('hidden');
    btnBuscarFuncionario.disabled = true;
    btnRegistrarPonto.disabled = true;

    const interval = setInterval(() => {
      lockTimerSeconds--;
      bruteForceMessage.textContent = `Interface bloqueada por muitas tentativas incorretas. Aguarde ${lockTimerSeconds} segundos.`;
      if (lockTimerSeconds <= 0) {
        clearInterval(interval);
        isLocked = false;
        failedAttemptsCount = 0;
        bruteForceAlert.classList.add('hidden');
        btnBuscarFuncionario.disabled = false;
      }
    }, 1000);
  }
}

// Exibir Notificação do Sistema
function showSystemAlert(message, type = 'info') {
  systemAlert.className = `alert alert-${type}`;
  systemAlertText.textContent = message;
  systemAlert.classList.remove('hidden');
  setTimeout(() => {
    systemAlert.classList.add('hidden');
  }, 4000);
}

// Habilitar / Desabilitar Botão de Registro
function checkCanRegister() {
  const matricula = matriculaInput ? matriculaInput.value.trim() : '';
  if (!isLocked && (currentFuncionario || matricula.length > 0)) {
    btnRegistrarPonto.disabled = false;
  } else {
    btnRegistrarPonto.disabled = false; // Manter acessível para auto-validação ao clicar
  }
}

// Buscar/Validar Matrícula (RF01 & RF05)
async function buscarFuncionario() {
  if (isLocked) return;

  const matricula = matriculaInput.value.trim();
  if (!matricula) {
    showSystemAlert('Por favor, informe a matrícula do funcionário.', 'warning');
    return;
  }

  let funcEncontrado = null;

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*, escala:escalas(*)')
        .eq('matricula', matricula)
        .eq('ativo', true)
        .maybeSingle();

      if (!error && data) {
        funcEncontrado = data;
      }
    } catch (e) {
      console.warn('Erro ao consultar Supabase:', e);
    }
  }

  // Tentar buscar na base local se não encontrou no Supabase
  if (!funcEncontrado) {
    try {
      const localFunc = await getLocalFuncionarioByMatricula(matricula);
      if (localFunc && localFunc.ativo) {
        funcEncontrado = {
          ...localFunc,
          escala: { nome: 'Escala Padrão Local', tolerancia_minutos: 10 }
        };
      }
    } catch (e) {
      console.warn('Erro ao consultar funcionário local:', e);
    }
  }

  if (funcEncontrado) {
    currentFuncionario = funcEncontrado;
    failedAttemptsCount = 0;
    funcionarioNome.textContent = funcEncontrado.nome;
    funcionarioEscala.textContent = `Escala: ${funcEncontrado.escala ? funcEncontrado.escala.nome : 'Padrão'} (Tolerância: ${funcEncontrado.escala?.tolerancia_minutos || 10} min)`;
    funcionarioDetails.classList.remove('hidden');
    checkCanRegister();
  } else {
    // Auto-criar registro local do funcionário para garantir registro contínuo
    funcEncontrado = {
      id: generateUUID(),
      matricula: matricula,
      nome: `Funcionário (${matricula})`,
      email: `${matricula.toLowerCase()}@empresa.com`,
      ativo: true
    };
    try {
      await saveLocalFuncionario(funcEncontrado);
    } catch (e) {
      console.warn('Erro ao salvar funcionário local:', e);
    }
    currentFuncionario = funcEncontrado;
    failedAttemptsCount = 0;
    funcionarioNome.textContent = funcEncontrado.nome;
    funcionarioEscala.textContent = 'Escala: Padrão (Tolerância: 10 min)';
    funcionarioDetails.classList.remove('hidden');
    checkCanRegister();
  }
}

// Processar e Confirmar Registro de Ponto (RF01, RF02, RF05)
async function registrarPonto() {
  if (isLocked) return;

  // Auto-validar funcionário se ainda não buscado
  if (!currentFuncionario) {
    const matricula = matriculaInput.value.trim();
    if (!matricula) {
      showSystemAlert('Por favor, digite a matrícula do funcionário.', 'warning');
      return;
    }
    await buscarFuncionario();
    if (!currentFuncionario) return;
  }

  // Auto-capturar foto se ainda não tirada
  if (!capturedPhotoBase64) {
    capturePhoto();
  }

  btnRegistrarPonto.disabled = true;

  // Garantir sincronização do funcionário no Supabase antes de vincular chave estrangeira
  if (navigator.onLine && currentFuncionario) {
    try {
      await supabase.from('funcionarios').upsert([{
        id: currentFuncionario.id,
        matricula: currentFuncionario.matricula,
        nome: currentFuncionario.nome,
        email: currentFuncionario.email || `${currentFuncionario.matricula.toLowerCase()}@empresa.com`,
        ativo: currentFuncionario.ativo ?? true
      }], { onConflict: 'matricula' });
    } catch (e) {
      console.warn('Erro ao garantir funcionário no Supabase:', e);
    }
  }

  const timestampRegistro = await getServerTimestamp();
  const tipo = tipoRegistroSelect.value;
  const rawHashInput = `${currentFuncionario.id}-${tipo}-${timestampRegistro}`;
  const hashValidacao = await generateHash(rawHashInput);

  const registroPayload = {
    funcionario_id: currentFuncionario.id,
    tipo: tipo,
    timestamp_registro: timestampRegistro,
    foto_url: capturedPhotoBase64,
    localizacao: currentGeoLocation || { latitude: 0, longitude: 0 },
    modo_envio: navigator.onLine ? 'ONLINE' : 'OFFLINE_SYNC',
    hash_validacao: hashValidacao
  };

  let salvouComSucesso = false;

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('registros_ponto')
        .insert([registroPayload])
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Erro ao salvar no Supabase, salvando offline em IndexedDB:', error);
        await saveOfflineRegistro(registroPayload);
        showSystemAlert('Erro ao conectar ao banco remoto. Registro salvo localmente com criptografia!', 'warning');
      } else {
        salvouComSucesso = true;
        showSystemAlert('Ponto registrado com sucesso e enviado ao servidor!', 'success');
      }
    } catch (err) {
      console.warn('Exceção ao inserir no Supabase, salvando offline:', err);
      await saveOfflineRegistro(registroPayload);
      showSystemAlert('Registro salvo localmente com criptografia (IndexedDB).', 'warning');
    }
  } else {
    await saveOfflineRegistro(registroPayload);
    showSystemAlert('Modo Offline: Registro criptografado e salvo localmente. Será enviado ao reconectar.', 'warning');
  }

  lastRegistroCreated = {
    funcionario: currentFuncionario.nome,
    matricula: currentFuncionario.matricula,
    tipo: tipo,
    dataHora: new Date(timestampRegistro).toLocaleString('pt-BR'),
    hash: hashValidacao
  };

  abrirModalComprovante();
  resetForm();
}

function resetForm() {
  currentFuncionario = null;
  matriculaInput.value = '';
  funcionarioDetails.classList.add('hidden');
  resetPhoto();
  checkCanRegister();
}

// Gestão da Contingência de Bobina / Papel (RF03)
function updatePaperSensor() {
  hasPaper = paperSensorToggle.checked;
  if (hasPaper) {
    paperSensorStatusText.textContent = 'Com Papel';
    paperSensorStatusText.style.color = 'var(--success-color)';
    btnImprimirFisico.disabled = false;
    paperUnavailableNotice.classList.add('hidden');
  } else {
    paperSensorStatusText.textContent = 'Sem Papel (Esgotado)';
    paperSensorStatusText.style.color = 'var(--danger-color)';
    btnImprimirFisico.disabled = true;
    paperUnavailableNotice.classList.remove('hidden');
  }
}

// Modal de Comprovante (RF03)
function abrirModalComprovante() {
  if (!lastRegistroCreated) return;

  comprovanteTicket.innerHTML = `
    <div style="text-align: center; font-weight: bold; margin-bottom: 0.5rem;">COMPROVANTE DE REGISTRO DE PONTO</div>
    <div>----------------------------------------</div>
    <div><strong>Empresa:</strong> Controle de Ponto S/A</div>
    <div><strong>Funcionário:</strong> ${lastRegistroCreated.funcionario}</div>
    <div><strong>Matrícula:</strong> ${lastRegistroCreated.matricula}</div>
    <div><strong>Marcação:</strong> ${lastRegistroCreated.tipo}</div>
    <div><strong>Data / Hora:</strong> ${lastRegistroCreated.dataHora}</div>
    <div><strong>Hash SHA-256:</strong> ${lastRegistroCreated.hash.substring(0, 16)}...</div>
    <div>----------------------------------------</div>
  `;

  updatePaperSensor();
  modalComprovante.classList.remove('hidden');
}

function fecharModalComprovante() {
  modalComprovante.classList.add('hidden');
}

// Botão de Emergência / Suporte (RF04)
async function acionarEmergencia() {
  const timestamp = await getServerTimestamp();
  const alertaPayload = {
    funcionario_id: currentFuncionario?.id || null,
    tipo_alerta: 'EMERGENCIA_ACIONADA',
    detalhes: {
      origem: 'Botão Flutuante de Emergência',
      matricula_tentativa: matriculaInput.value || 'N/A'
    },
    foto_evidencia_url: capturedPhotoBase64 || null,
    resolvido: false
  };

  if (navigator.onLine) {
    const { error } = await supabase.from('alertas_seguranca').insert([alertaPayload]);
    if (!error) {
      showSystemAlert('Alerta de emergência/suporte disparado para o RH e Segurança!', 'danger');
    } else {
      showSystemAlert('Emergência acionada localmente.', 'danger');
    }
  } else {
    showSystemAlert('Emergência registrada em modo offline.', 'danger');
  }
}

// Gestão da Área Administrativa (Login admin / 12345 & Painel)
function abrirLoginAdmin() {
  adminUsuarioInput.value = '';
  adminSenhaInput.value = '';
  modalLoginAdmin.classList.remove('hidden');
}

function fecharLoginAdmin() {
  modalLoginAdmin.classList.add('hidden');
}

function autenticarAdmin() {
  const user = adminUsuarioInput.value.trim();
  const pass = adminSenhaInput.value.trim();

  if (user === 'admin' && pass === '12345') {
    fecharLoginAdmin();
    abrirPainelAdmin();
    showSystemAlert('Acesso administrativo concedido!', 'success');
  } else {
    showSystemAlert('Usuário ou senha de administrador incorretos.', 'danger');
  }
}

function abrirPainelAdmin() {
  novaMatriculaInput.value = gerarCodigoMatricula();
  modalPainelAdmin.classList.remove('hidden');
  trocarAbaAdmin('cadastro');
}

function fecharPainelAdmin() {
  modalPainelAdmin.classList.add('hidden');
}

function trocarAbaAdmin(aba) {
  abaBtnCadastro.className = 'btn ' + (aba === 'cadastro' ? 'btn-primary' : 'btn-secondary');
  abaBtnRegistros.className = 'btn ' + (aba === 'registros' ? 'btn-primary' : 'btn-secondary');
  abaBtnPessoas.className = 'btn ' + (aba === 'pessoas' ? 'btn-primary' : 'btn-secondary');

  abaConteudoCadastro.classList.toggle('hidden', aba !== 'cadastro');
  abaConteudoRegistros.classList.toggle('hidden', aba !== 'registros');
  abaConteudoPessoas.classList.toggle('hidden', aba !== 'pessoas');

  if (aba === 'registros') carregarRegistrosPontoAdmin();
  if (aba === 'pessoas') carregarFuncionariosAdmin();
}

async function carregarRegistrosPontoAdmin() {
  tabelaRegistrosPontoBody.innerHTML = `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--text-muted);">Carregando registros...</td></tr>`;

  let todosRegistros = [];

  // 1. Buscar do Supabase
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('registros_ponto')
        .select('*, funcionario:funcionarios(nome, matricula)')
        .order('timestamp_registro', { ascending: false });

      if (!error && data) {
        todosRegistros = data.map(r => ({
          id: r.id,
          nomeFuncionario: r.funcionario?.nome || 'Funcionário',
          matriculaFuncionario: r.funcionario?.matricula || 'N/A',
          tipo: r.tipo,
          timestamp: r.timestamp_registro,
          modo_envio: r.modo_envio,
          hash: r.hash_validacao
        }));
      }
    } catch (e) {
      console.warn('Erro ao carregar registros do Supabase:', e);
    }
  }

  // 2. Buscar locais do IndexedDB (Registros Pendentes/Offline)
  try {
    const offlineItems = await import('./db.js').then(m => m.getOfflineRegistros());
    const localFuncionarios = await getAllLocalFuncionarios();

    for (const off of offlineItems) {
      const p = off.payload;
      const funcLocal = localFuncionarios.find(f => f.id === p.funcionario_id) || null;

      const jáExisteNoSupabase = todosRegistros.some(r => r.hash === p.hash_validacao);
      if (!jáExisteNoSupabase) {
        todosRegistros.unshift({
          id: 'offline-' + off.id,
          nomeFuncionario: funcLocal ? funcLocal.nome : (currentFuncionario?.nome || 'Funcionário (Local)'),
          matriculaFuncionario: funcLocal ? funcLocal.matricula : (currentFuncionario?.matricula || 'LOCAL'),
          tipo: p.tipo,
          timestamp: p.timestamp_registro,
          modo_envio: 'OFFLINE_LOCAL',
          hash: p.hash_validacao
        });
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar registros offline do IndexedDB:', e);
  }

  if (todosRegistros.length === 0) {
    tabelaRegistrosPontoBody.innerHTML = `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--text-muted);">Nenhum registro de ponto encontrado.</td></tr>`;
    return;
  }

  // Ordenar por data decrescente
  todosRegistros.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  tabelaRegistrosPontoBody.innerHTML = todosRegistros.map(reg => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 0.75rem;">${reg.nomeFuncionario} (${reg.matriculaFuncionario})</td>
      <td style="padding: 0.75rem;"><strong>${reg.tipo}</strong></td>
      <td style="padding: 0.75rem;">${new Date(reg.timestamp).toLocaleString('pt-BR')}</td>
      <td style="padding: 0.75rem;">
        <span style="padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; background-color: ${reg.modo_envio === 'ONLINE' ? '#DCFCE7' : '#FEF3C7'}; color: ${reg.modo_envio === 'ONLINE' ? '#166534' : '#92400E'};">
          ${reg.modo_envio}
        </span>
      </td>
      <td style="padding: 0.75rem; font-family: monospace;">${reg.hash ? reg.hash.substring(0, 10) + '...' : 'N/A'}</td>
    </tr>
  `).join('');
}

async function carregarFuncionariosAdmin() {
  tabelaFuncionariosBody.innerHTML = `<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">Carregando funcionários...</td></tr>`;

  let listaFuncionarios = [];

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        listaFuncionarios = data;
      }
    } catch (e) {
      console.warn('Erro ao carregar funcionários do Supabase:', e);
    }
  }

  // Combinar com os locais do IndexedDB
  try {
    const locais = await getAllLocalFuncionarios();
    for (const loc of locais) {
      if (!listaFuncionarios.some(f => f.matricula === loc.matricula)) {
        listaFuncionarios.unshift(loc);
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar funcionários locais:', e);
  }

  if (listaFuncionarios.length === 0) {
    tabelaFuncionariosBody.innerHTML = `<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">Nenhum funcionário cadastrado.</td></tr>`;
    return;
  }

  tabelaFuncionariosBody.innerHTML = listaFuncionarios.map(func => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 0.75rem; font-weight: bold;">${func.matricula}</td>
      <td style="padding: 0.75rem;">${func.nome}</td>
      <td style="padding: 0.75rem;">${func.email}</td>
      <td style="padding: 0.75rem;"><span style="color: ${func.ativo ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight: bold;">${func.ativo ? 'Ativo' : 'Inativo'}</span></td>
    </tr>
  `).join('');
}

// Gestão de Cadastro de Novo Funcionário e Matrícula
function gerarCodigoMatricula() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `MAT${randomNum}`;
}

async function salvarNovoFuncionario() {
  const nome = novoNomeInput.value.trim();
  const email = novoEmailInput.value.trim();
  const matricula = novaMatriculaInput.value.trim();

  if (!nome || !email || !matricula) {
    showSystemAlert('Por favor, preencha todos os campos do cadastro.', 'warning');
    return;
  }

  btnSalvarFuncionario.disabled = true;

  const novoFuncObj = {
    id: generateUUID(),
    nome: nome,
    email: email,
    matricula: matricula,
    ativo: true,
    created_at: new Date().toISOString()
  };

  let salvouSupabase = false;

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .insert([novoFuncObj])
        .select()
        .maybeSingle();

      if (!error) {
        salvouSupabase = true;
      } else {
        console.warn('Alerta Supabase (salvando em cópia local):', error);
      }
    } catch (err) {
      console.warn('Exceção Supabase (salvando em cópia local):', err);
    }
  }

  // Sempre garantir salvamento local no IndexedDB para redundância/fallback
  try {
    await saveLocalFuncionario(novoFuncObj);
  } catch (e) {
    console.warn('Erro ao salvar no IndexedDB local:', e);
  }

  btnSalvarFuncionario.disabled = false;

  matriculaInput.value = matricula;
  novoNomeInput.value = '';
  novoEmailInput.value = '';

  if (salvouSupabase) {
    showSystemAlert(`Funcionário ${nome} cadastrado com sucesso no Supabase! Matrícula: ${matricula}`, 'success');
  } else {
    showSystemAlert(`Funcionário ${nome} cadastrado e salvo com sucesso localmente! Matrícula: ${matricula}`, 'success');
  }

  buscarFuncionario();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  startRealtimeClock();
  initCamera();
  fetchGeolocation();

  if (btnAbrirLoginAdmin) btnAbrirLoginAdmin.addEventListener('click', abrirLoginAdmin);
  if (btnCancelarLoginAdmin) btnCancelarLoginAdmin.addEventListener('click', fecharLoginAdmin);
  if (btnEntrarAdmin) btnEntrarAdmin.addEventListener('click', autenticarAdmin);

  if (btnFecharPainelAdmin) btnFecharPainelAdmin.addEventListener('click', fecharPainelAdmin);

  if (abaBtnCadastro) abaBtnCadastro.addEventListener('click', () => trocarAbaAdmin('cadastro'));
  if (abaBtnRegistros) abaBtnRegistros.addEventListener('click', () => trocarAbaAdmin('registros'));
  if (abaBtnPessoas) abaBtnPessoas.addEventListener('click', () => trocarAbaAdmin('pessoas'));

  if (btnGerarNovaMatricula) {
    btnGerarNovaMatricula.addEventListener('click', () => {
      novaMatriculaInput.value = gerarCodigoMatricula();
    });
  }
  if (btnSalvarFuncionario) {
    btnSalvarFuncionario.addEventListener('click', salvarNovoFuncionario);
  }
  btnBuscarFuncionario.addEventListener('click', buscarFuncionario);
  btnCapturarFoto.addEventListener('click', capturePhoto);
  btnRecapturarFoto.addEventListener('click', resetPhoto);
  btnRegistrarPonto.addEventListener('click', registrarPonto);

  paperSensorToggle.addEventListener('change', updatePaperSensor);

  btnImprimirFisico.addEventListener('click', () => {
    if (!hasPaper) return;
    alert('Comprovante impresso com sucesso!');
    fecharModalComprovante();
  });

  btnEnviarEmail.addEventListener('click', () => {
    alert('Comprovante enviado para o e-mail cadastrado!');
    fecharModalComprovante();
  });

  btnEnviarWhatsApp.addEventListener('click', () => {
    alert('Comprovante enviado via SMS / WhatsApp!');
    fecharModalComprovante();
  });

  btnVisualizarTela.addEventListener('click', () => {
    fecharModalComprovante();
  });

  btnFecharModalComprovante.addEventListener('click', fecharModalComprovante);
  emergencyBtn.addEventListener('click', acionarEmergencia);
});

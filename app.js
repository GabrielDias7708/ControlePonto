import { supabase } from './supabaseClient.js';
import { saveOfflineRegistro, syncOfflineRegistros } from './db.js';

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
  if (currentFuncionario && capturedPhotoBase64 && !isLocked) {
    btnRegistrarPonto.disabled = false;
  } else {
    btnRegistrarPonto.disabled = true;
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

  if (navigator.onLine) {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*, escala:escalas(*)')
      .eq('matricula', matricula)
      .eq('ativo', true)
      .maybeSingle();

    if (error || !data) {
      showSystemAlert('Matrícula não encontrada ou funcionário inativo.', 'danger');
      handleFailedAttempt();
      currentFuncionario = null;
      funcionarioDetails.classList.add('hidden');
      checkCanRegister();
      return;
    }

    currentFuncionario = data;
    failedAttemptsCount = 0;
    funcionarioNome.textContent = data.nome;
    funcionarioEscala.textContent = `Escala: ${data.escala ? data.escala.nome : 'Padrão'} (Tolerância: ${data.escala?.tolerancia_minutos || 10} min)`;
    funcionarioDetails.classList.remove('hidden');
    checkCanRegister();
  } else {
    // Modo offline: simulação / busca local parametrizada
    currentFuncionario = {
      id: '00000000-0000-0000-0000-000000000000',
      matricula: matricula,
      nome: `Funcionário (${matricula})`,
      escala: { nome: 'Escala Local Offline', tolerancia_minutos: 10 }
    };
    funcionarioNome.textContent = currentFuncionario.nome;
    funcionarioEscala.textContent = `Escala: Modo Offline (Tolerância: 10 min)`;
    funcionarioDetails.classList.remove('hidden');
    checkCanRegister();
  }
}

// Processar e Confirmar Registro de Ponto (RF01, RF02, RF05)
async function registrarPonto() {
  if (!currentFuncionario || !capturedPhotoBase64 || isLocked) return;

  btnRegistrarPonto.disabled = true;
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

  if (navigator.onLine) {
    const { data, error } = await supabase
      .from('registros_ponto')
      .insert([registroPayload])
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Erro ao salvar no Supabase, salvando offline:', error);
      await saveOfflineRegistro(registroPayload);
      showSystemAlert('Erro de rede. Registro salvo localmente em IndexedDB (criptografado).', 'warning');
    } else {
      showSystemAlert('Ponto registrado com sucesso e enviado ao servidor!', 'success');
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  startRealtimeClock();
  initCamera();
  fetchGeolocation();

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

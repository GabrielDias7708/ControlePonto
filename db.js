// Módulo de Gerenciamento do IndexedDB e Criptografia com Web Crypto API (AES-GCM)
import { supabase } from './supabaseClient.js';

const DB_NAME = 'PontoDB';
const DB_VERSION = 1;
const STORE_NAME = 'registros_offline';

// Chave fixa derivada/gerada para criptografia AES-GCM local
let cryptoKey = null;

async function getCryptoKey() {
  if (cryptoKey) return cryptoKey;
  // Chave de 256 bits estática para o dispositivo local
  const rawKey = new TextEncoder().encode('PONTO_PWA_SECRET_LOCAL_KEY_32B!');
  cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return cryptoKey;
}

// Criptografar dados sensíveis
async function encryptData(dataObject) {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(dataObject));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoded
  );

  return {
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(encryptedBuffer))
  };
}

// Descriptografar dados sensíveis
async function decryptData(encryptedPayload) {
  const key = await getCryptoKey();
  const iv = new Uint8Array(encryptedPayload.iv);
  const ciphertext = new Uint8Array(encryptedPayload.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  const decoded = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decoded);
}

// Inicializar IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Salvar registro de ponto offline criptografado
export async function saveOfflineRegistro(registroPayload) {
  const encrypted = await encryptData(registroPayload);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const item = {
      data: encrypted,
      timestamp: new Date().toISOString()
    };
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Obter todos os registros offline pendentes
export async function getOfflineRegistros() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = async () => {
      const rawList = request.result || [];
      const decryptedList = [];

      for (const item of rawList) {
        try {
          const decryptedPayload = await decryptData(item.data);
          decryptedList.push({
            id: item.id,
            payload: decryptedPayload,
            timestamp: item.timestamp
          });
        } catch (e) {
          console.error('Erro ao descriptografar registro offline:', e);
        }
      }
      resolve(decryptedList);
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

// Deletar registro offline sincronizado por ID
export async function deleteOfflineRegistro(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Sincronizar dados pendentes com o Supabase quando online
export async function syncOfflineRegistros() {
  if (!navigator.onLine) return;

  try {
    const pendingList = await getOfflineRegistros();
    if (pendingList.length === 0) return;

    console.log(`Iniciando sincronização de ${pendingList.length} registros offline...`);

    for (const record of pendingList) {
      const payload = {
        ...record.payload,
        modo_envio: 'OFFLINE_SYNC'
      };

      const { data, error } = await supabase
        .from('registros_ponto')
        .insert([payload]);

      if (!error) {
        await deleteOfflineRegistro(record.id);
        console.log(`Registro offline ID ${record.id} sincronizado com sucesso.`);
      } else {
        console.error(`Falha ao sincronizar registro offline ID ${record.id}:`, error);
      }
    }
  } catch (err) {
    console.error('Erro durante o processo de sincronização offline:', err);
  }
}

// Escutar retorno da conexão online para disparar sincronização
window.addEventListener('online', () => {
  syncOfflineRegistros();
});

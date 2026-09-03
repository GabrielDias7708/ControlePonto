// Módulo de Conexão com o Supabase via CDN (ES Modules)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Credenciais do Projeto Supabase
const SUPABASE_URL = 'https://zrnrbwhpogbsfctsebsg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n6DpQ9SJeSBxD7TK8ZFzhw_eVKrivcu';

// Instanciação do Cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Cliente Supabase inicializado com sucesso.');

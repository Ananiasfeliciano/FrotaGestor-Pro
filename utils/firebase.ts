/**
 * Firebase configuration for FrotaGestor Pro
 * 
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  INSTRUÇÕES PARA CONFIGURAR O FIREBASE:                     ║
 * ║                                                              ║
 * ║  1. Acesse https://console.firebase.google.com               ║
 * ║  2. Clique em "Adicionar Projeto" → nomeie "frotagestor-pro" ║
 * ║  3. Desative Google Analytics (opcional)                     ║
 * ║  4. No painel, clique na engrenagem → Configurações do proj. ║
 * ║  5. Em "Seus apps", clique no ícone Web (</>)                ║
 * ║  6. Registre o app como "FrotaGestor Pro"                    ║
 * ║  7. Copie os valores do firebaseConfig abaixo                ║
 * ║  8. Vá a "Realtime Database" → Criar banco de dados          ║
 * ║  9. Escolha a região (us-central1 ou outra)                  ║
 * ║ 10. Inicie em "modo de teste" (depois ajuste regras)         ║
 * ║ 11. Copie a URL do database (ex: https://xxx.firebaseio.com) ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

// ── Configuração do Firebase ─────────────────────────────────
// Substitua os valores abaixo pelas suas credenciais do Firebase Console
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'YOUR_API_KEY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'YOUR_PROJECT.firebaseapp.com',
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       || 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'YOUR_PROJECT_ID',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID       || 'YOUR_SENDER_ID',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || 'YOUR_APP_ID',
};

// ── Verificação de configuração ──────────────────────────────
function isFirebaseConfigured(): boolean {
  return (
    firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
    firebaseConfig.databaseURL !== 'https://YOUR_PROJECT-default-rtdb.firebaseio.com' &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
}

// ── Inicialização ────────────────────────────────────────────
let app: FirebaseApp | null = null;
let db: Database | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log('[Firebase] Conectado com sucesso ao Realtime Database');
  } catch (err) {
    console.warn('[Firebase] Erro ao inicializar:', err);
  }
} else {
  console.warn(
    '[Firebase] Não configurado. O sistema funcionará apenas localmente.\n' +
    'Para ativar a sincronização, configure as variáveis em .env ou utils/firebase.ts'
  );
}

export { app, db, isFirebaseConfigured };

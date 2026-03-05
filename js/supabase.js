/**
 * Configuración del cliente Supabase
 * 
 * IMPORTANTE: Reemplaza las variables abaixo con tus credenciales de Supabase
 * Obténlas en: https://app.supabase.com/project/_/settings/api
 */

const SUPABASE_URL = 'https://huzikrgtpuyafmkdrqhz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1emlrcmd0cHV5YWZta2RycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzkwMjcsImV4cCI6MjA4ODI1NTAyN30.Xenbv4TUBzSNLe6wJ_HtlrEg-6435OvCaMeWvzw7_1Y';

// Inicializar cliente Supabase
// Se usa _supabaseClient para evitar conflicto con window.supabase del SDK del CDN
const _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Verificar si el usuario está autenticado
 * @returns {Promise<Object|null>} Usuario actual o null
 */
async function getCurrentUser() {
    const { data: { user }, error } = await _supabaseClient.auth.getUser();
    if (error) {
        console.error('Error al obtener usuario:', error);
        return null;
    }
    return user;
}

/**
 * Verificar sesión actual
 * @returns {Promise<Object|null>} Sesión actual o null
 */
async function getSession() {
    const { data: { session }, error } = await _supabaseClient.auth.getSession();
    if (error) {
        console.error('Error al obtener sesión:', error);
        return null;
    }
    return session;
}

/**
 * Cerrar sesión
 */
async function signOut() {
    const { error } = await _supabaseClient.auth.signOut();
    if (error) {
        console.error('Error al cerrar sesión:', error);
        return false;
    }
    return true;
}

/**
 * Escuchar cambios en la autenticación
 * @param {Function} callback 
 */
function onAuthStateChange(callback) {
    _supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Exportar funciones para uso global
// AFM.supabase sigue siendo el mismo nombre para que auth.js y crm.js no necesiten cambios
window.AFM = {
    supabase: _supabaseClient,
    getCurrentUser,
    getSession,
    signOut,
    onAuthStateChange
};

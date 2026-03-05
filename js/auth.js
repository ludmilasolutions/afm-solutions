/**
 * Módulo de Autenticación AFM Tools
 * Maneja login, registro y gestión de sesión
 */

const AFMAuth = {
    currentUser: null,
    session: null,
    
    /**
     * Inicializar autenticación
     */
    async init() {
        this.session = await AFM.getSession();
        if (this.session) {
            this.currentUser = await AFM.getCurrentUser();
        }
        return this.currentUser;
    },
    
    /**
     * Verificar si el usuario está logueado
     */
    isAuthenticated() {
        return this.currentUser !== null;
    },
    
    /**
     * Obtener el usuario actual
     */
    getUser() {
        return this.currentUser;
    },
    
    /**
     * Iniciar sesión con email y contraseña
     * @param {string} email 
     * @param {string} password 
     */
    async signInWithEmail(email, password) {
        const { data, error } = await AFM.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        this.currentUser = data.user;
        this.session = data.session;
        return data;
    },
    
    /**
     * Registrar nuevo usuario con email y contraseña
     * @param {string} email 
     * @param {string} password 
     */
    async signUpWithEmail(email, password) {
        const { data, error } = await AFM.supabase.auth.signUp({
            email,
            password
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        return data;
    },
    
    /**
     * Iniciar sesión con Google
     */
    async signInWithGoogle() {
        const { data, error } = await AFM.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/apps/login.html'
            }
        });
        
        if (error) {
            throw new Error(error.message        return data;
);
        }
        
    },
    
    /**
     * Cerrar sesión
     */
    async logout() {
        const success = await AFM.signOut();
        if (success) {
            this.currentUser = null;
            this.session = null;
        }
        return success;
    },
    
    /**
     * Escuchar cambios en el estado de autenticación
     * @param {Function} callback 
     */
    onStateChange(callback) {
        AFM.onAuthStateChange((event, session) => {
            this.session = session;
            if (session?.user) {
                this.currentUser = session.user;
            } else {
                this.currentUser = null;
            }
            callback(event, session);
        });
    },
    
    /**
     * Redireccionar a página de login si no está autenticado
     * @param {string} redirectUrl - URL a la que redireccionar después del login
     */
    requireAuth(redirectUrl = null) {
        if (!this.isAuthenticated()) {
            const url = redirectUrl ? `/apps/login.html?redirect=${encodeURIComponent(redirectUrl)}` : '/apps/login.html';
            window.location.href = url;
            return false;
        }
        return true;
    },
    
    /**
     * Obtener el nombre para mostrar del usuario
     */
    getDisplayName() {
        if (!this.currentUser) return 'Invitado';
        
        // Intentar obtener nombre de user_metadata
        const metadata = this.currentUser.user_metadata;
        if (metadata?.full_name) return metadata.full_name;
        if (metadata?.name) return metadata.name;
        if (metadata?.email) return metadata.email.split('@')[0];
        
        return this.currentUser.email?.split('@')[0] || 'Usuario';
    },
    
    /**
     * Obtener email del usuario
     */
    getEmail() {
        return this.currentUser?.email || '';
    },
    
    /**
     * Obtener ID del usuario
     */
    getUserId() {
        return this.currentUser?.id || null;
    }
};

// Exportar al objeto global
window.AFMAuth = AFMAuth;

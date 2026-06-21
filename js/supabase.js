/**
 * ================================================
 * GREENROUTE - SUPABASE CONFIGURATION
 * Integração com Supabase para Autenticação e Dados
 * ================================================
 */

// Configuração do Supabase - SUBSTITUIR COM SUAS CREDENCIAIS
const SUPABASE_URL = 'https://ffzactgxmvljchmjzhaa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PrMs2Eloua9mBZJ2GDWfvA_wCBBiiBf';

// Classe para gerenciar Supabase
class SupabaseClient {
    constructor() {
        this.url = SUPABASE_URL;
        this.anonKey = SUPABASE_ANON_KEY;
        this.isConfigured = this.url && 
                            this.anonKey;
    }

    /**
     * Faz uma requisição para a API REST do Supabase
     * @param {string} endpoint - Endpoint da API
     * @param {object} options - Opções da requisição
     * @returns {Promise<any>}
     */
    async request(endpoint, options = {}) {
        if (!this.isConfigured) {
            console.warn('Supabase não configurado. Usando dados locais.');
            return null;
        }

        const url = `${this.url}/rest/v1${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`,
            'apikey': this.anonKey,
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(errorText);
                throw new Error(`Erro Supabase: ${response.status}`);
            }

            const text = await response.text();

            return text ? JSON.parse(text) : {};
        } catch (error) {
            console.error('Erro na requisição Supabase:', error);
            return null;
        }
    }

    /**
     * Autentica um utilizador com email e senha
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>}
     */
    async signUp(email, password, userData = {}) {
        if (!this.isConfigured) {
            // Simular registo localmente
            const user = {
                id: Math.random().toString(36).substr(2, 9),
                email,
                user_metadata: userData,
                created_at: new Date().toISOString()
            };
            localStorage.setItem('auth_user', JSON.stringify(user));
            localStorage.setItem('auth_token', btoa(email + ':' + password));
            return user;
        }

        try {
            const response = await fetch(`${this.url}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.anonKey
                },
                body: JSON.stringify({
                    email,
                    password,
                    data: userData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Resposta Supabase:', errorData);
                throw new Error(errorData.msg || errorData.message || 'Erro ao registar');
            }

           const data = await response.json();

            console.log('Resposta signup:', data);

            localStorage.setItem('auth_user', JSON.stringify(data.user));

            if (data.session && data.session.access_token) {
                localStorage.setItem(
                    'auth_token',
                    data.session.access_token
                );
            }

            return data.user;
        } catch (error) {
            console.error('Erro no registo:', error);
            throw error;
        }
    }

    /**
     * Autentica um utilizador com email e senha
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>}
     */
    async signIn(email, password) {
        if (!this.isConfigured) {
            // Simular login localmente
            const storedUser = localStorage.getItem('auth_user');
            const storedPassword = localStorage.getItem('auth_password_' + email);
            
            if (storedPassword === btoa(password)) {
                return JSON.parse(storedUser || '{}');
            }
            throw new Error('Credenciais inválidas');
        }

        try {
            const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.anonKey
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                throw new Error('Erro ao fazer login');
            }

           const data = await response.json();

            console.log(data);

            localStorage.setItem(
                'auth_user',
                JSON.stringify(data.user)
            );

            localStorage.setItem(
                'auth_token',
                data.access_token
            );

            return data.user;
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    /**
     * Faz logout do utilizador
     */
    async signOut() {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
    }

    /**
     * Retorna o utilizador atualmente autenticado
     * @returns {object|null}
     */
    getCurrentUser() {
        const user = localStorage.getItem('auth_user');

        if (!user || user === 'undefined') {
            return null;
        }

        try {
            return JSON.parse(user);
        }  catch {
            return null;
        }
    }

    /**
     * Retorna o token de autenticação
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem('auth_token');
    }

    /**
     * Insere um novo favorito
     * @param {string} userId
     * @param {object} favorite
     * @returns {Promise<object>}
     */
    async insertFavorite(userId, favorite) {
        if (!this.isConfigured) {
            // Guardar localmente
            let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            favorite.id = Math.random().toString(36).substr(2, 9);
            favorite.user_id = userId;
            favorite.created_at = new Date().toISOString();
            favorites.push(favorite);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            return favorite;
        }

        return await this.request('/favorites', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                origin: favorite.origin,
                destination: favorite.destination,
                transport: favorite.transport,
                created_at: new Date().toISOString()
            })
        });

        
    }

    /**
     * Retorna os favoritos de um utilizador
     * @param {string} userId
     * @returns {Promise<array>}
     */
    async getFavorites(userId) {
        if (!this.isConfigured) {
            // Carregar localmente
            return JSON.parse(localStorage.getItem('favorites') || '[]')
                .filter(fav => fav.user_id === userId);
        }

        return await this.request(`/favorites?user_id=eq.${userId}`);
    }

    /**
     * Apaga um favorito
     * @param {string} favoriteId
     * @returns {Promise<void>}
     */
    async deleteFavorite(favoriteId) {
        if (!this.isConfigured) {
            // Apagar localmente
            let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            favorites = favorites.filter(fav => fav.id !== favoriteId);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            return;
        }

        return await this.request(`/favorites?id=eq.${favoriteId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Insere um histórico de pesquisa
     * @param {string} userId
     * @param {object} search
     * @returns {Promise<object>}
     */
    async insertSearchHistory(userId, search) {
        if (!this.isConfigured) {
            // Guardar localmente
            let history = JSON.parse(localStorage.getItem('search_history') || '[]');
            search.id = Math.random().toString(36).substr(2, 9);
            search.user_id = userId;
            search.created_at = new Date().toISOString();
            history.unshift(search); // Adicionar no início
            history = history.slice(0, 50); // Manter últimas 50 pesquisas
            localStorage.setItem('search_history', JSON.stringify(history));
            return search;
        }

        console.log('USER ID:', userId);
        console.log('AUTH USER:', this.getCurrentUser());
        console.log('SEARCH:', search);

       return await this.request('/search_history', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                origin: search.origin,
                destination: search.destination,
                transport: search.transport,
                distance: search.distance || null,
                time_minutes: search.time_minutes || null,
                co2_emissions: search.co2_emissions || null,
                created_at: new Date().toISOString()
            })
        });
    }



    async getProfile(userId) {

        const data = await this.request(
            `/profiles?id=eq.${userId}&select=*`
        );

        return data[0];

    }


    async getAdminStats() {

        const users =
            await this.request('/profiles');

        const favorites =
            await this.request('/favorites');

        const history =
            await this.request('/search_history');

        return {
            usersCount: users ? users.length : 0,
            favoritesCount: favorites ? favorites.length : 0,
            historyCount: history ? history.length : 0
        };

    }

    /**
     * Retorna o histórico de pesquisas de um utilizador
     * @param {string} userId
     * @returns {Promise<array>}
     */
    async getSearchHistory(userId) {
        if (!this.isConfigured) {
            // Carregar localmente
            return JSON.parse(localStorage.getItem('search_history') || '[]')
                .filter(hist => hist.user_id === userId);
        }

        return await this.request(`/search_history?user_id=eq.${userId}&order=created_at.desc&limit=50`);
    }

    /**
     * Atualiza o perfil do utilizador
     * @param {string} userId
     * @param {object} userData
     * @returns {Promise<object>}
     */
    async updateUserProfile(userId, userData) {
        if (!this.isConfigured) {
            // Atualizar localmente
            let user = JSON.parse(localStorage.getItem('auth_user') || '{}');
            user = { ...user, ...userData };
            localStorage.setItem('auth_user', JSON.stringify(user));
            return user;
        }

        return await this.request(`/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(userData)
        });
    }
}

// Instância global do Supabase
const supabase = new SupabaseClient();

console.log('Supabase configurado:', supabase.isConfigured ? 'Sim' : 'Não - usando modo offline');

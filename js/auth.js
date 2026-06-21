/**
 * ================================================
 * GREENROUTE - AUTENTICAÇÃO E GESTÃO DE UTILIZADORES
 * Sistema de login, registo e perfil
 * ================================================
 */

// Classe para gerir a autenticação
class Auth {
    // Elementos DOM
    static loginBtn = document.getElementById('loginBtn');
    static userBtn = document.getElementById('userBtn');
    static userName = document.getElementById('userName');
    static loginModal = document.getElementById('loginModal');
    static profileModal = document.getElementById('profileModal');
    static favoritesModal = document.getElementById('favoritesModal');
    static historyModal = document.getElementById('historyModal');

    static loginForm = document.getElementById('loginForm');
    static registerForm = document.getElementById('registerForm');

    /**
     * Inicializa o sistema de autenticação
     */
    static init() {
        // Verificar se há um utilizador autenticado
        const user = supabase.getCurrentUser();
        if (user) {
            this.showUserProfile(user);
        }

        // Eventos dos formulários
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.loginForm.style.display !== 'none') {
                    this.login();
                } else if (this.registerForm.style.display !== 'none') {
                    this.register();
                }
            }
        });

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
                this.closeLoginModal();
            }
            if (e.target === this.profileModal) {
                this.closeProfileModal();
            }
            if (e.target === this.favoritesModal) {
                this.closeFavoritesModal();
            }
            if (e.target === this.historyModal) {
                this.closeHistoryModal();
            }
        });


        const role = localStorage.getItem('user_role');
        const adminLink = document.getElementById('adminLink');

            if (adminLink) {
                adminLink.style.display = role === 'admin'
                    ? 'block'
                    : 'none';
            }
        }

    /**
     * Mostra o modal de login
     */
    static showLoginModal() {
        this.loginModal.style.display = 'block';
        this.switchToLogin();
        document.getElementById('loginEmail').focus();
    }

    /**
     * Fecha o modal de login
     */
    static closeLoginModal() {
        this.loginModal.style.display = 'none';
        // Limpar formulários
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerPasswordConfirm').value = '';
    }

    /**
     * Alterna para o formulário de login
     */
    static switchToLogin() {
        this.loginForm.style.display = 'block';
        this.registerForm.style.display = 'none';
    }

    /**
     * Alterna para o formulário de registo
     */
    static switchToRegister() {
        this.loginForm.style.display = 'none';
        this.registerForm.style.display = 'block';
        document.getElementById('registerName').focus();
    }

    /**
     * Realiza o login do utilizador
     */
    static async login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Validação
        if (!email || !password) {
            this.showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showNotification('Email inválido', 'error');
            return;
        }

        try {
            const user = await supabase.signIn(email, password);
            const profile = await supabase.getProfile(user.id);

            localStorage.setItem(
            'user_role',
            profile.role || 'user'
        );
            await this.showUserProfile(user);
            this.closeLoginModal();
            this.showNotification(`Bem-vindo, ${user.email}!`, 'success');
        } catch (error) {
            console.error('Erro no login:', error);
            this.showNotification('Email ou palavra-passe incorretos', 'error');
        }
    }




    /**
     * Realiza o registo de um novo utilizador
     */
    static async register() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        // Validação
        if (!name || !email || !password || !passwordConfirm) {
            this.showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }


        if (!this.validateEmail(email)) {
            this.showNotification('Email inválido', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('A palavra-passe deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            this.showNotification('As palavras-passe não coincidem', 'error');
            return;
        }

        try {
            const user = await supabase.signUp(email, password, { name });
            
            // Guardar password localmente para modo offline
            if (!supabase.isConfigured) {
                localStorage.setItem('auth_password_' + email, btoa(password));
            }

            this.showUserProfile(user);
            this.closeLoginModal();
            this.showNotification(`Bem-vindo, ${name}!`, 'success');
        } catch (error) {
            console.error('Erro no registo:', error);
            this.showNotification('Erro ao registar. Tente novamente.', 'error');
        }
    }

    /**
     * Faz logout do utilizador
    */
    static async logout() {

        await supabase.signOut();

        localStorage.removeItem('user_role');

        const adminLink =
            document.getElementById('adminLink');

        if (adminLink) {
            adminLink.style.display = 'none';
        }

        this.hideUserProfile();

        this.showNotification(
            'Logout realizado com sucesso',
            'success'
        );

    }

    /**
     * Mostra o perfil do utilizador na interface
    */
   static async showUserProfile(user) {

        const userName =
            user.user_metadata?.name || user.email;

        this.userName.textContent = userName;

        this.loginBtn.style.display = 'none';
        this.userBtn.style.display = 'flex';

        const adminLink =
            document.getElementById('adminLink');

            if (adminLink) {

            try {

                const profile =
                await supabase.getProfile(user.id);

            adminLink.style.display =
                profile && profile.role === 'admin'
                    ? 'block'
                    : 'none';

            } catch (error) {

                adminLink.style.display = 'none';

            }
        }

    }

    /**
     * Esconde o perfil do utilizador
     */
    static hideUserProfile() {
        this.loginBtn.style.display = 'block';
        this.userBtn.style.display = 'none';
    }

    /**
     * Mostra o modal de perfil
     */
    static showProfileModal() {
        const user = supabase.getCurrentUser();
        if (!user) {
            this.showNotification('Deve fazer login primeiro', 'error');
            return;
        }

        const name = user.user_metadata?.name || 'Não definido';
        const email = user.email;
        const createdAt = new Date(user.created_at).toLocaleDateString('pt-PT');

        document.getElementById('profileName').textContent = name;
        document.getElementById('profileEmail').textContent = email;
        document.getElementById('profileDate').textContent = createdAt;

        this.profileModal.style.display = 'block';
    }



    /**
     * Fecha o modal de perfil
     */
    static closeProfileModal() {
        this.profileModal.style.display = 'none';
    }

    /**
     * Mostra o modal de favoritos
     */
    static async showFavorites() {
        const user = supabase.getCurrentUser();
        if (!user) {
            this.showNotification('Deve fazer login primeiro', 'error');
            return;
        }

        try {
            const favorites = await supabase.getFavorites(user.id);
            const favoritesList = document.getElementById('favoritesList');

            if (!favorites || favorites.length === 0) {
                favoritesList.innerHTML = '<p>Nenhum favorito salvo</p>';
            } else {
                favoritesList.innerHTML = favorites.map(fav => `
                    <div class="favorite-item">
                        <div>
                            <strong>${fav.origin} → ${fav.destination}</strong>
                            <p style="font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">
                                ${fav.transport} • ${new Date(fav.created_at).toLocaleDateString('pt-PT')}
                            </p>
                        </div>
                        <button onclick="Auth.loadFavorite('${fav.id}')">Carregar</button>
                    </div>
                `).join('');
            }

            this.favoritesModal.style.display = 'block';
        } catch (error) {
            console.error('Erro ao carregar favoritos:', error);
            this.showNotification('Erro ao carregar favoritos', 'error');
        }
    }

    /**
     * Fecha o modal de favoritos
     */
    static closeFavoritesModal() {
        this.favoritesModal.style.display = 'none';
    }

    /**
     * Mostra o modal de histórico
     */
    static async showHistory() {
        const user = supabase.getCurrentUser();
        if (!user) {
            this.showNotification('Deve fazer login primeiro', 'error');
            return;
        }

        try {
            const history = await supabase.getSearchHistory(user.id);
            const historyList = document.getElementById('historyList');

            if (!history || history.length === 0) {
                historyList.innerHTML = '<p>Nenhuma pesquisa salva</p>';
            } else {
                historyList.innerHTML = history.map(hist => `
                    <div class="history-item">
                        <div>
                            <strong>${hist.origin} → ${hist.destination}</strong>
                            <p style="font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">
                                ${hist.transport} • ${new Date(hist.created_at).toLocaleDateString('pt-PT')}
                            </p>
                        </div>
                        <button onclick="Auth.loadHistory('${hist.id}')">Carregar</button>
                    </div>
                `).join('');
            }

            this.historyModal.style.display = 'block';
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            this.showNotification('Erro ao carregar histórico', 'error');
        }
    }

    /**
     * Fecha o modal de histórico
     */
    static closeHistoryModal() {
        this.historyModal.style.display = 'none';
    }

    /**
     * Carrega um favorito na pesquisa
    */
   static async loadFavorite(favoriteId) {

    const user = supabase.getCurrentUser();

    const favorites = await supabase.getFavorites(user.id);

    const favorite = favorites.find(
        f => f.id === favoriteId
    );

    if (!favorite) {

        this.showNotification(
            'Favorito não encontrado',
            'error'
        );

        return;
    }

    try {

        document.getElementById('destination').value =
            favorite.destination;

        const response = await fetch(
            `https://api.openrouteservice.org/geocode/search?api_key=${Map.ORS_API_KEY}&text=${encodeURIComponent(favorite.destination)}&size=1`
        );

        const data = await response.json();

        if (
            data.features &&
            data.features.length > 0
        ) {

            const lon =
                data.features[0].geometry.coordinates[0];

            const lat =
                data.features[0].geometry.coordinates[1];

            Map.selectDestination(
                favorite.destination,
                lat,
                lon
            );

        }

        this.closeFavoritesModal();

        this.showNotification(
            'Favorito carregado',
            'success'
        );

    } catch (error) {

        console.error(error);

        this.showNotification(
            'Erro ao carregar favorito',
            'error'
        );

    }

}
    
    
    /**
     * Carrega um histórico na pesquisa
    */
    
    static async loadHistory(historyId) {

    const user = supabase.getCurrentUser();

    const history =
        await supabase.getSearchHistory(user.id);

    const item =
        history.find(h => h.id === historyId);

    if (!item) {

        this.showNotification(
            'Pesquisa não encontrada',
            'error'
        );

        return;
    }

    try {

        document.getElementById('destination').value =
            item.destination;

        const response = await fetch(
            `https://api.openrouteservice.org/geocode/search?api_key=${Map.ORS_API_KEY}&text=${encodeURIComponent(item.destination)}&size=1`
        );

        const data = await response.json();

        if (
            data.features &&
            data.features.length > 0
        ) {

            const lon =
                data.features[0].geometry.coordinates[0];

            const lat =
                data.features[0].geometry.coordinates[1];

            Map.selectDestination(
                item.destination,
                lat,
                lon
            );

        }

        this.closeHistoryModal();

        this.showNotification(
            'Pesquisa carregada',
            'success'
        );

    } catch (error) {

        console.error(error);

        this.showNotification(
            'Erro ao carregar pesquisa',
            'error'
        );

    }

}
    /**
     * Valida o formato do email
    */

    static showAdminPanel() {
        document.getElementById('adminModal').style.display = 'block';
        this.loadAdminStats();
    }


    static closeAdminPanel() {

        document.getElementById('adminModal').style.display = 'none';

    }




   static async loadAdminStats() {

        const stats = await supabase.getAdminStats();

        document.getElementById('adminStats').innerHTML = `
            <p>Utilizadores: ${stats.usersCount}</p>
            <p>Favoritos: ${stats.favoritesCount}</p>
            <p>Pesquisas: ${stats.historyCount}</p>
        `;
    }




    static async loadUsersList() {

        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            return;
        }   

        const container = document.getElementById('usersList');

        container.innerHTML = data.map(user => `

            <div class="admin-user-card">

                <div>
                    <strong>${user.name}</strong><br>
                    ${user.email}<br>
                    Role: ${user.role}
                </div>

                <div>

                    <button
                        onclick="Auth.toggleAdmin('${user.id}','${user.role}')"
                    >
                        ${user.role === 'admin'
                            ? 'Remover Admin'
                            : 'Tornar Admin'}
                    </button>

                </div>

            </div>

        `).join('');

    }


    static async toggleAdmin(userId, currentRole) {

        const newRole =
            currentRole === 'admin'
                ? 'user'
                : 'admin';

        const { error } = await supabaseClient
            .from('profiles')
            .update({
                role: newRole
            })
            .eq('id', userId);

        if (error) {

            console.error(error);
            return;

        }

        this.loadUsersList();

    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Mostra uma notificação
     */
    static showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 4000);
    }
}

// Inicializar autenticação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

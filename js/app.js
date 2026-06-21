/**
 * ================================================
 * GREENROUTE - APLICAÇÃO PRINCIPAL
 * Progressive Web App - Mobilidade Sustentável
 * ================================================
 */

// Configuração global da aplicação
const APP_CONFIG = {
    name: 'GreenRoute',
    version: '1.0.0',
    description: 'Aplicação de mobilidade sustentável com rotas ecológicas',
    isDevelopment: true
};

/**
 * Classe principal da aplicação
 */
class GreenRoute {
    /**
     * Inicializa a aplicação
     */
    static init() {
        console.log(`Iniciando ${APP_CONFIG.name} v${APP_CONFIG.version}`);

        // Verificar suporte para PWA
        this.checkPWASupport();

        // Inicializar componentes
        this.initializeComponents();

        // Configurar event listeners globais
        this.setupEventListeners();

        // Carregar dados armazenados
        this.loadStoredData();

        console.log('Aplicação iniciada com sucesso!');
    }

    /**
     * Verifica o suporte para PWA
     */
    static checkPWASupport() {
        const features = {
            serviceWorker: 'serviceWorker' in navigator,
            notifications: 'Notification' in window,
            geolocation: 'geolocation' in navigator,
            localStorage: typeof(Storage) !== 'undefined',
            cache: 'caches' in window
        };

        console.log('Suporte PWA:', features);

        // Mostrar prompt de instalação em dispositivos móveis
        if (this.isMobile()) {
            this.setupInstallPrompt();
        }
    }

    /**
     * Inicializa os componentes principais
     */
    static initializeComponents() {
        // Auth já é inicializado no ficheiro auth.js
        // Map já é inicializado no ficheiro map.js
        
        // Aplicar tema inicial
        this.applyTheme();

        console.log('Componentes inicializados');
    }

    /**
     * Configura event listeners globais
     */
    static setupEventListeners() {
        // Responder a mudanças de conectividade
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });

        // Responder a mudanças de tema
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                this.applyTheme();
            });
        }

        // Prevenir comportamentos padrão indesejados
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.map-container')) {
                e.preventDefault();
            }
        });
    }

    /**
     * Carrega dados armazenados localmente
     */
    static loadStoredData() {
        // Carregar preferências do utilizador
        const theme = localStorage.getItem('theme') || 'auto';
        const transport = localStorage.getItem('lastTransport') || 'car';

        // Restaurar último tipo de transporte selecionado
        document.querySelector(`input[name="transport"][value="${transport}"]`).checked = true;

        console.log('Dados carregados: tema=' + theme + ', transporte=' + transport);
    }

    /**
     * Aplica o tema (claro/escuro)
     */
    static applyTheme() {
        let theme = localStorage.getItem('theme') || 'auto';

        if (theme === 'auto') {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.documentElement.dataset.theme = theme;
        localStorage.setItem('theme', theme);
    }

    /**
     * Alterna o tema
     */
    static toggleTheme() {
        const current = localStorage.getItem('theme') || 'auto';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', next);
        this.applyTheme();
        Auth.showNotification(`Tema alterado para ${next}`, 'success');
    }

    /**
     * Verifica se é um dispositivo móvel
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Configura o prompt de instalação da PWA
     */
    static setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Mostrar botão de instalação (opcional)
            const installBtn = document.createElement('button');
            installBtn.textContent = '📱 Instalar App';
            installBtn.className = 'btn-install';
            installBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 999;
                padding: 12px 24px;
                background-color: #10b981;
                color: white;
                border: none;
                border-radius: 0.5rem;
                cursor: pointer;
                font-weight: 600;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `;

            installBtn.addEventListener('click', () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('App instalada com sucesso');
                            Auth.showNotification('App instalada com sucesso!', 'success');
                        }
                        deferredPrompt = null;
                        installBtn.remove();
                    });
                }
            });

            document.body.appendChild(installBtn);
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA instalada');
        });
    }

    /**
     * Manipula quando o dispositivo volta online
     */
    static handleOnline() {
        console.log('Dispositivo online');
        Auth.showNotification('Conexão restaurada', 'success');
        
        // Sincronizar dados se necessário
        this.syncData();
    }

    /**
     * Manipula quando o dispositivo fica offline
     */
    static handleOffline() {
        console.log('Dispositivo offline');
        Auth.showNotification('Modo offline ativado', 'warning');
    }

    /**
     * Sincroniza dados com o servidor
     */
    static async syncData() {
        console.log('Sincronizando dados...');
        // Implementar sincronização de dados pendentes
    }

    /**
     * Obtém informações da aplicação
     */
    static getAppInfo() {
        return {
            name: APP_CONFIG.name,
            version: APP_CONFIG.version,
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            storage: {
                available: localStorage.length + sessionStorage.length,
                quota: this.getStorageQuota()
            }
        };
    }

    /**
     * Obtém quota de armazenamento
     */
    static async getStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    percentage: Math.round((estimate.usage / estimate.quota) * 100)
                };
            } catch (error) {
                console.error('Erro ao obter quota de armazenamento:', error);
            }
        }
        return null;
    }

    /**
     * Limpa dados em cache
     */
    static async clearCache() {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            
            // Limpar localStorage
            localStorage.clear();
            sessionStorage.clear();

            Auth.showNotification('Cache limpo com sucesso', 'success');
            console.log('Cache limpo');
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            Auth.showNotification('Erro ao limpar cache', 'error');
        }
    }

    /**
     * Exporta dados do utilizador
     */
    static exportUserData() {
        const user = supabase.getCurrentUser();
        if (!user) {
            Auth.showNotification('Deve fazer login primeiro', 'error');
            return;
        }

        const userData = {
            user: user,
            favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
            history: JSON.parse(localStorage.getItem('search_history') || '[]'),
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `greenroute-data-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Auth.showNotification('Dados exportados com sucesso', 'success');
    }

    /**
     * Imprime a rota atual
     */
    static printRoute() {
        window.print();
    }

    /**
     * Partilha a rota (Web Share API)
     */
    static async shareRoute() {
        const origin = document.getElementById('origin').value;
        const destination = document.getElementById('destination').value;

        if (!destination) {
            Auth.showNotification('Selecione um destino para partilhar', 'error');
            return;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'GreenRoute - Rota Ecológica',
                    text: `Rota de ${origin} para ${destination}`,
                    url: window.location.href
                });
                Auth.showNotification('Rota partilhada com sucesso', 'success');
            } catch (error) {
                console.error('Erro ao partilhar:', error);
            }
        } else {
            // Fallback - copiar para clipboard
            const text = `${origin} → ${destination}`;
            navigator.clipboard.writeText(text).then(() => {
                Auth.showNotification('Rota copiada para clipboard', 'success');
            });
        }
    }

    /**
     * Mostra a ajuda da aplicação
     */
    static showHelp() {
        const help = `
            GreenRoute - Ajuda

            1. COMO USAR:
            - Insira um destino na barra de pesquisa
            - Selecione o modo de transporte
            - Clique em "Pesquisar Rota"

            2. FUNCIONALIDADES:
            - Comparação de emissões de CO₂
            - Cálculo automático de rotas
            - Sistema de favoritos
            - Histórico de pesquisas

            3. DADOS ECOLÓGICOS:
            - Carro: 0.192 kg CO₂/km
            - Autocarro: 0.105 kg CO₂/km
            - Bicicleta: 0 kg CO₂/km
            - A pé: 0 kg CO₂/km

            4. MODO OFFLINE:
            - A aplicação funciona sem conexão
            - Os dados são sincronizados quando estiver online

            Para mais informações, visite: https://greenroute.example.com
        `;

        alert(help);
    }

    /**
     * Mostra informações sobre a aplicação
     */
    static showAbout() {
        const info = this.getAppInfo();
        const message = `
${APP_CONFIG.name} v${APP_CONFIG.version}

${APP_CONFIG.description}

Status: ${info.online ? 'Online' : 'Offline'}

Desenvolvido com ❤️ para mobilidade sustentável
        `;

        alert(message);
    }
}

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    GreenRoute.init();
});

// Expor métodos globais (para acesso rápido)
window.App = GreenRoute;


document.addEventListener('DOMContentLoaded', () => {

    const userBtn =
        document.getElementById('userBtn');

    const dropdown =
        document.querySelector('.dropdown-menu');

    if(userBtn && dropdown){

        userBtn.addEventListener('click', (e) => {

            e.stopPropagation();

            dropdown.classList.toggle('show');

        });

        document.addEventListener('click', () => {

            dropdown.classList.remove('show');

        });

    }

});

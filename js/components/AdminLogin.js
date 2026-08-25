import { store } from '../main.js';

const API = 'https://d1-wrkr.ullteam.workers.dev';

export default {
    template: `
        <div class="admin-login-gate">
            <h2 class="admin-login-title">Moderator Login</h2>
            <p class="admin-login-desc">Enter your API key to access this page.</p>
            <form @submit.prevent="login" class="admin-login-form">
                <input
                    v-model="key"
                    type="password"
                    placeholder="API Key"
                    class="admin-login-input"
                    autocomplete="current-password"
                    required
                />
                <p v-if="error" class="admin-login-error">{{ error }}</p>
                <button type="submit" class="admin-login-btn" :disabled="loading">
                    {{ loading ? 'Verifying…' : 'Login' }}
                </button>
            </form>
        </div>
    `,
    data: () => ({ key: '', error: '', loading: false }),
    methods: {
        async login() {
            this.error = '';
            this.loading = true;
            try {
                const res = await fetch(`${API}/api/auth/validate`, {
                    headers: { Authorization: `Bearer ${this.key}` },
                });
                if (res.ok) {
                    store.authKey = this.key;
                    this.key = '';
                } else {
                    this.error = 'Invalid API key.';
                }
            } catch {
                this.error = 'Connection error. Try again.';
            }
            this.loading = false;
        },
    },
};

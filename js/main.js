import routes from './routes.js';

export const store = Vue.reactive({
    dark: localStorage.getItem('dark') === null ? true : JSON.parse(localStorage.getItem('dark')),
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ store }),
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');

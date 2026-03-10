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

// Auto-redirect mobile devices
const isMobile = () => window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
router.beforeEach((to, from, next) => {
    if (isMobile() && to.path !== '/mobile') {
        next('/mobile');
    } else if (!isMobile() && to.path === '/mobile') {
        next('/');
    } else {
        next();
    }
});

app.use(router);
app.mount('#app');

import routes from './routes.js';

export const store = Vue.reactive({
    dark: localStorage.getItem('dark') === null ? false : JSON.parse(localStorage.getItem('dark')),
    showThumbnails: localStorage.getItem('showThumbnails') === null ? true : JSON.parse(localStorage.getItem('showThumbnails')),
    showColors: localStorage.getItem('showColors') === null ? true : JSON.parse(localStorage.getItem('showColors')),
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
    setThumbnails(v) {
        this.showThumbnails = v;
        localStorage.setItem('showThumbnails', JSON.stringify(v));
    },
    setColors(v) {
        this.showColors = v;
        localStorage.setItem('showColors', JSON.stringify(v));
    },
});

const app = Vue.createApp({ data: () => ({ store }) });
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

const isMobile = () => window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
router.beforeEach((to, from, next) => {
    if (isMobile() && to.path !== '/mobile') next('/mobile');
    else if (!isMobile() && to.path === '/mobile') next('/');
    else next();
});

app.use(router);
app.mount('#app');

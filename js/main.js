import routes from './routes.js';

export const store = Vue.reactive({
    dark: localStorage.getItem('dark') === null ? false : JSON.parse(localStorage.getItem('dark')),
    thumbnails: localStorage.getItem('thumbnails') === null ? true : JSON.parse(localStorage.getItem('thumbnails')),
    levelColoring: localStorage.getItem('levelColoring') === null ? true : JSON.parse(localStorage.getItem('levelColoring')),
    showSettings: false,
    showColoringHint: false,
    coloringHintDismissed: localStorage.getItem('coloringHintDismissed') === 'true',
    coloringHintCooldown: (() => {
        const until = Number(localStorage.getItem('coloringHintCooldownUntil') || 0);
        return Date.now() < until;
    })(),
    coloringHintNeverShow: false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
    saveSetting(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    dismissColoringHint() {
        this.showColoringHint = false;
        if (this.coloringHintNeverShow) {
            this.coloringHintDismissed = true;
            localStorage.setItem('coloringHintDismissed', 'true');
        }
        // 10 minute cooldown
        this.coloringHintCooldown = true;
        localStorage.setItem('coloringHintCooldownUntil', String(Date.now() + 10 * 60 * 1000));
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

// Coloring hint popup timer — counts only on list/upcoming pages
const hintPages = ['/list', '/listmain', '/listfuture', '/upcoming'];
let hintElapsed = 0;
let hintInterval = null;

function startHintTimer() {
    if (store.coloringHintDismissed || store.coloringHintCooldown || store.showColoringHint || hintInterval) return;
    hintInterval = setInterval(() => {
        hintElapsed++;
        if (hintElapsed >= 20) {
            store.showColoringHint = true;
            clearInterval(hintInterval);
            hintInterval = null;
        }
    }, 1000);
}

function stopHintTimer() {
    if (hintInterval) {
        clearInterval(hintInterval);
        hintInterval = null;
    }
}

router.afterEach((to) => {
    if (hintPages.includes(to.path)) {
        startHintTimer();
    } else {
        stopHintTimer();
    }
});

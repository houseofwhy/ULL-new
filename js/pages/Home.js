import { store } from '../main.js';

export default {
    template: `
        <main class="home-page">
            <div style="display:flex; align-items:center; justify-content:center; height:100%; flex-direction:column; gap:1rem; opacity:0.5;">
                <h1 style="font-size:2.5rem;">ULL</h1>
                <p>Upcoming Levels List</p>
            </div>
        </main>
    `,
    data: () => ({ store }),
};

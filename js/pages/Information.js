import { store } from '../main.js';

export default {
    template: `
        <main class="information-page">
            <div style="display:flex; align-items:center; justify-content:center; height:100%; flex-direction:column; gap:1rem; opacity:0.5;">
                <h1 style="font-size:2rem;">Information</h1>
                <p>Coming soon</p>
            </div>
        </main>
    `,
    data: () => ({ store }),
};

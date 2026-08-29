import { store } from '../main.js';

export default {
    data: () => ({ store }),
    template: `
<footer class="site-footer">
    <div class="site-footer-inner">
        <div class="site-footer-brand">
            <h3>Upcoming Levels List</h3>
            <p>A community-maintained catalogue of the hardest upcoming levels in Geometry Dash.</p>
        </div>
        <div class="site-footer-links">
            <div class="site-footer-col">
                <h4>Navigate</h4>
                <router-link to="/list">All Levels</router-link>
                <router-link to="/leaderboard">Leaderboard</router-link>
                <router-link to="/pending">Pending List</router-link>
                <router-link to="/upcoming">Upcoming Levels</router-link>
            </div>
            <div class="site-footer-col">
                <h4>Community</h4>
                <a href="https://discord.gg/QRX47v2qyC" target="_blank">Discord</a>
                <a href="https://x.com/ull_gd" target="_blank" rel="noopener">X (@ull_gd)</a>
            </div>
        </div>
    </div>
    <div class="site-footer-bottom">
        <p>&copy; 2024–2026 Upcoming Levels List. Not affiliated with RobTop Games.</p>
        <p>Built by the ULL Team</p>
    </div>
</footer>
    `,
};

export default {
    template: `
<component :is="'style'">
/* ── SHARED FOOTER ── */
.site-footer {
    border-top: 1px solid rgba(128,128,128,0.15);
    padding: 2.5rem 2rem 2rem;
    font-family: "Lexend Deca", sans-serif;
}
.site-footer, .site-footer * { box-sizing: border-box; }
.site-footer h3, .site-footer h4, .site-footer p { margin: 0; padding: 0; }
.site-footer h3::before, .site-footer h3::after,
.site-footer h4::before, .site-footer h4::after { display: none; }
.site-footer-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex !important;
    align-items: flex-start;
    justify-content: space-between;
    gap: 2rem;
}
.site-footer-brand h3 {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.3;
    color: var(--color-on-background);
    margin-bottom: 0.25rem;
}
.site-footer-brand p {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.4;
    line-height: 1.6;
    max-width: 320px;
    margin-top: 1em;
}
.site-footer-links {
    display: flex !important;
    gap: 2.5rem;
}
.site-footer-col h4 {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-on-background);
    opacity: 0.4;
    margin-bottom: 0.6rem;
}
.site-footer-col a {
    display: block;
    font-size: 0.78rem;
    color: var(--color-on-background);
    opacity: 0.4;
    text-decoration: none;
    padding: 0.2rem 0;
    transition: opacity 100ms ease;
}
.site-footer-col a:hover { opacity: 0.8; }
.site-footer-bottom {
    max-width: 1100px;
    margin: 1.5rem auto 0;
    padding-top: 1.25rem;
    border-top: 1px solid rgba(128,128,128,0.15);
    display: flex !important;
    align-items: center;
    justify-content: space-between;
}
.site-footer-bottom p {
    font-size: 0.68rem;
    color: var(--color-on-background);
    opacity: 0.2;
}
</component>
<footer class="site-footer">
    <div class="site-footer-inner">
        <div class="site-footer-brand">
            <h3>Upcoming Levels List</h3>
            <p>A community-maintained catalogue forecasting the future of the Geometry Dash Extreme Demon Demonlist.</p>
        </div>
        <div class="site-footer-links">
            <div class="site-footer-col">
                <h4>Navigate</h4>
                <a href="#/list">All Levels</a>
                <a href="#/leaderboard">Leaderboard</a>
                <a href="#/pending">Pending List</a>
                <a href="#/upcoming">Upcoming Levels</a>
            </div>
            <div class="site-footer-col">
                <h4>Community</h4>
                <a href="https://discord.gg/9wVWSgJSe8" target="_blank">Discord Server</a>
                <a href="https://docs.google.com/document/d/13dmRfx2OCiLEaM2EcgEd-mKdok11_k8k7HsA5a-K6nY/edit?usp=sharing" target="_blank">Full Guidelines Doc</a>
            </div>
            <div class="site-footer-col">
                <h4>Contact</h4>
                <a href="https://discord.gg/9wVWSgJSe8" target="_blank">Discord Support</a>
                <a href="https://www.youtube.com/channel/UC72Ceml55mVisJNEByLBHPA" target="_blank">YouTube</a>
            </div>
        </div>
    </div>
    <div class="site-footer-bottom">
        <p>&copy; 2024\u20132026 Upcoming Levels List. Not affiliated with RobTop Games or Pointercrate.</p>
        <p>Built by the ULL Team</p>
    </div>
</footer>
    `,
};

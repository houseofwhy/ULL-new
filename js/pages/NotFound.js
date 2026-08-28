export default {
    template: `
<main class="surface" style="display:flex;align-items:center;justify-content:center;min-height:70vh;padding:2rem;">
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:1rem;max-width:32rem;overflow:visible;">
        <div style="font-size:5rem;font-weight:700;line-height:1.15;color:var(--color-primary);font-family:'Lexend Deca',sans-serif;">404</div>
        <h1 style="margin:0;font-size:1.5rem;">Page not found</h1>
        <p style="opacity:0.6;line-height:1.6;margin:0;">
            The page you're looking for doesn't exist or may have moved. Check the address, or head back to the home page.
        </p>
        <router-link to="/" style="margin-top:0.5rem;padding:0.7rem 1.6rem;border-radius:0.5rem;background:var(--color-primary);color:#fff;font-family:'Lexend Deca',sans-serif;font-weight:600;text-decoration:none;">
            Go to Home Page
        </router-link>
    </div>
</main>
    `,
};

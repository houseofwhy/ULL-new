import { store } from '../main.js';

export default {
    name: 'SettingsModal',
    emits: ['close'],
    data: () => ({ store }),
    template: `
        <div class="pc-modal-overlay" @click.self="$emit('close')">
            <div class="pc-settings-modal">
                <div class="pc-settings-hdr">
                    <span class="pc-settings-title">Settings</span>
                    <button class="pc-modal-close" @click="$emit('close')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="pc-settings-row">
                    <span class="pc-settings-row-lbl">Thumbnails</span>
                    <div class="pc-settings-toggle">
                        <button class="pc-settings-toggle-btn" :class="{'is-active': store.showThumbnails}" @click="store.setThumbnails(true)">ON</button>
                        <button class="pc-settings-toggle-btn" :class="{'is-active': !store.showThumbnails}" @click="store.setThumbnails(false)">OFF</button>
                    </div>
                </div>
                <div class="pc-settings-row">
                    <span class="pc-settings-row-lbl">
                        Level Coloring
                        <a class="pc-settings-help" href="#/information" target="_blank" title="Learn more">?</a>
                    </span>
                    <div class="pc-settings-toggle">
                        <button class="pc-settings-toggle-btn" :class="{'is-active': store.showColors}" @click="store.setColors(true)">ON</button>
                        <button class="pc-settings-toggle-btn" :class="{'is-active': !store.showColors}" @click="store.setColors(false)">OFF</button>
                    </div>
                </div>
                <div class="pc-settings-row">
                    <span class="pc-settings-row-lbl">Theme</span>
                    <div class="pc-settings-toggle">
                        <button class="pc-settings-toggle-btn" :class="{'is-active': !store.dark}" @click="store.dark && store.toggleDark()">Light</button>
                        <button class="pc-settings-toggle-btn" :class="{'is-active': store.dark}" @click="!store.dark && store.toggleDark()">Dark</button>
                    </div>
                </div>
                <div class="pc-settings-row">
                    <a class="pc-settings-discord" href="https://discord.gg/9wVWSgJSe8" target="_blank">
                        <img src="/assets/discord.svg" alt="" />
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    `,
};

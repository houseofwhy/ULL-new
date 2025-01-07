import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Unlisted from './pages/Unlisted.js';
import ListMain from './pages/ListMain.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/unlisted', component: Unlisted },
    { path: '/listmain', component: ListMain }
];

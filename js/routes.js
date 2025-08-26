import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Unlisted from './pages/Unlisted.js';
import ListMain from './pages/ListMain.js';
import ListFuture from './pages/ListFuture.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/unlisted', component: Unlisted },
    { path: '/listmain', component: ListMain },
    { path: '/listfuture', component: ListFuture }
];

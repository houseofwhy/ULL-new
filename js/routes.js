import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import ListMain from './pages/ListMain.js';
import ListFuture from './pages/ListFuture.js';
import LevelGenerator from './pages/LevelGenerator.js';
import ListPending from './pages/ListPending.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/pending', component: ListPending },
    { path: '/listmain', component: ListMain },
    { path: '/listfuture', component: ListFuture },
    { path: '/generator', component: LevelGenerator }
];

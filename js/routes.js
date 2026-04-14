import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import ListMain from './pages/ListMain.js';
import ListFuture from './pages/ListFuture.js';
import LevelGenerator from './pages/LevelGenerator.js';
import ListPending from './pages/ListPending.js';
import Mobile from './pages/Mobile.js';
import Home from './pages/Home.js';
import UpcomingLevels from './pages/UpcomingLevels.js';
import Information from './pages/Information.js';

export default [
    { path: '/', redirect: '/home' },
    { path: '/home', component: Home },
    { path: '/list', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/pending', component: ListPending },
    { path: '/listmain', component: ListMain },
    { path: '/listfuture', component: ListFuture },
    { path: '/upcoming', component: UpcomingLevels },
    { path: '/information', component: Information },
    { path: '/generator', component: LevelGenerator },
    { path: '/mobile', component: Mobile },
];

import List from './pages/List.js';
import ListMain from './pages/ListMain.js';
import ListFuture from './pages/ListFuture.js';
import PlayerLeaderboard from './pages/PlayerLeaderboard.js';
import UpcomingLevels from './pages/UpcomingLevels.js';
import ListPending from './pages/ListPending.js';
import Information from './pages/Information.js';
import LevelGenerator from './pages/LevelGenerator.js';
import Mobile from './pages/Mobile.js';

export default [
    { path: '/', component: List },
    { path: '/listmain', component: ListMain },
    { path: '/listfuture', component: ListFuture },
    { path: '/leaderboard', component: PlayerLeaderboard },
    { path: '/upcoming', component: UpcomingLevels },
    { path: '/pending', component: ListPending },
    { path: '/information', component: Information },
    { path: '/generator', component: LevelGenerator },
    { path: '/mobile', component: Mobile },
];

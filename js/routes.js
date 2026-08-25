import List from './pages/List.js';
import Admin from './pages/Admin.js';
import Leaderboard from './pages/Leaderboard.js';
import ListMain from './pages/ListMain.js';
import ListFuture from './pages/ListFuture.js';
import LevelGenerator from './pages/LevelGenerator.js';
import ListPending from './pages/ListPending.js';
import Mobile from './pages/Mobile.js';
import Home from './pages/Home.js';
import UpcomingLevels from './pages/UpcomingLevels.js';
import Information from './pages/Information.js';
import Events from './pages/Events.js';
import NotFound from './pages/NotFound.js';

import MobileList from './pages/mobile/MobileList.js';
import MobileLeaderboard from './pages/mobile/MobileLeaderboard.js';
import MobileUpcoming from './pages/mobile/MobileUpcoming.js';
import MobilePending from './pages/mobile/MobilePending.js';
import MobileInfo from './pages/mobile/MobileInfo.js';
import MobileHome from './pages/mobile/MobileHome.js';
import MobileEvents from './pages/mobile/MobileEvents.js';

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
    { path: '/events', component: Events },
    { path: '/generator', component: LevelGenerator },
    { path: '/admin', component: Admin },
    {
        path: '/mobile',
        component: Mobile,
        children: [
            { path: '', redirect: '/mobile/home' },
            { path: 'home', component: MobileHome },
            { path: 'all', component: MobileList, props: { pageType: 'all' } },
            { path: 'main', component: MobileList, props: { pageType: 'main' } },
            { path: 'future', component: MobileList, props: { pageType: 'future' } },
            { path: 'leaderboard', component: MobileLeaderboard },
            { path: 'upcoming', component: MobileUpcoming },
            { path: 'pending', component: MobilePending },
            { path: 'info', component: MobileInfo },
            { path: 'events', component: MobileEvents },
        ],
    },
    // Catch-all: any unknown URL shows the 404 page
    { path: '/:pathMatch(.*)*', component: NotFound },
];

import { Router } from 'express'
import { authRoutes } from '../modules/auth/auth.routes';
import { activityRoutes } from '../modules/activities/activity.routes';
import { userRoutes } from '../modules/users/user.routes';
import { adminRoutes } from '../modules/admin/admin.routes';

const router = Router();

const moduleRoute = [
    {
        path: '/auth',
        route: authRoutes,
    },
    {
        path: '/activities',
        route: activityRoutes,
    },
    {
        path: '/users',
        route: userRoutes,
    },
    {
        path: '/admin',
        route: adminRoutes,
    }
];

moduleRoute.forEach((route) => router.use(route.path, route.route));

export default router;
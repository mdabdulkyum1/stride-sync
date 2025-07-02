import { Router } from 'express'
import { authRoutes } from '../modules/auth/auth.routes';

const router = Router();


const moduleRoute = [

    {
        path: '/auth',
        route: authRoutes,
    }

]

moduleRoute.forEach((route) => router.use(route.path, route.route));



export default router;
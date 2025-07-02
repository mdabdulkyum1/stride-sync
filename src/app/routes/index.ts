import { Router } from 'express'
import { AuthRoutes } from '../modules/auth/auth.routes';

const router = Router();


const moduleRoute = [

    {
        path: '/',
        route: AuthRoutes,
    }

]

moduleRoute.forEach((route) => router.use(route.path, route.route));



export default router;
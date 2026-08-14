import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import openaiRouter from "./openai/index";
import agentsRouter from "./agents";
import securityRouter from "./security";
import roomsRouter from "./rooms";
import adminRouter from "./admin";
import memoryRouter from "./memory";
import officesRouter from "./offices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(officesRouter);   // public — must come before adminRouter
router.use(openaiRouter);
router.use(agentsRouter);
router.use(securityRouter);
router.use(roomsRouter);
router.use(adminRouter);
router.use(memoryRouter);

export default router;

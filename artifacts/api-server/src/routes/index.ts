import { Router, type IRouter } from "express";
import healthRouter from "./health";
import intercomRouter from "./intercom";

const router: IRouter = Router();

router.use(healthRouter);
router.use(intercomRouter);

export default router;

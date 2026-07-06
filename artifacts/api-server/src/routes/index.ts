import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import propertiesRouter from "./properties";
import imagesRouter from "./images";
import conversationsRouter from "./conversations";
import contactReleaseRouter from "./contact-release";
import commissionRouter from "./commission";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(propertiesRouter);
router.use(imagesRouter);
router.use(conversationsRouter);
router.use(contactReleaseRouter);
router.use(commissionRouter);
router.use(notificationsRouter);
router.use(adminRouter);

export default router;

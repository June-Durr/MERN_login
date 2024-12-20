import { Router } from "express";
const router = Router();

//import all controllers
import * as controller from "../controllers/appController.js";

//POST METHOD
router.route("/register").post(controller.register); //register user
// router.route("/registerMail").post(); // send email
router.route("/authenticate").post((req, res) => res.end()); //authenticate use
router.route("/login").post(controller.verifyUser, controller.login); //login into app

//GET METHOD
router.route("/user/:username").get(controller.getUser); //user with username
router.route("/generateOTP").get(controller.generateOTP); //generate one time pass
router.route("/verifyOTP").get(controller.verifyOTP);
router.route("/createResetSession").get(controller.createResetSession);

//PUT METHOD
router.route("/updateuser").put(controller.updateUser);
router.route("/resetPassword").put(controller.resetPassword);

export default router;

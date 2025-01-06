import jwt from "jsonwebtoken";
import ENV from "../config.js";

//auth middleware
export default async function Auth(req, res, next) {
  try {
    //access authroization header to validate request
    const token = req.headers.authorization.split(" ")[1];

    //retreive the user details for the logged in user
    const decodedToken = await jwt.verify(token, ENV.JWT_SECRET);

    req.user = decodedToken;

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized Access" });
  }
}

//local variables
export function localVariables(req, res, next) {
  req.app.locals = {
    OTP: null,
    resetSession: false,
  };
  next();
}

import UserModel from "../model/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ENV from "../config.js";
import otpGenerator from "otp-generator";

//middleware for the verify user

export async function verifyUser(req, res, next) {
  try {
    const { username } = req.method == "GET" ? req.query : req.body;

    //check the user existance
    let exist = await UserModel.findOne({ username });
    if (!exist) return res.status(404).send({ error: "Canot find user" });
    next();
  } catch (error) {
    return res.status(404).send({ error: "authentication error" });
  }
}

/** POST: http://localhost:8080/api/register 
* @param : {
"username": "example123",
"password": "admin123",
"email": "example@gmail.com",
"firstName": "bill",
"lastName": "william",
"mobile": 8009860560,
"address": "Apt. 556, Kulas Light, Gwenborough",
"profile": ""
}
*/

export async function register(req, res) {
  try {
    const { username, password, profile, email } = req.body;

    //check existing user
    const existUsername = new Promise((resolve, reject) => {
      UserModel.findOne({ username }, function (err, user) {
        if (err) reject(new Error(err));
        if (user) reject({ error: "Please use unique username" });

        resolve();
      });
    });

    const existEmail = new Promise((resolve, reject) => {
      UserModel.findOne({ email }, function (err, email) {
        if (err) reject(new Error(err));
        if (email) reject({ error: "Please use unique Email" });

        resolve();
      });
    });

    Promise.all([existUsername, existEmail])
      .then(() => {
        if (password) {
          bcrypt
            .hash(password, 10)
            .then((hashedPassword) => {
              const user = new UserModel({
                username,
                password: hashedPassword,
                profile: profile || "",
                email,
              });
              //return and save the result as a response
              user
                .save()
                .then((result) =>
                  res.status(201).send({ msg: "user registered succesfully" })
                )
                .catch((error) => res.status(500).send({ error }));
            })
            .catch((error) => {
              return res.status(500).send({
                error: "Enable to hashed password",
              });
            });
        }
      })
      .catch((error) => {
        return res.status(500).send({ error });
      });

    //check for existing email
  } catch (error) {
    return res.status(500).send(error);
  }
}

/** POST: http://localhost:8080/api/login 
* @param : {
"username": "example123",
"password": "admin123", 
}
*/
export async function login(req, res) {
  const { username, password } = req.body;

  try {
    UserModel.findOne({ username })
      .then((user) => {
        bcrypt
          .compare(password, user.password)
          .then((passwordCheck) => {
            if (!passwordCheck)
              return res.status(400).send({ error: "dont have password" });

            //create jwt token
            const token = jwt.sign(
              {
                userId: user._id,
                username: user.username,
              },
              ENV.JWT_SECRET,
              { expiresIn: "24h" }
            );
            return res.status(200).send({
              msg: "Login succesfull...",
              username: user.username,
              token,
            });
          })
          .catch((error) => {
            return res.status(400).send({ error: "password does not match" });
          });
      })
      .catch((error) => {
        return res.status(404).send({ error: "Username not found" });
      });
  } catch (error) {
    return res.status(500).send({ error });
  }
}

/** GET: http://localhost:8080/api/user/example123 */
export async function getUser(req, res) {
  const { username } = req.params;
  try {
    if (!username) return res.status(501).send({ error: "Invalid username" });

    UserModel.findOne({ username }, function (err, user) {
      if (err) return res.status(500).send({ err });

      if (!user)
        return res.status(501).send({ error: "Couldnt find the user" });

      //mongoose return unecessary data with object to convert it into json

      const { password, ...rest } = Object.assign({}, user.toJSON());

      return res.status(201).send(rest);
    });
  } catch (error) {
    return res.status(404).send({ error: "Cannot find use data" });
  }
}

/** PUT: http://localhost:8080/api/updateuser 
 * @param: {
  "id" : "<userid>"
}
body: {
    firstName: '',
    address : '',
    profile : ''
}
*/
export async function updateUser(req, res) {
  try {
    // const id = req.query.id;
    const { userId } = req.user;

    if (userId) {
      const body = req.body;

      //update the data
      UserModel.updateOne({ _id: userId }, body, function (err, data) {
        if (err) throw err;

        return res.status(201).send({ msg: "Record updated...!" });
      });
    } else {
      return res.status(401).send({ error: "User Not Found...!" });
    }
  } catch (error) {
    return res.status(401).send({ error });
  }
}

/** GET: http://localhost:8080/api/generateOTP */
export async function generateOTP(req, res) {
  req.app.locals.OTP = await otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  res.status(201).send({ code: req.app.locals.OTP });
}

/** GET: http://localhost:8080/api/verifyOTP */
export async function verifyOTP(req, res) {
  const { code } = req.query;
  if (parseInt(req.app.locals.OTP) === parseInt(code)) {
    req.app.locals.OTP = null; //reset OTP value
    req.app.locals.resetSession = true; //Start the session for reset password
    return res.status(201).send({ msg: "OTP verified" });
  }
  return res.status(400).send({ error: "Invalid OTP" });
}

// successfully redirect user when OTP is valid
/** GET: http://localhost:8080/api/createResetSession */
export async function createResetSession(req, res) {
  if (req.app.locals.resetSession) {
    req.app.locals.resetSession = false; //allow access to this route only once
    return res.status(201).send({ msg: "access granted" });
  }
  return res.status(400).send({ error: "Session expired!" });
}

// update the password when we have valid session
/** PUT: http://localhost:8080/api/resetPassword */
export async function resetPassword(req, res) {
  try {
    if (!req.app.locals.resetSession)
      return res.status(400).send({ error: "Session expired!" });
    const { username, password } = req.body;

    try {
      UserModel.findOne({ username })
        .then((user) => {
          bcrypt
            .hash(password, 10)
            .then((hashedPassword) => {
              UserModel.updateOne(
                { username: user.username },
                { password: hashedPassword },
                function (err, data) {
                  if (err) throw err;
                  return res.status(201).send({ msg: "Password updated" });
                }
              );
            })
            .catch((error) => {
              return res.status(500).send({ error: "Cannot update password" });
            });
        })
        .catch((error) => {
          return res.status(500).send({ error: "Cannot hash password" });
        })
        .catch((error) => {
          return res.status(404).send({ error: "Username not found" });
        });
    } catch (error) {
      return res.status(500).semd({ error });
    }
  } catch (error) {
    return res.status(401).send({ error });
  }
}

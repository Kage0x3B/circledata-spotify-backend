import passport from "passport";
import passportJWT from "passport-jwt";
import db from "../service/db.mjs";
import config from "../config.mjs";

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

passport.use(
    "jwt",
    new JWTStrategy(
        {
            jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.jwt.secret
        },
        async (jwtPayload, callback) => {
            try {
                const dateNow = Math.floor(Date.now() / 1000);

                if (dateNow > jwtPayload.exp || dateNow > jwtPayload.longExpire) {
                    return callback("Token Expired", false);
                }

                const [userResult] = await db.query(
                    "SELECT id, username, role, active, created FROM user WHERE id = ?",
                    [jwtPayload.id]
                );

                return callback(null, userResult[0] || false);
            } catch (err) {
                callback(err, false);
            }
        }
    )
);

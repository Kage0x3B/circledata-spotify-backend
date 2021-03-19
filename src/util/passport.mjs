import passport from "passport";
import passportJWT from "passport-jwt";
import config from "../config.mjs";
import user from '../model/user.mjs'

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

                const userData = await user.findById(jwtPayload.id);

                return callback(null, userData || false);
            } catch (err) {
                callback(err, false);
            }
        }
    )
);

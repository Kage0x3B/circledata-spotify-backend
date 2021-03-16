import express from "express";
import bcrypt from "bcryptjs";
import { v4 as generateUuid } from "uuid";
import jwt from "jsonwebtoken";

import config from "../config.mjs";
import db from "../service/db.mjs";
import { authLogger } from "../service/logger.mjs";
import { BadRequestError, UnauthorizedError } from "../util/RestError.mjs";

const router = express.Router();

const authError = Error("Authentication failed");
authError.statusCode = 401;

async function generateRefreshToken(userId) {
    const refreshToken = generateUuid();

    await db.query(
        "INSERT INTO refresh_tokens (userId, token) VALUES (?, UUID_TO_BIN(?)) AS new ON DUPLICATE KEY UPDATE token = new.token",
        [userId, refreshToken]
    );

    return refreshToken;
}

async function sendJwtToken(req, res, next) {
    try {
        const refreshToken = await generateRefreshToken(req.userData.id);

        authLogger.info(`User ${req.userData.id} authenticated, generating JWT and refresh token`, {}, req.userData.id);

        const currentData = new Date();
        const jwtToken = jwt.sign(
            {
                id: req.userData.id,
                username: req.userData.username,
                longExpire: currentData.setMonth(currentData.getMonth() + config.jwt.longExpMonths)
            },
            config.jwt.secret,
            {
                expiresIn: config.jwt.shortExp
            }
        );

        res.json({
            jwtToken,
            refreshToken
        });
    } catch (err) {
        next(err);
    }
}

async function processUserData(req, res, next) {
    if (!req.userData || !req.userData.length || !req.userData[0]) {
        return next(authError);
    }

    // eslint-disable-next-line prefer-destructuring
    req.userData = req.userData[0];

    next();
}

async function validatePassword(req, res, next) {
    if (bcrypt.compareSync(req.body.password, req.userData.password)) {
        next();
    } else {
        next(authError);
    }
}

router.post(
    "/login",
    async (req, res, next) => {
        [req.userData] = await db.query("SELECT * FROM user WHERE username = ? AND active = TRUE", [
            req.body.username
        ]);

        next();
    },
    processUserData,
    validatePassword,
    sendJwtToken
);

router.post("/refresh", async (req, res, next) => {
    if (!req.header("authorization")) {
        return next(new BadRequestError("No bearer token in header"));
    }

    const oldToken = req.headers.authorization.split(" ")[1];
    const oldRefreshToken = req.body.refreshToken;

    console.log("refresh route", req.headers.authorization, req.body.refreshToken);

    jwt.verify(oldToken, config.jwt.secret, { ignoreExpiration: true }, async (err, decoded) => {
        if (err) {
            return next(err);
        }

        if (decoded.longExpire - Date.now() < 0) {
            return next(new UnauthorizedError("Lifecycle of refresh period is over"));
        }

        const [result] = await db.query("SELECT BIN_TO_UUID(token) AS token FROM refresh_tokens WHERE userId = ?", [
            decoded.id
        ]);

        if (!result.length || oldRefreshToken !== result[0].token) {
            return next(new UnauthorizedError("Invalid refresh token"));
        }

        const newRefreshToken = await generateRefreshToken(decoded.id);

        const jwtToken = jwt.sign(
            {
                id: decoded.id,
                username: decoded.username,
                longExpire: decoded.longExpire
            },
            config.jwt.secret,
            {
                expiresIn: config.jwt.shortExp
            }
        );

        res.json({
            jwtToken,
            refreshToken: newRefreshToken
        });
    });
});

router.get("/retrieveAuthorizationUrl", (req, res) => {

});

router.post("/logout", async (req, res, next) => {
    if (req.header("authorization")) {
        const oldToken = req.headers.authorization.split(" ")[1];

        try {
            jwt.verify(oldToken, config.jwt.secret, async (err, decoded) => {
                if (err) {
                    throw err;
                }

                await db.query("DELETE FROM refresh_tokens WHERE userId = ?", [decoded.id]);

                res.status(200).json({ success: true });
            });
        } catch (err) {
            return next(new UnauthorizedError());
        }
    } else {
        next(new UnauthorizedError("No auth bearer in header provided"));
    }
});

export default router;

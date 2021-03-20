import express from "express";
import bcrypt from "bcryptjs";
import { v4 as generateUuid } from "uuid";
import jwt from "jsonwebtoken";

import config from "../config.mjs";
import db from "../service/db.mjs";
import { authLogger } from "../service/logger.mjs";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../util/RestError.mjs";
import spotify, { getSpotifyApi, SPOTIFY_STATE } from "../service/spotify.mjs";
import user from "../model/user.mjs";

const router = express.Router();

const authError = Error("Authentication failed");
authError.statusCode = 401;

async function generateRefreshToken(userId) {
    const refreshToken = generateUuid();

    await db.query(
        "INSERT INTO refreshTokens (userId, token) VALUES (?, UUID_TO_BIN(?)) AS new ON DUPLICATE KEY UPDATE token = new.token",
        [userId, refreshToken]
    );

    return refreshToken;
}

async function sendJwtToken(req, res, next) {
    try {
        const refreshToken = await generateRefreshToken(req.user.id);

        authLogger.info(`User ${req.user.id} authenticated, generating JWT and refresh token`, {}, req.user.id);

        const currentData = new Date();
        const jwtToken = jwt.sign(
            {
                id: req.user.id,
                spotifyUserId: req.user.spotifyUserId,
                displayName: req.user.displayName,
                profilePictureUrl: req.user.profilePictureUrl,
                hasSpotifyPremium: req.user.hasSpotifyPremium,
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

router.post(
    "/authorize",
    async (req, res, next) => {
        if (!req.body.code || !req.body.state) {
            return next(new BadRequestError("No spotify authorization code or state"));
        }

        if (req.body.state !== SPOTIFY_STATE) {
            return next(new BadRequestError("Invalid state"));
        }

        const spotifyApi = getSpotifyApi();

        const authData = (await spotifyApi.authorizationCodeGrant(req.body.code)).body;

        spotifyApi.setAccessToken(authData.access_token);
        spotifyApi.setRefreshToken(authData.refresh_token);

        const userData = (await spotifyApi.getMe()).body;

        userData.spotifyAccessToken = authData.access_token;
        userData.spotifyRefreshToken = authData.refresh_token;
        userData.spotifyTokenExpiration = authData.expires_in;

        req.user = await user.loginWithSpotify(userData.id, userData);

        next();
    },
    sendJwtToken
);

router.post("/refresh", async (req, res, next) => {
    if (!req.header("authorization")) {
        return next(new BadRequestError("No bearer token in header"));
    }

    const oldToken = req.headers.authorization.split(" ")[1];
    const oldRefreshToken = req.body.refreshToken;

    jwt.verify(oldToken, config.jwt.secret, { ignoreExpiration: true }, async (err, decoded) => {
        if (err) {
            return next(err);
        }

        if (decoded.longExpire - Date.now() < 0) {
            return next(new UnauthorizedError("Lifecycle of refresh period is over"));
        }

        const [result] = await db.query("SELECT BIN_TO_UUID(token) AS token FROM refreshTokens WHERE userId = ?", [
            decoded.id
        ]);

        if (!result.length || oldRefreshToken !== result[0].token) {
            return next(new UnauthorizedError("Invalid refresh token"));
        }

        const newRefreshToken = await generateRefreshToken(decoded.id);

        const jwtToken = jwt.sign(
            {
                id: decoded.id,
                spotifyUserId: decoded.spotifyUserId,
                displayName: decoded.displayName,
                profilePictureUrl: decoded.profilePictureUrl,
                hasSpotifyPremium: decoded.hasSpotifyPremium,
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

router.post("/logout", async (req, res, next) => {
    if (req.header("authorization")) {
        const oldToken = req.headers.authorization.split(" ")[1];

        try {
            jwt.verify(oldToken, config.jwt.secret, async (err, decoded) => {
                if (err) {
                    throw err;
                }

                await db.query("DELETE FROM refreshTokens WHERE userId = ?", [decoded.id]);

                res.status(200).json({ success: true });
            });
        } catch (err) {
            return next(new UnauthorizedError());
        }
    } else {
        next(new UnauthorizedError("No auth bearer in header provided"));
    }
});

router.get("/createSpotifyAuthUrl", (req, res) => {
    res.json({
        url: spotify.createAuthorizeURL()
    });
});

export default router;

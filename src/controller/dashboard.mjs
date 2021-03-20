import express from "express";
import { ensureAuthenticated } from "../service/authentication.mjs";
import { doSpotifyRequest, getSpotifyApiForUser } from "../service/spotify.mjs";

const router = express.Router();

router.get("/", ensureAuthenticated, (req, res) => {});

router.get("/currentlyPlaying", ensureAuthenticated, async (req, res, next) => {
    const spotifyApi = getSpotifyApiForUser(req.user);

    try {
        const data = await doSpotifyRequest(spotifyApi, spotifyApi.getMyCurrentPlayingTrack);

        if (data.context && data.context.type === "playlist") {
            const contextUriSplit = data.context.uri.split(":");
            try {
                data.playlist = await doSpotifyRequest(
                    spotifyApi,
                    spotifyApi.getPlaylist,
                    contextUriSplit[contextUriSplit.length - 1]
                );
            } catch (ignored) {}
        }

        res.json(data);
    } catch (err) {
        next(err);
    }
});

router.get("/currentDevices", ensureAuthenticated, async (req, res, next) => {
    const spotifyApi = getSpotifyApiForUser(req.user);

    try {
        const data = await doSpotifyRequest(spotifyApi, spotifyApi.getMyDevices);

        res.json(data);
    } catch (err) {
        next(err);
    }
});

export default router;

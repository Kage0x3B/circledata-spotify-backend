import express from "express";
import { ensureAuthenticated } from "../service/authentication.mjs";
import { doSpotifyRequest, getSpotifyApiForUser } from "../service/spotify.mjs";

const router = express.Router();

router.get("/", ensureAuthenticated, (req, res) => {});

router.get("/currentlyPlaying", ensureAuthenticated, async (req, res) => {
    const spotifyApi = getSpotifyApiForUser(req.user);

    try {
        const data = await doSpotifyRequest(spotifyApi, spotifyApi.getMyCurrentPlayingTrack);

        if (data.context && data.context.type === "playlist") {
            data.playlist = await doSpotifyRequest(spotifyApi, spotifyApi.getPlaylist, data.context.uri.split(":")[2]);
        }

        res.json(data);
    } catch (err) {
        console.log(err);
    }
});

export default router;

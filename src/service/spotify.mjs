import config from "../config.mjs";
import SpotifyWebApi from "spotify-web-api-node";
import RestError, { RateLimitError } from "../util/RestError.mjs";

const SCOPES = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-playback-state",
    "user-read-currently-playing",
    "user-library-read",
    "user-read-playback-position",
    "user-read-recently-played",
    "user-top-read",
    "user-follow-read"
];
export const SPOTIFY_STATE = "CDVSS";

let rateLimitingRequestBlock = false;

export function getSpotifyApi() {
    return new SpotifyWebApi({
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        redirectUri: config.spotify.callback
    });
}

export function getSpotifyApiForUser(user) {
    const spotifyApi = new SpotifyWebApi({
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        redirectUri: config.spotify.callback,
        accessToken: user.spotifyAccessToken,
        refreshToken: user.spotifyRefreshToken
    });

    spotifyApi.internalUser = user;

    return spotifyApi;
}

export async function doSpotifyRequest(spotifyApi, spotifyApiFunction, options) {
    if (rateLimitingRequestBlock && rateLimitingRequestBlock > Date.now()) {
        throw new RateLimitError();
    }

    if (spotifyApi.internalUser && !spotifyApi.internalUser.hasValidAccessToken()) {
        console.log("Noticed expired access token early");
        await refreshAccessToken(spotifyApi);
    }

    try {
        return (await spotifyApiFunction.call(spotifyApi, options)).body;
    } catch (err) {
        if (err.statusCode === 401) {
            await refreshAccessToken(spotifyApi);

            return (await spotifyApiFunction.call(spotifyApi, options)).body;
        } else if (err.statusCode === 429) {
            const retryAfterSeconds = err.headers["retry-after"];
            rateLimitingRequestBlock = Date.now() + retryAfterSeconds * 1000;

            console.warn("Rate limit, retry after", retryAfterSeconds, "seconds");

            throw new RateLimitError();
        } else {
            throw err;
        }
    }
}

async function refreshAccessToken(spotifyApi) {
    console.log("Refreshing access token");

    const data = await spotifyApi.refreshAccessToken();

    const accessToken = data.body.access_token;
    const tokenExpiration = data.body.expires_in;

    if (spotifyApi.internalUser) {
        await spotifyApi.internalUser.updateAccessToken(accessToken, tokenExpiration);
    }

    spotifyApi.setAccessToken(accessToken);
}

export function createAuthorizeURL() {
    const spotifyApi = getSpotifyApi();

    return spotifyApi.createAuthorizeURL(SCOPES, SPOTIFY_STATE);
}

export default {
    createAuthorizeURL
};

import user from '../model/user.mjs'
import spotify, { getSpotifyApiForUser, doSpotifyRequest } from '../service/spotify.mjs'

export default async function () {
    const users = await user.getAll();

    try {
        for (const user of users) {
            const spotifyApi = getSpotifyApiForUser(user);
        }
    } catch(err) {
        console.warn("Error during listening history cron job", err);
    }
}

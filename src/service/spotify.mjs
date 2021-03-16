const scopes = ["user-read-private", "user-read-email"];
const redirectUri = "https://example.com/callback";
const clientId = "5fe01282e44241328a84e7c5cc169165";
const state = "some-state-of-my-choice";

export function getSpotifyApi() {
    return new SpotifyWebApi({
        redirectUri: redirectUri,
        clientId: clientId
    });
}

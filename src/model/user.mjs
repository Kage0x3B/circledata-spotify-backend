import db from "../service/db.mjs";

class User {
    constructor(data) {
        this.id = data.id;
        this.spotifyUserId = data.spotifyUserId;
        this.email = data.email;
        this.displayName = data.displayName;
        this.profilePictureUrl = data.profilePictureUrl;
        this.hasSpotifyPremium = data.hasSpotifyPremium;
        this.spotifyRefreshToken = data.spotifyRefreshToken;
        this.spotifyAccessToken = data.spotifyAccessToken;
        this.spotifyTokenCreated = data.spotifyTokenCreated;
        this.spotifyTokenExpiration = data.spotifyTokenExpiration;
        this.spotifyInternalRefreshCookie = data.spotifyInternalRefreshCookie;
        this.spotifyInternalAccessToken = data.spotifyInternalAccessToken;
    }

    async create() {
        const [result] = await db.query(
            `INSERT INTO user (spotifyUserId, email, displayName,
                               profilePictureUrl, hasSpotifyPremium)
             VALUES (?, ?, ?, ?, ?)`,
            [this.spotifyUserId, this.email, this.displayName, this.profilePictureUrl, this.hasSpotifyPremium]
        );

        this.id = result.insertId;
    }

    hasValidAccessToken() {
        return this.spotifyTokenCreated.getTime() + this.spotifyTokenExpiration * 1000 > Date.now();
    }

    async updateAuthorization(refreshToken, accessToken, tokenExpiration) {
        this.spotifyRefreshToken = refreshToken;
        this.spotifyAccessToken = accessToken;
        this.spotifyTokenExpiration = tokenExpiration;

        await db.query(
            `UPDATE user
             SET spotifyRefreshToken    = ?,
                 spotifyAccessToken     = ?,
                 spotifyTokenExpiration = ?,
                 spotifyTokenCreated    = CURRENT_TIMESTAMP()
             WHERE id = ?`,
            [refreshToken, accessToken, tokenExpiration, this.id]
        );
    }

    async updateAccessToken(accessToken, tokenExpiration) {
        this.spotifyAccessToken = accessToken;
        this.spotifyTokenExpiration = tokenExpiration;

        await db.query(
            `UPDATE user
             SET spotifyAccessToken     = ?,
                 spotifyTokenExpiration = ?,
                 spotifyTokenCreated    = CURRENT_TIMESTAMP()
             WHERE id = ?`,
            [accessToken, tokenExpiration, this.id]
        );
    }
}

async function getAll() {
    const [result] = await db.query("SELECT * FROM user");

    return result.map((d) => new User(d));
}

async function findById(id) {
    const [result] = await db.query("SELECT * FROM user WHERE id = ?", [id]);

    if (!result.length) {
        return null;
    }

    return new User(result[0]);
}

async function findBySpotifyId(spotifyUserId) {
    const [result] = await db.query("SELECT * FROM user WHERE spotifyUserId = ?", [spotifyUserId]);

    if (!result.length) {
        return null;
    }

    return new User(result[0]);
}

async function createForSpotifyId(spotifyUserId, userData) {
    const email = userData.email;
    const displayName = userData.display_name;
    const profilePictureUrl = userData.images && userData.images.length ? userData.images[0].url : "";
    const hasSpotifyPremium = userData.product && userData.product === "premium";

    const user = new User({
        spotifyUserId,
        email,
        displayName,
        profilePictureUrl,
        hasSpotifyPremium
    });

    await user.create();

    await user.updateAuthorization(
        userData.spotifyRefreshToken,
        userData.spotifyAccessToken,
        userData.spotifyTokenExpiration
    );

    return user;
}

async function loginWithSpotify(spotifyId, userData) {
    let user = await findBySpotifyId(spotifyId);

    if (!user) {
        await createForSpotifyId(spotifyId, userData);

        user = findBySpotifyId(spotifyId);
    } else {
        await user.updateAuthorization(
            userData.spotifyRefreshToken,
            userData.spotifyAccessToken,
            userData.spotifyTokenExpiration
        );
    }

    return user;
}

export default {
    getAll,
    findById,
    findBySpotifyId,
    loginWithSpotify
};

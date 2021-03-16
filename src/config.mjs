import dotenv from "dotenv";

dotenv.config();

export default {
    publicUrl: process.env.PUBLIC_URL,
    port: parseInt(process.env.PORT, 10),
    dev: process.env.NODE_ENV === "development",
    jwt: {
        secret: process.env.JWT_SECRET,
        shortExp: process.env.JWT_SHORT_EXP,
        longExpMonths: parseInt(process.env.JWT_LONG_EXP_MONTHS, 10),
        longExpHours: parseInt(process.env.JWT_LONG_EXP_HOURS, 10)
    },
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        callback: process.env.SPOTIFY_CALLBACK
    },
    saltRounds: parseInt(process.env.SALT_ROUNDS, 10),
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10)
    }
};

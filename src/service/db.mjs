import mysql from "mysql2";
import config from "../config.mjs";

const connection = mysql.createPool(config.database);

export default connection.promise();

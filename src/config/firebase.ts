import admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config();

const serviceAccount = require("../../firebaseServiceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;

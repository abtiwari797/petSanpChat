import admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config();

const serviceAccount = {
  type: "service_account",
  projectId: "petsnapchat-188ad",           // camelCase
  privateKeyId: "a39ab3e56db9bfe213bba038381ebf1d0ee3c27d",
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEv...snip...\n-----END PRIVATE KEY-----\n`, // literal newlines
  clientEmail: "firebase-adminsdk-fbsvc@petsnapchat-188ad.iam.gserviceaccount.com",
  clientId: "113579521094223818716",
  authUri: "https://accounts.google.com/o/oauth2/auth",
  tokenUri: "https://oauth2.googleapis.com/token",
  authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
  clientX509CertUrl: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40petsnapchat-188ad.iam.gserviceaccount.com",
  universeDomain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;

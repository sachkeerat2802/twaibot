const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twAPI = require("twitter-api-v2").default;
require("dotenv").config();

admin.initializeApp();
const databaseReference = admin.firestore().doc("tokens/twaibot");

const twClient = new twAPI({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
});

const authURL = "http://127.0.0.1:5000/twaibot/us-central1/auth";
const callbackURL = "http://127.0.0.1:5000/twaibot/us-central1/callback";

exports.auth = functions.https.onRequest(async (request, response) => {
    const { url, codeVerifier, state } = twClient.generateOAuth2AuthLink(callbackURL, { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] });

    await databaseReference.set({ codeVerifier, state });

    response.redirect(url);
});

exports.callback = functions.https.onRequest((request, response) => {});
exports.tweet = functions.https.onRequest((request, response) => {});

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twAPI = require("twitter-api-v2").default;
require("dotenv").config();

admin.initializeApp();
const databaseReference = admin.firestore().doc("tokens/twaibot");
const callbackURL = "http://127.0.0.1:5000/twaibot/us-central1/callback";

const twClient = new twAPI({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
});

exports.auth = functions.https.onRequest(async (request, response) => {
    const { url, codeVerifier, state } = twClient.generateOAuth2AuthLink(callbackURL, { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] });
    await databaseReference.set({ codeVerifier, state });
    response.redirect(url);
});

exports.callback = functions.https.onRequest(async (request, response) => {
    const { state, code } = request.query;
    const datatbaseSnapshot = await databaseReference.get();
    const { codeVerifier, state: storedState } = datatbaseSnapshot.data();

    if (state !== storedState) {
        return response.status(400).send("Tokens do not match!");
    }

    const {
        client: loggedClient,
        accessToken,
        refreshToken,
    } = await twClient.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: callbackURL,
    });

    await databaseReference.set({ accessToken, refreshToken });
    const { data } = await loggedClient.v2.me();
    response.send(data);
});

exports.tweet = functions.https.onRequest(async (request, response) => {
    const refreshToken = (await databaseReference.get()).data().refreshToken;
    const { client: refreshedClient, accessToken, refreshToken: newRefreshToken } = await twClient.refreshOAuth2Token(refreshToken);
    await databaseReference.set({ accessToken, refreshToken: newRefreshToken });

    const { data } = await refreshedClient.v2.tweet("testing!!!");
    response.send(data);
});

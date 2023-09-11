const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twAPI = require("twitter-api-v2").default;
const OpenAI = require("openai");
require("dotenv").config();

admin.initializeApp();
const databaseReference = admin.firestore().doc("tokens/twaibot");
const callbackURL = "http://127.0.0.1:5000/twaibot/us-central1/callback";

const twClient = new twAPI({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

exports.auth = functions.https.onRequest(async (request, response) => {
    const { url, codeVerifier, state } = twClient.generateOAuth2AuthLink(callbackURL, { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] });
    await databaseReference.set({ codeVerifier, state });
    response.redirect(url);
});

exports.callback = functions.https.onRequest(async (request, response) => {
    const { state, code } = request.query;
    const datatbaseSnapshot = await databaseReference.get();
    const { codeVerifier, state: sessionState } = datatbaseSnapshot.data();

    if (!codeVerifier || !state || !sessionState || !code) {
        return response.status(400).send("You denied the app or your session expired!");
    }

    if (state !== sessionState) {
        return response.status(400).send("Stored tokens didn't match!");
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

    const tweet = await openai.completions.create({
        model: "text-davinci-003",
        prompt: "You are a wise and smart tech developer working in a top tech company. Your goal is to write a tweet about any one programming language like Python, Javascript, Java, Ruby, PHP, CSS, HTML, Go, Dart, XML, Swift, etc. and give an opinion on it in a very witty and sarcastic manner. Your tweet should be given in an active voice and be opinionated. You should use a hint of wit or sarcasm. You should Respond in under 300 characters and in three or less short sentences. Do not use emojis or abbreviations. Do not use quotation marks in the tweet",
        max_tokens: 64,
        temperature: 1.25,
    });

    const { data } = await refreshedClient.v2.tweet(tweet.choices[0].text);
    response.send(data);
});

exports.scheduledTweet = functions.pubsub.schedule("*/5 * * * *").onRun((context) => {
    return exports.tweet();
});

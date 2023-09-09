const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const databaseReference = admin.firestore().doc("tokens/twaibot");

const twAPI = require("twitter-api-v2").default;
const twClient = new twAPI({
    clientId: "",
    clientSecret: "",
});

const callbackURL = "http://127.0.0.1:5000/twaibot/us-central1/callback";

exports.auth = functions.https.onRequest((request, response) => {});

exports.callback = functions.https.onRequest((request, response) => {});

exports.tweet = functions.https.onRequest((request, response) => {});

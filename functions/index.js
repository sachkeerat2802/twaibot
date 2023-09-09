const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const databaseReference = admin.firestore().doc("tokens/twaibot");

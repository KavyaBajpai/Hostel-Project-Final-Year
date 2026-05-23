/**
 * Generates VAPID key pair for Web Push. Run: node scripts/generate-vapid-keys.js
 * Add the output to Backend/.env
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\nAdd these to Backend/.env:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:warden@yourcollege.edu");
console.log("FRONTEND_URL=http://localhost:5173\n");

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pierc-portal-9bd82-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

async function dump() {
  try {
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val() || {};
    console.log("=== USERS ===");
    for (const uid in users) {
      console.log(`UID: ${uid} | Name: ${users[uid].displayName} | Email: ${users[uid].email} | Role: ${users[uid].role}`);
    }

    const appsSnap = await db.ref('applications').once('value');
    const apps = appsSnap.val() || {};
    console.log("\n=== APPLICATIONS ===");
    for (const id in apps) {
      console.log(`ID: ${id} | Startup: ${apps[id].data?.startupName || apps[id].data?.projectName} | Mentor ID: ${apps[id].mentorId}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

dump();

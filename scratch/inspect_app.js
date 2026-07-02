const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pierc-portal-9bd82-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

async function inspect() {
  try {
    const appsSnap = await db.ref('applications').once('value');
    console.log("=== APPLICATIONS DETAIL ===");
    console.log(JSON.stringify(appsSnap.val(), null, 2));

    const usersSnap = await db.ref('users').once('value');
    console.log("=== USERS DETAIL ===");
    console.log(JSON.stringify(usersSnap.val(), null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

inspect();

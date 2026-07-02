import { rtdb as db } from '../src/lib/firebase';
import { ref, get } from 'firebase/database';

async function checkUsers() {
  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);
  console.log('Users in DB:', snapshot.val());
}

checkUsers();

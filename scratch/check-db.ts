import { db } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkUsers() {
  const usersCol = collection(db, 'users');
  const snapshot = await getDocs(usersCol);
  console.log('Users in DB:', snapshot.docs.map(doc => doc.data()));
}

checkUsers();

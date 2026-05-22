import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from './firebaseConfig';

// =========================
// USERS
// =========================

export async function createUser(userId: string, data: any) {
  await setDoc(doc(db, 'users', userId), data);
}

export async function updateUser(userId: string, data: any) {
  await updateDoc(doc(db, 'users', userId), data);
}

export async function getUser(userId: string) {
  const snapshot = await getDoc(doc(db, 'users', userId));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getUsers() {
  const snapshot = await getDocs(collection(db, 'users'));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// =========================
// REACTIONS
// =========================

export async function saveReaction(postId: string, data: any) {
  await setDoc(
    doc(db, 'reactions', postId),
    {
      ...data,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export async function getReactions() {
  const snapshot = await getDocs(collection(db, 'reactions'));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// =========================
// POSTS
// =========================

export async function createPost(postId: string, data: any) {
  await setDoc(doc(db, 'posts', postId), data);
}

export async function getPosts() {
  const snapshot = await getDocs(collection(db, 'posts'));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db, 'posts', postId));
}

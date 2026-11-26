import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

$("signup").onclick = () =>
  createUserWithEmailAndPassword(auth, $("email").value, $("password").value).catch(e => alert(e.message));
$("login").onclick = () =>
  signInWithEmailAndPassword(auth, $("email").value, $("password").value).catch(e => alert(e.message));
$("logout").onclick = () => signOut(auth);

let unsubscribe;
onAuthStateChanged(auth, (user) => {
  $("auth-box").hidden = !!user;
  $("app").hidden = !user;
  if (unsubscribe) unsubscribe();
  if (!user) return;

  $("who").textContent = user.email;
  const q = query(collection(db, "notes"), where("uid", "==", user.uid));
  unsubscribe = onSnapshot(q, (snap) => {
    $("notes").innerHTML = "";
    snap.forEach(d => {
      const li = document.createElement("li");
      li.textContent = d.data().text;
      $("notes").appendChild(li);
    });
  });
});

$("save").onclick = async () => {
  if (!$("note").value) return;
  await addDoc(collection(db, "notes"), {
    text: $("note").value,
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });
  $("note").value = "";
};

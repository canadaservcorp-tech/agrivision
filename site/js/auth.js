// ═══ Agrivision Auth System ═══
function showModal(type) {
  document.getElementById('authModal').style.display = 'flex';
  document.getElementById('loginForm').style.display = type === 'login' ? 'block' : 'none';
  document.getElementById('signupForm').style.display = type === 'signup' ? 'block' : 'none';
  document.getElementById('loginError').textContent = '';
  document.getElementById('signupError').textContent = '';
}
function closeModal() { document.getElementById('authModal').style.display = 'none'; }

async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;
  const errEl = document.getElementById('signupError');
  if (!name || !email || !password) { errEl.textContent = 'Please fill all fields'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; return; }
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    await db.collection('users').doc(cred.user.uid).set({
      name, email, role, plan: 'free', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeModal();
    updateAuthUI(cred.user);
  } catch (e) { errEl.textContent = e.message; }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  if (!email || !password) { errEl.textContent = 'Please fill all fields'; return; }
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    closeModal();
    updateAuthUI(cred.user);
  } catch (e) { errEl.textContent = e.message; }
}

function handleLogout() {
  auth.signOut();
  updateAuthUI(null);
}

function updateAuthUI(user) {
  const authBtns = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  const userName = document.getElementById('userDisplayName');
  if (user) {
    authBtns.style.display = 'none';
    userMenu.style.display = 'flex';
    userName.textContent = user.displayName || user.email;
  } else {
    authBtns.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

// Listen for auth state
auth.onAuthStateChanged(user => updateAuthUI(user));

// STATE MANAGEMENT
let state = {
  currentUser: null,
  people: [],
  tasks: [],
  houseParts: [],
  calendar: null,
  isUnlocked: false
};

// Track whether the task/person/house-part modal is in "add" or "edit" mode
let editingTaskId = null;
let editingPersonId = null;
let editingHousePartId = null;

// INITIAL SEED DATA
const DEFAULT_ADMIN = {
  id: "admin-default",
  name: "ADMIN",
  email: "ADMIN@gmail.com",
  password: "ADMIN",
  role: "admin"
};

const DEFAULT_PEOPLE = [
  DEFAULT_ADMIN,
  { id: "p1", name: "Mario Rossi", email: "mario@gmail.com", password: "mario", role: "cadetto" },
  { id: "p2", name: "Luigi Verdi", email: "luigi@gmail.com", password: "luigi", role: "cadetto" },
  { id: "p3", name: "Anna Bianchi", email: "anna@gmail.com", password: "anna", role: "cadetto" },
  { id: "p4", name: "Sofia Neri", email: "sofia@gmail.com", password: "sofia", role: "cadetto" },
  { id: "p5", name: "Luca Gialli", email: "luca@gmail.com", password: "luca", role: "cadetto" },
  { id: "p6", name: "Elena Viola", email: "elena@gmail.com", password: "elena", role: "cadetto" },
  { id: "p7", name: "Marco Bruno", email: "marco@gmail.com", password: "marco", role: "cadetto" }
];

const DEFAULT_TASKS = [
  { id: "t1", name: "Lavare i piatti", minPeople: 2, priority: 1, linkedTask: "none" },
  { id: "t2", name: "Cucinare pranzo", minPeople: 1, priority: 2, linkedTask: "none" },
  { id: "t3", name: "Cucinare cena", minPeople: 2, priority: 3, linkedTask: "none" },
  { id: "t4", name: "Buttare spazzatura", minPeople: 1, priority: 4, linkedTask: "none" },
  { id: "t5", name: "Asciugare stoviglie", minPeople: 1, priority: 5, linkedTask: "t1" } // Linked to Lavare i piatti
];

const DEFAULT_HOUSE_PARTS = [
  { id: "hp1", name: "Cucina", minPeople: 1, priority: 1 },
  { id: "hp2", name: "Bagno Primo Piano", minPeople: 1, priority: 2 },
  { id: "hp3", name: "Bagno Secondo Piano", minPeople: 1, priority: 3 },
  { id: "hp4", name: "Salotto & Corridoio", minPeople: 1, priority: 4 },
  { id: "hp5", name: "Scale & Vetrate", minPeople: 1, priority: 5 }
];

const DAYS_OF_WEEK = ["venerdì", "sabato", "domenica", "lunedì", "martedì", "mercoledì", "giovedì"];
const WIZARD_DAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

// WIZARD STATE
let wizardSelectedAbsent = [];

// DOM ELEMENTS
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginSubmitBtn = document.getElementById("login-submit-btn");
const loginError = document.getElementById("login-error");
const migrateDataBtn = document.getElementById("migrate-data-btn");

const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");

const userAvatarInitial = document.getElementById("user-avatar-initial");
const userDisplayName = document.getElementById("user-display-name");
const userDisplayRole = document.getElementById("user-display-role");
const logoutBtn = document.getElementById("logout-btn");

// Modals
const modalTask = document.getElementById("modal-task");
const modalPerson = document.getElementById("modal-person");
const modalHousePart = document.getElementById("modal-house-part");

// Task Modal Form
const taskModalHeader = document.getElementById("modal-task-header");
const taskNameInput = document.getElementById("task-name");
const taskMinPeopleInput = document.getElementById("task-min-people");
const taskPriorityInput = document.getElementById("task-priority");
const taskLinkedSelect = document.getElementById("task-linked");
const taskDescriptionInput = document.getElementById("task-description");
const saveTaskBtn = document.getElementById("save-task-btn");
const closeTaskModalBtn = document.getElementById("close-modal-task-btn");
const addTaskBtn = document.getElementById("add-task-btn");

// Person Modal Form
const personModalHeader = document.getElementById("modal-person-header");
const personNameInput = document.getElementById("person-name");
const personEmailInput = document.getElementById("person-email");
const personPasswordInput = document.getElementById("person-password");
const personRoleSelect = document.getElementById("person-role");
const savePersonBtn = document.getElementById("save-person-btn");
const closePersonModalBtn = document.getElementById("close-modal-person-btn");
const addPersonBtn = document.getElementById("add-person-btn");

// House Part Modal Form
const housePartModalHeader = document.getElementById("modal-house-part-header");
const housePartNameInput = document.getElementById("house-part-name");
const housePartMinPeopleInput = document.getElementById("house-part-min-people");
const housePartPriorityInput = document.getElementById("house-part-priority");
const saveHousePartBtn = document.getElementById("save-house-part-btn");
const closeHousePartModalBtn = document.getElementById("close-modal-house-part-btn");
const addHousePartBtn = document.getElementById("add-house-part-btn");

// Tables Bodies
const tasksTableBody = document.getElementById("tasks-table-body");
const peopleTableBody = document.getElementById("people-table-body");
const housePartsTableBody = document.getElementById("house-parts-table-body");

// Lock button
const lockToggleBtn = document.getElementById("lock-toggle-btn");
const lockIconClosed = document.getElementById("lock-icon-closed");
const lockIconOpen = document.getElementById("lock-icon-open");

// Calendar Displays
const meterAssigneeText = document.getElementById("meter-assignee-text");
const houseCleaningList = document.getElementById("house-cleaning-list");
const eveningCheckList = document.getElementById("evening-check-list");
const laundryTableBody = document.getElementById("laundry-table-body");
const taskExplanations = document.getElementById("task-explanations");

// "Cosa faccio oggi?" search
const searchPersonInput = document.getElementById("search-person-input");
const searchDayInput = document.getElementById("search-day-input");
const searchTodayResults = document.getElementById("search-today-results");

// Wizard Elements
const startWizardBtn = document.getElementById("start-wizard-btn");
const genStepInit = document.getElementById("gen-step-init");
const genStepAbsent = document.getElementById("gen-step-absent");
const genStepDetails = document.getElementById("gen-step-details");
const wizardPeopleList = document.getElementById("wizard-people-list");
const confirmAbsentBtn = document.getElementById("confirm-absent-btn");
const absenceTableBody = document.getElementById("absence-table-body");
const backToStep1Btn = document.getElementById("back-to-step1-btn");
const generateFinalBtn = document.getElementById("generate-final-btn");

// FIREBASE (shared cloud storage, so every device sees the same data)
const firebaseConfig = {
  apiKey: "AIzaSyDc0jnyltNmarf_jAJ9pz4DKgF07e5JB1g",
  authDomain: "organizzatore-3219d.firebaseapp.com",
  projectId: "organizzatore-3219d",
  storageBucket: "organizzatore-3219d.firebasestorage.app",
  messagingSenderId: "1065130050117",
  appId: "1:1065130050117:web:bffef8f557ddfb3b84d92c",
  measurementId: "G-RHWJGTJYE9"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function persistState(key, value) {
  db.collection("appState").doc(key).set({ value })
    .catch(err => console.error(`Errore salvataggio "${key}" su Firestore:`, err));
}

// ONE-TIME MIGRATION: browsers that used this site before the switch to
// Firestore still have their data in localStorage under these old keys.
// Offer to copy it into the shared cloud database instead of silently
// losing it in favor of the fresh defaults Firestore seeds itself with.
const LEGACY_STORAGE_KEYS = {
  people: "clean_calendar_people",
  tasks: "clean_calendar_tasks",
  houseParts: "clean_calendar_house_parts",
  calendar: "clean_calendar_current"
};

function checkForLocalMigration() {
  const hasOldData = Object.values(LEGACY_STORAGE_KEYS).some(key => localStorage.getItem(key));
  if (hasOldData) {
    migrateDataBtn.style.display = "block";
  }
}

function migrateLocalDataToFirestore() {
  const confirmed = confirm(
    "Questo sovrascriverà i dati condivisi nel cloud (persone, mansioni, zone di pulizia, calendario) con quelli salvati in questo browser. Procedere?"
  );
  if (!confirmed) return;

  Object.entries(LEGACY_STORAGE_KEYS).forEach(([firestoreKey, localKey]) => {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      persistState(firestoreKey, JSON.parse(raw));
    }
  });

  migrateDataBtn.style.display = "none";
  alert("Dati migrati al cloud. Il sito si aggiornerà a breve con questi dati su tutti i dispositivi.");
}

// Tracks which of the 4 documents have delivered their first snapshot, so we
// only run the one-time app bootstrap (auto-login check) once all initial
// data has arrived, while every snapshot after that live-refreshes the UI.
let appBootstrapped = false;
const pendingInitialLoads = { people: true, tasks: true, houseParts: true, calendar: true };

function checkBootstrapComplete() {
  if (appBootstrapped || Object.values(pendingInitialLoads).some(Boolean)) return;
  appBootstrapped = true;
  loginSubmitBtn.disabled = false;
  loginSubmitBtn.textContent = "Accedi";

  // Auto Login if session exists (using sessionStorage for temporary login state)
  const loggedUser = sessionStorage.getItem("logged_in_user");
  if (loggedUser) {
    const userObj = JSON.parse(loggedUser);
    // Refresh user object from latest state in case role changed
    const freshUser = state.people.find(p => p.email.toLowerCase() === userObj.email.toLowerCase());
    if (freshUser) {
      state.currentUser = freshUser;
      showApp();
    } else {
      sessionStorage.removeItem("logged_in_user");
    }
  }
}

// Called whenever data changes remotely (from this device or another one)
// after the app has already booted, so every open device stays in sync.
function refreshLiveUI() {
  if (!state.currentUser) return; // still on the login screen
  populateTasksTable();
  populatePeopleTable();
  populateHousePartsTable();
  updateLinkedTasksDropdowns();
  populateSearchPersonDropdown();
  if (!state.calendar) {
    state.calendar = createBlankCalendar();
  }
  renderCalendar();
}

function watchFirestoreState() {
  db.collection("appState").doc("people").onSnapshot(snap => {
    if (snap.exists) {
      state.people = snap.data().value;
    } else if (pendingInitialLoads.people) {
      state.people = [...DEFAULT_PEOPLE];
      persistState("people", state.people);
    }
    if (pendingInitialLoads.people) {
      pendingInitialLoads.people = false;
      checkBootstrapComplete();
    } else {
      refreshLiveUI();
    }
  }, err => console.error("Errore lettura persone da Firestore:", err));

  db.collection("appState").doc("tasks").onSnapshot(snap => {
    if (snap.exists) {
      state.tasks = snap.data().value;
    } else if (pendingInitialLoads.tasks) {
      state.tasks = [...DEFAULT_TASKS];
      persistState("tasks", state.tasks);
    }
    if (pendingInitialLoads.tasks) {
      pendingInitialLoads.tasks = false;
      checkBootstrapComplete();
    } else {
      refreshLiveUI();
    }
  }, err => console.error("Errore lettura mansioni da Firestore:", err));

  db.collection("appState").doc("houseParts").onSnapshot(snap => {
    let parts;
    if (snap.exists) {
      parts = snap.data().value;
    } else if (pendingInitialLoads.houseParts) {
      parts = [...DEFAULT_HOUSE_PARTS];
    } else {
      parts = state.houseParts;
    }
    // Migrate zones saved before minPeople/priority existed, so stale data
    // doesn't silently break assignment (a missing minPeople stops the
    // assignment loop from ever running).
    state.houseParts = parts.map(zone => ({
      id: zone.id,
      name: zone.name,
      minPeople: (typeof zone.minPeople === "number" && zone.minPeople > 0) ? zone.minPeople : 1,
      priority: (typeof zone.priority === "number") ? zone.priority : 999
    }));
    if (pendingInitialLoads.houseParts && !snap.exists) {
      persistState("houseParts", state.houseParts);
    }
    if (pendingInitialLoads.houseParts) {
      pendingInitialLoads.houseParts = false;
      checkBootstrapComplete();
    } else {
      refreshLiveUI();
    }
  }, err => console.error("Errore lettura zone di pulizia da Firestore:", err));

  db.collection("appState").doc("calendar").onSnapshot(snap => {
    state.calendar = snap.exists ? snap.data().value : null;
    if (pendingInitialLoads.calendar) {
      pendingInitialLoads.calendar = false;
      checkBootstrapComplete();
    } else {
      refreshLiveUI();
    }
  }, err => console.error("Errore lettura calendario da Firestore:", err));
}

// INITIAL SETUP
function init() {
  checkForLocalMigration();
  migrateDataBtn.addEventListener("click", migrateLocalDataToFirestore);

  // Disabled until the initial data has arrived from Firestore, so a login
  // attempt during that brief window can't be wrongly rejected
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = "Caricamento...";

  watchFirestoreState();

  // Bind Events
  loginSubmitBtn.addEventListener("click", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  loginEmailInput.addEventListener("input", updateLoginBackground);

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Modals Buttons
  addTaskBtn.addEventListener("click", () => openAddTaskModal());
  closeTaskModalBtn.addEventListener("click", () => closeModal(modalTask));
  saveTaskBtn.addEventListener("click", saveTask);

  addPersonBtn.addEventListener("click", () => openAddPersonModal());
  closePersonModalBtn.addEventListener("click", () => closeModal(modalPerson));
  savePersonBtn.addEventListener("click", savePerson);

  addHousePartBtn.addEventListener("click", () => openAddHousePartModal());
  closeHousePartModalBtn.addEventListener("click", () => closeModal(modalHousePart));
  saveHousePartBtn.addEventListener("click", saveHousePart);

  // Lock Toggle Button
  lockToggleBtn.addEventListener("click", toggleLock);

  // "Cosa faccio oggi?" search (runs as soon as either dropdown changes)
  searchPersonInput.addEventListener("change", runTodaySearch);
  searchDayInput.addEventListener("change", runTodaySearch);

  // Wizard Buttons
  startWizardBtn.addEventListener("click", startWizard);
  confirmAbsentBtn.addEventListener("click", goToStep2);
  backToStep1Btn.addEventListener("click", goBackToStep1);
  generateFinalBtn.addEventListener("click", generateCalendar);
}

// LOGIN BACKGROUND EASTER EGG
// As the email field is typed, the login page background progressively
// changes through 3 images tied to one specific account. Checked longest
// (most specific) match first so the full-email stage wins over the shorter
// prefixes once reached.
function updateLoginBackground() {
  const value = loginEmailInput.value.trim().toLowerCase();
  loginView.classList.remove("login-bg-stage-1", "login-bg-stage-2", "login-bg-stage-3");

  if (value === "robertbaciu967@gmail.com") {
    loginView.classList.add("login-bg-stage-3");
  } else if (value.startsWith("robert")) {
    loginView.classList.add("login-bg-stage-2");
  } else if (value.startsWith("ro")) {
    loginView.classList.add("login-bg-stage-1");
  }
}

// NAVIGATION & AUTHENTICATION
function handleLogin() {
  const email = loginEmailInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value;

  const foundUser = state.people.find(
    p => p.email.toLowerCase() === email && p.password === password
  );

  if (foundUser) {
    state.currentUser = foundUser;
    sessionStorage.setItem("logged_in_user", JSON.stringify(foundUser));
    loginError.style.display = "none";
    loginEmailInput.value = "";
    loginPasswordInput.value = "";
    loginView.classList.remove("login-bg-stage-1", "login-bg-stage-2", "login-bg-stage-3");
    showApp();
  } else {
    loginError.style.display = "block";
  }
}

function handleLogout() {
  state.currentUser = null;
  sessionStorage.removeItem("logged_in_user");
  state.isUnlocked = false;
  lockIconClosed.style.display = "block";
  lockIconOpen.style.display = "none";
  lockToggleBtn.classList.remove("unlocked");
  
  appView.style.display = "none";
  loginView.style.display = "flex";
}

function showApp() {
  loginView.style.display = "none";
  appView.style.display = "flex";

  // Setup user details and role-based permissions visibility
  refreshCurrentUserUI();

  // Populate data
  populateTasksTable();
  populatePeopleTable();
  populateHousePartsTable();
  updateLinkedTasksDropdowns();
  populateSearchPersonDropdown();

  if (state.calendar) {
    renderCalendar();
  } else {
    // Generate an initial blank calendar structures if none exists
    state.calendar = createBlankCalendar();
    renderCalendar();
  }

  switchTab("tab-visualizzazione");
}

function switchTab(tabId) {
  navItems.forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  tabContents.forEach(tab => {
    if (tab.id === tabId) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // If entering wizard tab, reset to start screen
  if (tabId === "tab-generazione") {
    resetWizard();
  }
}

// MODALS AND FORMS
function openModal(modal) {
  modal.classList.add("active");
}

function closeModal(modal) {
  modal.classList.remove("active");
}

function updateLinkedTasksDropdowns() {
  taskLinkedSelect.innerHTML = '<option value="none">Nessuna</option>';
  state.tasks.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    taskLinkedSelect.appendChild(opt);
  });
}

function populateSearchPersonDropdown() {
  const previousValue = searchPersonInput.value;
  searchPersonInput.innerHTML = '<option value="">Tutte le persone</option>';
  getSchedulablePeople().forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.textContent = p.name;
    searchPersonInput.appendChild(opt);
  });
  // Keep the current selection if that person still exists
  if ([...searchPersonInput.options].some(o => o.value === previousValue)) {
    searchPersonInput.value = previousValue;
  }
}

function openAddTaskModal() {
  editingTaskId = null;
  taskModalHeader.textContent = "Aggiungi Nuova Mansione";
  taskNameInput.value = "";
  taskMinPeopleInput.value = "1";
  taskPriorityInput.value = "";
  taskDescriptionInput.value = "";
  updateLinkedTasksDropdowns();
  taskLinkedSelect.value = "none";
  openModal(modalTask);
}

function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  taskModalHeader.textContent = "Modifica Mansione";
  taskNameInput.value = task.name;
  taskMinPeopleInput.value = task.minPeople;
  taskPriorityInput.value = task.priority;
  taskDescriptionInput.value = task.description || "";
  updateLinkedTasksDropdowns();
  taskLinkedSelect.value = task.linkedTask;
  openModal(modalTask);
}

function saveTask() {
  const name = taskNameInput.value.trim();
  const minPeople = parseInt(taskMinPeopleInput.value) || 1;
  const rawPriority = taskPriorityInput.value.trim();
  const linkedTask = taskLinkedSelect.value;
  const description = taskDescriptionInput.value.trim();

  if (!name) {
    alert("Inserire il nome della mansione!");
    return;
  }

  // Check priority numeric validation
  let priority = 999;
  if (rawPriority !== "" && !isNaN(rawPriority)) {
    priority = parseInt(rawPriority);
  }

  if (editingTaskId) {
    // A task cannot be linked to itself
    const task = state.tasks.find(t => t.id === editingTaskId);
    task.name = name;
    task.minPeople = minPeople;
    task.priority = priority;
    task.linkedTask = linkedTask === editingTaskId ? "none" : linkedTask;
    task.description = description;
  } else {
    state.tasks.push({
      id: "task-" + Date.now(),
      name,
      minPeople,
      priority,
      linkedTask,
      description
    });
  }

  persistState("tasks", state.tasks);
  editingTaskId = null;

  closeModal(modalTask);
  populateTasksTable();
  updateLinkedTasksDropdowns();
  renderCalendar(); // Expanations list could change
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  // Clean up any tasks linked to this deleted task
  state.tasks.forEach(t => {
    if (t.linkedTask === id) {
      t.linkedTask = "none";
    }
  });
  persistState("tasks", state.tasks);
  populateTasksTable();
  updateLinkedTasksDropdowns();
  renderCalendar();
}

// Moves a task up (direction -1) or down (direction +1) in the priority
// order shown in Visualizzazione. Re-numbers every task's priority to a
// clean 1..N sequence matching the new order, so the move always works
// even if several tasks previously shared the same priority value.
function moveTask(id, direction) {
  const sorted = [...state.tasks].sort((a, b) => a.priority - b.priority);
  const idx = sorted.findIndex(t => t.id === id);
  const targetIdx = idx + direction;
  if (idx === -1 || targetIdx < 0 || targetIdx >= sorted.length) return;

  [sorted[idx], sorted[targetIdx]] = [sorted[targetIdx], sorted[idx]];
  sorted.forEach((t, i) => { t.priority = i + 1; });

  persistState("tasks", state.tasks);
  populateTasksTable();
  renderCalendar();
}

function populateTasksTable() {
  tasksTableBody.innerHTML = "";
  // Sort tasks by priority
  const sorted = [...state.tasks].sort((a, b) => a.priority - b.priority);

  sorted.forEach((t, idx) => {
    const linked = state.tasks.find(lt => lt.id === t.linkedTask);
    const linkedName = linked ? linked.name : "Nessuna";
    const tr = document.createElement("tr");

    const actionBtns = state.currentUser.role === "admin"
      ? `<button class="action-btn-edit" onclick="moveTask('${t.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Sposta su">
          <svg viewBox="0 0 24 24"><path d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"/></svg>
         </button>
         <button class="action-btn-edit" onclick="moveTask('${t.id}', 1)" ${idx === sorted.length - 1 ? 'disabled' : ''} title="Sposta giù">
          <svg viewBox="0 0 24 24"><path d="M7.41,8.59L12,13.17L16.59,8.59L18,10L12,16L6,10L7.41,8.59Z"/></svg>
         </button>
         <button class="action-btn-edit" onclick="editTask('${t.id}')" title="Modifica">
          <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
         </button>
         <button class="action-btn-danger" onclick="deleteTask('${t.id}')" title="Elimina">
          <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
         </button>`
      : "";

    tr.innerHTML = `
      <td><strong>${escapeHtml(t.name)}</strong></td>
      <td>${t.minPeople}</td>
      <td>${t.priority}</td>
      <td><span style="color: var(--accent-color);">${escapeHtml(linkedName)}</span></td>
      ${state.currentUser.role === 'admin' ? `<td style="text-align: center; white-space: nowrap;">${actionBtns}</td>` : ''}
    `;
    tasksTableBody.appendChild(tr);
  });
}

function openAddPersonModal() {
  editingPersonId = null;
  personModalHeader.textContent = "Aggiungi Nuovo Utente (Cadetto)";
  personNameInput.value = "";
  personEmailInput.value = "";
  personPasswordInput.value = "";
  personRoleSelect.value = "cadetto";
  openModal(modalPerson);
}

function editPerson(id) {
  const person = state.people.find(p => p.id === id);
  if (!person) return;

  editingPersonId = id;
  personModalHeader.textContent = "Modifica Utente";
  personNameInput.value = person.name;
  personEmailInput.value = person.email;
  personPasswordInput.value = person.password;
  personRoleSelect.value = person.role;
  openModal(modalPerson);
}

function savePerson() {
  const name = personNameInput.value.trim();
  const email = personEmailInput.value.trim();
  const password = personPasswordInput.value;
  const role = personRoleSelect.value;

  if (!name || !email || !password) {
    alert("Compilare tutti i campi!");
    return;
  }

  // Check unique email (excluding the person currently being edited)
  const emailTaken = state.people.some(
    p => p.email.toLowerCase() === email.toLowerCase() && p.id !== editingPersonId
  );
  if (emailTaken) {
    alert("Email già registrata!");
    return;
  }

  if (editingPersonId) {
    const person = state.people.find(p => p.id === editingPersonId);
    person.name = name;
    person.email = email;
    person.password = password;
    if (editingPersonId !== "admin-default") {
      person.role = role;
    }

    // If the admin is editing their own account, keep the session in sync
    if (state.currentUser.id === editingPersonId) {
      state.currentUser = person;
      sessionStorage.setItem("logged_in_user", JSON.stringify(person));
      refreshCurrentUserUI();
    }
  } else {
    state.people.push({
      id: "person-" + Date.now(),
      name,
      email,
      password,
      role
    });
  }

  persistState("people", state.people);
  editingPersonId = null;

  closeModal(modalPerson);
  populatePeopleTable();
  populateSearchPersonDropdown();
  renderCalendar(); // Assignee names showing this person may need refreshing
}

function refreshCurrentUserUI() {
  userAvatarInitial.textContent = state.currentUser.name.charAt(0).toUpperCase();
  userDisplayName.textContent = state.currentUser.name;
  userDisplayRole.textContent = state.currentUser.role;

  if (state.currentUser.role === "admin") {
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "");
    lockToggleBtn.style.display = "flex";
  } else {
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    lockToggleBtn.style.display = "none";
  }
}

function deletePerson(id) {
  if (id === "admin-default") {
    alert("Impossibile cancellare l'account ADMIN predefinito!");
    return;
  }
  state.people = state.people.filter(p => p.id !== id);
  persistState("people", state.people);
  populatePeopleTable();
  populateSearchPersonDropdown();
}

function populatePeopleTable() {
  peopleTableBody.innerHTML = "";
  getSchedulablePeople().forEach(p => {
    const tr = document.createElement("tr");

    const editBtn = state.currentUser.role === "admin"
      ? `<button class="action-btn-edit" onclick="editPerson('${p.id}')">
          <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
         </button>`
      : "";

    const deleteBtn = (state.currentUser.role === "admin" && p.id !== "admin-default")
      ? `<button class="action-btn-danger" onclick="deletePerson('${p.id}')">
          <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
         </button>`
      : "";

    tr.innerHTML = `
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.email)}</td>
      <td><span class="badge badge-${p.role}">${p.role}</span></td>
      ${state.currentUser.role === 'admin' ? `<td style="text-align: center;">${editBtn}${deleteBtn}</td>` : ''}
    `;
    peopleTableBody.appendChild(tr);
  });
}

// HOUSE CLEANING ZONES MANAGEMENT
function openAddHousePartModal() {
  editingHousePartId = null;
  housePartModalHeader.textContent = "Aggiungi Zona di Pulizia";
  housePartNameInput.value = "";
  housePartMinPeopleInput.value = "1";
  housePartPriorityInput.value = "";
  openModal(modalHousePart);
}

function editHousePart(id) {
  const zone = state.houseParts.find(z => z.id === id);
  if (!zone) return;

  editingHousePartId = id;
  housePartModalHeader.textContent = "Modifica Zona di Pulizia";
  housePartNameInput.value = zone.name;
  housePartMinPeopleInput.value = zone.minPeople;
  housePartPriorityInput.value = zone.priority;
  openModal(modalHousePart);
}

function saveHousePart() {
  const name = housePartNameInput.value.trim();
  const minPeople = parseInt(housePartMinPeopleInput.value) || 1;
  const rawPriority = housePartPriorityInput.value.trim();

  if (!name) {
    alert("Inserire il nome della zona!");
    return;
  }

  let priority = 999;
  if (rawPriority !== "" && !isNaN(rawPriority)) {
    priority = parseInt(rawPriority);
  }

  if (editingHousePartId) {
    const zone = state.houseParts.find(z => z.id === editingHousePartId);
    zone.name = name;
    zone.minPeople = minPeople;
    zone.priority = priority;
  } else {
    state.houseParts.push({ id: "hp-" + Date.now(), name, minPeople, priority });
  }

  persistState("houseParts", state.houseParts);
  editingHousePartId = null;

  closeModal(modalHousePart);
  populateHousePartsTable();
  renderCalendar();
}

function deleteHousePart(id) {
  state.houseParts = state.houseParts.filter(z => z.id !== id);
  persistState("houseParts", state.houseParts);
  populateHousePartsTable();
  renderCalendar();
}

function populateHousePartsTable() {
  housePartsTableBody.innerHTML = "";
  const sorted = [...state.houseParts].sort((a, b) => a.priority - b.priority);

  sorted.forEach(zone => {
    const tr = document.createElement("tr");

    const actionBtns = state.currentUser.role === "admin"
      ? `<button class="action-btn-edit" onclick="editHousePart('${zone.id}')">
          <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
         </button>
         <button class="action-btn-danger" onclick="deleteHousePart('${zone.id}')">
          <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
         </button>`
      : "";

    tr.innerHTML = `
      <td><strong>${escapeHtml(zone.name)}</strong></td>
      <td>${zone.minPeople}</td>
      <td>${zone.priority}</td>
      ${state.currentUser.role === 'admin' ? `<td style="text-align: center;">${actionBtns}</td>` : ''}
    `;
    housePartsTableBody.appendChild(tr);
  });
}

// The default ADMIN account is a management login, not a resident: it should
// never show up as an assignable/schedulable person anywhere (wizard,
// calendar assignee dropdowns, chore rotation). Other admin accounts created
// via Gestione Persone still take part normally.
function getSchedulablePeople() {
  return state.people.filter(p => p.id !== "admin-default");
}

// CALENDAR RENDER & DIRECT EDITING SYSTEM
function createBlankCalendar() {
  const cal = {
    meterAssignee: "",
    houseCleaning: {},
    weekly: {},
    eveningCheck: {},
    laundry: {
      mattina: {},
      pomeriggio: {}
    },
    exceptions: []
  };

  state.houseParts.forEach(zone => {
    cal.houseCleaning[zone.id] = { assigned: [], helpers: [] };
  });

  DAYS_OF_WEEK.forEach(day => {
    cal.weekly[day] = [];
    cal.eveningCheck[day] = "";
    cal.laundry.mattina[day] = "";
    cal.laundry.pomeriggio[day] = "";
  });

  return cal;
}

function toggleLock() {
  if (state.currentUser.role !== "admin") return;

  state.isUnlocked = !state.isUnlocked;

  if (state.isUnlocked) {
    lockIconClosed.style.display = "none";
    lockIconOpen.style.display = "block";
    lockToggleBtn.classList.add("unlocked");
  } else {
    lockIconClosed.style.display = "block";
    lockIconOpen.style.display = "none";
    lockToggleBtn.classList.remove("unlocked");
    // Save state on lock
    saveEditedCalendarState();
  }

  renderCalendar();
}

function saveEditedCalendarState() {
  if (!state.calendar) return;

  // Save Meter Assignee
  const meterSelect = document.getElementById("edit-meter-assignee");
  if (meterSelect) {
    state.calendar.meterAssignee = meterSelect.value;
  }

  // Save House Cleaning
  state.houseParts.forEach(zone => {
    const input = document.getElementById(`edit-house-${zone.id}`);
    if (input) {
      if (!state.calendar.houseCleaning[zone.id]) {
        state.calendar.houseCleaning[zone.id] = { assigned: [], helpers: [] };
      }
      state.calendar.houseCleaning[zone.id].assigned = input.value.split(",").map(s => s.trim()).filter(Boolean);
    }
  });

  // Save Weekly Tasks
  DAYS_OF_WEEK.forEach(day => {
    if (state.calendar.weekly[day]) {
      state.calendar.weekly[day].forEach((taskInst, idx) => {
        const select = document.getElementById(`edit-task-${day}-${idx}`);
        if (select) {
          // Multiple people can be selected if multi-select or text input.
          // Let's use simple single select or comma-separated string to support multiple.
          // Let's do comma separated names for flexibility.
          state.calendar.weekly[day][idx].assigned = select.value.split(",").map(s => s.trim()).filter(Boolean);
        }
      });
    }

    // Save Evening Check
    const eveningSelect = document.getElementById(`edit-evening-${day}`);
    if (eveningSelect) {
      state.calendar.eveningCheck[day] = eveningSelect.value;
    }

    // Save Laundry
    const laundryMSelect = document.getElementById(`edit-laundry-mattina-${day}`);
    if (laundryMSelect) {
      state.calendar.laundry.mattina[day] = laundryMSelect.value;
    }
    const laundryPSelect = document.getElementById(`edit-laundry-pomeriggio-${day}`);
    if (laundryPSelect) {
      state.calendar.laundry.pomeriggio[day] = laundryPSelect.value;
    }
  });

  persistState("calendar", state.calendar);
}

// For assignment fields that accept multiple comma-separated names (weekly
// tasks, house cleaning zones), pairs the free-text input with a dropdown
// of actual people: picking someone appends their name to the text field
// instead of requiring it to be typed out by hand.
function assigneePickerHTML(inputId) {
  return `<select id="${inputId}-picker" class="input-field" style="margin-top: 4px; padding: 4px 8px; font-size: 12px;" onchange="addNameToAssigneeField('${inputId}', this.value)">
    <option value="">+ Aggiungi persona...</option>
    ${getSchedulablePeople().map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
  </select>`;
}

function addNameToAssigneeField(inputId, name) {
  if (!name) return;
  const input = document.getElementById(inputId);
  if (!input) return;

  const current = input.value.split(",").map(s => s.trim()).filter(Boolean);
  if (!current.includes(name)) {
    current.push(name);
  }
  input.value = current.join(", ");

  const picker = document.getElementById(inputId + "-picker");
  if (picker) picker.value = "";
}

function renderCalendar() {
  if (!state.calendar) return;

  const cadetsOnly = state.people.filter(p => p.role === "cadetto");

  // RENDER METER READING
  if (state.isUnlocked) {
    meterAssigneeText.style.display = "none";
    let selectHTML = `<select id="edit-meter-assignee" class="meter-select">
      <option value="">Nessuno</option>
      ${getSchedulablePeople().map(p => `<option value="${escapeHtml(p.name)}" ${state.calendar.meterAssignee === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
    </select>`;
    document.getElementById("meter-display-container").innerHTML = selectHTML;
  } else {
    document.getElementById("meter-display-container").innerHTML = `<span id="meter-assignee-text" class="meter-value">${escapeHtml(state.calendar.meterAssignee) || 'Non assegnato'}</span>`;
  }

  // RENDER HOUSE CLEANING
  houseCleaningList.innerHTML = "";
  const sortedHouseParts = [...state.houseParts].sort((a, b) => a.priority - b.priority);
  sortedHouseParts.forEach(zone => {
    const data = state.calendar.houseCleaning[zone.id] || { assigned: [], helpers: [] };
    const assignedNames = Array.isArray(data.assigned) ? data.assigned : (data.assigned ? [data.assigned] : []);
    const card = document.createElement("div");
    card.className = "house-part-card";

    let assigneeHTML = "";
    if (state.isUnlocked) {
      assigneeHTML = `<input type="text" id="edit-house-${zone.id}" class="input-field" style="padding: 6px 10px; font-size: 13px;" value="${escapeHtml(assignedNames.join(', '))}" placeholder="Nomi separati da virgola (min. ${zone.minPeople})">
        ${assigneePickerHTML(`edit-house-${zone.id}`)}`;
    } else {
      assigneeHTML = `<span class="house-part-assignee">${escapeHtml(assignedNames.join(', ')) || 'Non assegnato'}</span>`;
    }

    let helpersHTML = "";
    if (data.helpers && data.helpers.length > 0) {
      data.helpers.forEach(h => {
        helpersHTML += `<div class="house-part-helper">Aiuto: ${escapeHtml(h.name)} (${h.days.join(', ')})</div>`;
      });
    }

    card.innerHTML = `
      <div class="house-part-name">${escapeHtml(zone.name)}</div>
      <div class="house-part-assignee-container" style="margin-top: 4px;">
        ${assigneeHTML}
      </div>
      ${helpersHTML}
    `;
    houseCleaningList.appendChild(card);
  });

  // RENDER WEEKLY CALENDAR DAYS
  // Keep each day's task order in sync with the current priority set in
  // Gestione Mansioni (same order shown in that table), rather than the
  // order they happened to be in when the calendar was generated. Sorting
  // the array in place (not a copy) keeps it aligned with the
  // "edit-task-{day}-{idx}" ids used when saving manual edits.
  function taskPriority(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    return task ? task.priority : 999;
  }

  DAYS_OF_WEEK.forEach(day => {
    const col = document.querySelector(`.day-column[data-day="${day}"]`);
    const list = col.querySelector(".day-tasks-list");
    list.innerHTML = "";

    if (state.calendar.weekly[day]) {
      state.calendar.weekly[day].sort((a, b) => taskPriority(a.taskId) - taskPriority(b.taskId));
    }

    const dayTasks = state.calendar.weekly[day] || [];
    dayTasks.forEach((taskInst, idx) => {
      const item = document.createElement("div");
      item.className = "day-task-item";

      let assigneeHTML = "";
      if (state.isUnlocked) {
        // Text input for names (supports multiple, comma-separated) paired
        // with a dropdown to add a person without typing their name
        assigneeHTML = `<input type="text" id="edit-task-${day}-${idx}" class="day-task-assignee-edit" value="${escapeHtml(taskInst.assigned.join(', '))}" placeholder="Nomi separati da virgola">
          ${assigneePickerHTML(`edit-task-${day}-${idx}`)}`;
      } else {
        assigneeHTML = `<div class="day-task-assignee">${escapeHtml(taskInst.assigned.join(', ')) || 'Non assegnato'}</div>`;
      }

      item.innerHTML = `
        <div class="day-task-name">${escapeHtml(taskInst.name)}</div>
        ${assigneeHTML}
      `;
      list.appendChild(item);
    });

    if (dayTasks.length === 0) {
      list.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 20px;">Nessuna attività generata</div>`;
    }
  });

  // RENDER EVENING CHECK
  eveningCheckList.innerHTML = "";
  DAYS_OF_WEEK.forEach(day => {
    const assignee = state.calendar.eveningCheck[day] || "";
    const pill = document.createElement("div");
    pill.className = "evening-day-pill";

    let assigneeHTML = "";
    if (state.isUnlocked) {
      assigneeHTML = `<select id="edit-evening-${day}" class="input-field" style="padding: 6px 10px; font-size: 13px; margin-top: 4px;">
        <option value="">Nessuno</option>
        ${getSchedulablePeople().map(p => `<option value="${escapeHtml(p.name)}" ${assignee === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>`;
    } else {
      assigneeHTML = `<div class="evening-day-assignee">${escapeHtml(assignee) || '-'}</div>`;
    }

    pill.innerHTML = `
      <div class="evening-day-name">${day}</div>
      ${assigneeHTML}
    `;
    eveningCheckList.appendChild(pill);
  });

  // RENDER LAUNDRY TABLE
  DAYS_OF_WEEK.forEach(day => {
    const shiftM = state.calendar.laundry.mattina[day] || "";
    const shiftP = state.calendar.laundry.pomeriggio[day] || "";

    const tdM = document.querySelector(`#laundry-table-body tr[data-shift="mattina"] td[data-day="${day}"]`);
    const tdP = document.querySelector(`#laundry-table-body tr[data-shift="pomeriggio"] td[data-day="${day}"]`);

    if (state.isUnlocked) {
      tdM.innerHTML = `<select id="edit-laundry-mattina-${day}" class="input-field" style="padding: 6px; font-size: 12px; width: 100%;">
        <option value="">-</option>
        ${getSchedulablePeople().map(p => `<option value="${escapeHtml(p.name)}" ${shiftM === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>`;

      tdP.innerHTML = `<select id="edit-laundry-pomeriggio-${day}" class="input-field" style="padding: 6px; font-size: 12px; width: 100%;">
        <option value="">-</option>
        ${getSchedulablePeople().map(p => `<option value="${escapeHtml(p.name)}" ${shiftP === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>`;
    } else {
      tdM.innerHTML = escapeHtml(shiftM) || "-";
      tdP.innerHTML = escapeHtml(shiftP) || "-";
    }
  });

  // RENDER EXPLANATIONS
  taskExplanations.innerHTML = "";
  if (state.tasks.length === 0) {
    taskExplanations.innerHTML = "<li>Nessuna mansione configurata.</li>";
  } else {
    [...state.tasks].sort((a, b) => a.priority - b.priority).forEach(t => {
      const li = document.createElement("li");
      if (t.description && t.description.trim()) {
        li.innerHTML = `<strong>${escapeHtml(t.name)}</strong>: ${escapeHtml(t.description)}`;
      } else {
        const linked = state.tasks.find(lt => lt.id === t.linkedTask);
        const linkedStr = linked ? ` (Se assegnata, l'addetto svolge anche '${linked.name}')` : "";
        li.innerHTML = `<strong>${escapeHtml(t.name)}</strong>: priorità ${t.priority}, minimo ${t.minPeople} addetti.${linkedStr}`;
      }
      taskExplanations.appendChild(li);
    });
  }
}

// "COSA FACCIO OGGI?" SEARCH
// Requires a specific person to be selected - the full weekly calendar
// already covers "show everyone", so results stay empty until someone is
// chosen. The day is still optional (blank matches every day). Searches
// across every category: daily tasks, evening check, laundry shifts, house
// cleaning zones (including helpers, who only count on their specific
// present days) and the weekly meter reading / porch cleaning duty.
function runTodaySearch() {
  const personQuery = searchPersonInput.value.trim().toLowerCase();
  const dayQuery = searchDayInput.value.trim().toLowerCase();

  if (!personQuery) {
    searchTodayResults.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Seleziona una persona per vedere le sue attività (per la vista di tutti usa il Calendario Settimanale qui sotto).</p>`;
    return;
  }

  if (!state.calendar) {
    searchTodayResults.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Nessun calendario generato.</p>`;
    return;
  }

  const nameMatches = (name) => name && name.toLowerCase().includes(personQuery);
  const dayMatches = (day) => !dayQuery || day.toLowerCase().startsWith(dayQuery);

  // Duties that apply all week (not tied to a single day)
  const weeklyDuties = [];

  if (state.calendar.meterAssignee && nameMatches(state.calendar.meterAssignee)) {
    weeklyDuties.push(`Lettura Contatori e Pulizia Portico — ${escapeHtml(state.calendar.meterAssignee)}`);
  }

  state.houseParts.forEach(zone => {
    const data = state.calendar.houseCleaning[zone.id];
    if (!data) return;
    const assignedNames = Array.isArray(data.assigned) ? data.assigned : [];
    assignedNames.forEach(name => {
      if (nameMatches(name)) {
        weeklyDuties.push(`Pulizia ${escapeHtml(zone.name)} — ${escapeHtml(name)}`);
      }
    });
  });

  // Duties tied to a specific day
  const dailyResults = []; // { day, text }

  DAYS_OF_WEEK.forEach(day => {
    if (!dayMatches(day)) return;

    (state.calendar.weekly[day] || []).forEach(taskInst => {
      taskInst.assigned.forEach(name => {
        if (nameMatches(name)) {
          dailyResults.push({ day, text: `${escapeHtml(taskInst.name)} — ${escapeHtml(name)}` });
        }
      });
    });

    const eveningName = state.calendar.eveningCheck[day];
    if (eveningName && nameMatches(eveningName)) {
      dailyResults.push({ day, text: `Controllo Serale — ${escapeHtml(eveningName)}` });
    }

    const laundryM = state.calendar.laundry.mattina[day];
    if (laundryM && nameMatches(laundryM)) {
      dailyResults.push({ day, text: `Lavanderia Mattina — ${escapeHtml(laundryM)}` });
    }

    const laundryP = state.calendar.laundry.pomeriggio[day];
    if (laundryP && nameMatches(laundryP)) {
      dailyResults.push({ day, text: `Lavanderia Pomeriggio — ${escapeHtml(laundryP)}` });
    }

    const dayAbbrev = day.slice(0, 3);
    state.houseParts.forEach(zone => {
      const data = state.calendar.houseCleaning[zone.id];
      if (!data || !data.helpers) return;
      data.helpers.forEach(h => {
        if (nameMatches(h.name) && h.days.includes(dayAbbrev)) {
          dailyResults.push({ day, text: `Aiuto Pulizia ${escapeHtml(zone.name)} — ${escapeHtml(h.name)}` });
        }
      });
    });
  });

  if (weeklyDuties.length === 0 && dailyResults.length === 0) {
    searchTodayResults.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Nessuna attività trovata per i criteri inseriti.</p>`;
    return;
  }

  let html = "";
  if (weeklyDuties.length > 0) {
    html += `<div class="search-today-section-title">Impegni per tutta la settimana</div>`;
    html += `<ul class="desc-list">${weeklyDuties.map(t => `<li>${t}</li>`).join('')}</ul>`;
  }
  if (dailyResults.length > 0) {
    html += `<div class="search-today-section-title">Attività giornaliere</div>`;
    html += `<ul class="desc-list">${dailyResults.map(r => `<li><strong>${escapeHtml(r.day)}</strong>: ${r.text}</li>`).join('')}</ul>`;
  }
  searchTodayResults.innerHTML = html;
}

// GENERATION WIZARD LOGIC
function resetWizard() {
  genStepInit.classList.add("active");
  genStepAbsent.classList.remove("active");
  genStepDetails.classList.remove("active");
  wizardSelectedAbsent = [];
  document.getElementById("step2-present-list").style.display = "none";
}

function startWizard() {
  genStepInit.classList.remove("active");
  genStepAbsent.classList.add("active");

  // Populate wizard people list
  wizardPeopleList.innerHTML = "";
  // Admins also take part in the chore rotation (except the default ADMIN login)
  const cadets = getSchedulablePeople();

  if (cadets.length === 0) {
    wizardPeopleList.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Aggiungi prima delle persone nella scheda Persone!</p>`;
    confirmAbsentBtn.disabled = true;
    return;
  }
  confirmAbsentBtn.disabled = false;

  cadets.forEach(p => {
    const card = document.createElement("label");
    card.className = "checkbox-card";
    card.innerHTML = `
      <input type="checkbox" data-person-id="${p.id}">
      <span class="checkbox-card-label">${escapeHtml(p.name)}</span>
    `;
    wizardPeopleList.appendChild(card);
  });
}

function goToStep2() {
  // Find which cadets were selected (these are the absent ones)
  wizardSelectedAbsent = [];
  const checkedBoxes = wizardPeopleList.querySelectorAll('input[type="checkbox"]:checked');
  
  checkedBoxes.forEach(cb => {
    const pId = cb.getAttribute("data-person-id");
    const personObj = state.people.find(p => p.id === pId);
    if (personObj) {
      wizardSelectedAbsent.push(personObj);
    }
  });

  genStepAbsent.classList.remove("active");
  genStepDetails.classList.add("active");

  // Show, explicitly, which cadets are NOT flagged as absent: they will be
  // scheduled normally as present every day, with no further action needed.
  const allCadets = getSchedulablePeople();
  const absentIds = new Set(wizardSelectedAbsent.map(p => p.id));
  const presentCadets = allCadets.filter(p => !absentIds.has(p.id));
  const presentListEl = document.getElementById("step2-present-list");

  if (presentCadets.length > 0) {
    presentListEl.innerHTML = `<strong>Presenti tutta la settimana (nessuna azione richiesta):</strong> ${presentCadets.map(p => escapeHtml(p.name)).join(', ')}`;
    presentListEl.style.display = "block";
  } else {
    presentListEl.innerHTML = `<strong>Attenzione:</strong> tutti i cadetti sono stati selezionati come almeno parzialmente assenti al Passo 1.`;
    presentListEl.style.display = "block";
  }

  // Populate Step 2 Table
  absenceTableBody.innerHTML = "";
  if (wizardSelectedAbsent.length === 0) {
    absenceTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nessuna persona assente selezionata al Passo 1: come indicato sopra, tutti i cadetti saranno schedulati come presenti tutta la settimana. Clicca su Genera Calendario per completare.</td></tr>`;
    return;
  }

  wizardSelectedAbsent.forEach(p => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-person-id", p.id);
    
    let daysHTML = "";
    WIZARD_DAYS.forEach(day => {
      // Unchecked by default (absent); spunta solo i giorni in cui è presente
      daysHTML += `<td><input type="checkbox" data-day="${day}"></td>`;
    });

    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      ${daysHTML}
    `;
    absenceTableBody.appendChild(tr);
  });
}

function goBackToStep1() {
  genStepDetails.classList.remove("active");
  genStepAbsent.classList.add("active");
}

// CALENDAR GENERATION SCHEDULER ALGORITHM
function generateCalendar() {
  const newCalendar = createBlankCalendar();

  // Gather absence data. Step 2's checkboxes mark PRESENCE days (checked =
  // present), so a person's absent days are whichever of the 7 are NOT checked.
  const absences = {}; // { personId: [absentDays] }

  if (wizardSelectedAbsent.length > 0) {
    const rows = absenceTableBody.querySelectorAll("tr[data-person-id]");
    rows.forEach(row => {
      const pId = row.getAttribute("data-person-id");
      const presentBoxes = row.querySelectorAll('input[type="checkbox"]:checked');
      const presentDays = new Set(Array.from(presentBoxes).map(box => box.getAttribute("data-day").toLowerCase()));
      absences[pId] = WIZARD_DAYS.filter(d => !presentDays.has(d));
    });
  }

  // Filter people into rosters
  // Fully present, partially present, and fully absent
  const fullyPresentCadets = [];
  const partiallyAbsentCadets = []; // { person, absentDays, presentDays }
  const excludedCadets = []; // Fully absent (absent all 7 days)

  // Admins also take part in the chore rotation (except the default ADMIN login)
  const cadets = getSchedulablePeople();

  cadets.forEach(p => {
    const personAbsences = absences[p.id] || [];
    if (personAbsences.length === 7) {
      excludedCadets.push(p);
    } else if (personAbsences.length > 0) {
      const presentDays = WIZARD_DAYS.filter(d => !personAbsences.includes(d));
      partiallyAbsentCadets.push({
        person: p,
        absentDays: personAbsences,
        presentDays: presentDays
      });
    } else {
      fullyPresentCadets.push(p);
    }
  });

  const activeCadets = [...fullyPresentCadets, ...partiallyAbsentCadets.map(item => item.person)];

  if (activeCadets.length === 0) {
    alert("Errore: Tutte le persone sono assenti per l'intera settimana! Impossibile generare il calendario.");
    return;
  }

  // Helper to check if a cadet is present on a given day (Italian day names)
  function isCadetPresent(cadet, dayName) {
    const pId = cadet.id;
    const cadetAbsences = absences[pId] || [];
    return !cadetAbsences.includes(dayName.toLowerCase());
  }

  // Helper to get present cadets on a given day
  function getPresentCadetsForDay(dayName) {
    return activeCadets.filter(c => isCadetPresent(c, dayName));
  }

  // Map to store load counts per day to balance work fairly
  // loadCounts = { cadetId: totalTasksAssigned }
  const loadCounts = {};
  activeCadets.forEach(c => { loadCounts[c.id] = 0; });

  // 1. GENERATE WEEKLY TASKS CALENDAR
  // Sort tasks by priority
  const sortedTasks = [...state.tasks].sort((a, b) => a.priority - b.priority);

  // Track how many times each person has done each specific task this week,
  // so the same task doesn't land on the same one or two people every day.
  const taskAssignmentCounts = {};
  sortedTasks.forEach(t => {
    taskAssignmentCounts[t.id] = {};
    activeCadets.forEach(c => { taskAssignmentCounts[t.id][c.id] = 0; });
  });

  DAYS_OF_WEEK.forEach(day => {
    newCalendar.weekly[day] = [];
    const dailyRoster = getPresentCadetsForDay(day);

    if (dailyRoster.length === 0) {
      return; // No one present on this day
    }

    // Track assigned people on this day to avoid assigning same person to same/multiple tasks on same day if avoidable
    const dailyAssignedIds = new Set();

    // Tasks sharing the same priority are treated as happening "at once", so
    // the same person can't be put on two of them the same day. Tracked per
    // priority value, reset each day.
    const dailyAssignedByPriority = {};

    // Separate primary tasks and connected tasks
    // Connected tasks copy assignees from their parent task
    sortedTasks.forEach(task => {
      // If it's a connected task, skip direct assignment
      if (task.linkedTask !== "none") return;

      if (!dailyAssignedByPriority[task.priority]) {
        dailyAssignedByPriority[task.priority] = new Set();
      }
      const usedForThisPriority = dailyAssignedByPriority[task.priority];

      const linkedChildrenForMinP = sortedTasks.filter(t => t.linkedTask === task.id);
      const minP = task.minPeople;
      const assignedCadets = [];

      // Select minP people from dailyRoster, prioritizing those with least daily assignments and overall load
      for (let i = 0; i < minP; i++) {
        // Filter out people already assigned to THIS task, and (hard rule)
        // anyone already assigned today to another task with the same
        // priority - unless that leaves nobody to pick, in which case the
        // rule is relaxed rather than leaving the task unfilled.
        let candidates = dailyRoster.filter(c => !assignedCadets.includes(c) && !usedForThisPriority.has(c.id));
        if (candidates.length === 0) {
          candidates = dailyRoster.filter(c => !assignedCadets.includes(c));
        }

        if (candidates.length === 0) break;

        // Sort candidates:
        // 1. Not already assigned to ANY task today (to spread daily work)
        // 2. Least times already assigned to THIS specific task this week (variety)
        // 3. Least overall load counts (fairness tie-breaker)
        candidates.sort((a, b) => {
          const aToday = dailyAssignedIds.has(a.id) ? 1 : 0;
          const bToday = dailyAssignedIds.has(b.id) ? 1 : 0;
          if (aToday !== bToday) return aToday - bToday;

          const aTaskCount = taskAssignmentCounts[task.id][a.id];
          const bTaskCount = taskAssignmentCounts[task.id][b.id];
          if (aTaskCount !== bTaskCount) return aTaskCount - bTaskCount;

          return loadCounts[a.id] - loadCounts[b.id];
        });

        const selected = candidates[0];
        assignedCadets.push(selected);
        dailyAssignedIds.add(selected.id);
        usedForThisPriority.add(selected.id);
        taskAssignmentCounts[task.id][selected.id]++;
        loadCounts[selected.id]++;
      }

      // Add task instance to calendar day
      newCalendar.weekly[day].push({
        taskId: task.id,
        name: task.name,
        assigned: assignedCadets.map(c => c.name)
      });

      // Assign a linked task's own required number of people, reusing as many
      // of the parent's assignees as possible (same people doing related
      // chores). If the linked task needs fewer people, it gets a subset of
      // the parent's group. If it needs more, extra people are picked the
      // same way the parent's were.
      linkedChildrenForMinP.forEach(child => {
        const childAssigned = assignedCadets.slice(0, child.minPeople);

        while (childAssigned.length < child.minPeople) {
          const candidates = dailyRoster.filter(c => !childAssigned.includes(c));
          if (candidates.length === 0) break;

          candidates.sort((a, b) => {
            const aToday = dailyAssignedIds.has(a.id) ? 1 : 0;
            const bToday = dailyAssignedIds.has(b.id) ? 1 : 0;
            if (aToday !== bToday) return aToday - bToday;
            return loadCounts[a.id] - loadCounts[b.id];
          });

          const selected = candidates[0];
          childAssigned.push(selected);
          dailyAssignedIds.add(selected.id);
        }

        // Everyone actually doing this linked task picks up extra load for it
        childAssigned.forEach(c => { loadCounts[c.id]++; });

        newCalendar.weekly[day].push({
          taskId: child.id,
          name: child.name,
          assigned: childAssigned.map(c => c.name)
        });
      });

    });
  });

  // 2. METER READING (LETTURA CONTATORI)
  // Assigned to a person present for the whole week (fullyPresentCadets) or longest time
  let meterCandidate = null;
  if (fullyPresentCadets.length > 0) {
    // Pick the one with the lowest total load
    fullyPresentCadets.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
    meterCandidate = fullyPresentCadets[0];
  } else {
    // Sort partially present cadets by number of present days descending, then load ascending
    const sortedPartials = [...partiallyAbsentCadets].sort((a, b) => {
      if (a.presentDays.length !== b.presentDays.length) {
        return b.presentDays.length - a.presentDays.length;
      }
      return loadCounts[a.person.id] - loadCounts[b.person.id];
    });
    meterCandidate = sortedPartials[0]?.person || activeCadets[0];
  }

  if (meterCandidate) {
    newCalendar.meterAssignee = meterCandidate.name;
    loadCounts[meterCandidate.id] += 2; // Reading meters carries some weight
  }

  // 3. HOUSE CLEANING (PULIZIA CASA)
  // A zone is assigned to primary people for the whole week, so only cadets
  // present every single day are eligible as primary assignees. Cadets present
  // only part of the week are added as "helpers" instead (see below), never as
  // primaries, since they can't cover the zone the days they're away.
  // Sort zones by priority, like tasks.
  const zones = [...state.houseParts].sort((a, b) => a.priority - b.priority);

  // Pool of candidates eligible to be primary assignees: fully present cadets only.
  // If nobody is fully present this week, fall back to all active cadets (degenerate case).
  // The meter reader is not excluded outright (that was too rigid and could dump all
  // zone cleaning on a single other person) - their +2 load from the meter reading
  // already makes them a lower priority pick, which is enough of a soft deterrent.
  const zonePrimaryPool = fullyPresentCadets.length > 0 ? fullyPresentCadets : activeCadets;

  zones.forEach(zone => {
    const assignedCadets = [];
    const minP = (typeof zone.minPeople === "number" && zone.minPeople > 0) ? zone.minPeople : 1;

    for (let i = 0; i < minP; i++) {
      const candidates = zonePrimaryPool.filter(c => !assignedCadets.includes(c));
      if (candidates.length === 0) break;

      candidates.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
      const selected = candidates[0];
      assignedCadets.push(selected);
      loadCounts[selected.id] += 3; // House cleaning carries more weight
    }

    newCalendar.houseCleaning[zone.id] = {
      assigned: assignedCadets.map(c => c.name),
      helpers: []
    };
  });

  // Distribute partially absent cadets as helpers to the house cleaning zones.
  // We want to add them as helpers specifically when they are present.
  if (zones.length > 0) {
    partiallyAbsentCadets.forEach((item, idx) => {
      // Map to a cleaning zone (rotate round-robin style)
      const targetZone = zones[idx % zones.length];

      newCalendar.houseCleaning[targetZone.id].helpers.push({
        name: item.person.name,
        days: item.presentDays.map(d => d.slice(0, 3)) // short names e.g., lun, mar
      });
    });
  }

  // 4. EVENING CHECK (CONTROLLO SERALE)
  // Assign one person per day from Friday to Thursday. Track the day each
  // person last did the evening check so the same person can't be picked on
  // consecutive days (the previous version only nudged loadCounts by 0.5,
  // too small to stop someone with an otherwise-low load from being reused
  // for several days in a row).
  const eveningLastAssignedDayIndex = {};
  activeCadets.forEach(c => { eveningLastAssignedDayIndex[c.id] = -Infinity; });
  const eveningLoadCounts = {};
  activeCadets.forEach(c => { eveningLoadCounts[c.id] = 0; });
  const MIN_EVENING_GAP = 2; // must skip at least one day before repeating

  DAYS_OF_WEEK.forEach((day, dayIndex) => {
    const dailyRoster = getPresentCadetsForDay(day);
    if (dailyRoster.length === 0) return;

    let candidates = dailyRoster.filter(c => (dayIndex - eveningLastAssignedDayIndex[c.id]) >= MIN_EVENING_GAP);
    if (candidates.length === 0) {
      // Fallback: too few people present to enforce the gap; pick whoever
      // went longest without doing the evening check.
      dailyRoster.sort((a, b) => eveningLastAssignedDayIndex[a.id] - eveningLastAssignedDayIndex[b.id]);
      candidates = [dailyRoster[0]];
    }

    candidates.sort((a, b) => eveningLoadCounts[a.id] - eveningLoadCounts[b.id]);
    const selected = candidates[0];

    newCalendar.eveningCheck[day] = selected.name;
    eveningLoadCounts[selected.id]++;
    loadCounts[selected.id] += 1;
    eveningLastAssignedDayIndex[selected.id] = dayIndex;
  });

  // 5. LAUNDRY TABLE (LAVANDERIA)
  // Rotate assignments for morning/afternoon shifts.
  // Rule: Laundry table must not repeat names before 2 days or 4 shifts.
  // There are 14 shifts sequentially: (Fri-M, Fri-P, Sat-M, Sat-P, Sun-M, Sun-P, Mon-M, Mon-P, Tue-M, Tue-P, Wed-M, Wed-P, Thur-M, Thur-P)
  const shiftList = [];
  DAYS_OF_WEEK.forEach(day => {
    shiftList.push({ day, shift: "mattina" });
    shiftList.push({ day, shift: "pomeriggio" });
  });

  // Track the global shift index (0..13) at which each person was last assigned,
  // so the "at least 2 days / 4 shifts apart" rule is enforced exactly regardless
  // of skipped shifts (days with nobody present).
  const lastAssignedShiftIndex = {};
  activeCadets.forEach(c => { lastAssignedShiftIndex[c.id] = -Infinity; });

  const laundryLoadCounts = {};
  activeCadets.forEach(c => { laundryLoadCounts[c.id] = 0; });

  const MIN_SHIFT_GAP = 4; // 4 shifts = 2 days (mattina + pomeriggio per day)
  const MAX_SHIFTS_PER_PERSON = 2; // nobody can have more than 2 laundry shifts this week

  shiftList.forEach((shiftObj, index) => {
    const dailyRoster = getPresentCadetsForDay(shiftObj.day);
    if (dailyRoster.length === 0) return; // Leave the shift empty: nobody present

    // Only consider people who have gone at least MIN_SHIFT_GAP shifts without laundry duty
    // and who haven't already hit the max of MAX_SHIFTS_PER_PERSON shifts this week.
    // Both rules are strict: if nobody qualifies, the shift is left unassigned rather than
    // handing it to someone who shouldn't get it.
    const candidates = dailyRoster.filter(c =>
      (index - lastAssignedShiftIndex[c.id]) >= MIN_SHIFT_GAP &&
      laundryLoadCounts[c.id] < MAX_SHIFTS_PER_PERSON
    );
    if (candidates.length === 0) return; // Leave the shift empty: rules can't be satisfied

    // Among candidates, pick the one with the lowest laundry load to balance shifts fairly
    candidates.sort((a, b) => laundryLoadCounts[a.id] - laundryLoadCounts[b.id]);
    const selected = candidates[0];

    // Assign
    newCalendar.laundry[shiftObj.shift][shiftObj.day] = selected.name;
    laundryLoadCounts[selected.id]++;
    loadCounts[selected.id] += 1;
    lastAssignedShiftIndex[selected.id] = index;
  });

  // Save to State and LocalStorage
  state.calendar = newCalendar;
  persistState("calendar", newCalendar);

  // Render Visualizzazione Tab and Switch
  renderCalendar();
  switchTab("tab-visualizzazione");
  alert("Calendario generato con successo!");
}

// UTILITY FUNCTIONS
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// INITIALIZE APP ON LOAD
window.addEventListener("DOMContentLoaded", init);

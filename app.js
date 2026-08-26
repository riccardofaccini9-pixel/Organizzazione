// STATE MANAGEMENT
let state = {
  currentUser: null,
  people: [],
  tasks: [],
  houseParts: [],
  calendar: null,
  isUnlocked: false,
  settembreAspiranti: [],
  settembreTasks: [],
  settembreHouseParts: [],
  settembreEsterniParts: [],
  settembreCalendar: null,
  isSettembreUnlocked: false
};

// Track whether the task/person/house-part modal is in "add" or "edit" mode
let editingTaskId = null;
let editingPersonId = null;
let editingHousePartId = null;
let editingSettembreTaskId = null;
let editingSettembreHousePartId = null;
let editingSettembreEsterniPartId = null;

// Default seed data (used when no data exists yet) now lives server-side in
// db.py, so the server always returns real data - no client-side seeding.

const DAYS_OF_WEEK = ["venerdì", "sabato", "domenica", "lunedì", "martedì", "mercoledì", "giovedì"];
const WIZARD_DAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

// SETTEMBRE: fixed weekly shower-shift grid (never changes - only the names
// behind each slot, in state.settembreAspiranti, are editable). Uses the
// same Lun->Dom order as WIZARD_DAYS.
const SHOWER_TIMES = { mattina: "7:05 - 7:30", pomeriggio: "13:30 - 13:55", sera: "18:35 - 19:00" };
// 4 uomini (U) + 1 donna (F) per turno, riempiti progressivamente da U1/F1
// in avanti (con "giro" quando si supera U13/F3) seguendo l'ordine
// mattina->pomeriggio->sera, lunedì->domenica.
const SHOWER_SCHEDULE = {
  mattina: {
    lunedì: ["u1", "u2", "u3", "u4", "f1"], martedì: ["u5", "u6", "u7", "u8", "f2"], mercoledì: ["u9", "u10", "u11", "u12", "f3"],
    giovedì: ["u13", "u1", "u2", "u3", "f1"], venerdì: ["u4", "u5", "u6", "u7", "f2"], sabato: ["u8", "u9", "u10", "u11", "f3"], domenica: ["u12", "u13", "u1", "u2", "f1"]
  },
  pomeriggio: {
    lunedì: ["u3", "u4", "u5", "u6", "f2"], martedì: ["u7", "u8", "u9", "u10", "f3"], mercoledì: ["u11", "u12", "u13", "u1", "f1"],
    giovedì: ["u2", "u3", "u4", "u5", "f2"], venerdì: ["u6", "u7", "u8", "u9", "f3"], sabato: ["u10", "u11", "u12", "u13", "f1"], domenica: ["u1", "u2", "u3", "u4", "f2"]
  },
  sera: {
    lunedì: ["u5", "u6", "u7", "u8", "f3"], martedì: ["u9", "u10", "u11", "u12", "f1"], mercoledì: ["u13", "u1", "u2", "u3", "f2"],
    giovedì: ["u4", "u5", "u6", "u7", "f3"], venerdì: ["u8", "u9", "u10", "u11", "f1"], sabato: ["u12", "u13", "u1", "u2", "f2"], domenica: ["u3", "u4", "u5", "u6", "f3"]
  }
};

// SETTEMBRE: internal-only time windows (never shown anywhere in the UI,
// unlike SHOWER_TIMES) used purely so the generator doesn't assign someone
// to a kitchen duty while they're scheduled for a shower. Matched by exact
// task name (case-insensitive) - if no task with that name exists, this
// simply never triggers. "Cucina"/"Aiuto Cucina" cook both lunch and
// dinner, so each carries both meal windows - a conflict with either counts.
const MEAL_PREP_TIME_WINDOWS = [
  { start: "11:45", end: "12:50" }, // cucina pranzo
  { start: "18:30", end: "19:20" }  // cucina cena
];
const SETTEMBRE_TASK_TIME_WINDOWS = {
  "cucina": MEAL_PREP_TIME_WINDOWS,
  "aiuto cucina": MEAL_PREP_TIME_WINDOWS
};
// Zone di Pulizia ("Pulizia Casa"/"Pulizia Esterni") aren't per-day tasks -
// their primary assignees clean every day of the week - so this is checked
// against every day's shower schedule rather than a single day.
const ZONE_CLEANING_TIME_WINDOW = { start: "8:30", end: "9:00" };

// SETTEMBRE: washing machine shifts - 3 per day, aspiranti only, one per
// person per week (the rest default to "Bucato Comune").
const LAVATRICI_TURNI = ["turno1", "turno2", "turno3"];
const LAVATRICI_TIMES = {
  turno1: { label: "Turno 1", start: "9:00", end: "10:30" },
  turno2: { label: "Turno 2", start: "10:45", end: "12:15" },
  turno3: { label: "Turno 3", start: "15:00", end: "16:30" }
};
const LAVATRICI_BUCATO_COMUNE = "Bucato Comune";
const LAVATRICI_RECUPERO = "Recupero";

function parseTimeToMinutes(t) {
  const [h, m] = t.trim().split(":").map(Number);
  return h * 60 + m;
}

function timeRangesOverlap(startA, endA, startB, endB) {
  return parseTimeToMinutes(startA) < parseTimeToMinutes(endB) && parseTimeToMinutes(startB) < parseTimeToMinutes(endA);
}

// Which shower time range(s), if any, a given aspirante slot id (e.g. "u1")
// falls into on a given day, per the fixed SHOWER_SCHEDULE.
function getShowerRangesForCandidateOnDay(candidateId, day) {
  const ranges = [];
  ["mattina", "pomeriggio", "sera"].forEach(shift => {
    const slots = (SHOWER_SCHEDULE[shift] && SHOWER_SCHEDULE[shift][day]) || [];
    if (slots.includes(candidateId)) {
      const [start, end] = SHOWER_TIMES[shift].split(" - ");
      ranges.push({ start, end });
    }
  });
  return ranges;
}

function isCandidateShoweringDuring(candidateId, day, windowStart, windowEnd) {
  return getShowerRangesForCandidateOnDay(candidateId, day).some(r => timeRangesOverlap(r.start, r.end, windowStart, windowEnd));
}

// windows can be a single {start,end} or an array of them (e.g. lunch+dinner) -
// a conflict with any one of them counts.
function isCandidateShoweringDuringAny(candidateId, day, windows) {
  const list = Array.isArray(windows) ? windows : [windows];
  return list.some(w => isCandidateShoweringDuring(candidateId, day, w.start, w.end));
}

function hasAnyShowerOverlapWithWindow(candidateId, windowStart, windowEnd) {
  return WIZARD_DAYS.some(day => isCandidateShoweringDuring(candidateId, day, windowStart, windowEnd));
}

function hasAnyShowerOverlapWithAnyWindow(candidateId, windows) {
  const list = Array.isArray(windows) ? windows : [windows];
  return WIZARD_DAYS.some(day => isCandidateShoweringDuringAny(candidateId, day, list));
}

// WIZARD STATE
let wizardSelectedAbsent = [];
let wizardSettembreSelectedAbsent = [];

// DOM ELEMENTS
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginSubmitBtn = document.getElementById("login-submit-btn");
const loginAspiranteBtn = document.getElementById("login-aspirante-btn");
const loginError = document.getElementById("login-error");
const loginConnectionWarning = document.getElementById("login-connection-warning");

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
const taskExclusiveInput = document.getElementById("task-exclusive");
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

// "Cosa faccio oggi?" search
const searchPersonInput = document.getElementById("search-person-input");
const searchDayInput = document.getElementById("search-day-input");
const searchTodayResults = document.getElementById("search-today-results");
const calendarFullView = document.getElementById("calendar-full-view");

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

// BACKEND API (shared server storage, so every device sees the same data)
const API_BASE = "/api";

function persistState(key, value) {
  fetch(`${API_BASE}/state/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  }).catch(err => console.error(`Errore salvataggio "${key}" sul server:`, err));
}

// How often to re-poll the server for changes made from other devices/tabs,
// to approximate the live-sync behaviour Firestore's onSnapshot used to give.
const POLL_INTERVAL_MS = 5000;

let appBootstrapped = false;
let hadLoadError = false;

// Shared handler for state-load errors (e.g. blocked/unreachable network):
// surfaces a visible warning instead of failing silently, and - if the app
// hasn't finished its initial bootstrap yet - unblocks the login button
// anyway rather than leaving it stuck on "Caricamento..." forever.
function handleLoadError(err) {
  console.error("Errore lettura stato dal server:", err);
  hadLoadError = true;
  loginConnectionWarning.style.display = "block";
  if (!appBootstrapped) {
    completeBootstrap();
  }
}

function completeBootstrap() {
  if (appBootstrapped) return;
  appBootstrapped = true;
  loginSubmitBtn.disabled = false;
  loginSubmitBtn.textContent = "Accedi";
  if (!hadLoadError) {
    loginConnectionWarning.style.display = "none";
  }

  // Embedding contexts (e.g. an iframe loaded with ?embed=aspirante) force
  // the read-only aspirante view regardless of any admin session already
  // stored for this browser tab, and never touch sessionStorage themselves -
  // so an admin session open in another iframe of the same tab is never
  // read from or disturbed by this.
  const embedMode = new URLSearchParams(location.search).get("embed");
  if (embedMode === "aspirante") {
    const aspiranteUser = state.people.find(p => p.email.trim().toLowerCase() === "aspirante@settembre.local");
    if (aspiranteUser) {
      state.currentUser = aspiranteUser;
      showApp();
      // Belt-and-suspenders on top of the existing admin-only/aspirante-hide
      // role classes: guarantee the sidebar (nav, "Genera calendario",
      // logout, etc.) and both lock-to-edit buttons are gone in embed mode,
      // regardless of any gap in that role logic, so this view can never be
      // used to make edits.
      document.querySelectorAll(".sidebar, .lock-toggle-btn").forEach(el => el.style.display = "none");
      return;
    }
  }

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
  // Gestione Aspiranti has no lock/unlock like the calendars - its name
  // inputs are always live-editable - so the same polling-clobber problem
  // applies here too: rebuilding the table mid-edit would wipe out
  // whatever the admin is currently typing. Skip the rebuild while focus
  // is inside one of its inputs; it resumes on the next tick once they
  // click away or hit Salva Nomi (which re-populates immediately anyway).
  if (!document.activeElement || !document.activeElement.closest("#settembre-aspiranti-table-body")) {
    populateSettembreAspirantiTable();
  }
  populateSettembreTasksTable();
  updateSettembreLinkedTasksDropdown();
  populateSettembreHousePartsTable();
  populateSettembreEsterniPartsTable();
  if (!state.calendar) {
    state.calendar = createBlankCalendar();
  }
  if (!state.settembreCalendar) {
    state.settembreCalendar = createBlankSettembreCalendar();
  }
  // While a calendar is unlocked for direct editing, every poll tick
  // (every POLL_INTERVAL_MS, whether or not anything actually changed
  // remotely) would otherwise rebuild the day/zone <input> elements from
  // scratch - kicking the admin's cursor out of whatever field they're
  // typing in and discarding the unsaved keystrokes. Skip re-rendering each
  // calendar until it's locked again (toggleLock/toggleSettembreLock
  // already re-render once editing is saved), so in-progress edits are
  // never clobbered.
  if (!state.isUnlocked) {
    renderCalendar();
  }
  if (!state.isSettembreUnlocked) {
    renderSettembreCalendar();
  }
}

function applyServerState(data) {
  state.people = data.people;
  state.tasks = data.tasks;
  // Migrate zones saved before minPeople/priority existed, so stale data
  // doesn't silently break assignment (a missing minPeople stops the
  // assignment loop from ever running).
  state.houseParts = (data.houseParts || []).map(zone => ({
    id: zone.id,
    name: zone.name,
    minPeople: (typeof zone.minPeople === "number" && zone.minPeople > 0) ? zone.minPeople : 1,
    priority: (typeof zone.priority === "number") ? zone.priority : 999
  }));
  state.calendar = data.calendar || null;
  state.settembreAspiranti = data.settembreAspiranti || [];
  state.settembreTasks = data.settembreTasks || [];
  state.settembreHouseParts = (data.settembreHouseParts || []).map(zone => ({
    id: zone.id,
    name: zone.name,
    minPeople: (typeof zone.minPeople === "number" && zone.minPeople > 0) ? zone.minPeople : 1,
    priority: (typeof zone.priority === "number") ? zone.priority : 999
  }));
  state.settembreEsterniParts = (data.settembreEsterniParts || []).map(zone => ({
    id: zone.id,
    name: zone.name,
    minPeople: (typeof zone.minPeople === "number" && zone.minPeople > 0) ? zone.minPeople : 1,
    priority: (typeof zone.priority === "number") ? zone.priority : 999
  }));
  state.settembreCalendar = data.settembreCalendar || null;
}

async function pollServerState() {
  try {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    applyServerState(data);
    if (!appBootstrapped) {
      completeBootstrap();
    } else {
      refreshLiveUI();
    }
  } catch (err) {
    handleLoadError(err);
  }
}

function startPolling() {
  pollServerState();
  setInterval(pollServerState, POLL_INTERVAL_MS);
}

// INITIAL SETUP
function init() {
  // Disabled until the initial data has arrived from the server, so a login
  // attempt during that brief window can't be wrongly rejected
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = "Caricamento...";

  startPolling();

  // Safety net: if the server never responds at all (success or error -
  // e.g. a network that silently blocks the connection), don't leave the
  // login button stuck on "Caricamento..." forever. This only unblocks the
  // login UI and shows a warning - it must NEVER fabricate placeholder data
  // into state.people/tasks/houseParts, because if the connection was
  // merely slow (not actually dead) and the real response arrives
  // afterward, any save made in between (e.g. generating a calendar,
  // editing a person) would persist those fake defaults to the server and
  // clobber real data.
  setTimeout(() => {
    if (appBootstrapped) return;
    hadLoadError = true;
    loginConnectionWarning.style.display = "block";
    completeBootstrap();
  }, 8000);

  // Bind Events
  loginSubmitBtn.addEventListener("click", handleLogin);
  loginAspiranteBtn.addEventListener("click", handleAspiranteLogin);
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

  // SETTEMBRE: Lock Toggle
  document.getElementById("lock-toggle-btn-settembre").addEventListener("click", toggleSettembreLock);

  // SETTEMBRE: Gestione Aspiranti
  document.getElementById("save-settembre-aspiranti-btn").addEventListener("click", saveSettembreAspiranti);

  // SETTEMBRE: Mansioni Modal Buttons
  document.getElementById("add-settembre-task-btn").addEventListener("click", () => openAddSettembreTaskModal());
  document.getElementById("close-modal-settembre-task-btn").addEventListener("click", () => closeModal(document.getElementById("modal-settembre-task")));
  document.getElementById("save-settembre-task-btn").addEventListener("click", saveSettembreTask);

  // SETTEMBRE: Zone di Pulizia Modal Buttons
  document.getElementById("add-settembre-house-part-btn").addEventListener("click", () => openAddSettembreHousePartModal());
  document.getElementById("close-modal-settembre-house-part-btn").addEventListener("click", () => closeModal(document.getElementById("modal-settembre-house-part")));
  document.getElementById("save-settembre-house-part-btn").addEventListener("click", saveSettembreHousePart);

  // SETTEMBRE: Pulizia Esterni Modal Buttons
  document.getElementById("add-settembre-esterni-part-btn").addEventListener("click", () => openAddSettembreEsterniPartModal());
  document.getElementById("close-modal-settembre-esterni-part-btn").addEventListener("click", () => closeModal(document.getElementById("modal-settembre-esterni-part")));
  document.getElementById("save-settembre-esterni-part-btn").addEventListener("click", saveSettembreEsterniPart);

  // SETTEMBRE: Wizard Buttons
  document.getElementById("start-wizard-btn-settembre").addEventListener("click", startSettembreWizard);
  document.getElementById("confirm-absent-btn-settembre").addEventListener("click", goToStep2Settembre);
  document.getElementById("back-to-step1-btn-settembre").addEventListener("click", goBackToStep1Settembre);
  document.getElementById("generate-final-btn-settembre").addEventListener("click", generateSettembreCalendar);
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
  const password = loginPasswordInput.value.trim();

  // Trim the stored password too: a stray space accidentally saved via the
  // Gestione Persone form (easy to introduce on mobile keyboards) shouldn't
  // permanently lock someone out.
  const foundUser = state.people.find(
    p => p.email.trim().toLowerCase() === email && p.password.trim() === password
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

// One-click shortcut for the shared, passwordless "aspirante" viewer
// account: fills in its known credentials and logs in immediately, so the
// 16 aspiranti don't need to type/remember an email address.
function handleAspiranteLogin() {
  loginEmailInput.value = "aspirante@settembre.local";
  loginPasswordInput.value = "";
  handleLogin();
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
  populateSettembreAspirantiTable();
  populateSettembreTasksTable();
  updateSettembreLinkedTasksDropdown();
  populateSettembreHousePartsTable();
  populateSettembreEsterniPartsTable();

  if (state.calendar) {
    renderCalendar();
  } else {
    // Generate an initial blank calendar structures if none exists
    state.calendar = createBlankCalendar();
    renderCalendar();
  }

  if (state.settembreCalendar) {
    renderSettembreCalendar();
  } else {
    state.settembreCalendar = createBlankSettembreCalendar();
    renderSettembreCalendar();
  }

  // The aspirante viewer account only ever sees the Settembre tab
  switchTab(state.currentUser.role === "aspirante" ? "tab-settembre" : "tab-visualizzazione");
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

  // If entering a wizard tab/section, reset to start screen
  if (tabId === "tab-generazione") {
    resetWizard();
  }
  if (tabId === "tab-genera-settembre") {
    resetSettembreWizard();
  }

  updateNavContextVisibility();
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
  taskExclusiveInput.checked = false;
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
  taskExclusiveInput.checked = !!task.exclusive;
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
  const exclusive = taskExclusiveInput.checked;

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
    task.exclusive = exclusive;
  } else {
    state.tasks.push({
      id: "task-" + Date.now(),
      name,
      minPeople,
      priority,
      linkedTask,
      description,
      exclusive
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
      <td><strong>${escapeHtml(t.name)}</strong>${t.exclusive ? ' <span class="badge badge-admin" title="Chi la svolge non fa altro lo stesso giorno">Esclusiva</span>' : ''}</td>
      <td>${t.minPeople}</td>
      <td>${t.priority}</td>
      <td><span style="color: var(--accent-color);">${escapeHtml(linkedName)}</span></td>
      ${state.currentUser.role === 'admin' ? `<td style="text-align: center; white-space: nowrap;">${actionBtns}</td>` : ''}
    `;
    tasksTableBody.appendChild(tr);
  });
}

// SETTEMBRE TASKS (own list, unrelated to the original scheda's tasks;
// admin-only panel, so action buttons are always shown unconditionally).
function updateSettembreLinkedTasksDropdown() {
  const sel = document.getElementById("settembre-task-linked");
  if (!sel) return;
  sel.innerHTML = '<option value="none">Nessuna</option>';
  state.settembreTasks.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
}

function openAddSettembreTaskModal() {
  editingSettembreTaskId = null;
  document.getElementById("modal-settembre-task-header").textContent = "Aggiungi Mansione Settembre";
  document.getElementById("settembre-task-name").value = "";
  document.getElementById("settembre-task-min-people").value = "1";
  document.getElementById("settembre-task-priority").value = "";
  document.getElementById("settembre-task-target").value = "aspiranti";
  document.getElementById("settembre-task-exclusive").checked = false;
  updateSettembreLinkedTasksDropdown();
  document.getElementById("settembre-task-linked").value = "none";
  openModal(document.getElementById("modal-settembre-task"));
}

function editSettembreTask(id) {
  const task = state.settembreTasks.find(t => t.id === id);
  if (!task) return;

  editingSettembreTaskId = id;
  document.getElementById("modal-settembre-task-header").textContent = "Modifica Mansione Settembre";
  document.getElementById("settembre-task-name").value = task.name;
  document.getElementById("settembre-task-min-people").value = task.minPeople;
  document.getElementById("settembre-task-priority").value = task.priority;
  document.getElementById("settembre-task-target").value = task.target;
  document.getElementById("settembre-task-exclusive").checked = !!task.exclusive;
  updateSettembreLinkedTasksDropdown();
  document.getElementById("settembre-task-linked").value = task.linkedTask;
  openModal(document.getElementById("modal-settembre-task"));
}

function saveSettembreTask() {
  const name = document.getElementById("settembre-task-name").value.trim();
  const minPeople = parseInt(document.getElementById("settembre-task-min-people").value) || 1;
  const rawPriority = document.getElementById("settembre-task-priority").value.trim();
  const target = document.getElementById("settembre-task-target").value;
  const linkedTask = document.getElementById("settembre-task-linked").value;
  const exclusive = document.getElementById("settembre-task-exclusive").checked;

  if (!name) {
    alert("Inserire il nome della mansione!");
    return;
  }

  let priority = 999;
  if (rawPriority !== "" && !isNaN(rawPriority)) {
    priority = parseInt(rawPriority);
  }

  if (editingSettembreTaskId) {
    const task = state.settembreTasks.find(t => t.id === editingSettembreTaskId);
    task.name = name;
    task.minPeople = minPeople;
    task.priority = priority;
    task.linkedTask = linkedTask === editingSettembreTaskId ? "none" : linkedTask;
    task.target = target;
    task.exclusive = exclusive;
  } else {
    state.settembreTasks.push({
      id: "settembre-task-" + Date.now(),
      name,
      minPeople,
      priority,
      linkedTask,
      target,
      exclusive
    });
  }

  persistState("settembreTasks", state.settembreTasks);
  editingSettembreTaskId = null;

  closeModal(document.getElementById("modal-settembre-task"));
  populateSettembreTasksTable();
  updateSettembreLinkedTasksDropdown();
  renderSettembreCalendar();
}

function deleteSettembreTask(id) {
  state.settembreTasks = state.settembreTasks.filter(t => t.id !== id);
  state.settembreTasks.forEach(t => {
    if (t.linkedTask === id) {
      t.linkedTask = "none";
    }
  });
  persistState("settembreTasks", state.settembreTasks);
  populateSettembreTasksTable();
  updateSettembreLinkedTasksDropdown();
  renderSettembreCalendar();
}

function moveSettembreTask(id, direction) {
  const sorted = [...state.settembreTasks].sort((a, b) => a.priority - b.priority);
  const idx = sorted.findIndex(t => t.id === id);
  const targetIdx = idx + direction;
  if (idx === -1 || targetIdx < 0 || targetIdx >= sorted.length) return;

  [sorted[idx], sorted[targetIdx]] = [sorted[targetIdx], sorted[idx]];
  sorted.forEach((t, i) => { t.priority = i + 1; });

  persistState("settembreTasks", state.settembreTasks);
  populateSettembreTasksTable();
  renderSettembreCalendar();
}

function settembreTargetLabel(target) {
  if (target === "aspiranti") return "Aspiranti";
  if (target === "supervisori") return "Supervisori";
  return "Entrambi";
}

function populateSettembreTasksTable() {
  const tbody = document.getElementById("settembre-tasks-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const sorted = [...state.settembreTasks].sort((a, b) => a.priority - b.priority);

  sorted.forEach((t, idx) => {
    const linked = state.settembreTasks.find(lt => lt.id === t.linkedTask);
    const linkedName = linked ? linked.name : "Nessuna";
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><strong>${escapeHtml(t.name)}</strong>${t.exclusive ? ' <span class="badge badge-admin" title="Chi la svolge non fa altro lo stesso giorno">Esclusiva</span>' : ''}</td>
      <td>${t.minPeople}</td>
      <td>${t.priority}</td>
      <td>${settembreTargetLabel(t.target)}${linked ? ` <span style="color: var(--accent-color);">(collegata a ${escapeHtml(linkedName)})</span>` : ''}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="action-btn-edit" onclick="moveSettembreTask('${t.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Sposta su">
          <svg viewBox="0 0 24 24"><path d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"/></svg>
        </button>
        <button class="action-btn-edit" onclick="moveSettembreTask('${t.id}', 1)" ${idx === sorted.length - 1 ? 'disabled' : ''} title="Sposta giù">
          <svg viewBox="0 0 24 24"><path d="M7.41,8.59L12,13.17L16.59,8.59L18,10L12,16L6,10L7.41,8.59Z"/></svg>
        </button>
        <button class="action-btn-edit" onclick="editSettembreTask('${t.id}')" title="Modifica">
          <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
        </button>
        <button class="action-btn-danger" onclick="deleteSettembreTask('${t.id}')" title="Elimina">
          <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// SETTEMBRE HOUSE CLEANING ZONES - own list, same shape/fields as the
// original scheda's houseParts (no "target" field: like the original,
// zones are open to the whole combined roster rather than a specific pool).
function openAddSettembreHousePartModal() {
  editingSettembreHousePartId = null;
  document.getElementById("modal-settembre-house-part-header").textContent = "Aggiungi Zona di Pulizia";
  document.getElementById("settembre-house-part-name").value = "";
  document.getElementById("settembre-house-part-min-people").value = "1";
  document.getElementById("settembre-house-part-priority").value = "";
  openModal(document.getElementById("modal-settembre-house-part"));
}

function editSettembreHousePart(id) {
  const zone = state.settembreHouseParts.find(z => z.id === id);
  if (!zone) return;

  editingSettembreHousePartId = id;
  document.getElementById("modal-settembre-house-part-header").textContent = "Modifica Zona di Pulizia";
  document.getElementById("settembre-house-part-name").value = zone.name;
  document.getElementById("settembre-house-part-min-people").value = zone.minPeople;
  document.getElementById("settembre-house-part-priority").value = zone.priority;
  openModal(document.getElementById("modal-settembre-house-part"));
}

function saveSettembreHousePart() {
  const name = document.getElementById("settembre-house-part-name").value.trim();
  const minPeople = parseInt(document.getElementById("settembre-house-part-min-people").value) || 1;
  const rawPriority = document.getElementById("settembre-house-part-priority").value.trim();

  if (!name) {
    alert("Inserire il nome della zona!");
    return;
  }

  let priority = 999;
  if (rawPriority !== "" && !isNaN(rawPriority)) {
    priority = parseInt(rawPriority);
  }

  if (editingSettembreHousePartId) {
    const zone = state.settembreHouseParts.find(z => z.id === editingSettembreHousePartId);
    zone.name = name;
    zone.minPeople = minPeople;
    zone.priority = priority;
  } else {
    state.settembreHouseParts.push({ id: "settembre-hp-" + Date.now(), name, minPeople, priority });
  }

  persistState("settembreHouseParts", state.settembreHouseParts);
  editingSettembreHousePartId = null;

  closeModal(document.getElementById("modal-settembre-house-part"));
  populateSettembreHousePartsTable();
  renderSettembreCalendar();
}

function deleteSettembreHousePart(id) {
  state.settembreHouseParts = state.settembreHouseParts.filter(z => z.id !== id);
  persistState("settembreHouseParts", state.settembreHouseParts);
  populateSettembreHousePartsTable();
  renderSettembreCalendar();
}

function populateSettembreHousePartsTable() {
  const tbody = document.getElementById("settembre-house-parts-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const sorted = [...state.settembreHouseParts].sort((a, b) => a.priority - b.priority);

  sorted.forEach(zone => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(zone.name)}</strong></td>
      <td>${zone.minPeople}</td>
      <td>${zone.priority}</td>
      <td style="text-align: center;">
        <button class="action-btn-edit" onclick="editSettembreHousePart('${zone.id}')">
          <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
        </button>
        <button class="action-btn-danger" onclick="deleteSettembreHousePart('${zone.id}')">
          <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// PULIZIA ESTERNI - separate zone list mirroring Zone di Pulizia exactly
// (same fields, same aspiranti-only + shower-overlap restriction).
function openAddSettembreEsterniPartModal() {
  editingSettembreEsterniPartId = null;
  document.getElementById("modal-settembre-esterni-part-header").textContent = "Aggiungi Zona Pulizia Esterni";
  document.getElementById("settembre-esterni-part-name").value = "";
  document.getElementById("settembre-esterni-part-min-people").value = "1";
  document.getElementById("settembre-esterni-part-priority").value = "";
  openModal(document.getElementById("modal-settembre-esterni-part"));
}

function editSettembreEsterniPart(id) {
  const zone = state.settembreEsterniParts.find(z => z.id === id);
  if (!zone) return;

  editingSettembreEsterniPartId = id;
  document.getElementById("modal-settembre-esterni-part-header").textContent = "Modifica Zona Pulizia Esterni";
  document.getElementById("settembre-esterni-part-name").value = zone.name;
  document.getElementById("settembre-esterni-part-min-people").value = zone.minPeople;
  document.getElementById("settembre-esterni-part-priority").value = zone.priority;
  openModal(document.getElementById("modal-settembre-esterni-part"));
}

function saveSettembreEsterniPart() {
  const name = document.getElementById("settembre-esterni-part-name").value.trim();
  const minPeople = parseInt(document.getElementById("settembre-esterni-part-min-people").value) || 1;
  const rawPriority = document.getElementById("settembre-esterni-part-priority").value.trim();

  if (!name) {
    alert("Inserire il nome della zona!");
    return;
  }

  let priority = 999;
  if (rawPriority !== "" && !isNaN(rawPriority)) {
    priority = parseInt(rawPriority);
  }

  if (editingSettembreEsterniPartId) {
    const zone = state.settembreEsterniParts.find(z => z.id === editingSettembreEsterniPartId);
    zone.name = name;
    zone.minPeople = minPeople;
    zone.priority = priority;
  } else {
    state.settembreEsterniParts.push({ id: "settembre-esterni-" + Date.now(), name, minPeople, priority });
  }

  persistState("settembreEsterniParts", state.settembreEsterniParts);
  editingSettembreEsterniPartId = null;

  closeModal(document.getElementById("modal-settembre-esterni-part"));
  populateSettembreEsterniPartsTable();
  renderSettembreCalendar();
}

function deleteSettembreEsterniPart(id) {
  state.settembreEsterniParts = state.settembreEsterniParts.filter(z => z.id !== id);
  persistState("settembreEsterniParts", state.settembreEsterniParts);
  populateSettembreEsterniPartsTable();
  renderSettembreCalendar();
}

function populateSettembreEsterniPartsTable() {
  const tbody = document.getElementById("settembre-esterni-parts-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const sorted = [...state.settembreEsterniParts].sort((a, b) => a.priority - b.priority);

  sorted.forEach(zone => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(zone.name)}</strong></td>
      <td>${zone.minPeople}</td>
      <td>${zone.priority}</td>
      <td style="text-align: center;">
        <button class="action-btn-edit" onclick="editSettembreEsterniPart('${zone.id}')">
          <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
        </button>
        <button class="action-btn-danger" onclick="deleteSettembreEsterniPart('${zone.id}')">
          <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
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
  const password = personPasswordInput.value.trim();
  const role = personRoleSelect.value;

  // Only one "aspirante" (shared, passwordless Settembre viewer) account may
  // ever exist - block creating a second one or reassigning the role to a
  // different person.
  if (role === "aspirante" && editingPersonId !== "aspirante-default") {
    alert("Esiste già un profilo Aspirante Visualizzatore: modificalo direttamente invece di crearne un altro.");
    return;
  }

  // The aspirante account logs in without a password, so don't require one
  // when saving it.
  if (!name || !email || (role !== "aspirante" && !password)) {
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
    if (editingPersonId !== "admin-default" && editingPersonId !== "aspirante-default") {
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

  // The aspirante viewer account is confined to the Settembre tab: every
  // other nav item is hidden for it (admin/cadetto still see all of them).
  if (state.currentUser.role === "aspirante") {
    document.querySelectorAll(".aspirante-hide").forEach(el => el.style.display = "none");
  } else {
    document.querySelectorAll(".aspirante-hide").forEach(el => el.style.display = "");
  }

  updateNavContextVisibility();
}

// SETTEMBRE has its own "area" of the sidebar: entering it (tab-settembre,
// tab-aspiranti, tab-attivita-settembre) hides the original scheda's
// admin-only nav items (Genera Turni/Mansioni/Persone, tagged "main-only")
// and reveals its own (Aspiranti/Attività, tagged "settembre-only") -
// mirroring how the original scheda's admin tabs work, but scoped to
// whichever context is currently active.
const SETTEMBRE_CONTEXT_TABS = ["tab-settembre", "tab-aspiranti", "tab-attivita-settembre", "tab-genera-settembre"];

function isInSettembreContext() {
  const activeSection = document.querySelector(".tab-content.active");
  const activeId = activeSection ? activeSection.id : "tab-visualizzazione";
  return SETTEMBRE_CONTEXT_TABS.includes(activeId);
}

function updateNavContextVisibility() {
  const inSettembre = isInSettembreContext();
  const isAdmin = state.currentUser.role === "admin";

  // Re-derive visibility from scratch (role + context) rather than only
  // hiding, so switching back out of Settembre correctly restores the
  // main-only items an admin should see again.
  document.querySelectorAll(".nav-item.settembre-only").forEach(el => {
    el.style.display = (inSettembre && (!el.classList.contains("admin-only") || isAdmin)) ? "" : "none";
  });
  document.querySelectorAll(".nav-item.main-only").forEach(el => {
    el.style.display = (!inSettembre && (!el.classList.contains("admin-only") || isAdmin)) ? "" : "none";
  });
}

function deletePerson(id) {
  if (id === "admin-default") {
    alert("Impossibile cancellare l'account ADMIN predefinito!");
    return;
  }
  if (id === "aspirante-default") {
    alert("Impossibile cancellare l'account Aspirante predefinito!");
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
  // Excludes both the bootstrap ADMIN login and the shared "aspirante"
  // viewer account: neither is a real schedulable individual for the
  // original scheda.
  return state.people.filter(p => p.id !== "admin-default" && p.role !== "aspirante");
}

// SETTEMBRE: "supervisori" = existing admin/cadetto people (managed from
// Gestione Persone, not from the Settembre tab itself).
function getSettembreSupervisori() {
  return getSchedulablePeople().filter(p => p.role === "admin" || p.role === "cadetto");
}

// SETTEMBRE: combined candidate roster for the shift wizard/generator -
// supervisori (real people) plus the 16 fixed aspiranti slots, tagged with
// "kind" so target-based task eligibility ("aspiranti"/"supervisori"/
// "entrambi") can be checked uniformly.
function getSettembreRoster() {
  const supervisori = getSettembreSupervisori().map(p => ({ id: p.id, name: p.name, kind: "supervisore" }));
  const aspiranti = state.settembreAspiranti.map(a => ({ id: a.id, name: a.name, kind: "aspirante" }));
  return [...supervisori, ...aspiranti];
}

function candidateMatchesTarget(candidate, target) {
  if (target === "supervisori") return candidate.kind === "supervisore";
  if (target === "aspiranti") return candidate.kind === "aspirante";
  return true; // "entrambi"
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

// SETTEMBRE CALENDAR RENDER & DIRECT EDITING SYSTEM
function createBlankSettembreCalendar() {
  const cal = {
    meterAssignee: "",
    porchAssignee: "",
    houseCleaning: {},
    esterniCleaning: {},
    weekly: {},
    eveningCheck: {},
    lavatrici: {},
    exceptions: []
  };

  state.settembreHouseParts.forEach(zone => {
    cal.houseCleaning[zone.id] = { assigned: [], helpers: [] };
  });

  state.settembreEsterniParts.forEach(zone => {
    cal.esterniCleaning[zone.id] = { assigned: [], helpers: [] };
  });

  LAVATRICI_TURNI.forEach(turno => {
    cal.lavatrici[turno] = {};
    WIZARD_DAYS.forEach(day => { cal.lavatrici[turno][day] = ""; });
  });

  WIZARD_DAYS.forEach(day => {
    cal.weekly[day] = [];
    cal.eveningCheck[day] = { supervisore: "", aspirante: "" };
  });

  return cal;
}

// SETTEMBRE: fixed shower-shift table. Always read-only (the grid never
// changes) - resolves each slot id from SHOWER_SCHEDULE into the name
// currently behind that slot in state.settembreAspiranti.
function renderShowerTable() {
  ["mattina", "pomeriggio", "sera"].forEach(shift => {
    const labelCell = document.querySelector(`#shower-table-body tr[data-shift="${shift}"] .laundry-shift-label`);
    if (labelCell) {
      const label = shift.charAt(0).toUpperCase() + shift.slice(1);
      labelCell.innerHTML = `${label}<br><small>${escapeHtml(SHOWER_TIMES[shift])}</small>`;
    }
  });

  WIZARD_DAYS.forEach(day => {
    ["mattina", "pomeriggio", "sera"].forEach(shift => {
      const slotIds = (SHOWER_SCHEDULE[shift] && SHOWER_SCHEDULE[shift][day]) || [];
      const names = slotIds.map(slotId => {
        const aspirante = state.settembreAspiranti.find(a => a.id === slotId);
        return aspirante ? aspirante.name : slotId;
      });
      const td = document.querySelector(`#shower-table-body tr[data-shift="${shift}"] td[data-day="${day}"]`);
      if (td) td.textContent = names.join(", ") || "-";
    });
  });
}

// SETTEMBRE: admin-only roster management for the 16 fixed slots (U1-13,
// F1-3). Slot/gender never change - only the name behind each slot.
function populateSettembreAspirantiTable() {
  const tbody = document.getElementById("settembre-aspiranti-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.settembreAspiranti.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(a.slot)}</strong></td>
      <td>${a.gender === "U" ? "Maschio" : "Femmina"}</td>
      <td><input type="text" id="settembre-aspirante-name-${a.id}" class="input-field" style="padding: 6px 10px; font-size: 13px;" value="${escapeHtml(a.name)}"></td>
    `;
    tbody.appendChild(tr);
  });
}

function saveSettembreAspiranti() {
  state.settembreAspiranti.forEach(a => {
    const input = document.getElementById(`settembre-aspirante-name-${a.id}`);
    if (input) {
      a.name = input.value.trim() || a.slot;
    }
  });
  persistState("settembreAspiranti", state.settembreAspiranti);
  renderShowerTable();
  renderSettembreCalendar();
  alert("Nomi aspiranti salvati!");
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

}

// SETTEMBRE: lock/unlock direct editing (independent of the original
// scheda's isUnlocked flag) - admin-only.
function toggleSettembreLock() {
  if (state.currentUser.role !== "admin") return;

  state.isSettembreUnlocked = !state.isSettembreUnlocked;

  const lockIconClosedS = document.getElementById("lock-icon-closed-settembre");
  const lockIconOpenS = document.getElementById("lock-icon-open-settembre");
  const btnS = document.getElementById("lock-toggle-btn-settembre");

  if (state.isSettembreUnlocked) {
    lockIconClosedS.style.display = "none";
    lockIconOpenS.style.display = "block";
    btnS.classList.add("unlocked");
  } else {
    lockIconClosedS.style.display = "block";
    lockIconOpenS.style.display = "none";
    btnS.classList.remove("unlocked");
    saveEditedSettembreCalendarState();
  }

  renderSettembreCalendar();
}

function saveEditedSettembreCalendarState() {
  if (!state.settembreCalendar) return;

  const meterSelect = document.getElementById("edit-settembre-meter-assignee");
  if (meterSelect) {
    state.settembreCalendar.meterAssignee = meterSelect.value;
  }

  const porchSelect = document.getElementById("edit-settembre-porch-assignee");
  if (porchSelect) {
    state.settembreCalendar.porchAssignee = porchSelect.value;
  }

  state.settembreHouseParts.forEach(zone => {
    const input = document.getElementById(`edit-settembre-house-${zone.id}`);
    if (input) {
      if (!state.settembreCalendar.houseCleaning[zone.id]) {
        state.settembreCalendar.houseCleaning[zone.id] = { assigned: [], helpers: [] };
      }
      state.settembreCalendar.houseCleaning[zone.id].assigned = input.value.split(",").map(s => s.trim()).filter(Boolean);
    }
  });

  state.settembreEsterniParts.forEach(zone => {
    const input = document.getElementById(`edit-settembre-esterni-${zone.id}`);
    if (input) {
      if (!state.settembreCalendar.esterniCleaning[zone.id]) {
        state.settembreCalendar.esterniCleaning[zone.id] = { assigned: [], helpers: [] };
      }
      state.settembreCalendar.esterniCleaning[zone.id].assigned = input.value.split(",").map(s => s.trim()).filter(Boolean);
    }
  });

  WIZARD_DAYS.forEach(day => {
    if (state.settembreCalendar.weekly[day]) {
      state.settembreCalendar.weekly[day].forEach((taskInst, idx) => {
        const select = document.getElementById(`edit-settembre-task-${day}-${idx}`);
        if (select) {
          state.settembreCalendar.weekly[day][idx].assigned = select.value.split(",").map(s => s.trim()).filter(Boolean);
        }
      });
    }

    const eveningSupervisoreSelect = document.getElementById(`edit-settembre-evening-supervisore-${day}`);
    const eveningAspiranteSelect = document.getElementById(`edit-settembre-evening-aspirante-${day}`);
    if (eveningSupervisoreSelect || eveningAspiranteSelect) {
      if (!state.settembreCalendar.eveningCheck[day]) {
        state.settembreCalendar.eveningCheck[day] = { supervisore: "", aspirante: "" };
      }
      if (eveningSupervisoreSelect) state.settembreCalendar.eveningCheck[day].supervisore = eveningSupervisoreSelect.value;
      if (eveningAspiranteSelect) state.settembreCalendar.eveningCheck[day].aspirante = eveningAspiranteSelect.value;
    }

    LAVATRICI_TURNI.forEach(turno => {
      const select = document.getElementById(`edit-settembre-lavatrici-${turno}-${day}`);
      if (select) {
        if (!state.settembreCalendar.lavatrici[turno]) state.settembreCalendar.lavatrici[turno] = {};
        state.settembreCalendar.lavatrici[turno][day] = select.value;
      }
    });
  });

  persistState("settembreCalendar", state.settembreCalendar);

  const conflicts = checkSettembreShowerConflicts();
  if (conflicts.length > 0) {
    alert("Attenzione: alcune assegnazioni sono incompatibili con gli orari doccia:\n\n" + conflicts.join("\n"));
  }
}

// Manual edits (unlike the generator, which already avoids this) can freely
// assign anyone to anything, so on save we check every assignee against the
// same shower-overlap rules the generator enforces and warn (without
// blocking the save) if something doesn't fit.
function checkSettembreShowerConflicts() {
  const conflicts = [];

  function nameToAspiranteId(name) {
    const a = state.settembreAspiranti.find(x => x.name === name);
    return a ? a.id : null;
  }

  WIZARD_DAYS.forEach(day => {
    (state.settembreCalendar.weekly[day] || []).forEach(taskInst => {
      const windows = SETTEMBRE_TASK_TIME_WINDOWS[taskInst.name.trim().toLowerCase()];
      if (!windows) return;
      taskInst.assigned.forEach(name => {
        const id = nameToAspiranteId(name);
        if (!id) return;
        if (isCandidateShoweringDuringAny(id, day, windows)) {
          conflicts.push(`${name} - "${taskInst.name}" (${day}): ha la doccia in quell'orario`);
        }
      });
    });
  });

  [
    { list: state.settembreHouseParts, cleaning: state.settembreCalendar.houseCleaning },
    { list: state.settembreEsterniParts, cleaning: state.settembreCalendar.esterniCleaning }
  ].forEach(({ list, cleaning }) => {
    list.forEach(zone => {
      const data = cleaning[zone.id];
      if (!data) return;
      (data.assigned || []).forEach(name => {
        const id = nameToAspiranteId(name);
        if (!id) return;
        const conflictDay = WIZARD_DAYS.find(day => isCandidateShoweringDuring(id, day, ZONE_CLEANING_TIME_WINDOW.start, ZONE_CLEANING_TIME_WINDOW.end));
        if (conflictDay) {
          conflicts.push(`${name} - "${zone.name}" (${conflictDay}): ha la doccia in quell'orario`);
        }
      });
    });
  });

  return conflicts;
}

// Same free-text + picker pattern as assigneePickerHTML, but sourced from
// the combined Settembre roster (supervisori + aspiranti) instead of
// getSchedulablePeople().
function settembreAssigneePickerHTML(inputId, rosterOverride) {
  const roster = rosterOverride || getSettembreRoster();
  return `<select id="${inputId}-picker" class="input-field" style="margin-top: 4px; padding: 4px 8px; font-size: 12px;" onchange="addNameToAssigneeField('${inputId}', this.value)">
    <option value="">+ Aggiungi persona...</option>
    ${roster.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
  </select>`;
}

function renderSettembreCalendar() {
  if (!state.settembreCalendar) return;

  renderShowerTable();

  const roster = getSettembreRoster();
  const supervisoriRoster = roster.filter(c => c.kind === "supervisore");
  const aspirantiRoster = roster.filter(c => c.kind === "aspirante");

  // RENDER METER READING (supervisori only)
  if (state.isSettembreUnlocked) {
    const selectHTML = `<select id="edit-settembre-meter-assignee" class="meter-select">
      <option value="">Nessuno</option>
      ${supervisoriRoster.map(c => `<option value="${escapeHtml(c.name)}" ${state.settembreCalendar.meterAssignee === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
    </select>`;
    document.getElementById("settembre-meter-display-container").innerHTML = selectHTML;
  } else {
    document.getElementById("settembre-meter-display-container").innerHTML = `<span class="meter-value">${escapeHtml(state.settembreCalendar.meterAssignee) || 'Non assegnato'}</span>`;
  }

  // RENDER PORCH CLEANING (aspiranti only)
  if (state.isSettembreUnlocked) {
    const selectHTML = `<select id="edit-settembre-porch-assignee" class="meter-select">
      <option value="">Nessuno</option>
      ${aspirantiRoster.map(c => `<option value="${escapeHtml(c.name)}" ${state.settembreCalendar.porchAssignee === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
    </select>`;
    document.getElementById("settembre-porch-display-container").innerHTML = selectHTML;
  } else {
    document.getElementById("settembre-porch-display-container").innerHTML = `<span class="meter-value">${escapeHtml(state.settembreCalendar.porchAssignee) || 'Non assegnato'}</span>`;
  }

  // RENDER HOUSE CLEANING (PULIZIA CASA / PULIZIA ESTERNI)
  function renderSettembreZoneCleaningList(containerId, zoneList, cleaningMap, inputIdPrefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    const sortedZones = [...zoneList].sort((a, b) => a.priority - b.priority);
    sortedZones.forEach(zone => {
      const data = cleaningMap[zone.id] || { assigned: [], helpers: [] };
      const assignedNames = Array.isArray(data.assigned) ? data.assigned : (data.assigned ? [data.assigned] : []);
      const card = document.createElement("div");
      card.className = "house-part-card";
      const inputId = `${inputIdPrefix}-${zone.id}`;

      let assigneeHTML = "";
      if (state.isSettembreUnlocked) {
        assigneeHTML = `<input type="text" id="${inputId}" class="input-field" style="padding: 6px 10px; font-size: 13px;" value="${escapeHtml(assignedNames.join(', '))}" placeholder="Nomi separati da virgola (min. ${zone.minPeople})">
          ${settembreAssigneePickerHTML(inputId, aspirantiRoster)}`;
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
      container.appendChild(card);
    });
  }

  renderSettembreZoneCleaningList("settembre-house-cleaning-list", state.settembreHouseParts, state.settembreCalendar.houseCleaning, "edit-settembre-house");
  renderSettembreZoneCleaningList("settembre-esterni-cleaning-list", state.settembreEsterniParts, state.settembreCalendar.esterniCleaning, "edit-settembre-esterni");

  // RENDER WEEKLY TASKS
  function settembreTaskPriority(taskId) {
    const task = state.settembreTasks.find(t => t.id === taskId);
    return task ? task.priority : 999;
  }

  WIZARD_DAYS.forEach(day => {
    const col = document.querySelector(`#settembre-weekly-container .day-column[data-day="${day}"]`);
    if (!col) return;
    const list = col.querySelector(".day-tasks-list");
    list.innerHTML = "";

    if (state.settembreCalendar.weekly[day]) {
      state.settembreCalendar.weekly[day].sort((a, b) => settembreTaskPriority(a.taskId) - settembreTaskPriority(b.taskId));
    }

    const dayTasks = state.settembreCalendar.weekly[day] || [];
    dayTasks.forEach((taskInst, idx) => {
      const item = document.createElement("div");
      item.className = "day-task-item";

      let assigneeHTML = "";
      if (state.isSettembreUnlocked) {
        assigneeHTML = `<input type="text" id="edit-settembre-task-${day}-${idx}" class="day-task-assignee-edit" value="${escapeHtml(taskInst.assigned.join(', '))}" placeholder="Nomi separati da virgola">
          ${settembreAssigneePickerHTML(`edit-settembre-task-${day}-${idx}`)}`;
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

  // RENDER EVENING CHECK (CONTROLLO SERALE) - one supervisore + one
  // aspirante per day.
  const settembreEveningCheckList = document.getElementById("settembre-evening-check-list");
  if (settembreEveningCheckList) {
    settembreEveningCheckList.innerHTML = "";
    WIZARD_DAYS.forEach(day => {
      const entry = state.settembreCalendar.eveningCheck[day] || { supervisore: "", aspirante: "" };
      const pill = document.createElement("div");
      pill.className = "evening-day-pill";

      let assigneeHTML = "";
      if (state.isSettembreUnlocked) {
        assigneeHTML = `
          <select id="edit-settembre-evening-supervisore-${day}" class="input-field" style="padding: 6px 10px; font-size: 13px; margin-top: 4px;">
            <option value="">Nessuno</option>
            ${supervisoriRoster.map(c => `<option value="${escapeHtml(c.name)}" ${entry.supervisore === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <select id="edit-settembre-evening-aspirante-${day}" class="input-field" style="padding: 6px 10px; font-size: 13px; margin-top: 4px;">
            <option value="">Nessuno</option>
            ${aspirantiRoster.map(c => `<option value="${escapeHtml(c.name)}" ${entry.aspirante === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        `;
      } else {
        assigneeHTML = `
          <div class="evening-day-assignee">${escapeHtml(entry.supervisore) || '-'}</div>
          <div class="evening-day-assignee">${escapeHtml(entry.aspirante) || '-'}</div>
        `;
      }

      pill.innerHTML = `
        <div class="evening-day-name">${day}</div>
        ${assigneeHTML}
      `;
      settembreEveningCheckList.appendChild(pill);
    });
  }

  // RENDER TURNI LAVATRICI - aspiranti only, single-value <select> per cell
  // (a person's name, or the "Bucato Comune"/"Recupero" placeholders).
  LAVATRICI_TURNI.forEach(turno => {
    WIZARD_DAYS.forEach(day => {
      const td = document.querySelector(`#settembre-lavatrici-table-body tr[data-turno="${turno}"] td[data-day="${day}"]`);
      if (!td) return;
      const value = (state.settembreCalendar.lavatrici[turno] && state.settembreCalendar.lavatrici[turno][day]) || "";

      if (state.isSettembreUnlocked) {
        const options = [
          `<option value="">-</option>`,
          ...aspirantiRoster.map(c => `<option value="${escapeHtml(c.name)}" ${value === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`),
          `<option value="${LAVATRICI_BUCATO_COMUNE}" ${value === LAVATRICI_BUCATO_COMUNE ? 'selected' : ''}>${LAVATRICI_BUCATO_COMUNE}</option>`,
          `<option value="${LAVATRICI_RECUPERO}" ${value === LAVATRICI_RECUPERO ? 'selected' : ''}>${LAVATRICI_RECUPERO}</option>`
        ];
        td.innerHTML = `<select id="edit-settembre-lavatrici-${turno}-${day}" class="input-field" style="padding: 6px; font-size: 12px; width: 100%;">${options.join('')}</select>`;
      } else {
        td.innerHTML = escapeHtml(value) || "-";
      }
    });
  });
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
    // No person selected: cancel the search, show the full calendar again
    calendarFullView.style.display = "";
    searchTodayResults.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Seleziona una persona per vedere le sue attività (per la vista di tutti usa il Calendario Settimanale qui sotto).</p>`;
    return;
  }

  // A person is selected: show only the search results, hide everything else
  calendarFullView.style.display = "none";

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

    // People assigned to an "exclusive" task (e.g. cooking) today: excluded
    // outright from every other independent task the same day, unlike the
    // soft same-day preference above.
    const dailyHardExcluded = new Set();

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
        // Filter out people already assigned to THIS task, anyone hard-excluded
        // (e.g. already cooking), and (soft-but-preferred rule) anyone already
        // assigned today to another task with the same priority - unless that
        // leaves nobody to pick, in which case the priority rule is relaxed
        // rather than leaving the task unfilled. The hard exclusion never relaxes.
        let candidates = dailyRoster.filter(c => !assignedCadets.includes(c) && !dailyHardExcluded.has(c.id) && !usedForThisPriority.has(c.id));
        if (candidates.length === 0) {
          candidates = dailyRoster.filter(c => !assignedCadets.includes(c) && !dailyHardExcluded.has(c.id));
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

      // An "exclusive" task's assignees can't be put on anything else today
      if (task.exclusive) {
        assignedCadets.forEach(c => dailyHardExcluded.add(c.id));
      }

      // Add task instance to calendar day
      newCalendar.weekly[day].push({
        taskId: task.id,
        name: task.name,
        assigned: assignedCadets.map(c => c.name)
      });

      // Assign each linked task its own required number of people, reusing as
      // many of the parent's assignees as possible (same people doing related
      // chores). A running pointer into the parent's group is shared across
      // sibling linked tasks, so e.g. with 2 people cooking-helpers and two
      // linked tasks needing 1 each, the first claims helper #1 and the
      // second gets helper #2 - not the same one twice. If a linked task
      // needs more people than remain in the parent's group, the rest are
      // topped up the same way the parent's were.
      let parentPoolPointer = 0;
      linkedChildrenForMinP.forEach(child => {
        const childAssigned = assignedCadets.slice(parentPoolPointer, parentPoolPointer + child.minPeople);
        parentPoolPointer += childAssigned.length;

        while (childAssigned.length < child.minPeople) {
          const candidates = dailyRoster.filter(c => !childAssigned.includes(c) && !dailyHardExcluded.has(c.id));
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

        if (child.exclusive) {
          childAssigned.forEach(c => dailyHardExcluded.add(c.id));
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

// SETTEMBRE GENERATION WIZARD LOGIC
function resetSettembreWizard() {
  document.getElementById("gen-step-init-settembre").classList.add("active");
  document.getElementById("gen-step-absent-settembre").classList.remove("active");
  document.getElementById("gen-step-details-settembre").classList.remove("active");
  wizardSettembreSelectedAbsent = [];
  document.getElementById("step2-present-list-settembre").style.display = "none";
}

function startSettembreWizard() {
  document.getElementById("gen-step-init-settembre").classList.remove("active");
  document.getElementById("gen-step-absent-settembre").classList.add("active");

  const listEl = document.getElementById("wizard-people-list-settembre");
  listEl.innerHTML = "";
  const roster = getSettembreRoster();
  const confirmBtn = document.getElementById("confirm-absent-btn-settembre");

  if (roster.length === 0) {
    listEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Aggiungi prima aspiranti o supervisori!</p>`;
    confirmBtn.disabled = true;
    return;
  }
  confirmBtn.disabled = false;

  roster.forEach(c => {
    const card = document.createElement("label");
    card.className = "checkbox-card";
    card.innerHTML = `
      <input type="checkbox" data-person-id="${c.id}">
      <span class="checkbox-card-label">${escapeHtml(c.name)} <small style="color: var(--text-muted);">(${c.kind === 'aspirante' ? 'Aspirante' : 'Supervisore'})</small></span>
    `;
    listEl.appendChild(card);
  });
}

function goToStep2Settembre() {
  wizardSettembreSelectedAbsent = [];
  const roster = getSettembreRoster();
  const checkedBoxes = document.querySelectorAll('#wizard-people-list-settembre input[type="checkbox"]:checked');

  checkedBoxes.forEach(cb => {
    const pId = cb.getAttribute("data-person-id");
    const candidate = roster.find(c => c.id === pId);
    if (candidate) {
      wizardSettembreSelectedAbsent.push(candidate);
    }
  });

  document.getElementById("gen-step-absent-settembre").classList.remove("active");
  document.getElementById("gen-step-details-settembre").classList.add("active");

  const absentIds = new Set(wizardSettembreSelectedAbsent.map(c => c.id));
  const presentCandidates = roster.filter(c => !absentIds.has(c.id));
  const presentListEl = document.getElementById("step2-present-list-settembre");

  if (presentCandidates.length > 0) {
    presentListEl.innerHTML = `<strong>Presenti tutta la settimana (nessuna azione richiesta):</strong> ${presentCandidates.map(c => escapeHtml(c.name)).join(', ')}`;
    presentListEl.style.display = "block";
  } else {
    presentListEl.innerHTML = `<strong>Attenzione:</strong> tutti sono stati selezionati come almeno parzialmente assenti al Passo 1.`;
    presentListEl.style.display = "block";
  }

  const tbody = document.getElementById("absence-table-body-settembre");
  tbody.innerHTML = "";
  if (wizardSettembreSelectedAbsent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nessuna assenza selezionata al Passo 1: come indicato sopra, tutti saranno schedulati come presenti tutta la settimana. Clicca su Genera Turni Settembre per completare.</td></tr>`;
    return;
  }

  wizardSettembreSelectedAbsent.forEach(c => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-person-id", c.id);

    let daysHTML = "";
    WIZARD_DAYS.forEach(day => {
      daysHTML += `<td><input type="checkbox" data-day="${day}"></td>`;
    });

    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      ${daysHTML}
    `;
    tbody.appendChild(tr);
  });
}

function goBackToStep1Settembre() {
  document.getElementById("gen-step-details-settembre").classList.remove("active");
  document.getElementById("gen-step-absent-settembre").classList.add("active");
}

// SETTEMBRE CALENDAR GENERATION ALGORITHM - same fairness-balancing pattern
// as generateCalendar() above, but the roster is the combined
// supervisori+aspiranti list and each task's candidate pool is filtered by
// its "target" (aspiranti/supervisori/entrambi). There is no house-cleaning
// zones / evening-check / laundry-shift equivalent here - the shower table
// is fixed (never generated), and only meterAssignee/porchAssignee plus the
// admin-defined weekly tasks are generated.
function generateSettembreCalendar() {
  const newCalendar = createBlankSettembreCalendar();
  const roster = getSettembreRoster();

  const absences = {}; // { candidateId: [absentDays] }
  if (wizardSettembreSelectedAbsent.length > 0) {
    const rows = document.querySelectorAll("#absence-table-body-settembre tr[data-person-id]");
    rows.forEach(row => {
      const pId = row.getAttribute("data-person-id");
      const presentBoxes = row.querySelectorAll('input[type="checkbox"]:checked');
      const presentDays = new Set(Array.from(presentBoxes).map(box => box.getAttribute("data-day").toLowerCase()));
      absences[pId] = WIZARD_DAYS.filter(d => !presentDays.has(d));
    });
  }

  const fullyPresentCandidates = [];
  const partiallyAbsentCandidates = []; // { person, absentDays, presentDays }

  roster.forEach(c => {
    const personAbsences = absences[c.id] || [];
    if (personAbsences.length === 7) {
      // Fully absent - excluded entirely
      return;
    } else if (personAbsences.length > 0) {
      const presentDays = WIZARD_DAYS.filter(d => !personAbsences.includes(d));
      partiallyAbsentCandidates.push({ person: c, absentDays: personAbsences, presentDays });
    } else {
      fullyPresentCandidates.push(c);
    }
  });

  const activeCandidates = [...fullyPresentCandidates, ...partiallyAbsentCandidates.map(item => item.person)];

  if (activeCandidates.length === 0) {
    alert("Errore: tutti sono assenti per l'intera settimana! Impossibile generare i turni Settembre.");
    return;
  }

  function isCandidatePresent(c, dayName) {
    const cAbsences = absences[c.id] || [];
    return !cAbsences.includes(dayName.toLowerCase());
  }
  function getPresentCandidatesForDay(dayName) {
    return activeCandidates.filter(c => isCandidatePresent(c, dayName));
  }

  const loadCounts = {};
  activeCandidates.forEach(c => { loadCounts[c.id] = 0; });

  const sortedTasks = [...state.settembreTasks].sort((a, b) => a.priority - b.priority);
  const taskAssignmentCounts = {};
  sortedTasks.forEach(t => {
    taskAssignmentCounts[t.id] = {};
    activeCandidates.forEach(c => { taskAssignmentCounts[t.id][c.id] = 0; });
  });

  // "Aiuto Cucina" convention: whoever ends up first in the assigned list
  // rinses the dishes, whoever is second dries them - never shown anywhere,
  // just an ordering the two already know. Track a running balance so the
  // same person doesn't always land first across the days this recurs.
  const kitchenHelpRinseCounts = {};
  const kitchenHelpDryCounts = {};
  activeCandidates.forEach(c => { kitchenHelpRinseCounts[c.id] = 0; kitchenHelpDryCounts[c.id] = 0; });

  WIZARD_DAYS.forEach(day => {
    newCalendar.weekly[day] = [];
    const dailyRosterAll = getPresentCandidatesForDay(day);
    if (dailyRosterAll.length === 0) return;

    const dailyAssignedIds = new Set();
    const dailyHardExcluded = new Set();
    const dailyAssignedByPriority = {};

    sortedTasks.forEach(task => {
      if (task.linkedTask !== "none") return;

      if (!dailyAssignedByPriority[task.priority]) {
        dailyAssignedByPriority[task.priority] = new Set();
      }
      const usedForThisPriority = dailyAssignedByPriority[task.priority];

      const linkedChildrenForMinP = sortedTasks.filter(t => t.linkedTask === task.id);
      const minP = task.minPeople;
      const assignedCandidates = [];
      let eligiblePool = dailyRosterAll.filter(c => candidateMatchesTarget(c, task.target));
      const taskTimeWindows = SETTEMBRE_TASK_TIME_WINDOWS[task.name.trim().toLowerCase()];
      if (taskTimeWindows) {
        eligiblePool = eligiblePool.filter(c => !isCandidateShoweringDuringAny(c.id, day, taskTimeWindows));
      }

      for (let i = 0; i < minP; i++) {
        let candidates = eligiblePool.filter(c => !assignedCandidates.includes(c) && !dailyHardExcluded.has(c.id) && !usedForThisPriority.has(c.id));
        if (candidates.length === 0) {
          candidates = eligiblePool.filter(c => !assignedCandidates.includes(c) && !dailyHardExcluded.has(c.id));
        }
        if (candidates.length === 0) break;

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
        assignedCandidates.push(selected);
        dailyAssignedIds.add(selected.id);
        usedForThisPriority.add(selected.id);
        taskAssignmentCounts[task.id][selected.id]++;
        loadCounts[selected.id]++;
      }

      if (task.exclusive) {
        assignedCandidates.forEach(c => dailyHardExcluded.add(c.id));
      }

      let orderedAssignedCandidates = assignedCandidates;
      if (assignedCandidates.length === 2 && task.name.trim().toLowerCase() === "aiuto cucina") {
        const [a, b] = assignedCandidates;
        const aBias = kitchenHelpRinseCounts[a.id] - kitchenHelpDryCounts[a.id];
        const bBias = kitchenHelpRinseCounts[b.id] - kitchenHelpDryCounts[b.id];
        orderedAssignedCandidates = aBias <= bBias ? [a, b] : [b, a];
        kitchenHelpRinseCounts[orderedAssignedCandidates[0].id]++;
        kitchenHelpDryCounts[orderedAssignedCandidates[1].id]++;
      }

      newCalendar.weekly[day].push({
        taskId: task.id,
        name: task.name,
        assigned: orderedAssignedCandidates.map(c => c.name)
      });

      // Linked child tasks reuse the parent's assignees only when they share
      // the same target pool (otherwise there's nobody eligible to reuse);
      // otherwise - or when the parent's group runs out - top up from the
      // child's own eligible pool.
      let parentPoolPointer = 0;
      linkedChildrenForMinP.forEach(child => {
        const childEligiblePool = dailyRosterAll.filter(c => candidateMatchesTarget(c, child.target));
        let childAssigned = [];
        if (child.target === task.target) {
          childAssigned = assignedCandidates.slice(parentPoolPointer, parentPoolPointer + child.minPeople);
          parentPoolPointer += childAssigned.length;
        }

        while (childAssigned.length < child.minPeople) {
          const candidates = childEligiblePool.filter(c => !childAssigned.includes(c) && !dailyHardExcluded.has(c.id));
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

        if (child.exclusive) {
          childAssigned.forEach(c => dailyHardExcluded.add(c.id));
        }

        childAssigned.forEach(c => { loadCounts[c.id]++; });

        newCalendar.weekly[day].push({
          taskId: child.id,
          name: child.name,
          assigned: childAssigned.map(c => c.name)
        });
      });
    });
  });

  // LETTURA CONTATORI - supervisori only, once a week
  const fullyPresentSupervisori = fullyPresentCandidates.filter(c => c.kind === "supervisore");
  let meterCandidate = null;
  if (fullyPresentSupervisori.length > 0) {
    fullyPresentSupervisori.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
    meterCandidate = fullyPresentSupervisori[0];
  } else {
    const sortedPartialSupervisori = partiallyAbsentCandidates
      .filter(item => item.person.kind === "supervisore")
      .sort((a, b) => {
        if (a.presentDays.length !== b.presentDays.length) {
          return b.presentDays.length - a.presentDays.length;
        }
        return loadCounts[a.person.id] - loadCounts[b.person.id];
      });
    meterCandidate = sortedPartialSupervisori[0]?.person || null;
  }
  if (meterCandidate) {
    newCalendar.meterAssignee = meterCandidate.name;
    loadCounts[meterCandidate.id] += 2;
  }

  // PULIZIA PORTICO - aspiranti only, once a week
  const fullyPresentAspiranti = fullyPresentCandidates.filter(c => c.kind === "aspirante");
  let porchCandidate = null;
  if (fullyPresentAspiranti.length > 0) {
    fullyPresentAspiranti.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
    porchCandidate = fullyPresentAspiranti[0];
  } else {
    const sortedPartialAspiranti = partiallyAbsentCandidates
      .filter(item => item.person.kind === "aspirante")
      .sort((a, b) => {
        if (a.presentDays.length !== b.presentDays.length) {
          return b.presentDays.length - a.presentDays.length;
        }
        return loadCounts[a.person.id] - loadCounts[b.person.id];
      });
    porchCandidate = sortedPartialAspiranti[0]?.person || null;
  }
  if (porchCandidate) {
    newCalendar.porchAssignee = porchCandidate.name;
    loadCounts[porchCandidate.id] += 2;
  }

  // ZONE DI PULIZIA (Pulizia Casa / Pulizia Esterni) - same approach as the
  // original scheda's house cleaning zones (primaries drawn only from
  // people present all week, partially present people distributed as
  // helpers), but the eligible pool is aspiranti only, and excludes anyone
  // showering during the shared cleaning time window on any day.
  function assignSettembreZones(zoneList, cleaningTarget) {
    const zones = [...zoneList].sort((a, b) => a.priority - b.priority);
    const notShoweringDuringCleaning = c => !hasAnyShowerOverlapWithWindow(c.id, ZONE_CLEANING_TIME_WINDOW.start, ZONE_CLEANING_TIME_WINDOW.end);
    const fullyPresentAspirantiForZones = fullyPresentCandidates.filter(c => c.kind === "aspirante" && notShoweringDuringCleaning(c));
    const activeAspirantiForZones = activeCandidates.filter(c => c.kind === "aspirante" && notShoweringDuringCleaning(c));
    const zonePrimaryPool = fullyPresentAspirantiForZones.length > 0 ? fullyPresentAspirantiForZones : activeAspirantiForZones;

    zones.forEach(zone => {
      const assignedCandidates = [];
      const minP = (typeof zone.minPeople === "number" && zone.minPeople > 0) ? zone.minPeople : 1;

      for (let i = 0; i < minP; i++) {
        const candidates = zonePrimaryPool.filter(c => !assignedCandidates.includes(c));
        if (candidates.length === 0) break;

        candidates.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
        const selected = candidates[0];
        assignedCandidates.push(selected);
        loadCounts[selected.id] += 3;
      }

      cleaningTarget[zone.id] = {
        assigned: assignedCandidates.map(c => c.name),
        helpers: []
      };
    });

    const partiallyAbsentAspirantiForZones = partiallyAbsentCandidates.filter(item => item.person.kind === "aspirante");
    if (zones.length > 0) {
      partiallyAbsentAspirantiForZones.forEach((item, idx) => {
        const targetZone = zones[idx % zones.length];
        cleaningTarget[targetZone.id].helpers.push({
          name: item.person.name,
          days: item.presentDays.map(d => d.slice(0, 3))
        });
      });
    }
  }

  assignSettembreZones(state.settembreHouseParts, newCalendar.houseCleaning);
  assignSettembreZones(state.settembreEsterniParts, newCalendar.esterniCleaning);

  // CONTROLLO SERALE - one supervisore + one aspirante per day, each
  // tracked (and gap-limited) independently within its own pool so the
  // same person doesn't do it on two consecutive days.
  const MIN_EVENING_GAP = 2;
  const eveningLastDay = {};
  const eveningLoad = {};
  activeCandidates.forEach(c => { eveningLastDay[c.id] = -Infinity; eveningLoad[c.id] = 0; });

  function pickEveningPerson(pool, dayIndex) {
    if (pool.length === 0) return null;
    let candidates = pool.filter(c => (dayIndex - eveningLastDay[c.id]) >= MIN_EVENING_GAP);
    if (candidates.length === 0) {
      const sorted = [...pool].sort((a, b) => eveningLastDay[a.id] - eveningLastDay[b.id]);
      candidates = [sorted[0]];
    }
    candidates.sort((a, b) => eveningLoad[a.id] - eveningLoad[b.id]);
    return candidates[0];
  }

  WIZARD_DAYS.forEach((day, dayIndex) => {
    const dailyRosterAll = getPresentCandidatesForDay(day);
    const supervisoriToday = dailyRosterAll.filter(c => c.kind === "supervisore");
    const aspirantiToday = dailyRosterAll.filter(c => c.kind === "aspirante");

    const selectedSupervisore = pickEveningPerson(supervisoriToday, dayIndex);
    const selectedAspirante = pickEveningPerson(aspirantiToday, dayIndex);

    if (selectedSupervisore) {
      eveningLastDay[selectedSupervisore.id] = dayIndex;
      eveningLoad[selectedSupervisore.id]++;
    }
    if (selectedAspirante) {
      eveningLastDay[selectedAspirante.id] = dayIndex;
      eveningLoad[selectedAspirante.id]++;
    }

    newCalendar.eveningCheck[day] = {
      supervisore: selectedSupervisore ? selectedSupervisore.name : "",
      aspirante: selectedAspirante ? selectedAspirante.name : ""
    };
  });

  // TURNI LAVATRICI - aspiranti only, exactly one turn per person for the
  // week; everything else defaults to "Bucato Comune". Computed last since
  // it has to avoid whatever mansioni/docce/pulizie were already assigned
  // above (a person can't be in two places at once): for each candidate on
  // a given day, collect every time window they're already committed to
  // (shower, a kitchen mansione with a known time window, zone cleaning)
  // and skip them for any lavatrici slot that overlaps.
  function getOccupiedWindowsForNameOnDay(name, day) {
    const windows = [];
    const aspiranteMatch = state.settembreAspiranti.find(a => a.name === name);
    if (aspiranteMatch) {
      windows.push(...getShowerRangesForCandidateOnDay(aspiranteMatch.id, day));
    }
    (newCalendar.weekly[day] || []).forEach(taskInst => {
      const taskWindows = SETTEMBRE_TASK_TIME_WINDOWS[taskInst.name.trim().toLowerCase()];
      if (taskWindows && taskInst.assigned.includes(name)) {
        windows.push(...taskWindows);
      }
    });
    [newCalendar.houseCleaning, newCalendar.esterniCleaning].forEach(cleaningMap => {
      Object.values(cleaningMap).forEach(data => {
        const isPrimary = (data.assigned || []).includes(name);
        const isHelperToday = (data.helpers || []).some(h => h.name === name && h.days.includes(day.slice(0, 3)));
        if (isPrimary || isHelperToday) {
          windows.push(ZONE_CLEANING_TIME_WINDOW);
        }
      });
    });
    return windows;
  }

  const aspirantiForLavatrici = activeCandidates.filter(c => c.kind === "aspirante");
  const hasWashedThisWeek = {};
  aspirantiForLavatrici.forEach(c => { hasWashedThisWeek[c.id] = false; });

  WIZARD_DAYS.forEach(day => {
    LAVATRICI_TURNI.forEach(turno => {
      const turnoWindow = LAVATRICI_TIMES[turno];
      const candidates = aspirantiForLavatrici.filter(c => {
        if (hasWashedThisWeek[c.id]) return false;
        if (!isCandidatePresent(c, day)) return false;
        const occupied = getOccupiedWindowsForNameOnDay(c.name, day);
        return !occupied.some(w => timeRangesOverlap(w.start, w.end, turnoWindow.start, turnoWindow.end));
      });

      if (candidates.length === 0) {
        newCalendar.lavatrici[turno][day] = LAVATRICI_BUCATO_COMUNE;
        return;
      }

      candidates.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
      const selected = candidates[0];
      hasWashedThisWeek[selected.id] = true;
      loadCounts[selected.id] += 2;
      newCalendar.lavatrici[turno][day] = selected.name;
    });
  });

  state.settembreCalendar = newCalendar;
  persistState("settembreCalendar", newCalendar);

  renderSettembreCalendar();
  switchTab("tab-settembre");
  alert("Turni Settembre generati con successo!");
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

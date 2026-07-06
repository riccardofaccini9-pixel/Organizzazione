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
  { id: "hp1", name: "Cucina" },
  { id: "hp2", name: "Bagno Primo Piano" },
  { id: "hp3", name: "Bagno Secondo Piano" },
  { id: "hp4", name: "Salotto & Corridoio" },
  { id: "hp5", name: "Scale & Vetrate" }
];

const DAYS_OF_WEEK = ["giovedì", "venerdì", "sabato", "domenica", "lunedì", "martedì", "mercoledì"];
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

// LOCAL STORAGE STORAGE KEYS
const STORAGE_PEOPLE = "clean_calendar_people";
const STORAGE_TASKS = "clean_calendar_tasks";
const STORAGE_HOUSE_PARTS = "clean_calendar_house_parts";
const STORAGE_CALENDAR = "clean_calendar_current";

// LOAD INITIAL STATE
function init() {
  // Load People
  const storedPeople = localStorage.getItem(STORAGE_PEOPLE);
  if (storedPeople) {
    state.people = JSON.parse(storedPeople);
  } else {
    state.people = [...DEFAULT_PEOPLE];
    localStorage.setItem(STORAGE_PEOPLE, JSON.stringify(state.people));
  }

  // Load Tasks
  const storedTasks = localStorage.getItem(STORAGE_TASKS);
  if (storedTasks) {
    state.tasks = JSON.parse(storedTasks);
  } else {
    state.tasks = [...DEFAULT_TASKS];
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(state.tasks));
  }

  // Load House Cleaning Zones
  const storedHouseParts = localStorage.getItem(STORAGE_HOUSE_PARTS);
  if (storedHouseParts) {
    state.houseParts = JSON.parse(storedHouseParts);
  } else {
    state.houseParts = [...DEFAULT_HOUSE_PARTS];
    localStorage.setItem(STORAGE_HOUSE_PARTS, JSON.stringify(state.houseParts));
  }

  // Load Calendar
  const storedCalendar = localStorage.getItem(STORAGE_CALENDAR);
  if (storedCalendar) {
    state.calendar = JSON.parse(storedCalendar);
  }

  // Bind Events
  loginSubmitBtn.addEventListener("click", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  
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

  // Wizard Buttons
  startWizardBtn.addEventListener("click", startWizard);
  confirmAbsentBtn.addEventListener("click", goToStep2);
  backToStep1Btn.addEventListener("click", goBackToStep1);
  generateFinalBtn.addEventListener("click", generateCalendar);

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

function openAddTaskModal() {
  editingTaskId = null;
  taskModalHeader.textContent = "Aggiungi Nuova Mansione";
  taskNameInput.value = "";
  taskMinPeopleInput.value = "1";
  taskPriorityInput.value = "";
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
  updateLinkedTasksDropdowns();
  taskLinkedSelect.value = task.linkedTask;
  openModal(modalTask);
}

function saveTask() {
  const name = taskNameInput.value.trim();
  const minPeople = parseInt(taskMinPeopleInput.value) || 1;
  const rawPriority = taskPriorityInput.value.trim();
  const linkedTask = taskLinkedSelect.value;

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
  } else {
    state.tasks.push({
      id: "task-" + Date.now(),
      name,
      minPeople,
      priority,
      linkedTask
    });
  }

  localStorage.setItem(STORAGE_TASKS, JSON.stringify(state.tasks));
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
  localStorage.setItem(STORAGE_TASKS, JSON.stringify(state.tasks));
  populateTasksTable();
  updateLinkedTasksDropdowns();
  renderCalendar();
}

function populateTasksTable() {
  tasksTableBody.innerHTML = "";
  // Sort tasks by priority
  const sorted = [...state.tasks].sort((a, b) => a.priority - b.priority);

  sorted.forEach(t => {
    const linked = state.tasks.find(lt => lt.id === t.linkedTask);
    const linkedName = linked ? linked.name : "Nessuna";
    const tr = document.createElement("tr");

    const actionBtns = state.currentUser.role === "admin"
      ? `<button class="action-btn-edit" onclick="editTask('${t.id}')">
          <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
         </button>
         <button class="action-btn-danger" onclick="deleteTask('${t.id}')">
          <svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
         </button>`
      : "";

    tr.innerHTML = `
      <td><strong>${escapeHtml(t.name)}</strong></td>
      <td>${t.minPeople}</td>
      <td>${t.priority}</td>
      <td><span style="color: var(--accent-color);">${escapeHtml(linkedName)}</span></td>
      ${state.currentUser.role === 'admin' ? `<td style="text-align: center;">${actionBtns}</td>` : ''}
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

  localStorage.setItem(STORAGE_PEOPLE, JSON.stringify(state.people));
  editingPersonId = null;

  closeModal(modalPerson);
  populatePeopleTable();
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
  localStorage.setItem(STORAGE_PEOPLE, JSON.stringify(state.people));
  populatePeopleTable();
}

function populatePeopleTable() {
  peopleTableBody.innerHTML = "";
  state.people.forEach(p => {
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
  openModal(modalHousePart);
}

function editHousePart(id) {
  const zone = state.houseParts.find(z => z.id === id);
  if (!zone) return;

  editingHousePartId = id;
  housePartModalHeader.textContent = "Modifica Zona di Pulizia";
  housePartNameInput.value = zone.name;
  openModal(modalHousePart);
}

function saveHousePart() {
  const name = housePartNameInput.value.trim();
  if (!name) {
    alert("Inserire il nome della zona!");
    return;
  }

  if (editingHousePartId) {
    const zone = state.houseParts.find(z => z.id === editingHousePartId);
    zone.name = name;
  } else {
    state.houseParts.push({ id: "hp-" + Date.now(), name });
  }

  localStorage.setItem(STORAGE_HOUSE_PARTS, JSON.stringify(state.houseParts));
  editingHousePartId = null;

  closeModal(modalHousePart);
  populateHousePartsTable();
  renderCalendar();
}

function deleteHousePart(id) {
  state.houseParts = state.houseParts.filter(z => z.id !== id);
  localStorage.setItem(STORAGE_HOUSE_PARTS, JSON.stringify(state.houseParts));
  populateHousePartsTable();
  renderCalendar();
}

function populateHousePartsTable() {
  housePartsTableBody.innerHTML = "";
  state.houseParts.forEach(zone => {
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
      ${state.currentUser.role === 'admin' ? `<td style="text-align: center;">${actionBtns}</td>` : ''}
    `;
    housePartsTableBody.appendChild(tr);
  });
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
    cal.houseCleaning[zone.id] = { assigned: "", helpers: [] };
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
    const select = document.getElementById(`edit-house-${zone.id}`);
    if (select) {
      if (!state.calendar.houseCleaning[zone.id]) {
        state.calendar.houseCleaning[zone.id] = { assigned: "", helpers: [] };
      }
      state.calendar.houseCleaning[zone.id].assigned = select.value;
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

  localStorage.setItem(STORAGE_CALENDAR, JSON.stringify(state.calendar));
}

function renderCalendar() {
  if (!state.calendar) return;

  const cadetsOnly = state.people.filter(p => p.role === "cadetto");

  // RENDER METER READING
  if (state.isUnlocked) {
    meterAssigneeText.style.display = "none";
    let selectHTML = `<select id="edit-meter-assignee" class="meter-select">
      <option value="">Nessuno</option>
      ${state.people.map(p => `<option value="${escapeHtml(p.name)}" ${state.calendar.meterAssignee === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
    </select>`;
    document.getElementById("meter-display-container").innerHTML = selectHTML;
  } else {
    document.getElementById("meter-display-container").innerHTML = `<span id="meter-assignee-text" class="meter-value">${escapeHtml(state.calendar.meterAssignee) || 'Non assegnato'}</span>`;
  }

  // RENDER HOUSE CLEANING
  houseCleaningList.innerHTML = "";
  state.houseParts.forEach(zone => {
    const data = state.calendar.houseCleaning[zone.id] || { assigned: "", helpers: [] };
    const card = document.createElement("div");
    card.className = "house-part-card";

    let assigneeHTML = "";
    if (state.isUnlocked) {
      assigneeHTML = `<select id="edit-house-${zone.id}" class="input-field" style="padding: 6px 10px; font-size: 13px;">
        <option value="">Nessuno</option>
        ${state.people.map(p => `<option value="${escapeHtml(p.name)}" ${data.assigned === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>`;
    } else {
      assigneeHTML = `<span class="house-part-assignee">${escapeHtml(data.assigned) || 'Non assegnato'}</span>`;
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
  DAYS_OF_WEEK.forEach(day => {
    const col = document.querySelector(`.day-column[data-day="${day}"]`);
    const list = col.querySelector(".day-tasks-list");
    list.innerHTML = "";

    const dayTasks = state.calendar.weekly[day] || [];
    dayTasks.forEach((taskInst, idx) => {
      const item = document.createElement("div");
      item.className = "day-task-item";

      let assigneeHTML = "";
      if (state.isUnlocked) {
        // Simple text input for names so they can write multiple separated by comma
        assigneeHTML = `<input type="text" id="edit-task-${day}-${idx}" class="day-task-assignee-edit" value="${escapeHtml(taskInst.assigned.join(', '))}" placeholder="Nomi separati da virgola">`;
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
        ${state.people.map(p => `<option value="${escapeHtml(p.name)}" ${assignee === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
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
        ${state.people.map(p => `<option value="${escapeHtml(p.name)}" ${shiftM === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
      </select>`;

      tdP.innerHTML = `<select id="edit-laundry-pomeriggio-${day}" class="input-field" style="padding: 6px; font-size: 12px; width: 100%;">
        <option value="">-</option>
        ${state.people.map(p => `<option value="${escapeHtml(p.name)}" ${shiftP === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
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
    state.tasks.forEach(t => {
      const linked = state.tasks.find(lt => lt.id === t.linkedTask);
      const linkedStr = linked ? ` (Se assegnata, l'addetto svolge anche '${linked.name}')` : "";
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(t.name)}</strong>: priorità ${t.priority}, minimo ${t.minPeople} addetti.${linkedStr}`;
      taskExplanations.appendChild(li);
    });
  }
}

// GENERATION WIZARD LOGIC
function resetWizard() {
  genStepInit.classList.add("active");
  genStepAbsent.classList.remove("active");
  genStepDetails.classList.remove("active");
  wizardSelectedAbsent = [];
}

function startWizard() {
  genStepInit.classList.remove("active");
  genStepAbsent.classList.add("active");

  // Populate wizard people list
  wizardPeopleList.innerHTML = "";
  // Filter only cadets, admins are excluded from manual chores unless added as cadets
  const cadets = state.people.filter(p => p.role === "cadetto");

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

  if (wizardSelectedAbsent.length === 0) {
    // No absences! We can jump directly to calendar generation or show step 2 empty.
    // Let's proceed to Step 2 but it will have no rows, and we can directly generate.
    // However, users might want to confirm zero absences.
  }

  genStepAbsent.classList.remove("active");
  genStepDetails.classList.add("active");

  // Populate Step 2 Table
  absenceTableBody.innerHTML = "";
  if (wizardSelectedAbsent.length === 0) {
    absenceTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nessuna persona assente selezionata. Clicca su Genera Calendario per completare.</td></tr>`;
    return;
  }

  wizardSelectedAbsent.forEach(p => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-person-id", p.id);
    
    let daysHTML = "";
    WIZARD_DAYS.forEach(day => {
      // Unchecked by default (present); spunta solo i giorni in cui è assente
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

  // Gather absence data
  const absences = {}; // { personId: [absentDays] }
  
  if (wizardSelectedAbsent.length > 0) {
    const rows = absenceTableBody.querySelectorAll("tr[data-person-id]");
    rows.forEach(row => {
      const pId = row.getAttribute("data-person-id");
      absences[pId] = [];
      const boxes = row.querySelectorAll('input[type="checkbox"]:checked');
      boxes.forEach(box => {
        absences[pId].push(box.getAttribute("data-day").toLowerCase());
      });
    });
  }

  // Filter people into rosters
  // Fully present, partially present, and fully absent
  const fullyPresentCadets = [];
  const partiallyAbsentCadets = []; // { person, absentDays, presentDays }
  const excludedCadets = []; // Fully absent (absent all 7 days)

  const cadets = state.people.filter(p => p.role === "cadetto");

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

  DAYS_OF_WEEK.forEach(day => {
    newCalendar.weekly[day] = [];
    const dailyRoster = getPresentCadetsForDay(day);

    if (dailyRoster.length === 0) {
      return; // No one present on this day
    }

    // Track assigned people on this day to avoid assigning same person to same/multiple tasks on same day if avoidable
    const dailyAssignedIds = new Set();

    // Separate primary tasks and connected tasks
    // Connected tasks copy assignees from their parent task
    sortedTasks.forEach(task => {
      // If it's a connected task, skip direct assignment
      if (task.linkedTask !== "none") return;

      const minP = task.minPeople;
      const assignedCadets = [];

      // Select minP people from dailyRoster, prioritizing those with least daily assignments and overall load
      for (let i = 0; i < minP; i++) {
        // Filter out people already assigned to THIS task
        let candidates = dailyRoster.filter(c => !assignedCadets.includes(c));

        if (candidates.length === 0) break;

        // Sort candidates:
        // 1. Not already assigned to ANY task today (to spread daily work)
        // 2. Least overall load counts
        candidates.sort((a, b) => {
          const aToday = dailyAssignedIds.has(a.id) ? 1 : 0;
          const bToday = dailyAssignedIds.has(b.id) ? 1 : 0;
          if (aToday !== bToday) return aToday - bToday;
          return loadCounts[a.id] - loadCounts[b.id];
        });

        const selected = candidates[0];
        assignedCadets.push(selected);
        dailyAssignedIds.add(selected.id);
        loadCounts[selected.id]++;
      }

      // Add task instance to calendar day
      newCalendar.weekly[day].push({
        taskId: task.id,
        name: task.name,
        assigned: assignedCadets.map(c => c.name)
      });

      // Find if there are tasks linked to this task, and assign the same people
      const linkedChildren = sortedTasks.filter(t => t.linkedTask === task.id);
      linkedChildren.forEach(child => {
        newCalendar.weekly[day].push({
          taskId: child.id,
          name: child.name,
          assigned: assignedCadets.map(c => c.name) // Copy assignees
        });
        // Increment load counts for the linked tasks as well
        assignedCadets.forEach(c => {
          loadCounts[c.id]++;
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
  // We assign a single primary person from activeCadets to each zone.
  // We also specify helpers: partially present cadets are added as helpers to zones on the days they are present.
  
  // Sort zones
  const zones = [...state.houseParts];

  // Assign primary people to zones
  zones.forEach((zone, idx) => {
    // Sort active cadets by current load count ascending
    activeCadets.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
    const primary = activeCadets[0];

    newCalendar.houseCleaning[zone.id] = {
      assigned: primary.name,
      helpers: []
    };

    loadCounts[primary.id] += 3; // House cleaning carries more weight
  });

  // Distribute partially absent cadets as helpers to the house cleaning zones
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
  // Assign one person per day from Thursday to Wednesday.
  DAYS_OF_WEEK.forEach(day => {
    const dailyRoster = getPresentCadetsForDay(day);
    if (dailyRoster.length > 0) {
      dailyRoster.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
      const selected = dailyRoster[0];
      newCalendar.eveningCheck[day] = selected.name;
      loadCounts[selected.id] += 0.5; // Small weight
    }
  });

  // 5. LAUNDRY TABLE (LAVANDERIA)
  // Rotate assignments for morning/afternoon shifts.
  // Rule: Laundry table must not repeat names before 2 days or 4 shifts.
  // There are 14 shifts sequentially: (Thur-M, Thur-P, Fri-M, Fri-P, Sat-M, Sat-P, Sun-M, Sun-P, Mon-M, Mon-P, Tue-M, Tue-P, Wed-M, Wed-P)
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

  shiftList.forEach((shiftObj, index) => {
    const dailyRoster = getPresentCadetsForDay(shiftObj.day);
    if (dailyRoster.length === 0) return;

    // Only consider people who have gone at least MIN_SHIFT_GAP shifts without laundry duty
    let candidates = dailyRoster.filter(c => (index - lastAssignedShiftIndex[c.id]) >= MIN_SHIFT_GAP);

    if (candidates.length === 0) {
      // Fallback: too few people present to strictly satisfy the rule (heavy absences).
      // Pick whoever in the roster has gone longest without a laundry shift.
      dailyRoster.sort((a, b) => lastAssignedShiftIndex[a.id] - lastAssignedShiftIndex[b.id]);
      candidates = [dailyRoster[0]];
    }

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
  localStorage.setItem(STORAGE_CALENDAR, JSON.stringify(newCalendar));

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

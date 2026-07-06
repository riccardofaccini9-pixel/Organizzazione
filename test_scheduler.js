// Test isolation script for the scheduler algorithm
const DAYS_OF_WEEK = ["giovedì", "venerdì", "sabato", "domenica", "lunedì", "martedì", "mercoledì"];
const WIZARD_DAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const HOUSE_PARTS = ["Cucina", "Bagno Primo Piano", "Bagno Secondo Piano", "Salotto & Corridoio", "Scale & Vetrate"];

// Sample data
const people = [
  { id: "admin-default", name: "ADMIN", role: "admin" },
  { id: "p1", name: "Mario Rossi", role: "cadetto" },
  { id: "p2", name: "Luigi Verdi", role: "cadetto" },
  { id: "p3", name: "Anna Bianchi", role: "cadetto" },
  { id: "p4", name: "Sofia Neri", role: "cadetto" },
  { id: "p5", name: "Luca Gialli", role: "cadetto" },
  { id: "p6", name: "Elena Viola", role: "cadetto" },
  { id: "p7", name: "Marco Bruno", role: "cadetto" }
];

const tasks = [
  { id: "t1", name: "Lavare i piatti", minPeople: 2, priority: 1, linkedTask: "none" },
  { id: "t2", name: "Cucinare pranzo", minPeople: 1, priority: 2, linkedTask: "none" },
  { id: "t3", name: "Cucinare cena", minPeople: 2, priority: 3, linkedTask: "none" },
  { id: "t4", name: "Buttare spazzatura", minPeople: 1, priority: 4, linkedTask: "none" },
  { id: "t5", name: "Asciugare stoviglie", minPeople: 1, priority: 5, linkedTask: "t1" }
];

// Absences input: Mario Rossi and Luigi Verdi have partial absences
const absences = {
  "p1": ["lunedì", "martedì"],
  "p2": ["mercoledì", "giovedì", "venerdì", "sabato", "domenica"] // present only 2 days
};

function testScheduler() {
  const newCalendar = {
    meterAssignee: "",
    houseCleaning: {},
    weekly: {},
    eveningCheck: {},
    laundry: { mattina: {}, pomeriggio: {} },
    exceptions: []
  };

  HOUSE_PARTS.forEach(part => {
    newCalendar.houseCleaning[part] = { assigned: "", helpers: [] };
  });

  DAYS_OF_WEEK.forEach(day => {
    newCalendar.weekly[day] = [];
    newCalendar.eveningCheck[day] = "";
    newCalendar.laundry.mattina[day] = "";
    newCalendar.laundry.pomeriggio[day] = "";
  });

  const fullyPresentCadets = [];
  const partiallyAbsentCadets = [];
  const excludedCadets = [];

  const cadets = people.filter(p => p.role === "cadetto");

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
    console.error("No active cadets available!");
    return;
  }

  function isCadetPresent(cadet, dayName) {
    const pId = cadet.id;
    const cadetAbsences = absences[pId] || [];
    return !cadetAbsences.includes(dayName.toLowerCase());
  }

  function getPresentCadetsForDay(dayName) {
    return activeCadets.filter(c => isCadetPresent(c, dayName));
  }

  const loadCounts = {};
  activeCadets.forEach(c => { loadCounts[c.id] = 0; });

  const sortedTasks = [...tasks].sort((a, b) => a.priority - b.priority);

  DAYS_OF_WEEK.forEach(day => {
    const dailyRoster = getPresentCadetsForDay(day);
    if (dailyRoster.length === 0) return;
    const dailyAssignedIds = new Set();

    sortedTasks.forEach(task => {
      if (task.linkedTask !== "none") return;
      const minP = task.minPeople;
      const assignedCadets = [];

      for (let i = 0; i < minP; i++) {
        let candidates = dailyRoster.filter(c => !assignedCadets.includes(c));
        if (candidates.length === 0) break;

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

      newCalendar.weekly[day].push({
        taskId: task.id,
        name: task.name,
        assigned: assignedCadets.map(c => c.name)
      });

      const linkedChildren = sortedTasks.filter(t => t.linkedTask === task.id);
      linkedChildren.forEach(child => {
        newCalendar.weekly[day].push({
          taskId: child.id,
          name: child.name,
          assigned: assignedCadets.map(c => c.name)
        });
        assignedCadets.forEach(c => {
          loadCounts[c.id]++;
        });
      });
    });
  });

  // METER
  let meterCandidate = null;
  if (fullyPresentCadets.length > 0) {
    fullyPresentCadets.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
    meterCandidate = fullyPresentCadets[0];
  } else {
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
    loadCounts[meterCandidate.id] += 2;
  }

  // CLEANING
  const zones = [...HOUSE_PARTS];
  zones.forEach((zone, idx) => {
    activeCadets.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
    const primary = activeCadets[0];
    newCalendar.houseCleaning[zone] = { assigned: primary.name, helpers: [] };
    loadCounts[primary.id] += 3;
  });

  partiallyAbsentCadets.forEach((item, idx) => {
    const targetZone = zones[idx % zones.length];
    newCalendar.houseCleaning[targetZone].helpers.push({
      name: item.person.name,
      days: item.presentDays.map(d => d.slice(0, 3))
    });
  });

  // EVENING
  DAYS_OF_WEEK.forEach(day => {
    const dailyRoster = getPresentCadetsForDay(day);
    if (dailyRoster.length > 0) {
      dailyRoster.sort((a, b) => loadCounts[a.id] - loadCounts[b.id]);
      const selected = dailyRoster[0];
      newCalendar.eveningCheck[day] = selected.name;
      loadCounts[selected.id] += 0.5;
    }
  });

  // LAUNDRY
  const shiftList = [];
  DAYS_OF_WEEK.forEach(day => {
    shiftList.push({ day, shift: "mattina" });
    shiftList.push({ day, shift: "pomeriggio" });
  });

  const recentLaundryAssignees = [];
  const laundryLoadCounts = {};
  activeCadets.forEach(c => { laundryLoadCounts[c.id] = 0; });

  shiftList.forEach((shiftObj, index) => {
    const dailyRoster = getPresentCadetsForDay(shiftObj.day);
    if (dailyRoster.length === 0) return;

    let candidates = dailyRoster.filter(c => !recentLaundryAssignees.includes(c.id));
    if (candidates.length === 0) {
      dailyRoster.sort((a, b) => {
        const idxA = recentLaundryAssignees.indexOf(a.id);
        const idxB = recentLaundryAssignees.indexOf(b.id);
        return idxA - idxB;
      });
      candidates = [dailyRoster[0]];
    }

    candidates.sort((a, b) => laundryLoadCounts[a.id] - laundryLoadCounts[b.id]);
    const selected = candidates[0];

    newCalendar.laundry[shiftObj.shift][shiftObj.day] = selected.name;
    laundryLoadCounts[selected.id]++;
    loadCounts[selected.id] += 1;

    recentLaundryAssignees.push(selected.id);
    if (recentLaundryAssignees.length > 4) {
      recentLaundryAssignees.shift();
    }
  });

  return newCalendar;
}

// Verification functions
const cal = testScheduler();
console.log("=== VERIFYING SCHEDULE GENERATION ===");
console.log("Meter Assignee:", cal.meterAssignee);
console.log("House Cleaning Assignments:", JSON.stringify(cal.houseCleaning, null, 2));

// Verify Laundry spacing constraint
// "la tabella della lavanderia non deve ripetere i nomi delle persone prima di 2 giorni o 4 turni"
const chronologicalLaundry = [];
DAYS_OF_WEEK.forEach(day => {
  chronologicalLaundry.push(cal.laundry.mattina[day]);
  chronologicalLaundry.push(cal.laundry.pomeriggio[day]);
});

console.log("\nLaundry Chronological Assignments:");
chronologicalLaundry.forEach((name, idx) => {
  const day = DAYS_OF_WEEK[Math.floor(idx / 2)];
  const shift = idx % 2 === 0 ? "Mattina" : "Pomeriggio";
  console.log(`Shift ${idx + 1} [${day} ${shift}]: ${name}`);
});

let violations = 0;
for (let i = 0; i < chronologicalLaundry.length; i++) {
  const current = chronologicalLaundry[i];
  if (!current) continue;
  
  // Check the next 3 shifts (so total gap of 4 turns)
  for (let j = 1; j <= 3; j++) {
    if (i + j < chronologicalLaundry.length) {
      const next = chronologicalLaundry[i + j];
      if (current === next) {
        console.error(`VIOLATION: ${current} repeated at shift ${i+1} and shift ${i+j+1}! Gap is only ${j} shifts.`);
        violations++;
      }
    }
  }
}

if (violations === 0) {
  console.log("\n✅ SUCCESS: No laundry shift repetition violations found (4 shift spacing satisfied)!");
} else {
  console.error(`\n❌ FAILED: Found ${violations} laundry violations.`);
  process.exit(1);
}

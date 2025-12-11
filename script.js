// ============================================
// 1. IMPORTS & DEPENDENCIES
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  onSnapshot,
  setLogLevel,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// ============================================
// 2. GLOBAL VARIABLES & CONFIG
// ============================================
let dbAttendance, dbLeave, dbEmployeeList, dbShift, authAttendance;
let allEmployees = [];
let currentMonthRecords = [];
let attendanceRecords = [];
let leaveRecords = [];
let currentUser = null;
let currentUserShift = null;

// Listeners
let attendanceCollectionRef = null;
let attendanceListener = null;
let leaveCollectionListener = null;
let outCollectionListener = null;
let sessionCollectionRef = null;
let sessionListener = null;

// System & AI
let currentDeviceId = null;
let modelsLoaded = false;
let globalFaceMatcher = null;
let isProcessingFaces = false;
let currentScanAction = null;
let videoStream = null;
let isScanning = false;

// --- SECURITY & LIVENESS CONFIG (កែសម្រួលថ្មី) ---
let livenessStep = 0;

// 🔥 កែសម្រួលចំណុចនេះ៖ កាន់តែតូច កាន់តែតឹងរ៉ឹង (ការពារអ្នកផ្សេងស្កេនចូល)
// 0.6 = ធូរ (ងាយច្រឡំ)
// 0.4 = តឹង (សុវត្ថិភាពខ្ពស់ តែត្រូវដាក់មុខឱ្យចំល្អ)
const FACE_MATCH_THRESHOLD = 0.35;

const SMILE_THRESHOLD = 0.7;
const TURN_HEAD_THRESHOLD_L = 0.65;
const TURN_HEAD_THRESHOLD_R = 0.35;

const PLACEHOLDER_IMG = "https://placehold.co/80x80/e2e8f0/64748b?text=No+Img";

// Shift Settings & Geofence
const shiftSettings = {
  ពេញម៉ោង: {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "04:30 PM",
    endCheckOut: "11:50 PM",
  },
  ពេលយប់: {
    startCheckIn: "05:00 PM",
    endCheckIn: "07:50 PM",
    startCheckOut: "08:55 PM",
    endCheckOut: "11:50 PM",
  },
  មួយព្រឹក: {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "11:30 AM",
    endCheckOut: "11:50 PM",
  },
  មួយរសៀល: {
    startCheckIn: "12:00 PM",
    endCheckIn: "02:30 PM",
    startCheckOut: "05:30 PM",
    endCheckOut: "11:50 PM",
  },
};

const allowedAreaCoords = [
  [11.415358553782031, 104.76425971333194],
  [11.415396647086652, 104.76417520945697],
  [11.413728006581826, 104.76335812158045],
  [11.413685939938224, 104.76344127006257],
];

// --- Firebase Configurations ---
const firebaseConfigAttendance = {
  apiKey: "AIzaSyCgc3fq9mDHMCjTRRHD3BPBL31JkKZgXFc",
  authDomain: "checkme-10e18.firebaseapp.com",
  databaseURL: "https://checkme-10e18-default-rtdb.firebaseio.com",
  projectId: "checkme-10e18",
  storageBucket: "checkme-10e18.firebasestorage.app",
  messagingSenderId: "1030447497157",
  appId: "1:1030447497157:web:9792086df1e864559fd5ac",
  measurementId: "G-QCJ2JH4WH6",
};

const firebaseConfigLeave = {
  apiKey: "AIzaSyDjr_Ha2RxOWEumjEeSdluIW3JmyM76mVk",
  authDomain: "dipermisstion.firebaseapp.com",
  projectId: "dipermisstion",
  storageBucket: "dipermisstion.firebasestorage.app",
  messagingSenderId: "512999406057",
  appId: "1:512999406057:web:953a281ab9dde7a9a0f378",
  measurementId: "G-KDPHXZ7H4B",
};

const firebaseConfigEmployeeList = {
  apiKey: "AIzaSyAc2g-t9A7du3K_nI2fJnw_OGxhmLfpP6s",
  authDomain: "dilistname.firebaseapp.com",
  databaseURL: "https://dilistname-default-rtdb.firebaseio.com",
  projectId: "dilistname",
  storageBucket: "dilistname.firebasestorage.app",
  messagingSenderId: "897983357871",
  appId: "1:897983357871:web:42a046bc9fb3e0543dc55a",
  measurementId: "G-NQ798D9J6K",
};

// ============================================
// 3. DOM ELEMENTS
// ============================================
const $ = (id) => document.getElementById(id);

// Views
const loadingView = $("loadingView");
const startView = $("startView");
const homeView = $("homeView");
const historyView = $("historyView");

// Start Screen Elements
const startScanButton = $("startScanButton");
const aiLoadingStatus = $("aiLoadingStatus");
const scanBtnIconWrapper = $("scanBtnIconWrapper");
const scanBtnText = $("scanBtnText");

// Home Elements
const footerNav = $("footerNav");
const navHomeButton = $("navHomeButton");
const navHistoryButton = $("navHistoryButton");
const logoutButton = $("logoutButton");
const exitAppButton = $("exitAppButton");

// Profile Elements
const profileImage = $("profileImage");
const profileName = $("profileName");
const profileId = $("profileId");
const profileDepartment = $("profileDepartment");
const profileGroup = $("profileGroup");
const profileShift = $("profileShift");

// Action Elements
const actionButtonContainer = $("actionButtonContainer");
const actionBtnBg = $("actionBtnBg");
const actionBtnTitle = $("actionBtnTitle");
const actionBtnSubtitle = $("actionBtnSubtitle");
const actionBtnIcon = $("actionBtnIcon");
const statusMessageContainer = $("statusMessageContainer");
const statusTitle = $("statusTitle");
const statusDesc = $("statusDesc");
const statusIcon = $("statusIcon");
const statusIconBg = $("statusIconBg");
const noShiftContainer = $("noShiftContainer");
const todayActivitySection = $("todayActivitySection");
const shiftStatusIndicator = $("shiftStatusIndicator");

// History & Modal Elements
const historyContainer = $("historyContainer");
const monthlyHistoryContainer = $("monthlyHistoryContainer");
const customModal = $("customModal");
const cameraModal = $("cameraModal");
const videoElement = $("videoElement");
const cameraCloseButton = $("cameraCloseButton");
const cameraLoadingText = $("cameraLoadingText");

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

function changeView(viewId) {
  // Hide all views first
  [loadingView, startView, homeView, historyView].forEach((v) => {
    if (v) v.style.display = "none";
  });

  const view = $(viewId);
  if (view) view.style.display = "flex";

  // Handle Footer Nav visibility
  if (footerNav) {
    if (viewId === "homeView" || viewId === "historyView") {
      footerNav.style.display = "block";
    } else {
      footerNav.style.display = "none";
    }
  }
}

function showMessage(title, message, isError = false) {
  const iconColor = isError ? "text-red-500" : "text-blue-500";
  const bgColor = isError ? "bg-red-50" : "bg-blue-50";
  const iconName = isError ? "ph-warning-circle" : "ph-info";

  const modalContent = `
    <div class="modal-box-design">
      <div class="status-icon-wrapper ${bgColor} ${iconColor}">
        <i class="ph-fill ${iconName}"></i>
      </div>
      <h3 class="modal-title-text">${title}</h3>
      <p class="modal-body-text">${message}</p>
      <button id="modalConfirmButtonAction" class="modal-btn modal-btn-primary">
        យល់ព្រម
      </button>
    </div>
  `;

  if (customModal) {
    customModal.innerHTML = modalContent;
    const btn = $("modalConfirmButtonAction");
    if (btn) btn.onclick = hideMessage;
    customModal.classList.remove("modal-hidden");
    customModal.classList.add("modal-visible");
  }
}

function showConfirmation(title, message, confirmText, onConfirm) {
  const isDangerAction =
    title === "Log Out" || title === "Exit" || title === "ចាកចេញ";
  const confirmBtnClass = isDangerAction
    ? "modal-btn-danger"
    : "modal-btn-primary";

  let iconHtml = isDangerAction
    ? `<div class="status-icon-wrapper bg-red-50 text-red-500"><i class="ph-duotone ph-sign-out"></i></div>`
    : `<div class="status-icon-wrapper bg-orange-50 text-orange-500"><i class="ph-fill ph-question"></i></div>`;

  const modalContent = `
    <div class="modal-box-design">
      ${iconHtml}
      <h3 class="modal-title-text">${title}</h3>
      <p class="modal-body-text">${message}</p>
      <div class="grid grid-cols-2 gap-3 mt-4">
        <button id="modalCancelBtn" class="modal-btn modal-btn-secondary">បោះបង់</button>
        <button id="modalOkBtn" class="modal-btn ${confirmBtnClass}">${confirmText}</button>
      </div>
    </div>
  `;

  if (customModal) {
    customModal.innerHTML = modalContent;
    const cancelBtn = $("modalCancelBtn");
    const okBtn = $("modalOkBtn");
    if (cancelBtn) cancelBtn.onclick = hideMessage;
    if (okBtn)
      okBtn.onclick = () => {
        hideMessage();
        setTimeout(onConfirm, 200);
      };
    customModal.classList.remove("modal-hidden");
    customModal.classList.add("modal-visible");
  }
}

function hideMessage() {
  if (customModal) {
    customModal.classList.add("modal-hidden");
    customModal.classList.remove("modal-visible");
  }
}

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  try {
    const day = String(date.getDate()).padStart(2, "0");
    const month = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return "";
  }
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

function parseTimeStringToDecimal(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const cleanStr = timeStr.replace(/[^a-zA-Z0-9:]/g, "");
  const match = cleanStr.match(/(\d+):(\d+)(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  else if (ampm === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
}

function checkShiftTime(shiftType, checkType) {
  if (!shiftType || shiftType === "N/A" || shiftType === "None") return false;
  if (shiftType === "Uptime") return true;
  const settings = shiftSettings[shiftType];
  if (!settings) return false;

  let startStr, endStr;
  if (checkType === "checkIn") {
    startStr = settings.startCheckIn;
    endStr = settings.endCheckIn;
  } else {
    startStr = settings.startCheckOut;
    endStr = settings.endCheckOut;
  }
  if (!startStr || !endStr) return false;
  const minTime = parseTimeStringToDecimal(startStr);
  const maxTime = parseTimeStringToDecimal(endStr);
  if (minTime === null || maxTime === null) return false;

  const now = new Date();
  const currentTime = now.getHours() + now.getMinutes() / 60;

  if (minTime > maxTime)
    return currentTime >= minTime || currentTime <= maxTime;
  else return currentTime >= minTime && currentTime <= maxTime;
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("កម្មវិធីមិនគាំទ្រការប្រើប្រាស់ទីតាំងលើឧបករណ៍នេះទេ"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (error) => {
        let msg = "សូមបើក Location";
        if (error.code === error.PERMISSION_DENIED)
          msg = "សូមបើក Location ក្នុង Setting។";
        else if (error.code === error.POSITION_UNAVAILABLE)
          msg = "មិនអាចស្វែងរកទីតាំងបានទេ។";
        else if (error.code === error.TIMEOUT)
          msg = "ការស្វែងរកទីតាំងចំណាយពេលយូរពេក។";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function isInsideArea(lat, lon) {
  const polygon = allowedAreaCoords;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const viy = polygon[i][0],
      vix = polygon[i][1];
    const vjy = polygon[j][0],
      vjx = polygon[j][1];
    if (
      viy > lat !== vjy > lat &&
      lon < ((vjx - vix) * (lat - viy)) / (vjy - viy) + vix
    ) {
      isInside = !isInside;
    }
  }
  return isInside;
}

// ============================================
// 5. DATA PROCESSING & RENDERING
// ============================================

function mergeAttendanceAndLeave(attendanceRecords, leaveRecords) {
  const mergedMap = new Map();
  attendanceRecords.forEach((r) => mergedMap.set(r.date, { ...r }));
  return Array.from(mergedMap.values());
}

async function mergeAndRenderHistory() {
  currentMonthRecords = mergeAttendanceAndLeave(
    attendanceRecords,
    leaveRecords
  );
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, "0");
  const currentYearStr = String(now.getFullYear());
  const monthPrefix = `${currentYearStr}-${currentMonthStr}`;

  currentMonthRecords = currentMonthRecords.filter((r) =>
    r.date.startsWith(monthPrefix)
  );
  const todayString = getTodayDateString();

  currentMonthRecords.sort((a, b) => {
    if (a.date === todayString) return -1;
    if (b.date === todayString) return 1;
    return b.date.localeCompare(a.date);
  });

  renderTodayHistory();
  renderMonthlyHistory();
  updateButtonState();
}

function renderTodayHistory() {
  if (!historyContainer) return;
  historyContainer.innerHTML = "";
  const todayString = getTodayDateString();
  const todayRecord = currentMonthRecords.find(
    (record) => record.date === todayString
  );
  const card = document.createElement("div");
  card.className =
    "animate-slide-up bg-white/80 backdrop-blur-md p-5 rounded-[1.8rem] border border-blue-50 shadow-sm card-hover-effect";

  if (!todayRecord) {
    card.innerHTML = `
      <div class="flex flex-col items-center justify-center py-6 text-slate-300">
        <i class="ph-duotone ph-clipboard-text text-4xl mb-2 opacity-50"></i>
        <p class="text-xs font-medium">មិនទាន់មានទិន្នន័យថ្ងៃនេះ</p>
      </div>`;
  } else {
    const checkIn = todayRecord.checkIn || "--:--";
    const checkOut = todayRecord.checkOut || "មិនទាន់ចេញ";
    const ciColor = todayRecord.checkIn
      ? "text-green-600 bg-green-50"
      : "text-slate-400 bg-slate-50";
    const coColor = todayRecord.checkOut
      ? "text-red-500 bg-red-50"
      : "text-slate-400 bg-slate-50";

    card.innerHTML = `
       <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-600 text-[10px] font-bold uppercase tracking-wider">Today</span>
            <span class="text-xs text-slate-400 font-medium">${todayRecord.formattedDate}</span>
          </div>
       </div>
       <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col items-center p-3 rounded-2xl ${ciColor} transition-all">
             <span class="text-[10px] opacity-70 mb-1">ចូល</span>
             <span class="text-lg font-bold tracking-tight">${checkIn}</span>
          </div>
          <div class="flex flex-col items-center p-3 rounded-2xl ${coColor} transition-all">
             <span class="text-[10px] opacity-70 mb-1">ចេញ</span>
             <span class="text-sm font-bold tracking-tight mt-1">${checkOut}</span>
          </div>
       </div>`;
  }
  historyContainer.appendChild(card);
}

function renderMonthlyHistory() {
  if (!monthlyHistoryContainer) return;
  monthlyHistoryContainer.innerHTML = "";
  if (currentMonthRecords.length === 0) {
    monthlyHistoryContainer.innerHTML = `<p class="text-center py-10 text-slate-400">មិនទាន់មានទិន្នន័យសម្រាប់ខែនេះ</p>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  currentMonthRecords.forEach((record, i) => {
    const checkIn = record.checkIn ? record.checkIn : "---";
    const checkOut = record.checkOut ? record.checkOut : "---";
    const ciClass = record.checkIn ? "text-blue-600" : "text-slate-400";
    const coClass = record.checkOut ? "text-blue-600" : "text-slate-400";
    const isToday = record.date === getTodayDateString();
    const bgClass = isToday
      ? "bg-blue-50 border-blue-100"
      : "bg-white border-slate-50";

    const card = document.createElement("div");
    card.className = `${bgClass} p-4 rounded-2xl shadow-sm border mb-3 list-item-anim`;
    card.style.animationDelay = `${i * 0.05}s`;

    card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
           <p class="text-sm font-bold text-slate-800">${
             record.formattedDate || record.date
           }
             ${
               isToday
                 ? '<span class="ml-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">Today</span>'
                 : ""
             }
           </p>
        </div>
        <div class="flex flex-col space-y-2 text-sm">
          <div class="flex justify-between border-b border-gray-100 pb-1">
            <span class="text-slate-500">ចូល</span>
            <span class="${ciClass} font-medium">${checkIn}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">ចេញ</span>
            <span class="${coClass} font-medium">${checkOut}</span>
          </div>
        </div>`;
    fragment.appendChild(card);
  });
  monthlyHistoryContainer.appendChild(fragment);
}

// ============================================
// 6. FIREBASE & LOGIC LISTENERS
// ============================================

function setupAttendanceListener() {
  if (!attendanceCollectionRef) return;
  if (attendanceListener) attendanceListener();

  attendanceListener = onSnapshot(attendanceCollectionRef, (querySnapshot) => {
    let allRecords = [];
    querySnapshot.forEach((doc) => allRecords.push(doc.data()));
    attendanceRecords = allRecords;
    mergeAndRenderHistory();

    // Animation
    const actionArea = $("dynamicActionArea");
    const activityArea = $("todayActivitySection");
    if (actionArea && activityArea) {
      actionArea.style.transition = "opacity 0.5s ease";
      activityArea.style.transition = "opacity 0.5s ease 0.1s";
      requestAnimationFrame(() => {
        actionArea.style.opacity = "1";
        activityArea.style.opacity = "1";
      });
    }
  });
}

function startLeaveListeners() {
  if (!dbLeave || !currentUser) return;
  const employeeId = currentUser.id;
  const reFetch = async () => {
    mergeAndRenderHistory();
  };

  try {
    const qLeave = query(
      collection(
        dbLeave,
        "artifacts/default-app-id/public/data/leave_requests"
      ),
      where("userId", "==", employeeId)
    );
    leaveCollectionListener = onSnapshot(qLeave, reFetch);
    const qOut = query(
      collection(dbLeave, "artifacts/default-app-id/public/data/out_requests"),
      where("userId", "==", employeeId)
    );
    outCollectionListener = onSnapshot(qOut, reFetch);
  } catch (error) {
    console.error("Error connecting to Leave DB:", error);
  }
}

function startSessionListener(employeeId) {
  if (sessionListener) sessionListener();
  const sessionDocRef = doc(sessionCollectionRef, employeeId);
  sessionListener = onSnapshot(sessionDocRef, (docSnap) => {
    if (!docSnap.exists()) {
      forceLogout("Session បានបញ្ចប់។");
      return;
    }
    const sessionData = docSnap.data();
    if (
      localStorage.getItem("currentDeviceId") &&
      sessionData.deviceId !== localStorage.getItem("currentDeviceId")
    ) {
      forceLogout("គណនីកំពុងប្រើនៅកន្លែងផ្សេង។");
    }
  });
}

// ============================================
// 7. FACE & CAMERA LOGIC
// ============================================

async function loadAIModels() {
  try {
    console.log("Loading AI Models...");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
      faceapi.nets.faceExpressionNet.loadFromUri("./models"),
    ]);
    modelsLoaded = true;
    console.log("AI Models Loaded Successfully.");

    // ប្រសិនបើទិន្នន័យបុគ្គលិកមកដល់មុន Model, ឥឡូវ Model មកដល់ហើយ ត្រូវរៀន
    if (allEmployees.length > 0 && !globalFaceMatcher) {
      prepareAllFaces();
    }
  } catch (e) {
    console.error("Error loading models:", e);
    if (aiLoadingStatus)
      aiLoadingStatus.innerText = "Error Loading AI Models (Check Console)";
  }
}

async function prepareAllFaces() {
  if (isProcessingFaces || allEmployees.length === 0 || !modelsLoaded) {
    console.log("Waiting to process faces...");
    return;
  }

  isProcessingFaces = true;
  console.log(
    "Starting Face Training for " + allEmployees.length + " employees..."
  );

  if (aiLoadingStatus)
    aiLoadingStatus.innerHTML =
      '<span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span> កំពុងរៀនមុខបុគ្គលិក... (0%)';
  if (startScanButton) {
    startScanButton.disabled = true;
    startScanButton.style.opacity = "0.7";
  }

  const labeledDescriptors = [];
  let processedCount = 0;

  for (const emp of allEmployees) {
    if (!emp.photoUrl) {
      processedCount++;
      continue;
    }

    try {
      const imgPromise = faceapi.fetchImage(emp.photoUrl);
      // Timeout 5s to prevent hang
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );
      const img = await Promise.race([imgPromise, timeoutPromise]);

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(emp.id, [detection.descriptor])
        );
      }
    } catch (e) {
      console.warn(`Skipping face for ${emp.name} (ID: ${emp.id}):`, e.message);
    }

    processedCount++;
    const progress = Math.round((processedCount / allEmployees.length) * 100);
    if (aiLoadingStatus)
      aiLoadingStatus.innerHTML = `<span class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span> កំពុងរៀនមុខបុគ្គលិក... (${progress}%)`;
  }

  if (labeledDescriptors.length > 0) {
    // 🔥 កំណត់ Threshold 0.4 នៅទីនេះ
    globalFaceMatcher = new faceapi.FaceMatcher(
      labeledDescriptors,
      FACE_MATCH_THRESHOLD
    );
    console.log("✅ AI Ready for all users!");

    if (aiLoadingStatus) {
      aiLoadingStatus.innerHTML =
        '<span class="w-2 h-2 bg-green-500 rounded-full"></span> ប្រព័ន្ធរួចរាល់';
      aiLoadingStatus.classList.add("text-green-600");
    }
    if (startScanButton) {
      startScanButton.disabled = false;
      startScanButton.style.opacity = "1";
      startScanButton.classList.add("cursor-pointer", "hover:scale-105");
      if (scanBtnIconWrapper)
        scanBtnIconWrapper.className =
          "w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-2 text-white shadow-lg shadow-blue-300";
      if (scanBtnText) scanBtnText.classList.add("text-blue-600");
    }
  } else {
    if (aiLoadingStatus)
      aiLoadingStatus.innerText = "មិនមានទិន្នន័យមុខដែលអាចប្រើបាន";
    console.warn("No valid faces found to train.");
  }
  isProcessingFaces = false;
}

async function startFaceScan(action) {
  currentScanAction = action;
  livenessStep = 0; // Reset Step

  if (!modelsLoaded || !globalFaceMatcher) {
    alert("AI មិនទាន់ដំណើរការ ឬទិន្នន័យមិនទាន់រៀបចំចប់។");
    return;
  }

  if (cameraModal) {
    cameraModal.classList.remove("modal-hidden");
    cameraModal.classList.add("modal-visible");
  }

  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    } catch (e) {
      console.warn("High-res camera failed, trying default.", e);
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }
    videoStream = stream;

    if (videoElement) {
      videoElement.srcObject = videoStream;
      videoElement.setAttribute("playsinline", "true");
      await videoElement.play().catch((e) => console.error("Play error:", e));
      isScanning = true;
      if (videoElement.readyState >= 3) scanLoop();
      else videoElement.oncanplay = () => scanLoop();
    }
  } catch (err) {
    console.error("Camera Error:", err);
    alert("មិនអាចបើកកាមេរ៉ាបានទេ។ សូមពិនិត្យ Permission។");
    hideCameraModal();
  }
}

function stopCamera() {
  isScanning = false;
  if (videoStream) videoStream.getTracks().forEach((t) => t.stop());
  if (videoElement) videoElement.srcObject = null;
}

function hideCameraModal() {
  stopCamera();
  if (cameraModal) {
    cameraModal.classList.add("modal-hidden");
    cameraModal.classList.remove("modal-visible");
  }
}

// --- UPDATED: FULL LIVENESS CHECK LOGIC ---
async function scanLoop() {
  if (!isScanning) return;
  if (videoElement.paused || videoElement.ended) return;

  if (!globalFaceMatcher) {
    if (cameraLoadingText)
      cameraLoadingText.textContent = "AI កំពុងរៀបចំទិន្នន័យ...";
    return setTimeout(scanLoop, 500);
  }

  // 🔥 កែសម្រួល៖ ប្រើ inputSize: 320 ដើម្បីឱ្យមើលឃើញមុខកាន់តែច្បាស់ (សុក្រឹតជាងមុន)
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });
  let detection;
  try {
    detection = await faceapi
      .detectSingleFace(videoElement, options)
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions();
  } catch (e) {
    return setTimeout(scanLoop, 100);
  }

  if (!detection) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "កំពុងស្វែងរកមុខ...";
      cameraLoadingText.className = "text-white font-bold text-lg mb-1";
    }
    return setTimeout(scanLoop, 50);
  }

  // 2. Identify User (Step 0)
  if (livenessStep === 0) {
    const bestMatch = globalFaceMatcher.findBestMatch(detection.descriptor);

    // 🔥 ប្រសិនបើមិនជាប់ Threshold 0.4 ទេ វានឹងចេញ unknown
    if (bestMatch.label === "unknown") {
      if (cameraLoadingText) {
        cameraLoadingText.textContent = "មិនស្គាល់គណនីនេះទេ";
        cameraLoadingText.className = "text-red-500 font-bold text-lg mb-1";
      }
      return setTimeout(scanLoop, 100);
    }

    const user = allEmployees.find((e) => e.id === bestMatch.label);
    if (user) {
      currentUser = user; // Set found user
      livenessStep = 1; // Move to Smile
    }
  }

  // Show status based on user
  if (cameraLoadingText && currentUser) {
    let instruction = "";
    let colorClass = "text-white";

    if (livenessStep === 1) {
      instruction = "សូមញញឹម (Smile)";
      colorClass = "text-yellow-400";
    } else if (livenessStep === 2) {
      instruction = "សូមងាកឆ្វេង (Turn Left)";
      colorClass = "text-blue-400";
    } else if (livenessStep === 3) {
      instruction = "សូមងាកស្តាំ (Turn Right)";
      colorClass = "text-blue-400";
    }

    cameraLoadingText.innerHTML = `សួស្តី, ${currentUser.name}<br/><span class="${colorClass} text-sm">${instruction}</span>`;
  }

  // 3. Process Liveness Steps
  const landmarks = detection.landmarks;
  const nose = landmarks.getNose()[3];
  const jaw = landmarks.getJawOutline();
  const leftJaw = jaw[0];
  const rightJaw = jaw[16];
  const faceWidth = rightJaw.x - leftJaw.x;
  const noseRel = nose.x - leftJaw.x;
  const turnRatio = noseRel / faceWidth;

  // STEP 1: SMILE
  if (livenessStep === 1) {
    const isSmiling = detection.expressions.happy > SMILE_THRESHOLD;
    if (isSmiling) {
      livenessStep = 2; // Pass -> Go Left
    }
  }
  // STEP 2: TURN LEFT (Ratio > Threshold)
  else if (livenessStep === 2) {
    if (turnRatio > TURN_HEAD_THRESHOLD_L) {
      livenessStep = 3; // Pass -> Go Right
    }
  }
  // STEP 3: TURN RIGHT (Ratio < Threshold)
  else if (livenessStep === 3) {
    if (turnRatio < TURN_HEAD_THRESHOLD_R) {
      livenessStep = 4; // Done
    }
  }
  // STEP 4: SUCCESS
  else if (livenessStep === 4) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "ជោគជ័យ!";
      cameraLoadingText.className =
        "text-green-400 font-bold text-lg mb-1 animate-pulse";
    }
    isScanning = false;
    processScanSuccess();
    return;
  }

  setTimeout(scanLoop, 30);
}

function processScanSuccess() {
  setTimeout(() => {
    const actionToPerform = currentScanAction;
    currentScanAction = null;
    hideCameraModal();

    if (actionToPerform === "login") {
      if (currentUser) {
        finalizeLogin(currentUser);
      } else {
        alert("រកមិនឃើញទិន្នន័យគណនី។");
      }
    } else if (actionToPerform === "checkIn") {
      handleCheckIn();
    } else if (actionToPerform === "checkOut") {
      handleCheckOut();
    }
  }, 800);
}

// ============================================
// 8. CHECK-IN / CHECK-OUT LOGIC
// ============================================

async function handleCheckIn() {
  if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";
  try {
    const coords = await getUserLocation();
    if (!isInsideArea(coords.latitude, coords.longitude)) {
      showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
      updateButtonState();
      return;
    }
    const now = new Date();
    const todayDocId = getTodayDateString(now);
    await setDoc(doc(attendanceCollectionRef, todayDocId), {
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      department: currentUser.department,
      shift: currentUserShift,
      date: todayDocId,
      checkInTimestamp: now.toISOString(),
      formattedDate: formatDate(now),
      checkIn: formatTime(now),
      checkInLocation: { lat: coords.latitude, lon: coords.longitude },
    });
  } catch (e) {
    showMessage("Error", e.message, true);
    updateButtonState();
  }
}

async function handleCheckOut() {
  if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";
  try {
    const coords = await getUserLocation();
    if (!isInsideArea(coords.latitude, coords.longitude)) {
      showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
      updateButtonState();
      return;
    }
    const now = new Date();
    const todayDocId = getTodayDateString(now);
    await setDoc(
      doc(attendanceCollectionRef, todayDocId),
      {
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        department: currentUser.department,
        shift: currentUserShift,
        date: todayDocId,
        formattedDate: formatDate(now),
        checkOutTimestamp: now.toISOString(),
        checkOut: formatTime(now),
        checkOutLocation: { lat: coords.latitude, lon: coords.longitude },
      },
      { merge: true }
    );
  } catch (e) {
    showMessage("Error", e.message, true);
    updateButtonState();
  }
}

function showActionButton(title, subtitle, icon, gradientClass, action) {
  if (!actionButtonContainer) return;
  actionButtonContainer.classList.remove("hidden");
  actionBtnTitle.textContent = title;
  actionBtnTitle.className = "text-xl font-bold text-white tracking-wide";
  actionBtnSubtitle.textContent = subtitle;
  actionBtnSubtitle.className =
    "text-blue-100 text-[11px] font-medium opacity-90";
  actionBtnIcon.className = `ph-bold ${icon} text-2xl text-white`;
  actionBtnBg.className = `absolute inset-0 bg-gradient-to-r ${gradientClass} shadow-lg transition-all duration-500`;

  const currentBtn = $("mainActionButton");
  if (currentBtn) {
    currentBtn.onclick = () => {
      if (action === "checkIn") handleCheckIn();
      else handleCheckOut();
    };
    const shadowColor = action === "checkIn" ? "blue" : "red";
    currentBtn.className = `w-full group relative overflow-hidden rounded-[1.8rem] p-1 shadow-lg shadow-${shadowColor}-300/50 transition-all active:scale-95 hover:shadow-xl btn-pulse`;
  }
}

function showStatusMessage(title, desc, icon, iconBgClass) {
  if (!statusMessageContainer) return;
  statusMessageContainer.classList.remove("hidden");
  statusTitle.textContent = title;
  statusDesc.textContent = desc;
  statusIcon.className = `ph-duotone ${icon} text-3xl`;
  statusIconBg.className = `w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${iconBgClass}`;
}

async function updateButtonState() {
  const todayString = getTodayDateString();
  const todayData = currentMonthRecords.find((r) => r.date === todayString);
  const shift = currentUserShift;
  const hasShift = shift && shift !== "N/A" && shift !== "None";

  if (actionButtonContainer) actionButtonContainer.classList.add("hidden");
  if (statusMessageContainer) statusMessageContainer.classList.add("hidden");
  if (noShiftContainer) noShiftContainer.classList.add("hidden");
  if (shiftStatusIndicator) shiftStatusIndicator.classList.add("hidden");

  if (!hasShift) {
    if (noShiftContainer) noShiftContainer.classList.remove("hidden");
    return;
  }

  const canCheckIn = checkShiftTime(shift, "checkIn");
  const canCheckOut = checkShiftTime(shift, "checkOut");

  if (todayData && todayData.checkOut) {
    showStatusMessage(
      "កត់ត្រារួចរាល់",
      "អ្នកបាន Check Out រួចរាល់ហើយ",
      "ph-check-circle",
      "bg-green-100 text-green-600"
    );
    return;
  }
  if (todayData && todayData.checkIn) {
    if (canCheckOut) {
      showActionButton(
        "Check Out",
        "ចុចទីនេះដើម្បីចាកចេញ",
        "ph-sign-out",
        "from-orange-500 to-red-600",
        "checkOut"
      );
    } else {
      showStatusMessage(
        "កំពុងបំពេញការងារ",
        "រង់ចាំដល់ម៉ោងចេញពីការងារ",
        "ph-hourglass",
        "bg-blue-100 text-blue-600"
      );
      if (statusIcon) statusIcon.classList.add("animate-breathe");
    }
  } else {
    if (canCheckIn) {
      showActionButton(
        "Check In",
        "ចុចទីនេះដើម្បីចូលធ្វើការ",
        "ph-sign-in",
        "from-blue-600 to-indigo-600",
        "checkIn"
      );
    } else if (canCheckOut) {
      showActionButton(
        "Check Out",
        "អ្នកមិនបាន Check In (ចុចដើម្បីចេញ)",
        "ph-sign-out",
        "from-orange-500 to-red-600",
        "checkOut"
      );
    } else {
      showStatusMessage(
        "ក្រៅម៉ោង Check-in",
        "សូមរង់ចាំដល់ម៉ោងកំណត់",
        "ph-clock-slash",
        "bg-slate-100 text-slate-400"
      );
    }
  }
}

// ============================================
// 9. USER LOGIN & INIT
// ============================================

async function finalizeLogin(employee) {
  if (!employee) {
    console.error("Login failed: No user data");
    return;
  }
  console.log("✅ Logged in as:", employee.name);
  currentUser = employee;
  localStorage.setItem("savedEmployeeId", employee.id);

  changeView("homeView");

  if (profileName) profileName.textContent = employee.name;
  if (profileId) profileId.textContent = `ID: ${employee.id}`;
  if (profileImage) profileImage.src = employee.photoUrl || PLACEHOLDER_IMG;

  const actionArea = $("dynamicActionArea");
  const activityArea = $("todayActivitySection");
  if (actionArea) actionArea.style.opacity = "0";
  if (activityArea) activityArea.style.opacity = "0";

  const dayOfWeek = new Date().getDay();
  const dayToShiftKey = [
    "shiftSun",
    "shiftMon",
    "shiftTue",
    "shiftWed",
    "shiftThu",
    "shiftFri",
    "shiftSat",
  ];
  currentUserShift = employee[dayToShiftKey[dayOfWeek]] || "N/A";

  if (profileDepartment)
    profileDepartment.textContent = employee.department || "N/A";
  if (profileGroup) profileGroup.textContent = employee.group || "N/A";
  if (profileShift) profileShift.textContent = currentUserShift;

  const firestoreUserId = employee.id;
  attendanceCollectionRef = collection(
    dbAttendance,
    `attendance/${firestoreUserId}/records`
  );

  currentDeviceId = self.crypto.randomUUID();
  localStorage.setItem("currentDeviceId", currentDeviceId);
  try {
    await setDoc(doc(sessionCollectionRef, employee.id), {
      deviceId: currentDeviceId,
      timestamp: new Date().toISOString(),
      employeeName: employee.name,
    });
  } catch (e) {
    console.warn("Session write failed:", e);
  }

  setupAttendanceListener();
  startLeaveListeners();
  startSessionListener(employee.id);
}

function logout() {
  currentUser = null;
  localStorage.removeItem("savedEmployeeId");
  if (attendanceListener) attendanceListener();
  if (sessionListener) sessionListener();
  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();

  attendanceRecords = [];
  leaveRecords = [];
  currentMonthRecords = [];

  if (historyContainer) historyContainer.innerHTML = "";
  if (monthlyHistoryContainer) monthlyHistoryContainer.innerHTML = "";

  changeView("startView");
}

function forceLogout(message) {
  logout();
  showMessage("Log Out", message, true);
}

// --- Fetch Employees & Auto-Prepare AI ---
function fetchEmployeesFromRTDB() {
  changeView("loadingView");
  const studentsRef = ref(dbEmployeeList, "students");
  onValue(
    studentsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        allEmployees = [];
        changeView("startView");
        if (aiLoadingStatus)
          aiLoadingStatus.innerText = "មិនមានទិន្នន័យបុគ្គលិក";
        return;
      }

      allEmployees = Object.keys(data)
        .map((key) => {
          const student = data[key];
          const schedule = student["កាលវិភាគ"] || {};
          return {
            id: String(key).trim(),
            name: student["ឈ្មោះ"] || "N.A",
            department: student["ផ្នែកការងារ"] || "N.A",
            photoUrl: student["រូបថត"] || null,
            group: student["ក្រុម"] || "N.A",
            shiftMon: schedule["ចន្ទ"] || null,
            shiftTue: schedule["អង្គារ"] || schedule["អង្គារ៍"] || null,
            shiftWed: schedule["ពុធ"] || null,
            shiftThu:
              schedule["ព្រហស្បតិ៍"] || schedule["ព្រហស្បត្តិ៍"] || null,
            shiftFri: schedule["សុក្រ"] || null,
            shiftSat: schedule["សៅរ៍"] || null,
            shiftSun: schedule["អាទិត្យ"] || null,
          };
        })
        .filter((emp) => {
          const group = (emp.group || "").trim();
          // FILTER: IT Support & DRB
          return group === "IT Support" || group === "DRB";
        });

      console.log(`Loaded ${allEmployees.length} employees for Face ID.`);
      changeView("startView");

      // Trigger AI learning
      if (modelsLoaded) {
        prepareAllFaces();
      } else {
        if (aiLoadingStatus) aiLoadingStatus.innerText = "រង់ចាំ AI Models...";
      }
    },
    (error) => {
      console.error(error);
      showMessage("Error", "បរាជ័យក្នុងការទាញយកទិន្នន័យពី Database");
      changeView("startView");
    }
  );
}

// ============================================
// 10. APP INITIALIZATION
// ============================================

function setupAuthListener() {
  onAuthStateChanged(authAttendance, (user) => {
    if (user) {
      console.log("Firebase Auth: Connected");
      loadAIModels();
    } else {
      console.log("Firebase Auth: Signing in...");
      signInAnonymously(authAttendance).catch((error) =>
        showMessage("បញ្ហា", `Login Error: ${error.message}`, true)
      );
    }
  });
}

async function initializeAppFirebase() {
  try {
    const attendanceApp = initializeApp(firebaseConfigAttendance);
    dbAttendance = getFirestore(attendanceApp);
    authAttendance = getAuth(attendanceApp);
    dbShift = getDatabase(attendanceApp);
    sessionCollectionRef = collection(dbAttendance, "active_sessions");
    const leaveApp = initializeApp(firebaseConfigLeave, "leaveApp");
    dbLeave = getFirestore(leaveApp);
    const employeeListApp = initializeApp(
      firebaseConfigEmployeeList,
      "employeeListApp"
    );
    dbEmployeeList = getDatabase(employeeListApp);
    setLogLevel("silent");

    setupAuthListener();
    fetchEmployeesFromRTDB();
  } catch (error) {
    console.error("Init Error:", error);
    alert("Error Initializing App: " + error.message);
  }
}

// Event Listeners
if (logoutButton)
  logoutButton.addEventListener("click", () =>
    showConfirmation("Log Out", "ចាកចេញមែនទេ?", "Yes", () => {
      logout();
    })
  );
if (exitAppButton)
  exitAppButton.addEventListener("click", () =>
    showConfirmation("Exit", "បិទកម្មវិធី?", "Yes", () => {
      window.close();
    })
  );
if (cameraCloseButton)
  cameraCloseButton.addEventListener("click", hideCameraModal);
if (navHomeButton)
  navHomeButton.addEventListener("click", () => {
    changeView("homeView");
    navHomeButton.classList.add("active-nav");
    navHistoryButton.classList.remove("active-nav");
  });
if (navHistoryButton)
  navHistoryButton.addEventListener("click", () => {
    changeView("historyView");
    navHistoryButton.classList.add("active-nav");
    navHomeButton.classList.remove("active-nav");
  });

// NEW: Start Scan Button Listener
if (startScanButton) {
  startScanButton.addEventListener("click", () => {
    if (!globalFaceMatcher) {
      alert("ប្រព័ន្ធកំពុងរៀបចំទិន្នន័យ សូមរង់ចាំបន្តិច...");
      return;
    }
    startFaceScan("login"); // Start scan to Login
  });
}

document.addEventListener("DOMContentLoaded", initializeAppFirebase);

/**
 * DriveX - Sell Your Car Form Controller
 * Multi-step wizard, real-time validation, photo manager, 360 media handler, and listing summary preview.
 */

// Global State for Seller Listing
const listingState = {
  currentStep: 1,
  totalSteps: 5,

  // 1. Vehicle Details
  brand: "",
  model: "",
  variant: "",
  mfgYear: "",
  regYear: "",
  kmDriven: "",
  fuelType: "",
  transmission: "",
  owners: "1",
  regState: "",
  regCity: "",
  regNumber: "",

  // 2. Price and Condition
  sellingPrice: "",
  isNegotiable: "yes",
  overallCondition: "excellent",
  engineCondition: "mint",
  accidentHistory: "clean",
  insuranceStatus: "comprehensive",
  insuranceExpiry: "",
  serviceHistory: "authorized",
  loanStatus: "none",
  description: "",

  // 3. Media
  photos: [], // Array of { id, file, url, name, isMain }
  media360: [], // Array of { id, file, url, name }

  // 4. Seller Information
  sellerName: "",
  whatsappNumber: "",
  email: "",
  contactTime: "anytime",
  isAuthorized: false,

  // 5. Final Confirmation
  finalConsent: false
};

// Currency Formatter
function formatINR(number) {
  if (!number || isNaN(number)) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(number);
}

// Convert INR to readable Lakhs
function formatToLakhs(amount) {
  const num = Number(amount);
  if (!num || isNaN(num)) return "";
  if (num >= 10000000) {
    return `(${(num / 10000000).toFixed(2)} Crore)`;
  }
  if (num >= 100000) {
    return `(${(num / 100000).toFixed(2)} Lakh)`;
  }
  return "";
}

document.addEventListener("DOMContentLoaded", () => {
  initStepper();
  initFormInputs();
  initPhotoUploader();
  init360Uploader();
  initPriceFormatter();
  updateStepView(1);
});

/* ===================================================
   1. Multi-Step Form Navigation & Stepper
   =================================================== */
function initStepper() {
  const stepItems = document.querySelectorAll(".step-item");
  stepItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetStep = Number(item.dataset.step);
      // Can only navigate to already completed steps or current step
      if (targetStep < listingState.currentStep) {
        saveCurrentStepData();
        listingState.currentStep = targetStep;
        updateStepView(targetStep);
      }
    });
  });

  // Next Buttons
  document.querySelectorAll(".btn-next-step").forEach(btn => {
    btn.addEventListener("click", () => {
      if (validateCurrentStep(listingState.currentStep)) {
        saveCurrentStepData();
        if (listingState.currentStep < listingState.totalSteps) {
          listingState.currentStep++;
          if (listingState.currentStep === 5) {
            populateReviewSummary();
          }
          updateStepView(listingState.currentStep);
          window.scrollTo({ top: 120, behavior: "smooth" });
        }
      }
    });
  });

  // Prev Buttons
  document.querySelectorAll(".btn-prev-step").forEach(btn => {
    btn.addEventListener("click", () => {
      if (listingState.currentStep > 1) {
        saveCurrentStepData();
        listingState.currentStep--;
        updateStepView(listingState.currentStep);
        window.scrollTo({ top: 120, behavior: "smooth" });
      }
    });
  });
}

function updateStepView(stepNumber) {
  // Update Stepper Progress
  const progressPercent = ((stepNumber - 1) / (listingState.totalSteps - 1)) * 100;
  const progressBar = document.getElementById("stepperProgress");
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  // Update Stepper Header Items
  document.querySelectorAll(".step-item").forEach(item => {
    const s = Number(item.dataset.step);
    item.classList.remove("active", "completed");
    if (s === stepNumber) {
      item.classList.add("active");
    } else if (s < stepNumber) {
      item.classList.add("completed");
    }
  });

  // Show Active Form Panel
  document.querySelectorAll(".form-panel").forEach(panel => {
    panel.classList.remove("active");
  });
  const targetPanel = document.getElementById(`stepPanel${stepNumber}`);
  if (targetPanel) {
    targetPanel.classList.add("active");
  }
}

/* ===================================================
   2. Input Binding & Live Feedback
   =================================================== */
function initFormInputs() {
  // Brand selection helper
  const brandSelect = document.getElementById("vehicleBrand");
  const modelInput = document.getElementById("vehicleModel");

  if (brandSelect && modelInput) {
    brandSelect.addEventListener("change", (e) => {
      listingState.brand = e.target.value;
      clearFieldError("vehicleBrand");
    });
  }

  // Live clear error on input
  const allInputs = document.querySelectorAll(".form-input, .form-select-custom, .form-textarea");
  allInputs.forEach(input => {
    input.addEventListener("input", () => {
      input.classList.remove("is-invalid");
      const err = document.getElementById(`${input.id}Error`);
      if (err) err.classList.remove("show");
    });
  });
}

function initPriceFormatter() {
  const priceInput = document.getElementById("sellingPrice");
  const priceLakhHint = document.getElementById("priceLakhHint");

  if (priceInput && priceLakhHint) {
    priceInput.addEventListener("input", (e) => {
      const val = Number(e.target.value.replace(/[^0-9]/g, ''));
      if (val > 0) {
        priceLakhHint.textContent = `${formatINR(val)} ${formatToLakhs(val)}`;
      } else {
        priceLakhHint.textContent = "";
      }
    });
  }
}

/* ===================================================
   3. Step Validation Engine
   =================================================== */
function validateCurrentStep(step) {
  let isValid = true;

  if (step === 1) {
    // 1. Vehicle Details Validation
    const brand = document.getElementById("vehicleBrand");
    const model = document.getElementById("vehicleModel");
    const variant = document.getElementById("vehicleVariant");
    const mfgYear = document.getElementById("mfgYear");
    const regYear = document.getElementById("regYear");
    const kmDriven = document.getElementById("kmDriven");
    const fuel = document.querySelector('input[name="sellFuelType"]:checked');
    const transmission = document.querySelector('input[name="sellTransmission"]:checked');
    const state = document.getElementById("regState");
    const city = document.getElementById("regCity");
    const regNo = document.getElementById("regNumber");

    if (!brand.value) { markInvalid("vehicleBrand", "Please select a brand"); isValid = false; }
    if (!model.value.trim()) { markInvalid("vehicleModel", "Please specify model name"); isValid = false; }
    if (!variant.value.trim()) { markInvalid("vehicleVariant", "Please specify variant / trim"); isValid = false; }
    
    const currentYear = new Date().getFullYear();
    const mfgY = Number(mfgYear.value);
    if (!mfgY || mfgY < 1995 || mfgY > currentYear) {
      markInvalid("mfgYear", `Year between 1995 and ${currentYear}`);
      isValid = false;
    }

    const regY = Number(regYear.value);
    if (!regY || regY < mfgY || regY > currentYear) {
      markInvalid("regYear", `Must be >= Manufacturing Year`);
      isValid = false;
    }

    const km = Number(kmDriven.value);
    if (isNaN(km) || km < 0 || kmDriven.value.trim() === "") {
      markInvalid("kmDriven", "Enter valid kilometres (0 or more)");
      isValid = false;
    }

    if (!fuel) {
      document.getElementById("fuelTypeError").classList.add("show");
      isValid = false;
    } else {
      document.getElementById("fuelTypeError").classList.remove("show");
    }

    if (!transmission) {
      document.getElementById("transTypeError").classList.add("show");
      isValid = false;
    } else {
      document.getElementById("transTypeError").classList.remove("show");
    }

    if (!state.value) { markInvalid("regState", "Select registration state"); isValid = false; }
    if (!city.value.trim()) { markInvalid("regCity", "Enter registration city"); isValid = false; }
    
    // Reg number check (e.g. MH 02 AB 1234 or similar)
    const cleanReg = regNo.value.replace(/[^A-Za-z0-9]/g, '');
    if (cleanReg.length < 6 || cleanReg.length > 11) {
      markInvalid("regNumber", "Enter valid RTO registration number (e.g. MH02AB1234)");
      isValid = false;
    }
  }

  else if (step === 2) {
    // 2. Price and Condition Validation
    const priceInput = document.getElementById("sellingPrice");
    const price = Number(priceInput.value);
    if (!price || price < 15000 || price > 500000000) {
      markInvalid("sellingPrice", "Enter realistic selling price (min ₹15,000)");
      isValid = false;
    }

    const insuranceStatus = document.getElementById("insuranceStatus");
    const insuranceExpiry = document.getElementById("insuranceExpiry");
    if (insuranceStatus.value !== "expired" && !insuranceExpiry.value) {
      markInvalid("insuranceExpiry", "Please enter insurance expiry date");
      isValid = false;
    }
  }

  else if (step === 3) {
    // 3. Photo Uploads Validation
    const photoError = document.getElementById("photoUploadError");
    if (listingState.photos.length < 2) {
      photoError.textContent = "Please upload at least 2 photos (Front, Rear, or Interior) to proceed.";
      photoError.classList.add("show");
      isValid = false;
    } else {
      photoError.classList.remove("show");
    }
  }

  else if (step === 4) {
    // 4. Seller Information Validation
    const name = document.getElementById("sellerName");
    const phone = document.getElementById("whatsappNumber");
    const email = document.getElementById("sellerEmail");
    const authCheck = document.getElementById("authCheck");

    if (!name.value.trim()) {
      markInvalid("sellerName", "Please enter your full name");
      isValid = false;
    }

    // Phone: Indian 10-digit format
    const cleanPhone = phone.value.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      markInvalid("whatsappNumber", "Enter a valid 10-digit WhatsApp phone number");
      isValid = false;
    }

    // Optional email validation
    if (email.value.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email.value.trim())) {
        markInvalid("sellerEmail", "Enter a valid email address");
        isValid = false;
      }
    }

    if (!authCheck.checked) {
      document.getElementById("authCheckError").classList.add("show");
      isValid = false;
    } else {
      document.getElementById("authCheckError").classList.remove("show");
    }
  }

  return isValid;
}

function markInvalid(inputId, message) {
  const input = document.getElementById(inputId);
  if (input) input.classList.add("is-invalid");
  const err = document.getElementById(`${inputId}Error`);
  if (err) {
    err.textContent = message;
    err.classList.add("show");
  }
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.classList.remove("is-invalid");
  const err = document.getElementById(`${inputId}Error`);
  if (err) err.classList.remove("show");
}

function saveCurrentStepData() {
  const step = listingState.currentStep;

  if (step === 1) {
    listingState.brand = document.getElementById("vehicleBrand").value;
    listingState.model = document.getElementById("vehicleModel").value.trim();
    listingState.variant = document.getElementById("vehicleVariant").value.trim();
    listingState.mfgYear = document.getElementById("mfgYear").value;
    listingState.regYear = document.getElementById("regYear").value;
    listingState.kmDriven = document.getElementById("kmDriven").value;
    
    const fuel = document.querySelector('input[name="sellFuelType"]:checked');
    if (fuel) listingState.fuelType = fuel.value;

    const trans = document.querySelector('input[name="sellTransmission"]:checked');
    if (trans) listingState.transmission = trans.value;

    const owner = document.querySelector('input[name="sellOwners"]:checked');
    if (owner) listingState.owners = owner.value;

    listingState.regState = document.getElementById("regState").value;
    listingState.regCity = document.getElementById("regCity").value.trim();
    listingState.regNumber = document.getElementById("regNumber").value.trim().toUpperCase();
  }

  else if (step === 2) {
    listingState.sellingPrice = document.getElementById("sellingPrice").value;
    const nego = document.querySelector('input[name="isNegotiable"]:checked');
    if (nego) listingState.isNegotiable = nego.value;

    const cond = document.querySelector('input[name="overallCondition"]:checked');
    if (cond) listingState.overallCondition = cond.value;

    listingState.engineCondition = document.getElementById("engineCondition").value;
    listingState.accidentHistory = document.getElementById("accidentHistory").value;
    listingState.insuranceStatus = document.getElementById("insuranceStatus").value;
    listingState.insuranceExpiry = document.getElementById("insuranceExpiry").value;
    listingState.serviceHistory = document.getElementById("serviceHistory").value;
    listingState.loanStatus = document.getElementById("loanStatus").value;
    listingState.description = document.getElementById("carDescription").value.trim();
  }

  else if (step === 4) {
    listingState.sellerName = document.getElementById("sellerName").value.trim();
    listingState.whatsappNumber = document.getElementById("whatsappNumber").value.trim();
    listingState.email = document.getElementById("sellerEmail").value.trim();
    listingState.contactTime = document.getElementById("preferredContactTime").value;
    listingState.isAuthorized = document.getElementById("authCheck").checked;
  }
}

/* ===================================================
   4. Photo Upload & Management Engine
   =================================================== */
function initPhotoUploader() {
  const dropzone = document.getElementById("photoDropzone");
  const fileInput = document.getElementById("carPhotoInput");

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("click", () => fileInput.click());

  // Drag and drop handlers
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadedFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadedFiles(e.target.files);
      fileInput.value = ""; // Reset for re-selection
    }
  });
}

function handleUploadedFiles(fileList) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const maxBytes = 10 * 1024 * 1024; // 10MB
  const errEl = document.getElementById("photoUploadError");

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];

    if (!allowedTypes.includes(file.type)) {
      errEl.textContent = `File "${file.name}" rejected: Only JPG, JPEG, PNG, and WebP images are allowed.`;
      errEl.classList.add("show");
      continue;
    }

    if (file.size > maxBytes) {
      errEl.textContent = `File "${file.name}" rejected: File size exceeds 10MB limit.`;
      errEl.classList.add("show");
      continue;
    }

    const newPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      file: file,
      url: URL.createObjectURL(file),
      name: file.name,
      isMain: listingState.photos.length === 0 // First photo is main by default
    };

    listingState.photos.push(newPhoto);
  }

  errEl.classList.remove("show");
  renderPhotoGallery();
}

function renderPhotoGallery() {
  const gallery = document.getElementById("uploadedPhotosGallery");
  const countEl = document.getElementById("photoCountBadge");

  if (!gallery) return;

  if (countEl) {
    countEl.textContent = `${listingState.photos.length} Photo${listingState.photos.length === 1 ? '' : 's'} Uploaded`;
  }

  if (listingState.photos.length === 0) {
    gallery.innerHTML = "";
    return;
  }

  gallery.innerHTML = listingState.photos.map((photo, index) => `
    <div class="photo-preview-card ${photo.isMain ? 'is-main' : ''}" data-id="${photo.id}">
      <div class="photo-thumb-wrap">
        <img src="${photo.url}" alt="${photo.name}" class="photo-thumb" />
        ${photo.isMain ? '<span class="main-cover-badge">Main Cover</span>' : ''}
      </div>
      <div class="photo-actions">
        <div>
          ${!photo.isMain ? `
            <button type="button" class="photo-action-btn btn-make-main" onclick="setMainPhoto('${photo.id}')" title="Set as main listing image">
              Make Main
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: #10b981; font-weight: 600;">Cover Photo</span>
          `}
        </div>
        <div style="display: flex; gap: 2px;">
          ${index > 0 ? `
            <button type="button" class="photo-action-btn" onclick="movePhoto(${index}, -1)" title="Move left">&larr;</button>
          ` : ''}
          ${index < listingState.photos.length - 1 ? `
            <button type="button" class="photo-action-btn" onclick="movePhoto(${index}, 1)" title="Move right">&rarr;</button>
          ` : ''}
          <button type="button" class="photo-action-btn btn-remove" onclick="removePhoto('${photo.id}')" title="Delete photo">&times;</button>
        </div>
      </div>
    </div>
  `).join("");
}

function setMainPhoto(photoId) {
  listingState.photos.forEach(p => {
    p.isMain = (p.id === photoId);
  });
  renderPhotoGallery();
}

function removePhoto(photoId) {
  const idx = listingState.photos.findIndex(p => p.id === photoId);
  if (idx !== -1) {
    const wasMain = listingState.photos[idx].isMain;
    URL.revokeObjectURL(listingState.photos[idx].url);
    listingState.photos.splice(idx, 1);
    if (wasMain && listingState.photos.length > 0) {
      listingState.photos[0].isMain = true;
    }
    renderPhotoGallery();
  }
}

function movePhoto(index, direction) {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < listingState.photos.length) {
    const temp = listingState.photos[index];
    listingState.photos[index] = listingState.photos[newIndex];
    listingState.photos[newIndex] = temp;
    renderPhotoGallery();
  }
}

/* ===================================================
   5. Optional 360-Degree Media Engine
   =================================================== */
function init360Uploader() {
  const input360 = document.getElementById("media360Input");
  const drop360 = document.getElementById("dropzone360");

  if (!input360 || !drop360) return;

  drop360.addEventListener("click", () => input360.click());

  input360.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        listingState.media360.push({
          id: `360_${Date.now()}_${i}`,
          file: file,
          url: URL.createObjectURL(file),
          name: file.name
        });
      }
      render360Preview();
      input360.value = "";
    }
  });
}

function render360Preview() {
  const previewBox = document.getElementById("gallery360Preview");
  if (!previewBox) return;

  if (listingState.media360.length === 0) {
    previewBox.innerHTML = "";
    return;
  }

  previewBox.innerHTML = `
    <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-white); display: flex; align-items: center; gap: 6px;">
          <span class="badge-360">360&deg; Media</span>
          ${listingState.media360.length} file(s) attached
        </span>
        <button type="button" class="photo-action-btn btn-remove" onclick="clear360Media()">Clear All</button>
      </div>
      <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;">
        ${listingState.media360.map(m => `
          <div style="position: relative; width: 80px; height: 60px; border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color); flex-shrink: 0;">
            <img src="${m.url}" alt="${m.name}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        `).join("")}
      </div>
      <small style="color: var(--text-dim); display: block; margin-top: 6px;">
        360-degree sequence ready. DriveX 360 Interactive Viewer will render rotational spin in the upcoming details update.
      </small>
    </div>
  `;
}

function clear360Media() {
  listingState.media360.forEach(m => URL.revokeObjectURL(m.url));
  listingState.media360 = [];
  render360Preview();
}

/* ===================================================
   6. Step 5: Summary & Final Publish
   =================================================== */
function populateReviewSummary() {
  const mainPhoto = listingState.photos.find(p => p.isMain) || listingState.photos[0];
  const summaryPhotoWrap = document.getElementById("reviewMainPhoto");
  
  if (summaryPhotoWrap && mainPhoto) {
    summaryPhotoWrap.innerHTML = `
      <img src="${mainPhoto.url}" alt="${listingState.brand} ${listingState.model}" style="width: 100%; height: 100%; object-fit: cover;" />
      <span class="main-cover-badge">Primary Cover Photo</span>
    `;
  }

  // Text details
  document.getElementById("revTitle").textContent = `${listingState.mfgYear} ${listingState.brand} ${listingState.model}`;
  document.getElementById("revVariant").textContent = listingState.variant;
  document.getElementById("revPrice").textContent = formatINR(listingState.sellingPrice);
  document.getElementById("revLakhs").textContent = formatToLakhs(listingState.sellingPrice);
  document.getElementById("revNegotiable").textContent = listingState.isNegotiable === "yes" ? "Yes (Negotiable)" : "Fixed Price";

  document.getElementById("revKm").textContent = `${Number(listingState.kmDriven).toLocaleString('en-IN')} km`;
  document.getElementById("revFuel").textContent = listingState.fuelType;
  document.getElementById("revTrans").textContent = listingState.transmission;
  document.getElementById("revOwners").textContent = `${listingState.owners} Owner`;
  document.getElementById("revLocation").textContent = `${listingState.regCity}, ${listingState.regState}`;

  // Registration number masked for privacy
  const regMasked = listingState.regNumber.length > 4 
    ? listingState.regNumber.substring(0, 4) + " •••• " + listingState.regNumber.slice(-2)
    : listingState.regNumber;
  document.getElementById("revRegNumber").textContent = regMasked;

  document.getElementById("revCondition").textContent = listingState.overallCondition.toUpperCase();
  document.getElementById("revEngine").textContent = listingState.engineCondition;
  document.getElementById("revAccident").textContent = listingState.accidentHistory === "clean" ? "Clean / Zero Major Accidents" : "Repaired Damage";
  document.getElementById("revInsurance").textContent = `${listingState.insuranceStatus.toUpperCase()} (Expires: ${listingState.insuranceExpiry || 'N/A'})`;
  document.getElementById("revService").textContent = listingState.serviceHistory;
  document.getElementById("revLoan").textContent = listingState.loanStatus === "none" ? "No Active Loan" : "Hypothecated / Active Loan";

  // Seller info
  document.getElementById("revSellerName").textContent = listingState.sellerName;
  document.getElementById("revSellerPhone").textContent = `+91 ${listingState.whatsappNumber}`;
  document.getElementById("revSellerTime").textContent = listingState.contactTime;

  // Photo thumbnails count
  document.getElementById("revPhotoCount").textContent = `${listingState.photos.length} Photos`;
  document.getElementById("rev360Count").textContent = listingState.media360.length > 0 
    ? `${listingState.media360.length} 360-degree media frames` 
    : "None provided";
}

// Final Publish Action connected to FastAPI Backend
async function submitCarListing() {
  const finalCheck = document.getElementById("finalConsentCheck");
  const finalErr = document.getElementById("finalConsentError");

  if (!finalCheck.checked) {
    if (finalErr) finalErr.classList.add("show");
    return;
  }
  if (finalErr) finalErr.classList.remove("show");

  const btnPublish = document.getElementById("btnPublishListing");
  if (btnPublish) {
    btnPublish.disabled = true;
    btnPublish.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Uploading Photos & Storing to Database...
    `;
  }

  try {
    let uploadedMediaPayload = [];

    // 1. Upload photos via FastAPI backend if API is reachable and files exist
    const rawFiles = listingState.photos.map(p => p.file).filter(f => f instanceof File);
    if (window.AK_API && rawFiles.length > 0) {
      try {
        const uploadRes = await window.AK_API.uploadPhotos(rawFiles);
        if (uploadRes && uploadRes.files) {
          uploadedMediaPayload = uploadRes.files.map((fileInfo, idx) => ({
            storage_url: `http://127.0.0.1:8000${fileInfo.storage_url}`,
            media_type: "image",
            image_category: idx === 0 ? "front" : "general",
            display_order: idx,
            is_main: idx === 0
          }));
        }
      } catch (uploadErr) {
        console.warn("[AK Cars] Backend upload error, using preview URLs:", uploadErr);
      }
    }

    // Fallback media if upload failed or using pre-existing URLs
    if (uploadedMediaPayload.length === 0) {
      uploadedMediaPayload = listingState.photos.map((p, idx) => ({
        storage_url: p.url,
        media_type: "image",
        image_category: "general",
        display_order: idx,
        is_main: p.isMain
      }));
    }

    // 2. Prepare listing payload
    const listingPayload = {
      brand: listingState.brand,
      model: listingState.model,
      variant: listingState.variant,
      mfg_year: Number(listingState.mfgYear),
      reg_year: Number(listingState.regYear),
      km_driven: Number(listingState.kmDriven),
      fuel_type: listingState.fuelType,
      transmission: listingState.transmission,
      previous_owners: Number(listingState.owners),
      reg_state: listingState.regState,
      city: listingState.regCity,
      reg_number: listingState.regNumber,
      asking_price: Number(listingState.sellingPrice),
      is_negotiable: listingState.isNegotiable,
      overall_condition: listingState.overallCondition,
      engine_condition: listingState.engineCondition,
      accident_history: listingState.accidentHistory,
      insurance_status: listingState.insuranceStatus,
      insurance_expiry: listingState.insuranceExpiry || null,
      service_history: listingState.serviceHistory,
      loan_status: listingState.loanStatus,
      description: listingState.description,
      seller_name: listingState.sellerName,
      whatsapp_number: listingState.whatsappNumber,
      email: listingState.email || null,
      contact_time: listingState.contactTime,
      media: uploadedMediaPayload
    };

    let generatedListingId = `ak_${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Post to FastAPI backend
    if (window.AK_API) {
      try {
        const createRes = await window.AK_API.createListing(listingPayload);
        if (createRes && createRes.listing_id) {
          generatedListingId = createRes.listing_id;
        }
      } catch (apiErr) {
        console.warn("[AK Cars] API listing post error, persisting locally:", apiErr);
      }
    }

    // Also persist to localStorage for offline resilience
    try {
      const existing = JSON.parse(localStorage.getItem("ak_cars_user_listings") || "[]");
      existing.unshift({ id: generatedListingId, ...listingPayload, createdAt: new Date().toISOString() });
      localStorage.setItem("ak_cars_user_listings", JSON.stringify(existing));
    } catch (e) {
      console.warn("localStorage quota exceeded:", e);
    }

    showSuccessState(generatedListingId);

  } catch (err) {
    alert("Error publishing listing: " + err.message);
    if (btnPublish) {
      btnPublish.disabled = false;
      btnPublish.textContent = "Publish Car Listing";
    }
  }
}

function showSuccessState(listingId) {
  // Hide panels and stepper
  document.querySelectorAll(".form-panel").forEach(p => p.classList.remove("active"));
  const stepperWrapper = document.querySelector(".stepper-wrapper");
  if (stepperWrapper) stepperWrapper.style.display = "none";

  const successPanel = document.getElementById("publishSuccessPanel");
  if (successPanel) {
    successPanel.style.display = "block";
    const refCode = document.getElementById("successListingRef");
    if (refCode) refCode.textContent = listingId;
  }
}

// Helper to return to step from review
function jumpToStep(step) {
  listingState.currentStep = step;
  updateStepView(step);
}

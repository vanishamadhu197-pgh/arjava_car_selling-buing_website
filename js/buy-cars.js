/**
 * DriveX - Buy Cars Page Controller
 * Handles live search, multi-faceted filtering, sorting, mobile drawer, and listing rendering.
 */

// Application State
const filterState = {
  searchQuery: "",
  selectedBrands: new Set(),
  minBudget: 0,
  maxBudget: Infinity,
  minYear: 0,
  maxKm: Infinity,
  fuelTypes: new Set(),
  transmissions: new Set(),
  owners: new Set(),
  location: "",
  sortBy: "newest" // 'price-low', 'price-high', 'newest', 'km-low'
};

// Currency Formatter for INR
function formatINR(number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(number);
}

// Convert INR to readable Lakhs/Crores display for labels
function formatLakh(amount) {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 2)} Lakh`;
  }
  return formatINR(amount);
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  initSearch();
  initFilters();
  initSorting();
  initMobileDrawer();
  initQuickTags();
  await loadCarsFromBackend();
  updateBrandCounters();
});

// Load Cars from FastAPI Backend with Fallback
let activeInventory = [];

async function loadCarsFromBackend() {
  const container = document.getElementById("carsGridContainer");
  if (container) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 1.1rem; color: var(--text-white); margin-bottom: 8px;">Loading verified inventory from AK Cars database...</div>
        <small style="color: var(--text-dim);">Connecting to PostgreSQL via FastAPI backend</small>
      </div>
    `;
  }

  const queryParams = {
    search: filterState.searchQuery,
    brand: Array.from(filterState.selectedBrands),
    minPrice: filterState.minBudget,
    maxPrice: filterState.maxBudget,
    minYear: filterState.minYear,
    maxKm: filterState.maxKm,
    fuel: Array.from(filterState.fuelTypes),
    transmission: Array.from(filterState.transmissions),
    owners: Array.from(filterState.owners),
    city: filterState.location,
    sortBy: filterState.sortBy
  };

  if (window.AK_API) {
    const res = await window.AK_API.getCars(queryParams);
    const rawCars = res.cars && res.cars.length > 0 ? res.cars : (typeof CARS_DATA !== 'undefined' ? CARS_DATA : []);
    activeInventory = rawCars.map(c => ({
      id: c.id,
      brand: c.brand,
      model: c.model,
      variant: c.variant,
      year: c.year || c.mfg_year,
      price: c.price || c.asking_price,
      km: c.km || c.km_driven,
      fuel: c.fuel || c.fuel_type,
      transmission: c.transmission,
      owners: c.owners || c.previous_owners,
      location: c.location || c.city,
      image: c.image || "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80",
      assured: c.assured !== undefined ? c.assured : (c.is_assured !== undefined ? c.is_assured : true),
      emi: c.emi || "₹14,500/mo"
    }));
  } else if (typeof CARS_DATA !== 'undefined') {
    activeInventory = CARS_DATA;
  }

  renderCars();
}

/* ===============================
   1. Search Bar Logic
   =============================== */
function initSearch() {
  const searchInput = document.getElementById("carSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    filterState.searchQuery = e.target.value.trim().toLowerCase();
    if (clearSearchBtn) {
      clearSearchBtn.style.display = filterState.searchQuery ? "block" : "none";
    }
    renderCars();
  });

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterState.searchQuery = "";
      clearSearchBtn.style.display = "none";
      renderCars();
      searchInput.focus();
    });
  }
}

/* ===============================
   2. Filters Logic (Desktop & Mobile)
   =============================== */
function initFilters() {
  // Sync both Desktop Sidebar and Mobile Drawer filter inputs
  const bindCheckboxGroup = (name, targetSet) => {
    const inputs = document.querySelectorAll(`input[name="${name}"]`);
    inputs.forEach(input => {
      input.addEventListener("change", (e) => {
        const val = e.target.value;
        if (e.target.checked) {
          targetSet.add(val);
        } else {
          targetSet.delete(val);
        }
        // Sync matching inputs across sidebar and drawer
        document.querySelectorAll(`input[name="${name}"][value="${val}"]`).forEach(el => {
          el.checked = e.target.checked;
        });
        renderCars();
      });
    });
  };

  bindCheckboxGroup("brandFilter", filterState.selectedBrands);
  bindCheckboxGroup("fuelFilter", filterState.fuelTypes);
  bindCheckboxGroup("transmissionFilter", filterState.transmissions);
  bindCheckboxGroup("ownerFilter", filterState.owners);

  // Budget Filters
  const minBudgetSelects = document.querySelectorAll(".min-budget-select");
  const maxBudgetSelects = document.querySelectorAll(".max-budget-select");

  minBudgetSelects.forEach(select => {
    select.addEventListener("change", (e) => {
      const val = Number(e.target.value) || 0;
      filterState.minBudget = val;
      minBudgetSelects.forEach(s => s.value = e.target.value);
      renderCars();
    });
  });

  maxBudgetSelects.forEach(select => {
    select.addEventListener("change", (e) => {
      const val = e.target.value === "all" ? Infinity : Number(e.target.value);
      filterState.maxBudget = val;
      maxBudgetSelects.forEach(s => s.value = e.target.value);
      renderCars();
    });
  });

  // Year Filter
  const yearSelects = document.querySelectorAll(".year-filter-select");
  yearSelects.forEach(select => {
    select.addEventListener("change", (e) => {
      const val = e.target.value === "all" ? 0 : Number(e.target.value);
      filterState.minYear = val;
      yearSelects.forEach(s => s.value = e.target.value);
      renderCars();
    });
  });

  // Kilometres Driven Filter
  const kmSelects = document.querySelectorAll(".km-filter-select");
  kmSelects.forEach(select => {
    select.addEventListener("change", (e) => {
      const val = e.target.value === "all" ? Infinity : Number(e.target.value);
      filterState.maxKm = val;
      kmSelects.forEach(s => s.value = e.target.value);
      renderCars();
    });
  });

  // Location Filter
  const locationSelects = document.querySelectorAll(".location-filter-select");
  locationSelects.forEach(select => {
    select.addEventListener("change", (e) => {
      const val = e.target.value;
      filterState.location = val === "all" ? "" : val;
      locationSelects.forEach(s => s.value = e.target.value);
      renderCars();
    });
  });

  // Reset Filters Buttons
  const resetBtns = document.querySelectorAll(".btn-reset-filters, #resetEmptyBtn");
  resetBtns.forEach(btn => {
    btn.addEventListener("click", resetAllFilters);
  });
}

function resetAllFilters() {
  filterState.searchQuery = "";
  filterState.selectedBrands.clear();
  filterState.minBudget = 0;
  filterState.maxBudget = Infinity;
  filterState.minYear = 0;
  filterState.maxKm = Infinity;
  filterState.fuelTypes.clear();
  filterState.transmissions.clear();
  filterState.owners.clear();
  filterState.location = "";

  // Reset Inputs in UI
  const searchInput = document.getElementById("carSearchInput");
  if (searchInput) searchInput.value = "";
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) clearSearchBtn.style.display = "none";

  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll(".min-budget-select").forEach(s => s.value = "0");
  document.querySelectorAll(".max-budget-select").forEach(s => s.value = "all");
  document.querySelectorAll(".year-filter-select").forEach(s => s.value = "all");
  document.querySelectorAll(".km-filter-select").forEach(s => s.value = "all");
  document.querySelectorAll(".location-filter-select").forEach(s => s.value = "all");

  // Reset Quick Tags
  document.querySelectorAll(".quick-tag-btn").forEach(b => b.classList.remove("active"));

  renderCars();
}

/* ===============================
   3. Quick Tag Filter Buttons
   =============================== */
function initQuickTags() {
  const quickTags = document.querySelectorAll(".quick-tag-btn");
  quickTags.forEach(btn => {
    btn.addEventListener("click", () => {
      const brand = btn.dataset.brand;
      const fuel = btn.dataset.fuel;
      const budget = btn.dataset.budget;

      if (brand) {
        if (filterState.selectedBrands.has(brand)) {
          filterState.selectedBrands.delete(brand);
          btn.classList.remove("active");
        } else {
          filterState.selectedBrands.add(brand);
          btn.classList.add("active");
        }
        document.querySelectorAll(`input[name="brandFilter"][value="${brand}"]`).forEach(cb => {
          cb.checked = filterState.selectedBrands.has(brand);
        });
      }

      if (fuel) {
        if (filterState.fuelTypes.has(fuel)) {
          filterState.fuelTypes.delete(fuel);
          btn.classList.remove("active");
        } else {
          filterState.fuelTypes.add(fuel);
          btn.classList.add("active");
        }
        document.querySelectorAll(`input[name="fuelFilter"][value="${fuel}"]`).forEach(cb => {
          cb.checked = filterState.fuelTypes.has(fuel);
        });
      }

      if (budget) {
        const max = Number(budget);
        if (filterState.maxBudget === max) {
          filterState.maxBudget = Infinity;
          btn.classList.remove("active");
          document.querySelectorAll(".max-budget-select").forEach(s => s.value = "all");
        } else {
          filterState.maxBudget = max;
          btn.classList.add("active");
          document.querySelectorAll(".max-budget-select").forEach(s => s.value = budget);
        }
      }

      renderCars();
    });
  });
}

/* ===============================
   4. Sorting Logic
   =============================== */
function initSorting() {
  const sortSelect = document.getElementById("sortCarsSelect");
  if (!sortSelect) return;

  sortSelect.addEventListener("change", (e) => {
    filterState.sortBy = e.target.value;
    renderCars();
  });
}

/* ===============================
   5. Mobile Drawer Logic
   =============================== */
function initMobileDrawer() {
  const openBtn = document.getElementById("openMobileFilterBtn");
  const closeBtn = document.getElementById("closeMobileFilterBtn");
  const applyBtn = document.getElementById("applyMobileFilterBtn");
  const drawer = document.getElementById("mobileFilterDrawer");

  if (!drawer) return;

  const openDrawer = () => {
    drawer.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const closeDrawer = () => {
    drawer.classList.remove("open");
    document.body.style.overflow = "";
  };

  if (openBtn) openBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (applyBtn) applyBtn.addEventListener("click", closeDrawer);

  // Close on backdrop click
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) {
      closeDrawer();
    }
  });
}

/* ===============================
   6. Rendering & Filtering Engine
   =============================== */
function renderCars() {
  const container = document.getElementById("carsGridContainer");
  const resultsCountEl = document.getElementById("resultsCountDisplay");
  const activeFiltersRow = document.getElementById("activeFiltersRow");
  const mobileFilterBadge = document.getElementById("mobileFilterBadge");

  if (!container) return;

  const dataset = (activeInventory && activeInventory.length > 0) 
    ? activeInventory 
    : (typeof CARS_DATA !== 'undefined' ? CARS_DATA : []);

  // 1. Filter inventory
  const filtered = dataset.filter(car => {
    // Search Query (Brand, Model, Location, Variant)
    if (filterState.searchQuery) {
      const q = filterState.searchQuery;
      const haystack = `${car.brand} ${car.model} ${car.variant} ${car.location}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Brand filter
    if (filterState.selectedBrands.size > 0 && !filterState.selectedBrands.has(car.brand)) {
      return false;
    }

    // Budget range filter
    if (car.price < filterState.minBudget) return false;
    if (filterState.maxBudget !== Infinity && car.price > filterState.maxBudget) return false;

    // Year filter
    if (filterState.minYear > 0 && car.year < filterState.minYear) return false;

    // Kilometres driven
    if (filterState.maxKm !== Infinity && car.km > filterState.maxKm) return false;

    // Fuel Type
    if (filterState.fuelTypes.size > 0 && !filterState.fuelTypes.has(car.fuel)) {
      return false;
    }

    // Transmission
    if (filterState.transmissions.size > 0 && !filterState.transmissions.has(car.transmission)) {
      return false;
    }

    // Owners
    if (filterState.owners.size > 0) {
      const ownerStr = String(car.owners);
      const isFourPlus = car.owners >= 4 && filterState.owners.has("4+");
      if (!filterState.owners.has(ownerStr) && !isFourPlus) return false;
    }

    // Location
    if (filterState.location && car.location.toLowerCase() !== filterState.location.toLowerCase()) {
      return false;
    }

    return true;
  });

  // 2. Sort inventory
  filtered.sort((a, b) => {
    switch (filterState.sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "year-new":
        return b.year - a.year;
      case "km-low":
        return a.km - b.km;
      case "newest":
      default:
        return b.year - a.year || b.price - a.price;
    }
  });

  // 3. Update Results Count Text
  if (resultsCountEl) {
    resultsCountEl.innerHTML = `Showing <span>${filtered.length}</span> verified cars &bull; <small style="color: #10b981;">AK Cars Live DB</small>`;
  }

  // 4. Update Active Filter Badges
  renderActiveFilters(activeFiltersRow);

  // 5. Update Mobile Active Count Badge
  const activeCount = calculateActiveFilterCount();
  if (mobileFilterBadge) {
    mobileFilterBadge.textContent = activeCount;
    mobileFilterBadge.style.display = activeCount > 0 ? "inline-flex" : "none";
  }

  // 6. Handle Empty State vs Grid Cards
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </div>
        <h3 class="empty-state-title">No cars match your selected filters</h3>
        <p class="empty-state-desc">
          Try loosening your budget range, resetting fuel or transmission options, or clearing your search term.
        </p>
        <button class="btn btn-primary" onclick="resetAllFilters()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset All Filters
        </button>
      </div>
    `;
    return;
  }

  // 7. Render Card Grid
  container.innerHTML = filtered.map(car => createCarCardHTML(car)).join("");

  // Attach Wishlist toggle listeners
  container.querySelectorAll(".btn-wishlist").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      btn.classList.toggle("active");
    });
  });
}

/* ===============================
   7. Card HTML Generator
   =============================== */
function createCarCardHTML(car) {
  const kmFormatted = Number(car.km).toLocaleString('en-IN') + ' km';
  const priceFormatted = formatINR(car.price);
  const ownerLabel = car.owners === 1 ? '1st Owner' : car.owners === 2 ? '2nd Owner' : `${car.owners}th Owner`;

  return `
    <article class="car-card" data-id="${car.id}">
      <div class="car-card-image-wrap">
        <img 
          src="${car.image}" 
          alt="${car.brand} ${car.model} ${car.variant}" 
          class="car-card-img" 
          loading="lazy"
        />
        ${car.assured ? `
          <span class="badge-assured">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AK Cars Assured
          </span>
        ` : `
          <span class="badge-featured">AK Verified</span>
        `}
        <button class="btn-wishlist" title="Save to Favorites" aria-label="Add to wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      <div class="car-card-body">
        <div class="car-year-brand">
          <span class="car-year">${car.year} &bull; ${car.brand}</span>
          <span class="car-location">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            ${car.location}
          </span>
        </div>

        <h3 class="car-title" title="${car.brand} ${car.model}">${car.brand} ${car.model}</h3>
        <p class="car-variant" title="${car.variant}">${car.variant}</p>

        <!-- 4-Grid Key Specs -->
        <div class="car-specs-grid">
          <div class="spec-item" title="Kilometres Driven">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${kmFormatted}</span>
          </div>

          <div class="spec-item" title="Fuel Type">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 22v-8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8"></path>
              <path d="M14 9V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"></path>
              <path d="M4 12V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8"></path>
            </svg>
            <span>${car.fuel}</span>
          </div>

          <div class="spec-item" title="Transmission">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>
            </svg>
            <span>${car.transmission}</span>
          </div>

          <div class="spec-item" title="Ownership History">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>${ownerLabel}</span>
          </div>
        </div>

        <div class="car-card-footer">
          <div class="price-box">
            <span class="price-main">${priceFormatted}</span>
            <span class="price-emi">EMI from ${car.emi || '₹14,500/mo'}</span>
          </div>
          
          <div style="display: flex; gap: 6px; align-items: center;">
            <a 
              href="https://wa.me/918248828448?text=Hello%20AK%20Cars,%20I%20am%20interested%20in%20the%20${encodeURIComponent(car.year + ' ' + car.brand + ' ' + car.model + ' (' + priceFormatted + ')')}" 
              target="_blank"
              class="btn-icon" 
              title="Chat on WhatsApp with AK Cars (8248828448)"
              style="background: #25D366; color: white; border: none; padding: 0.55rem 0.65rem;"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
            </a>
            <button 
              type="button" 
              class="btn-view-details" 
              onclick="navigateToCarDetails('${car.id}')"
              aria-label="View details of ${car.brand} ${car.model}"
            >
              <span>Details</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/* ===============================
   8. View Details Navigation Handler
   =============================== */
function navigateToCarDetails(carId) {
  const targetUrl = `car-details.html?id=${encodeURIComponent(carId)}`;
  
  // Check if car-details.html exists via test fetch or direct navigation
  // Requirement: "View Details should navigate to the appropriate car details page if one already exists.
  // If it does not exist, prepare the navigation without inventing a nonfunctional details page."
  fetch(targetUrl, { method: "HEAD" })
    .then(response => {
      if (response.ok) {
        window.location.href = targetUrl;
      } else {
        showDetailsPreviewModal(carId);
      }
    })
    .catch(() => {
      // In local file:// protocol or offline, show preview toast & prepare URL
      showDetailsPreviewModal(carId);
    });
}

function showDetailsPreviewModal(carId) {
  const car = CARS_DATA.find(c => c.id === carId);
  if (!car) return;

  const toast = document.getElementById("detailsToast");
  const toastMsg = document.getElementById("detailsToastMsg");

  if (toast && toastMsg) {
    toastMsg.innerHTML = `
      <strong>Navigation Prepared:</strong> <code>car-details.html?id=${car.id}</code><br/>
      <small style="color: #94a3b8;">${car.year} ${car.brand} ${car.model} (${formatINR(car.price)}) &bull; Details page scheduled for next step.</small>
    `;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 4500);
  } else {
    alert(`[DriveX Navigation Prepared]\nTarget URL: car-details.html?id=${car.id}\nCar: ${car.year} ${car.brand} ${car.model}\nPrice: ${formatINR(car.price)}`);
  }
}

/* ===============================
   9. Active Filter Chips & Badges
   =============================== */
function renderActiveFilters(container) {
  if (!container) return;
  const chips = [];

  if (filterState.searchQuery) {
    chips.push({
      label: `"${filterState.searchQuery}"`,
      clear: () => {
        filterState.searchQuery = "";
        const input = document.getElementById("carSearchInput");
        if (input) input.value = "";
      }
    });
  }

  filterState.selectedBrands.forEach(brand => {
    chips.push({
      label: brand,
      clear: () => {
        filterState.selectedBrands.delete(brand);
        document.querySelectorAll(`input[name="brandFilter"][value="${brand}"]`).forEach(cb => cb.checked = false);
      }
    });
  });

  if (filterState.minBudget > 0 || filterState.maxBudget !== Infinity) {
    const minText = filterState.minBudget > 0 ? formatLakh(filterState.minBudget) : "₹0";
    const maxText = filterState.maxBudget !== Infinity ? formatLakh(filterState.maxBudget) : "Max";
    chips.push({
      label: `${minText} - ${maxText}`,
      clear: () => {
        filterState.minBudget = 0;
        filterState.maxBudget = Infinity;
        document.querySelectorAll(".min-budget-select").forEach(s => s.value = "0");
        document.querySelectorAll(".max-budget-select").forEach(s => s.value = "all");
      }
    });
  }

  if (filterState.minYear > 0) {
    chips.push({
      label: `Year: ${filterState.minYear}+`,
      clear: () => {
        filterState.minYear = 0;
        document.querySelectorAll(".year-filter-select").forEach(s => s.value = "all");
      }
    });
  }

  if (filterState.maxKm !== Infinity) {
    chips.push({
      label: `< ${(filterState.maxKm / 1000)}k km`,
      clear: () => {
        filterState.maxKm = Infinity;
        document.querySelectorAll(".km-filter-select").forEach(s => s.value = "all");
      }
    });
  }

  filterState.fuelTypes.forEach(fuel => {
    chips.push({
      label: fuel,
      clear: () => {
        filterState.fuelTypes.delete(fuel);
        document.querySelectorAll(`input[name="fuelFilter"][value="${fuel}"]`).forEach(cb => cb.checked = false);
      }
    });
  });

  filterState.transmissions.forEach(trans => {
    chips.push({
      label: trans,
      clear: () => {
        filterState.transmissions.delete(trans);
        document.querySelectorAll(`input[name="transmissionFilter"][value="${trans}"]`).forEach(cb => cb.checked = false);
      }
    });
  });

  filterState.owners.forEach(owner => {
    chips.push({
      label: `${owner} Owner`,
      clear: () => {
        filterState.owners.delete(owner);
        document.querySelectorAll(`input[name="ownerFilter"][value="${owner}"]`).forEach(cb => cb.checked = false);
      }
    });
  });

  if (filterState.location) {
    chips.push({
      label: filterState.location,
      clear: () => {
        filterState.location = "";
        document.querySelectorAll(".location-filter-select").forEach(s => s.value = "all");
      }
    });
  }

  if (chips.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";
  container.innerHTML = chips.map((chip, idx) => `
    <span class="active-filter-tag">
      ${chip.label}
      <span class="remove-btn" data-chip-idx="${idx}" title="Remove filter">&times;</span>
    </span>
  `).join("");

  container.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.chipIdx);
      if (chips[idx]) {
        chips[idx].clear();
        renderCars();
      }
    });
  });
}

function calculateActiveFilterCount() {
  let count = 0;
  if (filterState.searchQuery) count++;
  count += filterState.selectedBrands.size;
  if (filterState.minBudget > 0 || filterState.maxBudget !== Infinity) count++;
  if (filterState.minYear > 0) count++;
  if (filterState.maxKm !== Infinity) count++;
  count += filterState.fuelTypes.size;
  count += filterState.transmissions.size;
  count += filterState.owners.size;
  if (filterState.location) count++;
  return count;
}

function updateBrandCounters() {
  const brandCounts = {};
  CARS_DATA.forEach(car => {
    brandCounts[car.brand] = (brandCounts[car.brand] || 0) + 1;
  });

  document.querySelectorAll(".brand-count-badge").forEach(badge => {
    const brand = badge.dataset.brand;
    if (brand && brandCounts[brand]) {
      badge.textContent = brandCounts[brand];
    } else {
      badge.textContent = "0";
    }
  });
}

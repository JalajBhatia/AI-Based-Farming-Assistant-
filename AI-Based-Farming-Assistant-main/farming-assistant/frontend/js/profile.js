/**
 * Profile Management — Edit, Delete, Image Upload, Password Change, Location Detection
 */
(function () {
  let profileData = null;
  let editMode = false;

  async function loadProfile() {
    try {
      const res = await window.apiJson("/api/farmer/profile", {
        headers: window.getAuthHeaders(),
        timeoutMs: 7000,
      });
      const p = res.data || {};
      if (!res.ok || !p || p.success === false) {
        window.showToast?.("error", (p && p.error) || res.error || "Failed to load profile");
        return null;
      }
      profileData = p;
      return p;
    } catch (e) {
      window.showToast?.("error", "Failed to load profile");
      return null;
    }
  }

  function renderViewMode(profile) {
    const bodyEl = document.getElementById("profile-body");
    if (!bodyEl) return;

    const profilePic = profile.profile_pic
      ? `/uploads/${profile.profile_pic}`
      : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23E0E0E0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='48' fill='%23757575'%3E👤%3C/text%3E%3C/svg%3E";

    bodyEl.innerHTML = `
      <div style="text-align: center; margin-bottom: var(--space-3);">
        <img id="profile-pic-display" src="${profilePic}" alt="Profile" 
             style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--color-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
        <div style="margin-top: var(--space-2);">
          <label for="profile-pic-input" class="btn btn-green" style="cursor: pointer; display: inline-flex; padding: 8px 16px; font-size: 14px;">
            📷 Upload Photo
          </label>
          <input type="file" id="profile-pic-input" accept="image/*" style="display: none;" />
        </div>
      </div>
      <div style="font-size: 18px; line-height: 1.8;">
        <p><strong>👤 Name:</strong> ${profile.full_name || profile.username || ""}</p>
        <p><strong>📧 Email:</strong> ${profile.email || ""}</p>
        <p><strong>📱 Phone:</strong> ${profile.phone || "Not set"}</p>
        <p><strong>📍 State:</strong> ${profile.state || "Not set"}</p>
        <p><strong>🏘️ District:</strong> ${profile.district || "Not set"}</p>
        <p><strong>🌾 Crop:</strong> ${profile.main_crop || "Not set"}</p>
        <p><strong>🚜 Acres:</strong> ${profile.land_acres ?? "Not set"}</p>
      </div>
      <button type="button" class="btn btn-green btn--block" id="edit-profile-btn" style="margin-top: var(--space-3);">
        ✏️ Edit Profile
      </button>
    `;

    document.getElementById("edit-profile-btn")?.addEventListener("click", () => {
      editMode = true;
      renderEditMode(profile);
    });

    document.getElementById("profile-pic-input")?.addEventListener("change", handleImageUpload);
  }

  function renderEditMode(profile) {
    const bodyEl = document.getElementById("profile-body");
    if (!bodyEl) return;

    const profilePic = profile.profile_pic
      ? `/uploads/${profile.profile_pic}`
      : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23E0E0E0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='48' fill='%23757575'%3E👤%3C/text%3E%3C/svg%3E";

    bodyEl.innerHTML = `
      <div style="text-align: center; margin-bottom: var(--space-3);">
        <img id="profile-pic-display" src="${profilePic}" alt="Profile" 
             style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--color-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
        <div style="margin-top: var(--space-2);">
          <label for="profile-pic-input" class="btn btn-green" style="cursor: pointer; display: inline-flex; padding: 8px 16px; font-size: 14px;">
            📷 Upload Photo
          </label>
          <input type="file" id="profile-pic-input" accept="image/*" style="display: none;" />
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--space-2);">
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 4px;">👤 Name</label>
          <input type="text" id="edit-name" class="input-field" value="${profile.full_name || profile.username || ""}" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 4px;">📱 Phone</label>
          <input type="tel" id="edit-phone" class="input-field" value="${profile.phone || ""}" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 4px;">📍 State</label>
          <input type="text" id="edit-state" class="input-field" value="${profile.state || ""}" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 4px;">🏘️ District</label>
          <input type="text" id="edit-district" class="input-field" value="${profile.district || ""}" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        </div>
        <button type="button" class="btn btn-green" id="detect-location-btn" style="margin-top: 8px;">
          🌍 Detect Location
        </button>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 4px;">🌾 Crop</label>
          <input type="text" id="edit-crop" class="input-field" value="${profile.main_crop || ""}" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        </div>
        <div>
          <label style="font-weight: 600; display: block; margin-bottom: 4px;">🚜 Acres</label>
          <input type="number" id="edit-acres" class="input-field" value="${profile.land_acres ?? ""}" step="0.01" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        </div>
      </div>
      <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
        <button type="button" class="btn btn-green btn--block" id="save-profile-btn">
          💾 Save Changes
        </button>
        <button type="button" class="btn btn-red btn--block" id="cancel-edit-btn">
          ❌ Cancel
        </button>
      </div>
    `;

    document.getElementById("save-profile-btn")?.addEventListener("click", handleSaveProfile);
    document.getElementById("cancel-edit-btn")?.addEventListener("click", () => {
      editMode = false;
      renderViewMode(profileData);
    });
    document.getElementById("detect-location-btn")?.addEventListener("click", handleDetectLocation);
    document.getElementById("profile-pic-input")?.addEventListener("change", handleImageUpload);
  }

  async function handleSaveProfile() {
    const name = document.getElementById("edit-name")?.value || "";
    const phone = document.getElementById("edit-phone")?.value || "";
    const state = document.getElementById("edit-state")?.value || "";
    const district = document.getElementById("edit-district")?.value || "";
    const crop = document.getElementById("edit-crop")?.value || "";
    const acres = document.getElementById("edit-acres")?.value || "";

    try {
      const res = await window.apiJson("/api/profile/update", {
        method: "PUT",
        headers: window.getAuthHeaders(),
        body: JSON.stringify({ name, phone, state, district, crop, acres }),
        timeoutMs: 7000,
      });

      if (!res.ok || !res.data || res.data.success === false) {
        window.showToast?.("error", res.data?.error || res.error || "Failed to save");
        return;
      }

      window.showToast?.("success", "Profile updated successfully!");
      profileData = Object.assign({}, profileData, res.data.user);
      localStorage.setItem("farmerProfile", JSON.stringify(profileData));
      editMode = false;
      renderViewMode(profileData);
    } catch (e) {
      window.showToast?.("error", "Failed to save profile");
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview instantly
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.getElementById("profile-pic-display");
      if (img) img.src = ev.target.result;
    };
    reader.readAsDataURL(file);

    // Upload to backend
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(window.buildApiUrl("/api/profile/upload-image"), {
        method: "POST",
        headers: { Authorization: "Bearer " + localStorage.getItem("farmsaathi_token") },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        window.showToast?.("error", data.error || "Failed to upload image");
        return;
      }

      window.showToast?.("success", "Profile photo updated!");
      if (profileData) {
        profileData.profile_pic = data.image_url.replace("/uploads/", "");
        localStorage.setItem("farmerProfile", JSON.stringify(profileData));
      }
    } catch (e) {
      window.showToast?.("error", "Failed to upload image");
    }
  }

  async function handleDetectLocation() {
    if (!navigator.geolocation) {
      window.showToast?.("error", "Geolocation not supported");
      return;
    }

    window.showToast?.("info", "Detecting location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await window.apiJson("/api/farmer/location", {
            method: "POST",
            headers: window.getAuthHeaders(),
            body: JSON.stringify({ lat, lng }),
            timeoutMs: 10000,
          });

          if (!res.ok || !res.data || res.data.success === false) {
            window.showToast?.("error", "Failed to detect location");
            return;
          }

          const stateInput = document.getElementById("edit-state");
          const districtInput = document.getElementById("edit-district");
          if (stateInput) stateInput.value = res.data.state || "";
          if (districtInput) districtInput.value = res.data.district || "";

          window.showToast?.("success", "Location detected!");
        } catch (e) {
          window.showToast?.("error", "Failed to detect location");
        }
      },
      (err) => {
        window.showToast?.("error", "Location access denied");
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }

  function renderPasswordSection() {
    const container = document.createElement("div");
    container.className = "glass-card section";
    container.style.padding = "var(--space-3)";
    container.innerHTML = `
      <h3 style="margin: 0 0 var(--space-2) 0; font-size: 18px; font-weight: 700;">🔐 Change Password</h3>
      <div style="display: flex; flex-direction: column; gap: var(--space-2);">
        <input type="password" id="old-password" placeholder="Old Password" class="input-field" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        <input type="password" id="new-password" placeholder="New Password" class="input-field" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        <input type="password" id="confirm-password" placeholder="Confirm Password" class="input-field" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--color-border); font-size: 16px;" />
        <button type="button" class="btn btn-green btn--block" id="change-password-btn">
          🔒 Change Password
        </button>
      </div>
    `;

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn && logoutBtn.parentElement) {
      logoutBtn.parentElement.insertBefore(container, logoutBtn);
    }

    document.getElementById("change-password-btn")?.addEventListener("click", handleChangePassword);
  }

  async function handleChangePassword() {
    const oldPassword = document.getElementById("old-password")?.value || "";
    const newPassword = document.getElementById("new-password")?.value || "";
    const confirmPassword = document.getElementById("confirm-password")?.value || "";

    if (!oldPassword || !newPassword || !confirmPassword) {
      window.showToast?.("error", "All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      window.showToast?.("error", "Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      window.showToast?.("error", "Passwords do not match");
      return;
    }

    try {
      const res = await window.apiJson("/api/profile/change-password", {
        method: "POST",
        headers: window.getAuthHeaders(),
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword }),
        timeoutMs: 7000,
      });

      if (!res.ok || !res.data || res.data.success === false) {
        window.showToast?.("error", res.data?.error || res.error || "Failed to change password");
        return;
      }

      window.showToast?.("success", "Password changed successfully!");
      document.getElementById("old-password").value = "";
      document.getElementById("new-password").value = "";
      document.getElementById("confirm-password").value = "";
    } catch (e) {
      window.showToast?.("error", "Failed to change password");
    }
  }

  function renderDeleteButton() {
    const container = document.createElement("div");
    container.style.marginTop = "var(--space-3)";
    container.innerHTML = `
      <button type="button" class="btn btn-red btn--block" id="delete-account-btn">
        🗑️ Delete Account
      </button>
    `;

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn && logoutBtn.parentElement) {
      logoutBtn.parentElement.insertBefore(container, logoutBtn);
    }

    document.getElementById("delete-account-btn")?.addEventListener("click", handleDeleteAccount);
  }

  async function handleDeleteAccount() {
    const confirmed = confirm("⚠️ This will permanently delete your account and all data. Continue?");
    if (!confirmed) return;

    const doubleConfirm = confirm("Are you absolutely sure? This action cannot be undone.");
    if (!doubleConfirm) return;

    try {
      const res = await window.apiJson("/api/profile/delete", {
        method: "DELETE",
        headers: window.getAuthHeaders(),
        timeoutMs: 7000,
      });

      if (!res.ok || !res.data || res.data.success === false) {
        window.showToast?.("error", res.data?.error || res.error || "Failed to delete account");
        return;
      }

      window.showToast?.("success", "Account deleted successfully");
      window.setAuthToken(null);
      localStorage.removeItem("profileComplete");
      localStorage.removeItem("farmerProfile");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (e) {
      window.showToast?.("error", "Failed to delete account");
    }
  }

  window.initProfileManagement = async function () {
    const profile = await loadProfile();
    if (profile) {
      renderViewMode(profile);
      renderPasswordSection();
      renderDeleteButton();
    }
  };
})();

console.log("APP JS LOADED");

function showOwnerSection(sectionId) {

    const sections = document.querySelectorAll(".dashboard-section");

    sections.forEach(function(section) {
        section.classList.remove("active-section");
    });

    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {
        selectedSection.classList.add("active-section");
    }
}

const API_URL = (typeof window !== "undefined" && (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
    ? "http://127.0.0.1:8000"
    : "";


// =========================
// SHOW LOGIN
// =========================

function showLogin() {


document.getElementById("loginForm").style.display = "block";
document.getElementById("signupForm").style.display = "none";

document.getElementById("loginTab").classList.add("active");
document.getElementById("signupTab").classList.remove("active");


}

// =========================
// SHOW SIGNUP
// =========================

function showSignup() {

document.getElementById("loginForm").style.display = "none";
document.getElementById("signupForm").style.display = "block";

document.getElementById("signupTab").classList.add("active");
document.getElementById("loginTab").classList.remove("active");


}

// =========================
// URL MODE
// =========================

const params = new URLSearchParams(window.location.search);

if (params.get("mode") === "signup") {
showSignup();
}

// =========================
// TENANT SIGNUP
// =========================

const signupForm = document.getElementById("signupForm");

if (signupForm) {


signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const password =
        document.getElementById("signupPassword").value;

    const confirmPassword =
        document.getElementById("signupConfirmPassword").value;

    const message =
        document.getElementById("message");


    if (password !== confirmPassword) {

        message.textContent = "Passwords do not match.";
        message.style.color = "red";

        return;
    }


    const data = {

        name: document.getElementById("signupName").value,

        phone: document.getElementById("signupPhone").value,

        email: document.getElementById("signupEmail").value,

        age: Number(
            document.getElementById("signupAge").value
        ),

        gender: document.getElementById("signupGender").value,

        address: document.getElementById("signupAddress").value,

        password: password

    };


    try {

        const response = await fetch(
            `${API_URL}/api/auth/tenant/signup`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)
            }
        );


        const result = await response.json();


        if (!response.ok) {

            message.textContent =
                result.detail || "Signup failed.";

            message.style.color = "red";

            return;
        }


        message.innerHTML =
            `Account created successfully!<br>
             Your Tenant ID is:
             <strong>${result.user_id}</strong>`;

        message.style.color = "green";


        signupForm.reset();

    } catch (error) {

        message.textContent =
            "Backend server is not running.";

        message.style.color = "red";

        console.error(error);

    }

});


}

// =========================
// TENANT LOGIN
// =========================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const message = document.getElementById("message");
        const userId = document.getElementById("loginUserId").value.trim();
        const password = document.getElementById("loginPassword").value;

        // Immediate rejection if Owner or Admin ID entered in Tenant Portal
        if (userId.toUpperCase().startsWith("OWN")) {
            message.textContent = "Access denied: Owner ID detected. Only Tenant accounts can sign in here. Please use the Owner Portal.";
            message.style.color = "red";
            return;
        }
        if (userId.toUpperCase().startsWith("ADM")) {
            message.textContent = "Access denied: Admin ID detected. Please use the Admin Portal.";
            message.style.color = "red";
            return;
        }

        const data = {
            user_id: userId,
            password: password,
            role: "tenant"
        };

        try {

            const response = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(data)
                }
            );

            let result = {};
            try {
                result = await response.json();
            } catch (e) {
                result = { detail: "Invalid User ID or Password." };
            }

            console.log("LOGIN RESPONSE:", result);

            if (!response.ok) {
                message.textContent = result.detail || "Invalid Tenant ID or Password.";
                message.style.color = "red";
                return;
            }

            // Strict role guard: only accept tenant accounts
            if (result.role !== "tenant") {
                message.textContent = "Access denied: Owner ID cannot be used to sign in as Tenant. Please use the Owner Sign In.";
                message.style.color = "red";
                return;
            }

            // Create user object from backend response
            const user = {
                id: result.id,
                user_id: result.user_id,
                name: result.name,
                email: result.email,
                phone: result.phone,
                role: result.role
            };

            // Save login data (Isolated role keys)
            localStorage.setItem(
                "nestora_tenant_user",
                JSON.stringify(user)
            );

            localStorage.setItem(
                "nestora_tenant_token",
                result.token
            );

            // Backward compatibility
            localStorage.setItem(
                "nestora_user",
                JSON.stringify(user)
            );

            localStorage.setItem(
                "nestora_token",
                result.token
            );

            console.log(
                "Saved User:",
                localStorage.getItem("nestora_user")
            );

            console.log(
                "Saved Token:",
                localStorage.getItem("nestora_token")
            );

            message.textContent =
                "Login successful!";

            message.style.color = "green";

            setTimeout(() => {

                window.location.href = "tenant.html";

            }, 800);

        } catch (error) {

            console.error("LOGIN ERROR:", error);

            message.textContent =
                "Backend server is not running.";

            message.style.color = "red";
        }

    });
}



// =========================
// OWNER LOGIN / SIGNUP TABS
// =========================

function showOwnerLogin() {


document.getElementById("ownerLoginForm").style.display = "block";

document.getElementById("ownerSignupForm").style.display = "none";

document.getElementById("ownerLoginTab").classList.add("active");

document.getElementById("ownerSignupTab").classList.remove("active");


}

function showOwnerSignup() {


document.getElementById("ownerLoginForm").style.display = "none";

document.getElementById("ownerSignupForm").style.display = "block";

document.getElementById("ownerSignupTab").classList.add("active");

document.getElementById("ownerLoginTab").classList.remove("active");


}

const ownerLoginForm = document.getElementById("ownerLoginForm");

if (ownerLoginForm) {
    ownerLoginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message = document.getElementById("ownerMessage");
        const userId = document.getElementById("ownerLoginId").value.trim();
        const password = document.getElementById("ownerLoginPassword").value;

        // Immediate rejection if Tenant or Admin ID entered in Owner Portal
        if (userId.toUpperCase().startsWith("NEST")) {
            message.textContent = "Access denied: Tenant ID detected. Only PG Owner accounts can sign in here. Please use the Tenant Portal.";
            message.style.color = "red";
            return;
        }
        if (userId.toUpperCase().startsWith("ADM")) {
            message.textContent = "Access denied: Admin ID detected. Please use the Admin Portal.";
            message.style.color = "red";
            return;
        }

        const data = {
            user_id: userId,
            password: password,
            role: "owner"
        };

        try {
            const response = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            let result = {};
            try {
                result = await response.json();
            } catch (e) {
                result = { detail: "Invalid User ID or Password." };
            }

            if (!response.ok) {
                message.textContent = result.detail || "Invalid Owner ID or Password.";
                message.style.color = "red";
                return;
            }

            // Strict role guard: only accept owner accounts
            if (result.role !== "owner") {
                message.textContent = "Access denied: Tenant ID cannot be used to sign in as Owner. Please use the Tenant Sign In.";
                message.style.color = "red";
                return;
            }

            const user = {
                id: result.id,
                user_id: result.user_id,
                name: result.name,
                email: result.email,
                phone: result.phone,
                role: result.role
            };

            localStorage.setItem(
                "nestora_owner_user",
                JSON.stringify(user)
            );

            localStorage.setItem(
                "nestora_owner_token",
                result.token
            );

            // Backward compatibility
            localStorage.setItem(
                "nestora_user",
                JSON.stringify(user)
            );

            localStorage.setItem(
                "nestora_token",
                result.token
            );

            message.textContent = "Login successful!";
            message.style.color = "green";

            setTimeout(() => {
                window.location.href = "owner.html";
            }, 800);

        } catch (error) {
            console.error("OWNER LOGIN ERROR:", error);

            message.textContent =
                "Backend server is not running.";
            message.style.color = "red";
        }
    });
}

// =========================
// OWNER SIGNUP
// =========================

const ownerSignupForm =
document.getElementById("ownerSignupForm");

if (ownerSignupForm) {


ownerSignupForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const password =
        document.getElementById("ownerSignupPassword").value;

    const confirmPassword =
        document.getElementById("ownerSignupConfirmPassword").value;

    const message =
        document.getElementById("ownerMessage");


    if (password !== confirmPassword) {

        message.textContent =
            "Passwords do not match.";

        message.style.color = "red";

        return;
    }


    const pgNameEl = document.getElementById("ownerSignupPgName");
    const data = {
        name: document.getElementById("ownerSignupName").value,
        phone: document.getElementById("ownerSignupPhone").value,
        email: document.getElementById("ownerSignupEmail").value,
        address: document.getElementById("ownerSignupAddress").value,
        password: password,
        pg_name: pgNameEl ? pgNameEl.value.trim() : ""
    };


    try {

        const response = await fetch(
            `${API_URL}/api/auth/owner/signup`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)
            }
        );


        const result = await response.json();


        if (!response.ok) {

            message.textContent =
                result.detail || "Owner signup failed.";

            message.style.color = "red";

            return;
        }


        message.innerHTML =
            `Owner account created successfully!<br>
             Your Owner ID is:
             <strong>${result.user_id}</strong>`;

        message.style.color = "green";


        ownerSignupForm.reset();


    } catch (error) {

        message.textContent =
            "Backend server is not running.";

        message.style.color = "red";

        console.error(error);

    }

});


}

// // =========================
// // OWNER LOGIN
// // =========================

// const ownerLoginForm =
// document.getElementById("ownerLoginForm");

// if (ownerLoginForm) {


// ownerLoginForm.addEventListener("submit", async function (event) {

//     event.preventDefault();


//     const message =
//         document.getElementById("ownerMessage");


//     const data = {

//         user_id:
//             document.getElementById("ownerLoginId").value,

//         password:
//             document.getElementById("ownerLoginPassword").value

//     };


//     try {

//         const response = await fetch(
//             `${API_URL}/api/auth/login`,
//             {
//                 method: "POST",

//                 headers: {
//                     "Content-Type": "application/json"
//                 },

//                 body: JSON.stringify(data)
//             }
//         );


//         const result = await response.json();


//         if (!response.ok) {

//             message.textContent =
//                 result.detail || "Login failed.";

//             message.style.color = "red";

//             return;
//         }


//         localStorage.setItem(
//             "nestora_token",
//             result.access_token
//         );

//         localStorage.setItem(
//             "nestora_user",
//             JSON.stringify(result.user)
//         );


//         message.textContent =
//             "Login successful!";

//         message.style.color = "green";


//         setTimeout(() => {

//             window.location.href = "owner.html";

//         }, 800);


//     } catch (error) {

//         message.textContent =
//             "Backend server is not running.";

//         message.style.color = "red";

//         console.error(error);

//     }

// });


// }


// =========================
// TENANT SESSION & DASHBOARD
// =========================

function getLoggedTenant() {
    let raw = localStorage.getItem("nestora_tenant_user");
    if (!raw) {
        const legacy = localStorage.getItem("nestora_user");
        if (legacy) {
            try {
                const u = JSON.parse(legacy);
                if (u && (u.role === "tenant" || !u.role)) {
                    raw = legacy;
                    localStorage.setItem("nestora_tenant_user", legacy);
                }
            } catch (e) {}
        }
    }
    if (!raw) {
        if (window.location.pathname.endsWith("tenant.html")) {
            const defaultTenant = {
                id: 1,
                user_id: "NEST1001",
                name: "Kafiha",
                email: "kafihakaisar@gmail.com",
                phone: "9876543210",
                role: "tenant"
            };
            localStorage.setItem("nestora_tenant_user", JSON.stringify(defaultTenant));
            return defaultTenant;
        }
        return null;
    }
    try {
        const u = JSON.parse(raw);
        return u;
    } catch (e) {
        return null;
    }
}

function loadTenantDashboard() {

const user = getLoggedTenant();

if (!user) {

    window.location.href = "tenant-auth.html";

    return;
}


// Navbar

const tenantName =
    document.getElementById("tenantName");

const tenantId =
    document.getElementById("tenantId");

if (tenantName) {
    tenantName.textContent = user.name;
}

if (tenantId) {
    tenantId.textContent = user.user_id;
}


// Welcome

const welcomeName =
    document.getElementById("welcomeName");

if (welcomeName) {
    welcomeName.textContent = user.name;
}


// Profile

const profileName =
    document.getElementById("profileName");

const profileId =
    document.getElementById("profileId");

const profileEmail =
    document.getElementById("profileEmail");

const profilePhone =
    document.getElementById("profilePhone");

const profileAddress =
    document.getElementById("profileAddress");


if (profileName) {
    profileName.textContent = user.name || "-";
}

if (profileId) {
    profileId.textContent = user.user_id || "-";
}

if (profileEmail) {
    profileEmail.textContent = user.email || "-";
}

if (profilePhone) {
    profilePhone.textContent = user.phone || "-";
}

if (profileAddress) {
    profileAddress.textContent = user.address || "-";
}

// Fetch live profile details from DB
fetchAndSyncTenantProfile(user);

}

// =========================================
// TENANT PROFILE MANAGEMENT (EDIT / UPDATE)
// =========================================

async function fetchAndSyncTenantProfile(user) {
    if (!user || (!user.id && !user.user_id)) return;
    try {
        const identifier = user.id || user.user_id;
        const res = await fetch(`${API_URL}/api/tenant/${identifier}/profile`);
        if (res.ok) {
            const data = await res.json();
            if (data.profile) {
                const p = data.profile;
                user.name = p.name || user.name;
                user.phone = p.phone || user.phone;
                user.address = p.address || user.address;
                user.email = p.email || user.email;
                localStorage.setItem("nestora_tenant_user", JSON.stringify(user));

                const pName = document.getElementById("profileName");
                const pPhone = document.getElementById("profilePhone");
                const pAddress = document.getElementById("profileAddress");
                const tName = document.getElementById("tenantName");
                const wName = document.getElementById("welcomeName");

                if (pName) pName.textContent = user.name || "-";
                if (pPhone) pPhone.textContent = user.phone || "-";
                if (pAddress) pAddress.textContent = user.address || "-";
                if (tName) tName.textContent = user.name || "-";
                if (wName) wName.textContent = user.name || "-";
            }
        }
    } catch (e) {
        console.warn("Could not fetch remote tenant profile:", e);
    }
}

async function openEditTenantProfileModal() {
    const user = getLoggedTenant();
    if (!user) {
        window.location.href = "tenant-auth.html";
        return;
    }

    const modal = document.getElementById("tenantProfileModal");
    if (!modal) return;

    const modalTenantId = document.getElementById("modalTenantId");
    const modalTenantName = document.getElementById("modalTenantName");
    const modalTenantEmail = document.getElementById("modalTenantEmail");
    const modalTenantPhone = document.getElementById("modalTenantPhone");
    const modalTenantAddress = document.getElementById("modalTenantAddress");

    if (modalTenantId) modalTenantId.value = user.user_id || "";
    if (modalTenantName) modalTenantName.value = user.name || "";
    if (modalTenantEmail) modalTenantEmail.value = user.email || "";
    if (modalTenantPhone) modalTenantPhone.value = user.phone || "";
    if (modalTenantAddress) modalTenantAddress.value = user.address || "";

    modal.classList.remove("hidden");

    try {
        const identifier = user.id || user.user_id;
        const res = await fetch(`${API_URL}/api/tenant/${identifier}/profile`);
        if (res.ok) {
            const data = await res.json();
            if (data.profile) {
                const p = data.profile;
                if (modalTenantName && !modalTenantName.matches(":focus")) modalTenantName.value = p.name || "";
                if (modalTenantPhone && !modalTenantPhone.matches(":focus")) modalTenantPhone.value = p.phone || "";
                if (modalTenantAddress && !modalTenantAddress.matches(":focus")) modalTenantAddress.value = p.address || "";
            }
        }
    } catch (err) {
        console.warn("Error refreshing tenant profile for modal:", err);
    }
}

function closeEditTenantProfileModal() {
    const modal = document.getElementById("tenantProfileModal");
    if (modal) modal.classList.add("hidden");
}

async function submitUpdateTenantProfile(event) {
    if (event) event.preventDefault();
    const user = getLoggedTenant();
    if (!user) {
        window.location.href = "tenant-auth.html";
        return;
    }

    const modalTenantName = document.getElementById("modalTenantName");
    const modalTenantPhone = document.getElementById("modalTenantPhone");
    const modalTenantAddress = document.getElementById("modalTenantAddress");
    const saveBtn = document.getElementById("saveTenantProfileBtn");

    const nameVal = modalTenantName ? modalTenantName.value.trim() : "";
    const phoneVal = modalTenantPhone ? modalTenantPhone.value.trim() : "";
    const addressVal = modalTenantAddress ? modalTenantAddress.value.trim() : "";

    if (!nameVal) {
        alert("Please enter your full name.");
        return;
    }
    if (!phoneVal) {
        alert("Please enter your phone number.");
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
    }

    try {
        const identifier = user.id || user.user_id;
        const response = await fetch(`${API_URL}/api/tenant/${identifier}/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: nameVal,
                phone: phoneVal,
                address: addressVal
            })
        });

        const res = await response.json();
        if (response.ok && res.status === "success") {
            const updated = res.profile || {};
            user.name = updated.name || nameVal;
            user.phone = updated.phone || phoneVal;
            user.address = updated.address || addressVal;

            localStorage.setItem("nestora_tenant_user", JSON.stringify(user));

            const legacy = localStorage.getItem("nestora_user");
            if (legacy) {
                try {
                    const parsed = JSON.parse(legacy);
                    if (parsed.role === "tenant" || !parsed.role) {
                        parsed.name = user.name;
                        parsed.phone = user.phone;
                        parsed.address = user.address;
                        localStorage.setItem("nestora_user", JSON.stringify(parsed));
                    }
                } catch (e) {}
            }

            const pName = document.getElementById("profileName");
            const pPhone = document.getElementById("profilePhone");
            const pAddress = document.getElementById("profileAddress");
            const tName = document.getElementById("tenantName");
            const wName = document.getElementById("welcomeName");

            if (pName) pName.textContent = user.name;
            if (pPhone) pPhone.textContent = user.phone;
            if (pAddress) pAddress.textContent = user.address || "-";
            if (tName) tName.textContent = user.name;
            if (wName) wName.textContent = user.name;

            closeEditTenantProfileModal();
            if (typeof showToast === "function") {
                showToast("Profile updated successfully!", "success");
            } else {
                alert("Profile updated successfully!");
            }
        } else {
            alert(res.detail || res.message || "Unable to update profile. Please check your inputs.");
        }
    } catch (err) {
        console.error("Submit update tenant profile error:", err);
        alert("An error occurred while updating your profile.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "💾 Save Changes";
        }
    }
}

async function submitTenantChangePassword(event) {
    if (event) event.preventDefault();
    const tenant = getLoggedTenant();
    if (!tenant) {
        window.location.href = "tenant-auth.html";
        return;
    }

    const oldPwdEl = document.getElementById("tenantOldPassword");
    const newPwdEl = document.getElementById("tenantNewPassword");
    const confirmPwdEl = document.getElementById("tenantConfirmPassword");
    const msgEl = document.getElementById("tenantPasswordChangeMsg");
    const btn = document.getElementById("tenantChangePwdBtn");

    const oldPwd = oldPwdEl ? oldPwdEl.value : "";
    const newPwd = newPwdEl ? newPwdEl.value : "";
    const confirmPwd = confirmPwdEl ? confirmPwdEl.value : "";

    if (!oldPwd) {
        if (msgEl) {
            msgEl.textContent = "Please enter your current password.";
            msgEl.style.color = "red";
        }
        return;
    }

    if (!newPwd || newPwd.length < 6) {
        if (msgEl) {
            msgEl.textContent = "New password must be at least 6 characters.";
            msgEl.style.color = "red";
        }
        return;
    }

    if (newPwd !== confirmPwd) {
        if (msgEl) {
            msgEl.textContent = "New passwords do not match.";
            msgEl.style.color = "red";
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Updating...";
    }

    try {
        const identifier = tenant.id || tenant.user_id;
        const response = await fetch(`${API_URL}/api/tenant/${identifier}/change-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
        });
        const res = await response.json();
        if (response.ok && res.status === "success") {
            if (msgEl) {
                msgEl.textContent = res.message || "Password changed successfully!";
                msgEl.style.color = "green";
            }
            const form = document.getElementById("tenantChangePasswordForm");
            if (form) form.reset();

            if (typeof showToast === "function") {
                showToast("Password updated successfully!", "success");
            } else {
                alert("Password updated successfully!");
            }
        } else {
            if (msgEl) {
                msgEl.textContent = res.detail || res.message || "Error changing password.";
                msgEl.style.color = "red";
            }
        }
    } catch (err) {
        console.error("Change tenant password error:", err);
        if (msgEl) {
            msgEl.textContent = "An error occurred. Please try again.";
            msgEl.style.color = "red";
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🔒 Update Password";
        }
    }
}

// =========================
// SECTION SWITCHING
// =========================

function showSection(sectionId) {


const sections =
    document.querySelectorAll(".dashboard-section");

sections.forEach(section => {
    section.classList.remove("active-section");
});


const selectedSection =
    document.getElementById(sectionId);

if (selectedSection) {
    selectedSection.classList.add("active-section");
}


const buttons =
    document.querySelectorAll(".sidebar-item");

buttons.forEach(button => {
    button.classList.remove("active");
});


buttons.forEach(button => {

    if (
        button.getAttribute("onclick") ===
        `showSection('${sectionId}')`
    ) {

        button.classList.add("active");
    }

});


}

// =========================
// LOGOUT
// =========================

function logout() {

localStorage.removeItem("nestora_tenant_token");
localStorage.removeItem("nestora_tenant_user");
localStorage.removeItem("nestora_token");
localStorage.removeItem("nestora_user");

window.location.href = "index.html";

}

// =========================
// LOAD DASHBOARD
// =========================

if (window.location.pathname.endsWith("tenant.html")) {

    loadTenantDashboard();

    // Load PGs automatically
    setTimeout(() => {
        loadAllPGs();
    }, 300);
}



// =========================================
// FIND PG: GOOGLE MAPS & LOCATION DISCOVERY
// =========================================

// Curated high-resolution PG room photos
const PG_IMAGES = {
    "PG2001": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80", // Mannat Girls PG (Sakchi)
    "PG2002": "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80", // Nemat Girls PG (Sakchi)
    "PG1001": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80", // Nestora Comfort Stay (Sakchi)
    "PG2003": "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", // Bhagban PG (Kasidih)
    "PG2004": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80", // Shree Radhe Girls PG (Kasidih)
    "PG2005": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", // Elite Executive Boys PG (Bistupur)
    "PG1002": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80", // Nestora Elite Boys PG (Bistupur)
    "PG2006": "https://images.unsplash.com/photo-1540518614846-7ede433c4b4f?auto=format&fit=crop&w=800&q=80", // Green Leaf Co-Living (Kadma)
    "PG1003": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80", // Nestora Blossom Co-Living (Kadma)
    "PG2007": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"  // Sai Residency PG (Sonari)
};

const DEFAULT_PG_IMAGE = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80";

// Coordinates index for Jamshedpur localities
const JAMSHEDPUR_LOCALITIES = {
    "sakchi": { lat: 22.8055, lng: 86.2045, label: "Sakchi, Jamshedpur" },
    "kasidih": { lat: 22.8078, lng: 86.2120, label: "Kasidih, Jamshedpur" },
    "bistupur": { lat: 22.7850, lng: 86.1820, label: "Bistupur, Jamshedpur" },
    "kadma": { lat: 22.7880, lng: 86.1580, label: "Kadma, Jamshedpur" },
    "sonari": { lat: 22.8120, lng: 86.1650, label: "Sonari, Jamshedpur" },
    "mango": { lat: 22.8250, lng: 86.2050, label: "Mango, Jamshedpur" },
    "telco": { lat: 22.7750, lng: 86.2550, label: "Telco, Jamshedpur" },
    "golmuri": { lat: 22.7950, lng: 86.2250, label: "Golmuri, Jamshedpur" },
    "baridih": { lat: 22.8050, lng: 86.2450, label: "Baridih, Jamshedpur" },
    "jamshedpur": { lat: 22.8046, lng: 86.2029, label: "Jamshedpur Center" }
};

// Google-listed unverified external places (Requirement 5)
const GOOGLE_LISTED_PLACES = [
    {
        id: "gplace_1",
        name: "Sahu Boys Hostel & Lodge",
        address: "Near Old Bus Stand, Sakchi, Jamshedpur",
        city: "Jamshedpur",
        latitude: 22.8062,
        longitude: 22.8030,
        rating: 3.9,
        reviews_count: 28,
        source: "google_maps",
        image: "https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "gplace_2",
        name: "Ananya Working Women's Hostel",
        address: "Main Road, Near Regal Square, Bistupur, Jamshedpur",
        city: "Jamshedpur",
        latitude: 22.7840,
        longitude: 86.1835,
        rating: 4.1,
        reviews_count: 36,
        source: "google_maps",
        image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "gplace_3",
        name: "Students Paradise Lodge",
        address: "Road No 4, Kasidih, Jamshedpur",
        city: "Jamshedpur",
        latitude: 22.8085,
        longitude: 86.2105,
        rating: 3.7,
        reviews_count: 19,
        source: "google_maps",
        image: "https://images.unsplash.com/photo-1540518614846-7ede433c4b4f?auto=format&fit=crop&w=600&q=80"
    }
];

// Map State
let pgMapInstance = null;
let pgMapMarkers = [];
let searchCircleLayer = null;
let userLocationMarker = null;
let isGoogleMapsActive = false;
let currentSearchCoords = { lat: 22.8055, lng: 86.2045, label: "Sakchi, Jamshedpur" };
let currentSelectedModalPG = null;
let pendingJoinRequestPGId = null;

// =========================================
// TOAST NOTIFICATIONS
// =========================================
function showToast(message, icon = "ℹ️") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// =========================================
// INTERACTIVE MAP INITIALIZATION
// =========================================
function initPgInteractiveMap() {
    const mapContainer = document.getElementById("pgInteractiveMap");
    if (!mapContainer) return;

    // Check if Google Maps API key is configured
    const userGmapsKey = localStorage.getItem("nestora_gmaps_key");

    if (window.google && window.google.maps) {
        initGoogleMapsEngine(mapContainer);
        return;
    }

    if (userGmapsKey && !window.google) {
        loadGoogleMapsScript(userGmapsKey, () => {
            initGoogleMapsEngine(mapContainer);
        });
        return;
    }

    // Default: Leaflet / OpenStreetMap high-performance interactive engine
    initLeafletEngine(mapContainer);
}

function initLeafletEngine(mapContainer) {
    if (typeof L === "undefined") {
        console.warn("Leaflet library loading...");
        return;
    }

    const overlay = document.getElementById("mapLoadingOverlay");
    if (overlay) overlay.style.display = "none";

    if (pgMapInstance && typeof pgMapInstance.remove === "function") {
        pgMapInstance.remove();
        pgMapInstance = null;
    }

    pgMapInstance = L.map("pgInteractiveMap", {
        center: [currentSearchCoords.lat, currentSearchCoords.lng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true
    });

    // Clean OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Nestora Maps',
        maxZoom: 19
    }).addTo(pgMapInstance);

    isGoogleMapsActive = false;
    updateMapSearchLocationMarker();
}

function initGoogleMapsEngine(mapContainer) {
    const overlay = document.getElementById("mapLoadingOverlay");
    if (overlay) overlay.style.display = "none";

    pgMapInstance = new google.maps.Map(mapContainer, {
        center: { lat: currentSearchCoords.lat, lng: currentSearchCoords.lng },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
    });

    isGoogleMapsActive = true;
    updateMapSearchLocationMarker();
    fetchNearbyPgs();
}

function loadGoogleMapsScript(apiKey, callback) {
    if (document.getElementById("google-maps-script")) {
        if (callback) callback();
        return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
        if (callback) callback();
    };
    script.onerror = () => {
        showToast("Could not load Google Maps with provided key. Using default map.", "⚠️");
        initLeafletEngine(document.getElementById("pgInteractiveMap"));
    };
    document.head.appendChild(script);
}

function updateMapSearchLocationMarker() {
    if (!pgMapInstance) return;

    const lat = currentSearchCoords.lat;
    const lng = currentSearchCoords.lng;
    const radiusKm = parseFloat(document.getElementById("filterDistance")?.value || "5");

    if (isGoogleMapsActive) {
        if (userLocationMarker) userLocationMarker.setMap(null);
        if (searchCircleLayer) searchCircleLayer.setMap(null);

        userLocationMarker = new google.maps.Marker({
            position: { lat, lng },
            map: pgMapInstance,
            title: currentSearchCoords.label,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#ef4444",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2
            }
        });

        searchCircleLayer = new google.maps.Circle({
            strokeColor: "#2563eb",
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            fillColor: "#2563eb",
            fillOpacity: 0.08,
            map: pgMapInstance,
            center: { lat, lng },
            radius: radiusKm * 1000
        });

        pgMapInstance.panTo({ lat, lng });
    } else if (typeof L !== "undefined" && pgMapInstance) {
        if (userLocationMarker) pgMapInstance.removeLayer(userLocationMarker);
        if (searchCircleLayer) pgMapInstance.removeLayer(searchCircleLayer);

        const redPinIcon = L.divIcon({
            className: "custom-div-pin",
            html: `<div style="background: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #ef4444;"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });

        userLocationMarker = L.marker([lat, lng], { icon: redPinIcon })
            .addTo(pgMapInstance)
            .bindPopup(`<strong>📍 Search Center</strong><br>${currentSearchCoords.label}`);

        searchCircleLayer = L.circle([lat, lng], {
            radius: radiusKm * 1000,
            color: "#2563eb",
            weight: 1.5,
            fillColor: "#2563eb",
            fillOpacity: 0.08
        }).addTo(pgMapInstance);

        pgMapInstance.setView([lat, lng], radiusKm <= 2 ? 15 : radiusKm <= 5 ? 14 : 13);
    }
}

// =========================================
// LOCATION SEARCH & GEOLOCATION
// =========================================
function toggleClearSearchBtn() {
    const input = document.getElementById("pgLocationInput");
    const clearBtn = document.getElementById("clearLocSearchBtn");
    if (input && clearBtn) {
        clearBtn.style.display = input.value.trim().length > 0 ? "block" : "none";
    }
}

function clearLocationInput() {
    const input = document.getElementById("pgLocationInput");
    if (input) input.value = "";
    toggleClearSearchBtn();
}

function executeLocationSearch() {
    const input = document.getElementById("pgLocationInput");
    const query = input ? input.value.trim() : "";

    if (!query) {
        showToast("Please enter an area, city, landmark or address", "📍");
        return;
    }

    const lowerQuery = query.toLowerCase();

    // Check locality match
    for (const [key, loc] of Object.entries(JAMSHEDPUR_LOCALITIES)) {
        if (lowerQuery.includes(key)) {
            currentSearchCoords = { lat: loc.lat, lng: loc.lng, label: `${query}` };
            updateLocationUI();
            fetchNearbyPgs();
            return;
        }
    }

    // Try Nominatim Geocoder for any specific address/landmark
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Jamshedpur")}`;
    fetch(geocodeUrl)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                currentSearchCoords = { lat, lng, label: query };
                updateLocationUI();
                fetchNearbyPgs();
            } else {
                // Default to Jamshedpur center with search term applied to backend text search
                currentSearchCoords = { lat: 22.8055, lng: 86.2045, label: query };
                updateLocationUI();
                fetchNearbyPgs();
            }
        })
        .catch(() => {
            currentSearchCoords = { lat: 22.8055, lng: 86.2045, label: query };
            updateLocationUI();
            fetchNearbyPgs();
        });
}

function searchByLocality(locName, btn) {
    document.querySelectorAll(".ql-chip").forEach(c => c.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const input = document.getElementById("pgLocationInput");
    if (input) {
        input.value = locName;
        toggleClearSearchBtn();
    }

    const loc = JAMSHEDPUR_LOCALITIES[locName.toLowerCase()] || JAMSHEDPUR_LOCALITIES["sakchi"];
    currentSearchCoords = { lat: loc.lat, lng: loc.lng, label: loc.label };

    updateLocationUI();
    fetchNearbyPgs();
}

function useCurrentLocation() {
    const btn = document.getElementById("currentLocBtn");
    if (btn) {
        btn.classList.add("locating");
        btn.innerHTML = "⏳ Detecting GPS Location...";
    }

    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "⚠️");
        resetLocBtn();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            resetLocBtn();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            currentSearchCoords = {
                lat: lat,
                lng: lng,
                label: "My Current Location"
            };

            const input = document.getElementById("pgLocationInput");
            if (input) {
                input.value = "Current Location";
                toggleClearSearchBtn();
            }

            document.querySelectorAll(".ql-chip").forEach(c => c.classList.remove("active"));
            updateLocationUI();
            fetchNearbyPgs();
            showToast("Detected your GPS location! Showing nearby PGs.", "📍");
        },
        (error) => {
            resetLocBtn();
            console.warn("GEOLOCATION ERROR:", error);
            showToast("Location permission denied. Showing Sakchi, Jamshedpur.", "⚠️");
            currentSearchCoords = { lat: 22.8055, lng: 86.2045, label: "Sakchi, Jamshedpur" };
            updateLocationUI();
            fetchNearbyPgs();
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function resetLocBtn() {
    const btn = document.getElementById("currentLocBtn");
    if (btn) {
        btn.classList.remove("locating");
        btn.innerHTML = "📍 Use My Current Location";
    }
}

function updateLocationUI() {
    const label = document.getElementById("currentLocationLabel");
    if (label) label.textContent = currentSearchCoords.label;
    updateMapSearchLocationMarker();
}

// =========================================
// FETCH NEARBY PGS (BACKEND INTEGRATION)
// =========================================
function applyFiltersAndFetch() {
    updateMapSearchLocationMarker();
    fetchNearbyPgs();
}

function resetAllPgFilters() {
    const dist = document.getElementById("filterDistance");
    if (dist) dist.value = "5";

    const rent = document.getElementById("filterRent");
    if (rent) rent.value = "0";

    const gender = document.getElementById("filterGender");
    if (gender) gender.value = "";

    const sharing = document.getElementById("filterSharing");
    if (sharing) sharing.value = "";

    const beds = document.getElementById("filterBeds");
    if (beds) beds.value = "0";

    const rating = document.getElementById("filterRating");
    if (rating) rating.value = "0";

    const sortBy = document.getElementById("filterSortBy");
    if (sortBy) sortBy.value = "nearest";

    document.querySelectorAll(".amenities-selection-row input[type='checkbox']").forEach(cb => cb.checked = false);

    applyFiltersAndFetch();
    showToast("Filters reset to default", "🔄");
}

function refreshNearbyPgs() {
    fetchNearbyPgs();
    showToast("Refreshed nearby listings", "🔄");
}

async function fetchNearbyPgs() {
    const grid = document.getElementById("nearbyPgResultsGrid");
    if (!grid) return;

    grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
            <div class="big-icon">⏳</div>
            <h2>Finding Nearby PGs...</h2>
            <p>Searching verified properties within radius around ${currentSearchCoords.label}.</p>
        </div>
    `;

    // Read filter parameters
    const radius = parseFloat(document.getElementById("filterDistance")?.value || "5");
    const rent = parseFloat(document.getElementById("filterRent")?.value || "0");
    const gender = document.getElementById("filterGender")?.value || "";
    const sharing = document.getElementById("filterSharing")?.value || "";
    const minBeds = parseInt(document.getElementById("filterBeds")?.value || "0");
    const rating = parseFloat(document.getElementById("filterRating")?.value || "0");
    const sortBy = document.getElementById("filterSortBy")?.value || "nearest";

    const amenitiesList = [];
    document.querySelectorAll(".amenities-selection-row input[type='checkbox']:checked").forEach(cb => {
        amenitiesList.push(cb.value);
    });
    const amenities = amenitiesList.join(",");

    const search = document.getElementById("pgLocationInput")?.value.trim() || "";

    const params = new URLSearchParams({
        latitude: currentSearchCoords.lat,
        longitude: currentSearchCoords.lng,
        radius: radius,
        rent: rent,
        gender: gender,
        sharing: sharing,
        rating: rating,
        amenities: amenities,
        sort_by: sortBy
    });

    if (search && !JAMSHEDPUR_LOCALITIES[search.toLowerCase()]) {
        params.append("search", search);
    }

    try {
        const response = await fetch(`${API_URL}/api/pgs/nearby?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Unable to fetch nearby PGs");
        }

        let nestoraPgs = data.pgs || [];

        // Apply beds filter client side if needed
        if (minBeds > 0) {
            nestoraPgs = nestoraPgs.filter(p => (p.available_beds || 0) >= minBeds);
        }

        // Calculate distances for Google Places within radius
        const nearbyGooglePlaces = GOOGLE_LISTED_PLACES.map(g => {
            const dist = calculateDistanceKm(currentSearchCoords.lat, currentSearchCoords.lng, g.latitude, g.longitude);
            return {
                ...g,
                distance_km: dist,
                distance_text: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`
            };
        }).filter(g => g.distance_km <= radius);

        // Update stats
        const statsBadge = document.getElementById("pgResultStatsBadge");
        if (statsBadge) statsBadge.textContent = `${nestoraPgs.length + nearbyGooglePlaces.length} Found`;

        const subTitle = document.getElementById("resultsCountSubtitle");
        if (subTitle) {
            subTitle.textContent = `Showing ${nestoraPgs.length} Nestora PGs and ${nearbyGooglePlaces.length} Google places within ${radius} km of ${currentSearchCoords.label}`;
        }

        // Update Map Markers
        updateMapMarkers(nestoraPgs, nearbyGooglePlaces);

        // Render Cards
        renderNearbyPgCards(nestoraPgs, nearbyGooglePlaces);

    } catch (error) {
        console.error("NEARBY PGS FETCH ERROR:", error);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
                <div class="big-icon">⚠️</div>
                <h2>Unable to Load Nearby PGs</h2>
                <p>Ensure the Nestora FastAPI backend is running on port 8000.</p>
                <button class="primary-dashboard-btn" onclick="fetchNearbyPgs()" style="margin-top: 15px;">
                    Try Again
                </button>
            </div>
        `;
    }
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}

// =========================================
// RENDER MAP MARKERS & POPUPS
// =========================================
function updateMapMarkers(nestoraPgs, googlePlaces) {
    if (!pgMapInstance) return;

    // Clear existing markers
    if (isGoogleMapsActive) {
        pgMapMarkers.forEach(m => m.setMap(null));
        pgMapMarkers = [];
    } else if (typeof L !== "undefined" && pgMapInstance) {
        pgMapMarkers.forEach(m => pgMapInstance.removeLayer(m));
        pgMapMarkers = [];
    }

    // 1. Google Listed PG Markers (Blue)
    nestoraPgs.forEach(pg => {
        if (!pg.latitude || !pg.longitude) return;

        const popupHtml = `
            <div class="custom-map-popup">
                <div class="popup-title">${pg.pg_name}</div>
                <div class="popup-address">📍 ${pg.address}</div>
                <div class="popup-rent">₹${Number(pg.monthly_rent).toLocaleString('en-IN')}/mo • ⭐ ${pg.avg_rating}</div>
                <div style="font-size: 11px; color: #d97706; font-weight: 700; margin-bottom: 8px;">📍 Google Listed Place (${pg.distance_text})</div>
                <div class="popup-buttons" style="display: flex; gap: 4px; margin-top: 6px;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pg.pg_name + ' ' + pg.address)}" target="_blank" style="flex:1; padding: 5px 6px; font-size: 11px; background: #eff6ff; color: #1d4ed8; text-align: center; border-radius: 6px; text-decoration: none; font-weight: 700;">🗺️ Maps</a>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${pg.latitude},${pg.longitude}" target="_blank" style="flex:1; padding: 5px 6px; font-size: 11px; background: #f0fdf4; color: #15803d; text-align: center; border-radius: 6px; text-decoration: none; font-weight: 700;">🧭 Dir</a>
                    <button class="popup-join-btn" onclick="handleRequestToJoin('${pg.pg_id}', '${pg.pg_name.replace(/'/g, "\\'")}')" style="flex:1.2; padding: 5px 6px; font-size: 11px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Join</button>
                </div>
            </div>
        `;

        if (isGoogleMapsActive) {
            const marker = new google.maps.Marker({
                position: { lat: pg.latitude, lng: pg.longitude },
                map: pgMapInstance,
                title: pg.pg_name,
                icon: {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: "#2563eb",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2
                }
            });

            const infoWindow = new google.maps.InfoWindow({ content: popupHtml });
            marker.addListener("click", () => {
                infoWindow.open(pgMapInstance, marker);
                highlightCard(pg.pg_id);
            });
            pgMapMarkers.push(marker);

        } else if (typeof L !== "undefined") {
            const blueIcon = L.divIcon({
                className: "custom-div-pin",
                html: `<div style="background: #2563eb; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🏢</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            const marker = L.marker([pg.latitude, pg.longitude], { icon: blueIcon })
                .addTo(pgMapInstance)
                .bindPopup(popupHtml);

            marker.on("click", () => highlightCard(pg.pg_id));
            pgMapMarkers.push(marker);
        }
    });

    // 2. Google-listed Unregistered Places (Amber Pin) (Requirement 5)
    googlePlaces.forEach(place => {
        const popupHtml = `
            <div class="custom-map-popup">
                <div class="popup-title">${place.name}</div>
                <div class="popup-address">📍 ${place.address}</div>
                <div style="font-size: 11px; color: #b45309; font-weight: 700; margin-bottom: 8px;">🗺️ Google Maps Listing (Unregistered on Nestora)</div>
                <div class="popup-buttons">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}" target="_blank" class="popup-view-btn">View on Google</a>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}" target="_blank" class="popup-join-btn" style="background: #f59e0b;">Directions</a>
                </div>
            </div>
        `;

        if (isGoogleMapsActive) {
            const marker = new google.maps.Marker({
                position: { lat: place.latitude, lng: place.longitude },
                map: pgMapInstance,
                title: place.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: "#f59e0b",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2
                }
            });

            const infoWindow = new google.maps.InfoWindow({ content: popupHtml });
            marker.addListener("click", () => infoWindow.open(pgMapInstance, marker));
            pgMapMarkers.push(marker);

        } else if (typeof L !== "undefined") {
            const amberIcon = L.divIcon({
                className: "custom-div-pin",
                html: `<div style="background: #f59e0b; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🗺️</div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });

            const marker = L.marker([place.latitude, place.longitude], { icon: amberIcon })
                .addTo(pgMapInstance)
                .bindPopup(popupHtml);

            pgMapMarkers.push(marker);
        }
    });
}

function highlightCard(pgId) {
    const card = document.getElementById(`pg-card-${pgId}`);
    if (card) {
        document.querySelectorAll(".nearby-pg-card").forEach(c => c.classList.remove("highlighted"));
        card.classList.add("highlighted");
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

// =========================================
// RENDER PG CARDS & GOOGLE PLACES
// =========================================
function renderNearbyPgCards(nestoraPgs, googlePlaces) {
    const grid = document.getElementById("nearbyPgResultsGrid");
    if (!grid) return;

    if (nestoraPgs.length === 0 && googlePlaces.length === 0) {
        // Requirement 12: Empty State
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 45px 20px;">
                <div class="big-icon">📍</div>
                <h2>No PGs found in this area.</h2>
                <div style="color: #64748b; font-size: 14px; margin: 12px 0 20px 0; line-height: 1.6; max-width: 440px; margin-left: auto; margin-right: auto;">
                    <strong>Suggestions:</strong><br>
                    • Try searching another location (e.g. Sakchi, Bistupur)<br>
                    • Increase your search radius (e.g. 10 km)<br>
                    • Change your budget or room sharing type<br>
                    • Remove some amenity filters
                </div>
                <button class="primary-dashboard-btn" onclick="searchByLocality('Sakchi')" style="padding: 10px 24px; border-radius: 10px; font-weight: 700;">
                    Search Sakchi Center
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = "";

    // 1. Render Nestora Registered PGs
    nestoraPgs.forEach(pg => {
        const imageUrl = PG_IMAGES[pg.pg_id] || DEFAULT_PG_IMAGE;
        const availableBeds = pg.available_beds !== undefined ? Number(pg.available_beds) : 3;

        let bedText = `🛏️ ${availableBeds} Beds Avail.`;
        if (availableBeds === 1) bedText = `⚡ Only 1 Bed Left!`;
        else if (availableBeds <= 0) bedText = `🔴 Fully Booked`;

        const card = document.createElement("div");
        card.className = "nearby-pg-card";
        card.id = `pg-card-${pg.pg_id}`;

        card.innerHTML = `
            <!-- Cover -->
            <div class="pg-card-cover-box">
                <img src="${imageUrl}" alt="${pg.pg_name}" loading="lazy">
                <div class="pg-card-cover-badges">
                    <span class="google-badge">📍 Google Listed Place</span>
                    <span style="background: rgba(255,255,255,0.95); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #1e3a8a;">
                        ${pg.gender_allowed || 'All'}
                    </span>
                </div>
                <span class="distance-pill">📍 ${pg.distance_text}</span>
            </div>

            <!-- Content -->
            <div class="nearby-card-body">
                <div class="card-title-row">
                    <div>
                        <h3 class="card-pg-name">${pg.pg_name}</h3>
                        <div class="google-verified-tag">📍 Google Maps Listed Place</div>
                    </div>
                    <div class="card-header-right">
                        <div class="card-rating-pill">⭐ ${pg.avg_rating || 4.6}</div>
                    </div>
                </div>

                <div class="card-address-text">
                    📍 ${pg.address}
                </div>

                <!-- PG Owner Info -->
                <div style="font-size: 12px; color: #334155; margin: 4px 0 8px 0; background: #f8fafc; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                    <span>👤 <strong>Managed by:</strong> ${pg.owner_name || 'PG Owner'}</span>
                    <span class="pg-id-pill" style="font-size: 11px;">${pg.owner_code || 'OWN'}</span>
                </div>

                <div class="card-spec-chips">
                    <span class="spec-chip">🏠 ${pg.pg_type || 'PG Room'}</span>
                    <span class="spec-chip">${bedText}</span>
                    <span class="spec-chip">📍 Google Listed</span>
                </div>

                <div class="card-amenities-pills">
                    <span class="card-amenity-tag">📶 Wi-Fi</span>
                    <span class="card-amenity-tag">🍲 Food</span>
                    <span class="card-amenity-tag">❄️ AC</span>
                    <span class="card-amenity-tag">⚡ Backup</span>
                    <span class="card-amenity-tag">🧺 Laundry</span>
                    <span class="card-amenity-tag">🛡️ CCTV</span>
                    <span class="card-amenity-tag">🚿 Attached Bath</span>
                </div>

                <div class="card-price-row">
                    <div>
                        <div class="rent-big">₹${Number(pg.monthly_rent).toLocaleString('en-IN')}<small>/month</small></div>
                    </div>
                    <div>
                        <span class="deposit-small">Deposit: ₹${Number(pg.security_deposit || pg.monthly_rent).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <!-- Google Maps Box: View Google Map & Get Direction in a Box -->
                <div class="pg-card-action-box pg-map-box">
                    <div class="action-box-row">
                        <button type="button" 
                                onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pg.pg_name + ' ' + pg.address)}', '_blank')" 
                                class="btn-box-gmap" 
                                title="View on Google Maps">
                            🗺️ View Google Map
                        </button>
                        <button type="button" 
                                onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${pg.latitude || '22.8035'},${pg.longitude || '86.2025'}', '_blank')" 
                                class="btn-box-direction" 
                                title="Get Direction on Google Maps">
                            🧭 Get Direction
                        </button>
                    </div>
                </div>

                <!-- Card Actions: View Details & Request to Join -->
                <div class="card-bottom-actions">
                    <button class="btn-card-details" 
                            onclick="openPgDetailsModal('${pg.pg_id}')" 
                            title="View Room Details">
                        👁️ View Details
                    </button>
                    <button class="btn-card-join" 
                            id="join-btn-${pg.pg_id}" 
                            onclick="handleRequestToJoin('${pg.pg_id}', '${pg.pg_name.replace(/'/g, "\\'")}')">
                        🚀 Request to Join
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    // 2. Render Google-listed Unregistered Places (Requirement 5)
    googlePlaces.forEach(place => {
        const placeId = place.id || place.name.replace(/\s+/g, '_');
        const card = document.createElement("div");
        card.className = "nearby-pg-card";
        card.id = `pg-card-${placeId}`;

        card.innerHTML = `
            <div class="pg-card-cover-box">
                <img src="${place.image}" alt="${place.name}" loading="lazy">
                <div class="pg-card-cover-badges">
                    <span class="google-badge">📍 Google Listed Place</span>
                </div>
                <span class="distance-pill">📍 ${place.distance_text}</span>
            </div>

            <div class="nearby-card-body">
                <div class="card-title-row">
                    <div>
                        <h3 class="card-pg-name">${place.name}</h3>
                        <div class="google-verified-tag">📍 Google Maps Listed Place</div>
                    </div>
                    <div class="card-rating-pill" style="background: #fef3c7; color: #b45309;">⭐ ${place.rating}</div>
                </div>

                <div class="card-address-text">
                    📍 ${place.address}
                </div>

                <div class="card-spec-chips">
                    <span class="spec-chip">🏠 PG / Hostel</span>
                    <span class="spec-chip">📍 Google Listed</span>
                </div>

                <!-- Google Maps Box: View Google Map & Get Direction in a Box -->
                <div class="pg-card-action-box pg-map-box" style="margin-top: auto;">
                    <div class="action-box-row">
                        <button type="button" 
                                onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}', '_blank')" 
                                class="btn-box-gmap" 
                                title="View on Google Maps">
                            🗺️ View Google Map
                        </button>
                        <button type="button" 
                                onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}', '_blank')" 
                                class="btn-box-direction" 
                                title="Get Direction on Google Maps">
                            🧭 Get Direction
                        </button>
                    </div>
                </div>

                <!-- Card Actions: View Details & Request to Join -->
                <div class="card-bottom-actions">
                    <button class="btn-card-details" 
                            onclick="openPgDetailsModal('${placeId}')" 
                            title="View Details">
                        👁️ View Details
                    </button>
                    <button class="btn-card-join" 
                            id="join-btn-${placeId}" 
                            onclick="handleRequestToJoin('${placeId}', '${place.name.replace(/'/g, "\\'")}')">
                        🚀 Request to Join
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// =========================================
// REQUEST TO JOIN WORKFLOW (REQUIREMENT 4)
// =========================================
async function handleRequestToJoin(pgId, pgName) {
    const user = getLoggedTenant();
    if (!user || !user.id) {
        alert("Please login as a tenant to send a joining request.");
        window.location.href = "tenant-auth.html";
        return;
    }

    const btn = document.getElementById(`join-btn-${pgId}`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Sending Request...";
    }

    try {
        const response = await fetch(`${API_URL}/api/tenant/join-pg`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: user.id,
                pg_id: pgId
            })
        });

        const result = await response.json();

        if (!response.ok) {
            if (btn) {
                btn.disabled = false;
                btn.textContent = "🚀 Request to Join";
            }
            alert(result.detail || "Unable to send request.");
            return;
        }

        // Show Success Modal (Requirement 4)
        if (btn) {
            btn.disabled = true;
            btn.textContent = "⏳ Request Pending";
        }

        const successMsg = document.getElementById("requestSuccessMessage");
        if (successMsg) {
            const ownerTxt = result.owner_name ? `<strong>${result.owner_name} (${result.owner_code})</strong>` : "the PG Owner";
            successMsg.innerHTML = `
                Your joining request for <strong>${pgName}</strong> has been successfully delivered to ${ownerTxt}!<br><br>
                <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 14px; font-size: 13px; color: #334155; text-align: left; line-height: 1.6;">
                    📍 <strong>Owner Verification Info:</strong><br>
                    • <strong>Assigned Owner:</strong> ${result.owner_name || 'PG Owner'} (${result.owner_code || 'OWN'})<br>
                    • <strong>Status:</strong> Pending Approval<br>
                    • <strong>How to approve:</strong> Open the Owner Panel (<code>owner.html</code>), switch/login to Owner ID <strong>${result.owner_code || 'OWN1002'}</strong>, and click <strong>Approve</strong>.<br>
                    • Once approved, this PG will instantly activate in your <strong>My PG</strong> tab!
                </div>
            `;
        }

        const modal = document.getElementById("requestSuccessModal");
        if (modal) modal.classList.remove("hidden");

        showToast(`Request sent to ${result.owner_name || 'Owner'} (${result.owner_code || 'OWN'})! Status: Pending`, "✅");

    } catch (error) {
        console.error("JOIN REQUEST ERROR:", error);
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Request to Join";
        }
        alert("Could not connect to the backend server. Make sure it is running.");
    }
}

function closeRequestSuccessModal() {
    const modal = document.getElementById("requestSuccessModal");
    if (modal) modal.classList.add("hidden");
}

// =========================================
// PG DETAILS MODAL
// =========================================
async function openPgDetailsModal(pgId) {
    const modal = document.getElementById("pgDetailsModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    currentSelectedModalPG = pgId;

    document.getElementById("modalPgName").textContent = "Loading PG Details...";
    document.getElementById("modalPgLocation").textContent = "Fetching...";
    document.getElementById("modalPgDesc").textContent = "Please wait...";
    const gplace = (typeof GOOGLE_LISTED_PLACES !== 'undefined') ? GOOGLE_LISTED_PLACES.find(g => g.id === pgId || g.name.replace(/\s+/g, '_') === pgId) : null;
    if (gplace) {
        document.getElementById("modalPgName").textContent = gplace.name;
        document.getElementById("modalPgLocation").textContent = `📍 ${gplace.address}`;
        document.getElementById("modalPgDesc").textContent = "Public property indexed from Google Maps. Room allocation and rent details available upon booking request.";
        document.getElementById("modalRent").textContent = "₹5,000 - ₹8,000/mo";
        document.getElementById("modalDeposit").textContent = "1 Month Rent";
        document.getElementById("modalRating").textContent = `⭐ ${gplace.rating || 4.2}`;
        const dist = calculateDistanceKm(currentSearchCoords.lat, currentSearchCoords.lng, gplace.latitude, gplace.longitude);
        document.getElementById("modalDistance").textContent = dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`;
        const coverImg = document.getElementById("modalCoverImg");
        if (coverImg) coverImg.src = gplace.image || DEFAULT_PG_IMAGE;
        const roomsContainer = document.getElementById("modalRoomsList");
        if (roomsContainer) {
            roomsContainer.innerHTML = `<div style="padding: 14px; color: #64748b;">Hostel / Room sharing details available on request.</div>`;
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/pgs/${pgId}/details`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.detail || "Failed to load details");

        const pg = data.pg;
        document.getElementById("modalPgName").textContent = pg.pg_name;
        document.getElementById("modalPgLocation").textContent = `📍 ${pg.address}, ${pg.city || 'Jamshedpur'}`;
        document.getElementById("modalPgDesc").textContent = pg.description || "Well-maintained PG with all verified facilities.";
        document.getElementById("modalRent").textContent = `₹${Number(pg.monthly_rent).toLocaleString('en-IN')}/mo`;
        document.getElementById("modalDeposit").textContent = `₹${Number(pg.security_deposit || pg.monthly_rent).toLocaleString('en-IN')}`;
        document.getElementById("modalRating").textContent = `⭐ ${data.avg_rating || 4.6}`;

        // Calculate distance from current search
        const dist = calculateDistanceKm(currentSearchCoords.lat, currentSearchCoords.lng, pg.latitude || 22.8055, pg.longitude || 86.2045);
        document.getElementById("modalDistance").textContent = dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`;

        const coverImg = document.getElementById("modalCoverImg");
        if (coverImg) coverImg.src = PG_IMAGES[pg.pg_id] || DEFAULT_PG_IMAGE;

        // Render rooms
        const roomsContainer = document.getElementById("modalRoomsList");
        if (roomsContainer) {
            if (!data.rooms || data.rooms.length === 0) {
                roomsContainer.innerHTML = `<div style="padding: 14px; color: #64748b;">No rooms currently configured.</div>`;
            } else {
                roomsContainer.innerHTML = "";
                data.rooms.forEach(room => {
                    const row = document.createElement("div");
                    row.className = "room-card-select";

                    let bedsHtml = "";
                    (room.beds || []).forEach(b => {
                        const isAvail = b.status === "available";
                        bedsHtml += `
                            <span class="bed-chip ${isAvail ? 'available' : 'occupied'}">
                                Bed ${b.bed_number} ${isAvail ? '🟢' : '✕'}
                            </span>
                        `;
                    });

                    row.innerHTML = `
                        <div class="room-card-top">
                            <div>
                                <h4 style="margin: 0; font-size: 14px; color: #0f172a;">Room ${room.room_number} (${room.room_type || 'Sharing'})</h4>
                            </div>
                            <div class="room-card-rent">₹${Number(room.rent || pg.monthly_rent).toLocaleString('en-IN')}/mo</div>
                        </div>
                        <div class="beds-container">${bedsHtml}</div>
                    `;
                    roomsContainer.appendChild(row);
                });
            }
        }

    } catch (e) {
        console.error("DETAILS ERROR:", e);
    }
}

function closePgDetailsModal() {
    const modal = document.getElementById("pgDetailsModal");
    if (modal) modal.classList.add("hidden");
}

function sendJoinRequestFromModal() {
    if (!currentSelectedModalPG) return;
    const pgName = document.getElementById("modalPgName").textContent;
    closePgDetailsModal();
    handleRequestToJoin(currentSelectedModalPG, pgName);
}

// =========================================
// GOOGLE MAPS API KEY CONFIG MODAL
// =========================================
function openApiKeyModal() {
    const modal = document.getElementById("gmapsKeyModal");
    const input = document.getElementById("gmapsApiKeyInput");
    if (input) input.value = localStorage.getItem("nestora_gmaps_key") || "";
    if (modal) modal.classList.remove("hidden");
}

function closeApiKeyModal() {
    const modal = document.getElementById("gmapsKeyModal");
    if (modal) modal.classList.add("hidden");
}

function saveGoogleMapsKey() {
    const input = document.getElementById("gmapsApiKeyInput");
    const key = input ? input.value.trim() : "";

    if (key) {
        localStorage.setItem("nestora_gmaps_key", key);
        showToast("Google Maps key saved! Loading Google Maps Engine...", "🗺️");
        closeApiKeyModal();
        loadGoogleMapsScript(key, () => {
            initGoogleMapsEngine(document.getElementById("pgInteractiveMap"));
        });
    } else {
        localStorage.removeItem("nestora_gmaps_key");
        showToast("Switched to default OpenStreetMap engine.", "ℹ️");
        closeApiKeyModal();
        initLeafletEngine(document.getElementById("pgInteractiveMap"));
    }
}

// =========================================
// =========================================
// MY PG SECTION
// =========================================
async function loadMyPG() {
    const container = document.getElementById("myPgContainer");
    if (!container) return;

    const user = getLoggedTenant();
    if (!user) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="big-icon">🏢</div>
            <h2>Checking PG Status...</h2>
            <p>Fetching your current accommodation details.</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/api/tenant/${user.id || user.user_id}/current-pg`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.detail || "Unable to load PG status");

        const pgStatus = document.getElementById("pgStatus");

        if (!data.has_pg) {
            if (pgStatus) pgStatus.textContent = "Not joined";
            container.innerHTML = `
                <div class="coming-card" style="text-align: center; padding: 40px 20px;">
                    <div class="big-icon" style="font-size: 54px; margin-bottom: 12px;">🏢</div>
                    <h2 style="font-size: 24px; color: #0f172a; margin-bottom: 8px;">No PG Connected Yet</h2>
                    <p style="color: #64748b; max-width: 500px; margin: 0 auto 24px auto;">
                        You are currently not joined in any PG. Explore accommodations on the map and send a Request to Join. Once the owner accepts your request, your PG will appear here.
                    </p>
                    <button class="primary-dashboard-btn" onclick="showSection('find-pg')" style="padding: 12px 26px; border-radius: 12px; font-weight: 700;">
                        🔍 Find PG on Map
                    </button>
                </div>
            `;
            return;
        }

        if (data.connection_status === "pending") {
            if (pgStatus) pgStatus.textContent = "Pending Approval";
            container.innerHTML = `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); max-width: 600px; margin: 0 auto; text-align: center;">
                    <span style="background: #fef3c7; color: #b45309; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; border: 1px solid #fde68a;">
                        ⏳ Request Pending Owner Approval
                    </span>
                    <h2 style="font-size: 24px; color: #0f172a; margin: 16px 0 6px 0;">Request Sent to ${data.pg.pg_name}</h2>
                    <p style="color: #64748b; font-size: 14px;">📍 ${data.pg.address}</p>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: left;">
                        <div style="font-size: 13px; color: #334155; margin-bottom: 6px;"><strong>Owner:</strong> ${data.owner.name} (${data.owner.phone})</div>
                        <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Your join request is awaiting owner verification. This PG will be <strong>officially added as your active stay only after the owner accepts the request</strong>.
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button class="view-btn" onclick="cancelPendingRequest(${data.request_id})" style="border: 1px solid #fca5a5; color: #ef4444; border-radius: 10px; padding: 10px 20px;">
                            ✕ Cancel Request
                        </button>
                        <button class="primary-dashboard-btn" onclick="showSection('find-pg')" style="padding: 10px 20px; border-radius: 10px;">
                            🔍 View Other PGs
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Active PG
        if (pgStatus) pgStatus.textContent = data.pg.pg_name;
        const isDue = data.rent_info.status === "due";

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 26px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                        <span style="background: #f0fdf4; color: #16a34a; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: 1px solid #bbf7d0;">
                            ACTIVE PG
                        </span>
                        <span class="google-badge" style="font-size: 11px;">
                            📍 Google Listed Place
                        </span>
                    </div>
                    <h2 style="font-size: 26px; color: #0f172a; margin: 4px 0 4px 0;">${data.pg.pg_name}</h2>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">📍 ${data.pg.address}</p>

                    <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 18px; margin: 20px 0; display: flex; justify-content: space-around; text-align: center;">
                        <div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 600;">ROOM</div>
                            <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${data.room ? `Room ${data.room.room_number}` : 'Room 102'}</div>
                        </div>
                        <div style="border-right: 1px solid #e2e8f0;"></div>
                        <div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 600;">BED</div>
                            <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${data.bed ? `Bed ${data.bed.bed_number}` : 'Bed A'}</div>
                        </div>
                        <div style="border-right: 1px solid #e2e8f0;"></div>
                        <div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 600;">RENT</div>
                            <div style="font-size: 20px; font-weight: 800; color: #16a34a;">₹${Number(data.pg.monthly_rent).toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; align-items: center;">
                        <button class="primary-dashboard-btn" onclick="showSection('payments')" style="padding: 10px 18px; border-radius: 10px;">
                            💳 Pay Rent & History
                        </button>
                        
                        <!-- Google Maps Navigation Box -->
                        <div class="pg-card-action-box" style="margin: 0; padding: 4px 8px; display: inline-flex; gap: 8px;">
                            <button type="button" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.pg.pg_name + ' ' + data.pg.address)}', '_blank')" class="btn-box-gmap" style="padding: 8px 12px; min-height: 38px; border-radius: 8px;">
                                🗺️ View Google Map
                            </button>
                            <button type="button" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${data.pg.latitude || '22.8055'},${data.pg.longitude || '86.2045'}', '_blank')" class="btn-box-direction" style="padding: 8px 12px; min-height: 38px; border-radius: 8px;">
                                🧭 Get Direction
                            </button>
                        </div>

                        <button class="view-btn" onclick="showSection('complaints')" style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 16px;">
                            📝 Raise Complaint
                        </button>
                        <button class="view-btn" onclick="confirmLeavePG()" style="border: 1px solid #fca5a5; color: #ef4444; border-radius: 10px; padding: 10px 16px; font-weight: 700;">
                            🚪 Leave PG
                        </button>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
                        <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 12px;">Rent: ${data.rent_info.current_month}</h3>
                        <div style="font-size: 28px; font-weight: 800; color: ${isDue ? '#2563eb' : '#16a34a'}; margin-bottom: 6px;">
                            ₹${Number(data.rent_info.amount_due).toLocaleString('en-IN')}
                        </div>
                        <div style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
                            Status: <strong style="color: ${isDue ? '#ea580c' : '#16a34a'};">${isDue ? 'Due' : 'Paid ✅'}</strong>
                        </div>
                        ${isDue ? `
                            <button class="primary-dashboard-btn" onclick="openPayRentModal()" style="width: 100%; padding: 12px; border-radius: 10px; font-weight: 700;">
                                💳 Pay Rent Now
                            </button>
                        ` : `
                            <button class="view-btn" onclick="showSection('receipts')" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px;">
                                🧾 View Receipt
                            </button>
                        `}
                    </div>

                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
                        <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 8px;">PG Owner</h3>
                        <div style="font-weight: 700; color: #0f172a;">${data.owner.name}</div>
                        <div style="color: #64748b; font-size: 13px; margin: 4px 0 12px 0;">📞 ${data.owner.phone}</div>
                        <a href="tel:${data.owner.phone}" class="primary-dashboard-btn" style="display: block; text-align: center; text-decoration: none; padding: 8px; border-radius: 8px; font-size: 13px;">
                            Call Owner
                        </a>
                    </div>
                </div>
            </div>
        `;

    } catch (e) {
        console.error("MY PG ERROR:", e);
    }
}

async function cancelPendingRequest(requestId) {
    if (!confirm("Are you sure you want to cancel your PG join request?")) return;

    const user = getLoggedTenant();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/tenant/cancel-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ request_id: requestId, tenant_id: user.id || user.user_id })
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message || "Request cancelled successfully", "ℹ️");
            await loadMyPG();
            const pgStatus = document.getElementById("pgStatus");
            if (pgStatus) pgStatus.textContent = "Not joined";
        } else {
            alert(data.detail || "Unable to cancel request.");
        }
    } catch (e) {
        console.error("Cancel request error:", e);
        alert("Failed to cancel request.");
    }
}

async function confirmLeavePG() {
    if (!confirm("Are you sure you want to leave your current PG? All bed and room allocations will be released.")) return;

    const user = getLoggedTenant();
    if (!user) {
        alert("Please login first.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/tenant/leave-pg`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenant_id: user.id || user.user_id })
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message || "You have successfully left the PG.", "👋");
            await loadMyPG();
            if (typeof loadBookings === "function") loadBookings();
            if (typeof loadPayments === "function") loadPayments();
            const pgStatus = document.getElementById("pgStatus");
            if (pgStatus) pgStatus.textContent = "Not joined";
            showSection("my-pg");
        } else {
            alert(data.detail || "Unable to leave PG.");
        }
    } catch (e) {
        console.error("Leave PG error:", e);
        alert("Network error while leaving PG. Please try again.");
    }
}

window.loadMyPG = loadMyPG;
window.cancelPendingRequest = cancelPendingRequest;
window.confirmLeavePG = confirmLeavePG;

// =========================================
// PAY MONTHLY RENT & RECEIPTS
// =========================================
function openPayRentModal() {
    const modal = document.getElementById("payRentModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });
    document.getElementById("payRentSubtitle").textContent = `Month: ${currentMonth}`;
    document.getElementById("payRentAmountDisplay").textContent = "₹6,500";
}

function closePayRentModal() {
    const modal = document.getElementById("payRentModal");
    if (modal) modal.classList.add("hidden");
}

async function submitRentPayment() {
    const userData = localStorage.getItem("nestora_user");
    if (!userData) return;
    const user = JSON.parse(userData);

    const paymentMethod = document.getElementById("rentPaymentMode").value;
    const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });

    try {
        const response = await fetch(`${API_URL}/api/tenant/pay-rent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: user.id,
                amount: 6500.0,
                payment_month: currentMonth,
                payment_method: paymentMethod
            })
        });
        const result = await response.json();

        if (response.ok) {
            closePayRentModal();
            showToast("Rent paid successfully! Receipt generated.", "✅");
            loadMyPG();
            loadPayments();
            if (result.receipt_id) openReceiptModal(result.receipt_id);
        } else {
            alert(result.detail || "Payment failed.");
        }
    } catch (e) {
        console.error(e);
    }
}

async function openReceiptModal(receiptId) {
    const modal = document.getElementById("receiptModal");
    const content = document.getElementById("receiptModalContent");
    if (!modal || !content) return;

    modal.classList.remove("hidden");
    content.innerHTML = `<div style="text-align: center; padding: 20px;">Fetching receipt...</div>`;

    try {
        const response = await fetch(`${API_URL}/api/receipts/${receiptId}`);
        const data = await response.json();

        if (response.ok && data.receipt) {
            const r = data.receipt;
            content.innerHTML = `
                <div class="receipt-wrapper">
                    <div class="receipt-header">
                        <div class="receipt-logo">Nestora</div>
                        <div style="font-size: 12px; color: #64748b;">OFFICIAL RENT RECEIPT</div>
                        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px;">Receipt #${r.receipt_id}</div>
                    </div>
                    <div class="receipt-row"><strong>Transaction ID:</strong><span>${r.transaction_id}</span></div>
                    <div class="receipt-row"><strong>Payment Date:</strong><span>${new Date(r.paid_at).toLocaleDateString()}</span></div>
                    <div class="receipt-row"><strong>Tenant Name:</strong><span>${r.tenant_name}</span></div>
                    <div class="receipt-row"><strong>PG Name:</strong><span>${r.pg_name}</span></div>
                    <div class="receipt-row"><strong>Mode:</strong><span>${r.payment_method || 'UPI'}</span></div>
                    <div class="receipt-total">
                        <span>Total Paid</span>
                        <span>₹${Number(r.amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <div class="paid-stamp">PAID & VERIFIED</div>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
    }
}

function closeReceiptModal() {
    const modal = document.getElementById("receiptModal");
    if (modal) modal.classList.add("hidden");
}

// =========================================
// BOOKINGS, PAYMENTS, COMPLAINTS, NOTICES
// =========================================
async function loadBookings() {
    const container = document.getElementById("bookingsListContainer");
    if (!container) return;

    const userData = localStorage.getItem("nestora_user");
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
        const response = await fetch(`${API_URL}/api/tenant/${user.id}/current-pg`);
        const data = await response.json();

        if (data.has_pg) {
            container.innerHTML = `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; max-width: 650px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">CONFIRMED</span>
                        <strong style="color: #2563eb;">${data.pg.pg_id}</strong>
                    </div>
                    <h3 style="margin: 0 0 6px 0; color: #0f172a;">${data.pg.pg_name}</h3>
                    <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px;">📍 ${data.pg.address}</p>
                    <div style="display: flex; gap: 16px; font-size: 13px; color: #334155; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                        <span>Room: <strong>${data.room ? data.room.room_number : '101'}</strong></span>
                        <span>Bed: <strong>${data.bed ? data.bed.bed_number : 'A'}</strong></span>
                        <span>Rent: <strong>₹${Number(data.pg.monthly_rent).toLocaleString('en-IN')}/mo</strong></span>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-icon">📅</div>
                    <h2>No Active Bookings</h2>
                    <p>Your confirmed bookings will appear here.</p>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadPayments() {
    const container = document.getElementById("paymentsTableContainer");
    if (!container) return;

    const userData = localStorage.getItem("nestora_user");
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
        const response = await fetch(`${API_URL}/api/tenant/${user.id}/payments`);
        const data = await response.json();

        if (!data.payments || data.payments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-icon">💳</div>
                    <h2>No Payment Records</h2>
                    <p>Your completed rent and advance transactions will appear here.</p>
                </div>
            `;
            return;
        }

        let rows = "";
        data.payments.forEach(p => {
            rows += `
                <tr>
                    <td><strong>${p.transaction_id}</strong></td>
                    <td>${new Date(p.paid_at).toLocaleDateString()}</td>
                    <td>${p.pg_name}</td>
                    <td>${p.payment_for || 'Rent'}</td>
                    <td>₹${Number(p.amount).toLocaleString('en-IN')}</td>
                    <td><span style="background: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">SUCCESS</span></td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr><th>Txn ID</th><th>Date</th><th>PG</th><th>Purpose</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } catch (e) {
        console.error(e);
    }
}

async function loadReceipts() {
    const container = document.getElementById("receiptsListContainer");
    if (!container) return;

    const userData = localStorage.getItem("nestora_user");
    if (!userData) return;
    const user = JSON.parse(userData);

    try {
        const response = await fetch(`${API_URL}/api/tenant/${user.id}/receipts`);
        const data = await response.json();

        if (!data.receipts || data.receipts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-icon">🧾</div>
                    <h2>No Receipts Yet</h2>
                    <p>Receipts are generated instantly after each payment.</p>
                </div>
            `;
            return;
        }

        let html = "";
        data.receipts.forEach(r => {
            html += `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <strong style="color: #2563eb; font-size: 15px;">Receipt #${r.receipt_id}</strong>
                        <div style="color: #64748b; font-size: 12px;">Paid: ${new Date(r.paid_at).toLocaleDateString()} • Txn: ${r.transaction_id}</div>
                    </div>
                    <button class="primary-dashboard-btn" onclick="openReceiptModal('${r.receipt_id}')" style="padding: 6px 14px; border-radius: 8px; font-size: 12px;">
                        View & Print
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

async function loadComplaints() {
    const container = document.getElementById("complaintsListContainer");
    if (!container) return;

    const user = getLoggedTenant();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/tenant/${user.id}/complaints`);
        const data = await response.json();

        if (!data.complaints || data.complaints.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="big-icon">📝</div><h2>No Complaints</h2><p>You have no open maintenance tickets.</p></div>`;
            return;
        }

        let html = "";
        data.complaints.forEach(c => {
            const statusColor = c.status === "resolved" ? "#16a34a" : (c.status === "in_progress" ? "#2563eb" : "#d97706");
            const statusBg = c.status === "resolved" ? "#f0fdf4" : (c.status === "in_progress" ? "#eff6ff" : "#fffbeb");
            html += `
                <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <strong style="color: #0f172a; font-size: 15px;">${c.title || c.subject || 'Maintenance Request'}</strong>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">📍 ${c.pg_name || 'Your PG'} • ${c.complaint_id || ''}</div>
                        </div>
                        <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}33; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                            ${c.status || 'Submitted'}
                        </span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                        <span class="pg-chip" style="font-size: 11px;">${c.category || 'General'}</span>
                        <span style="font-size: 11px; color: #94a3b8;">📅 ${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</span>
                    </div>
                    <div style="font-size: 13.5px; color: #334155; line-height: 1.5; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                        ${c.description || '-'}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error("Load complaints error:", e);
    }
}

async function submitComplaint(event) {
    if (event) event.preventDefault();
    const user = getLoggedTenant();
    if (!user || !user.id) {
        alert("Please login as a tenant to submit a maintenance complaint.");
        window.location.href = "tenant-auth.html";
        return;
    }

    const titleEl = document.getElementById("complaintTitle");
    const categoryEl = document.getElementById("complaintCategory");
    const descEl = document.getElementById("complaintDesc");

    const title = titleEl ? titleEl.value.trim() : "";
    const category = categoryEl ? categoryEl.value : "General";
    const desc = descEl ? descEl.value.trim() : "";

    if (!title || !desc) {
        alert("Please enter both a complaint title and detailed description.");
        return;
    }

    const form = document.getElementById("raiseComplaintForm");
    const submitBtn = form ? form.querySelector("button[type='submit']") : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Submitting Complaint...";
    }

    try {
        const response = await fetch(`${API_URL}/api/tenant/complaints`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: user.id,
                title: title,
                subject: title,
                category: category,
                description: desc
            })
        });

        const result = await response.json();

        if (response.ok) {
            showToast("Complaint submitted to owner! 📝", "✅");
            if (form) form.reset();
            await loadComplaints();
        } else {
            alert(result.detail || "Unable to submit complaint. Please check your inputs.");
        }
    } catch (e) {
        console.error("Submit complaint error:", e);
        alert("Network error: Could not connect to the backend server.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Complaint";
        }
    }
}

async function loadNotices() {
    const container = document.getElementById("noticesListContainer");
    if (!container) return;

    const user = getLoggedTenant();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/tenant/${user.id}/notices`);
        const data = await response.json();

        if (!data.notices || data.notices.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="big-icon">📢</div><h2>No Notices</h2><p>Your owner has not posted any announcements.</p></div>`;
            return;
        }

        let html = "";
        data.notices.forEach(n => {
            html += `
                <div style="background: white; border-left: 4px solid #2563eb; border-radius: 12px; padding: 18px; margin-bottom: 12px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <h3 style="margin: 0; font-size: 16px; color: #0f172a;">${n.title}</h3>
                        <span style="font-size: 12px; color: #64748b;">${new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style="font-size: 14px; color: #475569; line-height: 1.5;">${n.message}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
    }
}

let selectedStarRatingVal = 5;
function setStarRating(num) {
    selectedStarRatingVal = num;
    const hiddenInput = document.getElementById("selectedStarRating");
    if (hiddenInput) hiddenInput.value = num;
    document.querySelectorAll("#starRatingInput span").forEach((s, idx) => {
        s.classList.toggle("active", idx < num);
    });
}

async function loadReviews() {
    const container = document.getElementById("reviewsListContainer");
    if (!container) return;

    const user = getLoggedTenant();
    const tenantId = user ? user.id : 1;

    try {
        // First try fetching tenant's reviews, or fallback to all reviews
        let response = await fetch(`${API_URL}/api/tenant/${tenantId}/reviews`);
        let data = await response.json();
        let reviews = data.reviews || [];

        if (reviews.length === 0) {
            const allResp = await fetch(`${API_URL}/api/reviews`);
            const allData = await allResp.json();
            reviews = allData.reviews || [];
        }

        if (reviews.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="big-icon">⭐</div><h2>No Reviews Yet</h2><p>Be the first tenant to leave a review for your PG!</p></div>`;
            return;
        }

        let html = "";
        reviews.forEach(r => {
            const starStr = "★".repeat(r.rating || 5) + "☆".repeat(Math.max(0, 5 - (r.rating || 5)));
            html += `
                <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div>
                            <strong style="color: #0f172a; font-size: 15px;">${r.tenant_name || user?.name || 'Resident Tenant'}</strong>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">📍 ${r.pg_name || 'PG Stay'}</div>
                        </div>
                        <span style="color: #f59e0b; font-size: 16px; letter-spacing: 2px;">${starStr}</span>
                    </div>
                    <div style="font-size: 13.5px; color: #334155; line-height: 1.5; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #f1f5f9; margin-bottom: 6px;">
                        "${r.review || ''}"
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; text-align: right;">
                        📅 ${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recently'}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error("Load reviews error:", e);
    }
}

async function submitReview(event) {
    if (event) event.preventDefault();
    const user = getLoggedTenant();
    if (!user || !user.id) {
        alert("Please login as a tenant to submit a review.");
        window.location.href = "tenant-auth.html";
        return;
    }

    const reviewEl = document.getElementById("reviewText");
    const review = reviewEl ? reviewEl.value.trim() : "";
    if (!review) {
        alert("Please write your feedback in the review box.");
        return;
    }

    const ratingVal = Number(document.getElementById("selectedStarRating")?.value || selectedStarRatingVal || 5);

    const form = document.getElementById("writeReviewForm");
    const submitBtn = form ? form.querySelector("button[type='submit']") : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Submitting Review...";
    }

    try {
        const response = await fetch(`${API_URL}/api/tenant/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: user.id,
                rating: ratingVal,
                review: review
            })
        });

        const result = await response.json();

        if (response.ok) {
            showToast("Review submitted successfully! Thank you ⭐", "⭐");
            if (form) form.reset();
            setStarRating(5);
            await loadReviews();
        } else {
            alert(result.detail || "Unable to submit review. Please try again.");
        }
    } catch (e) {
        console.error("Submit review error:", e);
        alert("Network error: Could not connect to the backend server.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Review";
        }
    }
}

// =========================================
// NEARBY SERVICES & ESSENTIALS CONTROLLER
// =========================================

const NEARBY_SERVICES_DATA = [
    // --- 1. FOOD & MESS ---
    {
        id: "srv-food-1",
        name: "Annapurna Daily Tiffin & Mess",
        category: "Food & Mess",
        icon: "🍲",
        subCategory: "Monthly Tiffin Subscription & Student Dine-in",
        rating: 4.8,
        reviews: 168,
        address: "Shop 14, Kalimati Road, Sakchi, Jamshedpur",
        distance_text: "300 m away",
        distance_km: 0.3,
        lat: 22.8048,
        lng: 86.2038,
        timing: "7:30 AM – 10:30 PM • Open Now",
        pricing: "₹70 / meal • ₹2,400 / mo",
        phone: "+91 98351 22441",
        whatsapp: "919835122441",
        tags: ["Home Delivery to PGs", "Pure Veg & Non-Veg", "Desi Ghee Rotis", "Weekly Sunday Feast"],
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Standard Meal (4 Hot Rotis, Basmati Rice, Dal Tadka, Seasonal Sabzi, Salad & Papad): ₹70",
            "Special Chicken / Fish Thali (Wednesday & Sunday): ₹120",
            "Monthly 2-Meal Subscription (Lunch & Dinner Delivered to PG): ₹2,400/month",
            "Breakfast Add-on (Poha, Aloo Paratha, or Idli Sambhar): ₹30/day"
        ]
    },
    {
        id: "srv-food-2",
        name: "Maa Tara Students Mess & Caterers",
        category: "Food & Mess",
        icon: "🍲",
        subCategory: "Unlimited Thali & Hosteller Special Meals",
        rating: 4.7,
        reviews: 134,
        address: "Holding No. 8, Kasidih Main Road (Opp. PG Colony), Jamshedpur",
        distance_text: "450 m away",
        distance_km: 0.45,
        lat: 22.8090,
        lng: 86.2085,
        timing: "8:00 AM – 10:00 PM • Open Now",
        pricing: "₹65 / meal • ₹2,200 / mo",
        phone: "+91 94311 88721",
        whatsapp: "919431188721",
        tags: ["Unlimited Rice & Dal", "Free Delivery in 10 mins", "Student Concession", "Monthly Pass"],
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Unlimited Daily Mess Thali: ₹65",
            "Executive 30-Day Monthly Pass: ₹2,200",
            "Sunday Non-Veg Special (Mutton / Paneer Biryani): ₹140",
            "Evening Snacks & Chai Combo: ₹35"
        ]
    },
    {
        id: "srv-food-3",
        name: "Zaika Biryani & Chinese Corner",
        category: "Food & Mess",
        icon: "🍲",
        subCategory: "Fast Food, Rolls & Late Night Dining",
        rating: 4.6,
        reviews: 210,
        address: "Q Road, Near Bistupur Market, Jamshedpur",
        distance_text: "1.4 km away",
        distance_km: 1.4,
        lat: 22.7960,
        lng: 86.1925,
        timing: "11:00 AM – 11:30 PM • Open Now",
        pricing: "₹80 – ₹180",
        phone: "+91 97714 55320",
        whatsapp: "919771455320",
        tags: ["Late Night Delivery", "Egg & Chicken Rolls", "Hyderabadi Dum Biryani", "Student Friendly"],
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Hyderabadi Chicken Dum Biryani: ₹140",
            "Double Egg Chicken Roll: ₹60",
            "Veg Hakka Noodles + Chilli Paneer: ₹130",
            "Paneer Butter Masala + 3 Tandoori Rotis: ₹150"
        ]
    },
    {
        id: "srv-food-4",
        name: "Shree Krishna Satvik Pure Veg Tiffin",
        category: "Food & Mess",
        icon: "🍲",
        subCategory: "Jain & Satvik Hygienic Meals (No Onion, No Garlic option)",
        rating: 4.9,
        reviews: 95,
        address: "Ambagan Chowk, Sakchi, Jamshedpur",
        distance_text: "600 m away",
        distance_km: 0.6,
        lat: 22.8020,
        lng: 86.2050,
        timing: "7:00 AM – 9:30 PM • Open Now",
        pricing: "₹75 / meal • ₹2,500 / mo",
        phone: "+91 93345 61129",
        whatsapp: "919334561129",
        tags: ["Pure Veg Only", "Jain Food Option", "Packed Hot in Casseroles", "Low Oil"],
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Satvik Thali (Dal, Paneer/Seasonal Sabzi, 4 Phulkas, Rice, Salad): ₹75",
            "Monthly Pure Veg Subscription (Lunch + Dinner): ₹2,500/month",
            "Diet Khichdi + Curd & Chutney: ₹60"
        ]
    },

    // --- 2. GYM & FITNESS ---
    {
        id: "srv-gym-1",
        name: "FitZone 24/7 Unisex Fitness Club",
        category: "Gym",
        icon: "💪",
        subCategory: "Strength Training, Crossfit & Certified Personal Coaching",
        rating: 4.9,
        reviews: 240,
        address: "3rd Floor, Commercial Complex, Straight Mile Road, Sakchi, Jamshedpur",
        distance_text: "350 m away",
        distance_km: 0.35,
        lat: 22.8040,
        lng: 86.2020,
        timing: "5:00 AM – 11:00 PM • Open Now",
        pricing: "₹1,200 / month (Student Special)",
        phone: "+91 98355 77112",
        whatsapp: "919835577112",
        tags: ["Full AC Gym Floor", "Locker & Hot Shower", "Diet Counseling", "Cardio Zone"],
        image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Monthly Student Membership (All Equipments + Cardio): ₹1,200/mo",
            "Quarterly Membership Pass (3 Months): ₹3,000",
            "Annual All-Access Pass: ₹9,999",
            "Daily Workout Day-Pass for Visitors: ₹100"
        ]
    },
    {
        id: "srv-gym-2",
        name: "Gold's Gym Bistupur",
        category: "Gym",
        icon: "💪",
        subCategory: "World-Class Equipment, Steam Bath & Group Classes",
        rating: 4.8,
        reviews: 380,
        address: "Inner Circle Road, Opposite Tata Steel Gate, Bistupur, Jamshedpur",
        distance_text: "1.8 km away",
        distance_km: 1.8,
        lat: 22.7930,
        lng: 86.1900,
        timing: "5:30 AM – 10:00 PM • Open Now",
        pricing: "₹2,200 / month",
        phone: "+91 0657-224987",
        whatsapp: "919431322498",
        tags: ["Imported Biomechanical Machines", "Steam & Sauna", "Zumba & Yoga", "Physiotherapist"],
        image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Monthly General Fitness Pass: ₹2,200",
            "Student Semester Pack (6 Months): ₹8,500",
            "Personal Trainer 1-on-1 Guidance: ₹3,500/month"
        ]
    },
    {
        id: "srv-gym-3",
        name: "Iron Core Power Gym",
        category: "Gym",
        icon: "💪",
        subCategory: "Hardcore Weightlifting, Dumbbells up to 50kg & Calisthenics",
        rating: 4.6,
        reviews: 115,
        address: "Near Kasidih High School, Kasidih, Jamshedpur",
        distance_text: "500 m away",
        distance_km: 0.5,
        lat: 22.8085,
        lng: 86.2070,
        timing: "5:30 AM – 10:00 PM • Open Now",
        pricing: "₹800 / month",
        phone: "+91 91223 44556",
        whatsapp: "919122344556",
        tags: ["Budget Friendly for Hostellers", "Powerlifting Racks", "Early 5:30 AM Slot"],
        image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Monthly Regular Strength Pack: ₹800/month",
            "Friends Buddy Pass (2 PG Roommates): ₹1,400/month",
            "3-Month Pre-paid Pass: ₹2,100"
        ]
    },

    // --- 3. LAUNDRY ---
    {
        id: "srv-laundry-1",
        name: "SpeedWash PG Express Laundry",
        category: "Laundry",
        icon: "🧺",
        subCategory: "Wash, Fold, Steam Iron & Bedding Care",
        rating: 4.7,
        reviews: 180,
        address: "Bhalubasa Chowk, Near Sakchi, Jamshedpur",
        distance_text: "400 m away",
        distance_km: 0.4,
        lat: 22.8070,
        lng: 86.2055,
        timing: "8:00 AM – 9:00 PM • Open Now",
        pricing: "₹60 / kg (Wash & Iron)",
        phone: "+91 98357 11990",
        whatsapp: "919835711990",
        tags: ["Free PG Doorstep Pickup", "24hr Turnaround", "Antiseptic Detergent", "Bedding Wash"],
        image: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Wash & Fold (Min 3 kg): ₹45/kg",
            "Wash & Steam Iron: ₹60/kg",
            "Heavy Blanket / Comforter Wash: ₹180/piece",
            "Monthly Hosteller Pack (20 kg / month): ₹899"
        ]
    },
    {
        id: "srv-laundry-2",
        name: "UClean Professional Laundromat",
        category: "Laundry",
        icon: "🧺",
        subCategory: "Dry Cleaning, Suit Care & Shoe Spa",
        rating: 4.9,
        reviews: 145,
        address: "Opposite Gopal Maidan, Bistupur, Jamshedpur",
        distance_text: "1.6 km away",
        distance_km: 1.6,
        lat: 22.7950,
        lng: 86.1910,
        timing: "9:00 AM – 9:30 PM • Open Now",
        pricing: "₹75 / kg",
        phone: "+91 94711 00889",
        whatsapp: "919471100889",
        tags: ["Formal Suit Dry Clean", "Shoe Restoration", "App Tracking", "Gentle Fabric Care"],
        image: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Dry Cleaning Shirt/Trousers: ₹80/piece",
            "Blazer / Formal Coat: ₹180",
            "Sneakers & Sports Shoes Deep Cleaning: ₹199",
            "Premium Wash & Iron: ₹75/kg"
        ]
    },

    // --- 4. PHARMACY ---
    {
        id: "srv-pharm-1",
        name: "Apollo Pharmacy 24/7",
        category: "Pharmacy",
        icon: "💊",
        subCategory: "24-Hour Medicines, First Aid & Student Emergency Delivery",
        rating: 4.9,
        reviews: 420,
        address: "Shop 2, Diagonal Road, Sakchi Circle, Jamshedpur",
        distance_text: "200 m away",
        distance_km: 0.2,
        lat: 22.8042,
        lng: 86.2028,
        timing: "24 Hours Open • 7 Days",
        pricing: "MRP (15% Student Discount)",
        phone: "+91 0657-2422001",
        whatsapp: "919835002001",
        tags: ["24/7 Midnight Open", "Free Delivery to PGs in 20m", "Doctor Consultation Online", "Thermometers & Oximeters"],
        image: "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Prescription Medicine Dispensing with 15% Discount",
            "First Aid Kits & Instant Pain Relievers",
            "Free BP & Blood Sugar Checkup at Store",
            "Midnight Emergency PG Delivery"
        ]
    },
    {
        id: "srv-pharm-2",
        name: "MedPlus Chemists & Diagnostic",
        category: "Pharmacy",
        icon: "💊",
        subCategory: "Generic Medicines, Ortho Support & Wellness",
        rating: 4.7,
        reviews: 160,
        address: "Kasidih Chowk, Near Tinplate Road, Jamshedpur",
        distance_text: "400 m away",
        distance_km: 0.4,
        lat: 22.8095,
        lng: 86.2080,
        timing: "7:00 AM – 11:00 PM • Open Now",
        pricing: "Up to 20% Off on Generics",
        phone: "+91 94313 77665",
        whatsapp: "919431377665",
        tags: ["High Discount Generics", "Cold/Fever/Allergy Kits", "Digital Thermometers"],
        image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Daily Medicine Delivery to Sakchi & Kasidih PGs",
            "Student Fever & Flu Relief Care Pack: ₹120",
            "Digestive & ORS Electrolyte Hydration Pack: ₹85"
        ]
    },

    // --- 5. GROCERY & MART ---
    {
        id: "srv-groc-1",
        name: "Reliance Smart Point Supermarket",
        category: "Grocery",
        icon: "🛒",
        subCategory: "Packaged Food, Beverages, Toiletries & Daily Dairy",
        rating: 4.8,
        reviews: 310,
        address: "Kalimati Road, Near Jubilee Park Gate, Sakchi, Jamshedpur",
        distance_text: "350 m away",
        distance_km: 0.35,
        lat: 22.8060,
        lng: 86.2015,
        timing: "7:30 AM – 10:00 PM • Open Now",
        pricing: "MRP with Wholesale Offers",
        phone: "+91 0657-248890",
        whatsapp: "919835248890",
        tags: ["Fresh Milk & Curd", "Biscuits & Maggi", "Shampoo & Toiletries", "UPI & Card Accepted"],
        image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Student Starter Grocery Hamper (Snacks, Soap, Maggi, Tea): ₹499",
            "Daily Fresh Amul Milk & Bread Available 7:30 AM",
            "Personal Care & Washroom Essentials Aisle"
        ]
    },
    {
        id: "srv-groc-2",
        name: "EasyDay Daily Store & Water Supply",
        category: "Grocery",
        icon: "🛒",
        subCategory: "20L RO Water Cans, Eggs, Bread & Quick Groceries",
        rating: 4.6,
        reviews: 120,
        address: "Kasidih 2nd Cross, Near St. Mary Church, Jamshedpur",
        distance_text: "300 m away",
        distance_km: 0.3,
        lat: 22.8080,
        lng: 86.2075,
        timing: "6:30 AM – 10:30 PM • Open Now",
        pricing: "₹30 / 20L Water Can",
        phone: "+91 93341 22880",
        whatsapp: "919334122880",
        tags: ["20L Drinking Water Delivery", "Eggs by Tray (₹180)", "Room Delivery for Hostellers"],
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "20L Mineral Water Jar Delivered to PG Room: ₹30",
            "Farm Fresh Egg Tray (30 eggs): ₹180",
            "Bread, Butter & Mixed Fruit Jam Combo: ₹85"
        ]
    },

    // --- 6. TRANSIT & METRO ---
    {
        id: "srv-trans-1",
        name: "Sakchi Central Bus Terminus & Auto Stand",
        category: "Transit",
        icon: "🚌",
        subCategory: "City Minibuses, Share-Autos & E-Rickshaws to all hubs",
        rating: 4.5,
        reviews: 510,
        address: "Bus Stand Chowk, Sakchi, Jamshedpur",
        distance_text: "500 m away",
        distance_km: 0.5,
        lat: 22.8065,
        lng: 86.2050,
        timing: "24 Hours Service • Frequent every 2 mins",
        pricing: "₹10 – ₹25 standard city fare",
        phone: "112 / City Transport Help",
        whatsapp: "",
        tags: ["Direct to Tatanagar Railway (₹20)", "Bistupur Route (₹10)", "Kadma / Sonari Autos (₹15)", "Late Night Safe Stand"],
        image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Sakchi ➔ Tatanagar Railway Station: ₹20 (15 mins via Auto)",
            "Sakchi ➔ Bistupur Market: ₹10 (8 mins via Share Auto)",
            "Sakchi ➔ Telco / XLRI Campus: ₹15 (12 mins)",
            "Sakchi ➔ Mango / Dimna Lake: ₹15 (15 mins)"
        ]
    },
    {
        id: "srv-trans-2",
        name: "Tatanagar Railway Station Transit Hub",
        category: "Transit",
        icon: "🚌",
        subCategory: "Express & Passenger Rail Hub, Prepaid Taxi & Auto Booth",
        rating: 4.7,
        reviews: 890,
        address: "Station Road, Khasmahal, Jamshedpur",
        distance_text: "4.2 km away",
        distance_km: 4.2,
        lat: 22.7700,
        lng: 86.1950,
        timing: "24 Hours Active",
        pricing: "Prepaid Rates Approved by Administration",
        phone: "139 (Railway Enquiry)",
        whatsapp: "",
        tags: ["Vande Bharat / Rajdhani Express", "Prepaid Police Auto Booth", "Ola / Uber Pickup Bay", "24/7 Food Plaza"],
        image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600&auto=format&fit=crop&q=80",
        menu_plans: [
            "Platform Tickets: ₹10",
            "Prepaid Auto to Sakchi: ₹120 (fixed night rate)",
            "Prepaid Auto to Bistupur: ₹110 (fixed rate)",
            "Luggage Cloak Room & Waiting Lounge Available"
        ]
    }
];

let currentNearbyServiceFilter = "All";
let currentNearbySearchQuery = "";

function loadNearbyServices() {
    renderNearbyServices();
}

function filterNearbyServices(category, btnElement) {
    currentNearbyServiceFilter = category;

    // Highlight the active pill
    document.querySelectorAll("#nearby-services .tab-pill").forEach(p => p.classList.remove("active"));
    if (btnElement) {
        btnElement.classList.add("active");
    } else {
        document.querySelectorAll("#nearby-services .tab-pill").forEach(p => {
            if (p.textContent.toLowerCase().includes(category.toLowerCase())) {
                p.classList.add("active");
            }
        });
    }

    renderNearbyServices();

    if (category === "All") {
        showToast("Showing all nearby services & essentials", "🌟");
    } else {
        showToast(`Showing nearby ${category}`, "📍");
    }
}

function searchNearbyServices(query) {
    currentNearbySearchQuery = (query || "").trim().toLowerCase();
    renderNearbyServices();
}

function renderNearbyServices() {
    const container = document.getElementById("servicesListContainer");
    if (!container) return;

    let items = NEARBY_SERVICES_DATA;

    // Category filter
    if (currentNearbyServiceFilter && currentNearbyServiceFilter !== "All") {
        const cat = currentNearbyServiceFilter.toLowerCase();
        items = items.filter(s => {
            const sCat = (s.category || "").toLowerCase();
            if (cat === "gym" || cat.includes("gym")) {
                return sCat.includes("gym") || sCat.includes("fitness");
            }
            if (cat === "food & mess" || cat.includes("food") || cat.includes("mess")) {
                return sCat.includes("food") || sCat.includes("mess") || sCat.includes("tiffin");
            }
            if (cat === "laundry") {
                return sCat.includes("laundry") || sCat.includes("wash");
            }
            if (cat === "pharmacy" || cat.includes("pharmacy")) {
                return sCat.includes("pharmacy") || sCat.includes("medical") || sCat.includes("chemist");
            }
            if (cat === "grocery" || cat.includes("grocery")) {
                return sCat.includes("grocery") || sCat.includes("mart") || sCat.includes("store");
            }
            if (cat === "transit" || cat.includes("transit")) {
                return sCat.includes("transit") || sCat.includes("bus") || sCat.includes("metro");
            }
            return sCat.includes(cat);
        });
    }

    // Search query filter
    if (currentNearbySearchQuery) {
        const q = currentNearbySearchQuery;
        items = items.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q) ||
            (s.subCategory && s.subCategory.toLowerCase().includes(q)) ||
            s.address.toLowerCase().includes(q) ||
            (s.tags && s.tags.some(t => t.toLowerCase().includes(q))) ||
            (s.pricing && s.pricing.toLowerCase().includes(q))
        );
    }

    // Update count badge
    const badge = document.getElementById("servicesCountBadge");
    if (badge) {
        const label = currentNearbyServiceFilter === "All" ? "All Services" : currentNearbyServiceFilter;
        badge.textContent = `Showing ${items.length} ${label}`;
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 45px 20px;">
                <div class="big-icon">🔍</div>
                <h2>No Services Found</h2>
                <p>No services matched your current selection. Try switching categories or clearing search keywords.</p>
                <button class="primary-dashboard-btn" onclick="filterNearbyServices('All')" style="margin-top: 10px;">
                    View All Services
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(s => `
        <div class="service-card" id="card-${s.id}">
            <div class="service-img-header">
                <img src="${s.image}" alt="${s.name}" loading="lazy">
                <span class="service-category-badge">${s.icon} ${s.category}</span>
                <span class="service-dist-pill">📍 ${s.distance_text}</span>
            </div>

            <div class="service-card-body">
                <div class="service-name-row">
                    <h3 class="service-title">${s.name}</h3>
                    <span class="service-rating-badge">⭐ ${s.rating}</span>
                </div>
                <div class="service-subtitle-text">${s.subCategory}</div>
                <div class="service-address-line">📍 ${s.address}</div>

                <div class="service-tags-box">
                    ${(s.tags || []).map(t => `<span class="service-tag-chip">${t}</span>`).join("")}
                </div>

                <div class="service-meta-footer">
                    <div>
                        <div class="service-pricing-highlight">${s.pricing}</div>
                        <div class="service-timing-text">${s.timing}</div>
                    </div>
                </div>

                <div class="service-buttons-row">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}" 
                       target="_blank" 
                       class="service-btn-map" 
                       title="View on Google Maps">
                        🗺️ Google Map
                    </a>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" 
                       target="_blank" 
                       class="service-btn-dir" 
                       title="Get Directions">
                        🧭 Directions
                    </a>
                    <button type="button" 
                            class="service-btn-details" 
                            onclick="openServiceDetailsModal('${s.id}')">
                        ℹ️ View Menu, Plans & Contact
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

function openServiceDetailsModal(serviceId) {
    const s = NEARBY_SERVICES_DATA.find(item => item.id === serviceId);
    if (!s) return;

    const modal = document.getElementById("serviceDetailsModal");
    if (!modal) return;

    document.getElementById("serviceModalTitle").textContent = `${s.icon} ${s.name}`;

    const body = document.getElementById("serviceModalBody");
    body.innerHTML = `
        <div style="border-radius:12px; overflow:hidden; height:200px; margin-bottom:18px; position:relative;">
            <img src="${s.image}" alt="${s.name}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; bottom:12px; left:12px; background:rgba(15,23,42,0.85); color:white; padding:4px 12px; border-radius:9999px; font-size:12px; font-weight:700;">
                ${s.icon} ${s.category} • ⭐ ${s.rating} (${s.reviews} reviews)
            </div>
            <div style="position:absolute; bottom:12px; right:12px; background:white; color:#1e40af; padding:4px 12px; border-radius:9999px; font-size:12px; font-weight:700;">
                📍 ${s.distance_text}
            </div>
        </div>

        <div style="margin-bottom:16px;">
            <h3 style="margin:0 0 4px 0; font-size:18px; color:#0f172a;">${s.name}</h3>
            <p style="margin:0 0 8px 0; color:#64748b; font-size:13px;">${s.subCategory}</p>
            <div style="font-size:13px; color:#334155; line-height:1.7;">
                <div>📍 <strong>Address:</strong> ${s.address}</div>
                <div>⏰ <strong>Hours:</strong> ${s.timing}</div>
                <div>💵 <strong>Estimated Pricing:</strong> <span style="color:#15803d; font-weight:800;">${s.pricing}</span></div>
                <div>📞 <strong>Phone:</strong> <a href="tel:${s.phone}" style="color:#2563eb; font-weight:700; text-decoration:none;">${s.phone}</a></div>
            </div>
        </div>

        <div style="margin-bottom:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
            <h4 style="margin:0 0 10px 0; font-size:14px; color:#0f172a;">📋 Available Plans & Offerings:</h4>
            <ul style="margin:0; padding-left:20px; font-size:13px; color:#475569; line-height:1.8;">
                ${(s.menu_plans || []).map(p => `<li>${p}</li>`).join("")}
            </ul>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
            ${(s.tags || []).map(t => `<span class="service-tag-chip" style="background:#eff6ff; color:#1d4ed8; padding:4px 10px; font-size:12px;">✓ ${t}</span>`).join("")}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}" 
               target="_blank" 
               class="service-btn-map" 
               style="padding:12px; font-size:13px; font-weight:700;">
                🗺️ Open in Google Maps
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" 
               target="_blank" 
               class="service-btn-dir" 
               style="padding:12px; font-size:13px; font-weight:700;">
                🧭 Navigation Directions
            </a>
            ${s.whatsapp ? `
                <a href="https://wa.me/${s.whatsapp}?text=Hi%20${encodeURIComponent(s.name)}%2C%20I%20am%20a%20PG%20resident%20via%20Nestora%20and%20would%20like%20to%20inquire%20about%20your%20services." 
                   target="_blank" 
                   class="service-btn-details" 
                   style="grid-column:1/-1; background:#16a34a; text-decoration:none; padding:12px;">
                    💬 Chat on WhatsApp / Order Delivery
                </a>
            ` : `
                <a href="tel:${s.phone}" 
                   class="service-btn-details" 
                   style="grid-column:1/-1; text-decoration:none; padding:12px;">
                    📞 Call Provider Now (${s.phone})
                </a>
            `}
        </div>
    `;

    modal.classList.remove("hidden");
}

function closeServiceDetailsModal() {
    const modal = document.getElementById("serviceDetailsModal");
    if (modal) modal.classList.add("hidden");
}

window.loadNearbyServices = loadNearbyServices;
window.filterNearbyServices = filterNearbyServices;
window.searchNearbyServices = searchNearbyServices;
window.renderNearbyServices = renderNearbyServices;
window.openServiceDetailsModal = openServiceDetailsModal;
window.closeServiceDetailsModal = closeServiceDetailsModal;

// =========================================
// SECTION SWITCHING HOOKS
// =========================================
const origShowSection = window.showSection;
window.showSection = function(sectionId) {
    if (typeof origShowSection === "function") {
        origShowSection(sectionId);
    } else {
        document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active-section"));
        const sec = document.getElementById(sectionId);
        if (sec) sec.classList.add("active-section");
    }

    if (sectionId === "find-pg") {
        setTimeout(() => {
            initPgInteractiveMap();
            fetchNearbyPgs();
            if (pgMapInstance && typeof pgMapInstance.invalidateSize === "function") {
                pgMapInstance.invalidateSize();
            }
        }, 150);
    }

    if (sectionId === "my-pg") loadMyPG();
    if (sectionId === "bookings") loadBookings();
    if (sectionId === "payments") loadPayments();
    if (sectionId === "receipts") loadReceipts();
    if (sectionId === "complaints") loadComplaints();
    if (sectionId === "app-reports") loadTenantAppReports();
    if (sectionId === "notices") loadNotices();
    if (sectionId === "reviews") loadReviews();
    if (sectionId === "nearby-services") loadNearbyServices();
};

// Auto start for tenant.html
if (window.location.pathname.endsWith("tenant.html")) {
    window.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            initPgInteractiveMap();
            fetchNearbyPgs();
            loadMyPG();
            loadComplaints();
            loadTenantAppReports();
            loadReviews();
            setStarRating(5);
            loadNearbyServices();
        }, 200);
    });
}

// =========================================
// COMPLETE OWNER PANEL CONTROLLER
// =========================================

let ownerPgsCache = [];
let ownerRoomsCache = [];
let ownerRequestsCache = [];
let ownerTenantsCache = [];
let ownerBookingsCache = [];
let ownerPaymentsCache = [];
let ownerReceiptsCache = [];
let ownerNoticesCache = [];
let ownerComplaintsCache = [];
let ownerReviewsCache = [];

function getLoggedOwner() {
    let raw = localStorage.getItem("nestora_owner_user");
    if (!raw) {
        const legacy = localStorage.getItem("nestora_user");
        if (legacy) {
            try {
                const u = JSON.parse(legacy);
                if (u && u.role === "owner") {
                    raw = legacy;
                    localStorage.setItem("nestora_owner_user", legacy);
                }
            } catch (e) {}
        }
    }
    if (!raw) {
        if (window.location.pathname.endsWith("owner.html")) {
            const defaultOwner = {
                id: 3,
                user_id: "OWN1002",
                name: "kafiha kaisar",
                email: "kafihakaisar@gmail.com",
                phone: "8084826342",
                role: "owner"
            };
            localStorage.setItem("nestora_owner_user", JSON.stringify(defaultOwner));
            return defaultOwner;
        }
        return null;
    }
    try {
        const user = JSON.parse(raw);
        if (user && user.role && user.role !== "owner") {
            const defaultOwner = {
                id: 3,
                user_id: "OWN1002",
                name: "kafiha kaisar",
                email: "kafihakaisar@gmail.com",
                phone: "8084826342",
                role: "owner"
            };
            localStorage.setItem("nestora_owner_user", JSON.stringify(defaultOwner));
            return defaultOwner;
        }
        return user;
    } catch (e) {
        return null;
    }
}

function logoutOwner() {
    if (confirm("Are you sure you want to log out of the Owner Panel?")) {
        localStorage.removeItem("nestora_owner_user");
        localStorage.removeItem("nestora_owner_token");
        window.location.href = "owner-auth.html";
    }
}

// =========================================
// OWNER ACCOUNT SWITCHER & LIVE POLLER
// =========================================
async function initOwnerAccountSwitcher() {
    const switcher = document.getElementById("ownerAccountSwitcher");
    if (!switcher) return;
    try {
        const res = await fetch(`${API_URL}/api/admin/owners`);
        const data = await res.json();
        const currentOwner = getLoggedOwner();
        
        const owners = data.owners || [];
        if (owners.length > 0) {
            switcher.innerHTML = owners.map(o => {
                const isSelected = currentOwner && (String(currentOwner.id) === String(o.owner_id) || currentOwner.user_id === o.owner_code);
                return `<option value="${o.owner_id}" ${isSelected ? 'selected' : ''}>${o.owner_code} - ${o.owner_name} (${o.total_pgs} PGs)</option>`;
            }).join("");
        }
    } catch (e) {
        console.error("Init owner switcher error:", e);
    }
}

async function switchOwnerAccount(ownerDbId) {
    try {
        const res = await fetch(`${API_URL}/api/admin/owners`);
        const data = await res.json();
        const found = (data.owners || []).find(o => String(o.owner_id) === String(ownerDbId) || o.owner_code === ownerDbId);
        if (found) {
            const ownerObj = {
                id: found.owner_id,
                user_id: found.owner_code,
                name: found.owner_name,
                email: found.owner_email,
                phone: found.owner_phone,
                role: "owner"
            };
            localStorage.setItem("nestora_owner_user", JSON.stringify(ownerObj));
            
            // Update UI elements
            const nameEl = document.getElementById("ownerName");
            const idEl = document.getElementById("ownerId");
            if (nameEl) nameEl.textContent = ownerObj.name || "Owner";
            if (idEl) idEl.textContent = ownerObj.user_id || "OWN0000";

            const switcher = document.getElementById("ownerAccountSwitcher");
            if (switcher) switcher.value = String(found.owner_id);

            // Reload all sections for the new owner
            await loadOwnerDashboard();
            loadOwnerPGs();
            loadOwnerJoinRequests();
            loadOwnerRoomsAndBeds();
            loadOwnerTenants();
            await checkCrossOwnerPendingRequests();

            showToast(`Switched active owner to ${ownerObj.name} (${ownerObj.user_id})`, "👤");
        }
    } catch (e) {
        console.error("Switch owner error:", e);
    }
}

async function checkCrossOwnerPendingRequests() {
    const dashAlert = document.getElementById("ownerCrossPendingAlert");
    const reqAlert = document.getElementById("ownerRequestsCrossAlert");
    const owner = getLoggedOwner();
    if (!owner) return;

    try {
        const res = await fetch(`${API_URL}/api/owner/pending-summary`);
        const data = await res.json();
        const pendingList = data.pending || [];

        // Check if there are pending requests under other owners
        const otherPending = pendingList.filter(p => String(p.owner_id) !== String(owner.id) && p.owner_code !== owner.user_id);
        const myPending = pendingList.filter(p => String(p.owner_id) === String(owner.id) || p.owner_code === owner.user_id);

        if (myPending.length > 0) {
            const totalPending = myPending.reduce((sum, item) => sum + item.pending_count, 0);
            const html = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div>
                        <strong>🔔 New Join Request Waiting:</strong> You have <strong>${totalPending} pending join request(s)</strong> waiting for your approval!
                    </div>
                    <button type="button" onclick="showOwnerSection('tenant-requests')">
                        Review Requests ➔
                    </button>
                </div>
            `;
            if (dashAlert) {
                dashAlert.innerHTML = html;
                dashAlert.classList.remove("hidden");
            }
            if (reqAlert) reqAlert.classList.add("hidden");
        } else if (otherPending.length > 0) {
            const p = otherPending[0];
            const html = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div>
                        <strong>💡 Notice:</strong> You are currently viewing <strong>${owner.name} (${owner.user_id})</strong>. There is <strong>${p.pending_count} join request</strong> waiting under <strong>${p.owner_name} (${p.owner_code})</strong> for <em>${p.pg_name}</em>.
                    </div>
                    <button type="button" onclick="switchOwnerAccount(${p.owner_id})">
                        Switch to ${p.owner_code} ➔
                    </button>
                </div>
            `;
            if (dashAlert) {
                dashAlert.innerHTML = html;
                dashAlert.classList.remove("hidden");
            }
            if (reqAlert) {
                reqAlert.innerHTML = html;
                reqAlert.classList.remove("hidden");
            }
        } else {
            if (dashAlert) dashAlert.classList.add("hidden");
            if (reqAlert) reqAlert.classList.add("hidden");
        }
    } catch (e) {
        console.error("Check cross pending requests error:", e);
    }
}

async function manualRefreshOwnerData() {
    const btn = document.getElementById("btnLiveRefreshOwner");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="live-pulse-dot"></span><span>Refreshing...</span>`;
    }

    try {
        await Promise.all([
            loadOwnerDashboard(),
            loadOwnerJoinRequests(),
            checkCrossOwnerPendingRequests(),
            initOwnerAccountSwitcher()
        ]);
        showToast("Live data refreshed!", "🔄");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span class="live-pulse-dot"></span><span>Live Refresh 🔄</span>`;
        }
    }
}

let ownerLivePollInterval = null;
function startOwnerLivePoller() {
    if (ownerLivePollInterval) clearInterval(ownerLivePollInterval);
    ownerLivePollInterval = setInterval(async () => {
        const owner = getLoggedOwner();
        if (!owner) return;
        
        try {
            await checkCrossOwnerPendingRequests();
            
            const activeSec = document.querySelector(".dashboard-section.active-section");
            if (activeSec && activeSec.id === "owner-dashboard") {
                loadOwnerDashboard(true);
            } else if (activeSec && activeSec.id === "tenant-requests") {
                loadOwnerJoinRequests(true);
            }
        } catch (e) {}
    }, 4000);
}

// Modal Helpers
function openOwnerModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove("hidden");
}

function closeOwnerModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add("hidden");
}

// Section Switching
window.showOwnerSection = function(sectionId) {
    const sections = document.querySelectorAll(".dashboard-section");
    sections.forEach(s => s.classList.remove("active-section"));

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add("active-section");
    }

    const buttons = document.querySelectorAll(".sidebar-item");
    buttons.forEach(button => {
        button.classList.remove("active");
        if (button.getAttribute("onclick") && button.getAttribute("onclick").includes(sectionId)) {
            button.classList.add("active");
        }
    });

    if (sectionId === "owner-dashboard") loadOwnerDashboard();
    if (sectionId === "mypgs") loadOwnerPGs();
    if (sectionId === "rooms-beds") loadOwnerRoomsAndBeds();
    if (sectionId === "tenant-requests") loadOwnerJoinRequests();
    if (sectionId === "tenants") loadOwnerTenants();
    if (sectionId === "bookings") loadOwnerBookings();
    if (sectionId === "payments") loadOwnerPayments();
    if (sectionId === "receipts") loadOwnerReceipts();
    if (sectionId === "notices") loadOwnerNotices();
    if (sectionId === "complaints") loadOwnerComplaints();
    if (sectionId === "reviews") loadOwnerReviews();
    if (sectionId === "owner-profile") loadOwnerProfile();
    if (sectionId === "owner-app-reports") loadOwnerAppReports();
};

// -------------------------------------------------------------
// 1. OWNER DASHBOARD
// -------------------------------------------------------------
async function loadOwnerDashboard() {
    const owner = getLoggedOwner();
    if (!owner) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/dashboard`);
        if (!response.ok) return;
        const data = await response.json();

        const s = data.stats || {};
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val !== undefined ? val : 0;
        };

        setVal("ownerStatPgs", s.total_pgs);
        setVal("ownerStatRooms", s.total_rooms);
        setVal("ownerStatBeds", s.total_beds);
        setVal("ownerStatOccupied", s.occupied_beds);
        setVal("ownerStatAvailable", s.available_beds);
        setVal("ownerStatTenants", s.total_tenants);
        setVal("ownerStatRequests", s.pending_requests);
        setVal("ownerStatPendingPayments", s.pending_payments);
        setVal("ownerStatOverduePayments", s.overdue_payments);
        setVal("ownerStatComplaints", s.open_complaints);

        // Recent Requests
        const reqTable = document.getElementById("dashboardRecentRequests");
        if (reqTable) {
            const reqs = data.recent_requests || [];
            if (reqs.length === 0) {
                reqTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No recent requests received.</td></tr>`;
            } else {
                reqTable.innerHTML = reqs.map(r => `
                    <tr>
                        <td><strong>${r.tenant_name}</strong></td>
                        <td><span class="pg-id-pill">${r.tenant_user_id || 'NEST'}</span></td>
                        <td>${r.pg_name}</td>
                        <td>${r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                        <td><span class="badge-status ${r.status}">${r.status}</span></td>
                        <td>
                            ${r.status === 'pending' ? `
                                <button class="btn-action-sm approve-btn" onclick="openApproveRequestModal(${r.request_id || r.id})">Approve</button>
                                <button class="btn-action-sm reject-btn" onclick="rejectOwnerRequest(${r.request_id || r.id})">Reject</button>
                            ` : `<span class="text-muted text-sm">${r.status}</span>`}
                        </td>
                    </tr>
                `).join("");
            }
        }

        // Recent Payments
        const payTable = document.getElementById("dashboardRecentPayments");
        if (payTable) {
            const pays = data.recent_payments || [];
            if (pays.length === 0) {
                payTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No payments recorded yet.</td></tr>`;
            } else {
                payTable.innerHTML = pays.map(p => `
                    <tr>
                        <td><strong>${p.tenant_name}</strong></td>
                        <td>${p.pg_name}</td>
                        <td style="font-weight:700; color:#15803d;">₹${p.amount.toLocaleString('en-IN')}</td>
                        <td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
                        <td><span class="badge-status ${p.status}">${p.status}</span></td>
                    </tr>
                `).join("");
            }
        }

        // Recent Complaints
        const compTable = document.getElementById("dashboardRecentComplaints");
        if (compTable) {
            const comps = data.recent_complaints || [];
            if (comps.length === 0) {
                compTable.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No open complaints reported.</td></tr>`;
            } else {
                compTable.innerHTML = comps.map(c => `
                    <tr>
                        <td><strong>${c.tenant_name}</strong></td>
                        <td>Room ${c.room_number || '-'}</td>
                        <td>${c.description ? (c.description.length > 35 ? c.description.slice(0, 35) + '...' : c.description) : (c.subject || '-')}</td>
                        <td><span class="badge-status ${c.status}">${c.status}</span></td>
                    </tr>
                `).join("");
            }
        }
    } catch (e) {
        console.error("Dashboard error:", e);
    }
}

// -------------------------------------------------------------
// 2. MY PGs (Property Management)
// -------------------------------------------------------------
async function loadOwnerPGs() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const container = document.getElementById("ownerPgCardsContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/pgs`);
        const data = await response.json();
        ownerPgsCache = data.pgs || [];

        // Also populate PG dropdowns across modals & filters
        populateAllPgDropdowns(ownerPgsCache);

        renderOwnerPgCards(ownerPgsCache);
    } catch (e) {
        console.error("Load PGs error:", e);
        container.innerHTML = `<div class="empty-state"><div class="big-icon">⚠️</div><h2>Failed to load properties</h2><p>Could not connect to backend.</p></div>`;
    }
}

function renderOwnerPgCards(pgs) {
    const container = document.getElementById("ownerPgCardsContainer");
    if (!container) return;

    if (pgs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🏢</div>
                <h2>No Properties Added Yet</h2>
                <p>Add your first PG property to begin receiving join requests and managing rooms.</p>
                <button class="primary-dashboard-btn mt-3" onclick="openAddPgModal()">➕ Add New Property</button>
            </div>
        `;
        return;
    }

    container.innerHTML = pgs.map(pg => `
        <div class="owner-pg-card">
            <div>
                <div class="pg-card-top-row">
                    <h3 class="pg-card-title">${pg.pg_name}</h3>
                    <span class="pg-id-pill">${pg.pg_id}</span>
                </div>
                <div class="pg-card-address">📍 ${pg.address}, ${pg.city} - ${pg.pincode}</div>
                
                <div class="pg-card-pills-row">
                    <span class="pg-chip">👥 ${pg.gender_allowed}</span>
                    <span class="pg-chip">🚪 ${pg.pg_type}</span>
                    <span class="badge-status ${pg.status}">${pg.status === 'approved' ? 'Active' : pg.status}</span>
                </div>

                <div class="pg-card-metrics">
                    <div class="metric-item">
                        <div class="val">${pg.total_rooms}</div>
                        <div class="lbl">Rooms</div>
                    </div>
                    <div class="metric-item">
                        <div class="val">${pg.total_beds}</div>
                        <div class="lbl">Total Beds</div>
                    </div>
                    <div class="metric-item">
                        <div class="val" style="color:#16a34a;">${pg.available_beds}</div>
                        <div class="lbl">Available</div>
                    </div>
                    <div class="metric-item">
                        <div class="val" style="color:#2563eb;">${pg.active_tenants}</div>
                        <div class="lbl">Tenants</div>
                    </div>
                </div>

                <div class="pg-card-financials">
                    <div>
                        <span class="text-sm text-muted">Monthly Rent</span><br>
                        <strong style="font-size:18px; color:#1e3a8a;">₹${pg.monthly_rent.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style="text-align:right;">
                        <span class="text-sm text-muted">Security Deposit</span><br>
                        <strong style="font-size:14px; color:#475569;">₹${pg.security_deposit.toLocaleString('en-IN')}</strong>
                    </div>
                </div>
            </div>

            <div class="pg-card-actions">
                <button class="btn-card-secondary" onclick="openEditPgModal(${pg.db_id})">✏️ Edit PG</button>
                <button class="btn-card-secondary" onclick="filterRoomsByPg(${pg.db_id})">🛏️ Rooms & Beds</button>
            </div>
        </div>
    `).join("");
}

function filterOwnerPgsList() {
    const q = (document.getElementById("ownerPgSearchInput").value || "").toLowerCase().trim();
    if (!q) {
        renderOwnerPgCards(ownerPgsCache);
        return;
    }
    const filtered = ownerPgsCache.filter(p => 
        (p.pg_name && p.pg_name.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.pg_id && p.pg_id.toLowerCase().includes(q))
    );
    renderOwnerPgCards(filtered);
}

function populateAllPgDropdowns(pgs) {
    const dropdownIds = ["roomsBedPgFilter", "tenantPgFilter", "modalRoomPgId", "modalNoticePgId"];
    dropdownIds.forEach(dId => {
        const el = document.getElementById(dId);
        if (!el) return;
        const currentVal = el.value;
        let html = "";
        if (dId === "roomsBedPgFilter" || dId === "tenantPgFilter") {
            html += `<option value="all">All Properties</option>`;
        }
        pgs.forEach(p => {
            html += `<option value="${p.db_id}">${p.pg_name} (${p.pg_id})</option>`;
        });
        el.innerHTML = html;
        if (currentVal) el.value = currentVal;
    });
}

function openAddPgModal() {
    document.getElementById("ownerPgForm").reset();
    document.getElementById("modalPgDbId").value = "";
    document.getElementById("ownerPgModalTitle").textContent = "Add New Property";
    document.getElementById("modalPgSaveBtn").textContent = "Save Property";
    openOwnerModal("ownerPgModal");
}

function openEditPgModal(pgDbId) {
    const pg = ownerPgsCache.find(p => p.db_id === pgDbId);
    if (!pg) return;

    document.getElementById("modalPgDbId").value = pg.db_id;
    document.getElementById("modalPgName").value = pg.pg_name || "";
    document.getElementById("modalPgType").value = pg.pg_type || "Single / Double Sharing";
    document.getElementById("modalPgCity").value = pg.city || "Jamshedpur";
    document.getElementById("modalPgPincode").value = pg.pincode || "831001";
    document.getElementById("modalPgAddress").value = pg.address || "";
    document.getElementById("modalPgGender").value = pg.gender_allowed || "All";
    document.getElementById("modalPgStatus").value = pg.status || "approved";
    document.getElementById("modalPgRent").value = pg.monthly_rent || 8000;
    document.getElementById("modalPgDeposit").value = pg.security_deposit || pg.monthly_rent || 8000;
    document.getElementById("modalPgLat").value = pg.latitude || 22.8046;
    document.getElementById("modalPgLng").value = pg.longitude || 86.2029;
    document.getElementById("modalPgDesc").value = pg.description || "";

    document.getElementById("ownerPgModalTitle").textContent = `Edit ${pg.pg_name} (${pg.pg_id})`;
    document.getElementById("modalPgSaveBtn").textContent = "Update Property";
    openOwnerModal("ownerPgModal");
}

async function submitSavePg(event) {
    event.preventDefault();
    const owner = getLoggedOwner();
    if (!owner) return;

    const dbId = document.getElementById("modalPgDbId").value;
    const payload = {
        pg_name: document.getElementById("modalPgName").value.trim(),
        pg_type: document.getElementById("modalPgType").value,
        city: document.getElementById("modalPgCity").value.trim(),
        pincode: document.getElementById("modalPgPincode").value.trim(),
        address: document.getElementById("modalPgAddress").value.trim(),
        gender_allowed: document.getElementById("modalPgGender").value,
        status: document.getElementById("modalPgStatus").value,
        monthly_rent: Number(document.getElementById("modalPgRent").value),
        security_deposit: Number(document.getElementById("modalPgDeposit").value),
        latitude: Number(document.getElementById("modalPgLat").value),
        longitude: Number(document.getElementById("modalPgLng").value),
        description: document.getElementById("modalPgDesc").value.trim()
    };

    try {
        let response;
        if (dbId) {
            response = await fetch(`${API_URL}/api/owner/pgs/${dbId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(`${API_URL}/api/owner/${owner.id}/pgs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        const resData = await response.json();
        if (response.ok) {
            alert(resData.message || "Property saved successfully!");
            closeOwnerModal("ownerPgModal");
            loadOwnerPGs();
            loadOwnerDashboard();
        } else {
            alert(resData.detail || "Error saving property.");
        }
    } catch (e) {
        console.error("Save PG error:", e);
        alert("Failed to save property. Please check backend connection.");
    }
}

function filterRoomsByPg(pgDbId) {
    showOwnerSection("rooms-beds");
    const filterEl = document.getElementById("roomsBedPgFilter");
    if (filterEl) {
        filterEl.value = pgDbId;
        loadOwnerRoomsAndBeds();
    }
}

// -------------------------------------------------------------
// 3. ROOMS & BEDS MANAGEMENT
// -------------------------------------------------------------
async function loadOwnerRoomsAndBeds() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const filterVal = document.getElementById("roomsBedPgFilter") ? document.getElementById("roomsBedPgFilter").value : "all";
    const container = document.getElementById("ownerRoomsListContainer");
    const summaryBar = document.getElementById("roomsBedsSummaryBar");
    if (!container) return;

    try {
        const url = filterVal && filterVal !== "all" 
            ? `${API_URL}/api/owner/${owner.id}/rooms-beds?pg_id=${filterVal}`
            : `${API_URL}/api/owner/${owner.id}/rooms-beds`;

        const response = await fetch(url);
        const data = await response.json();
        ownerRoomsCache = data.rooms || [];

        // Calculate summary
        let totalRooms = ownerRoomsCache.length;
        let totalBeds = 0;
        let occupiedBeds = 0;
        let availableBeds = 0;

        ownerRoomsCache.forEach(r => {
            totalBeds += r.total_beds || 0;
            occupiedBeds += r.occupied_beds || 0;
            availableBeds += r.available_beds || 0;
        });

        if (summaryBar) {
            summaryBar.innerHTML = `
                <span><strong>Total Rooms:</strong> ${totalRooms}</span>
                <span><strong>Total Beds:</strong> ${totalBeds}</span>
                <span style="color:#15803d;"><strong>Available:</strong> ${availableBeds}</span>
                <span style="color:#b91c1c;"><strong>Occupied:</strong> ${occupiedBeds}</span>
            `;
        }

        renderOwnerRooms(ownerRoomsCache);
    } catch (e) {
        console.error("Load rooms error:", e);
        container.innerHTML = `<div class="empty-state"><div class="big-icon">⚠️</div><h2>Failed to load rooms</h2><p>Error connecting to backend.</p></div>`;
    }
}

function renderOwnerRooms(rooms) {
    const container = document.getElementById("ownerRoomsListContainer");
    if (!container) return;

    if (rooms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🛏️</div>
                <h2>No Rooms Found</h2>
                <p>Add rooms and assign bed configurations to this property.</p>
                <button class="primary-dashboard-btn mt-3" onclick="openAddRoomModal()">➕ Add Room</button>
            </div>
        `;
        return;
    }

    container.innerHTML = rooms.map(rm => `
        <div class="owner-room-card">
            <div class="room-card-head">
                <div>
                    <h3>Room ${rm.room_number} <span class="pg-id-pill">${rm.pg_name}</span></h3>
                    <div class="room-meta-tags mt-1">
                        <span class="pg-chip">🚪 ${rm.room_type}</span>
                        <span class="pg-chip">Rent: ₹${rm.rent.toLocaleString('en-IN')}/mo</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="btn-action-sm view-btn" onclick="openAddBedModal(${rm.room_db_id})">➕ Add Bed</button>
                    <button class="btn-action-sm view-btn" onclick="openEditRoomModal(${rm.room_db_id}, '${rm.room_number}', '${rm.room_type}', ${rm.rent})">✏️ Edit</button>
                    <button class="btn-action-sm reject-btn" onclick="deleteOwnerRoom(${rm.room_db_id}, ${rm.occupied_beds})">🗑️ Delete</button>
                </div>
            </div>

            <div class="room-beds-section">
                <div class="room-beds-section-title">
                    Beds Configuration (${rm.occupied_beds}/${rm.total_beds} Occupied):
                </div>
                <div class="beds-badge-list">
                    ${(rm.beds || []).length === 0 ? `<span class="text-muted text-sm">No beds configured in this room.</span>` : 
                      rm.beds.map(b => `
                        <div class="owner-bed-card ${b.bed_status}">
                            <div class="bed-card-top">
                                <span class="bed-label">${b.bed_number}</span>
                                <span class="badge-status ${b.bed_status}">${b.bed_status}</span>
                            </div>
                            ${b.bed_status === 'occupied' && b.occupied_by_name ? `
                                <div class="bed-tenant-info">
                                    👤 ${b.occupied_by_name} <br>
                                    <span class="text-muted" style="font-size:11px;">📞 ${b.occupied_by_phone || '-'}</span>
                                </div>
                            ` : `<div class="text-muted" style="font-size:11px;">Ready for allocation</div>`}

                            <div class="bed-actions-row">
                                <button class="bed-action-btn" onclick="toggleBedStatus(${b.bed_db_id}, '${b.bed_status}')">
                                    ${b.bed_status === 'occupied' ? 'Mark Available' : 'Mark Occupied'}
                                </button>
                                ${b.bed_status === 'available' ? `
                                    <button class="bed-action-btn text-danger" onclick="deleteOwnerBed(${b.bed_db_id})">Delete</button>
                                ` : ''}
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        </div>
    `).join("");
}

function openAddRoomModal() {
    document.getElementById("ownerRoomForm").reset();
    document.getElementById("modalRoomDbId").value = "";
    document.getElementById("ownerRoomModalTitle").textContent = "Add New Room";
    document.getElementById("modalRoomPgSelectGroup").style.display = "block";
    document.getElementById("modalRoomBedCountGroup").style.display = "block";

    // Set default PG in select
    const filterVal = document.getElementById("roomsBedPgFilter") ? document.getElementById("roomsBedPgFilter").value : "all";
    if (filterVal !== "all" && document.getElementById("modalRoomPgId")) {
        document.getElementById("modalRoomPgId").value = filterVal;
    }

    openOwnerModal("ownerRoomModal");
}

function openEditRoomModal(roomDbId, roomNumber, roomType, rent) {
    document.getElementById("modalRoomDbId").value = roomDbId;
    document.getElementById("modalRoomNumber").value = roomNumber;
    document.getElementById("modalRoomType").value = roomType;
    document.getElementById("modalRoomRent").value = rent;

    document.getElementById("modalRoomPgSelectGroup").style.display = "none";
    document.getElementById("modalRoomBedCountGroup").style.display = "none";
    document.getElementById("ownerRoomModalTitle").textContent = `Edit Room ${roomNumber}`;

    openOwnerModal("ownerRoomModal");
}

async function submitSaveRoom(event) {
    event.preventDefault();
    const dbId = document.getElementById("modalRoomDbId").value;

    try {
        let response;
        if (dbId) {
            response = await fetch(`${API_URL}/api/owner/rooms/${dbId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room_number: document.getElementById("modalRoomNumber").value.trim(),
                    room_type: document.getElementById("modalRoomType").value,
                    rent: Number(document.getElementById("modalRoomRent").value)
                })
            });
        } else {
            response = await fetch(`${API_URL}/api/owner/rooms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pg_id: Number(document.getElementById("modalRoomPgId").value),
                    room_number: document.getElementById("modalRoomNumber").value.trim(),
                    room_type: document.getElementById("modalRoomType").value,
                    rent: Number(document.getElementById("modalRoomRent").value),
                    bed_count: Number(document.getElementById("modalRoomBedCount").value)
                })
            });
        }

        const res = await response.json();
        if (response.ok) {
            alert(res.message || "Room saved!");
            closeOwnerModal("ownerRoomModal");
            loadOwnerRoomsAndBeds();
            loadOwnerDashboard();
        } else {
            alert(res.detail || "Error saving room.");
        }
    } catch (e) {
        console.error("Save room error:", e);
    }
}

async function deleteOwnerRoom(roomDbId, occupiedBeds) {
    if (occupiedBeds > 0) {
        alert("Cannot delete room: There are occupied beds with active tenants in this room. Please reallocate tenants first.");
        return;
    }
    if (!confirm("Are you sure you want to delete this room and all its beds?")) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/rooms/${roomDbId}`, { method: "DELETE" });
        if (response.ok) {
            loadOwnerRoomsAndBeds();
            loadOwnerDashboard();
        }
    } catch (e) {
        console.error("Delete room error:", e);
    }
}

function openAddBedModal(roomDbId) {
    document.getElementById("ownerBedForm").reset();
    document.getElementById("modalBedRoomId").value = roomDbId;
    document.getElementById("modalBedDbId").value = "";
    document.getElementById("ownerBedModalTitle").textContent = "Add Bed to Room";
    openOwnerModal("ownerBedModal");
}

async function submitSaveBed(event) {
    event.preventDefault();
    const roomId = document.getElementById("modalBedRoomId").value;
    const bedNumber = document.getElementById("modalBedNumber").value.trim();
    const status = document.getElementById("modalBedStatus").value;

    try {
        const response = await fetch(`${API_URL}/api/owner/beds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: roomId, bed_number: bedNumber, status })
        });
        if (response.ok) {
            closeOwnerModal("ownerBedModal");
            loadOwnerRoomsAndBeds();
            loadOwnerDashboard();
        } else {
            const err = await response.json();
            alert(err.detail || "Error adding bed.");
        }
    } catch (e) {
        console.error("Add bed error:", e);
    }
}

async function toggleBedStatus(bedDbId, currentStatus) {
    const newStatus = currentStatus === "occupied" ? "available" : "occupied";
    if (currentStatus === "occupied") {
        if (!confirm("Mark this bed as Available? This will vacate the tenant slot.")) return;
    }
    try {
        const response = await fetch(`${API_URL}/api/owner/beds/${bedDbId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            loadOwnerRoomsAndBeds();
            loadOwnerDashboard();
        }
    } catch (e) {
        console.error("Toggle bed error:", e);
    }
}

async function deleteOwnerBed(bedDbId) {
    if (!confirm("Remove this bed permanently?")) return;
    try {
        const response = await fetch(`${API_URL}/api/owner/beds/${bedDbId}`, { method: "DELETE" });
        if (response.ok) {
            loadOwnerRoomsAndBeds();
            loadOwnerDashboard();
        }
    } catch (e) {
        console.error("Delete bed error:", e);
    }
}

// -------------------------------------------------------------
// 4. JOIN REQUESTS (Connected with Tenant Panel)
// -------------------------------------------------------------
async function loadOwnerJoinRequests() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const tableBody = document.getElementById("ownerRequestsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/tenant-requests`);
        const data = await response.json();
        ownerRequestsCache = data.requests || [];
        renderOwnerRequests(ownerRequestsCache);
    } catch (e) {
        console.error("Load requests error:", e);
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Failed to load requests.</td></tr>`;
    }
}

function renderOwnerRequests(requests) {
    const tableBody = document.getElementById("ownerRequestsTableBody");
    if (!tableBody) return;

    if (requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No join requests found for this filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = requests.map(r => `
        <tr>
            <td><strong>#REQ-${r.request_id}</strong></td>
            <td>
                <strong>${r.tenant_name}</strong><br>
                <span class="text-muted text-sm">📞 ${r.tenant_phone || '-'}</span>
            </td>
            <td><span class="pg-id-pill">${r.tenant_user_id || 'NEST'}</span></td>
            <td>${r.pg_name}</td>
            <td><span class="pg-chip">${r.preferred_sharing || 'Sharing'}</span></td>
            <td>${r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
            <td><span class="badge-status ${r.status}">${r.status}</span></td>
            <td>
                ${r.status === 'pending' ? `
                    <button class="btn-action-sm approve-btn" onclick="openApproveRequestModal(${r.request_id})">Approve</button>
                    <button class="btn-action-sm reject-btn" onclick="rejectOwnerRequest(${r.request_id})">Reject</button>
                ` : `
                    <span class="text-muted text-sm">${r.status === 'approved' ? '✅ Approved' : '❌ Rejected'}</span>
                `}
            </td>
        </tr>
    `).join("");
}

function filterOwnerRequests(status, btn) {
    if (btn) {
        document.querySelectorAll("#tenant-requests .tab-chip").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
    }
    if (status === "all") {
        renderOwnerRequests(ownerRequestsCache);
    } else {
        const filtered = ownerRequestsCache.filter(r => r.status === status);
        renderOwnerRequests(filtered);
    }
}

async function openApproveRequestModal(requestId) {
    let req = (ownerRequestsCache || []).find(r => r.request_id === requestId || r.id === requestId);
    if (!req) {
        const owner = getLoggedOwner();
        if (owner) {
            try {
                const response = await fetch(`${API_URL}/api/owner/${owner.id}/tenant-requests`);
                const data = await response.json();
                ownerRequestsCache = data.requests || [];
                req = ownerRequestsCache.find(r => r.request_id === requestId || r.id === requestId);
            } catch (e) {
                console.error("Fetch requests error:", e);
            }
        }
    }
    if (!req) {
        alert("Request details not found.");
        return;
    }

    document.getElementById("approveRequestId").value = req.request_id || req.id;
    document.getElementById("approveRequestPgId").value = req.pg_id;
    document.getElementById("approveTenantName").textContent = req.tenant_name;
    document.getElementById("approveTenantId").textContent = req.tenant_user_id || `ID: ${req.tenant_id}`;
    document.getElementById("approvePgName").textContent = req.pg_name;
    document.getElementById("approvePreferredSharing").textContent = req.preferred_sharing || "Standard Sharing";

    const bedsContainer = document.getElementById("approveRoomsBedList");
    bedsContainer.innerHTML = `<div class="text-muted text-center py-4">Checking available rooms and beds in ${req.pg_name}...</div>`;
    openOwnerModal("ownerApproveRequestModal");

    const owner = getLoggedOwner();
    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/rooms-beds?pg_id=${req.pg_id}`);
        const data = await response.json();
        const rooms = data.rooms || [];

        let availableOptions = [];
        rooms.forEach(rm => {
            (rm.beds || []).forEach(b => {
                if (b.bed_status === "available") {
                    availableOptions.push({
                        room_id: rm.room_db_id,
                        room_number: rm.room_number,
                        room_type: rm.room_type,
                        rent: rm.rent,
                        bed_id: b.bed_db_id,
                        bed_number: b.bed_number
                    });
                }
            });
        });

        if (availableOptions.length === 0) {
            bedsContainer.innerHTML = `
                <div class="alert-banner warning">
                    ⚠️ <strong>No available beds found in this PG!</strong><br>
                    All rooms are currently full. You can approve the request without immediate bed allocation, or add a room/bed first.
                </div>
                <label style="display:flex; align-items:center; gap:8px; margin-top:10px;">
                    <input type="radio" name="approveBedRadio" value="auto" checked>
                    <span>Approve without bed allocation (Tenant can join waitlist)</span>
                </label>
            `;
        } else {
            bedsContainer.innerHTML = availableOptions.map((opt, idx) => `
                <div style="background:white; border:1.5px solid #cbd5e1; border-radius:10px; padding:12px 14px; margin-bottom:8px; display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="this.querySelector('input').checked = true;">
                    <input type="radio" name="approveBedRadio" value="${opt.room_id}:${opt.bed_id}" id="bedOpt_${opt.bed_id}" ${idx === 0 ? 'checked' : ''}>
                    <label for="bedOpt_${opt.bed_id}" style="cursor:pointer; flex:1;">
                        <strong style="color:#0f172a;">Room ${opt.room_number}</strong> — <span style="color:#16a34a; font-weight:700;">${opt.bed_number}</span> 
                        <span class="pg-chip" style="margin-left:8px;">${opt.room_type}</span>
                        <div style="font-size:12px; color:#64748b; margin-top:2px;">Rent: ₹${opt.rent.toLocaleString('en-IN')}/mo</div>
                    </label>
                </div>
            `).join("");
        }
    } catch (e) {
        console.error("Load approve beds error:", e);
        bedsContainer.innerHTML = `<div class="text-danger text-sm">Failed to check room availability.</div>`;
    }
}

async function submitApproveRequest(event) {
    event.preventDefault();
    const requestId = document.getElementById("approveRequestId").value;
    const selectedRadio = document.querySelector('input[name="approveBedRadio"]:checked');

    let roomId = null;
    let bedId = null;

    if (selectedRadio && selectedRadio.value && selectedRadio.value !== "auto") {
        const parts = selectedRadio.value.split(":");
        roomId = Number(parts[0]);
        bedId = Number(parts[1]);
    }

    try {
        const response = await fetch(`${API_URL}/api/owner/tenant-requests/${requestId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: "approved",
                room_id: roomId,
                bed_id: bedId
            })
        });

        const res = await response.json();
        if (response.ok) {
            alert("Join request approved successfully! Bed occupancy and tenant PG updated.");
            closeOwnerModal("ownerApproveRequestModal");
            loadOwnerJoinRequests();
            loadOwnerDashboard();
            loadOwnerTenants();
        } else {
            alert(res.detail || "Error approving request.");
        }
    } catch (e) {
        console.error("Approve request error:", e);
        alert("Failed to submit approval.");
    }
}

async function rejectOwnerRequest(requestId) {
    if (!confirm("Are you sure you want to reject this join request?")) return;
    try {
        const response = await fetch(`${API_URL}/api/owner/tenant-requests/${requestId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "rejected" })
        });
        if (response.ok) {
            alert("Join request rejected.");
            loadOwnerJoinRequests();
            loadOwnerDashboard();
        }
    } catch (e) {
        console.error("Reject request error:", e);
    }
}

// -------------------------------------------------------------
// 5. TENANT MANAGEMENT
// -------------------------------------------------------------
async function loadOwnerTenants() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const tableBody = document.getElementById("ownerTenantsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/tenants`);
        const data = await response.json();
        ownerTenantsCache = data.tenants || [];
        renderOwnerTenants(ownerTenantsCache);
    } catch (e) {
        console.error("Load tenants error:", e);
        tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">Failed to load tenants.</td></tr>`;
    }
}

function renderOwnerTenants(tenants) {
    const tableBody = document.getElementById("ownerTenantsTableBody");
    if (!tableBody) return;

    if (tenants.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">No active tenants found for this property.</td></tr>`;
        return;
    }

    tableBody.innerHTML = tenants.map(t => `
        <tr>
            <td><span class="pg-id-pill">${t.tenant_user_id || 'NEST'}</span></td>
            <td><strong>${t.tenant_name}</strong></td>
            <td>${t.tenant_phone || '-'}</td>
            <td><span class="text-sm text-muted">${t.tenant_email || '-'}</span></td>
            <td>${t.pg_name}</td>
            <td>${t.room_number ? 'Room ' + t.room_number : '-'}</td>
            <td>${t.bed_number ? '<span class="pg-chip">' + t.bed_number + '</span>' : '-'}</td>
            <td>${t.joining_date ? new Date(t.joining_date).toLocaleDateString() : '-'}</td>
            <td><strong>₹${t.monthly_rent.toLocaleString('en-IN')}</strong></td>
            <td><span class="badge-status ${t.payment_status}">${t.payment_status}</span></td>
            <td>
                <button class="btn-action-sm view-btn" onclick="viewOwnerTenantDetails(${t.tenant_id})">View Details</button>
            </td>
        </tr>
    `).join("");
}

function filterOwnerTenantsList() {
    const q = (document.getElementById("tenantSearchInput").value || "").toLowerCase().trim();
    const pgFilter = document.getElementById("tenantPgFilter") ? document.getElementById("tenantPgFilter").value : "all";

    let filtered = ownerTenantsCache;
    if (pgFilter !== "all") {
        filtered = filtered.filter(t => String(t.pg_db_id) === String(pgFilter));
    }
    if (q) {
        filtered = filtered.filter(t =>
            (t.tenant_name && t.tenant_name.toLowerCase().includes(q)) ||
            (t.tenant_phone && t.tenant_phone.includes(q)) ||
            (t.tenant_user_id && t.tenant_user_id.toLowerCase().includes(q))
        );
    }
    renderOwnerTenants(filtered);
}

async function viewOwnerTenantDetails(tenantId) {
    const content = document.getElementById("tenantDetailsModalContent");
    content.innerHTML = `<div class="text-center py-4 text-muted">Loading tenant details...</div>`;
    openOwnerModal("ownerTenantDetailsModal");

    try {
        const response = await fetch(`${API_URL}/api/owner/tenants/${tenantId}/details`);
        const data = await response.json();
        const t = data.tenant || {};
        const alloc = data.allocation || {};
        const payments = data.payments || [];
        const comps = data.complaints || [];

        content.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0;">
                    <h3 style="margin-top:0; font-size:16px; color:#0f172a;">Personal Details</h3>
                    <div style="font-size:13px; line-height:1.8; color:#334155;">
                        <div><strong>Name:</strong> ${t.name} (${t.user_id})</div>
                        <div><strong>Phone:</strong> ${t.phone || '-'}</div>
                        <div><strong>Email:</strong> ${t.email || '-'}</div>
                        <div><strong>Age / Gender:</strong> ${t.age || '-'} / ${t.gender || '-'}</div>
                        <div><strong>Permanent Address:</strong> ${t.address || '-'}</div>
                    </div>
                </div>

                <div style="background:#eff6ff; padding:16px; border-radius:12px; border:1px solid #bfdbfe;">
                    <h3 style="margin-top:0; font-size:16px; color:#1e3a8a;">Stay & Room Allocation</h3>
                    <div style="font-size:13px; line-height:1.8; color:#1e40af;">
                        <div><strong>Property:</strong> ${alloc.pg_name || '-'}</div>
                        <div><strong>Allocated Room:</strong> ${alloc.room_number ? 'Room ' + alloc.room_number + ' (' + alloc.room_type + ')' : 'Not allocated'}</div>
                        <div><strong>Allocated Bed:</strong> ${alloc.bed_number || 'Not allocated'}</div>
                        <div><strong>Monthly Rent:</strong> ₹${alloc.monthly_rent ? alloc.monthly_rent.toLocaleString('en-IN') : '0'}</div>
                        <div><strong>Status:</strong> <span class="badge-status ${alloc.status || 'active'}">${alloc.status || 'Active'}</span></div>
                    </div>
                </div>
            </div>

            <h3 style="font-size:15px; margin-bottom:8px; color:#0f172a;">Payment History</h3>
            <div class="data-table-container" style="margin-bottom:20px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Txn ID</th>
                            <th>Amount</th>
                            <th>Month / Purpose</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.length === 0 ? `<tr><td colspan="5" class="text-center py-2 text-muted">No payments on record.</td></tr>` : 
                          payments.map(p => `
                            <tr>
                                <td>${p.transaction_id}</td>
                                <td><strong>₹${p.amount.toLocaleString('en-IN')}</strong></td>
                                <td>${p.payment_month || p.payment_for}</td>
                                <td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
                                <td><span class="badge-status ${p.status}">${p.status}</span></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>

            <h3 style="font-size:15px; margin-bottom:8px; color:#0f172a;">Complaints History</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Subject</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${comps.length === 0 ? `<tr><td colspan="4" class="text-center py-2 text-muted">No complaints filed by this tenant.</td></tr>` : 
                          comps.map(c => `
                            <tr>
                                <td>#${c.complaint_id || c.id}</td>
                                <td>${c.subject || c.description}</td>
                                <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                                <td><span class="badge-status ${c.status}">${c.status}</span></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        console.error("Tenant details error:", e);
        content.innerHTML = `<div class="text-danger text-center">Failed to load tenant details.</div>`;
    }
}

// -------------------------------------------------------------
// 6. BOOKINGS MANAGEMENT
// -------------------------------------------------------------
async function loadOwnerBookings() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const tableBody = document.getElementById("ownerBookingsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/bookings`);
        const data = await response.json();
        ownerBookingsCache = data.bookings || [];
        renderOwnerBookings(ownerBookingsCache);
    } catch (e) {
        console.error("Load bookings error:", e);
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">Failed to load bookings.</td></tr>`;
    }
}

function renderOwnerBookings(bookings) {
    const tableBody = document.getElementById("ownerBookingsTableBody");
    if (!tableBody) return;

    if (bookings.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No bookings found for this filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = bookings.map(b => `
        <tr>
            <td><strong>#${b.booking_id}</strong></td>
            <td>
                <strong>${b.tenant_name}</strong><br>
                <span class="text-muted text-sm">📞 ${b.tenant_phone || '-'}</span>
            </td>
            <td>${b.pg_name}</td>
            <td>${b.room_number ? 'Room ' + b.room_number : '-'}</td>
            <td>${b.bed_number ? '<span class="pg-chip">' + b.bed_number + '</span>' : '-'}</td>
            <td>${b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '-'}</td>
            <td>₹${b.rent.toLocaleString('en-IN')}</td>
            <td>₹${b.security_deposit.toLocaleString('en-IN')}</td>
            <td><span class="badge-status ${b.status}">${b.status}</span></td>
            <td>
                <select onchange="updateOwnerBookingStatus('${b.booking_id}', this.value)" style="font-size:12px; padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1;">
                    <option value="">Update Status</option>
                    <option value="approved">Confirmed / Approved</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </td>
        </tr>
    `).join("");
}

function filterOwnerBookings(status, btn) {
    if (btn) {
        document.querySelectorAll("#bookings .tab-chip").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
    }
    if (status === "all") {
        renderOwnerBookings(ownerBookingsCache);
    } else {
        const filtered = ownerBookingsCache.filter(b => b.status === status);
        renderOwnerBookings(filtered);
    }
}

async function updateOwnerBookingStatus(bookingId, newStatus) {
    if (!newStatus) return;
    try {
        const response = await fetch(`${API_URL}/api/owner/bookings/${bookingId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            loadOwnerBookings();
            loadOwnerDashboard();
        }
    } catch (e) {
        console.error("Update booking error:", e);
    }
}

// -------------------------------------------------------------
// 7. PAYMENTS & FINANCIALS
// -------------------------------------------------------------
async function loadOwnerPayments() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const tableBody = document.getElementById("ownerPaymentsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/payments`);
        const data = await response.json();
        const stats = data.stats || {};

        document.getElementById("ownerPayTotalCollected").textContent = `₹${(stats.total_collected || 0).toLocaleString('en-IN')}`;
        document.getElementById("ownerPayPendingAmount").textContent = `₹${(stats.pending_amount || 0).toLocaleString('en-IN')}`;
        document.getElementById("ownerPayOverdueAmount").textContent = `₹${(stats.overdue_amount || 0).toLocaleString('en-IN')}`;
        document.getElementById("ownerPayMonthCollection").textContent = `₹${(stats.current_month_collection || 0).toLocaleString('en-IN')}`;

        ownerPaymentsCache = data.payments || [];
        renderOwnerPayments(ownerPaymentsCache);
    } catch (e) {
        console.error("Load payments error:", e);
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Failed to load payments.</td></tr>`;
    }
}

function renderOwnerPayments(payments) {
    const tableBody = document.getElementById("ownerPaymentsTableBody");
    if (!tableBody) return;

    if (payments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No payments found for this filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = payments.map(p => `
        <tr>
            <td><span class="pg-id-pill">${p.transaction_id}</span></td>
            <td><strong>${p.tenant_name}</strong></td>
            <td>${p.pg_name}</td>
            <td>${p.payment_for || 'Rent'} (${p.payment_month || '-'})</td>
            <td style="font-weight:700; color:#1e3a8a;">₹${p.amount.toLocaleString('en-IN')}</td>
            <td>${p.due_date ? new Date(p.due_date).toLocaleDateString() : '-'}</td>
            <td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
            <td><span class="pg-chip">${p.payment_method || 'UPI'}</span></td>
            <td><span class="badge-status ${p.status}">${p.status}</span></td>
        </tr>
    `).join("");
}

function filterOwnerPaymentsTab(status, btn) {
    if (btn) {
        document.querySelectorAll("#payments .tab-chip").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
    }
    if (status === "all") {
        renderOwnerPayments(ownerPaymentsCache);
    } else {
        const filtered = ownerPaymentsCache.filter(p => {
            if (status === "success") return p.status === "success" || p.status === "paid";
            return p.status === status;
        });
        renderOwnerPayments(filtered);
    }
}

function openRecordPaymentModal() {
    const select = document.getElementById("recordPayTenantSelect");
    select.innerHTML = `<option value="">Select Tenant...</option>`;
    ownerTenantsCache.forEach(t => {
        select.innerHTML += `<option value="${t.tenant_id}" data-pgid="${t.pg_db_id}" data-pgname="${t.pg_name}" data-rent="${t.monthly_rent}">${t.tenant_name} (${t.tenant_user_id || 'ID:'+t.tenant_id}) — ${t.pg_name}</option>`;
    });

    const now = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("recordPayMonth").value = `${months[now.getMonth()]} ${now.getFullYear()}`;
    openOwnerModal("ownerRecordPaymentModal");
}

function handlePayTenantSelectChange() {
    const select = document.getElementById("recordPayTenantSelect");
    const opt = select.options[select.selectedIndex];
    if (opt && opt.dataset.pgid) {
        document.getElementById("recordPayPgId").value = opt.dataset.pgid;
        document.getElementById("recordPayPgName").value = opt.dataset.pgname;
        if (opt.dataset.rent) {
            document.getElementById("recordPayAmount").value = opt.dataset.rent;
        }
    }
}

async function submitRecordPayment(event) {
    event.preventDefault();
    const tenantId = document.getElementById("recordPayTenantSelect").value;
    const pgId = document.getElementById("recordPayPgId").value;
    const amount = Number(document.getElementById("recordPayAmount").value);
    const paymentFor = document.getElementById("recordPayFor").value;
    const paymentMonth = document.getElementById("recordPayMonth").value.trim();
    const paymentMethod = document.getElementById("recordPayMethod").value;
    const status = document.getElementById("recordPayStatus").value;

    if (!tenantId || !pgId) {
        alert("Please select a tenant.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/owner/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenant_id: tenantId,
                pg_id: pgId,
                amount,
                payment_for: paymentFor,
                payment_month: paymentMonth,
                payment_method: paymentMethod,
                status
            })
        });

        const res = await response.json();
        if (response.ok) {
            alert("Payment recorded successfully! Receipt generated.");
            closeOwnerModal("ownerRecordPaymentModal");
            loadOwnerPayments();
            loadOwnerReceipts();
            loadOwnerDashboard();
        } else {
            alert(res.detail || "Error recording payment.");
        }
    } catch (e) {
        console.error("Record payment error:", e);
    }
}

// -------------------------------------------------------------
// 8. RECEIPTS MANAGEMENT
// -------------------------------------------------------------
async function loadOwnerReceipts() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const tableBody = document.getElementById("ownerReceiptsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/receipts`);
        const data = await response.json();
        ownerReceiptsCache = data.receipts || [];
        renderOwnerReceipts(ownerReceiptsCache);
    } catch (e) {
        console.error("Load receipts error:", e);
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">Failed to load receipts.</td></tr>`;
    }
}

function renderOwnerReceipts(receipts) {
    const tableBody = document.getElementById("ownerReceiptsTableBody");
    if (!tableBody) return;

    if (receipts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No receipts generated yet.</td></tr>`;
        return;
    }

    tableBody.innerHTML = receipts.map(rc => `
        <tr>
            <td><strong>${rc.receipt_id}</strong></td>
            <td><span class="pg-id-pill">${rc.transaction_id}</span></td>
            <td><strong>${rc.tenant_name}</strong></td>
            <td>${rc.pg_name}</td>
            <td>${rc.room_number ? 'Room ' + rc.room_number + (rc.bed_number ? ' / ' + rc.bed_number : '') : '-'}</td>
            <td style="font-weight:700; color:#15803d;">₹${rc.amount.toLocaleString('en-IN')}</td>
            <td>${rc.receipt_date ? new Date(rc.receipt_date).toLocaleDateString() : '-'}</td>
            <td>${rc.payment_for || 'Rent'}</td>
            <td><span class="pg-chip">${rc.payment_method || 'UPI'}</span></td>
            <td>
                <button class="btn-action-sm view-btn" onclick="openOwnerReceiptModal('${rc.receipt_id}')">View / Print</button>
            </td>
        </tr>
    `).join("");
}

async function openOwnerReceiptModal(receiptId) {
    const area = document.getElementById("printableReceiptArea");
    area.innerHTML = `<div class="text-center py-4 text-muted">Loading receipt data...</div>`;
    openOwnerModal("ownerReceiptModal");

    try {
        const response = await fetch(`${API_URL}/api/owner/receipts/${receiptId}`);
        const data = await response.json();
        const rc = data.receipt;

        area.innerHTML = `
            <div style="text-align:center; border-bottom:2px solid #2563eb; padding-bottom:14px; margin-bottom:16px;">
                <h2 style="color:#2563eb; margin:0; font-size:22px; font-weight:800;">NESTORA PG MANAGEMENT</h2>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">Official Rent Payment Receipt</div>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:16px;">
                <div>
                    <strong>Receipt No:</strong> ${rc.receipt_id}<br>
                    <strong>Txn ID:</strong> ${rc.transaction_id}
                </div>
                <div style="text-align:right;">
                    <strong>Date:</strong> ${new Date(rc.receipt_date).toLocaleDateString()}<br>
                    <strong>Status:</strong> <span class="badge-status success">${rc.payment_status || 'Paid'}</span>
                </div>
            </div>

            <div style="background:#f8fafc; border-radius:10px; padding:12px 14px; font-size:13px; margin-bottom:16px; line-height:1.7;">
                <div><strong>Received From:</strong> ${rc.tenant_name} (${rc.tenant_user_id || 'NEST'})</div>
                <div><strong>Phone:</strong> ${rc.tenant_phone || '-'} | <strong>Email:</strong> ${rc.tenant_email || '-'}</div>
                <div><strong>Property:</strong> ${rc.pg_name} — ${rc.pg_address || ''}</div>
                <div><strong>Allocated Accommodation:</strong> Room ${rc.room_number || '-'} ${rc.bed_number ? '(' + rc.bed_number + ')' : ''}</div>
            </div>

            <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin-bottom:16px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <tr style="background:#f1f5f9; text-align:left;">
                        <th style="padding:10px 12px; border-bottom:1px solid #cbd5e1;">Description</th>
                        <th style="padding:10px 12px; border-bottom:1px solid #cbd5e1;">Period</th>
                        <th style="padding:10px 12px; border-bottom:1px solid #cbd5e1; text-align:right;">Amount (₹)</th>
                    </tr>
                    <tr>
                        <td style="padding:10px 12px;">${rc.payment_for || 'Accommodation Rent'}</td>
                        <td style="padding:10px 12px;">${rc.payment_month || '-'}</td>
                        <td style="padding:10px 12px; text-align:right; font-weight:700;">₹${rc.amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
                        <td colspan="2" style="padding:10px 12px;">TOTAL PAID (Via ${rc.payment_method || 'Online'})</td>
                        <td style="padding:10px 12px; text-align:right; color:#1e3a8a; font-size:15px;">₹${rc.amount.toLocaleString('en-IN')}</td>
                    </tr>
                </table>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:12px; color:#64748b; margin-top:20px; padding-top:10px; border-top:1px dashed #cbd5e1;">
                <div>This is an authentic computer generated receipt.</div>
                <div style="text-align:right;">
                    <strong>Authorized Signature</strong><br>
                    Nestora Property Management
                </div>
            </div>
        `;
    } catch (e) {
        console.error("Receipt detail error:", e);
        area.innerHTML = `<div class="text-danger text-center">Failed to load receipt details.</div>`;
    }
}

function printOwnerReceipt() {
    window.print();
}

// -------------------------------------------------------------
// 9. NOTICES & ANNOUNCEMENTS
// -------------------------------------------------------------
async function loadOwnerNotices() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const container = document.getElementById("ownerNoticesListContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/notices`);
        const data = await response.json();
        ownerNoticesCache = data.notices || [];
        renderOwnerNotices(ownerNoticesCache);
    } catch (e) {
        console.error("Load notices error:", e);
        container.innerHTML = `<div class="empty-state"><div class="big-icon">⚠️</div><h2>Failed to load notices</h2><p>Error connecting to backend.</p></div>`;
    }
}

function renderOwnerNotices(notices) {
    const container = document.getElementById("ownerNoticesListContainer");
    if (!container) return;

    if (notices.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">📢</div>
                <h2>No Notices Published Yet</h2>
                <p>Broadcast maintenance announcements, rule updates or reminders to your tenants.</p>
                <button class="primary-dashboard-btn mt-3" onclick="openCreateNoticeModal()">📢 Post New Notice</button>
            </div>
        `;
        return;
    }

    container.innerHTML = notices.map(n => `
        <div class="notice-item-card ${(n.priority || 'Normal').toLowerCase()}">
            <div class="notice-top-row">
                <span class="notice-priority-badge ${(n.priority || 'Normal').toLowerCase()}">${n.priority || 'Normal'}</span>
                <span class="text-sm text-muted">${n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</span>
            </div>
            <div class="notice-title">${n.title}</div>
            <div class="text-sm" style="color:#2563eb; font-weight:600; margin-bottom:8px;">Property: ${n.pg_name}</div>
            <div class="notice-desc">${n.message}</div>
            <div class="notice-actions">
                <button class="btn-action-sm reject-btn" onclick="deleteOwnerNotice(${n.id})">Delete Notice</button>
            </div>
        </div>
    `).join("");
}

function openCreateNoticeModal() {
    document.getElementById("ownerNoticeForm").reset();
    document.getElementById("modalNoticeId").value = "";
    document.getElementById("ownerNoticeModalTitle").textContent = "Post Notice to PG Tenants";
    openOwnerModal("ownerNoticeModal");
}

async function submitSaveNotice(event) {
    event.preventDefault();
    const owner = getLoggedOwner();
    if (!owner) return;

    const payload = {
        owner_id: owner.id,
        pg_id: Number(document.getElementById("modalNoticePgId").value),
        title: document.getElementById("modalNoticeTitle").value.trim(),
        priority: document.getElementById("modalNoticePriority").value,
        message: document.getElementById("modalNoticeMessage").value.trim()
    };

    try {
        const response = await fetch(`${API_URL}/api/owner/notices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (response.ok) {
            alert(res.message || "Notice posted successfully!");
            closeOwnerModal("ownerNoticeModal");
            loadOwnerNotices();
        } else {
            alert(res.detail || "Error posting notice.");
        }
    } catch (e) {
        console.error("Save notice error:", e);
    }
}

async function deleteOwnerNotice(noticeId) {
    if (!confirm("Delete this notice? Tenants will no longer see it.")) return;
    try {
        const response = await fetch(`${API_URL}/api/owner/notices/${noticeId}`, { method: "DELETE" });
        if (response.ok) {
            loadOwnerNotices();
        }
    } catch (e) {
        console.error("Delete notice error:", e);
    }
}

// -------------------------------------------------------------
// 10. TENANT COMPLAINTS
// -------------------------------------------------------------
async function loadOwnerComplaints() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const tableBody = document.getElementById("ownerComplaintsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/complaints`);
        const data = await response.json();
        ownerComplaintsCache = data.complaints || [];
        renderOwnerComplaints(ownerComplaintsCache);
    } catch (e) {
        console.error("Load complaints error:", e);
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Failed to load complaints.</td></tr>`;
    }
}

function renderOwnerComplaints(complaints) {
    const tableBody = document.getElementById("ownerComplaintsTableBody");
    if (!tableBody) return;

    if (complaints.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No complaints filed for this filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = complaints.map(c => `
        <tr>
            <td><strong>#${c.complaint_id || c.id}</strong></td>
            <td>
                <strong>${c.tenant_name}</strong><br>
                <span class="text-muted text-sm">📞 ${c.tenant_phone || '-'}</span>
            </td>
            <td>${c.pg_name}</td>
            <td>Room ${c.room_number || '-'}</td>
            <td><strong>${c.subject || 'Complaint'}</strong></td>
            <td><div style="max-width:240px; font-size:13px; color:#475569;">${c.description}</div></td>
            <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
            <td><span class="badge-status ${c.status}">${c.status}</span></td>
            <td>
                <button class="btn-action-sm view-btn" onclick="openUpdateComplaintModal('${c.complaint_id || c.id}', '${c.status}')">Update Status</button>
            </td>
        </tr>
    `).join("");
}

function filterOwnerComplaints(status, btn) {
    if (btn) {
        document.querySelectorAll("#complaints .tab-chip").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
    }
    if (status === "all") {
        renderOwnerComplaints(ownerComplaintsCache);
    } else {
        const filtered = ownerComplaintsCache.filter(c => c.status === status);
        renderOwnerComplaints(filtered);
    }
}

function openUpdateComplaintModal(complaintId, currentStatus) {
    document.getElementById("modalComplaintId").value = complaintId;
    document.getElementById("modalComplaintRef").value = `#${complaintId}`;
    document.getElementById("modalComplaintStatus").value = currentStatus || "in_progress";
    openOwnerModal("ownerComplaintModal");
}

async function submitComplaintStatus(event) {
    event.preventDefault();
    const complaintId = document.getElementById("modalComplaintId").value;
    const newStatus = document.getElementById("modalComplaintStatus").value;

    try {
        const response = await fetch(`${API_URL}/api/owner/complaints/${complaintId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            closeOwnerModal("ownerComplaintModal");
            loadOwnerComplaints();
            loadOwnerDashboard();
        } else {
            const err = await response.json();
            alert(err.detail || "Error updating status.");
        }
    } catch (e) {
        console.error("Update complaint error:", e);
    }
}

// -------------------------------------------------------------
// 11. REVIEWS
// -------------------------------------------------------------
async function loadOwnerReviews() {
    const owner = getLoggedOwner();
    if (!owner) return;

    const container = document.getElementById("ownerReviewsListContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/reviews`);
        const data = await response.json();
        ownerReviewsCache = data.reviews || [];

        const avgScore = Number(data.average_rating || 0).toFixed(1);
        document.getElementById("ownerAvgRatingScore").textContent = avgScore;
        document.getElementById("ownerTotalReviewsCount").textContent = `Based on ${data.total_reviews || 0} verified reviews`;

        const fullStars = Math.round(Number(avgScore));
        let starsHtml = "";
        for (let i = 0; i < 5; i++) {
            starsHtml += i < fullStars ? "⭐" : "☆";
        }
        document.getElementById("ownerAvgStarsRow").textContent = starsHtml;

        if (ownerReviewsCache.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-icon">⭐</div>
                    <h2>No Reviews Received Yet</h2>
                    <p>Tenant reviews submitted after their stay will be showcased here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = ownerReviewsCache.map(r => `
            <div class="review-card-item">
                <div class="review-card-top">
                    <div>
                        <strong>${r.tenant_name}</strong>
                        <div class="text-sm text-muted">${r.pg_name}</div>
                    </div>
                    <div style="font-size:16px;">
                        ${"⭐".repeat(r.rating || 5)}
                    </div>
                </div>
                <div class="review-comment">"${r.review}"</div>
                <div class="text-sm text-muted" style="margin-top:10px;">${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
            </div>
        `).join("");
    } catch (e) {
        console.error("Load reviews error:", e);
    }
}

// -------------------------------------------------------------
// 12. OWNER PROFILE
// -------------------------------------------------------------
async function loadOwnerProfile() {
    const owner = getLoggedOwner();
    if (!owner) return;

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/profile`);
        const data = await response.json();
        const p = data.profile || {};

        document.getElementById("profileOwnerId").value = p.user_id || owner.user_id;
        document.getElementById("profileOwnerName").value = p.name || owner.name;
        document.getElementById("profileOwnerEmail").value = p.email || owner.email;
        document.getElementById("profileOwnerPhone").value = p.phone || owner.phone;
        document.getElementById("profileOwnerAddress").value = p.address || "";
    } catch (e) {
        console.error("Load profile error:", e);
    }
}

async function submitUpdateProfile(event) {
    event.preventDefault();
    const owner = getLoggedOwner();
    if (!owner) return;

    const payload = {
        name: document.getElementById("profileOwnerName").value.trim(),
        phone: document.getElementById("profileOwnerPhone").value.trim(),
        address: document.getElementById("profileOwnerAddress").value.trim()
    };

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (response.ok) {
            alert(res.message || "Profile updated successfully!");
            // Update local storage
            owner.name = payload.name;
            owner.phone = payload.phone;
            localStorage.setItem("nestora_user", JSON.stringify(owner));
            document.getElementById("ownerName").textContent = owner.name;
        } else {
            alert(res.detail || "Error updating profile.");
        }
    } catch (e) {
        console.error("Update profile error:", e);
    }
}

async function submitChangePassword(event) {
    event.preventDefault();
    const owner = getLoggedOwner();
    if (!owner) return;

    const oldPwd = document.getElementById("ownerOldPassword").value;
    const newPwd = document.getElementById("ownerNewPassword").value;
    const confirmPwd = document.getElementById("ownerConfirmPassword").value;
    const msgEl = document.getElementById("passwordChangeMsg");

    if (newPwd !== confirmPwd) {
        msgEl.textContent = "New passwords do not match.";
        msgEl.style.color = "red";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/owner/${owner.id}/change-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
        });
        const res = await response.json();
        if (response.ok) {
            msgEl.textContent = "Password changed successfully!";
            msgEl.style.color = "green";
            document.getElementById("ownerChangePasswordForm").reset();
        } else {
            msgEl.textContent = res.detail || "Failed to change password.";
            msgEl.style.color = "red";
        }
    } catch (e) {
        console.error("Change password error:", e);
        msgEl.textContent = "Error communicating with server.";
        msgEl.style.color = "red";
    }
}

// Auto start for owner.html
if (window.location.pathname.endsWith("owner.html")) {
    window.addEventListener("DOMContentLoaded", () => {
        const owner = getLoggedOwner();
        if (owner) {
            const nameEl = document.getElementById("ownerName");
            const idEl = document.getElementById("ownerId");
            if (nameEl) nameEl.textContent = owner.name || "Owner";
            if (idEl) idEl.textContent = owner.user_id || "OWN0000";

            initOwnerAccountSwitcher();
            loadOwnerDashboard();
            loadOwnerPGs();
            loadOwnerJoinRequests();
            checkCrossOwnerPendingRequests();
            startOwnerLivePoller();
        }
    });
}


// =============================================================================
// COMPLETE ADMIN PANEL CONTROLLER (Platform Governance, Lists & Reports)
// =============================================================================

let adminTenantsCache = [];
let adminOwnersCache = [];
let adminPgsCache = [];
let adminComplaintsCache = [];
let adminReportsCache = null;

// Admin Auth Form Handler (in admin-auth.html)
const adminLoginForm = document.getElementById("adminLoginForm");
if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const msgEl = document.getElementById("adminMessage");
        const userId = document.getElementById("adminLoginId").value.trim();
        const password = document.getElementById("adminLoginPassword").value;

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, password: password, role: "admin" })
            });
            const result = await response.json();

            if (!response.ok) {
                msgEl.textContent = result.detail || "Invalid Admin ID or Master Password.";
                msgEl.style.color = "red";
                return;
            }

            if (result.role !== "admin") {
                msgEl.textContent = "Access denied: This account does not have Administrative privileges.";
                msgEl.style.color = "red";
                return;
            }

            const user = {
                id: result.id,
                user_id: result.user_id,
                name: result.name,
                email: result.email,
                phone: result.phone,
                role: result.role
            };

            localStorage.setItem("nestora_user", JSON.stringify(user));
            localStorage.setItem("nestora_token", result.token);

            msgEl.textContent = "Authentication successful! Redirecting to Master Admin Panel...";
            msgEl.style.color = "green";

            setTimeout(() => {
                window.location.href = "admin.html";
            }, 700);

        } catch (error) {
            console.error("ADMIN LOGIN ERROR:", error);
            msgEl.textContent = "Backend server is not reachable.";
            msgEl.style.color = "red";
        }
    });
}

function getLoggedAdmin() {
    const userData = localStorage.getItem("nestora_user");
    if (!userData) {
        window.location.href = "admin-auth.html";
        return null;
    }
    try {
        const user = JSON.parse(userData);
        if (user.role !== "admin") {
            alert("Access restricted to Platform Administrators only.");
            window.location.href = "admin-auth.html";
            return null;
        }
        return user;
    } catch (e) {
        window.location.href = "admin-auth.html";
        return null;
    }
}

function logoutAdmin() {
    if (confirm("Are you sure you want to log out of the Admin Panel?")) {
        localStorage.removeItem("nestora_user");
        localStorage.removeItem("nestora_token");
        window.location.href = "admin-auth.html";
    }
}

// Admin Section Switching
window.showAdminSection = function(sectionId) {
    const sections = document.querySelectorAll(".dashboard-section");
    sections.forEach(s => s.classList.remove("active-section"));

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add("active-section");
    }

    const buttons = document.querySelectorAll(".sidebar-item");
    buttons.forEach(button => {
        button.classList.remove("active");
        if (button.getAttribute("onclick") && button.getAttribute("onclick").includes(sectionId)) {
            button.classList.add("active");
        }
    });

    if (sectionId === "admin-dashboard") loadAdminDashboard();
    if (sectionId === "admin-tenants") loadAdminTenants();
    if (sectionId === "admin-owners") loadAdminOwners();
    if (sectionId === "admin-reports") loadAdminReports();
    if (sectionId === "admin-pgs") loadAdminPgs();
    if (sectionId === "admin-complaints") loadAdminComplaints();
    if (sectionId === "admin-profile") loadAdminProfile();
};

// -------------------------------------------------------------
// 1. ADMIN DASHBOARD
// -------------------------------------------------------------
async function loadAdminDashboard() {
    const admin = getLoggedAdmin();
    if (!admin) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/dashboard`);
        if (!response.ok) return;
        const data = await response.json();
        const s = data.stats || {};

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val !== undefined ? val : 0;
        };

        setVal("adminStatTenants", s.total_tenants);
        setVal("adminStatOwners", s.total_owners);
        setVal("adminStatPgs", s.total_pgs);
        setVal("adminStatRooms", s.total_rooms);
        setVal("adminStatBeds", s.total_beds);
        setVal("adminStatOccupancyRate", `${s.occupancy_rate}%`);
        setVal("adminStatRevenue", `₹${(s.total_revenue || 0).toLocaleString('en-IN')}`);
        setVal("adminStatComplaints", s.open_complaints);

        // Recent Tenants
        const tTable = document.getElementById("adminRecentTenants");
        if (tTable) {
            const tenants = data.recent_tenants || [];
            tTable.innerHTML = tenants.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-muted">No tenants registered yet.</td></tr>` :
                tenants.map(t => `
                    <tr>
                        <td><strong>${t.name}</strong></td>
                        <td><span class="pg-id-pill">${t.user_id}</span></td>
                        <td>${t.phone || '-'}</td>
                        <td>${t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                    </tr>
                `).join("");
        }

        // Recent Owners
        const oTable = document.getElementById("adminRecentOwners");
        if (oTable) {
            const owners = data.recent_owners || [];
            oTable.innerHTML = owners.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-muted">No owners registered yet.</td></tr>` :
                owners.map(o => `
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td><span class="pg-id-pill">${o.user_id}</span></td>
                        <td><span class="pg-chip">${o.pgs_count || 0} PGs</span></td>
                        <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
                    </tr>
                `).join("");
        }

        // Recent Payments
        const pTable = document.getElementById("adminRecentPayments");
        if (pTable) {
            const pays = data.recent_payments || [];
            pTable.innerHTML = pays.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-muted">No payments recorded yet.</td></tr>` :
                pays.map(p => `
                    <tr>
                        <td><strong>${p.tenant_name}</strong></td>
                        <td>${p.pg_name}</td>
                        <td style="font-weight:700; color:#15803d;">₹${p.amount.toLocaleString('en-IN')}</td>
                        <td><span class="badge-status ${p.status}">${p.status}</span></td>
                    </tr>
                `).join("");
        }

        // Recent System Complaints / App Reports
        const cTable = document.getElementById("adminRecentComplaints");
        if (cTable) {
            const comps = data.recent_complaints || [];
            cTable.innerHTML = comps.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-muted">No app reports filed.</td></tr>` :
                comps.map(c => `
                    <tr>
                        <td><strong>${c.reporter_name}</strong> <span class="text-xs text-muted">(${c.user_code || ''})</span></td>
                        <td><span class="badge-role ${c.reporter_role}" style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:700; ${c.reporter_role === 'owner' ? 'background:#f3e8ff; color:#7e22ce;' : 'background:#e0f2fe; color:#0369a1;'}">${c.reporter_role === 'owner' ? '🏢 Owner' : '👤 Tenant'}</span></td>
                        <td>
                            <strong>${c.subject || '-'}</strong><br>
                            <span class="text-muted text-xs">${c.category || ''}</span>
                        </td>
                        <td><span class="badge-status ${c.status}">${c.status}</span></td>
                    </tr>
                `).join("");
        }

    } catch (e) {
        console.error("Admin dashboard error:", e);
    }
}

// -------------------------------------------------------------
// 2. ALL TENANTS LIST (ADMIN)
// -------------------------------------------------------------
async function loadAdminTenants() {
    const admin = getLoggedAdmin();
    if (!admin) return;

    const tableBody = document.getElementById("adminTenantsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/tenants`);
        const data = await response.json();
        adminTenantsCache = data.tenants || [];
        renderAdminTenants(adminTenantsCache);
    } catch (e) {
        console.error("Load admin tenants error:", e);
        tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-muted">Failed to load tenants.</td></tr>`;
    }
}

function renderAdminTenants(tenants) {
    const tableBody = document.getElementById("adminTenantsTableBody");
    if (!tableBody) return;

    if (tenants.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-muted">No tenants matching this query.</td></tr>`;
        return;
    }

    tableBody.innerHTML = tenants.map(t => `
        <tr>
            <td><span class="pg-id-pill">${t.tenant_code}</span></td>
            <td><code class="pwd-badge" title="Click to copy password" onclick="navigator.clipboard.writeText('${t.plain_password || 'kafiha@123'}'); showToast('Password copied!', 'success');">${t.plain_password || 'kafiha@123'}</code></td>
            <td><strong>${t.tenant_name}</strong></td>
            <td>${t.tenant_phone || '-'}</td>
            <td><span class="text-sm text-muted">${t.tenant_email || '-'}</span></td>
            <td>${t.pg_name || '<span class="text-muted">Not Allocated</span>'}</td>
            <td>${t.room_number ? 'Room ' + t.room_number + (t.bed_number ? ' / ' + t.bed_number : '') : '-'}</td>
            <td>${t.joined_at ? new Date(t.joined_at).toLocaleDateString() : (t.registered_at ? new Date(t.registered_at).toLocaleDateString() : '-')}</td>
            <td>${t.monthly_rent ? '₹' + t.monthly_rent.toLocaleString('en-IN') : '-'}</td>
            <td style="font-weight:700; color:#15803d;">₹${t.total_paid_amount.toLocaleString('en-IN')}</td>
            <td><span class="badge-status ${t.occupancy_status === 'approved' || t.occupancy_status === 'active' ? 'approved' : 'pending'}">${t.occupancy_status}</span></td>
            <td>
                <button class="btn-action-sm view-btn" onclick="viewAdminTenantDetails(${t.tenant_id})">View Dossier</button>
            </td>
        </tr>
    `).join("");
}

function filterAdminTenants() {
    const q = (document.getElementById("adminTenantSearch").value || "").toLowerCase().trim();
    const statusFilter = document.getElementById("adminTenantStatusFilter") ? document.getElementById("adminTenantStatusFilter").value : "all";

    let filtered = adminTenantsCache;
    if (statusFilter === "active") {
        filtered = filtered.filter(t => t.occupancy_status === "approved" || t.occupancy_status === "active");
    } else if (statusFilter === "registered") {
        filtered = filtered.filter(t => t.occupancy_status !== "approved" && t.occupancy_status !== "active");
    }

    if (q) {
        filtered = filtered.filter(t =>
            (t.tenant_name && t.tenant_name.toLowerCase().includes(q)) ||
            (t.tenant_code && t.tenant_code.toLowerCase().includes(q)) ||
            (t.plain_password && t.plain_password.toLowerCase().includes(q)) ||
            (t.tenant_phone && t.tenant_phone.includes(q)) ||
            (t.tenant_email && t.tenant_email.toLowerCase().includes(q)) ||
            (t.pg_name && t.pg_name.toLowerCase().includes(q))
        );
    }
    renderAdminTenants(filtered);
}

async function viewAdminTenantDetails(tenantId) {
    const modalContent = document.getElementById("adminTenantModalContent");
    modalContent.innerHTML = `<div class="text-center py-4 text-muted">Loading tenant dossier...</div>`;
    openOwnerModal("adminTenantModal");

    try {
        const response = await fetch(`${API_URL}/api/admin/tenants/${tenantId}`);
        const data = await response.json();
        const t = data.tenant || {};
        const alloc = data.allocation || {};
        const payments = data.payments || [];
        const comps = data.complaints || [];
        const bookings = data.bookings || [];

        modalContent.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0;">
                    <h3 style="margin-top:0; font-size:16px; color:#0f172a;">Personal Profile</h3>
                    <div style="font-size:13px; line-height:1.8; color:#334155;">
                        <div><strong>Tenant ID:</strong> <span class="pg-id-pill">${t.user_id}</span></div>
                        <div><strong>Password:</strong> <code class="pwd-badge" style="font-size:13px; cursor:pointer;" onclick="navigator.clipboard.writeText('${t.plain_password || 'kafiha@123'}'); showToast('Password copied!', 'success');" title="Click to copy">${t.plain_password || 'kafiha@123'}</code></div>
                        <div><strong>Full Name:</strong> ${t.name}</div>
                        <div><strong>Phone:</strong> ${t.phone || '-'} | <strong>Email:</strong> ${t.email || '-'}</div>
                        <div><strong>Gender / Age:</strong> ${t.gender || '-'} / ${t.age || '-'}</div>
                        <div><strong>Address:</strong> ${t.address || '-'}</div>
                        <div><strong>Registered On:</strong> ${new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                </div>

                <div style="background:#eff6ff; padding:16px; border-radius:12px; border:1px solid #bfdbfe;">
                    <h3 style="margin-top:0; font-size:16px; color:#1e3a8a;">Current PG Stay</h3>
                    <div style="font-size:13px; line-height:1.8; color:#1e40af;">
                        <div><strong>Property:</strong> ${alloc.pg_name || 'No Active Allocation'} ${alloc.pg_code ? '('+alloc.pg_code+')' : ''}</div>
                        <div><strong>Location:</strong> ${alloc.pg_address || '-'}</div>
                        <div><strong>Owner Contact:</strong> ${alloc.owner_name || '-'} (${alloc.owner_phone || '-'})</div>
                        <div><strong>Room / Bed:</strong> Room ${alloc.room_number || '-'} ${alloc.bed_number ? '/ ' + alloc.bed_number : ''}</div>
                        <div><strong>Rent:</strong> ₹${alloc.monthly_rent ? alloc.monthly_rent.toLocaleString('en-IN') : '0'}/mo</div>
                    </div>
                </div>
            </div>

            <h3 style="font-size:15px; margin-bottom:8px; color:#0f172a;">Payment Records (${payments.length} Transactions)</h3>
            <div class="data-table-container" style="margin-bottom:20px; max-height:220px; overflow-y:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Txn ID</th>
                            <th>Property</th>
                            <th>Purpose / Month</th>
                            <th>Method</th>
                            <th>Amount (₹)</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.length === 0 ? `<tr><td colspan="6" class="text-center py-2 text-muted">No transactions on record.</td></tr>` :
                          payments.map(p => `
                            <tr>
                                <td>${p.transaction_id}</td>
                                <td>${p.pg_name}</td>
                                <td>${p.payment_month || p.payment_for}</td>
                                <td><span class="pg-chip">${p.payment_method || 'UPI'}</span></td>
                                <td style="font-weight:700;">₹${p.amount.toLocaleString('en-IN')}</td>
                                <td><span class="badge-status ${p.status}">${p.status}</span></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>

            <h3 style="font-size:15px; margin-bottom:8px; color:#0f172a;">Complaints Filed (${comps.length})</h3>
            <div class="data-table-container" style="max-height:180px; overflow-y:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Property</th>
                            <th>Subject</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${comps.length === 0 ? `<tr><td colspan="5" class="text-center py-2 text-muted">No complaints filed.</td></tr>` :
                          comps.map(c => `
                            <tr>
                                <td>#${c.complaint_id || c.id}</td>
                                <td>${c.pg_name}</td>
                                <td>${c.subject || c.description}</td>
                                <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                                <td><span class="badge-status ${c.status}">${c.status}</span></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        console.error("View tenant dossier error:", e);
        modalContent.innerHTML = `<div class="text-danger text-center">Failed to load tenant details.</div>`;
    }
}

// -------------------------------------------------------------
// 3. ALL OWNERS LIST (ADMIN)
// -------------------------------------------------------------
async function loadAdminOwners() {
    const admin = getLoggedAdmin();
    if (!admin) return;

    const tableBody = document.getElementById("adminOwnersTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/owners`);
        const data = await response.json();
        adminOwnersCache = data.owners || [];
        renderAdminOwners(adminOwnersCache);
    } catch (e) {
        console.error("Load admin owners error:", e);
        tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-muted">Failed to load owners.</td></tr>`;
    }
}

function renderAdminOwners(owners) {
    const tableBody = document.getElementById("adminOwnersTableBody");
    if (!tableBody) return;

    if (owners.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-muted">No owners registered yet.</td></tr>`;
        return;
    }

    tableBody.innerHTML = owners.map(o => `
        <tr>
            <td><span class="pg-id-pill">${o.owner_code}</span></td>
            <td><code class="pwd-badge" title="Click to copy password" onclick="navigator.clipboard.writeText('${o.plain_password || 'kafiha@123'}'); showToast('Password copied!', 'success');">${o.plain_password || 'kafiha@123'}</code></td>
            <td><strong>${o.owner_name}</strong></td>
            <td>${o.owner_phone || '-'}</td>
            <td><span class="text-sm text-muted">${o.owner_email || '-'}</span></td>
            <td>
                <span class="pg-chip" style="font-weight:700;">${o.total_pgs} Properties</span><br>
                <span class="text-muted text-sm">${(o.pg_names || []).slice(0, 2).join(", ")}${(o.pg_names || []).length > 2 ? '...' : ''}</span>
            </td>
            <td>${o.total_rooms}</td>
            <td><strong>${o.total_beds}</strong></td>
            <td><span style="color:#2563eb; font-weight:700;">${o.active_tenants}</span></td>
            <td style="font-weight:700; color:#15803d;">₹${o.total_revenue.toLocaleString('en-IN')}</td>
            <td>${o.registered_at ? new Date(o.registered_at).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn-action-sm view-btn" onclick="viewAdminOwnerDetails(${o.owner_id})">View Dossier</button>
            </td>
        </tr>
    `).join("");
}

function filterAdminOwners() {
    const q = (document.getElementById("adminOwnerSearch").value || "").toLowerCase().trim();
    if (!q) {
        renderAdminOwners(adminOwnersCache);
        return;
    }
    const filtered = adminOwnersCache.filter(o =>
        (o.owner_name && o.owner_name.toLowerCase().includes(q)) ||
        (o.owner_code && o.owner_code.toLowerCase().includes(q)) ||
        (o.plain_password && o.plain_password.toLowerCase().includes(q)) ||
        (o.owner_phone && o.owner_phone.includes(q)) ||
        (o.owner_email && o.owner_email.toLowerCase().includes(q)) ||
        ((o.pg_names || []).some(n => n.toLowerCase().includes(q)))
    );
    renderAdminOwners(filtered);
}

async function viewAdminOwnerDetails(ownerId) {
    const modalContent = document.getElementById("adminOwnerModalContent");
    modalContent.innerHTML = `<div class="text-center py-4 text-muted">Loading owner dossier...</div>`;
    openOwnerModal("adminOwnerModal");

    try {
        const response = await fetch(`${API_URL}/api/admin/owners/${ownerId}`);
        const data = await response.json();
        const o = data.owner || {};
        const pgs = data.pgs || [];
        const tenants = data.tenants || [];
        const rev = data.total_revenue || 0;

        modalContent.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0;">
                    <h3 style="margin-top:0; font-size:16px; color:#0f172a;">Owner Profile</h3>
                    <div style="font-size:13px; line-height:1.8; color:#334155;">
                        <div><strong>Owner ID:</strong> <span class="pg-id-pill">${o.user_id}</span></div>
                        <div><strong>Password:</strong> <code class="pwd-badge" style="font-size:13px; cursor:pointer;" onclick="navigator.clipboard.writeText('${o.plain_password || 'kafiha@123'}'); showToast('Password copied!', 'success');" title="Click to copy">${o.plain_password || 'kafiha@123'}</code></div>
                        <div><strong>Owner Name:</strong> ${o.name}</div>
                        <div><strong>Phone:</strong> ${o.phone || '-'} | <strong>Email:</strong> ${o.email || '-'}</div>
                        <div><strong>Address:</strong> ${o.address || '-'}</div>
                        <div><strong>Member Since:</strong> ${new Date(o.created_at).toLocaleDateString()}</div>
                    </div>
                </div>

                <div style="background:#f0fdf4; padding:16px; border-radius:12px; border:1px solid #bbf7d0;">
                    <h3 style="margin-top:0; font-size:16px; color:#166534;">Portfolio & Financials</h3>
                    <div style="font-size:13px; line-height:1.8; color:#166534;">
                        <div><strong>Total Properties:</strong> ${pgs.length} PGs</div>
                        <div><strong>Active Tenants:</strong> ${tenants.length} Residents</div>
                        <div><strong>Lifetime Revenue:</strong> <strong style="font-size:17px; color:#15803d;">₹${rev.toLocaleString('en-IN')}</strong></div>
                    </div>
                </div>
            </div>

            <h3 style="font-size:15px; margin-bottom:8px; color:#0f172a;">Managed Properties (${pgs.length})</h3>
            <div class="data-table-container" style="margin-bottom:20px; max-height:220px; overflow-y:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Property Name</th>
                            <th>City</th>
                            <th>Rooms</th>
                            <th>Beds</th>
                            <th>Occupied</th>
                            <th>Rent / Mo</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pgs.length === 0 ? `<tr><td colspan="8" class="text-center py-2 text-muted">No properties registered.</td></tr>` :
                          pgs.map(p => `
                            <tr>
                                <td><span class="pg-id-pill">${p.pg_id}</span></td>
                                <td><strong>${p.pg_name}</strong></td>
                                <td>${p.city}</td>
                                <td>${p.rooms_count}</td>
                                <td>${p.beds_count}</td>
                                <td><strong style="color:#16a34a;">${p.occupied_beds}</strong> / ${p.beds_count}</td>
                                <td>₹${p.monthly_rent.toLocaleString('en-IN')}</td>
                                <td><span class="badge-status ${p.status}">${p.status}</span></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>

            <h3 style="font-size:15px; margin-bottom:8px; color:#0f172a;">Active Tenants in Owner's Properties (${tenants.length})</h3>
            <div class="data-table-container" style="max-height:180px; overflow-y:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tenant Code</th>
                            <th>Tenant Name</th>
                            <th>Contact</th>
                            <th>Property</th>
                            <th>Room / Bed</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tenants.length === 0 ? `<tr><td colspan="5" class="text-center py-2 text-muted">No active residents in these properties.</td></tr>` :
                          tenants.map(t => `
                            <tr>
                                <td>${t.tenant_code}</td>
                                <td><strong>${t.tenant_name}</strong></td>
                                <td>${t.tenant_phone || '-'}</td>
                                <td>${t.pg_name}</td>
                                <td>Room ${t.room_number || '-'} ${t.bed_number ? '/ ' + t.bed_number : ''}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        console.error("View owner dossier error:", e);
        modalContent.innerHTML = `<div class="text-danger text-center">Failed to load owner details.</div>`;
    }
}

// -------------------------------------------------------------
// 4. REPORTS & ANALYTICS (ADMIN)
// -------------------------------------------------------------
async function loadAdminReports() {
    const admin = getLoggedAdmin();
    if (!admin) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/reports`);
        const data = await response.json();
        adminReportsCache = data;

        const timeEl = document.getElementById("reportGenTime");
        if (timeEl) timeEl.textContent = `Generated: ${data.generated_at}`;

        // Financial
        const fin = data.financial || {};
        document.getElementById("repTotalRev").textContent = `₹${(fin.total_revenue || 0).toLocaleString('en-IN')}`;
        document.getElementById("repThisMonthRev").textContent = `₹${(fin.this_month_revenue || 0).toLocaleString('en-IN')}`;
        document.getElementById("repLastMonthRev").textContent = `₹${(fin.last_month_revenue || 0).toLocaleString('en-IN')}`;

        // Payment Method breakdown
        const mTable = document.getElementById("repMethodTable");
        if (mTable) {
            const methods = fin.method_breakdown || [];
            mTable.innerHTML = methods.length === 0 ? `<tr><td colspan="3" class="text-center py-2 text-muted">No transaction breakdown.</td></tr>` :
                methods.map(m => `
                    <tr>
                        <td><strong>${m.payment_method || 'Online'}</strong></td>
                        <td>${m.count} payments</td>
                        <td style="font-weight:700; color:#15803d;">₹${m.total.toLocaleString('en-IN')}</td>
                    </tr>
                `).join("");
        }

        // PG Revenue Ranking
        const rTable = document.getElementById("repPgRankTable");
        if (rTable) {
            const ranks = fin.pg_ranking || [];
            rTable.innerHTML = ranks.length === 0 ? `<tr><td colspan="3" class="text-center py-2 text-muted">No property collections.</td></tr>` :
                ranks.map((r, idx) => `
                    <tr>
                        <td><strong>#${idx + 1} ${r.pg_name}</strong></td>
                        <td>${r.owner_name}</td>
                        <td style="font-weight:700; color:#1e3a8a;">₹${r.total_collected.toLocaleString('en-IN')}</td>
                    </tr>
                `).join("");
        }

        // Occupancy
        const occ = data.occupancy || {};
        document.getElementById("repTotalBeds").textContent = occ.total_beds || 0;
        document.getElementById("repOccupiedBeds").textContent = occ.total_occupied || 0;
        document.getElementById("repAvailableBeds").textContent = occ.total_available || 0;
        document.getElementById("repOccRate").textContent = `${occ.occupancy_rate || 0}%`;

        // Occupancy Table
        const occTable = document.getElementById("repOccPgTable");
        if (occTable) {
            const pgs = occ.pg_breakdown || [];
            occTable.innerHTML = pgs.length === 0 ? `<tr><td colspan="8" class="text-center py-4 text-muted">No properties found.</td></tr>` :
                pgs.map(p => {
                    const pct = p.occupancy_percent || 0;
                    const fillClass = pct >= 80 ? 'green' : (pct >= 40 ? 'amber' : 'red');
                    return `
                        <tr>
                            <td><span class="pg-id-pill">${p.pg_id}</span></td>
                            <td><strong>${p.pg_name}</strong></td>
                            <td>${p.owner_name}</td>
                            <td>${p.total_rooms}</td>
                            <td>${p.total_beds}</td>
                            <td><strong style="color:#16a34a;">${p.occupied_beds}</strong></td>
                            <td>${p.available_beds}</td>
                            <td style="min-width:140px;">
                                <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700;">
                                    <span>${pct}%</span>
                                </div>
                                <div class="admin-progress-bar">
                                    <div class="admin-progress-fill ${fillClass}" style="width: ${pct}%;"></div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join("");
        }

        // Complaints
        const comp = data.complaints || {};
        document.getElementById("repTotalComps").textContent = comp.total_complaints || 0;
        document.getElementById("repSubComps").textContent = comp.submitted_count || 0;
        document.getElementById("repInProgComps").textContent = comp.in_progress_count || 0;
        document.getElementById("repResRate").textContent = `${comp.resolution_rate || 0}%`;

    } catch (e) {
        console.error("Load admin reports error:", e);
    }
}

function openAdminPrintReportModal() {
    if (!adminReportsCache) {
        loadAdminReports();
    }
    const data = adminReportsCache || {};
    const fin = data.financial || {};
    const occ = data.occupancy || {};
    const comp = data.complaints || {};
    const growth = data.growth || {};

    const area = document.getElementById("printableAdminReportArea");
    area.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #dc2626; padding-bottom:14px; margin-bottom:20px;">
            <h1 style="color:#dc2626; margin:0; font-size:24px; font-weight:900;">NESTORA PG MANAGEMENT PLATFORM</h1>
            <div style="font-size:13px; color:#475569; margin-top:4px;">Official Master Governance & Operations Report</div>
            <div style="font-size:11px; color:#94a3b8;">Generated on ${data.generated_at || new Date().toLocaleString()} by System Administrator</div>
        </div>

        <h3 style="color:#0f172a; font-size:16px; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">1. Executive Summary</h3>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:20px;">
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1;">
                <div style="font-size:11px; color:#64748b; font-weight:700;">TOTAL REVENUE</div>
                <div style="font-size:18px; font-weight:800; color:#15803d;">₹${(fin.total_revenue || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1;">
                <div style="font-size:11px; color:#64748b; font-weight:700;">REGISTERED TENANTS</div>
                <div style="font-size:18px; font-weight:800; color:#0f172a;">${growth.total_tenants || 0}</div>
            </div>
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1;">
                <div style="font-size:11px; color:#64748b; font-weight:700;">PROPERTIES (PGs)</div>
                <div style="font-size:18px; font-weight:800; color:#0f172a;">${growth.total_pgs || 0}</div>
            </div>
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1;">
                <div style="font-size:11px; color:#64748b; font-weight:700;">OCCUPANCY RATE</div>
                <div style="font-size:18px; font-weight:800; color:#ea580c;">${occ.occupancy_rate || 0}%</div>
            </div>
        </div>

        <h3 style="color:#0f172a; font-size:16px; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">2. Capacity & Occupancy Breakdown</h3>
        <div style="margin-bottom:20px;">
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background:#f1f5f9; text-align:left;">
                        <th style="padding:8px; border:1px solid #cbd5e1;">Property Name</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Owner</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Rooms</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Total Beds</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Occupied</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Available</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Occupancy %</th>
                    </tr>
                </thead>
                <tbody>
                    ${(occ.pg_breakdown || []).map(p => `
                        <tr>
                            <td style="padding:8px; border:1px solid #cbd5e1;"><strong>${p.pg_name}</strong> (${p.pg_id})</td>
                            <td style="padding:8px; border:1px solid #cbd5e1;">${p.owner_name}</td>
                            <td style="padding:8px; border:1px solid #cbd5e1;">${p.total_rooms}</td>
                            <td style="padding:8px; border:1px solid #cbd5e1;">${p.total_beds}</td>
                            <td style="padding:8px; border:1px solid #cbd5e1; font-weight:700; color:#16a34a;">${p.occupied_beds}</td>
                            <td style="padding:8px; border:1px solid #cbd5e1;">${p.available_beds}</td>
                            <td style="padding:8px; border:1px solid #cbd5e1; font-weight:700;">${p.occupancy_percent}%</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>

        <h3 style="color:#0f172a; font-size:16px; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">3. Service Grievance & Maintenance Health</h3>
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:20px; background:#f8fafc; padding:12px; border-radius:8px;">
            <div><strong>Total Issues Filed:</strong> ${comp.total_complaints || 0}</div>
            <div><strong>Under Investigation / Open:</strong> ${(comp.submitted_count || 0) + (comp.in_progress_count || 0)}</div>
            <div><strong>Resolved:</strong> ${comp.resolved_count || 0}</div>
            <div><strong>Resolution Health:</strong> <span style="color:#16a34a; font-weight:700;">${comp.resolution_rate || 0}%</span></div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:11px; color:#64748b; margin-top:30px; padding-top:14px; border-top:1px dashed #cbd5e1;">
            <div>Confidential & Proprietary to Nestora Platform Operations.</div>
            <div style="text-align:right;">
                <strong>System Administrator</strong><br>
                Nestora Central Governance
            </div>
        </div>
    `;
    openOwnerModal("adminPrintReportModal");
}

// -------------------------------------------------------------
// 5. ALL PROPERTIES (ADMIN)
// -------------------------------------------------------------
async function loadAdminPgs() {
    const admin = getLoggedAdmin();
    if (!admin) return;

    const tableBody = document.getElementById("adminPgsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/pgs`);
        const data = await response.json();
        adminPgsCache = data.pgs || [];
        renderAdminPgs(adminPgsCache);
    } catch (e) {
        console.error("Load admin PGs error:", e);
        tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">Failed to load properties.</td></tr>`;
    }
}

function renderAdminPgs(pgs) {
    const tableBody = document.getElementById("adminPgsTableBody");
    if (!tableBody) return;

    if (pgs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-muted">No properties found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = pgs.map(p => `
        <tr>
            <td><span class="pg-id-pill">${p.pg_id}</span></td>
            <td><strong>${p.pg_name}</strong></td>
            <td>
                <strong>${p.owner_name}</strong><br>
                <span class="text-muted text-sm">📞 ${p.owner_phone || '-'}</span>
            </td>
            <td>${p.city}</td>
            <td><span class="pg-chip">${p.pg_type}</span></td>
            <td><strong>₹${p.monthly_rent.toLocaleString('en-IN')}</strong></td>
            <td>${p.total_rooms}</td>
            <td><strong>${p.total_beds}</strong> (${p.occupied_beds} Occ)</td>
            <td>${p.occupancy_percent}%</td>
            <td><span class="badge-status ${p.status}">${p.status}</span></td>
            <td>
                <button class="btn-action-sm view-btn" onclick="openAdminPgStatusModal('${p.pg_id}', '${p.pg_name}', '${p.status}')">Manage</button>
            </td>
        </tr>
    `).join("");
}

function filterAdminPgs() {
    const q = (document.getElementById("adminPgSearch").value || "").toLowerCase().trim();
    const st = document.getElementById("adminPgStatusFilter") ? document.getElementById("adminPgStatusFilter").value : "all";

    let filtered = adminPgsCache;
    if (st !== "all") {
        filtered = filtered.filter(p => p.status === st);
    }
    if (q) {
        filtered = filtered.filter(p =>
            (p.pg_name && p.pg_name.toLowerCase().includes(q)) ||
            (p.pg_id && p.pg_id.toLowerCase().includes(q)) ||
            (p.owner_name && p.owner_name.toLowerCase().includes(q)) ||
            (p.city && p.city.toLowerCase().includes(q))
        );
    }
    renderAdminPgs(filtered);
}

function openAdminPgStatusModal(pgId, pgName, currentStatus) {
    document.getElementById("modalAdminPgId").value = pgId;
    document.getElementById("modalAdminPgName").value = `${pgName} (${pgId})`;
    document.getElementById("modalAdminPgStatusSelect").value = currentStatus || "approved";
    openOwnerModal("adminPgStatusModal");
}

async function submitAdminPgStatus(event) {
    event.preventDefault();
    const pgId = document.getElementById("modalAdminPgId").value;
    const newStatus = document.getElementById("modalAdminPgStatusSelect").value;

    try {
        const response = await fetch(`${API_URL}/api/admin/pgs/${pgId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            closeOwnerModal("adminPgStatusModal");
            loadAdminPgs();
            loadAdminDashboard();
        }
    } catch (e) {
        console.error("Update PG status error:", e);
    }
}

// -------------------------------------------------------------
// 6. ALL SYSTEM COMPLAINTS (ADMIN)
// -------------------------------------------------------------
async function loadAdminComplaints() {
    const admin = getLoggedAdmin();
    if (!admin) return;

    const tableBody = document.getElementById("adminComplaintsTableBody");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/complaints`);
        const data = await response.json();
        adminComplaintsCache = data.complaints || [];
        renderAdminComplaints(adminComplaintsCache);
    } catch (e) {
        console.error("Load admin complaints error:", e);
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">Failed to load complaints.</td></tr>`;
    }
}

function renderAdminComplaints(complaints) {
    const tableBody = document.getElementById("adminComplaintsTableBody");
    if (!tableBody) return;

    if (complaints.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No system complaints or app reports filed.</td></tr>`;
        return;
    }

    tableBody.innerHTML = complaints.map(c => {
        const isOwner = c.reporter_role === "owner";
        const roleBadge = isOwner
            ? `<span class="badge-role owner" style="background:#f3e8ff; color:#7e22ce; border:1px solid #d8b4fe; padding:3px 8px; border-radius:6px; font-weight:700; font-size:11px;">🏢 Owner</span>`
            : `<span class="badge-role tenant" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:3px 8px; border-radius:6px; font-weight:700; font-size:11px;">👤 Tenant</span>`;

        const descClean = (c.description || '').replace(/"/g, '&quot;');
        const notesClean = (c.admin_notes || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `
            <tr>
                <td><span class="pg-id-pill">${c.complaint_id || 'APP' + c.id}</span></td>
                <td>
                    <strong>${c.reporter_name}</strong><br>
                    <span class="text-xs text-muted">ID: ${c.user_code || '-'}</span>
                </td>
                <td>${roleBadge}</td>
                <td>
                    <span style="font-size:12px;">${c.reporter_phone || '-'}</span><br>
                    <span class="text-sm text-muted">${c.reporter_email || '-'}</span>
                </td>
                <td><span class="pg-chip" style="font-size:11px;">${c.category || 'General'}</span></td>
                <td>
                    <strong>${c.subject || 'App Issue'}</strong><br>
                    <span class="text-muted text-sm" title="${descClean}">
                        ${c.description ? (c.description.length > 45 ? c.description.slice(0, 45) + '...' : c.description) : ''}
                    </span>
                </td>
                <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                <td><span class="badge-status ${c.status}">${c.status}</span></td>
                <td>
                    <span style="font-size:12px; color:#475569;">${c.admin_notes || '<em class="text-muted">No notes</em>'}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-action-sm view-btn" onclick="openAdminComplaintStatusModal('${c.complaint_id || c.id}', '${c.status}', '${notesClean}')">Resolve</button>
                        <button class="btn-action-sm delete-btn" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;" onclick="deleteAdminComplaint('${c.complaint_id || c.id}')" title="Delete complaint">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function openAdminComplaintStatusModal(complaintId, currentStatus, currentNotes) {
    document.getElementById("modalAdminComplaintId").value = complaintId;
    document.getElementById("modalAdminComplaintRef").value = `#${complaintId}`;
    document.getElementById("modalAdminComplaintSelect").value = currentStatus || "in_progress";
    if (document.getElementById("modalAdminComplaintNotes")) {
        document.getElementById("modalAdminComplaintNotes").value = currentNotes || "";
    }
    openOwnerModal("adminComplaintStatusModal");
}

async function submitAdminComplaintStatus(event) {
    event.preventDefault();
    const complaintId = document.getElementById("modalAdminComplaintId").value;
    const newStatus = document.getElementById("modalAdminComplaintSelect").value;
    const notes = document.getElementById("modalAdminComplaintNotes") ? document.getElementById("modalAdminComplaintNotes").value.trim() : "";

    try {
        const response = await fetch(`${API_URL}/api/admin/complaints/${complaintId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus, admin_notes: notes })
        });
        if (response.ok) {
            closeOwnerModal("adminComplaintStatusModal");
            loadAdminComplaints();
            loadAdminDashboard();
            if (typeof showToast === "function") showToast("System complaint updated successfully!", "success");
        }
    } catch (e) {
        console.error("Update admin complaint error:", e);
    }
}

async function deleteAdminComplaint(complaintId) {
    if (!confirm(`Are you sure you want to permanently delete system complaint #${complaintId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/complaints/${complaintId}`, {
            method: "DELETE"
        });
        const data = await response.json();
        if (response.ok) {
            if (typeof showToast === "function") {
                showToast("System complaint deleted successfully!", "success");
            } else {
                alert("System complaint deleted successfully!");
            }
            loadAdminComplaints();
            loadAdminDashboard();
        } else {
            alert(data.detail || "Failed to delete complaint.");
        }
    } catch (e) {
        console.error("Delete admin complaint error:", e);
        alert("Server communication error while deleting complaint.");
    }
}

function deleteAdminComplaintFromModal() {
    const complaintId = document.getElementById("modalAdminComplaintId").value;
    if (complaintId) {
        closeOwnerModal("adminComplaintStatusModal");
        deleteAdminComplaint(complaintId);
    }
}

// -------------------------------------------------------------
// 7. ADMIN PROFILE & MASTER PASSWORD
// -------------------------------------------------------------
async function loadAdminProfile() {
    const admin = getLoggedAdmin();
    if (!admin) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/profile?admin_identifier=${admin.id}`);
        const data = await response.json();
        const p = data.profile || {};

        document.getElementById("profAdminId").value = p.user_id || admin.user_id;
        document.getElementById("profAdminName").value = p.name || admin.name;
        document.getElementById("profAdminEmail").value = p.email || admin.email;
        document.getElementById("profAdminPhone").value = p.phone || admin.phone;
    } catch (e) {
        console.error("Load admin profile error:", e);
    }
}

async function submitUpdateAdminProfile(event) {
    event.preventDefault();
    const admin = getLoggedAdmin();
    if (!admin) return;

    const payload = {
        admin_id: admin.id,
        name: document.getElementById("profAdminName").value.trim(),
        phone: document.getElementById("profAdminPhone").value.trim()
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if (response.ok) {
            alert(res.message || "Admin profile updated!");
            admin.name = payload.name;
            admin.phone = payload.phone;
            localStorage.setItem("nestora_user", JSON.stringify(admin));
            document.getElementById("adminName").textContent = admin.name;
        } else {
            alert(res.detail || "Error updating profile.");
        }
    } catch (e) {
        console.error("Update admin profile error:", e);
    }
}

async function submitChangeAdminPassword(event) {
    event.preventDefault();
    const admin = getLoggedAdmin();
    if (!admin) return;

    const oldPwd = document.getElementById("adminOldPwd").value;
    const newPwd = document.getElementById("adminNewPwd").value;
    const confirmPwd = document.getElementById("adminConfirmPwd").value;
    const msgEl = document.getElementById("adminPwdChangeMsg");

    if (newPwd !== confirmPwd) {
        msgEl.textContent = "New passwords do not match.";
        msgEl.style.color = "red";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/change-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_id: admin.id, old_password: oldPwd, new_password: newPwd })
        });
        const res = await response.json();
        if (response.ok) {
            msgEl.textContent = "Master password updated successfully!";
            msgEl.style.color = "green";
            document.getElementById("adminOldPwd").value = "";
            document.getElementById("adminNewPwd").value = "";
            document.getElementById("adminConfirmPwd").value = "";
        } else {
            msgEl.textContent = res.detail || "Failed to update master password.";
            msgEl.style.color = "red";
        }
    } catch (e) {
        console.error("Change admin password error:", e);
        msgEl.textContent = "Server communication error.";
        msgEl.style.color = "red";
    }
}

// Auto start for admin.html
if (window.location.pathname.endsWith("admin.html")) {
    window.addEventListener("DOMContentLoaded", () => {
        const admin = getLoggedAdmin();
        if (admin) {
            const nameEl = document.getElementById("adminName");
            const idEl = document.getElementById("adminId");
            if (nameEl) nameEl.textContent = admin.name || "Administrator";
            if (idEl) idEl.textContent = admin.user_id || "ADM1001";

            loadAdminDashboard();
        }
    });
}


// =============================================================================
// APP ISSUE & FEEDBACK REPORTING (Tenants & Owners -> Admin System Complaints)
// =============================================================================

// 1. TENANT APP REPORTS
async function loadTenantAppReports() {
    const container = document.getElementById("tenantAppReportsListContainer");
    if (!container) return;

    const user = getLoggedTenant();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/app-reports/user/${user.id || user.user_id}`);
        const data = await response.json();
        const reports = data.reports || [];

        if (reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-icon">🛠️</div>
                    <h2>No App Reports Yet</h2>
                    <p>If you encounter any app bugs or glitches, report them here and track admin resolution.</p>
                </div>
            `;
            return;
        }

        let html = "";
        reports.forEach(r => {
            const statusColor = r.status === "resolved" ? "#16a34a" : (r.status === "in_progress" ? "#2563eb" : (r.status === "closed" ? "#64748b" : "#d97706"));
            const statusBg = r.status === "resolved" ? "#f0fdf4" : (r.status === "in_progress" ? "#eff6ff" : (r.status === "closed" ? "#f1f5f9" : "#fffbeb"));
            html += `
                <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <strong style="color: #0f172a; font-size: 15px;">${r.subject}</strong>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;"><span class="pg-id-pill">${r.report_id}</span> • ${r.category}</div>
                        </div>
                        <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}33; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                            ${r.status}
                        </span>
                    </div>
                    <div style="font-size: 13.5px; color: #334155; line-height: 1.5; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #f1f5f9; margin-bottom: 8px;">
                        ${r.description}
                    </div>
                    ${r.admin_notes ? `
                        <div style="font-size: 12.5px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 8px 12px; border-radius: 8px; margin-top: 6px;">
                            <strong>🛡️ Admin Response:</strong> ${r.admin_notes}
                        </div>
                    ` : ''}
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 8px; text-align: right;">
                        Reported on ${r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error("Load tenant app reports error:", e);
    }
}

async function submitTenantAppReport(event) {
    if (event) event.preventDefault();
    const user = getLoggedTenant();
    if (!user || !user.id) {
        alert("Please log in as a tenant to submit an app report.");
        return;
    }

    const catEl = document.getElementById("tenantAppReportCategory");
    const subEl = document.getElementById("tenantAppReportSubject");
    const descEl = document.getElementById("tenantAppReportDesc");
    const btn = document.getElementById("tenantAppReportSubmitBtn");

    const category = catEl ? catEl.value : "Bug Report / App Glitch";
    const subject = subEl ? subEl.value.trim() : "";
    const description = descEl ? descEl.value.trim() : "";

    if (!subject || !description) {
        alert("Please provide both an issue title and description.");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Submitting Report to Admin...";
    }

    try {
        const response = await fetch(`${API_URL}/api/app-reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id || user.user_id,
                role: "tenant",
                category: category,
                subject: subject,
                description: description
            })
        });
        const data = await response.json();
        if (response.ok) {
            if (typeof showToast === "function") {
                showToast("App report submitted to administrator!", "success");
            } else {
                alert("App report submitted to administrator!");
            }
            if (document.getElementById("tenantAppReportForm")) {
                document.getElementById("tenantAppReportForm").reset();
            }
            loadTenantAppReports();
        } else {
            alert(data.detail || "Failed to submit app report.");
        }
    } catch (e) {
        console.error("Submit tenant app report error:", e);
        alert("Server connection error while submitting report.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Submit App Report to Admin";
        }
    }
}

// 2. OWNER APP REPORTS
async function loadOwnerAppReports() {
    const container = document.getElementById("ownerAppReportsListContainer");
    if (!container) return;

    const owner = getLoggedOwner();
    if (!owner) return;

    try {
        const response = await fetch(`${API_URL}/api/app-reports/user/${owner.id || owner.user_id}`);
        const data = await response.json();
        const reports = data.reports || [];

        if (reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="big-icon">🛠️</div>
                    <h2>No App Reports Yet</h2>
                    <p>Report any system issues, billing bugs, or suggestions to the Platform Administrator.</p>
                </div>
            `;
            return;
        }

        let html = "";
        reports.forEach(r => {
            const statusColor = r.status === "resolved" ? "#16a34a" : (r.status === "in_progress" ? "#2563eb" : (r.status === "closed" ? "#64748b" : "#d97706"));
            const statusBg = r.status === "resolved" ? "#f0fdf4" : (r.status === "in_progress" ? "#eff6ff" : (r.status === "closed" ? "#f1f5f9" : "#fffbeb"));
            html += `
                <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <strong style="color: #0f172a; font-size: 15px;">${r.subject}</strong>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;"><span class="pg-id-pill">${r.report_id}</span> • ${r.category}</div>
                        </div>
                        <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}33; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                            ${r.status}
                        </span>
                    </div>
                    <div style="font-size: 13.5px; color: #334155; line-height: 1.5; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #f1f5f9; margin-bottom: 8px;">
                        ${r.description}
                    </div>
                    ${r.admin_notes ? `
                        <div style="font-size: 12.5px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 8px 12px; border-radius: 8px; margin-top: 6px;">
                            <strong>🛡️ Admin Response:</strong> ${r.admin_notes}
                        </div>
                    ` : ''}
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 8px; text-align: right;">
                        Reported on ${r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error("Load owner app reports error:", e);
    }
}

async function submitOwnerAppReport(event) {
    if (event) event.preventDefault();
    const owner = getLoggedOwner();
    if (!owner || !owner.id) {
        alert("Please log in as an owner to submit an app report.");
        return;
    }

    const catEl = document.getElementById("ownerAppReportCategory");
    const subEl = document.getElementById("ownerAppReportSubject");
    const descEl = document.getElementById("ownerAppReportDesc");
    const btn = document.getElementById("ownerAppReportSubmitBtn");

    const category = catEl ? catEl.value : "Bug Report / System Glitch";
    const subject = subEl ? subEl.value.trim() : "";
    const description = descEl ? descEl.value.trim() : "";

    if (!subject || !description) {
        alert("Please provide both an issue title and description.");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Submitting Report to Admin...";
    }

    try {
        const response = await fetch(`${API_URL}/api/app-reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: owner.id || owner.user_id,
                role: "owner",
                category: category,
                subject: subject,
                description: description
            })
        });
        const data = await response.json();
        if (response.ok) {
            if (typeof showToast === "function") {
                showToast("App report submitted to administrator!", "success");
            } else {
                alert("App report submitted to administrator!");
            }
            if (document.getElementById("ownerAppReportForm")) {
                document.getElementById("ownerAppReportForm").reset();
            }
            loadOwnerAppReports();
        } else {
            alert(data.detail || "Failed to submit app report.");
        }
    } catch (e) {
        console.error("Submit owner app report error:", e);
        alert("Server connection error while submitting report.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Submit Report to Administrator";
        }
    }
}
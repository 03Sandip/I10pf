// Adjust these URLs to match your backend routes
const CHECK_EMAIL_URL = "http://localhost:5000/api/auth/check-email";  // STEP 1
const RESET_PASSWORD_URL = "http://localhost:5000/api/auth/reset-password"; // STEP 2

const emailForm = document.getElementById("emailForm");
const resetForm = document.getElementById("resetForm");

const emailInput = document.getElementById("email");
const emailMessage = document.getElementById("emailMessage");

const verifiedEmailSpan = document.getElementById("verifiedEmailSpan");

const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const resetMessage = document.getElementById("resetMessage");

let verifiedEmail = null;

// Utility: show message
function showMessage(element, message, type = "error") {
  element.textContent = message;
  element.classList.remove("success", "error");
  element.classList.add(type);
}

/**
 * STEP 1: Verify email exists
 */
emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  if (!email) {
    showMessage(emailMessage, "Please enter your email.", "error");
    return;
  }

  try {
    showMessage(emailMessage, "Checking email...", "success");

    const res = await fetch(CHECK_EMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok || !data.exists) {
      showMessage(emailMessage, data.message || "Email not found.", "error");
      return;
    }

    // Email exists → show reset password form
    verifiedEmail = email;
    verifiedEmailSpan.textContent = verifiedEmail;

    emailInput.setAttribute("disabled", "true");
    showMessage(emailMessage, "Email verified ✅ . You can now set a new password.", "success");

    // Show reset form
    resetForm.classList.remove("hidden");

  } catch (err) {
    console.error(err);
    showMessage(emailMessage, "Something went wrong. Please try again.", "error");
  }
});

/**
 * STEP 2: Reset password
 */
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  if (!newPassword || !confirmPassword) {
    showMessage(resetMessage, "Please fill all fields.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage(resetMessage, "Passwords do not match.❌", "error");
    return;
  }

  try {
    showMessage(resetMessage, "Updating password...", "success");

    const res = await fetch(RESET_PASSWORD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: verifiedEmail,
        newPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(resetMessage, data.message || "Could not reset password.", "error");
      return;
    }

    showMessage(resetMessage, "Password updated successfully. Redirecting to login...", "success");

    // Optional: redirect to login after 1.5s
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1500);

  } catch (err) {
    console.error(err);
    showMessage(resetMessage, "Something went wrong. Please try again.", "error");
  }
});

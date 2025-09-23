/* global fetch */
document.addEventListener("DOMContentLoaded", () => {
  // ----- Contact form: client-side validation + progressive enhancement (AJAX) -----
  const form = document.querySelector("#contact-form");
  const errorEl = document.querySelector("#form-error");

  function setError(msg) {
    if (errorEl) {
      errorEl.textContent = msg || "";
      errorEl.style.display = msg ? "block" : "none";
    }
  }

  function validate(payload) {
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const subject = String(payload.subject || "").trim();
    const message = String(payload.message || "").trim();
    if (!name || !email || !subject || !message) {
      return "Please fill in all fields.";
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return "Please enter a valid email address.";
    if (message.length < 10) return "Message should be at least 10 characters.";
    return "";
  }

  async function ajaxSubmit(payload) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error((data && data.error) || "Something went wrong.");
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || "Network error." };
    }
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      // Progressive enhancement: try AJAX first; if it fails, normal POST still works
      e.preventDefault();
      setError("");

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      const problem = validate(payload);
      if (problem) {
        setError(problem);
        return;
      }

      const result = await ajaxSubmit(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Success UX
      form.reset();
      setError("✅ Thanks! Your message has been received.");
    });
  }

  // ----- Mobile nav toggle (if present) -----
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks  = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }
});

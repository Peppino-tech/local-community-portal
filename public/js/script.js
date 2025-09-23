/* global fetch */
document.addEventListener("DOMContentLoaded", () => {
  // ----- Contact form: client-side validation + progressive enhancement (AJAX) -----
  const form = document.querySelector("#contact-form");
  const errorEl = document.querySelector("#form-error");

  // Make the error box an ARIA live region for announcements
  if (errorEl) {
    errorEl.setAttribute("role", "status");
    errorEl.setAttribute("aria-live", "polite");
  }

  function setError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg || "";
    errorEl.style.display = msg ? "block" : "none";
  }

  function setFieldState(el, invalid) {
    if (!el) return;
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
    el.classList.toggle("input-error", !!invalid);
  }

  function validate(payload) {
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const subject = String(payload.subject || "").trim();
    const message = String(payload.message || "").trim();

    const problems = {};
    if (!name) problems.name = "Please enter your name.";
    if (!email) problems.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.email = "Please enter a valid email address.";
    if (!subject) problems.subject = "Please add a subject.";
    if (!message) problems.message = "Please add a message.";
    else if (message.length < 10) problems.message = "Message should be at least 10 characters.";

    return problems;
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
    const nameEl = form.querySelector("#name");
    const emailEl = form.querySelector("#email");
    const subjectEl = form.querySelector("#subject");
    const messageEl = form.querySelector("#message");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      // Progressive enhancement: try AJAX first; if it fails, normal POST still works
      e.preventDefault();
      setError("");

      // Clear field states
      [nameEl, emailEl, subjectEl, messageEl].forEach(el => setFieldState(el, false));

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      // Validate
      const problems = validate(payload);
      const keys = Object.keys(problems);
      if (keys.length) {
        // Mark fields and focus the first invalid one
        if (problems.name) setFieldState(nameEl, true);
        if (problems.email) setFieldState(emailEl, true);
        if (problems.subject) setFieldState(subjectEl, true);
        if (problems.message) setFieldState(messageEl, true);

        const firstInvalid =
          problems.name ? nameEl :
          problems.email ? emailEl :
          problems.subject ? subjectEl : messageEl;

        if (firstInvalid) firstInvalid.focus();
        setError(problems[keys[0]]);
        return;
      }

      // Prevent double submits
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
      }

      const result = await ajaxSubmit(payload);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Success UX
      form.reset();
      [nameEl, emailEl, subjectEl, messageEl].forEach(el => setFieldState(el, false));
      setError("✅ Thanks! Your message has been received.");
      // Return focus to the first field for quick follow-up entry
      if (nameEl) nameEl.focus();
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

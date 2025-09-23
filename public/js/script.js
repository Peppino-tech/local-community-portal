document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.querySelector("#contact-form");
  const errorContainer = document.querySelector("#form-error");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // stay on page
      if (errorContainer) errorContainer.textContent = ""; // clear

      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());

      // Client-side validation
      const name = (payload.name || "").trim();
      const email = (payload.email || "").trim();
      const subject = (payload.subject || "").trim();
      const message = (payload.message || "").trim();
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      let err = "";
      if (!name || !email || !subject || !message) err = "Please fill in all fields.";
      else if (!isEmailValid) err = "Please provide a valid email address.";
      else if (message.length < 10) err = "Your message is a bit short (min 10 chars).";

      if (err) {
        if (errorContainer) errorContainer.textContent = err;
        return;
      }

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          if (errorContainer) errorContainer.textContent = (data && data.error) ? data.error : "Something went wrong.";
          return;
        }

        // Success UX
        contactForm.reset();
        if (errorContainer) errorContainer.textContent = "✅ Thanks! Your message has been received.";
      } catch {
        if (errorContainer) errorContainer.textContent = "Network error. Please try again.";
      }
    });
  }

  // (keep any other page JS here)
});
document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.querySelector("#contact-form");
  const errorContainer = document.querySelector("#form-error");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // stay on page
      if (errorContainer) errorContainer.textContent = ""; // clear

      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());

      // Client-side validation
      const name = (payload.name || "").trim();
      const email = (payload.email || "").trim();
      const subject = (payload.subject || "").trim();
      const message = (payload.message || "").trim();
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      let err = "";
      if (!name || !email || !subject || !message) err = "Please fill in all fields.";
      else if (!isEmailValid) err = "Please provide a valid email address.";
      else if (message.length < 10) err = "Your message is a bit short (min 10 chars).";

      if (err) {
        if (errorContainer) errorContainer.textContent = err;
        return;
      }

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          if (errorContainer) errorContainer.textContent = (data && data.error) ? data.error : "Something went wrong.";
          return;
        }

        // Success UX
        contactForm.reset();
        if (errorContainer) errorContainer.textContent = "✅ Thanks! Your message has been received.";
      } catch {
        if (errorContainer) errorContainer.textContent = "Network error. Please try again.";
      }
    });
  }

  
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-toggle');
  if (!btn) return;
  const links = document.querySelector('.nav-links');
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  links.style.display = open ? '' : 'flex';
});

// Mobile menu toggle
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-toggle');
  if (!btn) return;
  const links = document.querySelector('.nav-links');
  const open = links.classList.toggle('is-open');
  btn.setAttribute('aria-expanded', String(open));
});

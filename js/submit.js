/* Submit design form helpers */

document.addEventListener("DOMContentLoaded", () => {
  const drop = document.getElementById("file-drop");
  const input = document.getElementById("design-file");
  const nameEl = document.getElementById("file-name");
  const form = document.getElementById("submit-form");
  const success = document.getElementById("form-success");

  if (drop && input) {
    const showName = () => {
      if (!nameEl) return;
      nameEl.textContent = input.files?.[0]?.name || "";
    };

    drop.addEventListener("click", () => input.click());

    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });

    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("is-dragover");
    });

    drop.addEventListener("dragleave", () => {
      drop.classList.remove("is-dragover");
    });

    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("is-dragover");
      if (e.dataTransfer.files?.length) {
        input.files = e.dataTransfer.files;
        showName();
      }
    });

    input.addEventListener("change", showName);
  }

  if (form && success) {
    form.addEventListener("submit", () => {
      // FormSubmit handles delivery; show a friendly local confirmation after a short delay
      // if the page stays put (e.g. blocked navigation). Real success is confirmed by email.
      window.setTimeout(() => {
        form.style.display = "none";
        success.classList.add("is-visible");
      }, 600);
    });
  }
});

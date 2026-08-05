(() => {
  const slider = document.getElementById("preference");
  if (!slider) return;

  const icons = {
    left: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 40'%3E%3Cpath d='M30 7 16 20l14 13M17 20h31' fill='none' stroke='%23111827' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    neutral: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 40'%3E%3Cpath d='M23 7 9 20l14 13M41 7l14 13-14 13M10 20h44' fill='none' stroke='%23111827' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    right: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 40'%3E%3Cpath d='m34 7 14 13-14 13M47 20H16' fill='none' stroke='%23111827' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"
  };

  function updateCenteredFill() {
    const min = Number(slider.min || -5);
    const max = Number(slider.max || 5);
    const value = Number(slider.value || 0);
    const percent = ((value - min) / (max - min)) * 100;
    const center = ((0 - min) / (max - min)) * 100;

    slider.style.setProperty("--fill-start", `${Math.min(center, percent)}%`);
    slider.style.setProperty("--fill-end", `${Math.max(center, percent)}%`);
    slider.style.setProperty("--thumb-icon", value < 0 ? icons.left : value > 0 ? icons.right : icons.neutral);
  }

  slider.addEventListener("input", updateCenteredFill);
  slider.addEventListener("change", updateCenteredFill);

  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  if (originalDescriptor?.set && originalDescriptor?.get) {
    Object.defineProperty(slider, "value", {
      configurable: true,
      get() { return originalDescriptor.get.call(this); },
      set(nextValue) {
        originalDescriptor.set.call(this, nextValue);
        updateCenteredFill();
      }
    });
  }

  updateCenteredFill();
})();

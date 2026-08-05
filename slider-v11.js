(() => {
  const slider = document.getElementById("preference");
  if (!slider) return;

  function updateCenteredFill() {
    const min = Number(slider.min || -5);
    const max = Number(slider.max || 5);
    const value = Number(slider.value || 0);
    const percent = ((value - min) / (max - min)) * 100;
    const center = ((0 - min) / (max - min)) * 100;

    slider.style.setProperty("--fill-start", `${Math.min(center, percent)}%`);
    slider.style.setProperty("--fill-end", `${Math.max(center, percent)}%`);
  }

  slider.addEventListener("input", updateCenteredFill);
  slider.addEventListener("change", updateCenteredFill);

  const observer = new MutationObserver(updateCenteredFill);
  observer.observe(slider, { attributes: true, attributeFilter: ["value"] });

  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  if (originalDescriptor?.set && originalDescriptor?.get) {
    Object.defineProperty(slider, "value", {
      configurable: true,
      get() {
        return originalDescriptor.get.call(this);
      },
      set(nextValue) {
        originalDescriptor.set.call(this, nextValue);
        updateCenteredFill();
      }
    });
  }

  updateCenteredFill();
})();

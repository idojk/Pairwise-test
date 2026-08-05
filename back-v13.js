(() => {
  const backButton = document.getElementById("backButton");
  if (!backButton) return;

  function updateBackButton() {
    backButton.disabled = current <= 0 || responses.length === 0;
  }

  backButton.addEventListener("click", () => {
    if (current <= 0 || responses.length === 0) return;

    clearInterval(countdownTimer);
    const previousResponse = responses.pop();
    current -= 1;

    showPair();
    ui.preference.value = String(previousResponse.preference ?? 0);
    ui.comment.value = previousResponse.comment || "";
    updatePreferenceUI();
    ui.preference.dispatchEvent(new Event("input", { bubbles: true }));
    ui.saveStatus.textContent = "Previous response loaded. Submit again to save your changes.";

    saveProgress();
    updateBackButton();
  });

  const progressObserver = new MutationObserver(updateBackButton);
  progressObserver.observe(ui.progress, { childList: true, characterData: true, subtree: true });

  document.addEventListener("click", (event) => {
    if (event.target === ui.nextButton || event.target === ui.restartButton) {
      window.setTimeout(updateBackButton, 0);
    }
  });

  window.setTimeout(updateBackButton, 0);
})();

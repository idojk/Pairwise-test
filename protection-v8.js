(() => {
  const isProtectedTarget = (target) => Boolean(target?.closest?.(".card, .image-frame"));

  document.addEventListener("contextmenu", (event) => {
    if (isProtectedTarget(event.target)) event.preventDefault();
  });

  document.addEventListener("dragstart", (event) => {
    if (isProtectedTarget(event.target)) event.preventDefault();
  });

  document.addEventListener("selectstart", (event) => {
    if (isProtectedTarget(event.target)) event.preventDefault();
  });

  document.addEventListener("copy", (event) => {
    if (isProtectedTarget(event.target)) event.preventDefault();
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const saveOrCopy = (event.ctrlKey || event.metaKey) && ["s", "c", "u"].includes(key);
    if (saveOrCopy && !document.getElementById("testScreen")?.hidden) {
      event.preventDefault();
    }
  });

  const protectImages = () => {
    document.querySelectorAll(".card img").forEach((image) => {
      image.draggable = false;
      image.setAttribute("ondragstart", "return false");
      image.setAttribute("oncontextmenu", "return false");
    });
  };

  protectImages();
  new MutationObserver(protectImages).observe(document.body, { childList: true, subtree: true });
})();

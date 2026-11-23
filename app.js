(() => {
  const imageInput = document.querySelector("#image-input");
  const browseButton = document.querySelector("#browse-button");
  const changeImageButton = document.querySelector("#change-image-button");
  const retryButton = document.querySelector("#retry-button");
  const dropZone = document.querySelector("#drop-zone");
  const emptyState = document.querySelector("#empty-state");
  const previewState = document.querySelector("#preview-state");
  const previewImage = document.querySelector("#preview-image");
  const fileName = document.querySelector("#file-name");
  const imageCaptionText = document.querySelector("#image-caption-text");
  const resultsCard = document.querySelector("#results-card");
  const resultsEmpty = document.querySelector("#results-empty");
  const resultsLoading = document.querySelector("#results-loading");
  const resultsError = document.querySelector("#results-error");
  const resultsContent = document.querySelector("#results-content");
  const loadingTitle = document.querySelector("#loading-title");
  const loadingCopy = document.querySelector("#loading-copy");
  const errorTitle = document.querySelector("#error-title");
  const errorCopy = document.querySelector("#error-copy");
  const retryLabel = document.querySelector("#retry-label");
  const modelStatus = document.querySelector("#model-status");
  const modelStatusText = document.querySelector("#model-status-text");
  const topLabel = document.querySelector("#top-label");
  const topConfidence = document.querySelector("#top-confidence");
  const topBar = document.querySelector("#top-bar");
  const predictionList = document.querySelector("#prediction-list");

  let modelPromise;
  let currentImageUrl;
  let selectedFile;
  let requestId = 0;
  let retryAction = openFilePicker;

  function setModelStatus(state, message) {
    modelStatus.dataset.state = state;
    modelStatusText.textContent = message;
  }

  function showResultState(state) {
    resultsEmpty.hidden = state !== "empty";
    resultsLoading.hidden = state !== "loading";
    resultsError.hidden = state !== "error";
    resultsContent.hidden = state !== "content";
    resultsCard.setAttribute("aria-busy", String(state === "loading"));
  }

  function showError(title, message, actionLabel = "Choose another image", action = openFilePicker) {
    errorTitle.textContent = title;
    errorCopy.textContent = message;
    retryLabel.textContent = actionLabel;
    retryAction = action;
    showResultState("error");
  }

  function resetImage() {
    requestId += 1;
    selectedFile = undefined;

    if (currentImageUrl) {
      URL.revokeObjectURL(currentImageUrl);
      currentImageUrl = undefined;
    }

    previewImage.onload = null;
    previewImage.onerror = null;
    previewImage.removeAttribute("src");
    previewState.hidden = true;
    emptyState.hidden = false;
    imageCaptionText.textContent = "A good subject is clear, centered, and well lit.";
  }

  function getModel() {
    if (!window.mobilenet) {
      return Promise.reject(new Error("The classifier library did not load. Check your internet connection and reload the page."));
    }

    if (!modelPromise) {
      setModelStatus("loading", "Loading MobileNet for the first time");
      modelPromise = window.mobilenet.load({ version: 2, alpha: 1.0 }).catch((error) => {
        modelPromise = undefined;
        throw error;
      });
    }

    return modelPromise;
  }

  function formatLabel(label) {
    return label.replace(/,\s*/g, " · ");
  }

  function renderPredictions(predictions) {
    const [best, ...alternatives] = predictions;
    const percent = Math.round(best.probability * 100);

    topLabel.textContent = formatLabel(best.className);
    topConfidence.textContent = `${percent}%`;
    topBar.style.width = `${percent}%`;
    predictionList.replaceChildren();

    alternatives.slice(0, 3).forEach((prediction, index) => {
      const row = document.createElement("li");
      row.className = "prediction-row";

      const rank = document.createElement("span");
      rank.className = "prediction-rank";
      rank.textContent = String(index + 2).padStart(2, "0");

      const label = document.createElement("span");
      label.className = "prediction-label";
      label.textContent = formatLabel(prediction.className);

      const confidence = document.createElement("span");
      confidence.className = "prediction-percent";
      confidence.textContent = `${Math.round(prediction.probability * 100)}%`;

      row.append(rank, label, confidence);
      predictionList.append(row);
    });

    showResultState("content");
  }

  async function classify(image, id) {
    showResultState("loading");
    loadingTitle.textContent = "Waking up the model";
    loadingCopy.textContent = "A moment while it gets its bearings…";

    try {
      const model = await getModel();
      if (id !== requestId) return;

      setModelStatus("ready", "Model ready · running in your browser");
      loadingTitle.textContent = "Looking a little closer";
      loadingCopy.textContent = "Finding the strongest visual matches…";
      const predictions = await model.classify(image, 4);
      if (id !== requestId) return;

      if (!predictions.length) {
        throw new Error("The model returned no predictions for this image.");
      }

      renderPredictions(predictions);
    } catch (error) {
      if (id !== requestId) return;
      console.error("Image classification failed:", error);
      const message = error instanceof Error ? error.message : "The model could not classify this image.";
      showError(
        "Classification didn’t finish.",
        message,
        "Try again",
        () => selectedFile ? useImage(selectedFile) : openFilePicker()
      );
      setModelStatus("error", "Couldn’t load the model");
    }
  }

  function useImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      resetImage();
      showError("That file isn’t an image.", "Choose a JPG, PNG, WEBP, or GIF file to continue.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      resetImage();
      showError("That image is too large.", "Choose an image smaller than 20 MB to continue.");
      return;
    }

    requestId += 1;
    selectedFile = file;
    if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
    currentImageUrl = URL.createObjectURL(file);
    const id = requestId;
    previewImage.onload = () => {
      imageCaptionText.textContent = `${previewImage.naturalWidth} × ${previewImage.naturalHeight} px · ready for a closer look`;
      classify(previewImage, id);
    };
    previewImage.onerror = () => {
      if (id !== requestId) return;
      imageCaptionText.textContent = "This image couldn’t be opened. Try a different file.";
      resetImage();
      showError("We couldn’t open that image.", "Try a different JPG, PNG, WEBP, or GIF file.");
    };
    previewImage.src = currentImageUrl;
    fileName.textContent = file.name;
    emptyState.hidden = true;
    previewState.hidden = false;
  }

  function openFilePicker() {
    imageInput.click();
  }

  browseButton.addEventListener("click", openFilePicker);
  changeImageButton.addEventListener("click", openFilePicker);
  retryButton.addEventListener("click", () => retryAction());

  imageInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    useImage(file);
    imageInput.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    useImage(file);
  });

  window.addEventListener("beforeunload", () => {
    if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  });

  window.addEventListener("error", (event) => {
    if (!window.mobilenet && event.message.includes("mobilenet")) {
      setModelStatus("error", "Couldn’t load the classifier library");
    }
  });
})();

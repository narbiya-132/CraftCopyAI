
import { pipeline, env } from
  "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// CraftCopy AI: browser-based open-weight model
env.allowLocalModels = false;
env.useBrowserCache = true;

const form = document.getElementById("copyForm");
const generateBtn = document.getElementById("generateBtn");

const welcomeState = document.getElementById("welcomeState");
const loadingState = document.getElementById("loadingState");
const loadingTitle = document.getElementById("loadingTitle");
const loadingText = document.getElementById("loadingText");
const errorState = document.getElementById("errorState");
const errorText = document.getElementById("errorText");
const results = document.getElementById("results");
const outputCards = document.getElementById("outputCards");

const resultPlatform = document.getElementById("resultPlatform");
const copyAllBtn = document.getElementById("copyAllBtn");
const retryBtn = document.getElementById("retryBtn");
const newCopyBtn = document.getElementById("newCopyBtn");

let generator = null;
let lastRequest = null;
let latestOutput = "";
let isGenerating = false;

const goals = {
  all: {
    label: "Complete product copy pack",
    instruction:
      "Write a product title, a persuasive product description, " +
      "a social media caption with a call to action, and relevant hashtags. " +
      "Put each part under a clear heading."
  },
  description: {
    label: "Product description",
    instruction:
      "Write a clear, appealing product description highlighting " +
      "the provided features and benefits. Do not invent product facts."
  },
  caption: {
    label: "Social media caption",
    instruction:
      "Write an engaging social media caption with a natural opening, " +
      "product benefits, and a friendly call to action."
  },
  title: {
    label: "Product title",
    instruction:
      "Write one clear, attractive, searchable product title. " +
      "Keep it concise and accurate."
  },
  hashtags: {
    label: "Hashtags",
    instruction:
      "Suggest relevant hashtags for this product and audience. " +
      "Use a mix of specific product, niche, and discovery hashtags."
  }
};

function showState(state) {
  welcomeState.classList.toggle("hidden", state !== "welcome");
  loadingState.classList.toggle("hidden", state !== "loading");
  errorState.classList.toggle("hidden", state !== "error");
  results.classList.toggle("hidden", state !== "results");
}

function setLoading(message) {
  loadingTitle.textContent = message;
  loadingText.textContent =
    "The first run may take a while because the model needs to download.";
}

function readForm() {
  return {
    name: document.getElementById("productName").value.trim(),
    category: document.getElementById("category").value,
    platform: document.getElementById("platform").value,
    details: document.getElementById("details").value.trim(),
    tone: document.getElementById("tone").value,
    audience: document.getElementById("audience").value,
    goal: document.getElementById("goal").value
  };
}

async function loadModel() {
  if (generator) return generator;

  setLoading("Loading your open-weight AI...");
  loadingText.textContent =
    "Downloading and preparing FLAN-T5-small. The first load may take several minutes.";

  generator = await pipeline(
    "text2text-generation",
    "Xenova/flan-t5-small",
    {
      progress_callback: (progress) => {
        if (progress.status === "progress" &&
            typeof progress.progress === "number") {
          const percent = Math.round(progress.progress);
          loadingText.textContent =
            `Downloading model files: ${percent}%`;
        } else if (progress.status === "done") {
          loadingText.textContent =
            "Preparing the model for your request...";
        }
      }
    }
  );

  return generator;
}

function buildPrompt(data) {
  const goal = goals[data.goal] || goals.all;

  return `
You are CraftCopy AI, a helpful marketing copywriter for small businesses.

Create content for the following product using only the supplied facts.

Product name: ${data.name}
Category: ${data.category}
Selling platform: ${data.platform}
Product details: ${data.details}
Brand voice: ${data.tone}
Target customer: ${data.audience}

Task: ${goal.instruction}

Rules:
- Use the requested brand voice.
- Make the writing specific to the product.
- Never invent prices, discounts, certifications, materials,
  delivery promises, customer reviews, or product features.
- Do not claim the product is best-selling or guaranteed to sell.
- Make the wording natural, useful, and ready to edit.
- Follow the requested platform's style.
- Return plain text with clear headings where appropriate.
`.trim();
}

function renderOutput(text, data) {
  latestOutput = text;
  outputCards.replaceChildren();

  const card = document.createElement("article");
  card.className = "result-card";

  const top = document.createElement("div");
  top.className = "result-card-top";

  const heading = document.createElement("h3");
  heading.textContent = goals[data.goal].label;

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-btn";
  copyButton.textContent = "Copy text";
  copyButton.addEventListener("click", async () => {
    const success = await copyText(text);
    copyButton.textContent = success ? "Copied!" : "Select and copy";
  });

  const content = document.createElement("div");
  content.className = "result-content";
  content.textContent = text;

  top.append(heading, copyButton);
  card.append(top, content);
  outputCards.append(card);

  resultPlatform.textContent = data.platform;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Clipboard permissions can vary by browser and environment.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    area.remove();
    return copied;
  }
}

async function generateCopy(data) {
  if (isGenerating) return;

  isGenerating = true;
  lastRequest = data;
  generateBtn.disabled = true;
  generateBtn.innerHTML = "<span>✦</span> Creating your copy...";
  showState("loading");

  try {
    const model = await loadModel();

    setLoading("Writing your product copy...");

    const prompt = buildPrompt(data);

    const output = await model(prompt, {
      max_new_tokens: data.goal === "all" ? 240 : 150,
      do_sample: false,
      repetition_penalty: 1.15
    });

    const text = output?.[0]?.generated_text?.trim();

    if (!text) {
      throw new Error("The model returned an empty response. Please try again.");
    }

    renderOutput(text, data);
    showState("results");
  } catch (error) {
    console.error("CraftCopy AI error:", error);

    errorText.textContent =
      error?.message?.includes("fetch") ||
      error?.message?.includes("network")
        ? "The model could not download. Check your internet connection, then try again."
        : "The model failed to load or generate text. Check the browser console for details and try again.";

    showState("error");
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    generateBtn.innerHTML =
      '<span>✦</span> Generate with open AI <span class="arrow">↗</span>';
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = readForm();

  if (!data.name || !data.details) {
    form.reportValidity();
    return;
  }

  generateCopy(data);
});

retryBtn.addEventListener("click", () => {
  if (lastRequest) generateCopy(lastRequest);
});

newCopyBtn.addEventListener("click", () => {
  showState("welcome");
  document.getElementById("productName").focus();
});

copyAllBtn.addEventListener("click", async () => {
  const success = await copyText(latestOutput);
  copyAllBtn.textContent = success ? "Copied to clipboard ✓" : "Copy unavailable";
  setTimeout(() => {
    copyAllBtn.textContent = "Copy all results ↗";
  }, 1800);
});

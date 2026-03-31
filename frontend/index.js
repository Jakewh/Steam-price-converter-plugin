"use strict";
const SETTINGS_KEY = "mcv:settings";
const LAST_CUSTOM_CURRENCY_KEY = "mcv:lastCustomCurrency";
const RATE_CACHE_PREFIX = "mcv:rate:";
const RATE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_CURRENCY = "EUR";
// Presets use the exact requested currency list.
const SUPPORTED_CURRENCIES = [
    "EUR",
    "CZK",
    "HUF",
    "BGN",
    "RON",
    "DKK",
    "SEK",
    "RSD",
    "ISK",
    "ALL",
    "BAM",
    "MKD"
];
const SETTINGS_PANEL_CLASS = "mcv-settings-panel";
const ROUTE_POLL_INTERVAL_MS = 700;
const ORIGINAL_TEXT_BY_NODE = new WeakMap();
function hasBody() {
    return document.body != null;
}
async function waitForBody(maxWaitMs) {
    if (hasBody()) {
        return true;
    }
    const startedAt = Date.now();
    while (Date.now() - startedAt < maxWaitMs) {
        await new Promise((resolve) => {
            window.setTimeout(resolve, 50);
        });
        if (hasBody()) {
            return true;
        }
    }
    return false;
}
function loadSettings() {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
        return { currency: DEFAULT_CURRENCY, updatedAt: Date.now() };
    }
    try {
        const parsed = JSON.parse(raw);
        const currency = typeof parsed.currency === "string" && parsed.currency.length === 3
            ? parsed.currency.toUpperCase()
            : DEFAULT_CURRENCY;
        return {
            currency,
            updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now()
        };
    }
    catch {
        return { currency: DEFAULT_CURRENCY, updatedAt: Date.now() };
    }
}
function saveSettings(settings) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function loadLastCustomCurrency() {
    const raw = window.localStorage.getItem(LAST_CUSTOM_CURRENCY_KEY);
    if (raw && /^[A-Z]{3}$/.test(raw)) {
        return raw;
    }
    return "NOK";
}
function saveLastCustomCurrency(currency) {
    if (/^[A-Z]{3}$/.test(currency)) {
        window.localStorage.setItem(LAST_CUSTOM_CURRENCY_KEY, currency);
    }
}
function parseEuroPrice(value) {
    let normalized = value.replace(/[\s\u00a0\u202f]/g, "");
    const hasComma = normalized.includes(",");
    const hasDot = normalized.includes(".");
    if (hasComma && hasDot) {
        const lastComma = normalized.lastIndexOf(",");
        const lastDot = normalized.lastIndexOf(".");
        if (lastComma > lastDot) {
            normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
        }
        else {
            normalized = normalized.replace(/,/g, "");
        }
    }
    else if (hasComma) {
        normalized = /,\d{1,2}$/.test(normalized)
            ? normalized.replace(/,/g, ".")
            : normalized.replace(/,/g, "");
    }
    else if (hasDot) {
        normalized = /\.\d{1,2}$/.test(normalized) ? normalized : normalized.replace(/\./g, "");
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}
function formatConvertedPrice(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
    catch {
        const formatted = new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
        return `${formatted} ${currency}`;
    }
}
function convertText(text, currency, rate) {
    return text.replace(/€\s*([\d.,\s\u00a0\u202f]+)|([\d.,\s\u00a0\u202f]+)\s*€/g, (match, prefixed, suffixed) => {
        const numericPart = typeof prefixed === "string" && prefixed ? prefixed : suffixed;
        const eurValue = parseEuroPrice(numericPart);
        if (eurValue == null) {
            return match;
        }
        const converted = eurValue * rate;
        return formatConvertedPrice(converted, currency);
    });
}
function applyConversions(currency, rate) {
    if (!document.body) {
        return;
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
        const current = walker.currentNode;
        const parent = current.parentElement;
        if (!parent) {
            continue;
        }
        if (parent.closest(`.${SETTINGS_PANEL_CLASS}`)) {
            continue;
        }
        const value = current.nodeValue;
        const originalValue = ORIGINAL_TEXT_BY_NODE.get(current);
        const sourceText = originalValue ?? value;
        if (!sourceText || !sourceText.includes("€")) {
            continue;
        }
        if (!originalValue && value) {
            ORIGINAL_TEXT_BY_NODE.set(current, value);
        }
        textNodes.push(current);
    }
    for (const node of textNodes) {
        const original = ORIGINAL_TEXT_BY_NODE.get(node) ?? node.nodeValue;
        if (!original) {
            continue;
        }
        const converted = convertText(original, currency, rate);
        if (converted !== original) {
            node.nodeValue = converted;
        }
    }
}
async function fetchRate(currency) {
    if (currency === "EUR") {
        return 1;
    }
    const cacheKey = `${RATE_CACHE_PREFIX}${currency}`;
    const cachedRaw = window.localStorage.getItem(cacheKey);
    if (cachedRaw) {
        try {
            const cached = JSON.parse(cachedRaw);
            if (typeof cached.rate === "number" &&
                Number.isFinite(cached.rate) &&
                typeof cached.savedAt === "number" &&
                Date.now() - cached.savedAt < RATE_TTL_MS) {
                return cached.rate;
            }
        }
        catch {
            // Ignore invalid cache and continue to network request.
        }
    }
    const url = `https://api.frankfurter.app/latest?from=EUR&to=${encodeURIComponent(currency)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Rate request failed with status ${response.status}`);
    }
    const payload = (await response.json());
    const rate = payload.rates?.[currency];
    if (typeof rate !== "number" || !Number.isFinite(rate)) {
        throw new Error(`Missing rate for ${currency}`);
    }
    const cache = { rate, savedAt: Date.now() };
    window.localStorage.setItem(cacheKey, JSON.stringify(cache));
    return rate;
}
function readCachedRate(currency) {
    if (currency === "EUR") {
        return 1;
    }
    const cacheKey = `${RATE_CACHE_PREFIX}${currency}`;
    const cachedRaw = window.localStorage.getItem(cacheKey);
    if (!cachedRaw) {
        return null;
    }
    try {
        const cached = JSON.parse(cachedRaw);
        if (typeof cached.rate === "number" &&
            Number.isFinite(cached.rate) &&
            typeof cached.savedAt === "number" &&
            Date.now() - cached.savedAt < RATE_TTL_MS) {
            return cached.rate;
        }
    }
    catch {
        return null;
    }
    return null;
}
function createSettingsUi(onCurrencyChanged, initialCurrency) {
    if (!document.body && !document.documentElement) {
        return;
    }
    const existingPanel = document.querySelector(`.${SETTINGS_PANEL_CLASS}`);
    if (existingPanel) {
        const existingSelect = existingPanel.querySelector("select");
        if (existingSelect) {
            const hasOption = Array.from(existingSelect.options).some((option) => option.value === initialCurrency);
            if (!hasOption) {
                const dynamicOption = document.createElement("option");
                dynamicOption.value = initialCurrency;
                dynamicOption.textContent = initialCurrency;
                existingSelect.append(dynamicOption);
            }
            existingSelect.value = initialCurrency;
            existingSelect.dataset.currentValue = initialCurrency;
        }
        return;
    }
    const panel = document.createElement("div");
    panel.className = SETTINGS_PANEL_CLASS;
    panel.style.position = "fixed";
    panel.style.bottom = "16px";
    panel.style.right = "16px";
    panel.style.zIndex = "999999";
    panel.style.padding = "10px";
    panel.style.background = "rgba(12, 17, 24, 0.92)";
    panel.style.color = "#f2f8ff";
    panel.style.border = "1px solid rgba(255,255,255,0.16)";
    panel.style.borderRadius = "10px";
    panel.style.display = "flex";
    panel.style.gap = "8px";
    panel.style.alignItems = "center";
    panel.style.fontSize = "12px";
    const label = document.createElement("label");
    label.textContent = "Convert to:";
    const select = document.createElement("select");
    select.style.background = "#0f1720";
    select.style.color = "#f2f8ff";
    select.style.border = "1px solid rgba(255,255,255,0.2)";
    select.style.borderRadius = "6px";
    select.style.padding = "4px 6px";
    for (const currency of SUPPORTED_CURRENCIES) {
        const option = document.createElement("option");
        option.value = currency;
        option.textContent = currency;
        if (currency === initialCurrency) {
            option.selected = true;
        }
        select.append(option);
    }
    const hasInitialOption = Array.from(select.options).some((option) => option.value === initialCurrency);
    if (!hasInitialOption) {
        const initialOption = document.createElement("option");
        initialOption.value = initialCurrency;
        initialOption.textContent = initialCurrency;
        initialOption.selected = true;
        select.append(initialOption);
    }
    const customOption = document.createElement("option");
    customOption.value = "CUSTOM";
    customOption.textContent = "Custom...";
    select.append(customOption);
    select.dataset.currentValue = initialCurrency;
    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.maxLength = 3;
    customInput.placeholder = "NOK";
    customInput.value = loadLastCustomCurrency();
    customInput.style.width = "56px";
    customInput.style.background = "#0f1720";
    customInput.style.color = "#f2f8ff";
    customInput.style.border = "1px solid rgba(255,255,255,0.2)";
    customInput.style.borderRadius = "6px";
    customInput.style.padding = "4px 6px";
    customInput.style.display = "none";
    const customApplyButton = document.createElement("button");
    customApplyButton.type = "button";
    customApplyButton.textContent = "Apply";
    customApplyButton.style.background = "#1f6feb";
    customApplyButton.style.color = "#ffffff";
    customApplyButton.style.border = "1px solid rgba(255,255,255,0.2)";
    customApplyButton.style.borderRadius = "6px";
    customApplyButton.style.padding = "4px 8px";
    customApplyButton.style.cursor = "pointer";
    customApplyButton.style.display = "none";
    const hideCustomEditor = () => {
        customInput.style.display = "none";
        customApplyButton.style.display = "none";
    };
    const showCustomEditor = () => {
        customInput.style.display = "inline-block";
        customApplyButton.style.display = "inline-block";
        customInput.value = loadLastCustomCurrency();
        customInput.focus();
        customInput.select();
    };
    const applyCustomCurrency = () => {
        const selected = customInput.value.trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(selected)) {
            window.alert("Currency code must be exactly 3 letters.");
            return;
        }
        const alreadyExists = Array.from(select.options).some((option) => option.value === selected);
        if (!alreadyExists) {
            const dynamicOption = document.createElement("option");
            dynamicOption.value = selected;
            dynamicOption.textContent = selected;
            select.append(dynamicOption);
        }
        saveLastCustomCurrency(selected);
        select.value = selected;
        select.dataset.currentValue = selected;
        hideCustomEditor();
        onCurrencyChanged(selected);
    };
    customApplyButton.addEventListener("click", applyCustomCurrency);
    customInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyCustomCurrency();
        }
    });
    select.addEventListener("change", () => {
        let selected = select.value;
        const previousValue = select.dataset.currentValue ?? initialCurrency;
        if (selected === "CUSTOM") {
            select.value = previousValue;
            showCustomEditor();
            return;
        }
        hideCustomEditor();
        if (!/^[A-Z]{3}$/.test(selected)) {
            select.value = previousValue;
            return;
        }
        onCurrencyChanged(selected);
        select.dataset.currentValue = selected;
    });
    panel.append(label, select, customInput, customApplyButton);
    (document.body ?? document.documentElement).append(panel);
}
function debounce(fn, delayMs) {
    let timer = null;
    return ((...args) => {
        if (timer !== null) {
            window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
            timer = null;
            fn(...args);
        }, delayMs);
    });
}
async function start() {
    const bodyReady = await waitForBody(10000);
    if (!bodyReady) {
        console.warn("[EUR Price Converter] document.body was not ready in time.");
        return;
    }
    let settings = loadSettings();
    let rate = 1;
    let currentHref = window.location.href;
    const convertCurrentPage = () => {
        applyConversions(settings.currency, rate);
    };
    const refreshRate = async () => {
        try {
            rate = await fetchRate(settings.currency);
            convertCurrentPage();
        }
        catch (error) {
            console.warn("[EUR Price Converter] Failed to load exchange rate:", error);
        }
    };
    createSettingsUi(async (currency) => {
        settings = {
            currency,
            updatedAt: Date.now()
        };
        saveSettings(settings);
        const cachedRate = readCachedRate(settings.currency);
        if (cachedRate != null) {
            rate = cachedRate;
            convertCurrentPage();
        }
        else if (settings.currency === "EUR") {
            rate = 1;
            convertCurrentPage();
        }
        await refreshRate();
    }, settings.currency);
    await refreshRate();
    const runConversion = debounce(() => {
        convertCurrentPage();
    }, 250);
    const observer = new MutationObserver(() => {
        runConversion();
    });
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    window.setInterval(() => {
        if (window.location.href === currentHref) {
            return;
        }
        currentHref = window.location.href;
        void refreshRate();
    }, ROUTE_POLL_INTERVAL_MS);
}
void start().catch((error) => {
    console.warn("[EUR Price Converter] Startup failure:", error);
});


(function () {
  "use strict";

  const statsKey = "gpt_plus_safe_generator_stats";
  const historyKey = "gpt_plus_safe_generator_history";
  const officialUrl = "https://chatgpt.com/#pricing";
  const sessionUrl = "https://chatgpt.com/api/auth/session";

  let currentUrl = "";

  const $ = (id) => document.getElementById(id);
  const els = {
    input: $("session"),
    generateBtn: $("generate-btn"),
    statusBox: $("status-box"),
    errorBox: $("error-box"),
    errorText: $("error-text"),
    resultBox: $("result-box"),
    resultClose: $("result-close"),
    linkDisplay: $("link-display"),
    resultTitle: $("result-title"),
    promoTag: $("promo-tag"),
    btnCopy: $("btn-copy"),
    copyText: $("copy-text"),
    btnOpen: $("btn-open"),
    shareLaunch: $("share-launch"),
    popup: $("share-popup"),
    toast: $("toast"),
    hsTotal: $("hs-total"),
    hsSuccess: $("hs-success"),
    accountsBox: $("accounts-box"),
    pendingMeta: $("pending-claim-meta")
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStats() {
    try {
      const data = JSON.parse(localStorage.getItem(statsKey) || "{}");
      return {
        total: Number.isFinite(data.total) ? data.total : 0,
        success: Number.isFinite(data.success) ? data.success : 0
      };
    } catch (_) {
      return { total: 0, success: 0 };
    }
  }

  function saveStats(stats) {
    localStorage.setItem(statsKey, JSON.stringify(stats));
    renderStats();
  }

  function renderStats() {
    const stats = getStats();
    els.hsTotal.textContent = String(stats.total);
    els.hsSuccess.textContent = String(stats.success);
  }

  function getHistory() {
    try {
      const items = JSON.parse(localStorage.getItem(historyKey) || "[]");
      return Array.isArray(items) ? items.slice(0, 8) : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(item) {
    const items = [item].concat(getHistory()).slice(0, 8);
    localStorage.setItem(historyKey, JSON.stringify(items));
    renderHistory();
  }

  function renderHistory() {
    const items = getHistory();
    if (!items.length) {
      els.accountsBox.classList.remove("show");
      els.accountsBox.innerHTML = "";
      return;
    }

    els.accountsBox.innerHTML = [
      '<div class="acc-title">Riwayat Link</div>',
      ...items.map((item) => `
        <div class="acc-row">
          <div class="acc-main">${escapeHtml(item.title)}</div>
          <div class="acc-meta">${escapeHtml(item.meta)}</div>
        </div>
      `)
    ].join("");
    els.accountsBox.classList.add("show");
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2300);
  }

  function hideError() {
    els.errorBox.classList.remove("show");
    els.errorText.textContent = "";
  }

  function showError(message, logs) {
    renderLogs(logs || [
      { step: "Security", ok: false, message: "Input perlu dicek" }
    ]);
    els.errorText.textContent = message;
    els.errorBox.classList.add("show");
    els.resultBox.classList.remove("show");
  }

  function renderLogs(logs) {
    if (!Array.isArray(logs) || !logs.length) {
      els.statusBox.classList.remove("show");
      els.statusBox.innerHTML = "";
      return;
    }

    els.statusBox.innerHTML = logs.map((log) => `
      <div class="status-row ${log.ok ? "ok" : "fail"}">
        <span class="status-name">${escapeHtml(log.step)}</span>
        <span class="status-msg">${escapeHtml(log.message)}</span>
      </div>
    `).join("");
    els.statusBox.classList.add("show");
  }

  function hasSensitiveText(value) {
    const text = String(value || "").toLowerCase();
    const risky = [
      "access_token",
      "refresh_token",
      "session_token",
      "id_token",
      "csrf",
      "cookie",
      "set-cookie",
      "bearer ",
      "eyj",
      "api/auth/session",
      "authorization",
      "password",
      "passwd",
      "otp",
      "one-time",
      "cvv",
      "nomor kartu",
      "credit card",
      "card number"
    ];
    return risky.some((keyword) => text.includes(keyword));
  }

  function parseJsonInput(value) {
    const text = String(value || "").trim();
    if (!text.startsWith("{") && !text.startsWith("[")) return null;

    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  function maskEmail(email) {
    const text = String(email || "").trim();
    const parts = text.split("@");
    if (parts.length !== 2) return "";
    const name = parts[0];
    const domain = parts[1];
    const visible = name.slice(0, Math.min(2, name.length));
    return `${visible}${name.length > 2 ? "***" : "*"}@${domain}`;
  }

  function findEmail(value) {
    if (!value || typeof value !== "object") return "";
    const candidates = [
      value.email,
      value.user && value.user.email,
      value.account && value.account.email,
      value.profile && value.profile.email
    ];
    return candidates.find((item) => typeof item === "string" && item.includes("@")) || "";
  }

  function summarizeInput(value) {
    const raw = String(value || "");
    const parsed = parseJsonInput(raw);
    const sensitive = hasSensitiveText(raw) || Boolean(parsed);

    if (parsed) {
      const email = maskEmail(findEmail(parsed));
      return {
        title: email ? `Session JSON ${email}` : "Session JSON diterima",
        meta: "Token/cookie/session dibersihkan lokal",
        sensitive: true,
        isJson: true
      };
    }

    if (sensitive) {
      return {
        title: "Input sensitif diterima",
        meta: "Token/cookie/session dibersihkan lokal",
        sensitive: true,
        isJson: false
      };
    }

    return {
      title: normalizeTopic(raw),
      meta: "Input non-sensitif",
      sensitive: false,
      isJson: false
    };
  }

  function normalizeTopic(value) {
    const text = String(value || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return "GPT Plus Indonesia";
    return text.slice(0, 90);
  }

  function makeToken() {
    const random = crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(2)) : [Date.now(), Math.random() * 100000];
    return `sh_${Number(random[0]).toString(16)}_${Number(random[1]).toString(16)}`;
  }

  function buildSafeLink(token) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("share", token);
    url.searchParams.set("mode", "safe");
    return url.toString();
  }

  function buildShareText() {
    return [
      "GPT Plus Promo - link panduan aman",
      "",
      "Tanpa pembayaran, tanpa VPN Jepang, dan tidak perlu paste session/token.",
      currentUrl
    ].join("\n");
  }

  function showResult(url, options) {
    currentUrl = url;
    els.resultTitle.textContent = options && options.title ? options.title : "Claim Promo GPT Plus siap!";
    els.promoTag.textContent = options && options.tag ? options.tag : "Generated";
    els.linkDisplay.textContent = currentUrl;
    els.linkDisplay.classList.remove("revealed");
    els.resultBox.classList.add("show");
  }

  function generate() {
    const raw = els.input.value.trim();
    hideError();
    els.resultBox.classList.remove("show");

    if (!raw) {
      showError("Isi info akun non-sensitif dulu sebelum buat link.", [
        { step: "Input", ok: false, message: "Masih kosong" }
      ]);
      return;
    }

    els.generateBtn.disabled = true;
    els.generateBtn.querySelector("span").textContent = "Memproses...";

    window.setTimeout(() => {
      const summary = summarizeInput(raw);
      const logs = [
        { step: "Start", ok: true, message: summary.isJson ? "JSON diterima" : "Membaca input" },
        { step: "Security", ok: true, message: summary.sensitive ? "Token/session diabaikan" : "Input aman" }
      ];

      logs.push({ step: "Eligibility", ok: true, message: "Mode panduan aman aktif" });
      logs.push({ step: "Link", ok: true, message: "Share link dibuat" });
      renderLogs(logs);

      const token = makeToken();
      showResult(buildSafeLink(token), {
        title: "Claim Promo GPT Plus siap!",
        tag: summary.isJson ? "Session JSON OK" : "Generated"
      });
      els.pendingMeta.textContent = summary.sensitive
        ? "Link dibuat - token/session tidak masuk output"
        : "Link dibuat lokal - tidak ada pembayaran";

      const stats = getStats();
      stats.total += 1;
      stats.success += 1;
      saveStats(stats);

      saveHistory({
        title: summary.title,
        meta: `${summary.meta} - ${new Date().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}`
      });

      els.generateBtn.disabled = false;
      els.generateBtn.querySelector("span").textContent = "Buat Link";
    }, 360);
  }

  function copyCurrentLink() {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl)
      .then(() => {
        els.btnCopy.classList.add("copied");
        els.copyText.textContent = "Tersalin";
        showToast("Link disalin.");
        window.setTimeout(() => {
          els.btnCopy.classList.remove("copied");
          els.copyText.textContent = "Salin";
        }, 1800);
      })
      .catch(() => showToast("Browser tidak mengizinkan copy otomatis."));
  }

  function openCurrentLink() {
    if (!currentUrl) return;
    window.open(officialUrl, "_blank", "noopener,noreferrer");
  }

  function closeResult() {
    els.resultBox.classList.remove("show");
  }

  function openShareMenu() {
    const shareUrl = currentUrl || buildSafeLink(makeToken());
    const text = currentUrl ? buildShareText() : `GPT Plus Promo - generator aman\n${shareUrl}`;
    els.popup.innerHTML = `
      <div class="popup-card">
        <div class="popup-title">Share Link</div>
        <div class="popup-text">Bagikan link generator aman. Tidak ada pembayaran dan tidak meminta session/token.</div>
        <div class="popup-link">${escapeHtml(shareUrl)}</div>
        <div class="popup-actions">
          <button class="btn-skip" type="button" id="popup-close">Tutup</button>
          <button class="btn" type="button" id="popup-copy">Copy Link</button>
        </div>
      </div>
    `;
    els.popup.classList.add("show");
    $("popup-close").addEventListener("click", closePopup);
    $("popup-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(text)
        .then(() => showToast("Share text disalin."))
        .catch(() => showToast("Tidak bisa copy otomatis."));
    });
  }

  function closePopup() {
    els.popup.classList.remove("show");
  }

  function applyShareMode() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("share");
    if (!token) return;

    currentUrl = window.location.href;
    els.pendingMeta.textContent = `Share aktif: ${token}`;
    els.input.value = "Saya membuka link share GPT Plus Promo dan ingin lanjut cek lewat panduan aman.";
    showResult(currentUrl, {
      title: "Claim Promo GPT Plus siap!",
      tag: "Share aktif"
    });
    renderLogs([
      { step: "Share", ok: true, message: "Link share dibuka" },
      { step: "Session", ok: true, message: sessionUrl.replace("https://", "") },
      { step: "Security", ok: true, message: "Tidak ada data akun dikirim" }
    ]);
  }

  els.generateBtn.addEventListener("click", generate);
  els.btnCopy.addEventListener("click", copyCurrentLink);
  els.btnOpen.addEventListener("click", openCurrentLink);
  els.resultClose.addEventListener("click", closeResult);
  els.shareLaunch.addEventListener("click", openShareMenu);
  els.popup.addEventListener("click", (event) => {
    if (event.target === els.popup) closePopup();
  });

  renderStats();
  renderHistory();
  applyShareMode();
})();

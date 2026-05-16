(function () {
  "use strict";

  const storageKey = "gpt_plus_promo_guide_stats";
  const officialPricingUrl = "https://chatgpt.com/#pricing";
  const officialChatUrl = "https://chatgpt.com/";

  const $ = (id) => document.getElementById(id);
  const form = $("checkerForm");
  const result = $("result");
  const toast = $("toast");
  const totalChecks = $("totalChecks");
  const readyChecks = $("readyChecks");
  const sharePage = $("sharePage");
  const resetLocal = $("resetLocal");

  function getStats() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        total: Number.isFinite(parsed.total) ? parsed.total : 0,
        ready: Number.isFinite(parsed.ready) ? parsed.ready : 0
      };
    } catch (_) {
      return { total: 0, ready: 0 };
    }
  }

  function saveStats(stats) {
    localStorage.setItem(storageKey, JSON.stringify(stats));
    renderStats();
  }

  function renderStats() {
    const stats = getStats();
    totalChecks.textContent = String(stats.total);
    readyChecks.textContent = String(stats.ready);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 2300);
  }

  function hasSensitiveText(value) {
    const text = String(value || "").toLowerCase();
    return [
      "access_token",
      "refresh_token",
      "session_token",
      "oauth",
      "cookie",
      "bearer ",
      "eyj",
      "password",
      "otp",
      "credit card",
      "nomor kartu",
      "cvv"
    ].some((keyword) => text.includes(keyword));
  }

  function buildChecklist(data) {
    const blockers = [];
    const warnings = [];
    const next = [];

    if (!data.hasOfficialAccount) blockers.push("Login resmi chatgpt.com belum terkonfirmasi.");
    if (!data.noSensitivePaste) blockers.push("Centang komitmen tidak menempel session/token dulu sebelum lanjut.");
    if (!data.willUseOfficialCheckout) blockers.push("Pembayaran harus dilakukan di checkout resmi, bukan link pihak ketiga.");
    if (hasSensitiveText(data.accountStatus)) blockers.push("Kolom status terlihat mengandung data sensitif. Hapus session, token, cookie, password, OTP, atau data kartu.");

    if (data.payment === "unknown") warnings.push("Metode pembayaran belum jelas. Cek opsi yang muncul langsung di checkout resmi.");
    if (data.country !== "indonesia") warnings.push("Lokasi akun berbeda dari Indonesia, jadi tampilan harga atau promo bisa berbeda.");
    if (!data.accountStatus.trim()) warnings.push("Status akun belum diisi. Tambahkan apa yang terlihat di UI resmi agar checklist lebih jelas.");

    if (blockers.length === 0) {
      next.push("Buka halaman pricing resmi ChatGPT.");
      next.push("Login ke akun sendiri dan cek apakah tombol Upgrade atau Plan tersedia.");
      next.push("Lanjut hanya jika checkout resmi menampilkan metode pembayaran yang kamu kenal.");
    } else {
      next.push("Selesaikan item blocker dulu.");
      next.push("Hapus data sensitif dari catatan sebelum menyalin atau membagikan checklist.");
      next.push("Coba lagi dari halaman resmi ChatGPT setelah semua checklist aman.");
    }

    const ready = blockers.length === 0 && warnings.length <= 1;
    const review = blockers.length === 0 && warnings.length > 1;
    return { blockers, warnings, next, ready, review };
  }

  function renderResult(data, checklist) {
    const className = checklist.ready ? "ready" : checklist.review ? "review" : "blocked";
    const title = checklist.ready
      ? "Akun terlihat siap dicek di halaman resmi"
      : checklist.review
        ? "Bisa lanjut, tapi ada catatan yang perlu dicek"
        : "Jangan lanjut sebelum blocker aman";

    const summary = [
      `Lokasi: ${data.country === "indonesia" ? "Indonesia" : "Negara lain"}`,
      `Pembayaran: ${data.paymentLabel}`,
      `Status akun: ${data.accountStatus.trim() || "Belum diisi"}`
    ].join("\n");

    const issueItems = checklist.blockers.concat(checklist.warnings);
    result.className = `result show ${className}`;
    result.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(checklist.ready ? "Checklist lokal sudah aman. Langkah berikutnya tetap harus dilakukan di chatgpt.com." : "Ada hal yang perlu diperbaiki sebelum membuka checkout resmi.")}</p>
      <div class="link-preview">
        <span>${escapeHtml(officialPricingUrl)}</span>
      </div>
      ${issueItems.length ? `<ul>${issueItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      <ul>${checklist.next.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <div class="actions">
        <button type="button" id="copyChecklist">Salin checklist</button>
        <a class="button-link secondary" href="${officialPricingUrl}" target="_blank" rel="noopener noreferrer">Buka pricing resmi</a>
        <a class="button-link secondary" href="${officialChatUrl}" target="_blank" rel="noopener noreferrer">Buka ChatGPT</a>
      </div>
    `;

    $("copyChecklist").addEventListener("click", () => {
      const text = [
        "GPT Plus Promo Guide - Checklist Aman",
        "",
        summary,
        "",
        "Catatan:",
        ...(issueItems.length ? issueItems.map((item) => `- ${item}`) : ["- Tidak ada blocker utama."]),
        "",
        "Langkah berikut:",
        ...checklist.next.map((item) => `- ${item}`),
        "",
        `Link resmi: ${officialPricingUrl}`
      ].join("\n");

      navigator.clipboard.writeText(text)
        .then(() => showToast("Checklist disalin."))
        .catch(() => showToast("Browser tidak mengizinkan copy otomatis."));
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const payment = $("payment");
    const data = {
      country: $("country").value,
      payment: payment.value,
      paymentLabel: payment.options[payment.selectedIndex].textContent,
      accountStatus: $("accountStatus").value,
      hasOfficialAccount: $("hasOfficialAccount").checked,
      noSensitivePaste: $("noSensitivePaste").checked,
      willUseOfficialCheckout: $("willUseOfficialCheckout").checked
    };

    const checklist = buildChecklist(data);
    renderResult(data, checklist);

    const stats = getStats();
    stats.total += 1;
    if (checklist.ready) stats.ready += 1;
    saveStats(stats);
  });

  sharePage.addEventListener("click", () => {
    const payload = {
      title: "GPT Plus Promo Guide",
      text: "Checklist aman upgrade GPT Plus tanpa paste session/token.",
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(payload).catch(() => undefined);
      return;
    }

    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast("Link halaman disalin."))
      .catch(() => showToast("Tidak bisa menyalin link otomatis."));
  });

  resetLocal.addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    renderStats();
    showToast("Statistik lokal direset.");
  });

  renderStats();
})();

/**
 * Promptster Ultimate Save Button (Base44 friendly)
 * - No stacking spinner/checkmark
 * - Correct cleanup (no listener leaks)
 * - Timeout + AbortController
 * - Safer JSON parsing
 * - Promptster-like indigo/purple styling
 */

export class UltimateSaveButton {
  constructor(config = {}) {
    this.config = {
      // Data & API
      apiEndpoint: config.apiEndpoint || "/api/save",
      getData: config.getData || (() => ({})),

      // UI
      buttonElement: config.buttonElement,
      containerToClose: config.containerToClose,

      // Timing
      autoCloseDelay: config.autoCloseDelay ?? 1200,
      debounceTime: config.debounceTime ?? 250,

      // Network hardening
      requestTimeoutMs: config.requestTimeoutMs ?? 15000,

      // Callbacks
      onBeforeSave: config.onBeforeSave || null,
      onSuccess: config.onSuccess || null,
      onError: config.onError || null,
      onClose: config.onClose || null,

      // Validation
      validate: config.validate || (() => ({ valid: true })),

      // Retry
      maxRetries: config.maxRetries ?? 2,

      // Optimistic
      optimistic: config.optimistic ?? false,
      rollback: config.rollback || null,

      // Labels (NL default, Promptster tone)
      labels: {
        idle: "Save",
        saving: "Saving…",
        success: "Saved ✓",
        error: "Save failed",
        ...config.labels,
      },

      // Toast
      toast: config.toast ?? true,
    };

    this.state = "idle";
    this.debounceTimer = null;

    // Keep handler refs for cleanup
    this._onClick = (e) => {
      e?.preventDefault?.();
      this.handleSave();
    };
    this._onKeyDown = (e) => {
      const key = String(e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        this.handleSave();
      }
    };

    // Abort controller for inflight request
    this._abortController = null;

    this.init();
  }

  init() {
    const btn = this.config.buttonElement;
    if (!btn) {
      console.warn("[UltimateSaveButton] No buttonElement provided.");
      return;
    }

    this.ensureBaseStylesOnce();
    this.ensureIconNodes();

    btn.addEventListener("click", this._onClick);
    document.addEventListener("keydown", this._onKeyDown);

    // Optional: if button already has a class, keep it; otherwise apply base
    if (!btn.classList.contains("ps-save-btn")) btn.classList.add("ps-save-btn");

    this.updateButtonUI();
  }

  handleSave() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.executeSave(), this.config.debounceTime);
  }

  async executeSave() {
    if (this.state === "saving") return;

    try {
      // 1) validate
      const validation = this.config.validate?.() || { valid: true };
      if (!validation.valid) {
        this.showError(validation.message || "Validation failed");
        return;
      }

      // 2) beforeSave
      if (this.config.onBeforeSave) {
        const proceed = await this.config.onBeforeSave();
        if (proceed === false) return;
      }

      // 3) gather data
      const data = await this.config.getData();

      // 4) saving state
      this.setState("saving");

      // 5) optimistic UI (optional)
      if (this.config.optimistic && this.config.onSuccess) {
        try {
          this.config.onSuccess(data);
        } catch (e) {
          console.warn("[UltimateSaveButton] optimistic onSuccess threw", e);
        }
      }

      // 6) call API with retry (unless in direct mode)
      let result;
      if (this.config.apiEndpoint === "__DIRECT__") {
        // Direct mode: onBeforeSave handled everything, no fetch needed
        result = { ok: true };
      } else {
        result = await this.saveWithRetry(data);
      }

      // 7) success
      this.setState("success");

      if (!this.config.optimistic && this.config.onSuccess) {
        this.config.onSuccess(result);
      }

      // 8) autoclose
      if (this.config.containerToClose && this.config.autoCloseDelay > 0) {
        setTimeout(() => this.closeContainer(), this.config.autoCloseDelay);
      } else {
        // After success, reset back to idle after a short moment (so user can save again)
        setTimeout(() => this.setState("idle"), 1200);
      }
    } catch (error) {
      if (this.config.optimistic && this.config.rollback) {
        try {
          this.config.rollback();
        } catch (e) {
          console.warn("[UltimateSaveButton] rollback threw", e);
        }
      }

      this.showError(error?.message || "Something went wrong");
      if (this.config.onError) this.config.onError(error);
    }
  }

  async saveWithRetry(data, attempt = 0) {
    try {
      // Cancel previous inflight
      if (this._abortController) this._abortController.abort();
      this._abortController = new AbortController();

      const timeoutId = setTimeout(() => {
        try {
          this._abortController.abort();
        } catch {}
      }, this.config.requestTimeoutMs);

      const response = await fetch(this.config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: this._abortController.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errJson = await this.safeJson(response);
        const msg = errJson?.message || errJson?.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      const json = await this.safeJson(response);
      return json ?? { ok: true };
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        const wait = 700 * (attempt + 1); // simple backoff (fast)
        console.log(`[UltimateSaveButton] Retry ${attempt + 1}/${this.config.maxRetries} in ${wait}ms`);
        await this.sleep(wait);
        return this.saveWithRetry(data, attempt + 1);
      }
      throw error;
    }
  }

  setState(newState) {
    this.state = newState;
    this.updateButtonUI();
  }

  updateButtonUI() {
    const btn = this.config.buttonElement;
    if (!btn) return;

    btn.classList.remove("is-saving", "is-success", "is-error");

    // Ensure icon nodes exist and are not duplicated
    const spinner = btn.querySelector(".ps-save-spinner");
    const check = btn.querySelector(".ps-save-check");

    // Reset icon visibility
    if (spinner) spinner.style.display = "none";
    if (check) check.style.display = "none";

    switch (this.state) {
      case "idle":
        btn.disabled = false;
        btn.textContent = this.config.labels.idle;
        this.ensureIconNodes(); // re-add icons after textContent reset
        break;

      case "saving":
        btn.disabled = true;
        btn.classList.add("is-saving");
        btn.textContent = this.config.labels.saving;
        this.ensureIconNodes();
        btn.querySelector(".ps-save-spinner").style.display = "inline-block";
        break;

      case "success":
        btn.disabled = true;
        btn.classList.add("is-success");
        btn.textContent = this.config.labels.success;
        this.ensureIconNodes();
        btn.querySelector(".ps-save-check").style.display = "inline-block";
        break;

      case "error":
        btn.disabled = false;
        btn.classList.add("is-error");
        btn.textContent = this.config.labels.error;
        this.ensureIconNodes();
        setTimeout(() => this.setState("idle"), 2500);
        break;
    }
  }

  showError(message) {
    this.setState("error");
    if (this.config.toast) this.showNotification(message, "error");
  }

  showNotification(message, type = "info") {
    const n = document.createElement("div");
    n.className = `ps-toast ps-toast-${type}`;
    n.textContent = message;

    document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add("is-in"));

    setTimeout(() => {
      n.classList.remove("is-in");
      setTimeout(() => n.remove(), 200);
    }, 3000);
  }

  closeContainer() {
    const el = this.config.containerToClose;
    if (!el) return;

    el.classList.add("ps-fade-out");
    setTimeout(() => {
      el.style.display = "none";
      el.classList.remove("ps-fade-out");
      if (this.config.onClose) this.config.onClose();
    }, 180);
  }

  ensureIconNodes() {
    const btn = this.config.buttonElement;
    if (!btn) return;

    // If we used textContent, any child nodes were wiped. Re-add once.
    if (!btn.querySelector(".ps-save-spinner")) {
      const spinner = document.createElement("span");
      spinner.className = "ps-save-spinner";
      spinner.innerHTML = "⟳";
      spinner.style.display = "none";
      btn.appendChild(spinner);
    }

    if (!btn.querySelector(".ps-save-check")) {
      const check = document.createElement("span");
      check.className = "ps-save-check";
      check.innerHTML = "✓";
      check.style.display = "none";
      btn.appendChild(check);
    }
  }

  async safeJson(response) {
    try {
      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  reset() {
    this.setState("idle");
  }

  destroy() {
    const btn = this.config.buttonElement;
    if (btn) btn.removeEventListener("click", this._onClick);
    document.removeEventListener("keydown", this._onKeyDown);
    if (this._abortController) this._abortController.abort();
  }

  // One-time style injection
  ensureBaseStylesOnce() {
    if (document.getElementById("ps-savebutton-styles")) return;

    const style = document.createElement("style");
    style.id = "ps-savebutton-styles";
    style.textContent = `
      .ps-save-btn{
        padding: 10px 14px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: transform .12s ease, opacity .12s ease, filter .12s ease;
        background: linear-gradient(135deg, #6D28D9, #4F46E5); /* Promptster-ish purple/indigo */
        color: white;
      }
      .ps-save-btn:hover:not(:disabled){ transform: translateY(-1px); filter: brightness(1.03); }
      .ps-save-btn:disabled{ opacity: .75; cursor: not-allowed; }
      .ps-save-btn.is-saving{ background: linear-gradient(135deg, #4F46E5, #4338CA); }
      .ps-save-btn.is-success{ background: linear-gradient(135deg, #10B981, #059669); }
      .ps-save-btn.is-error{ background: linear-gradient(135deg, #EF4444, #DC2626); }

      .ps-save-spinner{
        margin-left: 10px;
        display: inline-block;
        animation: psSpin 1s linear infinite;
        font-weight: 900;
      }
      .ps-save-check{
        margin-left: 10px;
        display: inline-block;
        animation: psPop .16s ease;
        font-weight: 900;
      }
      @keyframes psSpin{ to { transform: rotate(360deg); } }
      @keyframes psPop{ from { transform: scale(.6); opacity: .3; } to { transform: scale(1); opacity: 1; } }

      .ps-toast{
        position: fixed;
        top: 18px;
        right: 18px;
        padding: 10px 14px;
        border-radius: 12px;
        color: white;
        font-weight: 700;
        box-shadow: 0 10px 30px rgba(0,0,0,.22);
        transform: translateX(16px);
        opacity: 0;
        transition: transform .18s ease, opacity .18s ease;
        z-index: 10000;
      }
      .ps-toast.is-in{ transform: translateX(0); opacity: 1; }
      .ps-toast-error{ background: #EF4444; }
      .ps-toast-info{ background: #4F46E5; }
      .ps-toast-success{ background: #10B981; }

      .ps-fade-out{ animation: psFadeOut .18s ease forwards; }
      @keyframes psFadeOut{ to { opacity: 0; transform: scale(.99); } }
    `;
    document.head.appendChild(style);
  }
}
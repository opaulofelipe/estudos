(() => {
  "use strict";

  const SHEET_URL = "./Estudos.xlsx";\n  const CATALOG_URL = "./Estudos.json";
  const STORAGE = {
    progress: "painel-estudos:progress:v1",
    catalog: "painel-estudos:catalog:v1",
    meta: "painel-estudos:meta:v1",
    colors: "painel-estudos:course-colors:v2"
  };

  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const DAY_ALIASES = new Map([
    ["domingo", 0], ["dom", 0],
    ["segunda", 1], ["segunda feira", 1], ["seg", 1],
    ["terca", 2], ["terca feira", 2], ["ter", 2],
    ["quarta", 3], ["quarta feira", 3], ["qua", 3],
    ["quinta", 4], ["quinta feira", 4], ["qui", 4],
    ["sexta", 5], ["sexta feira", 5], ["sex", 5],
    ["sabado", 6], ["sab", 6]
  ]);

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    todayDate: $("#todayDate"),
    todaySummary: $("#todaySummary"),
    syncStatus: $("#syncStatus"),
    syncStatusText: $("#syncStatusText"),
    syncButton: $("#syncButton"),
    overviewLoading: $("#overviewLoading"),
    overviewContent: $("#overviewContent"),
    globalProgressLabel: $("#globalProgressLabel"),
    globalProgressText: $("#globalProgressText"),
    metricCourses: $("#metricCourses"),
    metricRemaining: $("#metricRemaining"),
    metricCompleted: $("#metricCompleted"),
    continueCourse: $("#continueCourse"),
    continueMeta: $("#continueMeta"),
    continueBar: $("#continueBar"),
    continuePercent: $("#continuePercent"),
    continueOpenButton: $("#continueOpenButton"),
    continueCompleteButton: $("#continueCompleteButton"),
    todayCountBadge: $("#todayCountBadge"),
    todayCourses: $("#todayCourses"),
    weekStrip: $("#weekStrip"),
    focusCourse: $("#focusCourse"),
    focusTimer: $("#focusTimer"),
    focusStartButton: $("#focusStartButton"),
    focusResetButton: $("#focusResetButton"),
    courseProgressList: $("#courseProgressList"),
    lastSyncText: $("#lastSyncText"),
    importSheetButton: $("#importSheetButton"),
    exportBackupButton: $("#exportBackupButton"),
    importBackupButton: $("#importBackupButton"),
    sheetFileInput: $("#sheetFileInput"),
    backupFileInput: $("#backupFileInput"),
    courseSearch: $("#courseSearch"),
    dayFilter: $("#dayFilter"),
    expandAllButton: $("#expandAllButton"),
    completeEverythingButton: $("#completeEverythingButton"),
    coursesList: $("#coursesList"),
    emptyCourses: $("#emptyCourses"),
    dialog: $("#confirmDialog"),
    dialogTitle: $("#dialogTitle"),
    dialogDescription: $("#dialogDescription"),
    dialogActions: $("#dialogActions"),
    toast: $("#toast")
  };

  const state = {
    courses: [],
    progress: loadJSON(STORAGE.progress, {}),
    meta: loadJSON(STORAGE.meta, {}),
    courseColors: loadJSON(STORAGE.colors, { map: {}, nextIndex: 0 }),
    search: "",
    day: "all",
    activeTab: "overview",
    priorityCourseId: null,
    timerSeconds: 25 * 60,
    timerRunning: false,
    timerInterval: null,
    toastTimer: null,
    dialogResolve: null,
    dialogCancelHandler: null,
    lastDialogTrigger: null
  };

  function normalizeText(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function slugId(raw, fallback) {
    const clean = normalizeText(raw)
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "");
    return clean || fallback;
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      showToast("Não foi possível salvar dados neste navegador.", true);
      return false;
    }
  }

  function normalizeColorStore() {
    if (!state.courseColors || typeof state.courseColors !== "object") {
      state.courseColors = { map: {}, nextIndex: 0 };
    }
    if (!state.courseColors.map || typeof state.courseColors.map !== "object" || Array.isArray(state.courseColors.map)) {
      state.courseColors.map = {};
    }
    if (!Number.isInteger(state.courseColors.nextIndex) || state.courseColors.nextIndex < 0) {
      state.courseColors.nextIndex = Object.keys(state.courseColors.map).length;
    }
  }

  function makePastelColor(index) {
    const palette = [
      "#f3b5a5",
      "#b8c6ff",
      "#b7d6c2",
      "#efd18b",
      "#c9b8e8",
      "#a8d5df",
      "#efb9cf",
      "#c5d99c",
      "#e7b99c",
      "#b9c8d7",
      "#dac5a6",
      "#b9d7d0"
    ];
    return palette[index % palette.length];
  }

  function ensureCourseColors(courses = state.courses) {
    normalizeColorStore();
    const used = new Set(Object.values(state.courseColors.map));
    let changed = false;

    courses.forEach(course => {
      if (state.courseColors.map[course.id]) return;

      let candidate;
      do {
        candidate = makePastelColor(state.courseColors.nextIndex);
        state.courseColors.nextIndex += 1;
      } while (used.has(candidate));

      state.courseColors.map[course.id] = candidate;
      used.add(candidate);
      changed = true;
    });

    if (changed) saveJSON(STORAGE.colors, state.courseColors);
  }

  function courseColor(course) {
    ensureCourseColors([course]);
    return state.courseColors.map[course.id];
  }

  function parseDays(value) {
    if (value === null || value === undefined || value === "") return [];
    const rawTokens = String(value).split(/[,;/|]+/).map(token => normalizeText(token));
    const days = [];
    rawTokens.forEach(token => {
      if (DAY_ALIASES.has(token)) days.push(DAY_ALIASES.get(token));
      else {
        const found = [...DAY_ALIASES.entries()].find(([alias]) => token.startsWith(alias));
        if (found) days.push(found[1]);
      }
    });
    return [...new Set(days)];
  }

  function courseKey(course) {
    return course.id;
  }

  function validCompletedLessons(course) {
    const raw = state.progress[courseKey(course)] || [];
    return [...new Set(raw.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= course.totalLessons))].sort((a, b) => a - b);
  }

  function completedSet(course) {
    return new Set(validCompletedLessons(course));
  }

  function getCourseStats(course) {
    const completed = validCompletedLessons(course).length;
    const total = course.totalLessons;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }

  function getGlobalStats() {
    const total = state.courses.reduce((sum, course) => sum + course.totalLessons, 0);
    const completed = state.courses.reduce((sum, course) => sum + validCompletedLessons(course).length, 0);
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }

  function getNextLesson(course) {
    const done = completedSet(course);
    for (let n = 1; n <= course.totalLessons; n += 1) {
      if (!done.has(n)) return n;
    }
    return null;
  }

  function setCourseProgress(course, lessonNumbers) {
    const oldRaw = Array.isArray(state.progress[course.id]) ? state.progress[course.id] : [];
    const keepOutOfRange = oldRaw.map(Number).filter(n => Number.isInteger(n) && n > course.totalLessons);
    const clean = [...new Set([...lessonNumbers, ...keepOutOfRange])].sort((a, b) => a - b);
    state.progress[course.id] = clean;
    saveJSON(STORAGE.progress, state.progress);
  }

  function addLessons(course, lessonNumbers) {
    const merged = new Set(validCompletedLessons(course));
    lessonNumbers.forEach(n => {
      if (n >= 1 && n <= course.totalLessons) merged.add(n);
    });
    setCourseProgress(course, [...merged]);
  }

  function removeLesson(course, lessonNumber) {
    const next = validCompletedLessons(course).filter(n => n !== lessonNumber);
    setCourseProgress(course, next);
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseCatalogJSON(payload) {
    const rows = Array.isArray(payload) ? payload : payload?.courses;
    if (!Array.isArray(rows)) throw new Error("Catálogo JSON inválido.");

    const rawCourses = rows.map((item, offset) => {
      const discipline = String(item.disciplina ?? item.discipline ?? "").trim();
      const totalLessons = Math.floor(Number(item.aulasTotais ?? item.totalLessons ?? item.aulas ?? 0));
      if (!discipline || !Number.isFinite(totalLessons) || totalLessons <= 0) return null;

      const dayRaw = String(item.dia ?? item.day ?? "").trim();
      const institution = String(item.instituicao ?? item.institution ?? "").trim();
      const days = parseDays(dayRaw);
      const explicitId = String(item.id ?? "").trim();
      const signature = `${normalizeText(discipline)}|${normalizeText(institution)}`;
      const baseId = explicitId ? `id-${slugId(explicitId, hashString(explicitId))}` : `curso-${hashString(signature)}`;

      return {
        id: baseId,
        discipline,
        totalLessons,
        days,
        dayLabel: days.length ? days.map(day => DAY_NAMES[day]).join(", ") : dayRaw || "Sem dia",
        institution: institution || "Sem instituição",
        rowNumber: offset + 2
      };
    }).filter(Boolean);

    const occurrences = new Map();
    return rawCourses.map(course => {
      const count = (occurrences.get(course.id) || 0) + 1;
      occurrences.set(course.id, count);
      return count === 1 ? course : { ...course, id: `${course.id}-${count}` };
    });
  }

  function loadExternalScript(src, timeoutMs = 9000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let settled = false;
      const done = (ok, error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (!ok) script.remove();
        ok ? resolve() : reject(error || new Error("Falha ao carregar biblioteca externa."));
      };

      const timer = setTimeout(() => done(false, new Error("Tempo esgotado ao carregar o leitor XLSX.")), timeoutMs);
      script.src = src;
      script.async = true;
      script.onload = () => done(true);
      script.onerror = () => done(false, new Error(`Falha ao carregar ${src}`));
      document.head.append(script);
    });
  }

  async function ensureXLSX() {
    if (window.XLSX) return window.XLSX;

    const sources = [
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
    ];

    let lastError;
    for (const src of sources) {
      try {
        await loadExternalScript(src);
        if (window.XLSX) return window.XLSX;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Não foi possível carregar o leitor XLSX.");
  }

  function parseWorkbook(arrayBuffer) {
    if (!window.XLSX) throw new Error("A biblioteca de leitura da planilha não carregou.");

    const workbook = XLSX.read(arrayBuffer);
    if (!workbook.SheetNames.length) throw new Error("A planilha não possui abas.");

    const preferredName = workbook.SheetNames.find(name => normalizeText(name) === "estudos");
    const sheetName = preferredName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true });

    const headerAliases = {
      discipline: ["disciplina", "materia", "curso"],
      total: ["aulas totais", "total de aulas", "aulas", "quantidade de aulas"],
      day: ["dia", "dias", "dia da semana"],
      institution: ["instituicao", "instituição", "professor", "fonte", "plataforma"],
      id: ["id", "codigo", "código"]
    };

    const headerRowIndex = rows.findIndex((row, idx) => {
      if (idx > 12) return false;
      const normalized = row.map(normalizeText);
      const hasDiscipline = normalized.some(cell => headerAliases.discipline.includes(cell));
      const hasTotal = normalized.some(cell => headerAliases.total.includes(cell));
      return hasDiscipline && hasTotal;
    });

    if (headerRowIndex < 0) {
      throw new Error("Não encontrei as colunas “Disciplina” e “Aulas totais”.");
    }

    const headers = rows[headerRowIndex].map(normalizeText);
    const findIndex = aliases => headers.findIndex(header => aliases.includes(header));
    const indexes = {
      discipline: findIndex(headerAliases.discipline),
      total: findIndex(headerAliases.total),
      day: findIndex(headerAliases.day),
      institution: findIndex(headerAliases.institution),
      id: findIndex(headerAliases.id)
    };

    const rawCourses = rows.slice(headerRowIndex + 1).map((row, offset) => {
      const discipline = String(row[indexes.discipline] ?? "").trim();
      const totalLessons = Math.floor(Number(row[indexes.total] ?? 0));
      if (!discipline || !Number.isFinite(totalLessons) || totalLessons <= 0) return null;

      const institution = indexes.institution >= 0 ? String(row[indexes.institution] ?? "").trim() : "";
      const dayRaw = indexes.day >= 0 ? String(row[indexes.day] ?? "").trim() : "";
      const days = parseDays(dayRaw);
      const explicitId = indexes.id >= 0 ? String(row[indexes.id] ?? "").trim() : "";
      const signature = `${normalizeText(discipline)}|${normalizeText(institution)}`;
      const baseId = explicitId ? `id-${slugId(explicitId, hashString(explicitId))}` : `curso-${hashString(signature)}`;

      return {
        id: baseId,
        discipline,
        totalLessons,
        days,
        dayLabel: days.length ? days.map(day => DAY_NAMES[day]).join(", ") : dayRaw || "Sem dia",
        institution: institution || "Sem instituição",
        rowNumber: headerRowIndex + offset + 2
      };
    }).filter(Boolean);

    const occurrences = new Map();
    return rawCourses.map(course => {
      const count = (occurrences.get(course.id) || 0) + 1;
      occurrences.set(course.id, count);
      return count === 1 ? course : { ...course, id: `${course.id}-${count}` };
    });
  }

  async function fetchSpreadsheet({ announce = true } = {}) {
    setSyncState("syncing", "Sincronizando catálogo…");
    els.syncButton.disabled = true;

    try {
      let courses = [];
      let usedXlsxFallback = false;

      try {
        const response = await fetch(`${CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Não consegui abrir ${CATALOG_URL} (${response.status}).`);
        courses = parseCatalogJSON(await response.json());
      } catch (catalogError) {
        usedXlsxFallback = true;
        await ensureXLSX();

        const response = await fetch(`${SHEET_URL}?v=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Não consegui abrir ${SHEET_URL} (${response.status}).`);
        const arrayBuffer = await response.arrayBuffer();
        courses = parseWorkbook(arrayBuffer);
      }

      if (!courses.length) throw new Error("O catálogo não contém disciplinas válidas.");

      applyCatalog(courses, usedXlsxFallback ? "github" : "catalog");
      if (announce) showToast(`${courses.length} disciplinas sincronizadas. Seu progresso foi preservado.`);
      return true;
    } catch (error) {
      const cached = loadJSON(STORAGE.catalog, []);
      if (!state.courses.length && Array.isArray(cached) && cached.length) {
        state.courses = cached;
        renderAll();
        showContent();
        setSyncState("error", "Usando última cópia salva");
        if (announce) showToast(`Falha ao sincronizar: ${error.message} Usando a última cópia salva.`, true);
      } else {
        setSyncState("error", "Falha na sincronização");
        if (announce) showToast(error.message, true);
      }
      return false;
    } finally {
      els.syncButton.disabled = false;
    }
  }

  function applyCatalog(courses, source) {
    state.courses = courses;
    state.meta = {
      ...state.meta,
      lastSync: new Date().toISOString(),
      source
    };
    saveJSON(STORAGE.catalog, courses);
    saveJSON(STORAGE.meta, state.meta);
    renderAll();
    showContent();
    setSyncState("ok", source === "local" ? "Planilha local carregada" : "Planilha sincronizada");
  }

  function showContent() {
    // Some mobile browsers can keep the loading panel visible when an
    // author CSS rule sets display:flex. Hide it explicitly as well as
    // using the semantic hidden attribute.
    els.overviewLoading.hidden = true;
    els.overviewLoading.setAttribute("aria-hidden", "true");
    els.overviewLoading.style.display = "none";

    els.overviewContent.hidden = false;
    els.overviewContent.removeAttribute("aria-hidden");
  }

  function setSyncState(type, message) {
    els.syncStatus.classList.toggle("is-error", type === "error");
    els.syncStatus.classList.toggle("is-syncing", type === "syncing");
    els.syncStatusText.textContent = message;
  }

  function renderAll() {
    const openIds = new Set($$(".course-card[open]", els.coursesList).map(el => el.dataset.courseId));
    renderHeaderDate();
    renderOverview();
    renderCourses(openIds);
    renderLastSync();
  }

  function renderHeaderDate() {
    const now = new Date();
    els.todayDate.textContent = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long"
    }).format(now);

    const todayCourses = state.courses.filter(course => course.days.includes(now.getDay()));
    els.todaySummary.textContent = todayCourses.length
      ? `${todayCourses.length} ${todayCourses.length === 1 ? "matéria" : "matérias"} programadas`
      : "Nenhuma matéria programada";
  }

  function getPriorityCourse() {
    const today = new Date().getDay();
    const incomplete = state.courses.filter(course => getNextLesson(course) !== null);
    const byNeed = (a, b) => getCourseStats(a).percent - getCourseStats(b).percent;
    const todayIncomplete = incomplete.filter(course => course.days.includes(today)).sort(byNeed);
    return todayIncomplete[0] || incomplete.sort(byNeed)[0] || null;
  }

  function renderOverview() {
    const stats = getGlobalStats();
    const remaining = Math.max(0, stats.total - stats.completed);

    els.globalProgressLabel.textContent = `${stats.percent}%`;
    els.globalProgressText.textContent = `${stats.completed.toLocaleString("pt-BR")} de ${stats.total.toLocaleString("pt-BR")} aulas no total`;
    els.metricCourses.textContent = state.courses.length.toLocaleString("pt-BR");
    els.metricRemaining.textContent = remaining.toLocaleString("pt-BR");
    els.metricCompleted.textContent = stats.completed.toLocaleString("pt-BR");

    ensureCourseColors();
    renderContinueCourse();
    renderTodayCourses();
    renderWeekStrip();
    renderCourseProgress();
    renderFocusContext();
    renderTimer();
  }

  function renderContinueCourse() {
    const course = getPriorityCourse();
    state.priorityCourseId = course?.id || null;

    if (!course) {
      els.continueCourse.textContent = state.courses.length ? "Tudo concluído." : "Nenhuma disciplina disponível.";
      els.continueMeta.textContent = state.courses.length
        ? "Seu catálogo está 100% concluído. Um raro momento em que um dashboard pode ficar sem cobrar nada de você."
        : "Sincronize ou importe sua planilha para começar.";
      els.continueBar.style.width = state.courses.length ? "100%" : "0%";
      els.continuePercent.textContent = state.courses.length ? "100% concluído" : "Sem progresso ainda";
      els.continueOpenButton.disabled = true;
      els.continueCompleteButton.disabled = true;
      return;
    }

    const stats = getCourseStats(course);
    const next = getNextLesson(course);
    els.continueCourse.textContent = course.discipline;
    els.continueMeta.textContent = `${course.institution} · próxima: aula ${next} de ${course.totalLessons}`;
    els.continueBar.style.width = `${stats.percent}%`;
    els.continuePercent.textContent = `${stats.percent}% concluído · ${stats.completed}/${stats.total} aulas`;
    els.continueOpenButton.disabled = false;
    els.continueCompleteButton.disabled = false;
    els.continueCompleteButton.textContent = `Concluir aula ${next}`;
  }

  function renderTodayCourses() {
    const today = new Date().getDay();
    const courses = state.courses.filter(course => course.days.includes(today));
    els.todayCountBadge.textContent = `${courses.length} ${courses.length === 1 ? "matéria" : "matérias"}`;

    if (!courses.length) {
      els.todayCourses.innerHTML = `
        <div class="empty-today">
          <span class="empty-today__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>
          </span>
          <strong>Nada programado para hoje.</strong>
          <p>Você pode revisar uma disciplina ou, radicalmente, descansar.</p>
        </div>`;
      return;
    }

    els.todayCourses.innerHTML = courses.map((course, index) => {
      const stats = getCourseStats(course);
      const next = getNextLesson(course);
      const color = courseColor(course);
      const complete = next === null;
      return `
        <article class="today-item ${complete ? "is-complete" : ""}" style="--course-color:${color}">
          <span class="today-item__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <div class="today-item__copy">
            <h3>${escapeHTML(course.discipline)}</h3>
            <p>${escapeHTML(course.institution)} · ${complete ? "disciplina concluída" : `próxima: aula ${next}`}</p>
          </div>
          <div class="today-item__progress">
            <div class="today-item__progress-row">
              <span>${stats.completed}/${stats.total} aulas</span>
              <strong>${stats.percent}%</strong>
            </div>
            <div class="progress-track" aria-label="${stats.percent}% concluído"><span style="width:${stats.percent}%;background:${color}"></span></div>
          </div>
          <div class="today-item__actions">
            <button class="mini-action" type="button" data-open-course="${escapeHTML(course.id)}" aria-label="Abrir ${escapeHTML(course.discipline)}" title="Abrir disciplina">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
            </button>
            <button class="mini-action mini-action--complete" type="button" data-complete-next="${escapeHTML(course.id)}" aria-label="${complete ? "Disciplina concluída" : `Concluir aula ${next} de ${escapeHTML(course.discipline)}`}" title="${complete ? "Concluída" : `Concluir aula ${next}`}" ${complete ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
            </button>
          </div>
        </article>`;
    }).join("");
  }

  function renderWeekStrip() {
    const shortNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const today = new Date().getDay();

    els.weekStrip.innerHTML = DAY_NAMES.map((_, day) => {
      const count = state.courses.filter(course => course.days.includes(day)).length;
      return `
        <div class="week-day ${day === today ? "is-today" : ""}" title="${DAY_NAMES[day]}: ${count} ${count === 1 ? "matéria" : "matérias"}">
          <span class="week-day__name">${shortNames[day]}</span>
          <strong class="week-day__count">${count}</strong>
          <small>${count === 1 ? "mat." : "mat."}</small>
        </div>`;
    }).join("");
  }

  function renderCourseProgress() {
    const ordered = [...state.courses].sort((a, b) => {
      const aStats = getCourseStats(a);
      const bStats = getCourseStats(b);
      if (aStats.percent === 100 && bStats.percent !== 100) return 1;
      if (bStats.percent === 100 && aStats.percent !== 100) return -1;
      return aStats.percent - bStats.percent || a.discipline.localeCompare(b.discipline, "pt-BR");
    });

    els.courseProgressList.innerHTML = ordered.map(course => {
      const stats = getCourseStats(course);
      const color = courseColor(course);
      const statusClass = stats.percent === 100 ? "is-done" : stats.percent > 0 ? "is-started" : "";
      const statusLabel = stats.percent === 100 ? "Concluída" : stats.percent > 0 ? "Em andamento" : "Não iniciada";
      return `
        <article class="progress-row" style="--course-color:${color}">
          <div class="progress-row__identity">
            <span class="progress-row__swatch" aria-hidden="true"></span>
            <div>
              <h3>${escapeHTML(course.discipline)}</h3>
              <p>${escapeHTML(course.institution)} · ${escapeHTML(course.dayLabel)}</p>
            </div>
          </div>
          <div class="progress-row__bar">
            <div class="progress-track" aria-label="${stats.percent}% concluído"><span style="width:${stats.percent}%;background:${color}"></span></div>
          </div>
          <div class="progress-row__value">${stats.percent}%</div>
          <span class="progress-row__status ${statusClass}">${statusLabel}</span>
        </article>`;
    }).join("");
  }

  function renderFocusContext() {
    const course = state.courses.find(item => item.id === state.priorityCourseId);
    els.focusCourse.textContent = course
      ? `Em foco: ${course.discipline}`
      : "Sem disciplina pendente";
  }

  function formatTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function renderTimer() {
    els.focusTimer.textContent = formatTimer(state.timerSeconds);
    els.focusStartButton.textContent = state.timerRunning ? "Pausar" : state.timerSeconds === 0 ? "Concluído" : "Iniciar";
    els.focusStartButton.disabled = state.timerSeconds === 0;
  }

  function toggleFocusTimer() {
    if (state.timerSeconds === 0) return;
    state.timerRunning = !state.timerRunning;

    if (state.timerRunning) {
      state.timerInterval = setInterval(() => {
        state.timerSeconds = Math.max(0, state.timerSeconds - 1);
        if (state.timerSeconds === 0) {
          clearInterval(state.timerInterval);
          state.timerInterval = null;
          state.timerRunning = false;
          showToast("Sessão de foco concluída.");
        }
        renderTimer();
      }, 1000);
    } else if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    renderTimer();
  }

  function resetFocusTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.timerRunning = false;
    state.timerSeconds = 25 * 60;
    renderTimer();
  }

  function completeNextLesson(course) {
    const next = getNextLesson(course);
    if (next === null) {
      showToast(`${course.discipline} já está concluída.`);
      return;
    }
    addLessons(course, [next]);
    renderAll();
    showToast(`Aula ${next} de ${course.discipline} concluída.`);
  }

  function filteredCourses() {
    const query = normalizeText(state.search);
    return state.courses.filter(course => {
      const matchDay = state.day === "all" || course.days.includes(Number(state.day));
      const haystack = normalizeText(`${course.discipline} ${course.institution} ${course.dayLabel}`);
      const matchSearch = !query || haystack.includes(query);
      return matchDay && matchSearch;
    });
  }

  function renderCourses(openIds = new Set()) {
    const courses = filteredCourses();
    els.emptyCourses.hidden = courses.length > 0;
    els.coursesList.hidden = courses.length === 0;

    els.coursesList.innerHTML = courses.map(course => {
      const stats = getCourseStats(course);
      const done = completedSet(course);
      const next = getNextLesson(course);
      const lessonButtons = Array.from({ length: course.totalLessons }, (_, i) => i + 1).map(n => `
        <button
          class="lesson-button ${next === n ? "is-next" : ""}"
          type="button"
          aria-pressed="${done.has(n) ? "true" : "false"}"
          aria-label="Aula ${n} de ${escapeHTML(course.discipline)}${done.has(n) ? ", concluída" : ", pendente"}"
          data-action="toggle-lesson"
          data-course-id="${escapeHTML(course.id)}"
          data-lesson="${n}">${n}</button>`).join("");

      const color = courseColor(course);
      return `
        <details class="course-card" style="--course-color:${color}" data-course-id="${escapeHTML(course.id)}" ${openIds.has(course.id) ? "open" : ""}>
          <summary>
            <div class="course-summary-main">
              <span class="course-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></span>
              <div class="course-summary-copy">
                <h2>${escapeHTML(course.discipline)}</h2>
                <div class="course-meta">
                  <span>${escapeHTML(course.dayLabel)}</span>
                  <span>•</span>
                  <span>${escapeHTML(course.institution)}</span>
                  <span>•</span>
                  <span>${course.totalLessons} aulas</span>
                </div>
              </div>
            </div>
            <div class="course-summary-progress" aria-label="${stats.percent}% concluído">
              <div class="course-donut course-donut--summary" style="--p:${stats.percent}" role="img" aria-label="${stats.percent}% concluído em ${escapeHTML(course.discipline)}">
                <div class="course-donut__inner"><strong>${stats.percent}%</strong></div>
              </div>
              <div class="course-summary-progress__copy">
                <strong>${stats.completed} de ${stats.total}</strong>
                <span>aulas concluídas</span>
              </div>
            </div>
          </summary>
          <div class="course-body">
            <div class="course-actions">
              <button class="btn btn--secondary btn--small" type="button" data-action="complete-course" data-course-id="${escapeHTML(course.id)}">Concluir todas</button>
              <button class="btn btn--ghost btn--small" type="button" data-action="clear-course" data-course-id="${escapeHTML(course.id)}">Limpar marcações</button>
            </div>
            <div class="lesson-grid" aria-label="Aulas de ${escapeHTML(course.discipline)}">${lessonButtons}</div>
            <div class="lesson-legend" aria-hidden="true">
              <span><i class="legend-dot legend-dot--done"></i>Concluída</span>
              <span><i class="legend-dot legend-dot--next"></i>Próxima aula</span>
            </div>
          </div>
        </details>`;
    }).join("");

    updateExpandButtonLabel();
  }

  function renderLastSync() {
    if (!state.meta.lastSync) {
      els.lastSyncText.textContent = "Ainda não sincronizado.";
      return;
    }
    const date = new Date(state.meta.lastSync);
    const source = state.meta.source === "local" ? "arquivo local" : "Estudos.xlsx no site";
    els.lastSyncText.textContent = `Última leitura: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)} · ${source}.`;
  }

  function setActiveTab(tabName, { focus = false } = {}) {
    state.activeTab = tabName;
    $$("[role='tab']").forEach(tab => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    $("#panel-overview").hidden = tabName !== "overview";
    $("#panel-lessons").hidden = tabName !== "lessons";
  }

  function openCourse(courseId) {
    setActiveTab("lessons");
    state.search = "";
    state.day = "all";
    els.courseSearch.value = "";
    els.dayFilter.value = "all";
    renderCourses(new Set([courseId]));
    requestAnimationFrame(() => {
      const card = $(`.course-card[data-course-id="${CSS.escape(courseId)}"]`, els.coursesList);
      if (card) {
        card.open = true;
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  async function toggleLesson(course, lessonNumber) {
    const done = completedSet(course);
    if (done.has(lessonNumber)) {
      removeLesson(course, lessonNumber);
      renderAll();
      showToast(`Aula ${lessonNumber} de ${course.discipline} marcada como pendente.`);
      return;
    }

    const missingBefore = [];
    for (let n = 1; n < lessonNumber; n += 1) {
      if (!done.has(n)) missingBefore.push(n);
    }

    if (missingBefore.length) {
      const answer = await askDialog({
        title: "Concluir aulas anteriores?",
        description: `Você marcou a aula ${lessonNumber} de “${course.discipline}”. Há ${missingBefore.length} aula${missingBefore.length === 1 ? "" : "s"} anterior${missingBefore.length === 1 ? "" : "es"} pendente${missingBefore.length === 1 ? "" : "s"}.`,
        actions: [
          { value: "range", label: `Marcar da 1 à ${lessonNumber}`, variant: "secondary" },
          { value: "single", label: `Só a aula ${lessonNumber}`, variant: "ghost" },
          { value: "cancel", label: "Cancelar", variant: "ghost" }
        ],
        preferred: "range"
      });
      if (answer === "range") addLessons(course, Array.from({ length: lessonNumber }, (_, i) => i + 1));
      else if (answer === "single") addLessons(course, [lessonNumber]);
      else return;
    } else {
      addLessons(course, [lessonNumber]);
    }

    renderAll();
  }

  async function completeCourse(course) {
    const stats = getCourseStats(course);
    if (stats.completed === stats.total) {
      showToast(`${course.discipline} já está 100% concluída.`);
      return;
    }
    const answer = await askDialog({
      title: "Concluir todas as aulas?",
      description: `Serão marcadas como concluídas todas as ${course.totalLessons} aulas de “${course.discipline}”.`,
      actions: [
        { value: "confirm", label: "Concluir todas", variant: "secondary" },
        { value: "cancel", label: "Cancelar", variant: "ghost" }
      ],
      preferred: "cancel"
    });
    if (answer !== "confirm") return;
    addLessons(course, Array.from({ length: course.totalLessons }, (_, i) => i + 1));
    renderAll();
    showToast(`${course.discipline} concluída.`);
  }

  async function clearCourse(course) {
    if (!validCompletedLessons(course).length) {
      showToast(`${course.discipline} não possui aulas marcadas.`);
      return;
    }
    const answer = await askDialog({
      title: "Limpar marcações?",
      description: `As aulas concluídas de “${course.discipline}” voltarão para pendentes.`,
      actions: [
        { value: "clear", label: "Limpar", variant: "danger-soft" },
        { value: "cancel", label: "Cancelar", variant: "ghost" }
      ],
      preferred: "cancel"
    });
    if (answer !== "clear") return;
    state.progress[course.id] = [];
    saveJSON(STORAGE.progress, state.progress);
    renderAll();
    showToast(`Marcações de ${course.discipline} removidas.`);
  }

  async function completeEverything() {
    const stats = getGlobalStats();
    if (stats.total > 0 && stats.completed === stats.total) {
      showToast("Todas as aulas já estão concluídas.");
      return;
    }
    const answer = await askDialog({
      title: "Concluir todas as aulas?",
      description: `Isso marcará como concluídas todas as ${stats.total.toLocaleString("pt-BR")} aulas das ${state.courses.length} disciplinas.`,
      actions: [
        { value: "confirm", label: "Concluir tudo", variant: "secondary" },
        { value: "cancel", label: "Cancelar", variant: "ghost" }
      ],
      preferred: "cancel"
    });
    if (answer !== "confirm") return;

    state.courses.forEach(course => {
      const existingOutOfRange = (state.progress[course.id] || []).map(Number).filter(n => Number.isInteger(n) && n > course.totalLessons);
      state.progress[course.id] = [...Array.from({ length: course.totalLessons }, (_, i) => i + 1), ...existingOutOfRange];
    });
    saveJSON(STORAGE.progress, state.progress);
    renderAll();
    showToast("Todas as aulas foram marcadas como concluídas.");
  }

  function askDialog({ title, description, actions, preferred }) {
    if (state.dialogResolve) {
      state.dialogResolve("cancel");
      state.dialogResolve = null;
    }

    els.dialogTitle.textContent = title;
    els.dialogDescription.textContent = description;
    els.dialogActions.innerHTML = "";
    state.lastDialogTrigger = document.activeElement;

    return new Promise(resolve => {
      state.dialogResolve = resolve;
      actions.forEach(action => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `btn btn--${action.variant || "ghost"}`;
        button.textContent = action.label;
        button.dataset.value = action.value;
        button.addEventListener("click", () => closeDialog(action.value), { once: true });
        els.dialogActions.append(button);
      });

      state.dialogCancelHandler = event => {
        event.preventDefault();
        closeDialog("cancel");
      };
      els.dialog.addEventListener("cancel", state.dialogCancelHandler);
      els.dialog.showModal();

      requestAnimationFrame(() => {
        const target = $(`[data-value="${CSS.escape(preferred || "cancel")}"]`, els.dialogActions) || $("button", els.dialogActions);
        target?.focus();
      });
    });
  }

  function closeDialog(value) {
    if (state.dialogCancelHandler) {
      els.dialog.removeEventListener("cancel", state.dialogCancelHandler);
      state.dialogCancelHandler = null;
    }
    if (els.dialog.open) els.dialog.close();
    const resolve = state.dialogResolve;
    state.dialogResolve = null;
    if (resolve) resolve(value);
    if (state.lastDialogTrigger instanceof HTMLElement) state.lastDialogTrigger.focus({ preventScroll: true });
    state.lastDialogTrigger = null;
  }

  function showToast(message, isError = false) {
    clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle("is-error", isError);
    els.toast.hidden = false;
    state.toastTimer = setTimeout(() => { els.toast.hidden = true; }, isError ? 5200 : 3200);
  }

  function updateExpandButtonLabel() {
    const cards = $$(".course-card", els.coursesList);
    const allOpen = cards.length > 0 && cards.every(card => card.open);
    els.expandAllButton.textContent = allOpen ? "Recolher" : "Expandir";
    els.expandAllButton.dataset.mode = allOpen ? "collapse" : "expand";
  }

  function exportBackup() {
    const backup = {
      type: "painel-estudos-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: state.progress
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `progresso-estudos-${stamp}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup do progresso exportado.");
  }

  async function importBackup(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.type !== "painel-estudos-backup" || !parsed.progress || typeof parsed.progress !== "object") {
        throw new Error("Este arquivo não é um backup válido do painel.");
      }
      const answer = await askDialog({
        title: "Restaurar este backup?",
        description: "O progresso atual deste navegador será substituído pelas marcações do arquivo selecionado.",
        actions: [
          { value: "restore", label: "Restaurar", variant: "secondary" },
          { value: "cancel", label: "Cancelar", variant: "ghost" }
        ],
        preferred: "cancel"
      });
      if (answer !== "restore") return;
      state.progress = parsed.progress;
      saveJSON(STORAGE.progress, state.progress);
      renderAll();
      showToast("Backup restaurado com sucesso.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      els.backupFileInput.value = "";
    }
  }

  async function importSpreadsheet(file) {
    setSyncState("syncing", "Lendo planilha local…");
    try {
      await ensureXLSX();
      const arrayBuffer = await file.arrayBuffer();
      const courses = parseWorkbook(arrayBuffer);
      if (!courses.length) throw new Error("A planilha não contém disciplinas válidas.");
      applyCatalog(courses, "local");
      showToast(`${courses.length} disciplinas carregadas. O progresso anterior foi preservado.`);
    } catch (error) {
      setSyncState("error", "Falha ao ler planilha local");
      showToast(error.message, true);
    } finally {
      els.sheetFileInput.value = "";
    }
  }

  function bindEvents() {
    els.syncButton.addEventListener("click", () => fetchSpreadsheet({ announce: true }));
    els.importSheetButton.addEventListener("click", () => els.sheetFileInput.click());
    els.sheetFileInput.addEventListener("change", () => {
      const [file] = els.sheetFileInput.files;
      if (file) importSpreadsheet(file);
    });

    els.exportBackupButton.addEventListener("click", exportBackup);
    els.importBackupButton.addEventListener("click", () => els.backupFileInput.click());
    els.backupFileInput.addEventListener("change", () => {
      const [file] = els.backupFileInput.files;
      if (file) importBackup(file);
    });

    els.continueOpenButton.addEventListener("click", () => {
      const course = state.courses.find(item => item.id === state.priorityCourseId);
      if (course) openCourse(course.id);
    });

    els.continueCompleteButton.addEventListener("click", () => {
      const course = state.courses.find(item => item.id === state.priorityCourseId);
      if (course) completeNextLesson(course);
    });

    els.focusStartButton.addEventListener("click", toggleFocusTimer);
    els.focusResetButton.addEventListener("click", resetFocusTimer);

    els.courseSearch.addEventListener("input", event => {
      state.search = event.target.value;
      renderCourses();
    });
    els.dayFilter.addEventListener("change", event => {
      state.day = event.target.value;
      renderCourses();
    });

    els.expandAllButton.addEventListener("click", () => {
      const shouldExpand = els.expandAllButton.dataset.mode !== "collapse";
      $$(".course-card", els.coursesList).forEach(card => { card.open = shouldExpand; });
      updateExpandButtonLabel();
    });
    els.completeEverythingButton.addEventListener("click", completeEverything);

    els.coursesList.addEventListener("toggle", updateExpandButtonLabel, true);
    els.coursesList.addEventListener("click", event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const course = state.courses.find(item => item.id === button.dataset.courseId);
      if (!course) return;
      if (button.dataset.action === "toggle-lesson") toggleLesson(course, Number(button.dataset.lesson));
      if (button.dataset.action === "complete-course") completeCourse(course);
      if (button.dataset.action === "clear-course") clearCourse(course);
    });

    els.todayCourses.addEventListener("click", event => {
      const openButton = event.target.closest("[data-open-course]");
      if (openButton) {
        openCourse(openButton.dataset.openCourse);
        return;
      }

      const completeButton = event.target.closest("[data-complete-next]");
      if (completeButton) {
        const course = state.courses.find(item => item.id === completeButton.dataset.completeNext);
        if (course) completeNextLesson(course);
      }
    });

    const tabs = $$("[role='tab']");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
      tab.addEventListener("keydown", event => {
        const currentIndex = tabs.indexOf(event.currentTarget);
        let nextIndex = null;
        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        if (nextIndex !== null) {
          event.preventDefault();
          setActiveTab(tabs[nextIndex].dataset.tab, { focus: true });
        }
      });
    });
  }

  async function init() {
    bindEvents();
    renderHeaderDate();

    const cached = loadJSON(STORAGE.catalog, []);
    if (Array.isArray(cached) && cached.length) {
      state.courses = cached;
      renderAll();
      showContent();
    }

    const success = await fetchSpreadsheet({ announce: false });
    if (!success && !state.courses.length) {
      // In the real error state the loading area is reused to show the
      // message, so make sure it is visible again.
      els.overviewLoading.hidden = false;
      els.overviewLoading.removeAttribute("aria-hidden");
      els.overviewLoading.style.removeProperty("display");
      els.overviewLoading.innerHTML = `
        <div class="empty-today card" style="max-width:640px">
          <strong>Não foi possível carregar Estudos.xlsx.</strong><br>
          Verifique se <code>Estudos.xlsx</code> está na mesma pasta de <code>index.html</code> e se o site está sendo aberto pelo GitHub Pages.
        </div>`;
    }
  }

  init();
})();

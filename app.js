(() => {
  "use strict";

  const SHEET_URL = "./Estudos.xlsx";
  const STORAGE = {
    progress: "painel-estudos:progress:v1",
    catalog: "painel-estudos:catalog:v1",
    meta: "painel-estudos:meta:v1",
    colors: "painel-estudos:course-colors:v1"
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
    globalProgressRing: $("#globalProgressRing"),
    globalProgressRingText: $("#globalProgressRingText"),
    metricCourses: $("#metricCourses"),
    metricLessons: $("#metricLessons"),
    metricCompleted: $("#metricCompleted"),
    todayCountBadge: $("#todayCountBadge"),
    todayCourses: $("#todayCourses"),
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
    // Golden-angle spacing keeps newly added disciplines visually distinct.
    // The persistent index means removed disciplines never free a colour for reuse.
    const hue = (18 + index * 137.50776405) % 360;
    const saturationSteps = [48, 54, 60, 45, 57, 51];
    const lightnessSteps = [76, 80, 73, 83, 78, 75];
    const saturation = saturationSteps[index % saturationSteps.length];
    const lightness = lightnessSteps[Math.floor(index / saturationSteps.length) % lightnessSteps.length];
    return `hsl(${hue.toFixed(3)} ${saturation}% ${lightness}%)`;
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
    setSyncState("syncing", "Sincronizando planilha…");
    els.syncButton.disabled = true;
    try {
      if (!window.XLSX) throw new Error("Não foi possível carregar o leitor XLSX. Verifique sua conexão.");
      const response = await fetch(`${SHEET_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Não consegui abrir ${SHEET_URL} (${response.status}).`);
      const arrayBuffer = await response.arrayBuffer();
      const courses = parseWorkbook(arrayBuffer);
      if (!courses.length) throw new Error("A planilha não contém disciplinas válidas.");

      applyCatalog(courses, "github");
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

  function renderOverview() {
    const stats = getGlobalStats();
    els.globalProgressLabel.textContent = `${stats.percent}%`;
    els.globalProgressText.textContent = `${stats.completed.toLocaleString("pt-BR")} de ${stats.total.toLocaleString("pt-BR")} aulas concluídas`;
    els.globalProgressRing.style.setProperty("--p", stats.percent);
    els.globalProgressRing.setAttribute("aria-label", `Progresso geral de ${stats.percent}%`);
    els.globalProgressRingText.textContent = `${stats.percent}%`;
    els.metricCourses.textContent = state.courses.length.toLocaleString("pt-BR");
    els.metricLessons.textContent = stats.total.toLocaleString("pt-BR");
    els.metricCompleted.textContent = stats.completed.toLocaleString("pt-BR");

    ensureCourseColors();
    renderTodayCourses();
    renderCourseProgress();
  }

  function renderTodayCourses() {
    const today = new Date().getDay();
    const courses = state.courses.filter(course => course.days.includes(today));
    els.todayCountBadge.textContent = `${courses.length} ${courses.length === 1 ? "matéria" : "matérias"}`;

    if (!courses.length) {
      els.todayCourses.innerHTML = `<div class="empty-today card"><strong>Dia livre na planilha.</strong><br>Use o tempo para revisão, descanso ou adiantamento.</div>`;
      return;
    }

    els.todayCourses.innerHTML = courses.map((course, index) => {
      const stats = getCourseStats(course);
      const next = getNextLesson(course);
      const color = courseColor(course);
      return `
        <article class="today-card card" style="--course-color:${color}">
          <div class="today-card__top">
            <span class="today-card__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>${escapeHTML(course.discipline)}</h3>
              <p>${escapeHTML(course.institution)}</p>
            </div>
          </div>
          <div class="today-card__progress">
            <div class="course-donut course-donut--small" style="--p:${stats.percent}" role="img" aria-label="${stats.percent}% concluído em ${escapeHTML(course.discipline)}">
              <div class="course-donut__inner"><strong>${stats.percent}%</strong></div>
            </div>
            <div class="today-card__stats">
              <span>${stats.completed} de ${stats.total} aulas concluídas</span>
              <span class="today-next">${next ? `Próxima: <strong>aula ${next}</strong>` : `<strong>Concluída</strong>`}</span>
            </div>
          </div>
          <div class="today-card__bottom">
            <button class="btn btn--ghost btn--small" type="button" data-open-course="${escapeHTML(course.id)}">Abrir aulas</button>
          </div>
        </article>`;
    }).join("");
  }

  function renderCourseProgress() {
    els.courseProgressList.innerHTML = state.courses.map(course => {
      const stats = getCourseStats(course);
      const color = courseColor(course);
      return `
        <article class="course-progress-item" style="--course-color:${color}">
          <div class="course-donut" style="--p:${stats.percent}" role="img" aria-label="${stats.percent}% concluído em ${escapeHTML(course.discipline)}">
            <div class="course-donut__inner">
              <strong>${stats.percent}%</strong>
              <span>${stats.completed}/${stats.total}</span>
            </div>
          </div>
          <div class="course-progress-item__copy">
            <span class="course-progress-item__swatch" aria-hidden="true"></span>
            <h3>${escapeHTML(course.discipline)}</h3>
            <p>${escapeHTML(course.institution)} · ${escapeHTML(course.dayLabel)}</p>
            <span class="course-progress-item__status">${stats.completed} de ${stats.total} aulas concluídas</span>
          </div>
        </article>`;
    }).join("");
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
      const button = event.target.closest("[data-open-course]");
      if (button) openCourse(button.dataset.openCourse);
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

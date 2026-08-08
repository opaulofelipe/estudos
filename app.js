"use strict";

/* =========================================================
   DADOS PADRÃO
========================================================= */

const DEFAULT_SUBJECTS = [
  {
    id: "arte-cinematografica",
    name: "Arte Cinematográfica",
    theme: "Cinema",
    total: 33
  },
  {
    id: "aspectos-cinematograficos",
    name: "Aspectos Cinematográficos",
    theme: "Cinema",
    total: 17
  },
  {
    id: "historia-do-cinema",
    name: "História do Cinema",
    theme: "Cinema",
    total: 27
  },
  {
    id: "critica-cinematografica",
    name: "Crítica Cinematográfica",
    theme: "Cinema",
    total: 18
  },
  {
    id: "teoria-historiografica",
    name: "Teoria Historiográfica",
    theme: "História",
    total: 33
  },
  {
    id: "teoria-historiografica-brasileira",
    name: "Teoria Historiográfica Brasileira",
    theme: "História",
    total: 29
  },
  {
    id: "pre-historia",
    name: "Pré-História",
    theme: "História",
    total: 17
  },
  {
    id: "filosofia-antiguidade-europeia",
    name: "Filosofia na Antiguidade Europeia",
    theme: "Filosofia",
    total: 35
  },
  {
    id: "filosofia-antiguidade-asiatica",
    name: "Filosofia na Antiguidade Asiática",
    theme: "Filosofia",
    total: 15
  },
  {
    id: "filosofia-africana",
    name: "Filosofia Africana",
    theme: "Filosofia",
    total: 48
  }
];


/* =========================================================
   DIAS
========================================================= */

const DAY_KEYS = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo"
];


const DAY_LABELS = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo"
};


/* =========================================================
   ROTINA PADRÃO
========================================================= */

const DEFAULT_SCHEDULE = {

  segunda: [
    "arte-cinematografica",
    "teoria-historiografica"
  ],

  terca: [
    "filosofia-africana",
    "aspectos-cinematograficos"
  ],

  quarta: [
    "historia-do-cinema",
    "filosofia-antiguidade-europeia"
  ],

  quinta: [
    "teoria-historiografica-brasileira",
    "critica-cinematografica"
  ],

  sexta: [
    "pre-historia",
    "filosofia-antiguidade-asiatica"
  ]

};


/* =========================================================
   STORAGE
========================================================= */

const STORAGE = {

  subjects:
    "studyDashboard.subjects.v2",

  progress:
    "studyDashboard.progress.v2",

  events:
    "studyDashboard.events.v2",

  schedule:
    "studyDashboard.schedule.v2"

};


/* =========================================================
   ESTADO
========================================================= */

const state = {

  subjects:
    loadJson(
      STORAGE.subjects,
      DEFAULT_SUBJECTS
    ),

  progress:
    loadJson(
      STORAGE.progress,
      {}
    ),

  events:
    loadJson(
      STORAGE.events,
      []
    ),

  schedule:
    loadJson(
      STORAGE.schedule,
      DEFAULT_SCHEDULE
    ),

  filters: {

    themes:
      new Set(),

    days:
      new Set(),

    query:
      ""

  },

  charts:
    {},

  openLessons:
    new Set(),

  lastAction:
    null,

  toastTimer:
    null

};


const el = id =>
  document.getElementById(id);


/* =========================================================
   STORAGE
========================================================= */

function cloneFallback(value) {

  return JSON.parse(
    JSON.stringify(value)
  );

}


function loadJson(
  key,
  fallback
) {

  try {

    const raw =
      localStorage.getItem(
        key
      );


    return raw
      ? JSON.parse(raw)
      : cloneFallback(
          fallback
        );

  }

  catch (error) {

    console.warn(
      `Não foi possível carregar ${key}.`,
      error
    );


    return cloneFallback(
      fallback
    );

  }

}


function saveJson(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(
        value
      )
    );

  }

  catch (error) {

    console.error(
      `Não foi possível salvar ${key}.`,
      error
    );

  }

}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function escapeHtml(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


function normalizeText(
  value
) {

  return String(value)

    .normalize(
      "NFD"
    )

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .toLocaleLowerCase(
      "pt-BR"
    )

    .trim();

}


function slugify(
  text
) {

  return normalizeText(
    text
  )

    .replace(
      /[^a-z0-9]+/g,
      "-"
    )

    .replace(
      /^-|-$/g,
      ""
    );

}


function getCompletedSet(
  subjectId
) {

  return new Set(
    state.progress[
      subjectId
    ] || []
  );

}


function completedCount(
  subject
) {

  return Math.min(

    getCompletedSet(
      subject.id
    ).size,

    subject.total

  );

}


function percent(
  subject
) {

  if (
    !subject.total
  ) {

    return 0;

  }


  return Math.round(

    (
      completedCount(
        subject
      )
      /
      subject.total
    )
    *
    100

  );

}


function totals(
  subjects =
    state.subjects
) {

  const total =
    subjects.reduce(

      (
        sum,
        subject
      ) =>

        sum +
        subject.total,

      0

    );


  const done =
    subjects.reduce(

      (
        sum,
        subject
      ) =>

        sum +
        completedCount(
          subject
        ),

      0

    );


  return {

    total,

    done,

    remaining:
      Math.max(
        0,
        total - done
      ),

    percent:
      total
        ? Math.round(
            (
              done /
              total
            )
            *
            100
          )
        : 0

  };

}


function getDayKey(
  date =
    new Date()
) {

  return [

    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado"

  ][
    date.getDay()
  ];

}


function progressMessage(
  pct
) {

  if (
    pct === 100
  ) {

    return "Tudo concluído";

  }


  if (
    pct >= 75
  ) {

    return "Reta final";

  }


  if (
    pct >= 50
  ) {

    return "Mais da metade";

  }


  if (
    pct >= 25
  ) {

    return "Ritmo consistente";

  }


  if (
    pct > 0
  ) {

    return "Progresso iniciado";

  }


  return "Pronto para começar";

}


function compactName(
  name
) {

  return name

    .replace(
      "Filosofia na Antiguidade ",
      "Fil. Antig. "
    )

    .replace(
      "Teoria Historiográfica Brasileira",
      "Teoria Hist. Brasileira"
    )

    .replace(
      "Aspectos Cinematográficos",
      "Aspectos Cinemat."
    )

    .replace(
      "Crítica Cinematográfica",
      "Crítica Cinemat."
    );

}


/* =========================================================
   NORMALIZAR PROGRESSO
========================================================= */

function normalizeProgress() {

  const validIds =
    new Set(

      state.subjects.map(
        subject =>
          subject.id
      )

    );


  Object.keys(
    state.progress
  ).forEach(
    id => {

      if (
        !validIds.has(
          id
        )
      ) {

        delete state.progress[
          id
        ];

      }

    }
  );


  state.subjects.forEach(
    subject => {

      const lessons = [

        ...getCompletedSet(
          subject.id
        )

      ]

        .map(
          Number
        )

        .filter(
          number =>

            Number.isInteger(
              number
            )

            &&

            number >= 1

            &&

            number <=
              subject.total
        )

        .sort(
          (
            a,
            b
          ) =>
            a - b
        );


      state.progress[
        subject.id
      ] =
        lessons;

    }
  );


  saveJson(
    STORAGE.progress,
    state.progress
  );

}


/* =========================================================
   ROTINA SEMANAL
========================================================= */

function getCatchUpSubjects(
  limit = 2
) {

  return [

    ...state.subjects

  ]

    .filter(
      subject =>

        completedCount(
          subject
        )
        <
        subject.total
    )

    .sort(
      (
        a,
        b
      ) =>

        percent(a)
        -
        percent(b)

        ||

        b.total
        -
        a.total
    )

    .slice(
      0,
      limit
    )

    .map(
      subject =>
        subject.id
    );

}


function daySubjectIds(
  day
) {

  if (
    day === "sabado"
  ) {

    return getCatchUpSubjects(
      2
    );

  }


  if (
    day === "domingo"
  ) {

    return getCatchUpSubjects(
      1
    );

  }


  return state.schedule[
    day
  ] || [];

}


function subjectsForDay(
  day
) {

  const ids =
    new Set(
      daySubjectIds(
        day
      )
    );


  return state.subjects.filter(
    subject =>
      ids.has(
        subject.id
      )
  );

}


function daysForSubject(
  subjectId
) {

  return DAY_KEYS.filter(
    day =>

      daySubjectIds(
        day
      ).includes(
        subjectId
      )

  );

}


/* =========================================================
   FILTROS
========================================================= */

function filteredSubjects() {

  return state.subjects.filter(
    subject => {

      /*
       * TEMA
       *
       * Nenhum selecionado = todos.
       * Vários selecionados = OU.
       */

      const themeOk =

        state.filters
          .themes
          .size === 0

        ||

        state.filters
          .themes
          .has(
            subject.theme
          );


      /*
       * DIA
       */

      const subjectDays =
        daysForSubject(
          subject.id
        );


      const dayOk =

        state.filters
          .days
          .size === 0

        ||

        [
          ...state.filters.days
        ].some(
          day =>
            subjectDays.includes(
              day
            )
        );


      /*
       * BUSCA
       */

      const searchable =
        normalizeText(
          `${subject.name} ${subject.theme}`
        );


      const queryOk =

        !state.filters.query

        ||

        searchable.includes(
          state.filters.query
        );


      /*
       * Tema + Dia + Busca
       * funcionam como E entre grupos.
       */

      return (

        themeOk
        &&
        dayOk
        &&
        queryOk

      );

    }
  );

}


/* =========================================================
   CHIPS
========================================================= */

function chipTemplate(
  value,
  label,
  active,
  type
) {

  return `

    <button

      type="button"

      class="
        chip
        ${
          active
            ? "is-active"
            : ""
        }
      "

      data-filter-type="${type}"

      data-value="${
        escapeHtml(
          value
        )
      }"

      aria-pressed="${
        active
      }"

    >

      ${
        escapeHtml(
          label
        )
      }

    </button>

  `;

}


function renderFilters() {

  const themes = [

    ...new Set(

      state.subjects.map(
        subject =>
          subject.theme
      )

    )

  ]

    .sort(
      (
        a,
        b
      ) =>

        a.localeCompare(
          b,
          "pt-BR"
        )
    );


  el(
    "themeFilters"
  ).innerHTML =

    themes

      .map(
        theme =>

          chipTemplate(

            theme,

            theme,

            state.filters
              .themes
              .has(
                theme
              ),

            "theme"

          )
      )

      .join("");


  el(
    "dayFilters"
  ).innerHTML =

    DAY_KEYS

      .map(
        day =>

          chipTemplate(

            day,

            DAY_LABELS[
              day
            ],

            state.filters
              .days
              .has(
                day
              ),

            "day"

          )
      )

      .join("");

}


function toggleFilter(
  type,
  value
) {

  const set =

    type === "theme"

      ? state.filters
          .themes

      : state.filters
          .days;


  if (
    set.has(
      value
    )
  ) {

    set.delete(
      value
    );

  }

  else {

    set.add(
      value
    );

  }


  /*
   * Recria apenas o visual dos chips.
   * Os eventos continuam funcionando
   * porque usamos event delegation.
   */

  renderFilters();


  /*
   * Atualiza tudo que depende
   * do filtro.
   */

  renderFilteredDashboard();

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function init() {

  normalizeProgress();

  renderCurrentDate();

  renderFilters();

  renderAll();

  bindStaticEvents();

}


/* =========================================================
   RENDER GERAL
========================================================= */

function renderAll() {

  renderToday();

  renderWeek();

  renderFilteredDashboard();

}


function renderFilteredDashboard() {

  const subjects =
    filteredSubjects();


  renderMetrics(
    subjects
  );


  renderDisciplines(
    subjects
  );


  renderCharts(
    subjects
  );

}


/* =========================================================
   DATA
========================================================= */

function renderCurrentDate() {

  const now =
    new Date();


  const formatted =
    new Intl.DateTimeFormat(

      "pt-BR",

      {

        weekday:
          "long",

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric"

      }

    ).format(
      now
    );


  el(
    "currentDate"
  ).textContent =

    formatted
      .charAt(0)
      .toUpperCase()

    +

    formatted.slice(
      1
    );

}


/* =========================================================
   O QUE ESTUDAR HOJE
========================================================= */

function renderToday() {

  const day =
    getDayKey();


  const subjects =
    subjectsForDay(
      day
    );


  el(
    "todayBadge"
  ).textContent =

    `${DAY_LABELS[day].toUpperCase()} · HOJE`;


  if (
    day === "sabado"
  ) {

    el(
      "todaySubtitle"
    ).textContent =

      "Reforço inteligente: priorize as disciplinas com menor avanço.";

  }

  else if (
    day === "domingo"
  ) {

    el(
      "todaySubtitle"
    ).textContent =

      "Revisão leve: o painel escolhe a disciplina que mais precisa de atenção.";

  }

  else {

    el(
      "todaySubtitle"
    ).textContent =

      "Sua rotina fixa para hoje, já considerando o progresso salvo.";

  }


  if (
    !subjects.length
  ) {

    el(
      "todaySubjects"
    ).innerHTML = `

      <div
        class="today-subject"
      >

        <strong>
          Dia livre
        </strong>

        <small>
          Use para revisão ou descanso.
        </small>

      </div>

    `;


    return;

  }


  el(
    "todaySubjects"
  ).innerHTML =

    subjects

      .map(
        subject => `

          <article
            class="today-subject"
          >

            <span
              class="
                today-subject__theme
              "
            >

              ${
                escapeHtml(
                  subject.theme
                )
              }

            </span>


            <strong>

              ${
                escapeHtml(
                  subject.name
                )
              }

            </strong>


            <small>

              ${
                completedCount(
                  subject
                )
              }

              de

              ${
                subject.total
              }

              ·

              ${
                percent(
                  subject
                )
              }%

            </small>

          </article>

        `
      )

      .join("");

}


/* =========================================================
   MÉTRICAS
========================================================= */

function renderMetrics(
  subjects =
    filteredSubjects()
) {

  const summary =
    totals(
      subjects
    );


  const subjectIds =
    new Set(

      subjects.map(
        subject =>
          subject.id
      )

    );


  const last7 =
    countEventsSince(

      7,

      subjectIds

    );


  el(
    "metricPercent"
  ).textContent =

    `${summary.percent}%`;


  el(
    "metricPercentBar"
  ).style.width =

    `${summary.percent}%`;


  el(
    "metricPercentMeta"
  ).textContent =

    `${summary.done} de ${summary.total} aulas`;


  el(
    "metricDone"
  ).textContent =

    summary.done
      .toLocaleString(
        "pt-BR"
      );


  el(
    "metricRemaining"
  ).textContent =

    summary.remaining
      .toLocaleString(
        "pt-BR"
      );


  el(
    "metricRemainingMeta"
  ).textContent =

    progressMessage(
      summary.percent
    );


  el(
    "metricWeek"
  ).textContent =

    last7
      .toLocaleString(
        "pt-BR"
      );


  el(
    "donutPercent"
  ).textContent =

    `${summary.percent}%`;

}


/* =========================================================
   DISCIPLINAS
========================================================= */

function renderDisciplines(
  subjects =
    filteredSubjects()
) {

  el(
    "resultCount"
  ).textContent =

    `${subjects.length} ${
      subjects.length === 1
        ? "disciplina"
        : "disciplinas"
    }`;


  el(
    "emptyState"
  ).hidden =

    subjects.length >
    0;


  el(
    "disciplineGrid"
  ).innerHTML =

    subjects

      .map(
        subjectCardTemplate
      )

      .join("");

}


/* =========================================================
   CARD DISCIPLINA
========================================================= */

function subjectCardTemplate(
  subject
) {

  const done =
    completedCount(
      subject
    );


  const pct =
    percent(
      subject
    );


  const complete =

    done >=
    subject.total;


  const panelOpen =

    state.openLessons
      .has(
        subject.id
      );


  const completed =

    getCompletedSet(
      subject.id
    );


  return `

    <article

      class="
        discipline-card
        ${
          complete
            ? "is-complete"
            : ""
        }
      "

      data-subject-id="${
        subject.id
      }"

    >


      <div
        class="
          discipline-card__top
        "
      >


        <div
          class="
            discipline-card__title-wrap
          "
        >


          <span
            class="
              discipline-card__theme
            "
          >

            ${
              escapeHtml(
                subject.theme
              )
            }

          </span>


          <h3
            class="
              discipline-card__title
            "
          >

            ${
              escapeHtml(
                subject.name
              )
            }

          </h3>


        </div>


        <div

          class="
            discipline-card__percent
          "

          aria-label="
            ${pct}% concluído
          "

        >

          ${pct}%

        </div>


      </div>


      <div

        class="
          discipline-card__bar
        "

        aria-hidden="true"

      >

        <span
          style="
            width:${pct}%
          "
        ></span>

      </div>


      <div
        class="
          discipline-card__meta
        "
      >

        <span>

          ${done}
          assistidas

        </span>


        <span>

          ${
            Math.max(
              0,
              subject.total -
                done
            )
          }

          restantes

        </span>

      </div>


      <div
        class="
          discipline-card__actions
        "
      >


        <button

          class="
            counter-button
          "

          type="button"

          data-action="
            decrement
          "

          data-id="${
            subject.id
          }"

          aria-label="
            Remover uma aula concluída de
            ${
              escapeHtml(
                subject.name
              )
            }
          "

          ${
            done === 0
              ? "disabled"
              : ""
          }

        >

          −

        </button>


        <button

          class="
            primary-action
          "

          type="button"

          data-action="
            increment
          "

          data-id="${
            subject.id
          }"

          ${
            complete
              ? "disabled"
              : ""
          }

        >

          ${
            complete

              ? "Concluída ✓"

              : "+1 aula assistida"
          }

        </button>


        <button

          class="
            counter-button
          "

          type="button"

          data-action="
            increment
          "

          data-id="${
            subject.id
          }"

          aria-label="
            Adicionar uma aula concluída em
            ${
              escapeHtml(
                subject.name
              )
            }
          "

          ${
            complete
              ? "disabled"
              : ""
          }

        >

          +

        </button>


      </div>


      <button

        class="
          details-button
        "

        type="button"

        data-action="
          toggle-lessons
        "

        data-id="${
          subject.id
        }"

        aria-expanded="${
          panelOpen
        }"

      >

        ${
          panelOpen

            ? "Ocultar aulas"

            : "Ver aulas"
        }

      </button>


      <div

        class="
          lesson-panel
        "

        data-lesson-panel="${
          subject.id
        }"

        ${
          panelOpen
            ? ""
            : "hidden"
        }

      >

        ${
          panelOpen

            ? lessonPanelTemplate(
                subject,
                completed
              )

            : ""
        }

      </div>


    </article>

  `;

}


/* =========================================================
   LISTA DE AULAS
========================================================= */

function lessonPanelTemplate(
  subject,
  completed =
    getCompletedSet(
      subject.id
    )
) {

  return `

    <p
      class="
        lesson-panel__hint
      "
    >

      Toque em uma aula para
      marcar ou desmarcar.

    </p>


    <div
      class="
        lesson-grid
      "
    >

      ${
        Array.from(

          {
            length:
              subject.total
          },

          (
            _,
            index
          ) =>
            index + 1

        )

          .map(
            number => `

              <button

                type="button"

                class="
                  lesson-pill
                  ${
                    completed.has(
                      number
                    )
                      ? "is-done"
                      : ""
                  }
                "

                data-action="
                  toggle-lesson
                "

                data-id="${
                  subject.id
                }"

                data-lesson="${
                  number
                }"

                aria-pressed="${
                  completed.has(
                    number
                  )
                }"

                aria-label="
                  Aula ${number}
                  de
                  ${
                    escapeHtml(
                      subject.name
                    )
                  }
                "

              >

                ${number}

              </button>

            `
          )

          .join("")
      }

    </div>

  `;

}


/* =========================================================
   EVENTOS DAS DISCIPLINAS
========================================================= */

function handleDisciplineAction(
  event
) {

  const button =
    event.target.closest(
      "[data-action]"
    );


  if (
    !button

    ||

    !el(
      "disciplineGrid"
    ).contains(
      button
    )
  ) {

    return;

  }


  const action =
    button.dataset.action;


  const subjectId =
    button.dataset.id;


  if (
    action ===
    "increment"
  ) {

    changeOneLesson(
      subjectId,
      1
    );

    return;

  }


  if (
    action ===
    "decrement"
  ) {

    changeOneLesson(
      subjectId,
      -1
    );

    return;

  }


  if (
    action ===
    "toggle-lessons"
  ) {

    toggleLessonPanel(
      subjectId
    );

    return;

  }


  if (
    action ===
    "toggle-lesson"
  ) {

    const lesson =
      Number(
        button.dataset.lesson
      );


    const isDone =
      getCompletedSet(
        subjectId
      ).has(
        lesson
      );


    setLesson(

      subjectId,

      lesson,

      !isDone,

      {
        toast: true
      }

    );

  }

}


/* =========================================================
   +1 / -1
========================================================= */

function changeOneLesson(
  subjectId,
  direction
) {

  const subject =
    state.subjects.find(
      item =>
        item.id ===
        subjectId
    );


  if (
    !subject
  ) {

    return;

  }


  const done =
    getCompletedSet(
      subjectId
    );


  if (
    direction > 0
  ) {

    const lesson =
      Array.from(

        {
          length:
            subject.total
        },

        (
          _,
          index
        ) =>
          index + 1

      ).find(
        number =>
          !done.has(
            number
          )
      );


    if (
      !lesson
    ) {

      return;

    }


    setLesson(

      subjectId,

      lesson,

      true,

      {
        toast:
          true
      }

    );


    return;

  }


  const lesson = [

    ...done

  ]

    .sort(
      (
        a,
        b
      ) =>
        b - a
    )[0];


  if (
    !lesson
  ) {

    return;

  }


  setLesson(

    subjectId,

    lesson,

    false,

    {
      toast:
        true
    }

  );

}


/* =========================================================
   MARCAR AULA
========================================================= */

function setLesson(
  subjectId,
  lesson,
  checked,
  options = {}
) {

  const subject =
    state.subjects.find(
      item =>
        item.id ===
        subjectId
    );


  if (

    !subject

    ||

    !Number.isInteger(
      lesson
    )

    ||

    lesson < 1

    ||

    lesson >
      subject.total

  ) {

    return;

  }


  const set =
    getCompletedSet(
      subjectId
    );


  const wasChecked =
    set.has(
      lesson
    );


  if (
    wasChecked ===
    checked
  ) {

    return;

  }


  if (
    checked
  ) {

    set.add(
      lesson
    );

  }

  else {

    set.delete(
      lesson
    );

  }


  state.progress[
    subjectId
  ] = [

    ...set

  ].sort(
    (
      a,
      b
    ) =>
      a - b
  );


  saveJson(
    STORAGE.progress,
    state.progress
  );


  recordEvent(

    subjectId,

    lesson,

    checked
      ? 1
      : -1

  );


  state.lastAction = {

    subjectId,

    lesson,

    previous:
      wasChecked

  };


  /*
   * Atualiza o que estudar hoje,
   * final de semana automático
   * e dashboard filtrado.
   */

  renderToday();

  renderWeek();

  renderFilteredDashboard();


  if (
    options.toast
  ) {

    showToast(

      `${subject.name}: Aula ${lesson} ${
        checked
          ? "concluída"
          : "desmarcada"
      }.`

    );

  }

}


/* =========================================================
   ABRIR / FECHAR AULAS
========================================================= */

function toggleLessonPanel(
  subjectId
) {

  if (
    state.openLessons
      .has(
        subjectId
      )
  ) {

    state.openLessons
      .delete(
        subjectId
      );

  }

  else {

    state.openLessons
      .add(
        subjectId
      );

  }


  renderDisciplines(
    filteredSubjects()
  );

}


/* =========================================================
   HISTÓRICO
========================================================= */

function recordEvent(
  subjectId,
  lesson,
  delta
) {

  state.events.push({

    subjectId,

    lesson,

    delta,

    timestamp:
      new Date()
        .toISOString()

  });


  /*
   * Guarda apenas os últimos
   * 120 dias de eventos.
   */

  const cutoff =

    Date.now()

    -

    (
      120
      *
      24
      *
      60
      *
      60
      *
      1000
    );


  state.events =
    state.events.filter(
      event =>

        new Date(
          event.timestamp
        ).getTime()

        >=

        cutoff
    );


  saveJson(
    STORAGE.events,
    state.events
  );

}


/* =========================================================
   CONTAGEM DE EVENTOS
========================================================= */

function countEventsSince(
  days,
  subjectIds = null
) {

  const cutoff =
    new Date();


  cutoff.setHours(
    0,
    0,
    0,
    0
  );


  cutoff.setDate(

    cutoff.getDate()

    -

    (
      days - 1
    )

  );


  return state.events

    .filter(
      event => {

        const eventDate =
          new Date(
            event.timestamp
          );


        const dateOk =

          eventDate >=
          cutoff;


        const subjectOk =

          !subjectIds

          ||

          subjectIds.has(
            event.subjectId
          );


        return (

          dateOk
          &&
          subjectOk

        );

      }
    )

    .reduce(
      (
        sum,
        event
      ) =>

        sum +
        event.delta,

      0
    );

}


/* =========================================================
   SEMANA
========================================================= */

function renderWeek() {

  const today =
    getDayKey();


  el(
    "weekGrid"
  ).innerHTML =

    DAY_KEYS

      .map(
        day => {

          const subjects =
            subjectsForDay(
              day
            );


          const dynamic =

            day === "sabado"

            ||

            day === "domingo";


          return `

            <article

              class="
                day-card
                ${
                  day === today
                    ? "is-today"
                    : ""
                }
              "

            >


              <div
                class="
                  day-card__name
                "
              >


                <span>

                  ${
                    DAY_LABELS[
                      day
                    ]
                  }

                </span>


                ${
                  day === today

                    ? `
                      <small>
                        HOJE
                      </small>
                    `

                    : dynamic

                      ? `
                        <small>
                          AUTO
                        </small>
                      `

                      : ""
                }


              </div>


              ${
                subjects.length

                  ?

                  subjects

                    .map(
                      subject => `

                        <div
                          class="
                            day-subject
                          "
                        >

                          <span>

                            ${
                              escapeHtml(
                                subject.theme
                              )
                            }

                            ·

                            ${
                              percent(
                                subject
                              )
                            }%

                          </span>


                          <strong>

                            ${
                              escapeHtml(
                                subject.name
                              )
                            }

                          </strong>

                        </div>

                      `
                    )

                    .join("")

                  :

                  `

                    <p
                      class="
                        day-card__empty
                      "
                    >

                      Sem disciplina definida.

                    </p>

                  `
              }


            </article>

          `;

        }
      )

      .join("");

}


/* =========================================================
   CHART.JS
========================================================= */

function destroyChart(
  key
) {

  if (
    state.charts[
      key
    ]
  ) {

    state.charts[
      key
    ].destroy();


    delete state.charts[
      key
    ];

  }

}


/* =========================================================
   RENDER GRÁFICOS
========================================================= */

function renderCharts(
  subjects =
    filteredSubjects()
) {

  if (
    typeof Chart ===
    "undefined"
  ) {

    console.warn(
      "Chart.js não foi carregado."
    );

    return;

  }


  Chart.defaults
    .font
    .family =

      '"DM Sans", system-ui, sans-serif';


  Chart.defaults
    .color =

      "#777180";


  Chart.defaults
    .animation
    .duration =

      220;


  renderOverallChart(
    subjects
  );


  renderThemeChart(
    subjects
  );


  renderDisciplineChart(
    subjects
  );


  renderPaceChart(
    subjects
  );

}


/* =========================================================
   GRÁFICO GERAL
========================================================= */

function renderOverallChart(
  subjects =
    filteredSubjects()
) {

  const summary =
    totals(
      subjects
    );


  destroyChart(
    "overall"
  );


  state.charts.overall =
    new Chart(

      el(
        "overallChart"
      ),

      {

        type:
          "doughnut",


        data: {

          labels: [

            "Concluído",

            "Restante"

          ],


          datasets: [

            {

              data: [

                summary.done,

                summary.remaining

              ],


              backgroundColor: [

                "#7657d8",

                "#ece9f1"

              ],


              borderWidth:
                0,


              hoverOffset:
                2

            }

          ]

        },


        options: {

          responsive:
            true,


          maintainAspectRatio:
            false,


          cutout:
            "76%",


          plugins: {

            legend: {

              display:
                false

            },


            tooltip: {

              callbacks: {

                label:
                  context =>

                    ` ${context.label}: ${context.raw} aulas`

              }

            }

          }

        }

      }

    );

}


/* =========================================================
   GRÁFICO POR TEMA
========================================================= */

function renderThemeChart(
  subjects =
    filteredSubjects()
) {

  const grouped =
    {};


  subjects.forEach(
    subject => {

      if (
        !grouped[
          subject.theme
        ]
      ) {

        grouped[
          subject.theme
        ] = {

          done:
            0,

          total:
            0

        };

      }


      grouped[
        subject.theme
      ].done +=

        completedCount(
          subject
        );


      grouped[
        subject.theme
      ].total +=

        subject.total;

    }
  );


  const labels =
    Object.keys(
      grouped
    );


  const data =
    labels.map(
      label => {

        const item =
          grouped[
            label
          ];


        return item.total

          ?

          Math.round(

            (
              item.done
              /
              item.total
            )
            *
            100

          )

          :

          0;

      }
    );


  destroyChart(
    "theme"
  );


  state.charts.theme =
    new Chart(

      el(
        "themeChart"
      ),

      {

        type:
          "bar",


        data: {

          labels,


          datasets: [

            {

              data,


              backgroundColor:

                labels.map(
                  (
                    _,
                    index
                  ) =>

                    [
                      "#7657d8",
                      "#8f78dc",
                      "#a897ed"
                    ][
                      index % 3
                    ]
                ),


              borderRadius:
                9,


              borderSkipped:
                false,


              maxBarThickness:
                48

            }

          ]

        },


        options: {

          responsive:
            true,


          maintainAspectRatio:
            false,


          plugins: {

            legend: {

              display:
                false

            },


            tooltip: {

              callbacks: {

                label:
                  context =>

                    ` ${context.raw}% concluído`

              }

            }

          },


          scales: {

            y: {

              beginAtZero:
                true,


              max:
                100,


              grid: {

                color:
                  "rgba(45,37,70,.06)"

              },


              border: {

                display:
                  false

              },


              ticks: {

                callback:
                  value =>

                    `${value}%`

              }

            },


            x: {

              grid: {

                display:
                  false

              },


              border: {

                display:
                  false

              }

            }

          }

        }

      }

    );

}


/* =========================================================
   GRÁFICO POR DISCIPLINA
========================================================= */

function renderDisciplineChart(
  subjects =
    filteredSubjects()
) {

  const sorted = [

    ...subjects

  ].sort(

    (
      a,
      b
    ) =>

      percent(a)
      -
      percent(b)

      ||

      a.name.localeCompare(
        b.name,
        "pt-BR"
      )

  );


  destroyChart(
    "discipline"
  );


  state.charts.discipline =
    new Chart(

      el(
        "disciplineChart"
      ),

      {

        type:
          "bar",


        data: {

          labels:

            sorted.map(
              subject =>

                compactName(
                  subject.name
                )
            ),


          datasets: [

            {

              data:

                sorted.map(
                  subject =>

                    percent(
                      subject
                    )
                ),


              backgroundColor:

                sorted.map(
                  subject =>

                    percent(
                      subject
                    ) === 100

                      ? "#2d9a71"

                      : "#7657d8"
                ),


              borderRadius:
                8,


              borderSkipped:
                false,


              maxBarThickness:
                25

            }

          ]

        },


        options: {

          indexAxis:
            "y",


          responsive:
            true,


          maintainAspectRatio:
            false,


          plugins: {

            legend: {

              display:
                false

            },


            tooltip: {

              callbacks: {

                title:
                  items =>

                    sorted[
                      items[
                        0
                      ]?.dataIndex
                    ]?.name || "",


                label:
                  context =>

                    ` ${context.raw}% concluído`

              }

            }

          },


          scales: {

            x: {

              beginAtZero:
                true,


              max:
                100,


              grid: {

                color:
                  "rgba(45,37,70,.06)"

              },


              border: {

                display:
                  false

              },


              ticks: {

                callback:
                  value =>

                    `${value}%`

              }

            },


            y: {

              grid: {

                display:
                  false

              },


              border: {

                display:
                  false

              },


              ticks: {

                autoSkip:
                  false,


                font: {

                  size:
                    11

                }

              }

            }

          }

        }

      }

    );

}


/* =========================================================
   GRÁFICO DE RITMO
========================================================= */

function renderPaceChart(
  subjects =
    filteredSubjects()
) {

  const subjectIds =
    new Set(

      subjects.map(
        subject =>
          subject.id
      )

    );


  const days =
    Array.from(

      {
        length:
          14
      },

      (
        _,
        index
      ) => {

        const date =
          new Date();


        date.setHours(
          0,
          0,
          0,
          0
        );


        date.setDate(

          date.getDate()

          -

          (
            13 -
            index
          )

        );


        return date;

      }

    );


  const points =
    days.map(
      day => {

        const next =
          new Date(
            day
          );


        next.setDate(
          next.getDate() +
          1
        );


        return state.events

          .filter(
            event => {

              const time =
                new Date(
                  event.timestamp
                );


              return (

                time >=
                  day

                &&

                time <
                  next

                &&

                subjectIds.has(
                  event.subjectId
                )

              );

            }
          )

          .reduce(
            (
              sum,
              event
            ) =>

              sum +
              event.delta,

            0
          );

      }
    );


  destroyChart(
    "pace"
  );


  state.charts.pace =
    new Chart(

      el(
        "paceChart"
      ),

      {

        type:
          "line",


        data: {

          labels:

            days.map(
              date =>

                new Intl
                  .DateTimeFormat(

                    "pt-BR",

                    {

                      day:
                        "2-digit",

                      month:
                        "2-digit"

                    }

                  )
                  .format(
                    date
                  )
            ),


          datasets: [

            {

              data:
                points,


              borderColor:
                "#7657d8",


              backgroundColor:
                "rgba(118,87,216,.10)",


              fill:
                true,


              tension:
                0.35,


              pointRadius:
                3,


              pointHoverRadius:
                5,


              pointBackgroundColor:
                "#7657d8"

            }

          ]

        },


        options: {

          responsive:
            true,


          maintainAspectRatio:
            false,


          plugins: {

            legend: {

              display:
                false

            },


            tooltip: {

              callbacks: {

                label:
                  context =>

                    ` ${context.raw} aula${
                      Math.abs(
                        context.raw
                      ) === 1

                        ? ""

                        : "s"
                    }`

              }

            }

          },


          scales: {

            y: {

              beginAtZero:
                true,


              suggestedMax:
                4,


              grid: {

                color:
                  "rgba(45,37,70,.06)"

              },


              border: {

                display:
                  false

              },


              ticks: {

                precision:
                  0

              }

            },


            x: {

              grid: {

                display:
                  false

              },


              border: {

                display:
                  false

              },


              ticks: {

                maxRotation:
                  0,


                autoSkip:
                  true,


                maxTicksLimit:
                  7

              }

            }

          }

        }

      }

    );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
  message
) {

  clearTimeout(
    state.toastTimer
  );


  el(
    "toastMessage"
  ).textContent =

    message;


  el(
    "toast"
  ).classList.add(
    "is-visible"
  );


  state.toastTimer =
    setTimeout(
      () => {

        el(
          "toast"
        ).classList.remove(
          "is-visible"
        );

      },

      3800

    );

}


/* =========================================================
   DESFAZER
========================================================= */

function undoLastAction() {

  if (
    !state.lastAction
  ) {

    return;

  }


  const {

    subjectId,

    lesson,

    previous

  } =
    state.lastAction;


  const set =
    getCompletedSet(
      subjectId
    );


  if (
    previous
  ) {

    set.add(
      lesson
    );

  }

  else {

    set.delete(
      lesson
    );

  }


  state.progress[
    subjectId
  ] = [

    ...set

  ].sort(
    (
      a,
      b
    ) =>
      a - b
  );


  saveJson(
    STORAGE.progress,
    state.progress
  );


  recordEvent(

    subjectId,

    lesson,

    previous
      ? 1
      : -1

  );


  state.lastAction =
    null;


  el(
    "toast"
  ).classList.remove(
    "is-visible"
  );


  renderToday();

  renderWeek();

  renderFilteredDashboard();

}


/* =========================================================
   EVENTOS ESTÁTICOS
========================================================= */

function bindStaticEvents() {

  /*
   * ======================================================
   * FILTRO DE TEMA
   *
   * IMPORTANTE:
   * O evento está no container.
   *
   * Portanto renderFilters() pode
   * recriar os botões quantas vezes
   * quiser sem destruir o evento.
   * ======================================================
   */

  el(
    "themeFilters"
  ).addEventListener(

    "click",

    event => {

      const button =
        event.target.closest(
          '[data-filter-type="theme"]'
        );


      if (

        !button

        ||

        !el(
          "themeFilters"
        ).contains(
          button
        )

      ) {

        return;

      }


      toggleFilter(

        "theme",

        button.dataset.value

      );

    }

  );


  /*
   * ======================================================
   * FILTRO DE DIA
   * ======================================================
   */

  el(
    "dayFilters"
  ).addEventListener(

    "click",

    event => {

      const button =
        event.target.closest(
          '[data-filter-type="day"]'
        );


      if (

        !button

        ||

        !el(
          "dayFilters"
        ).contains(
          button
        )

      ) {

        return;

      }


      toggleFilter(

        "day",

        button.dataset.value

      );

    }

  );


  /*
   * ======================================================
   * CARDS DAS DISCIPLINAS
   *
   * Também usa delegation.
   * ======================================================
   */

  el(
    "disciplineGrid"
  ).addEventListener(

    "click",

    handleDisciplineAction

  );


  /*
   * ======================================================
   * BUSCA
   * ======================================================
   */

  el(
    "subjectSearch"
  ).addEventListener(

    "input",

    event => {

      state.filters.query =
        normalizeText(
          event.target.value
        );


      renderFilteredDashboard();

    }

  );


  /*
   * ======================================================
   * LIMPAR FILTROS
   * ======================================================
   */

  el(
    "clearFilters"
  ).addEventListener(

    "click",

    () => {

      state.filters
        .themes
        .clear();


      state.filters
        .days
        .clear();


      state.filters.query =
        "";


      el(
        "subjectSearch"
      ).value =
        "";


      renderFilters();

      renderFilteredDashboard();

    }

  );


  /*
   * ======================================================
   * VER PLANO DE HOJE
   * ======================================================
   */

  el(
    "focusTodayButton"
  ).addEventListener(

    "click",

    () => {

      /*
       * Limpa os dias anteriores.
       */

      state.filters
        .days
        .clear();


      /*
       * Seleciona o dia atual.
       */

      state.filters
        .days
        .add(
          getDayKey()
        );


      renderFilters();

      renderFilteredDashboard();


      el(
        "disciplinesSection"
      ).scrollIntoView(

        {

          behavior:
            "smooth",

          block:
            "start"

        }

      );

    }

  );


  /*
   * ======================================================
   * CONFIGURAÇÃO DA ROTINA
   * ======================================================
   */

  el(
    "settingsButton"
  ).addEventListener(

    "click",

    openScheduleDialog

  );


  el(
    "editScheduleButton"
  ).addEventListener(

    "click",

    openScheduleDialog

  );


  el(
    "saveScheduleButton"
  ).addEventListener(

    "click",

    saveScheduleFromDialog

  );


  /*
   * ======================================================
   * DESFAZER
   * ======================================================
   */

  el(
    "toastUndo"
  ).addEventListener(

    "click",

    undoLastAction

  );


  /*
   * ======================================================
   * RESET
   * ======================================================
   */

  el(
    "resetProgress"
  ).addEventListener(

    "click",

    resetProgress

  );


  /*
   * ======================================================
   * PLANILHA
   * ======================================================
   */

  el(
    "xlsxInput"
  ).addEventListener(

    "change",

    importSpreadsheet

  );

}


/* =========================================================
   MODAL ROTINA
========================================================= */

function openScheduleDialog() {

  renderScheduleEditor();


  el(
    "scheduleDialog"
  ).showModal();

}


/* =========================================================
   EDITOR DA ROTINA
========================================================= */

function renderScheduleEditor() {

  const workdays =
    DAY_KEYS.slice(
      0,
      5
    );


  el(
    "scheduleEditor"
  ).innerHTML =

    workdays

      .map(
        day => `

          <section
            class="
              schedule-editor__day
            "
          >

            <h3>

              ${
                DAY_LABELS[
                  day
                ]
              }

            </h3>


            ${
              state.subjects

                .map(
                  subject => `

                    <label
                      class="
                        schedule-option
                      "
                    >

                      <input

                        type="checkbox"

                        name="
                          schedule-${day}
                        "

                        value="${
                          subject.id
                        }"

                        ${
                          (
                            state.schedule[
                              day
                            ]
                            ||
                            []
                          ).includes(
                            subject.id
                          )

                            ? "checked"

                            : ""
                        }

                      />


                      <span>

                        ${
                          escapeHtml(
                            subject.name
                          )
                        }

                      </span>

                    </label>

                  `
                )

                .join("")
            }

          </section>

        `
      )

      .join("");

}


/* =========================================================
   SALVAR ROTINA
========================================================= */

function saveScheduleFromDialog(
  event
) {

  event.preventDefault();


  const next =
    {};


  DAY_KEYS

    .slice(
      0,
      5
    )

    .forEach(
      day => {

        next[
          day
        ] = [

          ...document.querySelectorAll(
            `input[name="schedule-${day}"]:checked`
          )

        ].map(
          input =>
            input.value
        );

      }
    );


  state.schedule =
    next;


  saveJson(
    STORAGE.schedule,
    state.schedule
  );


  el(
    "scheduleDialog"
  ).close();


  /*
   * Os dias associados às disciplinas
   * podem ter mudado.
   */

  renderFilters();

  renderAll();


  showToast(
    "Rotina semanal atualizada."
  );

}


/* =========================================================
   IMPORTAR PLANILHA
========================================================= */

async function importSpreadsheet(
  event
) {

  const file =
    event.target
      .files?.[
        0
      ];


  if (
    !file
  ) {

    return;

  }


  if (
    typeof XLSX ===
    "undefined"
  ) {

    showToast(
      "Não foi possível carregar o leitor de planilhas."
    );


    return;

  }


  try {

    const buffer =
      await file.arrayBuffer();


    const workbook =
      XLSX.read(

        buffer,

        {
          type:
            "array"
        }

      );


    const sheet =
      workbook.Sheets[
        workbook.SheetNames[
          0
        ]
      ];


    const rows =
      XLSX.utils.sheet_to_json(

        sheet,

        {
          defval:
            ""
        }

      );


    const parsed =
      rows

        .map(
          row => {

            const name =
              String(

                row[
                  "Disciplina"
                ]

                ??

                row[
                  "disciplina"
                ]

                ??

                ""

              ).trim();


            const theme =
              String(

                row[
                  "Tema"
                ]

                ??

                row[
                  "tema"
                ]

                ??

                ""

              ).trim();


            const total =
              Number(

                row[
                  "Aulas totais"
                ]

                ??

                row[
                  "Aulas Totais"
                ]

                ??

                row[
                  "aulas totais"
                ]

                ??

                0

              );


            return {

              id:
                slugify(
                  name
                ),

              name,

              theme,

              total:
                Math.max(

                  0,

                  Math.floor(
                    total
                  )

                )

            };

          }
        )

        .filter(
          subject =>

            subject.name

            &&

            subject.theme

            &&

            subject.total >
              0
        );


    if (
      !parsed.length
    ) {

      throw new Error(
        "Formato inválido"
      );

    }


    state.subjects =
      parsed;


    state.openLessons
      .clear();


    saveJson(
      STORAGE.subjects,
      state.subjects
    );


    normalizeProgress();


    sanitizeSchedule();


    /*
     * Reseta os filtros após importar.
     */

    state.filters
      .themes
      .clear();


    state.filters
      .days
      .clear();


    state.filters.query =
      "";


    el(
      "subjectSearch"
    ).value =
      "";


    renderFilters();

    renderAll();


    showToast(

      `${parsed.length} disciplinas importadas da planilha.`

    );

  }

  catch (error) {

    console.error(
      error
    );


    showToast(

      "Planilha inválida. Use as colunas Disciplina, Tema e Aulas totais."

    );

  }

  finally {

    event.target.value =
      "";

  }

}


/* =========================================================
   LIMPAR ROTINA INVÁLIDA
========================================================= */

function sanitizeSchedule() {

  const ids =
    new Set(

      state.subjects.map(
        subject =>
          subject.id
      )

    );


  const next =
    {};


  DAY_KEYS

    .slice(
      0,
      5
    )

    .forEach(
      day => {

        next[
          day
        ] = (

          state.schedule[
            day
          ]

          ||

          []

        ).filter(
          id =>
            ids.has(
              id
            )
        );

      }
    );


  state.schedule =
    next;


  saveJson(
    STORAGE.schedule,
    state.schedule
  );

}


/* =========================================================
   RESET PROGRESSO
========================================================= */

function resetProgress() {

  const confirmed =
    window.confirm(

      "Zerar todo o progresso e o histórico de ritmo? Essa ação não pode ser desfeita."

    );


  if (
    !confirmed
  ) {

    return;

  }


  state.progress =
    {};


  state.events =
    [];


  state.lastAction =
    null;


  saveJson(
    STORAGE.progress,
    state.progress
  );


  saveJson(
    STORAGE.events,
    state.events
  );


  normalizeProgress();


  renderAll();


  showToast(
    "Progresso zerado."
  );

}


/* =========================================================
   INICIAR
========================================================= */

init();
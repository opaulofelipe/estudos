"use strict";


/* =========================================================
   DADOS PADRÃO
========================================================= */

const DEFAULT_SUBJECTS = [

  {
    name: "Arte Cinematográfica",
    theme: "Cinema",
    total: 33,
    days: []
  },

  {
    name: "Aspectos Cinematográficos",
    theme: "Cinema",
    total: 17,
    days: []
  },

  {
    name: "História do Cinema",
    theme: "Cinema",
    total: 27,
    days: []
  },

  {
    name: "Crítica Cinematográfica",
    theme: "Cinema",
    total: 18,
    days: []
  },

  {
    name: "Teoria Historiográfica",
    theme: "História",
    total: 33,
    days: []
  },

  {
    name: "Teoria Historiográfica Brasileira",
    theme: "História",
    total: 29,
    days: []
  },

  {
    name: "Pré-História",
    theme: "História",
    total: 17,
    days: []
  },

  {
    name: "Filosofia na Antiguidade Europeia",
    theme: "Filosofia",
    total: 35,
    days: []
  },

  {
    name: "Filosofia na Antiguidade Asiática",
    theme: "Filosofia",
    total: 15,
    days: []
  },

  {
    name: "Filosofia Africana",
    theme: "Filosofia",
    total: 48,
    days: []
  }

].map(
  subject => ({
    ...subject,
    id: slugify(subject.name)
  })
);


/* =========================================================
   ROTINA PADRÃO
========================================================= */

const FALLBACK_WEEK_PLAN = {

  segunda: [
    "Arte Cinematográfica",
    "Teoria Historiográfica"
  ],

  terca: [
    "Filosofia Africana",
    "Aspectos Cinematográficos"
  ],

  quarta: [
    "História do Cinema",
    "Filosofia na Antiguidade Europeia"
  ],

  quinta: [
    "Crítica Cinematográfica"
  ],

  sexta: [
    "Pré-História",
    "Filosofia na Antiguidade Asiática"
  ],

  sabado: [
    "Teoria Historiográfica Brasileira"
  ],

  domingo: []

};


/* =========================================================
   STORAGE
========================================================= */

const STORAGE = {

  dataset:
    "studyDashboard.dataset.v3",

  progress:
    "studyDashboard.progress.v3"

};


/* =========================================================
   ESTADO
========================================================= */

const state = {

  subjects:
    loadJSON(
      STORAGE.dataset,
      DEFAULT_SUBJECTS
    ),

  progress:
    loadJSON(
      STORAGE.progress,
      {}
    ),

  openSubjects:
    new Set(),

  themeCharts:
    [],

  subjectCharts:
    [],

  lastAction:
    null,

  toastTimer:
    null

};


const $ = id =>
  document.getElementById(id);


/* =========================================================
   STORAGE
========================================================= */

function clone(value) {

  return JSON.parse(
    JSON.stringify(value)
  );

}


function loadJSON(
  key,
  fallback
) {

  try {

    const raw =
      localStorage.getItem(key);


    return raw
      ? JSON.parse(raw)
      : clone(fallback);

  } catch (error) {

    return clone(fallback);

  }

}


function saveJSON(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  } catch (error) {

    console.warn(
      "Não foi possível salvar.",
      error
    );

  }

}


/* =========================================================
   TEXTO
========================================================= */

function normalizeText(value) {

  return String(
    value ?? ""
  )

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .toLocaleLowerCase(
      "pt-BR"
    )

    .trim();

}


function slugify(value) {

  return normalizeText(value)

    .replace(
      /[^a-z0-9]+/g,
      "-"
    )

    .replace(
      /^-|-$/g,
      ""
    );

}


function escapeHTML(value) {

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


/* =========================================================
   PROGRESSO
========================================================= */

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
    subject.total,
    getCompletedSet(
      subject.id
    ).size
  );

}


function remainingCount(
  subject
) {

  return Math.max(
    0,
    subject.total -
    completedCount(subject)
  );

}


function percentage(
  subject
) {

  if (!subject.total) {
    return 0;
  }


  return Math.round(
    (
      completedCount(subject) /
      subject.total
    ) * 100
  );

}


function totals(
  subjects = state.subjects
) {

  const total =
    subjects.reduce(
      (sum, subject) =>
        sum + subject.total,
      0
    );


  const completed =
    subjects.reduce(
      (sum, subject) =>
        sum +
        completedCount(subject),
      0
    );


  return {

    total,

    completed,

    remaining:
      Math.max(
        0,
        total - completed
      ),

    percentage:
      total
        ? Math.round(
            (
              completed /
              total
            ) * 100
          )
        : 0

  };

}


/* =========================================================
   CORES PASTÉIS DINÂMICAS
========================================================= */

function hashString(value) {

  let hash = 0;

  const text =
    normalizeText(value);


  for (
    let index = 0;
    index < text.length;
    index++
  ) {

    hash =
      (
        hash * 31 +
        text.charCodeAt(index)
      ) | 0;

  }


  return Math.abs(hash);

}


/*
 * Cada tema recebe um hue estável.
 *
 * Se for criado "Sociologia" na planilha,
 * por exemplo, receberá automaticamente
 * uma nova cor.
 */

function getThemeHue(theme) {

  return (
    hashString(theme) %
    360
  );

}


function themeColor(theme) {

  const hue =
    getThemeHue(theme);


  return `hsl(${hue} 48% 72%)`;

}


/*
 * As disciplinas herdam a região cromática
 * do tema, mas recebem pequenas variações.
 *
 * Assim disciplinas do mesmo tema parecem
 * relacionadas sem ficarem idênticas.
 */

function subjectColor(subject) {

  const baseHue =
    getThemeHue(
      subject.theme
    );


  const variation =
    (
      hashString(
        subject.name
      ) % 37
    ) - 18;


  const hue =
    (
      baseHue +
      variation +
      360
    ) % 360;


  const lightness =
    69 +
    (
      hashString(
        subject.name + "light"
      ) % 7
    );


  return `hsl(${hue} 48% ${lightness}%)`;

}


/* =========================================================
   DATA
========================================================= */

function getDayKey(
  date = new Date()
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


function dayLabel(day) {

  return {

    domingo:
      "Domingo",

    segunda:
      "Segunda-feira",

    terca:
      "Terça-feira",

    quarta:
      "Quarta-feira",

    quinta:
      "Quinta-feira",

    sexta:
      "Sexta-feira",

    sabado:
      "Sábado"

  }[day] || day;

}


function formatDate(
  date = new Date()
) {

  const text =
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
    ).format(date);


  return (
    text.charAt(0)
      .toUpperCase() +
    text.slice(1)
  );

}


/* =========================================================
   PRÓXIMA AULA
========================================================= */

function nextLesson(subject) {

  const completed =
    getCompletedSet(
      subject.id
    );


  for (
    let lesson = 1;
    lesson <= subject.total;
    lesson++
  ) {

    if (
      !completed.has(lesson)
    ) {
      return lesson;
    }

  }


  return null;

}


/* =========================================================
   DIA NA PLANILHA
========================================================= */

function normalizeDay(value) {

  const text =
    normalizeText(value);


  if (
    text.startsWith("seg")
  ) return "segunda";


  if (
    text.startsWith("ter")
  ) return "terca";


  if (
    text.startsWith("qua")
  ) return "quarta";


  if (
    text.startsWith("qui")
  ) return "quinta";


  if (
    text.startsWith("sex")
  ) return "sexta";


  if (
    text.startsWith("sab")
  ) return "sabado";


  if (
    text.startsWith("dom")
  ) return "domingo";


  return "";

}


function parseDays(value) {

  if (!value) {
    return [];
  }


  return String(value)

    .split(
      /[,;|/]+/
    )

    .map(
      normalizeDay
    )

    .filter(Boolean);

}


/* =========================================================
   PLANILHA
========================================================= */

function readCell(
  row,
  candidates
) {

  for (
    const candidate
    of candidates
  ) {

    const value =
      row[candidate];


    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {

      return value;

    }

  }


  return "";

}


function rowsToSubjects(rows) {

  return rows

    .map(
      row => {

        let name =
          String(
            readCell(
              row,
              [
                "Disciplina",
                "disciplina"
              ]
            )
          ).trim();


        if (
          name ===
          "Critícia Cinematográfica"
        ) {

          name =
            "Crítica Cinematográfica";

        }


        const theme =
          String(
            readCell(
              row,
              [
                "Tema",
                "tema"
              ]
            )
          ).trim();


        const total =
          Number(
            readCell(
              row,
              [
                "Aulas totais",
                "Aulas Totais",
                "aulas totais",
                "Total"
              ]
            )
          );


        const days =
          parseDays(
            readCell(
              row,
              [
                "Dia",
                "Dias",
                "Dia da semana",
                "dia",
                "dias"
              ]
            )
          );


        return {

          id:
            slugify(name),

          name,

          theme,

          total:
            Math.max(
              0,
              Math.floor(
                total || 0
              )
            ),

          days

        };

      }
    )

    .filter(
      subject =>
        subject.name &&
        subject.theme &&
        subject.total > 0
    );

}


function parseWorkbook(
  buffer
) {

  if (
    typeof XLSX ===
    "undefined"
  ) {

    throw new Error(
      "XLSX indisponível."
    );

  }


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
      workbook.SheetNames[0]
    ];


  const rows =
    XLSX.utils
      .sheet_to_json(
        sheet,
        {
          defval: ""
        }
      );


  const subjects =
    rowsToSubjects(rows);


  if (
    !subjects.length
  ) {

    throw new Error(
      "Nenhuma disciplina encontrada."
    );

  }


  return subjects;

}


/* =========================================================
   NORMALIZA PROGRESSO
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
        !validIds.has(id)
      ) {

        delete state.progress[id];

      }

    }
  );


  state.subjects.forEach(
    subject => {

      state.progress[
        subject.id
      ] =
        [
          ...getCompletedSet(
            subject.id
          )
        ]

          .map(Number)

          .filter(
            lesson =>
              Number.isInteger(
                lesson
              ) &&
              lesson >= 1 &&
              lesson <=
                subject.total
          )

          .sort(
            (a, b) =>
              a - b
          );

    }
  );


  saveJSON(
    STORAGE.progress,
    state.progress
  );

}


/* =========================================================
   CARREGAR XLSX DA RAIZ
========================================================= */

async function tryLoadSpreadsheet() {

  if (
    typeof XLSX ===
    "undefined"
  ) {

    return;

  }


  try {

    const response =
      await fetch(
        "./Estudos.xlsx",
        {
          cache:
            "no-store"
        }
      );


    if (
      !response.ok
    ) {

      return;

    }


    const buffer =
      await response
        .arrayBuffer();


    const subjects =
      parseWorkbook(buffer);


    state.subjects =
      subjects;


    normalizeProgress();


    saveJSON(
      STORAGE.dataset,
      subjects
    );


    renderAll();


    $(
      "dataStatus"
    ).textContent =
      "Dados sincronizados com Estudos.xlsx.";

  } catch (error) {

    console.info(
      "Planilha da raiz não carregada."
    );

  }

}


/* =========================================================
   IMPORTAÇÃO MANUAL
========================================================= */

async function importSpreadsheet(
  event
) {

  const file =
    event.target.files?.[0];


  if (!file) {
    return;
  }


  try {

    const buffer =
      await file
        .arrayBuffer();


    const subjects =
      parseWorkbook(buffer);


    state.subjects =
      subjects;


    state.openSubjects
      .clear();


    normalizeProgress();


    saveJSON(
      STORAGE.dataset,
      subjects
    );


    renderAll();


    $(
      "dataStatus"
    ).textContent =
      `Planilha: ${file.name}`;


    showToast(
      "Planilha atualizada.",
      false
    );

  } catch (error) {

    console.error(error);


    showToast(
      "Não foi possível ler a planilha.",
      false
    );

  }


  event.target.value =
    "";

}


/* =========================================================
   HOJE
========================================================= */

function subjectsForToday() {

  const day =
    getDayKey();


  /*
   * Se a própria planilha possuir
   * coluna Dia/Dias, ela tem prioridade.
   */

  const scheduled =
    state.subjects.filter(
      subject =>
        Array.isArray(
          subject.days
        ) &&
        subject.days.includes(day)
    );


  if (
    scheduled.length
  ) {

    return scheduled;

  }


  const names =
    FALLBACK_WEEK_PLAN[
      day
    ] || [];


  if (
    names.length
  ) {

    const normalized =
      new Set(
        names.map(
          normalizeText
        )
      );


    return state.subjects.filter(
      subject =>
        normalized.has(
          normalizeText(
            subject.name
          )
        )
    );

  }


  /*
   * Domingo sem programação:
   * disciplina menos avançada.
   */

  return [
    ...state.subjects
  ]

    .filter(
      subject =>
        remainingCount(
          subject
        ) > 0
    )

    .sort(
      (a, b) =>
        percentage(a) -
          percentage(b) ||
        remainingCount(b) -
          remainingCount(a)
    )

    .slice(
      0,
      1
    );

}


function renderToday() {

  const day =
    getDayKey();


  const subjects =
    subjectsForToday();


  const today =
    document.querySelector(
      ".today"
    );


  if (
    !subjects.length
  ) {

    $(
      "todayTitle"
    ).textContent =
      "Dia livre";


    $(
      "todayDescription"
    ).textContent =
      "Nenhuma disciplina programada para hoje.";


    $(
      "todayAction"
    ).innerHTML =
      "";


    return;

  }


  const primary =
    subjects.find(
      subject =>
        nextLesson(subject) !==
        null
    ) || subjects[0];


  const color =
    subjectColor(primary);


  today.style.setProperty(
    "--today-color",
    color
  );


  $(
    "todayTitle"
  ).textContent =
    subjects
      .map(
        subject =>
          subject.name
      )
      .join(" + ");


  const lesson =
    nextLesson(primary);


  if (
    lesson === null
  ) {

    $(
      "todayDescription"
    ).textContent =
      `${dayLabel(day)} · conteúdo previsto já concluído.`;


    $(
      "todayAction"
    ).innerHTML =
      `
        <button
          class="today-button"
          disabled
        >
          Concluído
        </button>
      `;


    return;

  }


  $(
    "todayDescription"
  ).textContent =
    `${dayLabel(day)} · próxima aula: ${lesson} de ${primary.total}.`;


  $(
    "todayAction"
  ).innerHTML =
    `
      <button
        type="button"
        class="today-button"
        id="todayButton"
      >
        Marcar próxima aula
      </button>
    `;


  $(
    "todayButton"
  ).addEventListener(
    "click",
    () => {

      addNextLesson(
        primary.id
      );

    }
  );

}


/* =========================================================
   RESUMO
========================================================= */

function renderSummary() {

  const summary =
    totals();


  $(
    "overallPercent"
  ).textContent =
    `${summary.percentage}%`;


  $(
    "globalProgressBar"
  ).style.width =
    `${summary.percentage}%`;


  $(
    "overallDescription"
  ).textContent =
    `${summary.completed} de ${summary.total} aulas concluídas`;


  $(
    "completedTotal"
  ).textContent =
    summary.completed
      .toLocaleString(
        "pt-BR"
      );


  $(
    "remainingTotal"
  ).textContent =
    summary.remaining
      .toLocaleString(
        "pt-BR"
      );

}


/* =========================================================
   AGRUPAMENTO POR TEMA
========================================================= */

function themeGroups() {

  const groups =
    new Map();


  state.subjects.forEach(
    subject => {

      if (
        !groups.has(
          subject.theme
        )
      ) {

        groups.set(
          subject.theme,
          []
        );

      }


      groups
        .get(subject.theme)
        .push(subject);

    }
  );


  return [
    ...groups.entries()
  ].sort(
    (
      [themeA],
      [themeB]
    ) =>
      themeA.localeCompare(
        themeB,
        "pt-BR"
      )
  );

}


/* =========================================================
   CHART BASE
========================================================= */

function createRingChart(
  canvas,
  completed,
  remaining,
  color
) {

  return new Chart(
    canvas,
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
              completed,
              remaining
            ],

            backgroundColor: [
              color,
              "#292a2e"
            ],

            borderWidth: 0,

            hoverOffset: 2

          }
        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio:
          false,

        cutout:
          "79%",

        animation: {
          duration: 260
        },

        plugins: {

          legend: {
            display: false
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
   TEMAS
========================================================= */

function destroyThemeCharts() {

  state.themeCharts
    .forEach(
      chart =>
        chart.destroy()
    );


  state.themeCharts =
    [];

}


function renderThemes() {

  destroyThemeCharts();


  const groups =
    themeGroups();


  $(
    "themeGrid"
  ).innerHTML =
    groups
      .map(
        (
          [theme, subjects],
          index
        ) => {

          const summary =
            totals(subjects);


          const color =
            themeColor(theme);


          return `

            <article
              class="theme-card"
              style="
                --item-color:${color}
              "
            >

              <div class="ring">

                <canvas
                  id="themeChart-${index}"
                  aria-label="${escapeHTML(
                    theme
                  )}: ${summary.percentage}% concluído"
                ></canvas>

                <div class="ring__value">

                  <strong>
                    ${summary.percentage}%
                  </strong>

                </div>

              </div>


              <div class="theme-card__text">

                <h3>

                  <span
                    class="color-dot"
                  ></span>

                  ${escapeHTML(theme)}

                </h3>

                <p>
                  ${summary.completed} de
                  ${summary.total} aulas
                </p>

                <p>
                  ${subjects.length}
                  ${
                    subjects.length === 1
                      ? "disciplina"
                      : "disciplinas"
                  }
                </p>

              </div>

            </article>

          `;

        }
      )
      .join("");


  if (
    typeof Chart ===
    "undefined"
  ) {

    return;

  }


  groups.forEach(
    (
      [theme, subjects],
      index
    ) => {

      const summary =
        totals(subjects);


      const chart =
        createRingChart(

          $(
            `themeChart-${index}`
          ),

          summary.completed,

          summary.remaining,

          themeColor(theme)

        );


      state.themeCharts
        .push(chart);

    }
  );

}


/* =========================================================
   DISCIPLINAS
========================================================= */

function destroySubjectCharts() {

  state.subjectCharts
    .forEach(
      chart =>
        chart.destroy()
    );


  state.subjectCharts =
    [];

}


function lessonTemplate(subject) {

  const completed =
    getCompletedSet(
      subject.id
    );


  const color =
    subjectColor(subject);


  return `

    <div
      class="lesson-panel"
      style="
        --item-color:${color}
      "
    >

      <p>
        Clique em uma aula para marcar ou desmarcar.
      </p>

      <div class="lesson-grid">

        ${
          Array.from(
            {
              length:
                subject.total
            },
            (_, index) =>
              index + 1
          )

            .map(
              lesson => `

                <button

                  type="button"

                  class="
                    lesson
                    ${
                      completed.has(
                        lesson
                      )
                        ? "is-complete"
                        : ""
                    }
                  "

                  data-action="lesson"

                  data-subject-id="${
                    subject.id
                  }"

                  data-lesson="${
                    lesson
                  }"

                >

                  ${lesson}

                </button>

              `
            )

            .join("")
        }

      </div>

    </div>

  `;

}


function subjectTemplate(
  subject,
  index
) {

  const completed =
    completedCount(subject);


  const remaining =
    remainingCount(subject);


  const percent =
    percentage(subject);


  const color =
    subjectColor(subject);


  const open =
    state.openSubjects.has(
      subject.id
    );


  const finished =
    remaining === 0;


  return `

    <article
      class="subject-card"
      style="
        --item-color:${color}
      "
    >

      <div class="subject-card__main">

        <div class="subject-ring">

          <canvas
            id="subjectChart-${index}"
            aria-label="${escapeHTML(
              subject.name
            )}: ${percent}% concluído"
          ></canvas>

          <div class="subject-ring__value">

            <strong>
              ${percent}%
            </strong>

            <span>
              concluído
            </span>

          </div>

        </div>


        <div class="subject-card__content">

          <span class="subject-theme">

            <span
              class="color-dot"
            ></span>

            ${escapeHTML(
              subject.theme
            )}

          </span>


          <h3>
            ${escapeHTML(
              subject.name
            )}
          </h3>


          <div class="subject-meta">

            ${completed}
            de
            ${subject.total}
            aulas

            ·

            ${remaining}
            restantes

          </div>


          <div
            class="subject-progress"
          >

            <span
              style="
                width:${percent}%
              "
            ></span>

          </div>


          <div class="subject-actions">

            <button
              type="button"
              class="action-small"
              data-action="minus"
              data-subject-id="${
                subject.id
              }"
              ${
                completed === 0
                  ? "disabled"
                  : ""
              }
            >
              −
            </button>


            <button
              type="button"
              class="action-primary"
              data-action="plus"
              data-subject-id="${
                subject.id
              }"
              ${
                finished
                  ? "disabled"
                  : ""
              }
            >
              ${
                finished
                  ? "Concluída"
                  : "+1 aula"
              }
            </button>


            <button
              type="button"
              class="action-small"
              data-action="plus"
              data-subject-id="${
                subject.id
              }"
              ${
                finished
                  ? "disabled"
                  : ""
              }
            >
              +
            </button>


            <button
              type="button"
              class="action-details"
              data-action="details"
              data-subject-id="${
                subject.id
              }"
            >
              ${
                open
                  ? "Ocultar"
                  : "Ver aulas"
              }
            </button>

          </div>

        </div>

      </div>


      ${
        open
          ? lessonTemplate(
              subject
            )
          : ""
      }

    </article>

  `;

}


function renderSubjects() {

  destroySubjectCharts();


  $(
    "subjectCount"
  ).textContent =
    `${state.subjects.length} ${
      state.subjects.length === 1
        ? "disciplina"
        : "disciplinas"
    }`;


  $(
    "subjectGrid"
  ).innerHTML =
    state.subjects
      .map(
        subjectTemplate
      )
      .join("");


  /*
   * Eventos são associados novamente
   * após cada renderização.
   */

  $(
    "subjectGrid"
  )

    .querySelectorAll(
      "[data-action]"
    )

    .forEach(
      button => {

        button.addEventListener(
          "click",
          handleSubjectAction
        );

      }
    );


  if (
    typeof Chart ===
    "undefined"
  ) {

    return;

  }


  state.subjects.forEach(
    (
      subject,
      index
    ) => {

      const chart =
        createRingChart(

          $(
            `subjectChart-${index}`
          ),

          completedCount(subject),

          remainingCount(subject),

          subjectColor(subject)

        );


      state.subjectCharts
        .push(chart);

    }
  );

}


/* =========================================================
   CLIQUES
========================================================= */

function handleSubjectAction(
  event
) {

  const button =
    event.currentTarget;


  const action =
    button.dataset.action;


  const subjectId =
    button.dataset.subjectId;


  if (
    action === "plus"
  ) {

    addNextLesson(
      subjectId
    );


    return;

  }


  if (
    action === "minus"
  ) {

    removeLastLesson(
      subjectId
    );


    return;

  }


  if (
    action === "details"
  ) {

    if (
      state.openSubjects.has(
        subjectId
      )
    ) {

      state.openSubjects.delete(
        subjectId
      );

    } else {

      state.openSubjects.add(
        subjectId
      );

    }


    renderSubjects();


    return;

  }


  if (
    action === "lesson"
  ) {

    const lesson =
      Number(
        button.dataset.lesson
      );


    const completed =
      getCompletedSet(
        subjectId
      ).has(
        lesson
      );


    setLesson(
      subjectId,
      lesson,
      !completed
    );

  }

}


/* =========================================================
   MARCAR AULA
========================================================= */

function setLesson(
  subjectId,
  lesson,
  completed,
  options = {}
) {

  const subject =
    state.subjects.find(
      item =>
        item.id === subjectId
    );


  if (
    !subject ||
    !Number.isInteger(lesson) ||
    lesson < 1 ||
    lesson > subject.total
  ) {

    return;

  }


  const set =
    getCompletedSet(
      subjectId
    );


  const previous =
    set.has(lesson);


  if (
    previous === completed
  ) {

    return;

  }


  if (completed) {

    set.add(lesson);

  } else {

    set.delete(lesson);

  }


  state.progress[
    subjectId
  ] =
    [...set]
      .sort(
        (a, b) =>
          a - b
      );


  state.lastAction = {

    subjectId,

    lesson,

    previous

  };


  saveJSON(
    STORAGE.progress,
    state.progress
  );


  renderAll();


  if (
    options.toast !== false
  ) {

    showToast(
      `${subject.name}: aula ${lesson} ${
        completed
          ? "concluída"
          : "desmarcada"
      }.`
    );

  }

}


/* =========================================================
   +1
========================================================= */

function addNextLesson(
  subjectId
) {

  const subject =
    state.subjects.find(
      subject =>
        subject.id ===
        subjectId
    );


  if (!subject) {
    return;
  }


  const lesson =
    nextLesson(subject);


  if (
    lesson === null
  ) {

    return;

  }


  setLesson(
    subjectId,
    lesson,
    true
  );

}


/* =========================================================
   -1
========================================================= */

function removeLastLesson(
  subjectId
) {

  const lessons =
    [
      ...getCompletedSet(
        subjectId
      )
    ].sort(
      (a, b) =>
        b - a
    );


  const lesson =
    lessons[0];


  if (!lesson) {
    return;
  }


  setLesson(
    subjectId,
    lesson,
    false
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


  if (previous) {

    set.add(lesson);

  } else {

    set.delete(lesson);

  }


  state.progress[
    subjectId
  ] =
    [...set].sort(
      (a, b) =>
        a - b
    );


  state.lastAction =
    null;


  saveJSON(
    STORAGE.progress,
    state.progress
  );


  renderAll();

  hideToast();

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  allowUndo = true
) {

  clearTimeout(
    state.toastTimer
  );


  $(
    "toastMessage"
  ).textContent =
    message;


  $(
    "toastUndo"
  ).hidden =
    !allowUndo;


  $(
    "toast"
  ).classList.add(
    "is-visible"
  );


  state.toastTimer =
    setTimeout(
      hideToast,
      3500
    );

}


function hideToast() {

  $(
    "toast"
  ).classList.remove(
    "is-visible"
  );

}


/* =========================================================
   RESET
========================================================= */

function resetProgress() {

  const confirmed =
    window.confirm(
      "Deseja realmente zerar todo o progresso?"
    );


  if (!confirmed) {
    return;
  }


  state.progress = {};

  state.lastAction = null;

  state.openSubjects
    .clear();


  normalizeProgress();

  renderAll();


  showToast(
    "Progresso zerado.",
    false
  );

}


/* =========================================================
   RENDER
========================================================= */

function renderAll() {

  renderToday();

  renderSummary();

  renderThemes();

  renderSubjects();

}


/* =========================================================
   EVENTOS
========================================================= */

function bindEvents() {

  $(
    "xlsxInput"
  ).addEventListener(
    "change",
    importSpreadsheet
  );


  $(
    "toastUndo"
  ).addEventListener(
    "click",
    undoLastAction
  );


  $(
    "resetProgress"
  ).addEventListener(
    "click",
    resetProgress
  );

}


/* =========================================================
   INICIAR
========================================================= */

function init() {

  $(
    "currentDate"
  ).textContent =
    formatDate();


  normalizeProgress();

  bindEvents();

  renderAll();


  tryLoadSpreadsheet();

}


init();

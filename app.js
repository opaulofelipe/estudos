"use strict";


/* =========================================================
   DADOS INICIAIS

   Estes dados servem apenas como fallback.

   Quando estiver no GitHub Pages, o dashboard tentará
   abrir automaticamente:

   ./Estudos.xlsx

   Se a planilha existir na mesma pasta, ela passa a ser
   a fonte dos dados.
========================================================= */

const DEFAULT_SUBJECTS = [

  {
    name:
      "Arte Cinematográfica",

    theme:
      "Cinema",

    total:
      33,

    days:
      []
  },

  {
    name:
      "Aspectos Cinematográficos",

    theme:
      "Cinema",

    total:
      17,

    days:
      []
  },

  {
    name:
      "História do Cinema",

    theme:
      "Cinema",

    total:
      27,

    days:
      []
  },

  {
    name:
      "Crítica Cinematográfica",

    theme:
      "Cinema",

    total:
      18,

    days:
      []
  },

  {
    name:
      "Teoria Historiográfica",

    theme:
      "História",

    total:
      33,

    days:
      []
  },

  {
    name:
      "Teoria Historiográfica Brasileira",

    theme:
      "História",

    total:
      29,

    days:
      []
  },

  {
    name:
      "Pré-História",

    theme:
      "História",

    total:
      17,

    days:
      []
  },

  {
    name:
      "Filosofia na Antiguidade Europeia",

    theme:
      "Filosofia",

    total:
      35,

    days:
      []
  },

  {
    name:
      "Filosofia na Antiguidade Asiática",

    theme:
      "Filosofia",

    total:
      15,

    days:
      []
  },

  {
    name:
      "Filosofia Africana",

    theme:
      "Filosofia",

    total:
      48,

    days:
      []
  }

].map(
  subject => ({
    ...subject,

    id:
      slugify(
        subject.name
      )
  })
);


/* =========================================================
   PLANO SEMANAL PADRÃO

   Usado apenas quando a planilha NÃO possui
   uma coluna Dia ou Dias.

   SÁBADO:
   Teoria Historiográfica Brasileira
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
   LOCAL STORAGE
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

  themeColors:
    new Map(),

  themeCharts:
    [],

  remainingChart:
    null,

  lastAction:
    null,

  toastTimer:
    null

};


const $ = id =>
  document.getElementById(
    id
  );


/* =========================================================
   UTILITÁRIOS
========================================================= */

function clone(
  value
) {

  return JSON.parse(
    JSON.stringify(
      value
    )
  );

}


function loadJSON(
  key,
  fallback
) {

  try {

    const raw =
      localStorage.getItem(
        key
      );


    return raw

      ? JSON.parse(
          raw
        )

      : clone(
          fallback
        );

  }

  catch (error) {

    console.warn(
      `Falha ao carregar ${key}.`,
      error
    );


    return clone(
      fallback
    );

  }

}


function saveJSON(
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

    console.warn(
      `Falha ao salvar ${key}.`,
      error
    );

  }

}


function normalizeText(
  value
) {

  return String(
    value ?? ""
  )

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
  value
) {

  return normalizeText(
    value
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


function escapeHTML(
  value
) {

  return String(
    value
  )

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
    ]

    ||

    []

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


function percentage(
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


function remainingCount(
  subject
) {

  return Math.max(

    0,

    subject.total
    -
    completedCount(
      subject
    )

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

        sum
        +
        subject.total,

      0

    );


  const completed =
    subjects.reduce(

      (
        sum,
        subject
      ) =>

        sum
        +
        completedCount(
          subject
        ),

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
              completed
              /
              total
            )

            *

            100

          )

        : 0

  };

}


/* =========================================================
   DATA
========================================================= */

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


function getDayLabel(
  day
) {

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

  }[
    day
  ] || day;

}


function formatDate(
  date =
    new Date()
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

    ).format(
      date
    );


  return (

    text
      .charAt(0)
      .toUpperCase()

    +

    text.slice(
      1
    )

  );

}


/* =========================================================
   PRÓXIMA AULA
========================================================= */

function nextLesson(
  subject
) {

  const completed =
    getCompletedSet(
      subject.id
    );


  for (

    let lesson = 1;

    lesson <=
      subject.total;

    lesson += 1

  ) {

    if (
      !completed.has(
        lesson
      )
    ) {

      return lesson;

    }

  }


  return null;

}


/* =========================================================
   CORES DINÂMICAS DOS TEMAS
========================================================= */

function stringHash(
  value
) {

  let hash =
    0;


  const text =
    normalizeText(
      value
    );


  for (

    let i = 0;

    i < text.length;

    i += 1

  ) {

    hash =
      (
        (
          hash << 5
        )
        -
        hash
      )

      +

      text.charCodeAt(
        i
      );


    hash |=
      0;

  }


  return Math.abs(
    hash
  );

}


function hueDistance(
  a,
  b
) {

  const difference =
    Math.abs(
      a - b
    )
    %
    360;


  return Math.min(

    difference,

    360 -
    difference

  );

}


/*
 * Gera uma cor diferente para cada tema.
 *
 * Não existe uma lista fixa de temas.
 *
 * Portanto:
 * Cinema
 * História
 * Filosofia
 * Sociologia
 * Geografia
 * etc.
 *
 * funcionarão sem alterar o código.
 */

function buildThemeColors() {

  const themes = [

    ...new Set(

      state.subjects.map(
        subject =>
          subject.theme
      )

    )

  ]

    .filter(
      Boolean
    )

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


  const usedHues =
    [];


  const colors =
    new Map();


  themes.forEach(
    theme => {

      let hue =
        stringHash(
          theme
        )
        %
        360;


      let attempts =
        0;


      while (

        usedHues.some(
          existingHue =>

            hueDistance(
              existingHue,
              hue
            )
            <
            34
        )

        &&

        attempts <
          12

      ) {

        hue =
          (
            hue + 47
          )
          %
          360;


        attempts +=
          1;

      }


      usedHues.push(
        hue
      );


      colors.set(

        theme,

        `hsl(${hue} 62% 54%)`

      );

    }
  );


  state.themeColors =
    colors;

}


function themeColor(
  theme
) {

  return (

    state.themeColors.get(
      theme
    )

    ||

    "hsl(256 62% 54%)"

  );

}


/* =========================================================
   PLANILHA
========================================================= */

function readCell(
  row,
  names
) {

  for (
    const name
    of names
  ) {

    if (

      row[
        name
      ] !==
        undefined

      &&

      row[
        name
      ] !==
        null

      &&

      String(
        row[name]
      ).trim() !== ""

    ) {

      return row[
        name
      ];

    }

  }


  return "";

}


/* =========================================================
   DIAS OPCIONAIS NA PLANILHA
========================================================= */

function normalizeDay(
  value
) {

  const text =
    normalizeText(
      value
    );


  if (
    text.startsWith(
      "seg"
    )
  ) {

    return "segunda";

  }


  if (
    text.startsWith(
      "ter"
    )
  ) {

    return "terca";

  }


  if (
    text.startsWith(
      "qua"
    )
  ) {

    return "quarta";

  }


  if (
    text.startsWith(
      "qui"
    )
  ) {

    return "quinta";

  }


  if (
    text.startsWith(
      "sex"
    )
  ) {

    return "sexta";

  }


  if (
    text.startsWith(
      "sab"
    )
  ) {

    return "sabado";

  }


  if (
    text.startsWith(
      "dom"
    )
  ) {

    return "domingo";

  }


  return "";

}


function parseDays(
  value
) {

  if (
    !value
  ) {

    return [];

  }


  return String(
    value
  )

    .split(
      /[,;|/]+/
    )

    .map(
      item =>
        normalizeDay(
          item
        )
    )

    .filter(
      Boolean
    );

}


/* =========================================================
   CONVERTER PLANILHA
========================================================= */

function rowsToSubjects(
  rows
) {

  return rows

    .map(
      row => {

        const name =
          String(

            readCell(

              row,

              [
                "Disciplina",
                "disciplina"
              ]

            )

          ).trim();


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


        const rawDays =
          readCell(

            row,

            [
              "Dias",
              "Dia",
              "Dia da semana",
              "dias",
              "dia"
            ]

          );


        const correctedName =

          name ===
          "Critícia Cinematográfica"

            ? "Crítica Cinematográfica"

            : name;


        return {

          id:
            slugify(
              correctedName
            ),

          name:
            correctedName,

          theme,

          total:
            Math.max(

              0,

              Math.floor(
                total || 0
              )

            ),

          days:
            parseDays(
              rawDays
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

}


/* =========================================================
   LER XLSX
========================================================= */

function parseWorkbook(
  arrayBuffer
) {

  if (
    typeof XLSX ===
    "undefined"
  ) {

    throw new Error(
      "Biblioteca XLSX não disponível."
    );

  }


  const workbook =
    XLSX.read(

      arrayBuffer,

      {
        type:
          "array"
      }

    );


  const firstSheet =
    workbook.Sheets[

      workbook
        .SheetNames[0]

    ];


  const rows =
    XLSX.utils.sheet_to_json(

      firstSheet,

      {
        defval:
          ""
      }

    );


  const subjects =
    rowsToSubjects(
      rows
    );


  if (
    !subjects.length
  ) {

    throw new Error(
      "Nenhuma disciplina válida encontrada."
    );

  }


  return subjects;

}


/* =========================================================
   APLICAR NOVA PLANILHA
========================================================= */

function applySubjects(
  subjects,
  sourceLabel
) {

  state.subjects =
    subjects;


  state.openSubjects
    .clear();


  normalizeProgress();

  buildThemeColors();


  saveJSON(
    STORAGE.dataset,
    state.subjects
  );


  renderAll();


  $(
    "dataStatus"
  ).textContent =
    sourceLabel;

}


/* =========================================================
   CARREGAR Estudos.xlsx AUTOMATICAMENTE
========================================================= */

async function tryLoadRootSpreadsheet() {

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
      parseWorkbook(
        buffer
      );


    applySubjects(

      subjects,

      "Dados sincronizados com Estudos.xlsx."

    );

  }

  catch (error) {

    /*
     * Se o usuário abrir diretamente no computador
     * usando file://, o navegador pode impedir fetch.
     *
     * Nesse caso o dashboard continua funcionando
     * normalmente com os dados armazenados.
     */

    console.info(
      "Estudos.xlsx não foi carregado automaticamente."
    );

  }

}


/* =========================================================
   IMPORTAR XLSX MANUALMENTE
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


  try {

    const buffer =
      await file
        .arrayBuffer();


    const subjects =
      parseWorkbook(
        buffer
      );


    applySubjects(

      subjects,

      `Planilha atualizada: ${file.name}`

    );


    showToast(
      "Planilha atualizada com sucesso.",
      false
    );

  }

  catch (error) {

    console.error(
      error
    );


    showToast(

      "Não consegui ler a planilha. Verifique as colunas Disciplina, Tema e Aulas totais.",

      false

    );

  }

  finally {

    event.target.value =
      "";

  }

}


/* =========================================================
   LIMPAR PROGRESSO INVÁLIDO
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

      const cleaned = [

        ...getCompletedSet(
          subject.id
        )

      ]

        .map(
          Number
        )

        .filter(
          lesson =>

            Number.isInteger(
              lesson
            )

            &&

            lesson >= 1

            &&

            lesson <=
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
        cleaned;

    }
  );


  saveJSON(
    STORAGE.progress,
    state.progress
  );

}


/* =========================================================
   MARCAR UMA AULA
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


  const previous =
    set.has(
      lesson
    );


  if (
    previous ===
    completed
  ) {

    return;

  }


  if (
    completed
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
    options.toast !==
    false
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
      item =>
        item.id ===
        subjectId
    );


  if (
    !subject
  ) {

    return;

  }


  const lesson =
    nextLesson(
      subject
    );


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

  const completed = [

    ...getCompletedSet(
      subjectId
    )

  ].sort(
    (
      a,
      b
    ) =>
      b - a
  );


  const lesson =
    completed[
      0
    ];


  if (
    !lesson
  ) {

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
   DISCIPLINAS DE HOJE
========================================================= */

function subjectsForToday() {

  const day =
    getDayKey();


  /*
   * Primeiro tenta encontrar uma agenda
   * definida dentro da planilha.
   */

  const spreadsheetSchedule =
    state.subjects.filter(
      subject =>

        Array.isArray(
          subject.days
        )

        &&

        subject.days.includes(
          day
        )
    );


  if (
    spreadsheetSchedule.length
  ) {

    return spreadsheetSchedule;

  }


  /*
   * Caso a planilha não possua Dia/Dias,
   * usa o plano padrão.
   */

  const fallbackNames =
    FALLBACK_WEEK_PLAN[
      day
    ]
    ||
    [];


  if (
    fallbackNames.length
  ) {

    const normalizedNames =
      new Set(

        fallbackNames.map(
          normalizeText
        )

      );


    return state.subjects.filter(
      subject =>

        normalizedNames.has(
          normalizeText(
            subject.name
          )
        )
    );

  }


  /*
   * Domingo:
   * sugere automaticamente a disciplina
   * com menor porcentagem concluída.
   */

  return [

    ...state.subjects

  ]

    .filter(
      subject =>
        remainingCount(
          subject
        )
        >
        0
    )

    .sort(
      (
        a,
        b
      ) =>

        percentage(a)
        -
        percentage(b)

        ||

        remainingCount(b)
        -
        remainingCount(a)
    )

    .slice(
      0,
      1
    );

}


/* =========================================================
   CARD HOJE
========================================================= */

function renderToday() {

  const day =
    getDayKey();


  const subjects =
    subjectsForToday();


  $(
    "todayLabel"
  ).textContent =

    `HOJE · ${getDayLabel(day).toUpperCase()}`;


  if (
    !subjects.length
  ) {

    $(
      "todayTitle"
    ).textContent =
      "Dia livre";


    $(
      "todayMeta"
    ).textContent =
      "Nenhuma disciplina foi programada para hoje.";


    $(
      "todayAction"
    ).innerHTML =
      "";


    return;

  }


  const title =
    subjects

      .map(
        subject =>
          subject.name
      )

      .join(
        " + "
      );


  $(
    "todayTitle"
  ).textContent =
    title;


  const pendingSubjects =
    subjects.filter(
      subject =>
        nextLesson(
          subject
        )
        !==
        null
    );


  if (
    !pendingSubjects.length
  ) {

    $(
      "todayMeta"
    ).textContent =
      "Tudo concluído nas disciplinas previstas para hoje.";


    $(
      "todayAction"
    ).innerHTML = `

      <button
        class="today-button"
        type="button"
        disabled
      >
        Concluído
      </button>

    `;


    return;

  }


  const primarySubject =
    pendingSubjects[
      0
    ];


  const lesson =
    nextLesson(
      primarySubject
    );


  if (
    subjects.length === 1
  ) {

    $(
      "todayMeta"
    ).textContent =

      `Próxima: aula ${lesson} de ${primarySubject.total} · ${percentage(primarySubject)}% concluído.`;

  }

  else {

    $(
      "todayMeta"
    ).textContent =

      `${pendingSubjects.length} disciplinas previstas · comece por ${primarySubject.name}, aula ${lesson}.`;

  }


  $(
    "todayAction"
  ).innerHTML = `

    <button

      class="today-button"

      id="todayCompleteButton"

      type="button"

      data-subject-id="${
        primarySubject.id
      }"

    >

      Marcar próxima aula

    </button>

  `;


  $(
    "todayCompleteButton"
  )?.addEventListener(

    "click",

    () => {

      addNextLesson(
        primarySubject.id
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
    "overallProgressBar"
  ).style.width =

    `${summary.percentage}%`;


  $(
    "overallDetail"
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
   AGRUPAR POR TEMA
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
        .get(
          subject.theme
        )
        .push(
          subject
        );

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
   DESTRUIR ROSCAS ANTIGAS
========================================================= */

function destroyThemeCharts() {

  state.themeCharts.forEach(
    chart =>
      chart.destroy()
  );


  state.themeCharts =
    [];

}


/* =========================================================
   ROSCAS DINÂMICAS
========================================================= */

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
          [
            theme,
            subjects
          ],
          index
        ) => {

          const summary =
            totals(
              subjects
            );


          const color =
            themeColor(
              theme
            );


          return `

            <article

              class="theme-card"

              style="
                --theme-color:${color}
              "

            >

              <div
                class="theme-chart-wrap"
              >

                <canvas

                  id="themeChart${index}"

                  role="img"

                  aria-label="${escapeHTML(theme)}: ${summary.percentage}% concluído"

                ></canvas>


                <div
                  class="theme-chart-center"
                  aria-hidden="true"
                >

                  <strong>
                    ${summary.percentage}%
                  </strong>

                </div>

              </div>


              <div
                class="theme-card__body"
              >

                <h3>

                  <span
                    class="theme-dot"
                  ></span>

                  ${escapeHTML(theme)}

                </h3>


                <p>

                  ${summary.completed}
                  de
                  ${summary.total}
                  aulas

                  ·

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
      [
        theme,
        subjects
      ],
      index
    ) => {

      const summary =
        totals(
          subjects
        );


      const color =
        themeColor(
          theme
        );


      const canvas =
        $(
          `themeChart${index}`
        );


      if (
        !canvas
      ) {

        return;

      }


      const chart =
        new Chart(

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

                    summary.completed,

                    summary.remaining

                  ],


                  backgroundColor: [

                    color,

                    "#ece9f0"

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


              animation: {

                duration:
                  280

              },


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


      state.themeCharts.push(
        chart
      );

    }
  );

}


/* =========================================================
   AULAS RESTANTES POR DISCIPLINA
========================================================= */

function renderRemainingChart() {

  if (
    typeof Chart ===
    "undefined"
  ) {

    return;

  }


  if (
    state.remainingChart
  ) {

    state.remainingChart
      .destroy();


    state.remainingChart =
      null;

  }


  const sorted = [

    ...state.subjects

  ].sort(
    (
      a,
      b
    ) =>

      remainingCount(b)
      -
      remainingCount(a)

      ||

      a.name.localeCompare(
        b.name,
        "pt-BR"
      )
  );


  const container =
    $(
      "remainingChartContainer"
    );


  container.style.height =

    `${Math.max(
      300,
      sorted.length * 42 + 60
    )}px`;


  state.remainingChart =
    new Chart(

      $(
        "remainingChart"
      ),

      {

        type:
          "bar",


        data: {

          labels:

            sorted.map(
              subject =>
                subject.name
            ),


          datasets: [

            {

              data:

                sorted.map(
                  subject =>
                    remainingCount(
                      subject
                    )
                ),


              backgroundColor:

                sorted.map(
                  subject =>
                    themeColor(
                      subject.theme
                    )
                ),


              borderRadius:
                8,


              borderSkipped:
                false,


              maxBarThickness:
                22

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


          animation: {

            duration:
              280

          },


          plugins: {

            legend: {

              display:
                false

            },


            tooltip: {

              callbacks: {

                label:
                  context =>

                    ` ${context.raw} aulas restantes`

              }

            }

          },


          scales: {

            x: {

              beginAtZero:
                true,


              grid: {

                color:
                  "rgba(44, 38, 55, 0.06)"

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


                color:
                  "#5f5a65",


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
   AULAS INDIVIDUAIS
========================================================= */

function lessonGridTemplate(
  subject
) {

  const completed =
    getCompletedSet(
      subject.id
    );


  return `

    <div
      class="lesson-panel"
    >

      <p
        class="lesson-panel__hint"
      >
        Toque em uma aula para marcar ou desmarcar.
      </p>


      <div
        class="lesson-grid"
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
              lesson => `

                <button

                  class="
                    lesson-button
                    ${
                      completed.has(
                        lesson
                      )
                        ? "is-complete"
                        : ""
                    }
                  "

                  type="button"

                  data-action="lesson"

                  data-subject-id="${
                    subject.id
                  }"

                  data-lesson="${
                    lesson
                  }"

                  aria-pressed="${
                    completed.has(
                      lesson
                    )
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


/* =========================================================
   CARD DISCIPLINA
========================================================= */

function subjectTemplate(
  subject
) {

  const completed =
    completedCount(
      subject
    );


  const percent =
    percentage(
      subject
    );


  const color =
    themeColor(
      subject.theme
    );


  const isComplete =
    completed >=
    subject.total;


  const isOpen =
    state.openSubjects
      .has(
        subject.id
      );


  return `

    <article

      class="subject-card"

      style="
        --theme-color:${color}
      "

    >


      <div
        class="subject-card__main"
      >


        <div>


          <div
            class="subject-card__heading"
          >


            <div
              class="subject-card__title-wrap"
            >


              <span
                class="subject-card__theme"
              >

                <span
                  class="theme-dot"
                ></span>

                ${
                  escapeHTML(
                    subject.theme
                  )
                }

              </span>


              <h3>

                ${
                  escapeHTML(
                    subject.name
                  )
                }

              </h3>


            </div>


            <span
              class="subject-card__percentage"
            >

              ${percent}%

            </span>


          </div>


          <div
            class="subject-progress"
            aria-hidden="true"
          >

            <span
              style="
                width:${percent}%
              "
            ></span>

          </div>


          <div
            class="subject-card__meta"
          >

            ${completed}
            de
            ${subject.total}
            aulas

          </div>


        </div>


        <div
          class="subject-actions"
        >


          <button

            class="icon-button"

            type="button"

            data-action="minus"

            data-subject-id="${
              subject.id
            }"

            aria-label="Desmarcar a última aula de ${escapeHTML(subject.name)}"

            ${
              completed === 0
                ? "disabled"
                : ""
            }

          >

            −

          </button>


          <button

            class="primary-button"

            type="button"

            data-action="plus"

            data-subject-id="${
              subject.id
            }"

            ${
              isComplete
                ? "disabled"
                : ""
            }

          >

            ${
              isComplete
                ? "Concluída"
                : "+1 aula"
            }

          </button>


          <button

            class="icon-button"

            type="button"

            data-action="plus"

            data-subject-id="${
              subject.id
            }"

            aria-label="Marcar a próxima aula de ${escapeHTML(subject.name)}"

            ${
              isComplete
                ? "disabled"
                : ""
            }

          >

            +

          </button>


          <button

            class="details-button"

            type="button"

            data-action="details"

            data-subject-id="${
              subject.id
            }"

            aria-expanded="${
              isOpen
            }"

          >

            ${
              isOpen
                ? "Ocultar aulas"
                : "Ver aulas"
            }

          </button>


        </div>


      </div>


      ${
        isOpen

          ? lessonGridTemplate(
              subject
            )

          : ""
      }


    </article>

  `;

}


/* =========================================================
   RENDER DISCIPLINAS
========================================================= */

function renderSubjects() {

  $(
    "subjectCount"
  ).textContent =

    `${state.subjects.length} ${
      state.subjects.length === 1
        ? "disciplina"
        : "disciplinas"
    }`;


  if (
    !state.subjects.length
  ) {

    $(
      "subjectList"
    ).innerHTML = `

      <div
        class="empty-state"
      >
        Nenhuma disciplina encontrada.
      </div>

    `;


    return;

  }


  $(
    "subjectList"
  ).innerHTML =

    state.subjects

      .map(
        subjectTemplate
      )

      .join("");


  /*
   * Os eventos são adicionados NOVAMENTE
   * depois que cada card é renderizado.
   *
   * Isso evita o problema anterior em que
   * os botões paravam de funcionar.
   */

  $(
    "subjectList"
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
    !subjectId
  ) {

    return;

  }


  if (
    action ===
    "plus"
  ) {

    addNextLesson(
      subjectId
    );


    return;

  }


  if (
    action ===
    "minus"
  ) {

    removeLastLesson(
      subjectId
    );


    return;

  }


  if (
    action ===
    "details"
  ) {

    if (
      state.openSubjects.has(
        subjectId
      )
    ) {

      state.openSubjects.delete(
        subjectId
      );

    }

    else {

      state.openSubjects.add(
        subjectId
      );

    }


    renderSubjects();


    return;

  }


  if (
    action ===
    "lesson"
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
   TOAST
========================================================= */

function showToast(
  message,
  showUndo =
    true
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
    !showUndo;


  $(
    "toast"
  ).classList.add(
    "is-visible"
  );


  state.toastTimer =
    setTimeout(

      hideToast,

      3600

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
   ZERAR PROGRESSO
========================================================= */

function resetProgress() {

  const confirmed =
    window.confirm(

      "Zerar todo o progresso marcado? Essa ação não pode ser desfeita."

    );


  if (
    !confirmed
  ) {

    return;

  }


  state.progress =
    {};


  state.lastAction =
    null;


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
   RENDER COMPLETO
========================================================= */

function renderAll() {

  buildThemeColors();

  renderToday();

  renderSummary();

  renderThemes();

  renderRemainingChart();

  renderSubjects();

}


/* =========================================================
   EVENTOS FIXOS
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
   INICIALIZAR
========================================================= */

function init() {

  $(
    "currentDate"
  ).textContent =
    formatDate();


  normalizeProgress();

  buildThemeColors();

  bindEvents();

  renderAll();


  $(
    "dataStatus"
  ).textContent =
    "Dados salvos neste navegador.";


  /*
   * Quando estiver no GitHub Pages,
   * procura Estudos.xlsx automaticamente
   * na mesma pasta.
   */

  tryLoadRootSpreadsheet();

}


init();
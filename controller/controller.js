class SimplexController {
  constructor() {
    this.model = new SimplexModel();
    this.numVars = 2;
    this.isMin = true;
    this.chart = null;
    this._stepIdx = 0;
    this._stepsData = null;
    this._autoTimer = null;
    this._init();
  }

  _init() {
    document
      .getElementById("incVars")
      .addEventListener("click", () => this._changeVars(1));
    document
      .getElementById("decVars")
      .addEventListener("click", () => this._changeVars(-1));
    document
      .getElementById("addConstraint")
      .addEventListener("click", () => this._addRow());
    document
      .getElementById("solveBtn")
      .addEventListener("click", () => this._solve());
    document
      .getElementById("minMaxToggle")
      .addEventListener("click", () => this._toggleMinMax());
    this._rebuildObjRow();
    this._updateHeader();
    this._addRow();
    this._addRow();
  }

  _toggleMinMax() {
    this.isMin = !this.isMin;
    const btn = document.getElementById("minMaxToggle");
    if (!btn) return;
    if (this.isMin) {
      btn.textContent = "Min";
      btn.className = btn.className.replace("text-amber-300 border-amber-500/30 bg-amber-600/15 hover:bg-amber-600/25",
        "text-cyan-300 border-cyan-500/30 bg-cyan-600/15 hover:bg-cyan-600/25");
    } else {
      btn.textContent = "Max";
      btn.className = btn.className.replace("text-cyan-300 border-cyan-500/30 bg-cyan-600/15 hover:bg-cyan-600/25",
        "text-amber-300 border-amber-500/30 bg-amber-600/15 hover:bg-amber-600/25");
    }
  }

  // ─── Variables ────────────────────────────────────────────────────────────

  _changeVars(delta) {
    const next = this.numVars + delta;
    if (next < 1 || next > 8) return;
    this.numVars = next;
    document.getElementById("numVarsDisplay").textContent = this.numVars;
    this._rebuildObjRow();
    this._updateHeader();
    this._rebuildAllRows();
  }

  _rebuildObjRow() {
    const el = document.getElementById("objCoeffs");
    el.innerHTML = "";
    for (let j = 0; j < this.numVars; j++) {
      const wrap = document.createElement("div");
      wrap.className = "flex items-center gap-1";
      wrap.innerHTML = `
                ${j > 0 ? '<span class="text-zinc-600 select-none">+</span>' : ""}
                <input type="number" step="any" placeholder="0" data-var="${j}"
                    class="obj-coeff w-14 bg-zinc-800/80 border border-zinc-700 rounded-lg px-2 py-1.5
                           text-center text-sm text-zinc-100 focus:outline-none focus:border-cyan-500
                           transition-colors duration-150">
                <span class="text-zinc-500 text-xs select-none">x<sub>${j + 1}</sub></span>`;
      el.appendChild(wrap);
    }
  }

  _updateHeader() {
    const header = document.getElementById("conHeader");
    let html = "";
    for (let j = 0; j < this.numVars; j++) {
      html += `<th class="pb-2 px-1 text-zinc-600 font-normal text-xs">x<sub>${j + 1}</sub></th>`;
    }
    html += `<th class="pb-2 px-2 text-zinc-600 font-normal text-xs">Tipo</th>
                 <th class="pb-2 px-2 text-zinc-600 font-normal text-xs">RHS</th>
                 <th class="pb-2 w-6"></th>`;
    header.innerHTML = html;
  }

  _rebuildAllRows() {
    const tbody = document.getElementById("constraintRows");
    const count = tbody.querySelectorAll(".con-row").length;
    tbody.innerHTML = "";
    for (let i = 0; i < Math.max(count, 1); i++) this._addRow();
  }

  // ─── Constraint rows ──────────────────────────────────────────────────────

  _addRow() {
    const tbody = document.getElementById("constraintRows");
    const tr = document.createElement("tr");
    tr.className = "con-row border-t border-zinc-800/60";
    let cells = "";
    for (let j = 0; j < this.numVars; j++) {
      cells += `<td class="px-1 py-2">
                <input type="number" step="any" placeholder="0" data-var="${j}"
                    class="con-coeff w-14 bg-zinc-800/80 border border-zinc-700 rounded-lg px-2 py-1.5
                           text-center text-sm text-zinc-100 focus:outline-none focus:border-cyan-500
                           transition-colors duration-150">
            </td>`;
    }
    tr.innerHTML = `${cells}
            <td class="px-2 py-2">
                <select class="con-type bg-zinc-800/80 border border-zinc-700 rounded-lg px-2 py-1.5
                               text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors duration-150">
                    <option value="<=">≤</option>
                    <option value=">=">≥</option>
                    <option value="=">=</option>
                </select>
            </td>
            <td class="px-2 py-2">
                <input type="number" step="any" placeholder="0"
                    class="con-rhs w-16 bg-zinc-800/80 border border-zinc-700 rounded-lg px-2 py-1.5
                           text-center text-sm text-zinc-100 focus:outline-none focus:border-cyan-500
                           transition-colors duration-150">
            </td>
            <td class="px-1 py-2">
                <button class="con-remove text-zinc-700 hover:text-red-400 transition-colors duration-150 p-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </td>`;

    tr.querySelector(".con-remove").addEventListener("click", () => {
      tr.style.opacity = "0";
      tr.style.transform = "tranzincX(12px)";
      tr.style.transition = "opacity 0.18s, transform 0.18s";
      setTimeout(() => tr.remove(), 180);
    });

    tbody.appendChild(tr);
    tr.style.opacity = "0";
    tr.style.transform = "tranzincY(-6px)";
    tr.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        tr.style.opacity = "1";
        tr.style.transform = "tranzincY(0)";
      }),
    );
  }

  _parseInputs() {
    const n = this.numVars;
    const c = Array.from(document.querySelectorAll(".obj-coeff"))
      .slice(0, n)
      .map((el) => parseFloat(el.value) || 0);
    const constraints = [];
    document.querySelectorAll(".con-row").forEach((row) => {
      const coeffs = Array.from(row.querySelectorAll(".con-coeff")).map(
        (el) => parseFloat(el.value) || 0,
      );
      const type = row.querySelector(".con-type").value;
      const rhs = parseFloat(row.querySelector(".con-rhs").value) || 0;
      constraints.push({ coeffs, type, rhs });
    });
    return { c, constraints };
  }

  _solve() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
    const btn = document.getElementById("solveBtn");
    btn.disabled = true;
    btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg> Calculando…`;
    setTimeout(() => {
      const { c, constraints } = this._parseInputs();
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg> Resolver`;
      if (!constraints.length)
        return this._error("Agrega al menos una restricción.");
      const result = this.model.solve(c, constraints, this.isMin);
      if (result.error) return this._error(result.error);
      this._renderResults(result, c, constraints);
    }, 50);
  }

  _renderResults(result, c, constraints) {
    const sec = document.getElementById("resultsSection");
    sec.classList.remove("hidden");
    const { solution, z, steps, n } = result;

    const solutionHTML = solution
      .map(
        (v, j) => `
            <div class="flex items-center justify-between py-2 border-b border-zinc-800/40 last:border-0">
                <span class="text-zinc-400 text-sm font-mono">x<sub>${j + 1}</sub></span>
                <span class="text-cyan-300 font-mono font-medium">${this._fmt(v)}</span>
            </div>`,
      )
      .join("");

    sec.innerHTML = `<div class="space-y-5 animate-fade-in">

            <!-- Solución óptima -->
            <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
                <div class="flex items-center gap-2 mb-4">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                    <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Solución Óptima</h3>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <div>${solutionHTML}</div>
                    <div class="flex flex-col items-center justify-center border-l border-zinc-800 gap-1">
                        <span class="text-xs text-zinc-500 uppercase tracking-wider">${result.isMin ? "Z mínimo" : "Z máximo"}</span>
                        <span class="text-3xl font-bold text-emerald-400 font-mono">${this._fmt(z)}</span>
                    </div>
                </div>
            </div>

            <!-- Procedimiento paso a paso -->
            <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                <div class="px-6 py-4 flex items-center justify-between border-b border-zinc-800/50">
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                        <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Procedimiento Simplex</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="stepCounter" class="text-xs text-zinc-600 font-mono tabular-nums">0 / ${steps.length}</span>
                        <button id="autoPlayBtn"
                            class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                                   bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-400
                                   border border-cyan-500/20 transition-all duration-150 active:scale-95">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            Auto
                        </button>
                    </div>
                </div>
                <!-- Cards de pasos -->
                <div id="stepsCards" class="divide-y divide-zinc-800/30"></div>
                <!-- Controles nav -->
                <div id="stepNavArea" class="px-6 py-4 flex items-center gap-3">
                    <button id="nextStepBtn"
                        class="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg
                               bg-zinc-800 hover:bg-zinc-700 text-zinc-300
                               border border-zinc-700 transition-all duration-150 active:scale-95">
                        Siguiente paso
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>

            ${
              n === 2
                ? `
            <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
                <div class="flex items-center gap-2 mb-4">
                    <span class="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span>
                    <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Método Gráfico</h3>
                    <span class="text-xs text-zinc-700 ml-auto">solo 2 variables</span>
                </div>
                <div style="height:380px;position:relative"><canvas id="graphCanvas"></canvas></div>
            </div>`
                : ""
            }

        </div>`;

    this._initStepPlayer(result);
    if (n === 2) this._renderChart(c, constraints, solution);
    sec.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ─── Step player ─────────────────────────────────────────────────────────

  _initStepPlayer(result) {
    this._stepIdx = 0;
    this._stepsData = result;
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
    document
      .getElementById("nextStepBtn")
      .addEventListener("click", () => this._advanceStep());
    document
      .getElementById("autoPlayBtn")
      .addEventListener("click", () => this._toggleAutoPlay());
    // Primer paso aparece de inmediato
    this._advanceStep();
  }

  _advanceStep() {
    const result = this._stepsData;
    if (!result || this._stepIdx >= result.steps.length) return;
    const card = this._buildStepCard(
      result.steps[this._stepIdx],
      this._stepIdx,
      result,
    );
    const container = document.getElementById("stepsCards");
    if (!container) return;
    container.appendChild(card);
    // Animación de entrada
    card.style.opacity = "0";
    card.style.transform = "tranzincY(12px)";
    card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        card.style.opacity = "1";
        card.style.transform = "tranzincY(0)";
      }),
    );
    setTimeout(
      () => card.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      80,
    );
    this._stepIdx++;
    this._updateStepNav();
  }

  _toggleAutoPlay() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
      const btn = document.getElementById("autoPlayBtn");
      if (btn)
        btn.innerHTML = `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Auto`;
    } else {
      const btn = document.getElementById("autoPlayBtn");
      if (btn)
        btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"/>
            </svg> Pausa`;
      this._advanceStep();
      this._autoTimer = setInterval(() => {
        if (this._stepIdx >= this._stepsData.steps.length) {
          clearInterval(this._autoTimer);
          this._autoTimer = null;
          const b = document.getElementById("autoPlayBtn");
          if (b)
            b.innerHTML = `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Auto`;
          return;
        }
        this._advanceStep();
      }, 980);
    }
  }

  _updateStepNav() {
    const result = this._stepsData;
    const counter = document.getElementById("stepCounter");
    if (counter)
      counter.textContent = `${this._stepIdx} / ${result.steps.length}`;
    if (this._stepIdx >= result.steps.length) {
      if (this._autoTimer) {
        clearInterval(this._autoTimer);
        this._autoTimer = null;
      }
      const nav = document.getElementById("stepNavArea");
      if (nav)
        nav.innerHTML = `
                <div class="flex items-center gap-2 text-xs text-emerald-500 animate-fade-in">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                    Procedimiento completo
                </div>`;
    }
  }

  // ─── Step card builder ────────────────────────────────────────────────────

  _buildStepCard(step, idx, result) {
    const { tab, obj, basis, pivCol, pivRow } = step;
    const { varNames, T } = result;
    const m = tab.length;
    const isInit = idx === 0;
    const isOptimal = pivCol == null;

    const title = isInit ? "Tableau Inicial" : `Iteración ${idx}`;

    // Descripción del paso
    let info = "";
    if (!isOptimal) {
      const rc = this._fmt(obj[pivCol]);
      info = `El costo reducido más negativo es
                <span class="font-mono text-cyan-300">${rc}</span>
                en <span class="font-mono font-bold text-cyan-300">${varNames[pivCol]}</span>.
                Entra <span class="font-mono font-bold text-cyan-300">${varNames[pivCol]}</span>
                y sale <span class="font-mono font-bold text-amber-300">${varNames[basis[pivRow]]}</span>
                (razón mínima).`;
    } else {
      info = `<span class="text-emerald-400 font-medium">
                Todos los costos reducidos son ≥ 0. Solución óptima alcanzada.
            </span>`;
    }

    // Encabezados de columnas
    const colHeaders = varNames
      .map(
        (v, j) =>
          `<th class="px-2 py-2 text-center font-mono font-normal text-xs
                ${j === pivCol ? "text-cyan-400 font-semibold" : "text-zinc-600"}">${v}</th>`,
      )
      .join("");

    // Filas del tableau
    let rowsHTML = "";
    for (let i = 0; i < m; i++) {
      const isLeavingRow = i === pivRow;
      const ratio =
        !isOptimal && tab[i][pivCol] > 1e-10
          ? tab[i][T] / tab[i][pivCol]
          : null;

      rowsHTML += `<tr class="${isLeavingRow ? "bg-amber-500/5" : i % 2 === 0 ? "bg-zinc-950/20" : ""}">
                <td class="px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap
                    ${isLeavingRow ? "text-amber-300" : "text-amber-400/60"}">${varNames[basis[i]]}</td>
                ${tab[i]
                  .slice(0, T)
                  .map((v, j) => {
                    const isPivot = j === pivCol && i === pivRow;
                    const isEnterCol = j === pivCol;
                    return `<td class="px-2 py-2 text-center font-mono text-xs">
                        ${
                          isPivot
                            ? `<span class="inline-block bg-cyan-600/30 ring-1 ring-cyan-500/60
                                           rounded px-1.5 py-0.5 text-white font-bold">${this._fmt(v)}</span>`
                            : `<span class="${isEnterCol ? "text-cyan-300/70" : "text-zinc-400"}">${this._fmt(v)}</span>`
                        }
                    </td>`;
                  })
                  .join("")}
                <td class="px-3 py-2 text-center font-mono text-xs text-emerald-400/80 font-medium">
                    ${this._fmt(tab[i][T])}
                </td>
                ${
                  !isOptimal
                    ? `<td class="px-3 py-2 text-center font-mono text-xs whitespace-nowrap
                        ${
                          ratio !== null
                            ? isLeavingRow
                              ? "text-amber-300 font-bold"
                              : "text-zinc-600"
                            : "text-zinc-800"
                        }">
                            ${
                              ratio !== null
                                ? this._fmt(ratio) +
                                  (isLeavingRow
                                    ? ' <span class="text-amber-400">←</span>'
                                    : "")
                                : "—"
                            }
                       </td>`
                    : ""
                }
            </tr>`;
    }

    // Fila de la función objetivo
    rowsHTML += `<tr class="border-t border-zinc-700/40">
            <td class="px-3 py-2 font-mono text-xs text-zinc-500 italic">Z</td>
            ${obj
              .slice(0, T)
              .map(
                (v, j) =>
                  `<td class="px-2 py-2 text-center font-mono text-xs
                    ${j === pivCol ? "text-cyan-400 font-semibold" : "text-zinc-600"}">${this._fmt(v)}</td>`,
              )
              .join("")}
            <td class="px-3 py-2 text-center font-mono text-xs text-zinc-500">${this._fmt(obj[T])}</td>
            ${!isOptimal ? "<td></td>" : ""}
        </tr>`;

    const div = document.createElement("div");
    div.className = "overflow-hidden";
    div.innerHTML = `
            <!-- Cabecera del paso -->
            <div class="px-5 py-3 bg-zinc-950/50 flex flex-col gap-1.5">
                <div class="flex items-center justify-between gap-3">
                    <span class="text-xs font-bold text-zinc-300 uppercase tracking-widest">${title}</span>
                    ${
                      !isOptimal
                        ? `<span class="text-xs text-zinc-600 font-mono shrink-0">
                               Pivote: <span class="text-cyan-300">${varNames[pivCol]}</span>
                           </span>`
                        : `<span class="inline-flex items-center gap-1 text-xs text-emerald-500/80 shrink-0">
                               <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                               </svg>Óptimo
                           </span>`
                    }
                </div>
                <p class="text-xs text-zinc-500 leading-relaxed">${info}</p>
            </div>
            <!-- Tableau -->
            <div class="overflow-x-auto">
                <table class="min-w-max w-full border-collapse">
                    <thead>
                        <tr class="bg-zinc-950/50">
                            <th class="px-3 py-2 text-left font-mono font-normal text-xs text-zinc-600">Base</th>
                            ${colHeaders}
                            <th class="px-3 py-2 text-center font-mono font-normal text-xs text-zinc-500">RHS</th>
                            ${!isOptimal ? '<th class="px-3 py-2 text-center font-mono font-normal text-xs text-zinc-600">Razón</th>' : ""}
                        </tr>
                    </thead>
                    <tbody>${rowsHTML}</tbody>
                </table>
            </div>`;
    return div;
  }

  // ─── Chart ────────────────────────────────────────────────────────────────

  _renderChart(c, constraints, solution) {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    const canvas = document.getElementById("graphCanvas");
    if (!canvas) return;
    const intercepts = constraints.flatMap((con) => {
      const pts = [];
      if (Math.abs(con.coeffs[0]) > 1e-10) pts.push(con.rhs / con.coeffs[0]);
      if (Math.abs(con.coeffs[1]) > 1e-10) pts.push(con.rhs / con.coeffs[1]);
      return pts.filter((v) => v > 0);
    });
    const axMax = Math.max(...intercepts, solution[0], solution[1], 2) * 1.4;
    const COLORS = [
      "#8b5cf6",
      "#06b6d4",
      "#f59e0b",
      "#ec4899",
      "#10b981",
      "#f97316",
    ];
    const datasets = [];
    constraints.forEach((con, i) => {
      const [a1, a2] = con.coeffs;
      const b = con.rhs;
      let pts;
      if (Math.abs(a2) > 1e-10) {
        pts = [
          { x: 0, y: b / a2 },
          { x: axMax, y: (b - a1 * axMax) / a2 },
        ];
      } else if (Math.abs(a1) > 1e-10) {
        const vx = b / a1;
        pts = [
          { x: vx, y: 0 },
          { x: vx, y: axMax },
        ];
      }
      if (pts)
        datasets.push({
          label: `R${i + 1}: ${this._conStr(con)}`,
          data: pts,
          type: "line",
          borderColor: COLORS[i % COLORS.length],
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0,
        });
    });
    const corners = this.model.findCorners(constraints);
    if (corners.length) {
      datasets.push({
        label: "Vértices",
        data: corners,
        type: "scatter",
        backgroundColor: "#94a3b8",
        pointRadius: 5,
        pointHoverRadius: 7,
      });
    }
    if (Math.abs(c[1]) > 1e-10) {
      const zOpt = solution.reduce((s, v, j) => s + c[j] * v, 0);
      datasets.push({
        label: `F.O. Z=${this._fmt(zOpt)}`,
        data: [
          { x: 0, y: zOpt / c[1] },
          { x: axMax, y: (zOpt - c[0] * axMax) / c[1] },
        ],
        type: "line",
        borderColor: "#10b981",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [6, 3],
        pointRadius: 0,
        tension: 0,
      });
    }
    datasets.push({
      label: `Óptimo (${this._fmt(solution[0])}, ${this._fmt(solution[1])})`,
      data: [{ x: solution[0], y: solution[1] }],
      type: "scatter",
      backgroundColor: "#10b981",
      borderColor: "#fff",
      borderWidth: 2,
      pointRadius: 9,
      pointHoverRadius: 11,
    });
    const feasiblePlugin = {
      id: "feasibleRegion",
      beforeDatasetsDraw(chart) {
        if (corners.length < 3) return;
        const {
          ctx,
          scales: { x: sx, y: sy },
        } = chart;
        const cx = corners.reduce((s, p) => s + p.x, 0) / corners.length;
        const cy = corners.reduce((s, p) => s + p.y, 0) / corners.length;
        const sorted = [...corners].sort(
          (a, b) =>
            Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
        );
        ctx.save();
        ctx.beginPath();
        sorted.forEach((p, k) => {
          const px = sx.getPixelForValue(p.x),
            py = sy.getPixelForValue(p.y);
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(139,92,246,0.07)";
        ctx.fill();
        ctx.strokeStyle = "rgba(139,92,246,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      },
    };
    this.chart = new Chart(canvas, {
      type: "scatter",
      data: { datasets },
      plugins: [feasiblePlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: "easeOutQuart" },
        plugins: {
          legend: {
            labels: {
              color: "#64748b",
              font: { size: 11 },
              boxWidth: 12,
              padding: 12,
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: axMax,
            title: { display: true, text: "x₁", color: "#64748b" },
            grid: { color: "rgba(148,163,184,0.06)" },
            ticks: { color: "#475569", font: { size: 11 } },
          },
          y: {
            type: "linear",
            min: 0,
            max: axMax,
            title: { display: true, text: "x₂", color: "#64748b" },
            grid: { color: "rgba(148,163,184,0.06)" },
            ticks: { color: "#475569", font: { size: 11 } },
          },
        },
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _error(msg) {
    const sec = document.getElementById("resultsSection");
    sec.classList.remove("hidden");
    sec.innerHTML = `
            <div class="bg-red-950/40 border border-red-500/30 rounded-2xl px-6 py-4 animate-fade-in">
                <p class="text-red-400 text-sm"><span class="font-semibold">Error:</span> ${msg}</p>
            </div>`;
    sec.scrollIntoView({ behavior: "smooth" });
  }

  _fmt(v) {
    if (Math.abs(v) < 1e-9) return "0";
    const r = Math.round(v * 1e6) / 1e6;
    if (Number.isInteger(r)) return r.toString();
    return parseFloat(r.toFixed(4)).toString();
  }

  _conStr(con) {
    const terms = con.coeffs.map((a, j) => `${a}x${j + 1}`).join("+");
    return `${terms} ${con.type} ${con.rhs}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.ctrl = new SimplexController();
});

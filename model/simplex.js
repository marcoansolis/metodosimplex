class SimplexModel {
  static BIG_M = 1e6;
  static EPS = 1e-8;
  static FEAS_EPS = 1e-6;

  solve(cObj, constraints, isMin = true) {
    const n = cObj.length;
    const m = constraints.length;
    const M = SimplexModel.BIG_M;
    const EPS = SimplexModel.EPS;
    const FEPS = SimplexModel.FEAS_EPS;

    if (n < 1 || m < 1) return { error: "Datos insuficientes." };

    const cWork = isMin ? [...cObj] : cObj.map((v) => -v);

    const cons = constraints.map((con) => {
      if (con.rhs >= 0)
        return { coeffs: [...con.coeffs], type: con.type, rhs: con.rhs };
      return {
        coeffs: con.coeffs.map((a) => -a),
        type: con.type === "<=" ? ">=" : con.type === ">=" ? "<=" : "=",
        rhs: -con.rhs,
      };
    });

    const varNames = cWork.map((_, j) => `x${j + 1}`);
    const objCoeffs = [...cWork];
    const meta = [];

    for (let i = 0; i < m; i++) {
      const type = cons[i].type;
      const info = {};
      if (type === "<=") {
        info.slackCol = varNames.length;
        varNames.push(`s${i + 1}`);
        objCoeffs.push(0);
      } else if (type === ">=") {
        info.surplusCol = varNames.length;
        varNames.push(`e${i + 1}`);
        objCoeffs.push(0);
        info.artificialCol = varNames.length;
        varNames.push(`a${i + 1}`);
        objCoeffs.push(M);
      } else {
        info.artificialCol = varNames.length;
        varNames.push(`a${i + 1}`);
        objCoeffs.push(M);
      }
      meta.push(info);
    }

    const T = varNames.length;

    const tab = cons.map((con, i) => {
      const row = new Array(T + 1).fill(0);
      con.coeffs.forEach((a, j) => {
        row[j] = a;
      });
      row[T] = con.rhs;
      const info = meta[i];
      if (con.type === "<=") row[info.slackCol] = 1;
      else if (con.type === ">=") {
        row[info.surplusCol] = -1;
        row[info.artificialCol] = 1;
      } else row[info.artificialCol] = 1;
      return row;
    });

    const basis = meta.map((info, i) =>
      cons[i].type === "<=" ? info.slackCol : info.artificialCol,
    );

    const obj = [...objCoeffs, 0];

    for (let i = 0; i < m; i++) {
      if (varNames[basis[i]].startsWith("a")) {
        for (let j = 0; j <= T; j++) obj[j] -= M * tab[i][j];
      }
    }

    const steps = [];

    for (let iter = 0; iter < 500; iter++) {
      steps.push({
        tab: tab.map((r) => [...r]),
        obj: [...obj],
        basis: [...basis],
        pivCol: null,
        pivRow: null,
      });

      let pivCol = -1,
        minRC = -EPS;
      for (let j = 0; j < T; j++) {
        if (obj[j] < minRC) {
          minRC = obj[j];
          pivCol = j;
        }
      }
      if (pivCol < 0) break;

      let pivRow = -1,
        minR = Infinity;
      for (let i = 0; i < m; i++) {
        if (tab[i][pivCol] > EPS) {
          const r = tab[i][T] / tab[i][pivCol];
          if (r < minR - EPS) {
            minR = r;
            pivRow = i;
          }
        }
      }
      if (pivRow < 0) return { error: "El problema es no acotado." };

      steps[steps.length - 1].pivCol = pivCol;
      steps[steps.length - 1].pivRow = pivRow;

      const pv = tab[pivRow][pivCol];
      for (let j = 0; j <= T; j++) tab[pivRow][j] /= pv;

      for (let i = 0; i < m; i++) {
        if (i === pivRow) continue;
        const f = tab[i][pivCol];
        if (Math.abs(f) < EPS) continue;
        for (let j = 0; j <= T; j++) tab[i][j] -= f * tab[pivRow][j];
      }

      const fo = obj[pivCol];
      if (Math.abs(fo) > EPS) {
        for (let j = 0; j <= T; j++) obj[j] -= fo * tab[pivRow][j];
      }

      basis[pivRow] = pivCol;
    }

    for (let i = 0; i < m; i++) {
      if (varNames[basis[i]].startsWith("a") && Math.abs(tab[i][T]) > FEPS) {
        return { error: "El problema es infactible." };
      }
    }

    const solution = new Array(n).fill(0);
    for (let i = 0; i < m; i++) {
      if (basis[i] < n) solution[basis[i]] = Math.max(0, tab[i][T]);
    }

    const z = solution.reduce((s, v, j) => s + cObj[j] * v, 0);

    return { solution, z, steps, varNames, basis, tab, obj, T, n, isMin };
  }

  findCorners(constraints) {
    const EPS = SimplexModel.FEAS_EPS;

    const lines = [
      { a: [1, 0], b: 0 },
      { a: [0, 1], b: 0 },
      ...constraints.map((c) => ({ a: c.coeffs, b: c.rhs })),
    ];

    const allCons = [
      { coeffs: [1, 0], type: ">=", rhs: 0 },
      { coeffs: [0, 1], type: ">=", rhs: 0 },
      ...constraints,
    ];
    const corners = [];

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const [a1, a2] = lines[i].a;
        const [b1, b2] = lines[j].a;
        const det = a1 * b2 - a2 * b1;
        if (Math.abs(det) < 1e-10) continue;

        const x1 = (lines[i].b * b2 - lines[j].b * a2) / det;
        const x2 = (a1 * lines[j].b - b1 * lines[i].b) / det;

        if (x1 < -EPS || x2 < -EPS) continue;

        let ok = true;
        for (const c of allCons) {
          const val = c.coeffs[0] * x1 + c.coeffs[1] * x2;
          if (c.type === "<=" && val > c.rhs + EPS) {
            ok = false;
            break;
          }
          if (c.type === ">=" && val < c.rhs - EPS) {
            ok = false;
            break;
          }
          if (c.type === "=" && Math.abs(val - c.rhs) > EPS) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        if (
          !corners.some(
            (p) => Math.abs(p.x - x1) < EPS && Math.abs(p.y - x2) < EPS,
          )
        ) {
          corners.push({ x: x1, y: x2 });
        }
      }
    }
    return corners;
  }
}
window.SimplexModel = SimplexModel;

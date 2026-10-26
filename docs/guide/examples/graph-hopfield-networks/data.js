// Shared running-example values. The guide build inlines this module before guide.js.
// Node checks import the same object, so prose checks and figures use one computation.
export const data = (() => {
  const PATTERNS = [
    { name: "Camera memory", short: "camera", m: [2, 0] },
    { name: "Lens memory", short: "lens", m: [0, 2] },
  ];
  const NODES = [
    { id: "A", name: "Camera A", x: [1.8, 0.2] },
    { id: "B", name: "Camera B", x: [1.4, 0.6] },
    { id: "C", name: "Product C", x: [0, 0] },
    { id: "D", name: "Lens D", x: [0.4, 1.6] },
  ];
  const EDGES = [[0, 1], [0, 2], [1, 2], [2, 3]];
  const N = NODES.length;
  const adjacency = NODES.map(() => NODES.map(() => 0));
  for (const [u, v] of EDGES) adjacency[u][v] = adjacency[v][u] = 1;
  const degree = adjacency.map((row) => row.reduce((a, b) => a + b, 0));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const scale = (a, s) => [a[0] * s, a[1] * s];

  // softmax(beta * M x): how much the node resembles each stored pattern.
  function weights(x, beta) {
    const z = PATTERNS.map((p) => beta * dot(p.m, x));
    const top = Math.max(...z);
    const e = z.map((v) => Math.exp(v - top));
    const sum = e[0] + e[1];
    return e.map((v) => v / sum);
  }
  // M^T softmax(beta M x): the weighted blend of stored patterns.
  function retrieve(x, beta) {
    const w = weights(x, beta);
    return PATTERNS.reduce((r, p, i) => add(r, scale(p.m, w[i])), [0, 0]);
  }
  // (L X)_u with L = I - D^-1/2 A D^-1/2.
  function laplacian(X, u) {
    let out = X[u].slice();
    for (let v = 0; v < N; v += 1) {
      if (!adjacency[u][v]) continue;
      out = add(out, scale(X[v], -1 / Math.sqrt(degree[u] * degree[v])));
    }
    return out;
  }
  // One neighbour's share of the graph pull on u: 2 lambda x_v / sqrt(d_u d_v).
  function neighbourPull(X, u, v, lambda) {
    return scale(X[v], (2 * lambda) / Math.sqrt(degree[u] * degree[v]));
  }
  function lse(x, beta) {
    const z = PATTERNS.map((p) => beta * dot(p.m, x));
    const top = Math.max(...z);
    return (top + Math.log(z.reduce((s, v) => s + Math.exp(v - top), 0))) / beta;
  }
  function energy(X, beta, lambda) {
    let memory = 0;
    let trace = 0;
    X.forEach((x, u) => {
      memory += -lse(x, beta) + 0.5 * dot(x, x);
      trace += dot(x, laplacian(X, u));
    });
    return { memory, graph: lambda * trace, total: memory + lambda * trace };
  }
  // Eq. 2: x <- (1 - alpha) x + alpha [ M^T softmax(beta M x) - 2 lambda (L X)_v ], all nodes at once.
  function run({ beta = 1, alpha = 0.3, lambda = 0.3, steps = 4 } = {}) {
    let X = NODES.map((n) => n.x.slice());
    const states = [];
    for (let t = 0; t <= steps; t += 1) {
      const parts = X.map((x, u) => {
        const r = retrieve(x, beta);
        const g = scale(laplacian(X, u), -2 * lambda);
        return { x, w: weights(x, beta), r, g, keep: scale(x, 1 - alpha), next: add(scale(x, 1 - alpha), scale(add(r, g), alpha)) };
      });
      states.push({ t, X, parts, energy: energy(X, beta, lambda) });
      X = parts.map((p) => p.next);
    }
    return states;
  }
  const settings = { beta: 1, alpha: 0.3, lambda: 0.3, steps: 4 };
  const checkedNumbers = ["4 steps"];
  return { PATTERNS, NODES, EDGES, degree, adjacency, weights, retrieve, laplacian, neighbourPull, energy, run, settings, checkedNumbers };
})();

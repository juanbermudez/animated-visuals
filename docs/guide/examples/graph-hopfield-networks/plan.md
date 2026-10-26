---
title: Graph Hopfield Networks
slug: graph-hopfield-networks
type: paper              # topic | paper | codebase | decision | how-to
length: standard         # short | standard | long
audience: Engineers who know what a neural network and a graph are.
outcome: Explain the energy, the update rule and the retrieval behaviour on a small worked example, and say what the paper measured.
source: https://arxiv.org/abs/2603.03464
---

## Scope

- Audience: Engineers who know what a neural network, a graph, a dot product and a softmax are. They have not read about modern Hopfield networks.
- Afterwards: Write down the energy and the update rule; run one update by hand on a four-node graph; say what retrieval does to a node with missing features; say which results in the paper come from memory and which come from the iterative update.
- Running example: Four products in a co-purchase graph, in the spirit of Amazon Photo. Two cameras (A, B), one product whose features were masked (C), one lens (D). Two stored memories in 2 dimensions: camera (2, 0) and lens (0, 2). C starts at (0, 0). Paper settings: β = 1, α = 0.3, λ = 0.3, T = 4 steps.
- Out of scope: Training (cross-entropy, the encoder, the classifier head), multi-head memory, the proofs in Appendix D beyond their statements, other energy-based GNNs, and code to reproduce the paper's tables.
- Reading length: Standard, about 2,500 to 3,000 words before the reference section.

## Thesis

A Graph Hopfield Network moves every node's vector downhill on one energy that rewards resembling a stored memory and resembling the neighbours; the paper finds the repeated downhill steps matter more than the memory, and the memory matters most when a node's own features are degraded.

## Terms

| Term | Introduced after figure | Approved aliases |
|---|---|---|
| stored pattern | fig-retrieval | stored patterns |
| retrieval | fig-retrieval | retrieved |
| inverse temperature | fig-retrieval | |
| graph term | fig-graph | Laplacian term |
| damping | fig-update | damped |
| energy | fig-energy | energies |
| over-smoothing | fig-steps | |

Plain words used before the figures: "memory" for a stored pattern, "pull" for a gradient direction, "step" for one update.

## Running example

The four products appear in the hero (graph view), the worked example (2-D view, steps 0 to 4), every mechanism figure (C at step 0), the energy figure (steps 0 to 4), the limits figure (steps 0 to 30), the check questions and the closing answer. All example values come from `data.js`. The build inlines that module for the figures, and `check-example.mjs` imports it for the Node check.

## Sections

| Section | One idea | Part of the running example | Figure claim | Required source |
|---|---|---|---|---|
| Title and opening | A GHN settles each node between memory and neighbours. | C is unlabeled until it settles. | Product C settles toward the cameras (fig-hero) | Paper Eq. 1, Eq. 2 |
| The problem | Masked features leave a node with nothing to go on; GNNs then lean on neighbours only. | C lost its features. | none | Section 3.3, Table 2 |
| Worked example | Four steps move C toward the cameras. | Steps 0 to 4, C's camera weight 0.50 to 0.65. | Four steps move C toward the cameras (fig-example) | Computed, settings from Table 4 |
| Retrieval | A node is pulled to a softmax blend of stored memories. | C at (0, 0) gets an even blend. | A node is pulled toward the memories it resembles (fig-retrieval) | Eq. 2, Section 2.1 |
| Graph term | The graph term pulls a node toward its neighbours; λ sets strength and sign. | C's neighbours pull it right. | Neighbours pull C toward themselves (fig-graph) | Eq. 1, Eq. 2, Prop. D.1 |
| One update | One update keeps 70% of the old vector and adds 30% of both pulls. | Prose: C moves from (0, 0) to (0.58, 0.53). Figure: C's step 1 to step 2, (0.58, 0.53) to (0.86, 0.75), where all three pieces are non-zero. | One step adds both pulls to C (fig-update) | Eq. 2 |
| Energy | Each update is a gradient step on one energy, so the energy falls. | −4.74 to −7.03 over four steps. | Each step lowers the total (fig-energy) | Eq. 1, Prop. D.2, Corollary D.7 |
| General form | The equations and a short NumPy layer, then the full model. | Code prints C after step 1. | none | Eq. 1 to 3, Section 2.3, Appendix A, Table 4 |
| Results | Iterative descent drives the Amazon results; memory helps on sparse graphs and under feature masking; λ ≤ 0 handles heterophily. | C's situation is the feature-masking test. | Memory pays off when features are masked (fig-mask); smoothing helps citation graphs and hurts heterophilous ones (fig-lambda) | Tables 1, 2, 3, 6, 10 |
| Limits | More steps keep lowering the energy and blur classes; the theory does not cover the trained models. | At step 16 the lens D tips to camera. | Extra steps pull the lens into the cameras (fig-steps) | Tables 8, 11, Section 4 |
| Check yourself | Apply the mechanism to new cases. | C with λ = 0, more steps, a heterophilous graph. | none | As above |
| What to keep | Answer: C is resolved by neighbours plus memory; principle: the descent matters more than what is stored. | C ends at camera weight 0.65. | none | Section 4 |
| Reference | Glossary, checked numbers, full tables, sources, AI note. | none | none | All |

## Fact sheet

| Claim or number | Label | Source | Where used | Checked |
|---|---|---|---|---|
| Energy E(X) = Σ_v [−lse(β, M x_v) + ½‖x_v‖²] + λ tr(Xᵀ L X); lse(β, z) = β⁻¹ log Σ_μ exp(β z_μ) | reported | Eq. 1, p. 1 | General form, energy | yes |
| L = I − D^−½ A D^−½ (symmetric normalized Laplacian) | reported | Section 2.1, p. 2 | Graph term | yes |
| Update x_v ← (1 − α) x_v + α [Mᵀ softmax(β M x_v) − 2λ (L X)_v] | reported | Eq. 2, p. 2 | One update, general form | yes |
| The update is gradient descent on the energy with step α | reported | Prop. D.2, p. 13 | Energy | yes |
| tr(Xᵀ L X) = ½ Σ A_uv ‖x_u/√d_u − x_v/√d_v‖² ≥ 0 | reported | Prop. D.1, p. 13 | Graph term | yes |
| Step sizes below 2 / L_lip, L_lip = β/2 ‖M‖² + 1 + 2λ‖L‖, give monotone descent; ‖L‖ ≤ 2 | reported | Prop. D.6, Corollary D.7, p. 15 | Energy | yes |
| Example: L_lip ≤ 1/2 · 4 + 1 + 2 · 0.3 · 2 = 4.2, so α = 0.3 < 2/4.2 ≈ 0.48 | estimate | Arithmetic from Corollary D.7 with example values | Energy | yes |
| Gate g_v = σ(W_g[x_v ‖ r_v] + b_g), r̃_v = g_v ⊙ r_v + (1 − g_v) ⊙ x_v; b_g = 2 gives g ≈ 0.88 | reported | Eq. 3, Section 2.2, p. 2 | General form | yes |
| LSR replaces softmax with normalized Epanechnikov weights | reported | Section 2.1, p. 2 | General form | yes |
| Hier(G): route to one of G groups by centroid, then retrieve inside it; G = 8 | reported | Section 2.3, Table 4 | General form | yes |
| Full model: encoder, L = 2 GHN layers of T = 4 steps with gating, linear classifier; skip weight 0.1; dropout; LayerNorm | reported | Section 2.3, Appendix A, Table 4 | General form | yes |
| Hyperparameters: hidden 64 or 128; K 64 or 256; β init 1.0 learnable; λ 0.3; α 0.3; T 4; tied keys and values; Adam; 300 epochs; patience 50 | reported | Table 4, p. 8 | General form | yes |
| λ ∈ {−0.1, −0.05, −0.01, 0} on heterophilous graphs | reported | Appendix A, Section 3.4 | Results | yes |
| Results are mean ± std over 10 seeds with per-model tuning | reported | Section 3.1 | Results | yes |
| Nine datasets: Cora, CiteSeer, PubMed, Amazon Photo, Amazon Computers, Texas, Wisconsin, Cornell, Actor | reported | Section 3.1 | Results | yes |
| Photo has 238k edges, Cora 10.6k | reported | Section 3.2 p. 3, Section 4 p. 5 | Results | yes |
| Table 1 (all values) | reported | Table 1, p. 3 | Results, reference | yes |
| Every GHN variant beats the best baseline on Amazon: +0.8 points on Photo (NoMem 94.7% vs GraphSAGE 93.9%), +2.6 points on Computers (91.5% vs GIN 88.9%) | reported | Section 3.2, Table 1 | Results | yes |
| Memory over NoMem on Planetoid: Hier(8) Cora +2.0 points, LSR CiteSeer +1.1, LSR PubMed +0.9; only Cora's ±1σ ranges do not overlap | reported | Section 3.2 | Results | yes |
| GCN, APPNP and MLP are bimodal on Computers (std above 10 points) | reported | Table 1 note, Appendix A | Results | yes |
| Table 2 (all values), 50% corruption on Photo | reported | Table 2, p. 4 | Results figure, reference | yes |
| Hier(8) 91.9% vs NoMem 86.9% under 50% feature masking, a 5.0 point gap | reported | Section 3.3 | Problem, results | yes |
| Table 3 (all values) | reported | Table 3, p. 5 | Results, reference | yes |
| GHN-LSE leads Texas 81.4% vs GPR-GNN 78.4%; GPR-GNN leads Wisconsin 82.9% vs 82.5% and Cornell 80.3% vs 78.9%; within overlapping std | reported | Section 3.4 | Results | yes |
| Table 6 (all values), λ ablation, GHN-LSE, single default config | reported | Table 6, p. 10 | Results figure | yes |
| Table 7: best negative λ for LSE: Texas 78.6% at −0.05, Wisconsin 81.8% at −0.05, Cornell 77.0% at −0.01; λ = −0.3 scores below λ = −0.05 on all four datasets (Texas 75.9%, Wisconsin 76.9%, Cornell 61.9%, Actor 34.7%) | reported | Table 7, p. 11 | Results | yes |
| Table 8: Cora 74.5, 78.4, 81.8, 56.1 ± 26.1, 30.9 for T = 1, 2, 4, 8, 16 | reported | Table 8, p. 11 | Limits | yes |
| Table 10: mean gate 0.727 to 0.723 while accuracy falls 93.6% to 67.9% at 0% to 70% masking | reported | Table 10, p. 12 | Results | yes |
| Table 11: β‖M‖² Cora 2.15, CiteSeer 1.88, PubMed 6.54, Photo 35.96, Computers 2.36, Texas 4.65, Wisconsin 2.60, Cornell 0.75, Actor 4.72; convexity needs < 2 | reported | Table 11, p. 12 | Limits | yes |
| Retrieval costs O(NK); about 1.5 to 2 times GAT's wall-clock per epoch | reported | Section 4, p. 5 | Limits | yes |
| Flat LSE needs K = 256 on Photo; LSR is stable at K = 64 for moderate β | reported | Figure 4, Appendix C.1 | Limits | yes |
| Example: patterns (2, 0) and (0, 2); A (1.8, 0.2), B (1.4, 0.6), C (0, 0), D (0.4, 1.6); edges A–B, A–C, B–C, C–D | estimate | Author-chosen illustration | Everywhere | yes |
| Example: ‖M‖² = 4, so β‖M‖² = 4 | estimate | Arithmetic on the example | Limits | yes |
| Example step 0: C's weights 0.50 / 0.50; retrieval (1.00, 1.00) | estimate | Computed by `data.js` | Retrieval | yes |
| Example step 0: graph pull on C 2λ·(1.54, 1.25) = (0.92, 0.75) | estimate | Computed | Graph term | yes |
| Example step 1: C = 0.7·(0, 0) + 0.3·[(1.00, 1.00) + (0.92, 0.75)] = (0.58, 0.53) | estimate | Computed | One update | yes |
| Example: C's camera weight 0.50, 0.53, 0.56, 0.60, 0.65 at steps 0 to 4 | estimate | Computed | Worked example | yes |
| Example: energy −4.74, −6.49, −6.86, −6.97, −7.03 at steps 0 to 4; memory part −6.44 to −7.43; graph part 1.70 to 0.40 | estimate | Computed | Energy | yes |
| Example with λ = 0: C stays at weights 0.50 / 0.50 at every step | estimate | Computed | Graph term, check | yes |
| Example: D's camera weight is 0.13 at step 4 and passes 0.50 at step 16; 0.96 at step 30; energy −7.96 at step 30 | estimate | Computed | Limits | yes |

Labels are `measured`, `reported`, `estimate`, or `speculative`. Example values are estimates computed by the guide's own code for an author-chosen illustration.

## Limits

- The example has no encoder, no gate, no learning and two hand-placed memories in 2 dimensions. Real layers work on 64 or 128 dimensions with 64 or 256 learned memories.
- The guide reports the paper's numbers; it does not reproduce them.
- The guide does not judge the paper's tuning protocol beyond what the paper states.

## Predicted reader questions

1. What two things does the energy reward, and which symbol sets the balance between them?
2. Write the update rule and say what α does.
3. In the worked example, why does product C not move toward either memory when λ = 0?
4. What is C's camera weight after four steps with λ = 0.3, and is that number from the paper?
5. On Amazon Photo with 50% of features masked, how much does memory add over NoMem, and where is that reported?
6. Does memory help on Amazon Photo with clean features?
7. What does the paper do for heterophilous graphs such as Wisconsin?
8. Why not run 16 steps instead of 4?
9. Does the paper's convergence theory cover the trained models?
10. Which numbers in the guide are illustrative?

## Reader tests

Both runs used the exact prompt in `references/reader-test.md` and the 10 predicted questions above. Each ran in a fresh bb thread (provider claude-code, project default model) whose working directory held only the built page, copied to `/private/tmp/claude-501/reader-test-ghn/guide.html`.

- Run 1, thread `thr_pz2uzjqa9p`: 10 of 10 answers matched the fact sheet. Revisions: replaced "only the Cora gap is larger than one standard deviation" with the paper's overlap criterion (Section 3.2); "fixes λ = 0.3" became "λ = 0.3 on homophilous graphs"; "steps settle within T = 4" became "behave stably", with no claim of reaching a minimum; the negative-λ gain now names its comparison (λ = 0 in Table 6); Table 10 now names GHN-LSE; LSR and LSE added beside Hier(8); L_lip and strong convexity explained in plain words; baselines added to the glossary; hero caption defines camera weight.
- Run 2, thread `thr_qjx6sv8pra`: 10 of 10 answers matched; it marked Q7 as partial, but its answer matches the fact sheet. Revisions: the layer count no longer uses the letter L; descent is now separated from having a single minimum; "GNNs fail when features go missing" became "most lose a lot", with GIN as the exception; the defaults sentence says β is learned and λ = 0.3 is homophilous-only; a results sentence says memory does not protect against edge drop or noise; the results heading became "Where memory adds accuracy".
- Not changed: both readers listed the interaction hints in figure captions as "instructions mixed into explanation". animated-visuals requires those hints in captions, so they stay.

## Copy-lint exceptions

dimensionless: λ, β, α, x, y, w, T, L, G, K
- `/unit:.*(?:share between|weights? are|camera weight|gate's mean value)/` — These normalized weights are dimensionless shares.
- `/unit:.*(?:λ from|λ =|below zero)/` — λ is a declared dimensionless model parameter.
- `/unit:.*(?:learned memories|stored patterns)/` — Memory-bank sizes are dimensionless counts; an adjective separates the count from its noun.
- `/unit:.*(?:rounded to|decimals)/` — Decimal places are a dimensionless formatting count.
- `/unit:.*(?:energy|falls from|memory part|graph part)/` — Energy values use the paper's dimensionless objective.
- `/unit:.*(?:\bexceed|datasets, up to|convexity)/` — The convexity diagnostic β‖M‖² is dimensionless.
- `/unit:.*\b10\.6k\b/` — The shared noun “edges” follows the paired 238k and 10.6k values.
- `/unit:.*arXiv 2603\.03464/` — This is a document identifier, not a measured quantity.
- `/unit:.*Full versions of Tables/` — These are document table identifiers listed as a series.

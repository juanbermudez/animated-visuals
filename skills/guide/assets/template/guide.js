// Keep the generic check behavior when replacing the example figure.
document.querySelectorAll("[data-guide-check]").forEach((check) => {
  const options = [...check.querySelectorAll(".guide-options > button")];
  let wrong = 0;
  options.forEach((option) => option.addEventListener("click", () => {
    const right = option.hasAttribute("data-correct");
    option.dataset.chosen = "";
    option.dataset.result = right ? "right" : "wrong";
    option.disabled = true;
    if (right) options.forEach((item) => { item.disabled = true; });
    else if (++wrong >= 2) {
      const answer = options.find((item) => item.hasAttribute("data-correct"));
      if (answer) answer.dataset.answer = "";
      options.forEach((item) => { item.disabled = true; });
    }
  }));
});

// Replace this illustrative figure. Keep one claim, one worked example, and computed readouts.
FS.figure("example-figure", {
  height: (width) => width < 520 ? 260 : 220,
  autoplay: false,
  steps: [
    { caption: "One input arrives." },
    { caption: "The worker changes it." },
    { caption: "The result becomes durable." },
  ],
  render(figure, context) {
    const labels = ["Input", "Worker", "Stored result"];
    const narrow = figure.w < 520;
    const positions = labels.map((_, index) => narrow
      ? { x: figure.w / 2, y: 38 + index * 72 }
      : { x: 80 + index * ((figure.w - 160) / 2), y: figure.h / 2 });
    context.lineWidth = figure.C.edge;
    context.strokeStyle = figure.C.lineStrong;
    context.setLineDash([5, 6]);
    for (let index = 0; index < positions.length - 1; index += 1) {
      context.beginPath();
      context.moveTo(positions[index].x, positions[index].y);
      context.lineTo(positions[index + 1].x, positions[index + 1].y);
      context.stroke();
    }
    context.setLineDash([]);
    positions.forEach((point, index) => {
      const active = index <= figure.step;
      context.fillStyle = active ? figure.C.node : figure.C.surface;
      context.strokeStyle = active ? figure.C.fg : figure.C.lineStrong;
      context.lineWidth = active ? 1.75 : 1;
      context.beginPath();
      context.roundRect(point.x - 58, point.y - 22, 116, 44, 6);
      context.fill();
      context.stroke();
      FS.k.text(figure, context, labels[index], point.x, point.y + 4, { align: "center", size: 12, weight: active ? 600 : 500, color: active ? figure.C.fg : figure.C.muted });
    });
    figure.api.out("position", `${figure.step + 1} / ${labels.length}`);
  },
});

(() => {
  const timeline = document.getElementById("task-timeline");
  const sourceTable = [...document.querySelectorAll("#scenario table")].find(
    table => table.caption?.textContent.includes("名义过程")
  );

  if (timeline && sourceTable) {
    const stages = [...sourceTable.tBodies[0].rows].map(row => {
      const match = row.cells[0].textContent.replace(/\s/g, "").match(/^(\d+)[–-](\d+)min(.+)$/);
      return {
        start: Number(match[1]),
        end: Number(match[2]),
        name: match[3],
        system: row.cells[1].textContent,
        people: row.cells[2].textContent,
        result: row.cells[3].textContent,
      };
    });
    const duration = stages.at(-1).end;
    const palette = ["#2e62a8", "#7352a4", "#087c70", "#7352a4", "#586d7a"];
    const detail = document.getElementById("timeline-detail");
    const buttons = [];

    function selectStage(index) {
      buttons.forEach((button, position) => {
        button.setAttribute("aria-pressed", String(position === index));
      });
      const stage = stages[index];
      detail.replaceChildren();
      const title = document.createElement("strong");
      title.textContent = stage.name + " · " + stage.start + "–" + stage.end + " min";
      detail.append(title);
      for (const [label, text] of [
        ["系统", stage.system], ["人员", stage.people], ["完成条件", stage.result],
      ]) {
        const paragraph = document.createElement("p");
        const heading = document.createElement("b");
        heading.textContent = label + " ";
        paragraph.append(heading, document.createTextNode(text));
        detail.append(paragraph);
      }
    }

    const axis = document.createElement("div");
    axis.className = "timeline-row";
    axis.append(document.createElement("span"));
    const labels = document.createElement("div");
    labels.className = "axis-labels";
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const label = document.createElement("span");
      label.textContent = String(duration * fraction);
      labels.append(label);
    }
    axis.append(labels);
    timeline.append(axis);

    stages.forEach((stage, index) => {
      const row = document.createElement("div");
      row.className = "timeline-row";
      const name = document.createElement("span");
      name.textContent = stage.name;
      const track = document.createElement("div");
      track.className = "timeline-track";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "timeline-block";
      button.textContent = String(stage.end - stage.start);
      button.setAttribute("aria-label", stage.name + "，" + stage.start + "到" + stage.end + "分钟，时长" + (stage.end - stage.start) + "分钟");
      button.setAttribute("aria-controls", "timeline-detail");
      button.style.setProperty("--start", (stage.start / duration * 100) + "%");
      button.style.setProperty("--span", ((stage.end - stage.start) / duration * 100) + "%");
      button.style.setProperty("--phase-color", palette[index]);
      button.addEventListener("click", () => selectStage(index));
      buttons.push(button);
      track.append(button);
      row.append(name, track);
      timeline.append(row);
    });
    selectStage(0);
    timeline.hidden = false;
    detail.hidden = false;
    document.querySelector("#case-sequence > .flow").hidden = true;
  }

  const boundaryChart = document.getElementById("operating-boundary-chart");
  const lab = document.getElementById("scenario-lab");
  if (!boundaryChart || !lab) return;
  const phase = document.getElementById("lab-phase");
  const definitions = [
    {key: "speed", label: "速度", unit: "m/s", min: 0, max: 1, lower: 0, upper: 0.5, input: "lab-speed"},
    {key: "load", label: "载荷", unit: "kg", min: 0, max: 10, lower: 0, upper: 5, input: "lab-load"},
    {key: "temperature", label: "温度", unit: "℃", min: -10, max: 50, lower: 5, upper: 35, input: "lab-temp"},
    {key: "battery", label: "电量", unit: "%", min: 0, max: 100, lower: 25, upper: 100, input: "lab-battery"},
  ];

  const metrics = definitions.map(definition => {
    const metric = document.createElement("div");
    metric.className = "threshold-metric";
    metric.dataset.metric = definition.key;
    const heading = document.createElement("strong");
    heading.textContent = definition.label + " · " + definition.unit;
    const current = document.createElement("span");
    current.className = "chart-note";
    const band = document.createElement("div");
    band.className = "threshold-band";
    band.setAttribute("role", "img");
    const marker = document.createElement("span");
    marker.className = "threshold-marker";
    marker.setAttribute("aria-hidden", "true");
    band.append(marker);
    const axis = document.createElement("div");
    axis.className = "axis-labels";
    for (const value of [definition.min, definition.max]) {
      const label = document.createElement("span");
      label.textContent = String(value);
      axis.append(label);
    }
    const rule = document.createElement("span");
    rule.className = "chart-note";
    metric.append(heading, current, band, axis, rule);
    boundaryChart.append(metric);
    return {...definition, current, band, marker, rule};
  });

  function updateBoundaries() {
    for (const metric of metrics) {
      const input = document.getElementById(metric.input);
      const value = input.value.trim() === "" ? NaN : Number(input.value);
      const lower = metric.key === "battery" ? (phase.value === "start" ? 25 : 20) : metric.lower;
      const lowerPercent = (lower - metric.min) / (metric.max - metric.min) * 100;
      const upperPercent = (metric.upper - metric.min) / (metric.max - metric.min) * 100;
      const finite = Number.isFinite(value);
      const passed = finite && value <= metric.upper && (metric.key === "battery" ? value > lower : value >= lower);
      const position = Math.max(0, Math.min(100, (value - metric.min) / (metric.max - metric.min) * 100));
      const ruleText = metric.key === "battery"
        ? (phase.value === "start" ? "启动" : "运行") + " > " + lower + "%"
        : "允许 " + lower + "～" + metric.upper + " " + metric.unit;
      metric.current.textContent = "当前 " + (finite ? value : "—");
      metric.rule.textContent = ruleText;
      metric.band.style.setProperty("--band-background",
        "linear-gradient(to right,#e1e8ec 0% " + lowerPercent + "%,#b5dfce " + lowerPercent + "% " + upperPercent + "%,#e1e8ec " + upperPercent + "% 100%)"
      );
      metric.marker.style.setProperty("--position", position + "%");
      metric.marker.style.setProperty("--marker-color", passed ? "#145b40" : "#a43c2c");
      metric.marker.hidden = !finite;
      metric.band.setAttribute("aria-label", metric.label + "，" + metric.current.textContent + "，" + ruleText);
      metric.band.dataset.inRange = String(passed);
    }
  }
  lab.addEventListener("input", updateBoundaries);
  lab.addEventListener("change", updateBoundaries);
  lab.addEventListener("click", event => {
    if (event.target.closest("[data-preset]")) updateBoundaries();
  });
  updateBoundaries();
  boundaryChart.hidden = false;
})();

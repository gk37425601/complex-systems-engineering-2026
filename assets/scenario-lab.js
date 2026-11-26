(() => {
  const lab = document.getElementById("scenario-lab");
  if (!lab) return;

  const phase = document.getElementById("lab-phase");
  const heading = document.getElementById("lab-heading");
  const reasonsList = document.getElementById("lab-reasons");
  const result = document.getElementById("lab-result");
  const fields = {
    speed: document.getElementById("lab-speed"),
    load: document.getElementById("lab-load"),
    temperature: document.getElementById("lab-temp"),
    battery: document.getElementById("lab-battery"),
  };
  const checks = {
    dry: document.getElementById("lab-dry"),
    people: document.getElementById("lab-people"),
    link: document.getElementById("lab-link"),
  };

  function readNumber(input) {
    return input.value.trim() === "" ? NaN : Number(input.value);
  }

  function updateResult() {
    const values = Object.fromEntries(
      Object.entries(fields).map(([key, input]) => [key, readNumber(input)])
    );
    const reasons = [];
    if (!Number.isFinite(values.speed) || values.speed < 0 || values.speed > 0.5) {
      reasons.push("速度须在 0～0.5 m/s。");
    }
    if (!Number.isFinite(values.load) || values.load < 0 || values.load > 5) {
      reasons.push("惰性载荷须在 0～5 kg。");
    }
    if (!Number.isFinite(values.temperature) || values.temperature < 5 || values.temperature > 35) {
      reasons.push("温度须在 5～35 ℃。");
    }
    const energyThreshold = phase.value === "start" ? 25 : 20;
    if (!Number.isFinite(values.battery) || values.battery <= energyThreshold || values.battery > 100) {
      reasons.push("本阶段电量须大于 " + energyThreshold + "%，且不超过 100%。");
    }
    if (!checks.dry.checked) reasons.push("核准干燥地面条件未满足。");
    if (!checks.people.checked) reasons.push("人员未退出或清场未完成，保持运动锁定。");
    if (!checks.link.checked) reasons.push("控制连接失效，按超时规则撤销运动许可。");

    const passed = reasons.length === 0;
    result.dataset.status = passed ? "pass" : "blocked";
    heading.textContent = passed
      ? "示例" + (phase.value === "start" ? "启动" : "持续运行") + "条件满足"
      : phase.value === "start" ? "启动被阻止" : "应转入停驻锁定";
    reasonsList.replaceChildren();
    for (const reason of reasons) {
      const item = document.createElement("li");
      item.textContent = reason;
      reasonsList.append(item);
    }
    reasonsList.hidden = passed;
  }

  function applyPreset(name) {
    fields.speed.value = "0.4";
    fields.load.value = "5";
    fields.temperature.value = "20";
    fields.battery.value = name === "battery"
      ? phase.value === "start" ? "25" : "20"
      : "80";
    checks.dry.checked = true;
    checks.people.checked = name !== "people";
    checks.link.checked = name !== "link";
    updateResult();
  }

  lab.addEventListener("input", updateResult);
  lab.addEventListener("change", updateResult);
  lab.querySelectorAll("[data-preset]").forEach(button => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });
  updateResult();
  lab.hidden = false;

  const tabs = [...document.querySelectorAll("[data-condition-tab]")];
  const panels = [...document.querySelectorAll("[data-condition-panel]")];
  function activateTab(group, focus = false) {
    for (const tab of tabs) {
      const active = tab.dataset.conditionTab === group;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.conditionPanel !== group;
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.conditionTab));
    tab.addEventListener("keydown", event => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      activateTab(tabs[next].dataset.conditionTab, true);
    });
  });
  function revealHashTarget() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    const panel = target?.closest("[data-condition-panel]");
    if (panel) {
      activateTab(panel.dataset.conditionPanel);
      requestAnimationFrame(() => target.scrollIntoView({block: "start"}));
    }
  }
  activateTab("environment");
  tabs[0].parentElement.hidden = false;
  addEventListener("hashchange", revealHashTarget);
  revealHashTarget();
})();

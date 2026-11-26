(() => {
  const form = document.getElementById("requirement-filters");
  const categorySelect = document.getElementById("requirement-category");
  const searchInput = document.getElementById("requirement-query");
  const categoryPanel = document.getElementById("requirement-category-chart");
  const categoryBars = document.getElementById("requirement-category-bars");
  const allocationPanel = document.getElementById("allocation-chart");
  const allocationBars = document.getElementById("allocation-bars");
  const allocationStatus = document.getElementById("allocation-chart-status");
  const scopeButtons = Array.from(allocationPanel.querySelectorAll("[data-allocation-scope]"));

  const categories = Array.from(document.querySelectorAll("[data-requirement-category]")).map(section => ({
    id: section.id,
    label: section.querySelector("h4").textContent.replace(/^3\.\d+\s*/, "").replace(/需求$/, ""),
    count: section.querySelectorAll('tbody > tr[id^="sys-"]').length
  }));

  const units = [
    { id: "A1", label: "操作终端" },
    { id: "A2", label: "任务管理" },
    { id: "A3", label: "感知与定位" },
    { id: "A4", label: "运动与载荷" },
    { id: "A5", label: "能源与健康" },
    { id: "A6", label: "记录" },
    { id: "A7", label: "安全监督" }
  ];

  function parseAllocation(text) {
    const normalized = text.normalize("NFKC");
    const allocation = new Set();

    for (const match of normalized.matchAll(/A([1-7])\s*[~～–—-]\s*A?([1-7])/g)) {
      const first = Math.min(Number(match[1]), Number(match[2]));
      const last = Math.max(Number(match[1]), Number(match[2]));
      for (let number = first; number <= last; number += 1) {
        allocation.add("A" + number);
      }
    }

    for (const match of normalized.matchAll(/A([1-7])(?!\d)/g)) {
      allocation.add("A" + match[1]);
    }
    return allocation;
  }

  function safetyAllocationText(cell) {
    let text = "";
    for (const node of cell.childNodes) {
      if (node.nodeName === "BR") break;
      text += node.textContent;
    }
    return text;
  }

  const allocationSets = {
    sys: {
      label: "系统需求",
      entries: Array.from(document.querySelectorAll('tr[id^="sys-"]')).map(row => parseAllocation(row.cells[2].textContent))
    },
    saf: {
      label: "安全需求",
      entries: Array.from(document.querySelectorAll('td[id^="saf-"]')).map(cell => {
        const allocationCell = cell.closest("tr").cells[2];
        return parseAllocation(safetyAllocationText(allocationCell));
      })
    }
  };

  function createBar(tagName, label, count, maximum) {
    const row = document.createElement(tagName);
    row.className = "bar-row";

    const labelElement = document.createElement("span");
    labelElement.className = "bar-label";
    labelElement.textContent = label;

    const track = document.createElement("span");
    track.className = "bar-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.style.setProperty("--bar-size", (count / maximum * 100).toFixed(2) + "%");
    track.append(fill);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = count;
    row.append(labelElement, track, value);
    return row;
  }

  function syncCategorySelection() {
    categoryBars.querySelectorAll("[data-category]").forEach(button => {
      const selected = button.dataset.category === categorySelect.value;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderCategories() {
    const maximum = Math.max(1, ...categories.map(category => category.count));
    categories.forEach(category => {
      const button = createBar("button", category.label, category.count, maximum);
      button.type = "button";
      button.dataset.category = category.id;
      button.setAttribute("aria-controls", category.id);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        categorySelect.value = categorySelect.value === category.id ? "" : category.id;
        searchInput.value = "";
        categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
      });
      categoryBars.append(button);
    });

    const total = categories.reduce((count, category) => count + category.count, 0);
    document.getElementById("requirement-category-chart-title").textContent = "系统需求分布 · " + total + " 项";
    syncCategorySelection();
    categoryPanel.hidden = false;
  }

  function renderAllocations(scope) {
    const series = allocationSets[scope];
    const counts = units.map(unit => series.entries.filter(entry => entry.has(unit.id)).length);
    const maximum = Math.max(1, ...counts);
    allocationBars.replaceChildren();

    units.forEach((unit, index) => {
      const row = createBar("div", unit.id + " " + unit.label, counts[index], maximum);
      row.dataset.unit = unit.id;
      row.setAttribute("role", "listitem");
      allocationBars.append(row);
    });

    scopeButtons.forEach(button => {
      const selected = button.dataset.allocationScope === scope;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    allocationStatus.textContent = "统计范围为完整 " + series.label + "基线，共 " + series.entries.length + " 项。单位为关联条目数。";
    allocationPanel.hidden = false;
  }

  form.addEventListener("requirements-filtered", syncCategorySelection);
  scopeButtons.forEach(button => {
    button.addEventListener("click", () => renderAllocations(button.dataset.allocationScope));
  });

  renderCategories();
  renderAllocations("sys");
})();

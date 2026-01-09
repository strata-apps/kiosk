// ui.js
export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function div(attrs = {}, ...kids) {
  const n = document.createElement("div");
  if (typeof attrs === "string") attrs = { class: attrs };
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") n.className = v;
    else if (k === "style" && v && typeof v === "object") Object.assign(n.style, v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return n;
}

export function button(text, onClick, className = "btn") {
  const b = document.createElement("button");
  b.className = className;
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

export function openModal(node) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = "";
  root.classList.add("open");

  const overlay = div("modal-overlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.appendChild(node);
  root.appendChild(overlay);
}

export function closeModal() {
  const root = document.getElementById("modalRoot");
  root.classList.remove("open");
  root.innerHTML = "";
}

export function toast(message, ms = 1600) {
  const t = div("toast", message);
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 200);
  }, ms);
}

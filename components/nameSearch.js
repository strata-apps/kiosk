// components/nameSearch.js
import { sup } from "../supabaseClient.js";
import { div } from "../ui.js";

export function mountNameSearch(mount, { placeholder = "Type name...", onPick, onNotFound }) {
  mount.innerHTML = "";

  const box = div("name-search");
  const input = document.createElement("input");
  input.className = "input";
  input.placeholder = placeholder;
  input.autocomplete = "off";

  const dd = div("dropdown");
  dd.style.display = "none";

  const hint = div("label", "Tip: type first or last name. Then tap your name.");

  box.append(input, dd, hint);
  mount.appendChild(box);

  let t = null;
  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearTimeout(t);
    t = setTimeout(() => run(q), 180);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      if (q.length < 2) return;
      // If dropdown has a single option, pick it
      const first = dd.querySelector(".dd-item");
      if (first && dd.childElementCount === 1) first.click();
      else if (dd.childElementCount === 0 && onNotFound) onNotFound(q);
    }
  });

  async function run(q) {
    if (q.length < 2) {
      dd.style.display = "none";
      dd.innerHTML = "";
      return;
    }

    const s = sup();
    // broad search: first OR last
    const { data, error } = await s
      .from("contacts")
      .select("contact_id, contact_first, contact_last, contact_email, contact_phone, institution, birthdate, mailing_street_address, mailing_city, mailing_state_province, mailing_zip_postal_code")
      .or(`contact_first.ilike.%${q}%,contact_last.ilike.%${q}%`)
      .limit(12);

    if (error) {
      console.error(error);
      dd.innerHTML = "";
      dd.style.display = "none";
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    dd.innerHTML = "";

    if (!rows.length) {
      const empty = div("dd-empty",
        "No match found. ",
        div({ class: "linkish" }, "Create new contact")
      );
      empty.querySelector(".linkish").addEventListener("click", () => onNotFound && onNotFound(q));
      dd.appendChild(empty);
      dd.style.display = "";
      return;
    }

    rows.forEach((r) => {
      const full = `${r.contact_first || ""} ${r.contact_last || ""}`.trim() || "Unnamed";
      const item = div({ class: "dd-item", role: "button", tabindex: "0" },
        div("dd-main", full),
        div("dd-sub", r.institution || r.contact_email || "—")
      );
      item.addEventListener("click", () => {
        dd.style.display = "none";
        dd.innerHTML = "";
        input.value = full;
        onPick && onPick(r);
      });
      dd.appendChild(item);
    });

    dd.style.display = "";
  }

  return { focus: () => input.focus() };
}

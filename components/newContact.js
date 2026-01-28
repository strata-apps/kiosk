// components/newContact.js
import { sup } from "../supabaseClient.js";
import { div, button, openModal, closeModal, toast } from "../ui.js";

const NEW_FIELDS = [
  ["contact_first", "First name"],
  ["contact_last", "Last name"],
  ["contact_email", "Email"],
  ["contact_phone", "Phone"],
  ["institution", "Institution"],
  ["birthdate", "Birthdate"],
  ["mailing_street_address", "Street address"],
  ["mailing_city", "City"],
  ["mailing_state_province", "State"],
  ["mailing_zip_postal_code", "ZIP"],
];

export function openNewContactModal({ seedName = "" } = {}) {
  return new Promise((resolve) => {
    const node = div(
      { class: "modal-card modal-wide" },
      div(
        "id-header",
        div("id-kicker", "Create contact"),
        div("id-title", "New Contact")
      )
    );

    const seedParts = seedName.split(" ").filter(Boolean);
    const draft = {
      contact_id: crypto.randomUUID(), // client-generated ID (no table edits required)
      contact_first: seedParts[0] || "",
      contact_last: seedParts.slice(1).join(" ") || "",
      contact_email: "",
      contact_phone: "",
      institution: "",
      // birthdate will be stored as YYYY-MM-DD or "" internally before insert normalization
      birthdate: "",
      mailing_street_address: "",
      mailing_city: "",
      mailing_state_province: "",
      mailing_zip_postal_code: "",
    };

    const body = div("id-body");
    const grid = div("id-grid");

    NEW_FIELDS.forEach(([key, label]) => {
      const field = div(
        "id-field",
        div("id-label", label),
        (() => {
          // ✅ Birthdate: month/day/year dropdowns (no free-text)
          if (key === "birthdate") {
            const wrap = div({ class: "birthdate-wrap" });

            const parts = parseISODateParts(draft.birthdate);
            let month = parts.month; // "01".."12" or ""
            let day = parts.day;     // "01".."31" or ""
            let year = parts.year;   // "YYYY" or ""

            const monthSel = makeSelect(
              "Month",
              [
                ["", "Month"],
                ["01", "Jan"],
                ["02", "Feb"],
                ["03", "Mar"],
                ["04", "Apr"],
                ["05", "May"],
                ["06", "Jun"],
                ["07", "Jul"],
                ["08", "Aug"],
                ["09", "Sep"],
                ["10", "Oct"],
                ["11", "Nov"],
                ["12", "Dec"],
              ],
              month
            );

            const daySel = makeSelect(
              "Day",
              [["", "Day"], ...Array.from({ length: 31 }, (_, i) => {
                const v = String(i + 1).padStart(2, "0");
                return [v, String(i + 1)];
              })],
              day
            );

            // Year range: current year down to 1900 (adjust if you want)
            const thisYear = new Date().getFullYear();
            const years = [["", "Year"]];
            for (let y = thisYear; y >= 1900; y--) years.push([String(y), String(y)]);

            const yearSel = makeSelect("Year", years, year);

            const syncDraft = () => {
              // Only set birthdate when all 3 selected; otherwise clear it
              month = monthSel.value;
              day = daySel.value;
              year = yearSel.value;

              if (month && day && year) {
                const iso = `${year}-${month}-${day}`;
                const ok = isValidISODate(iso);
                draft.birthdate = ok ? iso : "";
                if (!ok) {
                  toast("That birthdate isn’t valid. Please choose a real date.");
                }
              } else {
                draft.birthdate = "";
              }
            };

            monthSel.addEventListener("change", syncDraft);
            daySel.addEventListener("change", syncDraft);
            yearSel.addEventListener("change", syncDraft);

            // Optional: slight grouping
            wrap.style.display = "grid";
            wrap.style.gridTemplateColumns = "1fr 1fr 1fr";
            wrap.style.gap = "8px";

            wrap.append(monthSel, daySel, yearSel);
            return wrap;
          }

          // Default: normal input for other fields
          const inp = document.createElement("input");
          inp.className = "input";
          inp.value = draft[key] || "";
          inp.placeholder = label;

          inp.addEventListener("input", () => {
            draft[key] = inp.value;
            if (key === "contact_first" || key === "contact_last") {
              node.querySelector(".id-title").textContent =
                `${draft.contact_first} ${draft.contact_last}`.trim() || "New Contact";
            }
          });

          return inp;
        })()
      );

      grid.appendChild(field);
    });

    body.appendChild(grid);

    const actions = div(
      "modal-actions",
      button("Cancel", () => {
        closeModal();
        resolve(null);
      }, "btn"),
      button(
        "Create",
        async () => {
          const created = await createContact(draft);
          if (!created) return;
          closeModal();
          resolve(created);
        },
        "btn btn-primary"
      )
    );

    node.append(body, actions);
    openModal(node);
  });
}

async function createContact(draft) {
  const s = sup();

  if (!draft.contact_first || !draft.contact_last) {
    toast("Please enter first and last name.");
    return null;
  }

  const payload = { ...draft };

  // ✅ Normalize birthdate:
  // - if empty string => null
  // - if present => must be valid YYYY-MM-DD (Postgres date safe)
  payload.birthdate = (payload.birthdate || "").trim();
  if (!payload.birthdate) {
    payload.birthdate = null;
  } else if (!isValidISODate(payload.birthdate)) {
    toast("Birthdate must be a real date (Month/Day/Year).");
    return null;
  }

  const { data, error } = await s
    .from("contacts")
    .insert(payload)
    .select(
      "contact_id, contact_first, contact_last, contact_email, contact_phone, institution, birthdate, mailing_street_address, mailing_city, mailing_state_province, mailing_zip_postal_code"
    )
    .single();

  if (error) {
    console.error(error);
    toast("Could not create contact (write blocked).");
    return null;
  }

  toast("Contact created.");
  return data;
}

/** ---------- helpers ---------- **/

function makeSelect(ariaLabel, options, selectedValue = "") {
  const sel = document.createElement("select");
  sel.className = "input";
  sel.setAttribute("aria-label", ariaLabel);

  for (const [value, label] of options) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === selectedValue) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

function parseISODateParts(iso) {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { year: "", month: "", day: "" };
  return { year: m[1], month: m[2], day: m[3] };
}

function isValidISODate(iso) {
  const s = String(iso || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;

  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (y < 1900 || y > new Date().getFullYear()) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // JS Date validation (handles month lengths + leap years)
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

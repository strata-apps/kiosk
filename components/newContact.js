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
    const node = div({ class: "modal-card modal-wide" },
      div("id-header",
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
      birthdate: "",
      mailing_street_address: "",
      mailing_city: "",
      mailing_state_province: "",
      mailing_zip_postal_code: "",
    };

    const body = div("id-body");
    const grid = div("id-grid");

    NEW_FIELDS.forEach(([key, label]) => {
      const field = div("id-field",
        div("id-label", label),
        (() => {
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

    const actions = div("modal-actions",
      button("Cancel", () => { closeModal(); resolve(null); }, "btn"),
      button("Create", async () => {
        const created = await createContact(draft);
        if (!created) return;
        closeModal();
        resolve(created);
      }, "btn btn-primary")
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

  const { data, error } = await s
    .from("contacts")
    .insert(payload)
    .select("contact_id, contact_first, contact_last, contact_email, contact_phone, institution, birthdate, mailing_street_address, mailing_city, mailing_state_province, mailing_zip_postal_code")
    .single();

  if (error) {
    console.error(error);
    toast("Could not create contact (write blocked).");
    return null;
  }

  toast("Contact created.");
  return data;
}

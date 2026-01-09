// components/contactCard_modal.js
import { sup } from "../supabaseClient.js";
import { div, button, openModal, closeModal, toast } from "../ui.js";

const FIELDS = [
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

export function openContactCardModal({ contact, titleKicker = "Contact", mode = "event" }) {
  return new Promise((resolve) => {
    let editMode = false;
    let draft = { ...(contact || {}) };

    const node = div({ class: "modal-card modal-wide" });

    const header = div("id-header",
      div("id-kicker", titleKicker),
      div("id-title", `${draft.contact_first || ""} ${draft.contact_last || ""}`.trim() || "Contact")
    );

    const idBody = div("id-body");

    const actions = div("modal-actions",
      button("Cancel", () => { closeModal(); resolve({ action: "cancelled" }); }, "btn"),
      button("Edit", () => { editMode = true; render(); }, "btn"),
      button("Confirm", async () => {
        // Confirm = save if edited, otherwise just resolve
        if (editMode) {
          const saved = await save();
          if (!saved) return;
          closeModal();
          resolve({ action: "updated", contact: saved });
        } else {
          closeModal();
          resolve({ action: "confirmed", contact: draft });
        }
      }, "btn btn-primary")
    );

    node.append(header, idBody, actions);

    function render() {
      node.querySelector(".id-title").textContent =
        `${draft.contact_first || ""} ${draft.contact_last || ""}`.trim() || "Contact";

      idBody.innerHTML = "";

      const grid = div("id-grid");

      FIELDS.forEach(([key, label]) => {
        const val = draft[key] ?? "";
        const field = div("id-field",
          div("id-label", label),
          editMode
            ? makeInput(key, String(val))
            : div("id-value", String(val || "—"))
        );
        grid.appendChild(field);
      });

      idBody.appendChild(grid);

      const btns = actions.querySelectorAll("button");
      const editBtn = btns[1];
      editBtn.textContent = editMode ? "Editing" : "Edit";
      editBtn.disabled = editMode;
    }

    function makeInput(key, value) {
      const inp = document.createElement("input");
      inp.className = "input";
      inp.value = value;
      inp.placeholder = key;
      inp.addEventListener("input", () => {
        draft[key] = inp.value;
        // live update title
        if (key === "contact_first" || key === "contact_last") render();
      });
      return inp;
    }

    async function save() {
      const s = sup();
      if (!draft.contact_id) {
        toast("Missing contact_id.");
        return null;
      }

      // Only update allowed columns
      const payload = {};
      FIELDS.forEach(([key]) => (payload[key] = draft[key] ?? null));

      const { data, error } = await s
        .from("contacts")
        .update(payload)
        .eq("contact_id", draft.contact_id)
        .select("contact_id, contact_first, contact_last, contact_email, contact_phone, institution, birthdate, mailing_street_address, mailing_city, mailing_state_province, mailing_zip_postal_code")
        .single();

      if (error) {
        console.error(error);
        toast("Could not update contact (write blocked).");
        return null;
      }

      toast("Saved.");
      return data;
    }

    render();
    openModal(node);
  });
}

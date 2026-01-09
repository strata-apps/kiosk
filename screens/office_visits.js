// screens/office_visits.js
import { sup } from "../supabaseClient.js";
import { div, button, openModal, closeModal, toast } from "../ui.js";
import { mountNameSearch } from "../components/nameSearch.js";
import { openContactCardModal } from "../components/contactCard_modal.js";
import { openNewContactModal } from "../components/newContact.js";

export async function renderOfficeVisitsScreen(root) {
  root.innerHTML = "";
  root.className = "screen";

  const pageHead = div("page-head");
  pageHead.style.marginTop = "45px";
  pageHead.style.marginLeft = "20px";

  const header = div("kiosk-header",
    div("kiosk-h1", "Office Visit"),
    div("kiosk-sub", "Search your name, confirm your details, then select a reason.")
  );

  const body = div("kiosk-body");
  root.append(pageHead, header, body);

  const panel = div({ class: "card kiosk-panel" },
    div("panel-title", "Enter your full name"),
    div("panel-sub", "Start typing—select your name from the list.")
  );

  const mount = div("name-search-mount");
  panel.appendChild(mount);

  const reasonCard = div({ class: "card kiosk-panel", style: { display: "none" } },
    div("panel-title", "Reason for visit"),
    div("panel-sub", "Choose one option (or type your own).")
  );

  const reasonGrid = div("reason-grid",
    reasonBtn("Tutoring"),
    reasonBtn("Meeting"),
    reasonBtn("Scholarship / Financial Aid"),
    reasonBtn("Application Help"),
    reasonBtn("Other"),
  );

  const customWrap = div("field",
    div("label", "Custom reason (optional)"),
    (() => {
      const inp = document.createElement("input");
      inp.className = "input";
      inp.placeholder = "Type reason...";
      inp.id = "customReason";
      return inp;
    })()
  );

  reasonCard.append(reasonGrid, customWrap);

  const footer = div("kiosk-footer",
    button("Back", () => (window.location.hash = "#/"), "btn"),
    button("Submit Visit", async () => {
      const picked = reasonCard.dataset.reason || "";
      const custom = (document.getElementById("customReason")?.value || "").trim();
      const reason = custom || picked;

      if (!reason) return toast("Pick or type a reason.");

      await insertOfficeVisit(reason);
    }, "btn btn-primary")
  );

  body.append(panel, reasonCard, footer);

  let selectedContact = null;

  mountNameSearch(mount, {
    placeholder: "Type your name...",
    onPick: async (contactRow) => {
      selectedContact = contactRow;

      const result = await openContactCardModal({
        mode: "office",
        contact: selectedContact,
        titleKicker: "Confirm your details",
      });
      if (!result || result.action === "cancelled") return;

      selectedContact = result.contact;
      reasonCard.style.display = "";
      toast("Now select a reason.");
    },
    onNotFound: async (typedValue) => {
      const created = await openNewContactModal({ seedName: typedValue });
      if (!created) return;

      const result = await openContactCardModal({
        mode: "office",
        contact: created,
        titleKicker: "Confirm your details",
      });
      if (!result || result.action === "cancelled") return;

      selectedContact = result.contact;
      reasonCard.style.display = "";
      toast("Now select a reason.");
    },
  });

  function reasonBtn(label) {
    const b = div({ class: "reason-btn", role: "button", tabindex: "0" }, label);
    b.addEventListener("click", () => {
      reasonCard.dataset.reason = label === "Other" ? "" : label;
      [...reasonGrid.querySelectorAll(".reason-btn")].forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      if (label === "Other") toast("Type a custom reason below.");
    });
    return b;
  }

  async function insertOfficeVisit(reason) {
    if (!selectedContact) return toast("Select your name first.");

    const s = sup();
    const payload = {
      contact_first: selectedContact.contact_first || "",
      contact_last: selectedContact.contact_last || "",
      visit_time: new Date().toISOString(),
      reason,
    };

    const { error } = await s.from("office_visits").insert(payload);
    if (error) {
      console.error(error);
      return toast("Could not log visit (write blocked).");
    }

    await showConfirmationModal("Visit logged!", reason);
    window.location.hash = "#/";
  }

  async function showConfirmationModal(title, subtitle) {
    return new Promise((resolve) => {
      const node = div({ class: "modal-card" },
        div("confirm-hero", "✅"),
        div("modal-title", title),
        div("modal-sub", subtitle ? `Reason: ${subtitle}` : ""),
        div("modal-actions",
          button("Done", () => { closeModal(); resolve(true); }, "btn btn-primary")
        )
      );
      openModal(node);
    });
  }
}

// screens/events.js
import { sup } from "../supabaseClient.js";
import { div, button, openModal, closeModal, toast } from "../ui.js";
import { mountNameSearch } from "../components/nameSearch.js";
import { openContactCardModal } from "../components/contactCard_modal.js";
import { openNewContactModal } from "../components/newContact.js";

export async function renderEventsScreen(root) {
  root.innerHTML = "";
  root.className = "screen";

  const pageHead = div("page-head");
  pageHead.style.marginTop = "45px";
  pageHead.style.marginLeft = "20px";

  const header = div("kiosk-header",
    div("kiosk-h1", "Event Check-In"),
    div("kiosk-sub", "Select the event, then search your full name.")
  );

  const stepper = div("kiosk-stepper",
    div({ class: "step active", id: "step1" }, "1. Choose event"),
    div({ class: "step", id: "step2" }, "2. Your name"),
    div({ class: "step", id: "step3" }, "3. Confirm"),
  );

  const body = div("kiosk-body");

  root.append(pageHead, header, stepper, body);

  // Step state
  let selectedEvent = null; // { event_id, event_name, contact_ids }
  let selectedContact = null; // contact row

  await renderStep1();

  async function renderStep1() {
    setStep(1);
    body.innerHTML = "";

    const card = div({ class: "card kiosk-panel" },
      div("panel-title", "Select an event"),
      div("panel-sub", "Tap an event name to continue."),
    );

    const list = div("event-list");
    card.appendChild(list);

    const s = sup();
    const { data, error } = await s
      .from("events")
      .select("event_id, event_name, event_date, contact_ids")
      .order("event_date", { ascending: false });

    const { data: auth } = await s.auth.getUser();
    console.log("[kiosk] user:", auth?.user?.email || "(none)");
    console.log("[kiosk] events error:", error);
    console.log("[kiosk] events count:", (data || []).length);
    console.log("[kiosk] sample events:", (data || []).slice(0, 3));  

    if (error) {
      list.appendChild(div("label", "Error loading events."));
      console.error(error);
    } else {
      (data || []).forEach((e) => {
        const item = div({ class: "event-item", role: "button", tabindex: "0" },
          div("event-name", e.event_name || "Untitled Event"),
          div("event-meta", e.event_date ? new Date(e.event_date).toLocaleDateString() : "—")
        );
        item.addEventListener("click", () => {
          selectedEvent = e;
          renderStep2();
        });
        list.appendChild(item);
      });

      if (!(data || []).length) {
        list.appendChild(div("label", "No events found."));
      }
    }

    body.appendChild(card);

    body.appendChild(
      div("kiosk-footer",
        button("Back", () => (window.location.hash = "#/"), "btn"),
        button("Next →", () => selectedEvent ? renderStep2() : toast("Select an event first."), "btn btn-primary")
      )
    );
  }

  async function renderStep2() {
    setStep(2);
    body.innerHTML = "";

    const card = div({ class: "card kiosk-panel" },
      div("panel-title", "Enter your full name"),
      div("panel-sub", "Start typing—select your name from the list."),
      div("pill", `Event: ${selectedEvent?.event_name || "—"}`)
    );

    const mount = div("name-search-mount");
    card.appendChild(mount);

    mountNameSearch(mount, {
      placeholder: "Type your name...",
      onPick: async (contactRow) => {
        selectedContact = contactRow;

        // Open ID-style modal for confirm/edit
        const result = await openContactCardModal({
          mode: "event",
          contact: selectedContact,
          titleKicker: "Confirm your details",
        });

        // result: { action: 'confirmed'|'updated'|'cancelled', contact }
        if (!result || result.action === "cancelled") return;

        selectedContact = result.contact;

        // Log attendance on the selected event
        await addContactToEventAttendance(selectedEvent.event_id, selectedContact.contact_id);

        await showConfirmationModal("You’ve been checked in!", selectedEvent.event_name);
        window.location.hash = "#/";
      },
      onNotFound: async (typedValue) => {
        const created = await openNewContactModal({ seedName: typedValue });
        if (!created) return;

        // Confirm/edit after creation
        const result = await openContactCardModal({
          mode: "event",
          contact: created,
          titleKicker: "Confirm your details",
        });
        if (!result || result.action === "cancelled") return;

        selectedContact = result.contact;

        await addContactToEventAttendance(selectedEvent.event_id, selectedContact.contact_id);
        await showConfirmationModal("You’ve been checked in!", selectedEvent.event_name);
        window.location.hash = "#/";
      },
    });

    body.appendChild(card);

    body.appendChild(
      div("kiosk-footer",
        button("Back", () => renderStep1(), "btn"),
        button("Next →", () => toast("Select your name to continue."), "btn btn-primary")
      )
    );
  }

  function setStep(n) {
    ["step1", "step2", "step3"].forEach((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("active", idx + 1 === n);
      el.classList.toggle("done", idx + 1 < n);
    });
  }

  async function addContactToEventAttendance(event_id, contact_id) {
    const s = sup();
    const cid = String(contact_id);

    // This follows the same "contact_ids is JSON array of strings" pattern used in attendance.js :contentReference[oaicite:1]{index=1}
    const { data: row, error: readErr } = await s
      .from("events")
      .select("event_id, contact_ids")
      .eq("event_id", event_id)
      .single();

    if (readErr) {
      console.error(readErr);
      toast("Could not update attendance.");
      return;
    }

    const arr = Array.isArray(row?.contact_ids) ? row.contact_ids : [];
    const next = arr.includes(cid) ? arr : [...arr, cid];

    const { error: upErr } = await s
      .from("events")
      .update({ contact_ids: next })
      .eq("event_id", event_id);

    if (upErr) {
      console.error(upErr);
      toast("Could not check you in (write blocked).");
      return;
    }

    toast("Attendance recorded.");
  }

  async function showConfirmationModal(title, subtitle) {
    return new Promise((resolve) => {
      const node = div({ class: "modal-card" },
        div("confirm-hero", "✅"),
        div("modal-title", title),
        div("modal-sub", subtitle ? `Event: ${subtitle}` : ""),
        div("modal-actions",
          button("Done", () => { closeModal(); resolve(true); }, "btn btn-primary")
        )
      );
      openModal(node);
    });
  }
}

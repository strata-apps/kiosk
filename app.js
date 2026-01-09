// app.js
import { initSupabase } from "./supabaseClient.js";
import { startRouter } from "./router.js";
import { KIOSK_BRAND } from "./config.js";
import { div, button, openModal, closeModal } from "./ui.js";

// ✅ Initialize Supabase once, and await it (top-level await is fine in type="module")
await initSupabase();

const root = document.getElementById("app");

function renderLanding(rootEl) {
  rootEl.innerHTML = "";
  rootEl.className = "screen screen-landing";

  const pageHead = div("page-head");
  pageHead.style.marginTop = "45px";
  pageHead.style.marginLeft = "20px";

  const wrap = div("landing-wrap",
    div("landing-card",
      div("brand",
        (() => {
          const img = document.createElement("img");
          img.src = KIOSK_BRAND.logoUrl;
          img.alt = KIOSK_BRAND.name;
          img.className = "brand-logo";
          return img;
        })(),
        div("brand-title", KIOSK_BRAND.name)
      ),
      button("Check In", () => openCheckInChoice(), "btn btn-primary btn-big"),
    )
  );

  rootEl.append(pageHead, wrap);
}

function openCheckInChoice() {
  const card = div({ class: "modal-card" },
    div("modal-title", "What are you checking in for?"),
    div("modal-grid",
      div({ class: "rp-card rp-mint kiosk-choice", role: "button", tabindex: "0" },
        div({}, div("rp-card-title", "Event"), div("rp-card-sub", "Check into a scheduled event.")),
        div("rp-card-icon", "📅"),
        div("rp-badge", "→")
      ),
      div({ class: "rp-card rp-lav kiosk-choice", role: "button", tabindex: "0" },
        div({}, div("rp-card-title", "Office Visit"), div("rp-card-sub", "Log an in-office visit.")),
        div("rp-card-icon", "🏢"),
        div("rp-badge", "→")
      )
    ),
    div("modal-actions",
      button("Cancel", () => closeModal(), "btn")
    )
  );

  const [eventTile, officeTile] = card.querySelectorAll(".kiosk-choice");
  eventTile.addEventListener("click", () => { closeModal(); window.location.hash = "#/events"; });
  officeTile.addEventListener("click", () => { closeModal(); window.location.hash = "#/office"; });

  openModal(card);
}

startRouter(root, renderLanding);

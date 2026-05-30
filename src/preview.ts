import { writeFileSync } from "fs";
import { DateTime } from "luxon";
import { buildEmailHtml } from "./buildEmail";
import { HistoryData } from "./types";

/**
 * Renders the email template to ./preview.html using sample data so the
 * design can be inspected in a browser without API keys or sending mail.
 * Run with: npm run preview
 */
const sample: HistoryData = {
  global: {
    title: "The Fall of Constantinople",
    year: "1453",
    location: "Constantinople, Byzantine Empire",
    synopsis:
      "At dawn the great Theodosian Walls, which had repelled invaders for a thousand years, finally gave way.\n\nThe Ottoman cannon of Mehmed II had spoken for weeks, and on this morning the city's defenders, exhausted and outnumbered, could hold no longer.\n\nBy nightfall a new empire stood astride two continents, and the medieval world quietly closed its books.",
    keyFigures: [
      { name: "Mehmed II", role: "Ottoman Sultan", significance: "Conqueror who reshaped the map of Europe and Asia." },
      { name: "Constantine XI", role: "Last Byzantine Emperor", significance: "Died defending the city walls." },
    ],
    impact:
      "The conquest severed Europe's overland routes to Asia, spurring the Age of Exploration.\n\nIts echoes reached from the spice trade to the Renaissance, as Greek scholars fled west with their manuscripts.",
    references: [
      { title: "Encyclopaedia Britannica — Fall of Constantinople", url: "https://www.britannica.com/event/Fall-of-Constantinople-1453" },
      { title: "Steven Runciman, The Fall of Constantinople 1453 (Cambridge University Press)" },
    ],
  },
  southeastAsia: {
    title: "Founding of Majapahit",
    year: "1293",
    location: "East Java, Indonesia",
    synopsis:
      "From the ashes of a failed Mongol invasion, Raden Wijaya forged what would become Southeast Asia's greatest maritime empire.",
    keyFigures: [
      { name: "Raden Wijaya", role: "Founder", significance: "First king of Majapahit." },
    ],
    impact: "Majapahit's reach shaped trade and culture across the archipelago for two centuries.",
    references: [
      { title: "Encyclopaedia Britannica — Majapahit empire" },
    ],
  },
  // null demonstrates the honest empty-state card for a day with no verified
  // Malaysia event (which is the common case).
  malaysia: null,
};

const dateLabel = DateTime.now().setZone("Asia/Kuala_Lumpur").toFormat("LLLL d, yyyy");
const html = buildEmailHtml(sample, dateLabel, "Gemini");
writeFileSync("preview.html", html, "utf8");
console.log("Wrote preview.html — open it in a browser to inspect the design.");

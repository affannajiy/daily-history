import { writeFileSync } from "fs";
import { DateTime } from "luxon";
import { buildEmailHtml } from "./buildEmail";
import { buildEmailText } from "./buildText";
import { buildSubject } from "./subject";
import { HistoryData } from "./types";

/**
 * Renders the email template to ./preview.html using sample data so the design
 * can be inspected in a browser without API keys or sending mail.
 * Run with: npm run preview
 *
 * The sample deliberately covers all three render paths at once — a fully
 * enriched event, an event whose article text could not be fetched, and the
 * figure card used when a region has no event that day — because those are the
 * three shapes a real morning can produce and each fails differently.
 *
 * The lead card carries an image and the other two do not, which is also what
 * production does: only the global slot ever requests one, and it gets one only
 * when the licence checks out.
 */
const sample: HistoryData = {
  // Path 1: full enrichment. Fact strip, timeline, statistics, key figures.
  global: {
    kind: "event",
    title: "The Fall of Constantinople",
    year: "1453",
    location: "Constantinople, Byzantine Empire",
    standfirst:
      "Cannon fire ended a thousand-year city in fifty-three days, and Europe went looking for a sea route east.",
    facts: [
      { label: "Who", value: "Mehmed II's Ottoman army" },
      { label: "What", value: "Siege and capture of the capital" },
      { label: "Where", value: "Theodosian Walls, Constantinople" },
      { label: "When", value: "29 May 1453, before dawn" },
    ],
    whatHappened:
      "Mehmed II brought eighty thousand men and a bombard cast by the Hungarian engineer Orban to a city defended by roughly seven thousand. The gun threw a 270 kg stone ball and needed three hours to reload.\n\nThe walls held for fifty-three days. On 29 May the Ottomans forced the Kerkoporta postern and the St Romanus gate within an hour of each other; Giovanni Giustiniani was wounded and carried from the line, and the defence at that section collapsed with him.",
    timeline: [
      { when: "6 Apr 1453", what: "Ottoman batteries open fire on the land walls." },
      { when: "22 Apr", what: "Ships are hauled overland into the Golden Horn, flanking the chain." },
      { when: "29 May", what: "The Kerkoporta is forced; Constantine XI dies in the fighting." },
      { when: "1454", what: "Mehmed installs Gennadius Scholarius as patriarch under Ottoman authority." },
    ],
    numbers: [
      { value: "53", label: "days of siege" },
      { value: "270kg", label: "stone shot fired by Orban's bombard" },
      { value: "7,000", label: "defenders against roughly 80,000" },
    ],
    keyFigures: [
      {
        name: "Mehmed II",
        role: "Ottoman Sultan, aged 21",
        significance: "Ordered the overland ship transfer that bypassed the Golden Horn chain.",
      },
      {
        name: "Giovanni Giustiniani",
        role: "Genoese commander of the land walls",
        significance: "Held the St Romanus section until wounded on the final morning.",
      },
    ],
    whatChangedAfter:
      "Mehmed moved the Ottoman capital to the city and rebuilt its population by decree, resettling families from Anatolia and the Balkans. Hagia Sophia became a mosque within days.\n\nVenetian and Genoese trading privileges in the Black Sea ended. Portugal's crown funded Atlantic voyages down the African coast through the 1450s and 1460s, and Greek scholars carrying manuscripts settled in Florence, Venice and Rome.",
    references: [
      { title: "Wikipedia — Fall of Constantinople", url: "https://en.wikipedia.org/wiki/Fall_of_Constantinople" },
      { title: "Encyclopaedia Britannica" },
    ],
    image: {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Zonaro_GateofConquest.jpg/1200px-Zonaro_GateofConquest.jpg",
      alt: "Ottoman troops and cannon advancing through a breached city gate.",
      credit: "Fausto Zonaro — Public domain",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Zonaro_GateofConquest.jpg",
    },
  },

  // Path 2: the article fetch failed, so the card stays short and honest
  // instead of being padded out to the same length as the one above.
  southeastAsia: {
    kind: "event",
    title: "Founding of Majapahit",
    year: "1293",
    location: "East Java",
    standfirst: "Raden Wijaya turned a Mongol invasion force into the opening move of his own kingdom.",
    facts: [
      { label: "Who", value: "Raden Wijaya" },
      { label: "What", value: "Kingdom founded at Trowulan" },
      { label: "Where", value: "East Java" },
      { label: "When", value: "1293" },
    ],
    whatHappened:
      "Raden Wijaya allied with the Yuan expedition sent against Kediri, then turned on it once Kediri had fallen and drove it out of Java.",
    timeline: [],
    numbers: [],
    keyFigures: [
      { name: "Raden Wijaya", role: "First king of Majapahit", significance: "Reigned as Kertarajasa Jayawardhana." },
    ],
    whatChangedAfter: "",
    references: [
      { title: "Wikipedia — Majapahit", url: "https://en.wikipedia.org/wiki/Majapahit" },
      { title: "Wikipedia (ID) — Majapahit", url: "https://id.wikipedia.org/wiki/Majapahit" },
    ],
    image: null,
  },

  // Path 3: no verified Malaysian event that day, so the slot falls back to a
  // person from the same day's births/deaths feed.
  malaysia: {
    kind: "figure",
    title: "Tunku Abdul Rahman",
    year: "1903–1990",
    location: "Kuala Lumpur, Malaysia",
    standfirst: "Negotiated independence in London, then read it out in a stadium in Kuala Lumpur.",
    anchor: "Born on this day, 1903",
    facts: [
      { label: "Born", value: "8 February 1903, Alor Setar, Kedah" },
      { label: "Died", value: "6 December 1990, Kuala Lumpur" },
      { label: "Field", value: "Law and politics" },
      { label: "Known for", value: "First Prime Minister of Malaya" },
    ],
    whatTheyDid:
      "Called to the bar at the Inner Temple in 1949, he took over UMNO in 1951 and built the Alliance with the MCA and the MIC, which took 51 of 52 seats in the 1955 federal election.\n\nHe led the delegation to London in January 1956 that fixed the date of independence, and declared Merdeka at the Stadium Merdeka on 31 August 1957.",
    timeline: [
      { when: "1951", what: "Becomes president of UMNO." },
      { when: "1955", what: "The Alliance wins 51 of 52 seats in the first federal election." },
      { when: "1957", what: "Declares independence at Stadium Merdeka on 31 August." },
      { when: "1963", what: "Oversees the formation of Malaysia with Sabah, Sarawak and Singapore." },
    ],
    numbers: [],
    legacy:
      "The Alliance's communal power-sharing formula became the Barisan Nasional, which governed Malaysia until 2018. The Tunku Abdul Rahman Foundation and Universiti Tunku Abdul Rahman carry his name.",
    references: [
      { title: "Wikipedia — Tunku Abdul Rahman", url: "https://en.wikipedia.org/wiki/Tunku_Abdul_Rahman" },
      { title: "Wikipedia (MS) — Tunku Abdul Rahman", url: "https://ms.wikipedia.org/wiki/Tunku_Abdul_Rahman" },
      { title: "Arkib Negara Malaysia" },
    ],
    image: null,
  },
};

const now = DateTime.now().setZone("Asia/Kuala_Lumpur");
const dateLabel = now.toFormat("LLLL d, yyyy");
const archiveUrl = "https://affannajiy.github.io/daily-history/sample.html";

const html = buildEmailHtml(sample, dateLabel, archiveUrl);
const text = buildEmailText(sample, dateLabel, archiveUrl);

writeFileSync("preview.html", html, "utf8");
writeFileSync("preview.txt", text, "utf8");

// The subject and preheader are printed rather than rendered: they are the two
// strings the reader sees before opening anything, and they live in the inbox,
// not in the page.
console.log(`Subject:   ${buildSubject(sample, now.toFormat("LLL d"))}`);
console.log(
  `Wrote preview.html (${Math.round(Buffer.byteLength(html, "utf8") / 1024)} KB) ` +
    `and preview.txt — open the HTML in a browser to inspect the design.`
);

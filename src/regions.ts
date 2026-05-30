import { OnThisDayEvent } from "./fetchOnThisDay";

/**
 * Deterministic region classification. We do NOT trust the language model to
 * scan dozens of events and decide which belong to Southeast Asia or Malaysia —
 * the weaker fallback model misses obvious ones. Instead we filter here against
 * the event text and its linked article titles (which include normalised place
 * names like "Myanmar" or "South Vietnam"), and hand the model only a short
 * candidate list to expand.
 */

const MALAYSIA =
  /\b(malaysia|malaysian|malaya|malayan|malacca|melaka|kuala lumpur|penang|perak|selangor|johor|kedah|kelantan|terengganu|pahang|negeri sembilan|sarawak|sabah|north borneo|straits settlements|tanah melayu|federated malay states|malay peninsula|malay sultanate)\b/i;

const SEA =
  /\b(indonesia|indonesian|jakarta|batavia|dutch east indies|sukarno|suharto|majapahit|srivijaya|aceh|sumatra|\bjava\b|\bbali\b|thailand|thai|siam|siamese|bangkok|ayutthaya|vietnam|vietnamese|saigon|hanoi|indochina|champa|annam|tonkin|philippine|philippines|manila|filipino|singapore|singaporean|myanmar|burma|burmese|rangoon|yangon|naypyidaw|aung san|national league for democracy|depayin|cambodia|cambodian|khmer|phnom penh|angkor|\blaos\b|\blao\b|vientiane|lan xang|luang prabang|brunei|timor)\b/i;

function matches(re: RegExp, e: OnThisDayEvent): boolean {
  return re.test(e.text) || e.pages.some((p) => re.test(p));
}

export interface RegionalCandidates {
  /** SEA events that are NOT Malaysia-specific (so the two lists never overlap). */
  southeastAsia: OnThisDayEvent[];
  malaysia: OnThisDayEvent[];
}

export function classifyRegions(events: OnThisDayEvent[]): RegionalCandidates {
  const malaysia = events.filter((e) => matches(MALAYSIA, e));
  const southeastAsia = events.filter(
    (e) => matches(SEA, e) && !matches(MALAYSIA, e)
  );
  return { southeastAsia, malaysia };
}

import slide01 from "./assets/deck/slide-01.jpg";
import slide02 from "./assets/deck/slide-02.jpg";
import slide03 from "./assets/deck/slide-03.jpg";
import slide04 from "./assets/deck/slide-04.jpg";
import slide05 from "./assets/deck/slide-05.jpg";
import slide06 from "./assets/deck/slide-06.jpg";
import slide07 from "./assets/deck/slide-07.jpg";
import slide08 from "./assets/deck/slide-08.jpg";
import slide09 from "./assets/deck/slide-09.jpg";
import slide10 from "./assets/deck/slide-10.jpg";

export interface DeckSlide {
  readonly src: string;
  readonly alt: string;
}

export const deckSlides: readonly DeckSlide[] = [
  { src: slide01, alt: "Slide 1: Advertek Agent Rail — the print vendor AI agents can order from directly." },
  { src: slide02, alt: "Slide 2, The problem: an AI agent can't buy a physical object from a print vendor today." },
  { src: slide03, alt: "Slide 3, The solution: an API and an MCP server — an agent specs it, pays for it, gets it shipped." },
  { src: slide04, alt: "Slide 4, Why now: three protocols — MCP, ACP, and UCP — just made this buildable, not theoretical." },
  { src: slide05, alt: "Slide 5, How it works: spec to cash in seven steps, zero humans." },
  { src: slide06, alt: "Slide 6, The market: five mass-market wedges, one rail underneath all of them." },
  { src: slide07, alt: "Slide 7, The model: two motions, one system — the DTC storefront and the agent rail." },
  { src: slide08, alt: "Slide 8, Where we are: pre-launch, moving fast, talking to real vendors and customers now." },
  { src: slide09, alt: "Slide 9, Why us: we've built the thing categories get built on before." },
  { src: slide10, alt: "Slide 10, The ask: applying for the standard YC deal." },
];

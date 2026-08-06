export interface DeckSlide {
  readonly src: string;
  readonly alt: string;
}

// Slide images are static assets served from apps/web/public/deck/.
export const deckSlides: readonly DeckSlide[] = [
  { src: "/deck/slide-01.jpg", alt: "Slide 1: Advertek Agent Rail — the print vendor AI agents can order from directly." },
  { src: "/deck/slide-02.jpg", alt: "Slide 2, The problem: an AI agent can't buy a physical object from a print vendor today." },
  { src: "/deck/slide-03.jpg", alt: "Slide 3, The solution: an API and an MCP server — an agent specs it, pays for it, gets it shipped." },
  { src: "/deck/slide-04.jpg", alt: "Slide 4, Why now: three protocols — MCP, ACP, and UCP — just made this buildable, not theoretical." },
  { src: "/deck/slide-05.jpg", alt: "Slide 5, How it works: spec to cash in seven steps, zero humans." },
  { src: "/deck/slide-06.jpg", alt: "Slide 6, The market: five mass-market wedges, one rail underneath all of them." },
  { src: "/deck/slide-07.jpg", alt: "Slide 7, The model: two motions, one system — the DTC storefront and the agent rail." },
  { src: "/deck/slide-08.jpg", alt: "Slide 8, Where we are: pre-launch, moving fast, talking to real vendors and customers now." },
  { src: "/deck/slide-09.jpg", alt: "Slide 9, Why us: we've built the thing categories get built on before." },
  { src: "/deck/slide-10.jpg", alt: "Slide 10, The ask: applying for the standard YC deal." },
];

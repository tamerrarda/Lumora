// Documentation navigation structure (shared by sidebar + prev/next).
export interface DocLink {
  href: string;
  label: string;
}
export interface DocGroup {
  title: string;
  items: DocLink[];
}

export const DOC_NAV: DocGroup[] = [
  {
    title: "Getting started",
    items: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Product",
    items: [
      { href: "/docs/features", label: "Features" },
      { href: "/docs/architecture", label: "Architecture" },
    ],
  },
  {
    title: "Resources",
    items: [{ href: "/docs/faq", label: "FAQ" }],
  },
];

// Flat ordered list for prev/next navigation.
export const DOC_ORDER: DocLink[] = DOC_NAV.flatMap((g) => g.items);

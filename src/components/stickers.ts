export const svgToDataUrl = (svg: string) =>
  `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

export const STICKERS = [
  {
    id: "star",
    name: "Star",
    dataUrl: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <path fill="#facc15" d="M128 18l30 78 84 6-65 52 20 82-69-46-69 46 20-82-65-52 84-6z"/>
    </svg>`)
  },
  {
    id: "heart",
    name: "Heart",
    dataUrl: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <path fill="#fb7185" d="M128 228s-84-52-110-102C-6 78 32 34 76 34c22 0 40 10 52 26 12-16 30-26 52-26 44 0 82 44 58 92-26 50-110 102-110 102z"/>
    </svg>`)
  },
  {
    id: "arrow",
    name: "Arrow",
    dataUrl: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <path fill="#60a5fa" d="M24 128h144l-40-40 16-16 72 72-72 72-16-16 40-40H24z"/>
    </svg>`)
  }
];

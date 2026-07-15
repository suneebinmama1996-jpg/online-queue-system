export interface ThemeConfig {
  id: string; // Theme Preset ID
  name: string; // Name in Thai
  colorName: 'pink' | 'emerald' | 'sky' | 'indigo' | 'amber' | 'slate' | 'purple' | 'rose';
  roundedStyle: 'none' | 'normal' | 'extra' | 'full';
  fontSizeMultiplier: number; // e.g. 0.95 | 1.0 | 1.15 | 1.3
  backgroundStyle: 'slate' | 'cream' | 'dark' | 'glass';
  showGridPattern: boolean;
  logoUrl?: string; // Optional logo URL for branding
}

export const colorPaletteMap: Record<string, Record<number, string>> = {
  pink: {
    50: "#fdf2f8",
    100: "#fce7f3",
    200: "#fbcfe8",
    300: "#f9a8d4",
    400: "#f472b6",
    500: "#ec4899",
    600: "#db2777",
    700: "#be185d",
    800: "#9d174d",
    900: "#831843"
  },
  emerald: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d"
  },
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e"
  },
  indigo: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95"
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f"
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a"
  },
  purple: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    800: "#6b21a8",
    900: "#581c87"
  },
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337"
  }
};

export const themePresetMenus: ThemeConfig[] = [
  {
    id: "sakura",
    name: "🌸 ซากุระพาสเทล (Sakura Classic)",
    colorName: "pink",
    roundedStyle: "extra",
    fontSizeMultiplier: 1.0,
    backgroundStyle: "slate",
    showGridPattern: true
  },
  {
    id: "mint",
    name: "🍃 มินต์ธรรมชาติ (Mint Nature)",
    colorName: "emerald",
    roundedStyle: "normal",
    fontSizeMultiplier: 1.0,
    backgroundStyle: "cream",
    showGridPattern: true
  },
  {
    id: "breeze",
    name: "🌊 มหาสมุทรสีฟ้า (Ocean Breeze)",
    colorName: "sky",
    roundedStyle: "normal",
    fontSizeMultiplier: 1.0,
    backgroundStyle: "slate",
    showGridPattern: false
  },
  {
    id: "amethyst",
    name: "🔮 อเมทิสต์สีม่วง (Amethyst Lavender)",
    colorName: "indigo",
    roundedStyle: "extra",
    fontSizeMultiplier: 1.0,
    backgroundStyle: "slate",
    showGridPattern: true
  },
  {
    id: "sunset",
    name: "🌅 ส้มอำพันยามเย็น (Sunset Amber)",
    colorName: "amber",
    roundedStyle: "normal",
    fontSizeMultiplier: 1.0,
    backgroundStyle: "cream",
    showGridPattern: true
  },
  {
    id: "charcoal",
    name: "🕶️ รัตติกาลลึกลับ (Mystic Charcoal)",
    colorName: "slate",
    roundedStyle: "none",
    fontSizeMultiplier: 1.0,
    backgroundStyle: "dark",
    showGridPattern: false
  }
];

export const getThemeCssContent = (theme: ThemeConfig): string => {
  const palette = colorPaletteMap[theme.colorName] || colorPaletteMap.pink;
  
  // Base corner radius mapping
  let rXl = "12px";
  let r2Xl = "16px";
  let r3Xl = "24px";
  if (theme.roundedStyle === "none") {
    rXl = "0px";
    r2Xl = "0px";
    r3Xl = "0px";
  } else if (theme.roundedStyle === "extra") {
    rXl = "18px";
    r2Xl = "24px";
    r3Xl = "32px";
  } else if (theme.roundedStyle === "full") {
    rXl = "30px";
    r2Xl = "40px";
    r3Xl = "50px";
  }

  // Base background style mapping
  let bodyBg = "#f8fafc"; // default light slate
  if (theme.backgroundStyle === "cream") {
    bodyBg = "#fdfbf7"; // warm eye-care cream
  } else if (theme.backgroundStyle === "dark") {
    bodyBg = "#0b0f19"; // deep dark slate
  } else if (theme.backgroundStyle === "glass") {
    bodyBg = "#f1f5f9";
  }

  // Grid pattern
  const patternColor = theme.backgroundStyle === "dark" ? "rgba(255,255,255,0.02)" : "rgba(219,39,119,0.03)";
  const patternCss = theme.showGridPattern 
    ? `background-image: radial-gradient(${patternColor} 1.5px, transparent 1.5px); background-size: 20px 20px;` 
    : "background-image: none;";

  const baseFontPercent = theme.fontSizeMultiplier * 100;

  return `
    :root {
      --color-pink-50: ${palette[50]};
      --color-pink-100: ${palette[100]};
      --color-pink-200: ${palette[200]};
      --color-pink-300: ${palette[300]};
      --color-pink-400: ${palette[400]};
      --color-pink-500: ${palette[500]};
      --color-pink-600: ${palette[600]};
      --color-pink-700: ${palette[700]};
      --color-pink-800: ${palette[800]};
      --color-pink-900: ${palette[900]};
      
      --radius-xl: ${rXl};
      --radius-2xl: ${r2Xl};
      --radius-3xl: ${r3Xl};
    }
    
    html {
      font-size: ${baseFontPercent}% !important;
    }

    body {
      background-color: ${bodyBg} !important;
      transition: background-color 0.3s ease;
      ${theme.backgroundStyle === 'dark' ? 'color: #e2e8f0 !important;' : ''}
    }

    /* Target specific components in Dark Mode if configured */
    ${theme.backgroundStyle === 'dark' ? `
      .bg-white {
        background-color: #111827 !important;
        border-color: #1f2937 !important;
        color: #f3f4f6 !important;
      }
      .text-slate-800, .text-slate-700, .text-slate-600 {
        color: #d1d5db !important;
      }
      .border-pink-100, .border-pink-50, .border-slate-200, .border-slate-100 {
        border-color: #1f2937 !important;
      }
      input, select, textarea {
        background-color: #1f2937 !important;
        border-color: #374151 !important;
        color: #f9fafb !important;
      }
      .bg-slate-50, .bg-pink-50\\/40, .bg-pink-50\\/15, .bg-slate-50\\/50 {
        background-color: #1f2937 !important;
        color: #f3f4f6 !important;
      }
      .bg-pink-50\\/25, .bg-pink-50\\/30, .bg-pink-50\\/50 {
        background-color: rgba(31, 41, 55, 0.5) !important;
      }
      .shadow-inner {
        box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.4) !important;
      }
      .text-pink-700, .text-pink-600, .text-pink-800, .text-pink-500 {
        color: ${palette[300]} !important;
      }
    ` : ''}

    .theme-grid-bg {
      ${patternCss}
    }
  `;
};

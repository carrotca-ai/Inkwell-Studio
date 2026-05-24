export type Template = {
  id: string;
  title: string;
  prompt: string;
  thumb: string; // remote URL placeholder
};

export const TEMPLATES: Template[] = [
  {
    id: "chibi",
    title: "Chibi",
    prompt:
      "A stylized 3D rendered chibi character portrait with oversized eyes, cute expression, denim jacket, studio lighting, blurred urban background.",
    thumb:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "headshot",
    title: "Professional\nHeadshot",
    prompt:
      "Professional corporate headshot of a smiling young person wearing a dark blazer over a white shirt, balanced flattering lighting, clean neutral gray background.",
    thumb:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80&auto=format&fit=crop",
  },
  {
    id: "logo",
    title: "Logo Editor",
    prompt: "Minimalist geometric logo on a dark obsidian background.",
    thumb: "",
  },
  {
    id: "70s",
    title: "70s Style",
    prompt:
      "A retro-styled portrait in 1970s fashion, warm nostalgic film grain, vintage clothing, softly blurred old city street, cinematic mood.",
    thumb:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80&auto=format&fit=crop",
  },
];

// Placeholder thumbnails for the "Animate your photos" rail.
export const ANIMATE_THUMBS = [
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&q=70&auto=format&fit=crop",
];

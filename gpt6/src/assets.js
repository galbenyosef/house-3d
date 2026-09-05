// Keep runtime-loaded models and images inside the same deployment prefix as Vite.
export const assetUrl = path => `${import.meta.env?.BASE_URL || '/'}${path}`;

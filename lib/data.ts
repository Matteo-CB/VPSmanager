
export const frameworkIcon = (fw: string): string => {
  const map: Record<string, string> = {
    NEXTJS: "framework-next", ASTRO: "framework-astro", REMIX: "framework-remix",
    SVELTEKIT: "framework-svelte", NUXT: "framework-nuxt",
    VITE_REACT: "framework-vite", VITE_VUE: "framework-vite", VITE_SVELTE: "framework-vite",
    FASTAPI: "framework-python", DJANGO: "framework-python", FLASK: "framework-python",
    DOCKER_COMPOSE: "framework-docker", DOCKERFILE: "framework-docker",
    STATIC: "globe",
  };
  return map[fw] || "file";
};

export const frameworkLabel = (fw: string): string => {
  const map: Record<string, string> = {
    NEXTJS: "Next.js", ASTRO: "Astro", REMIX: "Remix", SVELTEKIT: "SvelteKit", NUXT: "Nuxt",
    VITE_REACT: "Vite · React", VITE_VUE: "Vite · Vue", VITE_SVELTE: "Vite · Svelte",
    FASTAPI: "FastAPI", DJANGO: "Django", FLASK: "Flask",
    DOCKER_COMPOSE: "Compose", DOCKERFILE: "Docker", STATIC: "Static",
  };
  return map[fw] ?? fw;
};

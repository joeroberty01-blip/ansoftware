import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Afya Nyumbani ERP",
    short_name: "Afya ERP",
    description: "Afya Nyumbani system: visits, patients, finance and notifications.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f3f7fd",
    theme_color: "#0d4ea6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

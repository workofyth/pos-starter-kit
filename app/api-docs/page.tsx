"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: SwaggerUIBundle } = await import(
        "swagger-ui-dist/swagger-ui-bundle.js"
      );
      if (cancelled || !containerRef.current) return;

      SwaggerUIBundle({
        url: "/openapi.json",
        domNode: containerRef.current,
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={containerRef} />;
}

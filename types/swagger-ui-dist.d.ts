declare module "swagger-ui-dist/swagger-ui-bundle.js" {
  interface SwaggerUIBundleOptions {
    url?: string;
    domNode?: HTMLElement | null;
    deepLinking?: boolean;
    presets?: unknown[];
    layout?: string;
    [key: string]: unknown;
  }

  interface SwaggerUIBundleFn {
    (options: SwaggerUIBundleOptions): unknown;
    presets: { apis: unknown };
    plugins: Record<string, unknown>;
  }

  const SwaggerUIBundle: SwaggerUIBundleFn;
  export default SwaggerUIBundle;
}

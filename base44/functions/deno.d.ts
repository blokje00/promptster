/**
 * Minimal ambient declarations so the IDE's TypeScript service (which doesn't
 * know Deno) stops flagging valid Deno code. The real types come from the
 * Deno runtime at deploy time.
 */

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get(key: string): string | undefined };
  [key: string]: any;
};

// npm: import specifiers used by Base44 Deno functions
declare module 'npm:@base44/sdk@0.8.4' {
  export function createClientFromRequest(req: Request): any;
}

declare module 'npm:*' {
  const mod: any;
  export = mod;
}

declare module 'npm:@base44/sdk@0.8.6' {
  export function createClientFromRequest(req: Request): any;
}

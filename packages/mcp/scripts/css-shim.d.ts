// Vite handles CSS side-effect imports at build time; the standalone typecheck
// harness needs the module declaration that a Vite app gets from `vite/client`.
declare module '*.css'

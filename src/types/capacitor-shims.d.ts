/**
 * Module shims for native-only Capacitor packages.
 *
 * These are dynamically imported inside try/catch in src/lib/native.ts and
 * src/lib/purchases.ts; they only resolve at runtime on iOS/Android Capacitor
 * builds. The packages are NOT installed in the web/Vercel build, so without
 * shims TypeScript fails the typecheck step.
 *
 * Typing them as `any` matches how native.ts already uses them (every call is
 * wrapped in try/catch with a web fallback) and keeps the web bundle slim.
 *
 * If proper types are wanted in the future, install the matching packages as
 * devDependencies and delete this file.
 */

declare module '@capacitor/haptics';
declare module '@capacitor/push-notifications';
declare module '@capacitor/geolocation';
declare module '@capacitor/camera';
declare module '@capacitor/share';
declare module '@capacitor/status-bar';
declare module '@capacitor/app';
declare module '@revenuecat/purchases-capacitor';

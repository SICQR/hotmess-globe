/**
 * native.ts — HOTMESS native capability bridge
 *
 * Wraps Capacitor plugin calls with graceful web fallbacks so components
 * can call native APIs without checking Capacitor.isNativePlatform() everywhere.
 *
 * Usage:
 *   import { haptic, requestPushPermission, takePicture, getLocation } from "@/lib/native";
 */

// Lazy-import Capacitor so the bundle does not break in non-Capacitor builds
const isNative = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Capacitor } = window as any;
    return Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
};

// ── Haptics ──────────────────────────────────────────────────────────────────

type HapticStyle = "light" | "medium" | "heavy" | "selection";

export async function haptic(style: HapticStyle = "medium"): Promise<void> {
  if (!isNative()) {
    // Web fallback: Vibration API
    if (navigator.vibrate) {
      const ms = style === "heavy" ? 40 : style === "medium" ? 20 : 10;
      navigator.vibrate(ms);
    }
    return;
  }
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (style === "selection") {
      await Haptics.selectionChanged();
    } else {
      const map: Record<string, typeof ImpactStyle[keyof typeof ImpactStyle]> = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: map[style] ?? ImpactStyle.Medium });
    }
  } catch {
    // silently degrade
  }
}

export async function hapticNotification(type: "success" | "warning" | "error" = "success"): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    await Haptics.notification({ type: map[type] });
  } catch {
    // silently degrade
  }
}

// ── Push Notifications ───────────────────────────────────────────────────────

export interface PushPermissionResult {
  granted: boolean;
  token?: string;
}

export async function requestPushPermission(): Promise<PushPermissionResult> {
  if (!isNative()) {
    // Web: use browser Push API
    try {
      const perm = await Notification.requestPermission();
      return { granted: perm === "granted" };
    } catch {
      return { granted: false };
    }
  }
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== "granted") return { granted: false };
    await PushNotifications.register();
    return new Promise((resolve) => {
      PushNotifications.addListener("registration", (token) => {
        resolve({ granted: true, token: token.value });
      });
      PushNotifications.addListener("registrationError", () => {
        resolve({ granted: false });
      });
    });
  } catch {
    return { granted: false };
  }
}

// ── Geolocation ──────────────────────────────────────────────────────────────

export interface NativePosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export async function getLocation(): Promise<NativePosition | null> {
  if (!isNative()) {
    // Web fallback
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch {
    return null;
  }
}

// ── Camera ───────────────────────────────────────────────────────────────────

export interface CameraResult {
  dataUrl: string; // base64 data URL
  format: string;
}

export async function takePicture(): Promise<CameraResult | null> {
  if (!isNative()) {
    // Web fallback: open file picker
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "user";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result as string, format: "jpeg" });
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 85,
      allowEditing: false,
      width: 1080,
    });
    return { dataUrl: photo.dataUrl!, format: photo.format };
  } catch {
    return null; // user cancelled or permission denied
  }
}

export async function pickFromGallery(): Promise<CameraResult | null> {
  if (!isNative()) {
    return takePicture(); // falls back to file picker
  }
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      quality: 85,
      allowEditing: false,
      width: 1080,
    });
    return { dataUrl: photo.dataUrl!, format: photo.format };
  } catch {
    return null;
  }
}

// ── Share ────────────────────────────────────────────────────────────────────

export async function nativeShare(opts: { title: string; text?: string; url?: string }): Promise<void> {
  if (!isNative() && navigator.share) {
    await navigator.share(opts);
    return;
  }
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share(opts);
    } catch {
      // silently degrade
    }
  }
}

// ── Status Bar ───────────────────────────────────────────────────────────────

export async function setStatusBarDark(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#050507" });
  } catch {
    // silently degrade
  }
}

// ── App state ────────────────────────────────────────────────────────────────

export function onAppResume(callback: () => void): () => void {
  if (!isNative()) {
    const handleVisibility = () => { if (document.visibilityState === "visible") callback(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }
  let cleanup = () => {};
  import("@capacitor/app").then(({ App }) => {
    App.addListener("resume", callback).then((handle) => {
      cleanup = () => handle.remove();
    });
  });
  return () => cleanup();
}

// ── Platform detection ───────────────────────────────────────────────────────

export function getPlatform(): "ios" | "android" | "web" {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Capacitor } = window as any;
    const platform = Capacitor?.getPlatform?.();
    if (platform === "ios") return "ios";
    if (platform === "android") return "android";
  } catch {
    // fall through
  }
  return "web";
}


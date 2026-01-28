import * as React from "react";

type ButtonVariant =
  | "default"
  | "hot"
  | "cyan"
  | "glass"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  // Gradient variants
  | "hotGradient"
  | "cyanGradient"
  | "premium"
  | "purpleGradient"
  | "greenGradient"
  // Glow variants
  | "hotGlow"
  | "cyanGlow"
  | "goldGlow"
  | "greenGlow"
  // Ghost gradient
  | "ghostGradient"
  // Outline variants with color
  | "outlineHot"
  | "outlineCyan"
  | "outlineGold"
  | "outlineWhite";

type ButtonSize = "default" | "sm" | "lg" | "xl" | "2xl" | "icon" | "icon-sm" | "icon-lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

export const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;

export const buttonVariants: (...args: any[]) => string;

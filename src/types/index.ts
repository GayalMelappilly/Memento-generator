export type ShapeType = "rectangle" | "circle";
export type ObjectFit = "cover" | "contain";
export type TextAlign = "left" | "center" | "right";

export interface PhotoBoxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: ShapeType;
  objectFit: ObjectFit;
  cornerRadius: number; // for rounded rectangles
}

export interface NameBoxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: TextAlign;
  autoShrink: boolean;
}

export interface LayoutConfig {
  photoBox: PhotoBoxConfig;
  nameBox: NameBoxConfig;
}

export interface Student {
  name: string;
  photo: string;
}

export interface TemplateData {
  file: File;
  image: HTMLImageElement;
  width: number;
  height: number;
}

declare module 'exifr' {
  export interface ExifrOptions {
    tiff?: boolean;
    xmp?: boolean;
    icc?: boolean;
    iptc?: boolean;
    jfif?: boolean;
    ihdr?: boolean;
    gps?: boolean;
    translateKeys?: boolean;
    translateValues?: boolean;
    reviveValues?: boolean;
    sanitize?: boolean;
    mergeOutput?: boolean;
    silentErrors?: boolean;
    pick?: string[];
    skip?: string[];
    [key: string]: unknown;
  }

  export function parse(
    input: File | Blob | ArrayBuffer | Uint8Array | string,
    options?: ExifrOptions | boolean | string[]
  ): Promise<Record<string, any> | undefined>;

  export function gps(
    input: File | Blob | ArrayBuffer | Uint8Array | string
  ): Promise<{ latitude: number; longitude: number } | undefined>;

  export function orientation(
    input: File | Blob | ArrayBuffer | Uint8Array | string
  ): Promise<number | undefined>;

  const exifr: {
    parse: typeof parse;
    gps: typeof gps;
    orientation: typeof orientation;
    [key: string]: any;
  };

  export default exifr;
}

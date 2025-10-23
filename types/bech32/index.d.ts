// types/bech32/index.d.ts
declare module 'bech32' {
  type Words = number[];
  export interface Bech32 {
    decode(addr: string, limit?: number): { prefix: string; words: Words };
    encode(prefix: string, words: Words, limit?: number): string;
    toWords(bytes: Uint8Array | number[]): Words;
    fromWords(words: Words): Uint8Array;
  }
  export const bech32: Bech32;
  export const bech32m: Bech32;
}

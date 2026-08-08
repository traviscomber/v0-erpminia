// Keep browser TextEncoder compatible with Web Crypto's ArrayBuffer input under Node 24 typings.
interface TextEncoder {
  encode(input?: string): Uint8Array<ArrayBuffer>;
}

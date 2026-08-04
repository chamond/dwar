declare module 'virtual:minigame-references' {
  const references: readonly {
    name: string;
    fragments: ReadonlyArray<Uint8Array>;
  }[];

  export default references;
}

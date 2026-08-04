declare module 'virtual:minigame-references' {
  const references: readonly {
    name: string;
    fragments: readonly (readonly number[])[];
  }[];

  export default references;
}

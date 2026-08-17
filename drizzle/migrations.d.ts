/**
 * Type declaration for the drizzle-kit-generated bundle (migrations.js).
 * The .sql imports inside it are inlined at bundle time by the
 * babel-plugin-inline-import configured in babel.config.js.
 */
declare const migrations: {
  journal: {
    entries: {
      idx: number;
      when: number;
      tag: string;
      breakpoints: boolean;
    }[];
  };
  migrations: Record<string, string>;
};

export default migrations;

import { Command, Option, Argument } from "commander";
import * as fs from "fs";
import { promisify } from "util";
import { myParseInt } from "../util";
import { SSS, Share } from "sharez";
import { stringify } from "querystring";

async function loadShares(text: string): Promise<{
  shares: Share[];
  errors: { original: string; error: string }[];
}> {
  const lines = text
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const sharesPromise = lines.map((line) =>
    Share.fromString(line).catch((error: any) => ({
      original: line,
      error: JSON.stringify(error),
    }))
  );
  const lineResults = await Promise.all(sharesPromise);
  const shares = lineResults.filter((v): v is Share => v instanceof Share);
  const errors = lineResults.filter(
    (v): v is Exclude<typeof v, Share> => !(v instanceof Share)
  );
  return { shares, errors };
}

export const merge = new Command();
merge
  .name("merge")
  .description("Merge shares back into a secret")
  .addOption(
    new Option(
      "-r,--required <shareCount>",
      "Number of required shares to construct secret"
    )
      .argParser(myParseInt)
      .default(undefined)
  )
  .addArgument(
    new Argument("file...", "File containing shares, seperated by newlines")
      .argOptional()
      .default(["-"], "Read from stdin")
  )
  .action(async function (this: Command, file: string[]) {
    // Have to do it this way, `readFileSync` opens stdin as non-blocking,
    // this leads to it throwing an exception because it is waiting for input
    // to the pipe
    const readPromise = promisify(fs.readFile);
    const sharePromise = file
      .map((v) => (v === "-" ? process.stdin.fd : v))
      .map(async (f) => {
        const input_data = await readPromise(f, { encoding: "ascii" });
        const { shares, errors } = await loadShares(input_data);
        errors.forEach(({ original, error }) => {
          process.stderr.write(`Error parsing "${original}": ${error}`);
        });
        return shares;
      });

    const shares = (await Promise.all(sharePromise))
      .reduce((p, c) => [...p, ...c])
      .sort((a, b) => (a.xValue as number) - (b.xValue as number));

    const requiredCount = checkRequiredCounts(shares, this.opts()["required"]);
    if (requiredCount === false) {
      return;
    }

    if (requiredCount !== shares.length) {
      process.stderr.write(
        `Provided more shares than required. Using first ${requiredCount}\n`
      );
    }
    const secret = SSS.from_shares(shares.slice(0, requiredCount));
    process.stdout.write(secret.secret);
  });
function checkRequiredCounts(
  shares: Share[],
  required: number | undefined
): false | number {
  const required_input = shares.reduce((acc, v) => {
    if (v.requirement === undefined) return acc;
    if (acc.find((x) => x === v.requirement) === undefined) {
      acc.push(v.requirement);
    }
    return acc;
  }, [] as number[]);
  if (
    required_input.length > 1 ||
    (required_input.length === 1 &&
      required !== undefined &&
      required_input[0] != required)
  ) {
    process.stderr.write("Input shares have different amount requirements");
    return false;
  }
  const input_required = required_input[0];
  if (input_required === undefined) {
    if (required === undefined) {
      process.stderr.write("Unknown required share amount");
      return false;
    } else {
      return required;
    }
  } else {
    return input_required;
  }
}

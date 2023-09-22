import { Command, Option, Argument } from "commander";
import * as fs from "fs";
import { promisify } from "util";
import { myParseInt, partition } from "../util";
import { SSS, type Share, ShareDecoder, type DecodedShare } from "sharez";

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

type DecodeError = { original: string; error: string };

async function partitionLines(
  linePromise: Promise<(DecodedShare | DecodeError)[]>[]
): Promise<{
  shares: Share[];
  errors: DecodeError[];
}> {
  return (await Promise.all(linePromise)).reduce(
    (acc, v) => {
      const { trueElements: shares, falseElements: errors } = partition(
        v,
        (e): e is { share: Share } => "share" in e
      );
      acc.shares = [...acc.shares, ...shares.map((v) => v.share)];
      acc.errors = [...acc.errors, ...errors];
      return acc;
    },
    {
      shares: [] as Share[],
      errors: [] as DecodeError[],
    }
  );
}
const readPromise = promisify(fs.readFile);

function parseShareLines(
  filepaths: string[]
): Promise<(DecodedShare | DecodeError)[]>[] {
  return filepaths
    .map((v) => (v === "-" ? process.stdin.fd : v))
    .map(async (f) => {
      // Have to do it this way, `readFileSync` opens stdin as non-blocking,
      // this leads to it throwing an exception because it is waiting for input
      // to the pipe
      let text = await readPromise(f, { encoding: "ascii" });
      let lines = text
        .split("\n")
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map((v) =>
          new ShareDecoder().decode(v).catch(
            (e) =>
              ({
                original: v,
                error: JSON.stringify(e),
              } as DecodeError)
          )
        );
      return Promise.all(lines);
    });
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
    const linePromise = parseShareLines(file);

    const { shares, errors } = await partitionLines(linePromise);

    errors.forEach(({ original, error }) => {
      process.stderr.write(`Error parsing "${original}": ${error}`);
    });

    shares.sort((a, b) => (a.xValue as number) - (b.xValue as number));

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

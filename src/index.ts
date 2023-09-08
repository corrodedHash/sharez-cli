import { SSS, ShareFormatter } from "sharez";
import * as commander from "commander";
import { Command, Option } from "commander";
import "process";
import * as fs from "fs";
import { promisify } from "util";

function myParseInt(value: string, dummyPrevious: any) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new commander.InvalidArgumentError("Not a number.");
  }
  return parsedValue;
}

const split = new Command();
split
  .name("split")
  .description("Split a secret into shares")
  .addOption(
    new Option(
      "-r,--required <shareCount>",
      "Number of required shares to construct secret"
    )
      .argParser(myParseInt)
      .makeOptionMandatory()
  )
  .addOption(
    new Option(
      "-e,--extra <extraCount>",
      "Number of extra shares to construct secret"
    )
      .argParser(myParseInt)
      .default(0)
  )
  .addArgument(
    new commander.Argument("file", "File containing secret")
      .argOptional()
      .default("-", "Read from stdin")
  )
  .action(async function (this: Command, file: string) {
    let input_data;
    const readPromise = promisify(fs.readFile);
    if (file === "-") {
      // Have to do it this way, `readFileSync` opens stdin as non-blocking,
      // this leads to it throwing an exception because it is waiting for input
      // to the pipe
      input_data = await readPromise(process.stdin.fd);
    } else {
      input_data = await readPromise(file);
    }
    const shareGen = SSS.from_secret(input_data, this.opts()["required"]);
    const shareCount = this.opts()["required"] + this.opts()["extra"];
    const shares = [...new Array(shareCount)].map(
      (_, index) =>
        new ShareFormatter(shareGen.get_share(index + 1), {
          share_id: index + 1,
          share_requirement: this.opts()["required"],
        })
    );
    const shareStringsPromises = shares.map((v) => v.toString());
    const shareStrings = await Promise.all(shareStringsPromises);
    console.log(shareStrings);
  });

const program = new Command();
program.addCommand(split, { isDefault: true });
program.parse();

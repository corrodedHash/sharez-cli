import { SSS } from "sharez";
import * as commander from "commander";
import { Command, Option } from "commander";
import "process";

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
    new Option("-e,--extra", "Number of extra shares to construct secret")
      .argParser(myParseInt)
      .default(0)
  )
  .addOption(new Option("-i, --infile", "File containing secret").default("-"))
  .action(function (this: Command) {
    console.log(this.opts());
  });

const program = new Command();
program.option("--bla");
program.addCommand(split, { isDefault: true });
program.parse();

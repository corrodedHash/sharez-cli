import { Command, Option } from "commander";
import "process";
import { split } from "./commands/split";
import { merge } from "./commands/merge";

const program = new Command();
program.addCommand(split, { isDefault: true });
program.addCommand(merge);
program.parse();

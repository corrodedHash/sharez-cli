import { describe, it } from "mocha";
import { exec } from "child_process";
import { promisify } from "util";
import { assert } from "chai";
const execPromise = promisify(exec);

const CLI_FILE = "dist/index.mjs";

describe("Integration", () => {
  it("Serializes", async () => {
    const input = "hey";
    const requiredCount = 5;
    const extraCount = 5;
    const splitResult = execPromise(
      `node ${CLI_FILE} -r ${requiredCount} -e ${extraCount}`
    );
    splitResult.child.stdin?.write(input);
    splitResult.child.stdin?.end();
    const { stdout, stderr } = await splitResult;
    assert.equal(stdout.trim().split("\n").length, requiredCount + extraCount);

    const mergeResult = execPromise(`node ${CLI_FILE} merge`);
    mergeResult.child.stdin?.write(stdout);
    mergeResult.child.stdin?.end();
    const { stdout: mergeStdout, stderr: mergeStderr } = await mergeResult;
    assert.equal(mergeStdout, input);
  });
});

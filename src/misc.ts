import * as child_process from "child_process"

export function exec(cmd: string): Promise<string> {
  return new Promise((resolve, reject) =>
    child_process.exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        if (stderr.trim().length > 0) {
          console.error(stderr.trim());
        }
        resolve(stdout);
      }
    })
  );
}
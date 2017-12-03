import { IOptions } from "glob"
import * as globby from "globby"
import * as fs from "fs"
import { resolve, normalize, relative, basename } from "path"

class File {

  readonly cwd: string;
  readonly path: string;
  readonly name: string;

  constructor(cwd: string, path: string, readonly buffer: Buffer) {
    this.cwd = normalize(cwd);
    this.path = normalize(path);
    this.name = basename(this.path);
  }

  /* rename(name: string) {
    this.name = name;
    return this;
  } */

}

export async function src(cwd: string, patterns: string | string[], opts: IOptions = {}): Promise<File[]> {
  const paths = await globby(patterns, { ...opts, cwd });
  return Promise.all(
    paths.map(path =>
      readFile(resolve(cwd, path)).then(buffer => new File(cwd, path, buffer))
    )
  );
}

export function dest(path: string): (files: File[]) => Promise<any> {
  return async (files) => Promise.all(files.map(
    file => writeFile(resolve(path, file.path), file.buffer)
  ));
}

/**
 * Promisified version of fs.readFile
 */
function readFile(path: string): Promise<Buffer> {
  return new Promise<Buffer>(
    (resolve, reject) => fs.readFile(path, (err, data) => (err) ? reject(err) : resolve(data))
  );
}

/**
 * Promisified version of fs.writeFile
 */
function writeFile(path: string, data: Buffer): Promise<void> {
  return new Promise(
    (resolve, reject) => fs.writeFile(path, data, (err) => (err) ? reject(err) : resolve())
  );
}
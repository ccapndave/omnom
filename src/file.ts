import { IOptions } from "glob"
import * as globby from "globby"
import * as fs from "fs"
import { resolve, normalize, relative, dirname, basename } from "path"

interface File {
  readonly path: string;
  readonly buffer: Buffer;
}

function mkFile(path: string, buffer: Buffer): File {
  return { path: normalize(path), buffer };
}

export function rename(path: string): (file: File) => File {
  return file => ({ ...file, path });
}

export function mapJson(transform: (json: any) => any): (file: File) => File {
  return file => {
    const json = JSON.parse(file.buffer.toString());
    const transformedJson = transform(json);
    const buffer = Buffer.from(JSON.stringify(transformedJson), "utf8");

    return ({ ...file, buffer });
  }
}

export async function src(cwd: string, patterns: string | string[], opts: IOptions = {}): Promise<File[]> {
  const paths = await globby(patterns, { ...opts, cwd });
  return Promise.all(
    paths.map(path =>
      readFile(resolve(cwd, path)).then(buffer => mkFile(path, buffer))
    )
  );
}

export function dest(path: string): (files: File[]) => Promise<void> {
  return async (files) => {
    await Promise.all(files.map(
      file => writeFile(resolve(path, file.path), file.buffer)
    ));
  };
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
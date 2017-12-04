import { IOptions } from "glob"
import * as globby from "globby"
import * as fs from "fs"
import { resolve, normalize, relative, dirname, basename } from "path"

interface State {
  cwd: string;
  files: File[];
}

interface File {
  readonly path: string;
  readonly buffer: Buffer;
}

function mkState(cwd: string, files: File[]): State {
  return { cwd, files };
}

function mkFile(path: string, buffer: Buffer): File {
  return { path: normalize(path), buffer };
}

type StateTransfomer = (files: State) => Promise<State>;

export async function startIn(cwd: string): Promise<State> {
  return mkState(cwd, []);
}

export function globFiles(patterns: string | string[], opts: IOptions = {}): StateTransfomer {
  return async state => {
    const paths = await globby(patterns, { ...opts });
    const files = await Promise.all(
      paths.map(path =>
        readFile(resolve(state.cwd, path)).then(buffer => mkFile(path, buffer))
      )
    );

    return { ...state, files };
  }
}

export function writeTo(path: string): StateTransfomer {
  return async state => {
    await Promise.all(state.files.map(
      file => writeFile(resolve(path, file.path), file.buffer)
    ));

    return state;
  };
}

export function update(...stateTransformers: StateTransfomer[]): StateTransfomer {
  return async state => {
    // Apply the transformers to the state
    let stateToMerge = state;
    for (let stateTransfomer of stateTransformers) {
      stateToMerge = await stateTransfomer(stateToMerge);
    }

    // Merge the stateToMerge into the original state
    

    return state;
  } 
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

/**

/* interface File {}

type FileTransfomer = (files: File[]) => Promise<File[]>;

const fromDir = (dir: string): Promise<File[]> => Promise.resolve([]);

function globFiles(pattern: string): FileTransfomer {
  return files => Promise.resolve(files);
}

function writeTo(path: string): FileTransfomer {
  return files => Promise.resolve(files);

function mapJson(transformer: (json: any) => any): FileTransfomer {
  return files => Promise.resolve(files);
}

const update = (...steps: FileTransfomer[]) => (files: File[]) => Promise.resolve(files);

const a =
  startIn("test/assets")
    .then(globFiles("*"))
    .then(update(
      globFiles("*.json"),
      mapJson(json => json.version++)
    ))
    .then(writeTo("out"));

const a =
  startIn("test/assets")
    .globFiles("*")
    .update(
      globFiles("*.json"),
      mapJson(json => json.version++)
    )
    .writeTo("out");
 */
 
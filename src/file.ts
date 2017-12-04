import { IOptions } from "glob"
import * as globby from "globby"
import * as minimatch from "minimatch"
import * as fs from "fs"
import { resolve, normalize, relative, dirname, basename } from "path"
import * as I from "immutable"

class State {

  constructor(
    readonly cwd: string,
    readonly files: I.Map<string, File> = I.Map()
  ) {}

  addFiles(files: File[]): State {
    const updatedFiles = files.reduce((map, file) => map.set(file.path, file), this.files);
    return new State(this.cwd, updatedFiles);
  }
  
  setFiles(files: File[]): State {
    const updatedFiles = files.reduce((map, file) => map.set(file.path, file), I.Map<string, File>());
    return new State(this.cwd, updatedFiles);
  }

  filterFiles(predicate: (file: File) => boolean): State {
    const updatedFiles = this.files.filter(predicate);
    return new State(this.cwd, updatedFiles);
  }
  
}

class File {
  constructor(
    readonly path: string,
    readonly buffer: Buffer
  ) {}
}

type StateTransfomer = (files: State) => Promise<State>;

export async function startIn(cwd: string): Promise<State> {
  return new State(cwd);
}

export function addFiles(pattern: string | string[], opts: IOptions = {}): StateTransfomer {
  return async state => {
    const paths = await globby(pattern, { ...opts, cwd: state.cwd });
    const files = await Promise.all(
      paths.map(path =>
        readFile(resolve(state.cwd, path)).then(buffer => new File(path, buffer))
      )
    );

    return state.addFiles(files);
  }
}

export function filterFiles(pattern: string | string[], opts: IOptions = {}): StateTransfomer {
  return async state => {
    const patterns = (typeof pattern === "string") ? [ pattern ] : pattern;
    const predicate = (file: File) => patterns.reduce((acc, pattern) => minimatch(file.path, pattern, opts) || acc, false);

    return state.filterFiles(predicate);
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

// I'm not 100% sure about this function.
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
      readFile(resolve(cwd, path)).then(buffer => new File(path, buffer))
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
    .addFiles("*")
    .update(
      filterFiles("*.json"),
      mapJson(json => json.version++)
    )
    .writeTo("out");
 */

 /*
const a =
  startIn("test/assets")
  .then(addFiles("*"))
  .then(merge(
    filterFiles("1.svg"),
    rename(originalName => "renamed.svg")
  )) // here you would have both, but that's ok... not really
  .then(writeTo("out");
*/

// Giving files some kind of comparable hash would be pretty awesome.  What would it be based on?  It can't be the content or the name since both can change.
// However, if the content or name has changed are they a different file?  No, not really.  I can assign them a uuid when they are added, and then track that in
// a merge.  That doesn't help if we try and add the same file twice.  However, in this case we can overwrite ones with the same name, and if they have been renamed
// then they shouldn't be overwritten anyway.  So why don't I just use the name?  Might as well, so long
// as its absolute.

// So, files would become a map of cuid to file instead of just a list
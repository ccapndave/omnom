import { IOptions } from "glob"
import * as globby from "globby"
import * as minimatch from "minimatch"
import * as fs from "fs-extra"
import { resolve, normalize, relative, dirname, basename } from "path"
import * as I from "immutable"
import * as R from "ramda"
import { file } from "tmp";
import { File, FileTransformer } from "./file"

export class State {
  constructor(
    readonly cwd: string,
    private files: I.Map<string, File> = I.Map()
  ) {}

  add(files: File[]): State {
    const updatedFiles = files.reduce((map, file) => map.set(file.path, file), this.files);
    return new State(this.cwd, updatedFiles);
  }
  
  set(files: File[]): State {
    const updatedFiles = files.reduce((map, file) => map.set(file.path, file), I.Map<string, File>());
    return new State(this.cwd, updatedFiles);
  }

  filter(predicate: (file: File) => boolean): State {
    const updatedFiles = this.files.filter(predicate);
    return new State(this.cwd, updatedFiles);
  }

  map(f: (file: File) => File): State {
    const updatedFiles = this.files.map(f);
    return new State(this.cwd, updatedFiles);
  }

  async asyncMap(f: (file: File) => Promise<File>): Promise<State> {
    // Turn the map of files into a list of promises of key/values
    const promisedMap: Promise<{ key: string, value: File }>[] = this.files.reduce((acc, file, path) => {
      return R.append(f(file).then(newFile => ({ key: newFile.path, value: newFile })), acc);
    }, []);
    
    // Resolve all the promises
    const awaitedKV = await Promise.all(promisedMap);

    // Turn the key/value objects into a real object and use it to construct a new map
    const newFilesObject: { [key: string]: File } = awaitedKV.reduce((acc, kv) => ({ ...acc, [kv.key]: kv.value }), {});

    // Turn the promises back into a map and return the new state
    const newFiles = I.Map(newFilesObject);

    // Return the new state
    return new State(this.cwd, newFiles);
  }

  values(): File[] {
    return this.files.valueSeq().toArray();
  }
}

export type StateTransfomer = (state: State) => Promise<State>;

export async function startIn(cwd: string): Promise<State> {
  return new State(cwd);
}

export function addFiles(pattern: string | string[], opts: IOptions = {}): StateTransfomer {
  return async state => {
    const paths = await globby(pattern, { ...opts, cwd: state.cwd });
    const files = await Promise.all(
      paths.map(path =>
        fs.readFile(resolve(state.cwd, path)).then(buffer => new File(path, buffer))
      )
    );

    return state.add(files);
  }
}

export function filterFiles(pattern: string | string[], opts: IOptions = {}): StateTransfomer {
  return async state => {
    const patterns = (typeof pattern === "string") ? [ pattern ] : pattern;
    const predicate = (file: File) => patterns.reduce((acc, pattern) => minimatch(file.path, pattern, opts) || acc, false);

    return state.filter(predicate);
  }
}

export function writeTo(path: string): StateTransfomer {
  return async state => {
    // Copy all files, making sure that their paths exist
    await state.asyncMap(async file => {
      const fullPath = resolve(path, file.path);

      await fs.ensureDir(dirname(fullPath));
      await fs.writeFile(fullPath, file.buffer);

      return file;
    });

    return state;
  }
}

export function forEachFile(fileTransformer: FileTransformer): StateTransfomer {
  return async state => {
    return state.asyncMap(fileTransformer);
  }
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

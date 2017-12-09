export class File {
  constructor(
    readonly path: string,
    readonly buffer: Buffer
  ) {}
}

export type FileTransformer = (file: File) => Promise<File>;

export function rename(filenameTransformer: (originalFilename: string) => string): FileTransformer {
  return async file => {
    return ({ ...file, path: filenameTransformer(file.path) });
  }
}

export function mapJson(transform: (json: any) => any): FileTransformer {
  return async file => {
    const json = JSON.parse(file.buffer.toString());
    const transformedJson = transform(json);
    const buffer = Buffer.from(JSON.stringify(transformedJson), "utf8");

    return ({ ...file, buffer });
  }
}

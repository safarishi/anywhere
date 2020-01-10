import fs from 'fs'
import path from 'path'
import { readFileInfo, getFileInfo } from '../helpers'
import { promisify } from 'util'
import { FileType } from '../consts'

let readdir = promisify(fs.readdir)

type FileInfo = {
  name: string,
  isFile: boolean,
  isDirectory: boolean,
}

export interface Reader {
  read: (pathname: string, options: { rootPath: string }) => Promise<{ type: string, data: { filename: string, content?: string, files?: FileInfo[] } }>

  readDirectory: (filename: string) => Promise<FileInfo[]>
}

let reader: Reader = {
  /**
   * @return {object}
   * { type: '404|file|directory|error', data: { filename, content, files } }
   */
  read: async (pathname, { rootPath }) => {
    let filename = path.join(rootPath, pathname)

    let { isFile, isDirectory } = await readFileInfo(filename)

    let type = isFile
      ? FileType.FILE
      : isDirectory
      ? FileType.DIRECTORY
      : FileType.NOT_FOUND

    let data: { filename: string, files?: FileInfo[] } = { filename }

    try {
      if (isDirectory) {
        data.files = await reader.readDirectory(filename)
      }

      return {
        type,
        data,
      }
    } catch (error) {
      return {
        type: FileType.ERROR,
        data: {
          ...data,
          content: error.message,
        },
      }
    }
  },

  readDirectory: async (filename) => {
    let files = await readdir(filename)

    let fileListInfo = await Promise.all(
      files.map(async (file) => {
        let { isFile, isDirectory } = await getFileInfo(
          path.join(filename, file),
        )

        return {
          name: file,
          isFile,
          isDirectory,
        }
      }),
    )

    return fileListInfo
  },
}

export default reader

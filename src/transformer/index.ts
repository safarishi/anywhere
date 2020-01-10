import { prepareDirectoryData } from "../helpers"
import { FileType } from "../consts"
import { Reader } from '../reader'

type GetPromiseWrapperType<T> = T extends PromiseLike<infer U> ? U : never

type Result = GetPromiseWrapperType<ReturnType<Reader['read']>>

interface Transformer {
  transform: (
    result: Result,
    options: {
      pathname: string,
      isVdActived: boolean,
      rootPath: string,
      vd?: string,
    }
  ) => any

  transformDirectory: (options: any) => any
}

let transformer: Transformer = {
  transform: (result, { pathname, isVdActived, vd, rootPath }) => {
    let { type, data } = result

    if (type === FileType.NOT_FOUND) {
      return { type }
    }

    if (type === FileType.DIRECTORY) {
      return transformer.transformDirectory({
        files: data.files || [],
        vd,
        isVdActived,
        pathname,
        type,
        rootPath,
      })
    }

    if (type === FileType.FILE) {
      return {
        type,
        filename: data.filename,
      }
    } else {
      // type === FileType.ERROR

      return {
        type,
        content: data.content,
      }
    }
  },

  transformDirectory: ({
    files,
    vd,
    isVdActived,
    type,
    pathname,
    rootPath,
  }) => {
    let { fileMapList, pathList } = prepareDirectoryData(files, {
      pathname,
      isVdActived,
      vd,
      rootPath,
    })

    return {
      type,
      pathList,
      fileMapList,
    }
  },
}

export default transformer

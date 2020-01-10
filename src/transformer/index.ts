import { prepareDirectoryData } from "../helpers"
import { FileType } from "../consts"

interface Transformer {
  transform: (
    result: any,
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
    let { type, data = {} } = result

    if (type === FileType.NOT_FOUND) {
      return { type }
    }

    if (type === FileType.DIRECTORY) {
      return transformer.transformDirectory({
        files: data.files,
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
        content: data.content,
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

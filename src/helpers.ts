import fs from 'fs'
import os from 'os'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

let lstat = promisify(fs.lstat)
let exists = promisify(fs.exists)
let realpath = promisify(fs.realpath)

/**
 * 打开默认浏览器
 */
export function openBrowser(href: string) {
  let command

  let osType = os.type()

  if (osType === 'Linux') {
    command = 'x-www-browser'
  } else if (osType === 'Windows_NT') {
    command = 'start'
  } else if (osType === 'Darwin') {
    // Mac OS
    command = 'open'
  }

  if (command) {
    exec(`${command} ${href}`)
  }
}

type Args = Record<string, string>

export function getCommandArgs(argvList: any[]) {
  let args1 = argvList.reduce((acc, cur, idx, src) => {
    if (cur.startsWith('-')) {
      acc[cur] = src[idx + 1]
    }

    return acc
  }, {} as Args)

  let args2 = argvList.filter((_) => _.startsWith('--'))
    .reduce((acc, cur) => {
      let [key, value] = cur.split('=')

      acc[key] = value

      return acc
    }, {} as Args)

  return { ...args1, ...args2 }
}

export function mapValue(value: any, index: number, array: any[]) {
  let href = value

  for (let i = index - 1; i >= 0; i--) {
    href = array[i] + href
  }

  return { href, name: value.slice(1) }
}

export function createPathList(
  pathname: string,
  { isVdActived, vd }: { isVdActived: boolean, vd: string },
) {
  let pathList = pathname
    .split('/')
    .filter(Boolean)
    .map((_) => '/' + _)
    // { name, href }
    .map(mapValue)
    .map((item) => {
      let { href } = item

      let relativePath = href

      let nextHref = isVdActived ? path.join(vd, href) : relativePath

      if (!isVdActived && relativePath.startsWith(vd)) {
        nextHref += '?disable_vd=1'
      }

      return {
        ...item,
        relativePath,
        href: nextHref,
      }
    })

  // 去首页path链接对象
  pathList.unshift({
    name: '~',
    relativePath: '/',
    href: isVdActived ? path.join(vd, '/') : '/',
  })

  pathList = pathList.map((item, index, array) => {
    if (index === array.length - 1) {
      return {
        ...item,
      }
    }

    return item
  })

  return pathList
}

export function addClassNameProp(obj: any) {
  let clzName = 'icon'

  let { isFile, isDirectory } = obj

  if (isDirectory) {
    clzName += ' icon-directory'
  } else if (isFile) {
    clzName += ' icon-file'
  }

  return {
    ...obj,
    clzName,
  }
}

export function prepareDirectoryData(
  files: any[],
  {
    pathname,
    vd,
    isVdActived,
    rootPath,
  }: { pathname: string, vd: string, isVdActived: boolean, rootPath: string },
) {
  if (pathname !== '/' && pathname !== '') {
    files = [{ name: '..', isDirectory: true, isFile: false }, ...files]
  }

  let fileMapList = files
    .map((item) => {
      let { name } = item

      let relativePath = path.join(pathname, name)

      let href = isVdActived ? path.join(vd, relativePath) : relativePath

      if (!isVdActived && relativePath.startsWith(vd)) {
        href += '?disable_vd=1'
      }

      let filename = path.join(rootPath, relativePath)

      return {
        ...item,
        relativePath,
        href,
        filename,
      }
    })
    .map(addClassNameProp)

  let pathList = createPathList(pathname, { vd, isVdActived })

  return {
    fileMapList,
    pathList,
  }
}

export async function readFileInfo(filename: string) {
  let isExist = await exists(filename)

  if (!isExist) return { isExist }

  let { isFile, isDirectory } = await getFileInfo(filename)

  return { isFile, isDirectory }
}

export async function getFileInfo(filename: string): Promise<{ isFile: boolean, isDirectory: boolean }> {
  let stat = await lstat(filename)

  let isFile = stat.isFile()
  let isDirectory = stat.isDirectory()
  let isSymbolicLink = stat.isSymbolicLink()

  if (isSymbolicLink) {
    let realFilename = await realpath(filename)

    return getFileInfo(realFilename)
  }

  return {
    isFile,
    isDirectory,
  }
}

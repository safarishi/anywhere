#!/usr/bin/env node

let fs = require('fs')
let os = require('os')
let url = require('url')
let http = require('http')
let path = require('path')
let querystring = require('querystring')
let promisify = require('util').promisify
let mime = require('mime-types')

let args = getCommandArguments()

function getCommandArguments() {
  let args1 = process.argv.reduce((acc, cur, idx, src) => {
    if (cur.startsWith('-')) {
      acc[cur] = src[idx + 1]
    }
    return acc
  }, {})
  
  let args2 = process.argv
    .filter(_ => _.startsWith('--'))
    .reduce((acc, cur) => {
      let [key, value] = cur.split('=')
      acc[key] = value
      return acc
    }, {})
    
  let args = { ...args1, ...args2 }

  return args
}

// 读取 pathname 对应的文件类型
let FileType = {
  FILE: 'file',
  NOT_FOUND: '404',
  DIRECTORY: 'directory'
}

let cwd = process.cwd()

let exists = promisify(fs.exists)
let lstat = promisify(fs.lstat)
let readFile = promisify(fs.readFile)
let readdir = promisify(fs.readdir)
let realpath = promisify(fs.realpath)

let renderer = {
  render: ({ type, fileMapList, pathList }) => {
    if (type === FileType.DIRECTORY) {
      let html = renderer.renderDirectory({ fileMapList, pathList })

      return html
    } else if (type === FileType.NOT_FOUND) {
      return 'Page 404'
    }

    return data.content
  },

  renderDirectory: ({ pathList = [], fileMapList = [] }) => {
    if (!pathList.length && !fileMapList.length) {
      return renderer.renderToHtml()
    }

    let title = ''
    let nav = ''
    let content = ''

    if (pathList.length) {
      title = pathList[pathList.length - 1].relativePath

      nav = `
        <h1>
          ${pathList
            .map(({ name, href }) => {
              return ` <a href="${href}">${name}</a> /`
            })
            .join('')}
        </h1>
      `
    }

    if (fileMapList.length) {
      content = `
        <ul id="files">
          ${fileMapList
            .map(({ name, href, clzName }) => {
              return `
              <li>
                <a class="${clzName}" href="${href}">
                  <span class="name">${name}</span>
                </a>
              </li>
            `
            })
            .join('')}
        </ul>
      `
    }

    return renderer.renderToHtml({
      title,
      nav,
      content
    })
  },

  renderToHtml: ({ title = '', nav = '', content = '' } = {}) => {
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          />
          <title>directory ${title}</title>
          <link rel="stylesheet" href="/public/assets/style.css?disable_public_path=1" />
          <link rel="stylesheet" href="/public/assets/icon.css?disable_public_path=1" />
        </head>
        <body class="directory">
          ${nav}
          ${content}
        </body>
      </html>
    `
  }
}

main()

function main() {
  let port = args['--port'] || args['-p'] || 9900

  let options = {}

  let venderName = args['--vd'] || args['-vd']

  if (venderName) {
    options.vd = venderName
  }

  let publicPath = args['--public-path'] || args['-publicPath'] || args['-d']

  if (publicPath) {
    options.publicPath = publicPath
  }

  http.createServer(static(options)).listen({ port }, () => {
    console.log('Server is running at http://localhost:' + port)
  })
}

function static(options) {
  let { vd, publicPath = '/' } = options

  let finalRenderer = options.renderer || renderer
  
  return async (req, res) => {
    // 1 url-resolver req.url -> { pathname }
    let { pathname, isVdActived, disablePublicPath } = resolver.resolve(req.url, vd)
    
    var rootPath = path.join(cwd, publicPath)

    if (disablePublicPath) {
      rootPath = cwd
    }

    // 2 fs-reader pathname -> result
    let result = await reader.read(pathname, { rootPath })

    // 3 transformer result -> renderableData
    let data = transformer.transform(result, {
      pathname,
      isVdActived,
      vd,
      rootPath
    })

    // 4.1 send static file
    if (data.type === FileType.FILE) {
      res.setHeader(
        'Content-Type',
        mime.contentType(path.extname(data.filename))
      )
      res.end(data.content)
    }

    // 4.2 show directory or not-found
    if (data.type === FileType.DIRECTORY || data.type === FileType.NOT_FOUND) {
      let html = finalRenderer.render(data)

      res.setHeader('Content-Type', mime.contentType('.html'))
      res.end(html)
    }
  }
}

let resolver = {
  resolve: (requestUrl, vd) => {
    let { pathname, query } = url.parse(requestUrl)

    pathname = decodeURIComponent(pathname)
    
    let isVdActived = requestUrl.startsWith(vd)
    
    let { disable_vd: disableVd, disable_public_path: disablePublicPath } = querystring.parse(query)

    if (disableVd === '1') {
      isVdActived = false
    }

    if (isVdActived) {
      pathname = pathname.replace(vd, '')
    }

    disablePublicPath = disablePublicPath === '1'

    return { pathname, isVdActived, disablePublicPath }
  }
}

let reader = {
  /**
   * @return {object}
   * { type: '404|file|directory', data: { filename, content, files } }
   */
  read: async (pathname, { rootPath }) => {
    let filename = path.join(rootPath, pathname)

    let { isFile, isDirectory } = await readFileInfo(filename)

    let type = isFile
      ? FileType.FILE
      : isDirectory
      ? FileType.DIRECTORY
      : FileType.NOT_FOUND

    let data = { filename }

    if (isFile) {
      data.content = await readFile(filename)
    } else if (isDirectory) {
      data.files = await reader.readDirectory(filename)
    }

    return {
      type,
      data
    }
  },

  readDirectory: async (filename) => {
    let files = await readdir(filename)

    files = await Promise.all(
      files.map(async file => {
        let { isFile, isDirectory } = await getFileInfo(
          path.join(filename, file)
        )

        return {
          name: file,
          isFile,
          isDirectory
        }
      })
    )

    return files
  }
}

async function readFileInfo(filename) {
  let isExist = await exists(filename)

  if (!isExist) return { isExist }

  let { isFile, isDirectory } = await getFileInfo(filename)

  return { isFile, isDirectory }
}

async function getFileInfo(filename) {
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
    isDirectory
  }
}

let transformer = {
  transform: (result, { pathname, isVdActived, vd, rootPath }) => {
    let { type, data = {} } = result

    if (type === FileType.NOT_FOUND) {
      return { type }
    }

    if (type === FileType.DIRECTORY) {
      return transformer.transformDirectory({ files: data.files, vd, isVdActived, pathname, type, rootPath })
    }

    if (type === FileType.FILE) {
      return {
        type,
        filename: data.filename,
        content: data.content
      }
    }
  },

  transformDirectory: ({ files, vd, isVdActived, type, pathname, rootPath }) => {
    let { fileMapList, pathList } = prepareDirectoryData(files, {
      pathname,
      isVdActived,
      vd,
      rootPath
    })

    return {
      type,
      pathList,
      fileMapList
    }
  }
}

function prepareDirectoryData(files, { pathname, vd, isVdActived, rootPath }) {
  if (pathname !== '/' && pathname !== '') {
    files = [{ name: '..', isDirectory: true, isFile: false }, ...files]
  }

  let fileMapList = files
    .map(item => {
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
        filename
      }
    })
    .map(addClassNameProp)

  let pathList = createPathList(pathname, { vd, isVdActived })

  return {
    fileMapList,
    pathList
  }
}

function addClassNameProp(obj) {
  let clzName = 'icon'

  let { filename, isFile, isDirectory } = obj

  if (isDirectory) {
    clzName += ' icon-directory'
  } else if (isFile) {
    let contentType = mime.lookup(filename)

    if (contentType) {
      clzName += ' icon-' + contentType.replace(/[/|.]/g, '-')
    } else {
      clzName += ' icon-default'
    }
  }

  return {
    ...obj,
    clzName
  }
}

function createPathList(pathname, { isVdActived, vd }) {
  let pathList = pathname
    .split('/')
    .filter(Boolean)
    .map(_ => '/' + _)
    .map(mapValue)
    // { name, href }
    .map(item => {
      let { href } = item

      let relativePath = href

      let nextHref = isVdActived ? path.join(vd, href) : relativePath

      if (!isVdActived & relativePath.startsWith(vd)) {
        nextHref += '?disable_vd=1'
      }
      
      return {
        ...item,
        relativePath,
        href: nextHref
      }
    })

  // 去首页path链接对象
  pathList.unshift({
    name: '~',
    relativePath: '/',
    href: isVdActived ? path.join(vd, '/') : '/'
  })

  pathList = pathList.map((item, index, array) => {
    if (index === array.length - 1) {
      return {
        ...item,
        href: 'javascript:;'
      }
    }

    return item
  })

  return pathList
}

function mapValue(value, index, array) {
  let href = value
  for (let i = index - 1; i >= 0; i--) {
    href = array[i] + href
  }
  return { href, name: value.slice(1) }
}

/**
 * 打开默认浏览器
 */
function openBrowser(url) {
  let command = 'open'
  let osType = os.type()
  if (osType === 'Linux') {
    command = 'x-www-browser'
  } else if (osType === 'Windows_NT') {
    command = 'start'
  }
  exec(`${command} ${url}`)
}

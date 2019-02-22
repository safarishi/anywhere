let fs = require('fs')
let os = require('os')
let url = require('url')
let http = require('http')
let path = require('path')
let promisify = require('util').promisify
let mime = require('mime-types')

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
          <link rel="stylesheet" href="/public/assets/style.css" />
          <link rel="stylesheet" href="/public/assets/icon.css" />
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
  let port = 9900

  let options = {
    vd: '/static'
  }

  http.createServer(static(options)).listen({ port }, () => {
    console.log('Server is running at http://localhost:' + port)
  })
}

function static(options) {
  let { vd } = options

  let finalRenderer = options.renderer || renderer

  return async (req, res) => {
    // 1 url-resolver req.url -> { pathname }
    let { pathname, isVdActived } = resolver.resolve(req.url, vd)

    // 2 fs-reader pathname -> result
    let result = await reader.read(pathname)

    // 3 transformer result -> renderableData
    let data = transformer.transform(result, {
      pathname,
      isVdActived,
      vd
    })

    // 4.1 send static file
    if (data.type === FileType.FILE) {
      res.setHeader('Content-Type', mime.contentType(path.extname(data.filename)))
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
    let { pathname } = url.parse(requestUrl)

    pathname = decodeURIComponent(pathname)

    let isVdActived = requestUrl.startsWith(vd)

    if (isVdActived) {
      pathname = pathname.replace(vd, '')
    }

    return { pathname, isVdActived }
  }
}

let reader = {
  /**
   * @return {object}
   * { type: '404|file|directory', data: { filename, content, files } }
   */
  read: async pathname => {
    let filename = path.join(cwd, pathname)

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
      data.files = await readdir(filename)

      data.files = await Promise.all(data.files.map(async file => {
        let { isFile, isDirectory } = await getFileInfo(path.join(filename, file))

        return {
          name: file,
          isFile,
          isDirectory
        }
      }))
    }

    return {
      type,
      data
    }
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
  transform: (result, { pathname, isVdActived, vd }) => {
    let { type, data = {} } = result

    if (type === FileType.NOT_FOUND) {
      return { type }
    }

    if (type === FileType.DIRECTORY) {
      let { fileMapList, pathList } = prepareDirectoryData(data.files, {
        pathname,
        isVdActived,
        vd
      })

      return {
        type,
        pathList,
        fileMapList
      }
    }
    
    if (type === FileType.FILE) {
      return {
        type,
        filename: data.filename,
        content: data.content
      }
    }
  }
}

function prepareDirectoryData(files, { pathname, vd, isVdActived }) {
  if (pathname !== '/' && pathname !== '') {
    files = [{ name: '..', isDirectory: true, isFile: false }, ...files]
  }

  let fileMapList = files
    .map(item => {
      let { name } = item

      let relativePath = path.join(pathname, name)

      let href = isVdActived ? path.join(vd, relativePath) : relativePath

      let filename = path.join(cwd, relativePath)

      return {
        ...item,
        relativePath,
        href,
        filename
      }
    })
    .map(addClzNameProp)

  let pathList = createPathList(pathname, { vd, isVdActived })

  return {
    fileMapList,
    pathList
  }
}

function addClzNameProp(obj) {
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
      return {
        ...item,
        relativePath: href,
        href: isVdActived ? path.join(vd, href) : href
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

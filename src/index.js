let fs = require('fs')
let os = require('os')
let url = require('url')
let http = require('http')
let path = require('path')
let promisify = require('util').promisify
let mime = require('mime-types')

let defaults = {
  mime: {
    html: 'text/html; charset=utf-8'
  },
  // 读取 pathname 对应的文件类型
  type: {
    FILE: 'file',
    NOT_FOUND: '404',
    DIRECTORY: 'directory'
  }
}

let { mime: defaultMimeMap, type: defaultTypeMap } = defaults

let cwd = process.cwd()

let exists = promisify(fs.exists)
let lstat = promisify(fs.lstat)
let readFile = promisify(fs.readFile)
let readdir = promisify(fs.readdir)
let realpath = promisify(fs.realpath)

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
  
  return async (req, res) => {
    // 1 url-resolver req.url -> { pathname }
    let { pathname, isVdActived } = resolver.resolve(req.url, vd)

    // 2 fs-reader pathname -> result
    let result = await reader.read(pathname)

    // 3 transformer result -> renderableData
    let renderableData = await transformer. transform
    (result, { pathname, isVdActived, vd })

    // 4 renderer renderableData -> data
    let data = renderer.render(renderableData)

    // 5 set content header
    if (renderableData.data.mime) {
      res.setHeader('Content-Type', renderableData.data.mime)
    }

    // 6 response
    res.end(data)
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
   * { type: '404|file|directory', data: { mime, content, files } }
   */
  read: async (pathname) => {
    let filename = path.join(cwd, pathname)

    let { isFile, isDirectory } = await readFileInfo(filename)

    let type = isFile ? defaultTypeMap.FILE : (isDirectory ? defaultTypeMap.DIRECTORY : defaultTypeMap.NOT_FOUND)

    let data = {}

    if (isFile) {
      data.mime = mime.contentType(path.extname(filename))

      data.content = await readFile(filename)
    } else if (isDirectory) {
      data.mime = defaultMimeMap.html

      data.files = await readdir(filename)
    }

    return {
      type, data
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
    isFile, isDirectory
  }
}

let transformer = {
  transform: async (result, { pathname, isVdActived, vd}) => {
    let { type, data = {} } = result

    if (type === defaultTypeMap.NOT_FOUND) {
      data.mime = defaultMimeMap.html
      
      data.content = 'Page 404'
    } else if (type === defaultTypeMap.DIRECTORY) {
      let { fileMapList, pathList } = await prepareDirectoryData(data.files, { pathname, isVdActived, vd})
      
      data.fileMapList = fileMapList
      data.pathList = pathList
    }

    return result
  }
}

async function prepareDirectoryData(files, { pathname, vd, isVdActived }) {
  if (pathname !== '/' && pathname !== '') {
    files = ['..', ...files]
  }
  
  let fileMapList = files.map(file => ({ name: file }))
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
  
  fileMapList = await Promise.all(fileMapList.map(addClzNameProp))

  let pathList = createPathList(pathname, { vd, isVdActived })
  
  return {
    fileMapList, pathList
  }
}

async function addClzNameProp(obj) {
  let clzName = 'icon'

  let { filename } = obj
  
  let { isFile, isDirectory } = await getFileInfo(filename)

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

let renderer = {
  render: ({ type, data = {} }) => {
    let { fileMapList, pathList } = data
    
    if (type === defaultTypeMap.DIRECTORY) {
      let html = renderer.renderDirectory({ fileMapList, pathList })
      
      return html
    }

    return data.content
  },

  renderDirectory: ({ pathList = [], fileMapList = []}) => {
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
          ${pathList.map(({ name, href }) => {
            return ` <a href="${href}">${name}</a> /`
          }).join('')}
        </h1>
      `
    }

    if (fileMapList.length) {
      content = `
        <ul id="files">
          ${fileMapList.map(({ name, href, clzName }) => {
            return `
              <li>
                <a class="${clzName}" href="${href}">
                  <span class="name">${name}</span>
                </a>
              </li>
            `
          }).join('')}
        </ul>
      `
    }

    return renderer.renderToHtml({
      title, nav, content
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

function createPathList(pathname, { isVdActived, vd }) {
  let pathList = pathname.split('/')
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

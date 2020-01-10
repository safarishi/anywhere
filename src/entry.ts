import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import http, { IncomingMessage, ServerResponse } from 'http'
import reader from './reader'
import { FileType } from './consts'
import renderer from './renderer'
import resolver from './resolver'
import transformer from './transformer'
import { getCommandArgs, openBrowser } from './helpers'

let pkg = require('../package.json')

/**
 * Node.js 进程时传入的命令行参数
 */
let argvList = process.argv

// 打印当前版本
if (['--version', '-v'].includes(argvList[2]) && pkg.version) {
  console.log(pkg.version)

  // 退出node进程
  process.exit()
}

// 获取命令行输入参数
let args = getCommandArgs(argvList)

let cwd = process.cwd()

main()

type Options = {
  publicPath: string,
  vd?: string,
  renderer?: any,
}

function main() {
  /**
   * Server 监听的端口
   */
  let port = args['--port'] || args['-p'] || 9900

  let options: Options = {
    publicPath: '/',
  }

  let virtualDirectory = args['--vd'] || args['-vd']

  if (virtualDirectory) {
    options.vd = virtualDirectory
  }

  let publicPath = args['--public-path'] || args['-publicPath']

  if (publicPath) {
    options.publicPath = publicPath
  }

  let handleRequest = staticServer(options)

  http.createServer(handleRequest).listen({ port }, () => {
    let serverAddress = `http://localhost:${port}`

    console.log(`File system RootPath: ${cwd}`)

    console.log('Server is running at ' + serverAddress)

    let argsKeys = Object.keys(args)

    if (argsKeys.includes('-s') || argsKeys.includes(('--s'))) {
      // don't open browser
      return
    }

    openBrowser(serverAddress)
  })
}

function staticServer(options: Options) {
  let { vd, publicPath } = options

  let finalRenderer = options.renderer || renderer

  return async (req: IncomingMessage, res: ServerResponse) => {
    // 1 url-resolver req.url -> { pathname }
    let { pathname, isVdActived, disablePublicPath } = resolver.resolve(
      // @ts-ignore
      req.url,
      vd,
    )

    let rootPath = path.join(cwd, publicPath)

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
      rootPath,
    })

    // 4.1 send static file
    if (data.type === FileType.FILE) {
      let ext = path.extname(data.filename) || '.txt'

      let contentType = mime.contentType(ext)

      res.setHeader('Content-Type', contentType as string)

      fs.createReadStream(data.filename).pipe(res)

      return
    }

    let isError = FileType.ERROR === data.type

    // 4.2 show directory / not-found / error
    if (data.type === FileType.DIRECTORY || data.type === FileType.NOT_FOUND || isError) {
      let html = finalRenderer.render(data)

      if (isError) {
        res.statusCode = 500
      }

      res.setHeader('Content-Type', mime.contentType('.html') as string || '')

      res.end(html)
    }
  }
}

import url from 'url'
import querystring from 'querystring'

let resolver = {
  resolve: (requestUrl: string, vd: string) => {
    let { pathname, query } = url.parse(requestUrl)

    pathname = decodeURIComponent(pathname as string)

    let isVdActived = requestUrl.startsWith(vd)

    let {
      disable_vd: disableVd,
      disable_public_path: disablePublicPath,
    } = querystring.parse(query as string)

    if (disableVd === '1') {
      isVdActived = false
    }

    if (isVdActived) {
      pathname = pathname.replace(vd, '')
    }

    // @ts-ignore
    disablePublicPath = disablePublicPath === '1'

    return { pathname, isVdActived, disablePublicPath }
  },
}

export default resolver

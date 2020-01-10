import url from 'url'
import querystring from 'querystring'

let resolver = {
  resolve: (requestUrl: string, vd: string) => {
    let { pathname, query } = url.parse(requestUrl)

    pathname = decodeURIComponent(pathname || '')

    let isVdActived = requestUrl.startsWith(vd)

    let {
      disable_vd: disableVd,
      disable_public_path: disablePublicPath,
    } = querystring.parse(query || '')

    if (disableVd === '1') {
      isVdActived = false
    }

    if (isVdActived) {
      pathname = pathname.replace(vd, '')
    }

    let isPublicPathDisabled = disablePublicPath === '1'

    return { pathname, isVdActived, disablePublicPath: isPublicPathDisabled }
  },
}

export default resolver
